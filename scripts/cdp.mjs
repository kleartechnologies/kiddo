/**
 * The smallest browser driver that will do.
 *
 * No browser-automation dependency, in the house style: Chrome is launched
 * with its debugging port open and driven over the DevTools Protocol with the
 * `WebSocket` Node already has. The whole client is the file below.
 *
 * Shared by every `measure-*.mjs` script, because the questions a phone asks
 * are the same whichever engine is on the screen and only the board differs.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** The eight screens the brief names, in the order it names them. */
export const VIEWPORTS = [
  { name: "phone 360×640", width: 360, height: 640, mobile: true },
  { name: "iPhone 390×844", width: 390, height: 844, mobile: true },
  { name: "iPhone Max 430×932", width: 430, height: 932, mobile: true },
  { name: "iPad portrait 768×1024", width: 768, height: 1024, mobile: true },
  { name: "iPad Pro portrait 820×1180", width: 820, height: 1180, mobile: true },
  { name: "iPad landscape 1024×768", width: 1024, height: 768, mobile: true },
  { name: "iPad Pro landscape 1180×820", width: 1180, height: 820, mobile: true },
  { name: "desktop 1440×900", width: 1440, height: 900, mobile: false },
];

function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  const pending = new Map();
  let nextId = 1;

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const waiting = pending.get(message.id);
    if (!waiting) return;
    pending.delete(message.id);
    if (message.error) waiting.reject(new Error(JSON.stringify(message.error)));
    else waiting.resolve(message.result);
  });

  const open = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });

  return { open, send, close: () => socket.close() };
}

/**
 * A headless Chrome with one blank tab attached, and the way to put it away.
 *
 * @param port The debugging port. Two scripts running at once need two.
 */
export async function openBrowser(port = 9333) {
  const profile = mkdtempSync(join(tmpdir(), "kiddo-cdp-"));
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--disable-gpu",
      "--hide-scrollbars",
      /* The tab these scripts drive is never the frontmost one, and Chrome
         slows the timers of a page it thinks nobody is looking at — to about
         one tick a minute. Every `settle` below is a timer, so without these
         three a suite that should take two minutes takes an hour, and a slow
         suite is one nobody runs. Nothing here changes what is measured. */
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
    { stdio: "ignore" },
  );

  /* Wait for the port rather than guessing at a delay. */
  let version;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  if (!version) {
    chrome.kill();
    throw new Error("Chrome never opened its debugging port");
  }

  const cdp = connect(version.webSocketDebuggerUrl);
  await cdp.open;

  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);

  const close = () => {
    cdp.close();
    chrome.kill();
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
    } catch {
      /* Chrome is still letting go of its profile. It is a temp dir; leave it. */
    }
  };

  return { cdp, sessionId, close };
}

/** Run an expression in the page and hand back its value. */
export async function evaluate(cdp, sessionId, expression) {
  const { result, exceptionDetails } = await cdp.send(
    "Runtime.evaluate",
    { expression, awaitPromise: true, returnByValue: true },
    sessionId,
  );
  if (exceptionDetails) throw new Error(exceptionDetails.text ?? "page threw");
  return result.value;
}

export const settle = (cdp, sessionId, ms = 450) =>
  evaluate(cdp, sessionId, `new Promise((r) => setTimeout(r, ${ms}))`);

/** A real press and release, which is what produces pointer events. */
export async function clickAt(cdp, sessionId, { x, y }) {
  const common = { x: Math.round(x), y: Math.round(y), button: "left", clickCount: 1 };
  await cdp.send("Input.dispatchMouseEvent", { ...common, type: "mousePressed" }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { ...common, type: "mouseReleased" }, sessionId);
}

/** A press, a move, and a release somewhere else: one drag. */
export async function dragFromTo(cdp, sessionId, from, to) {
  const at = (point, type, extra = {}) =>
    cdp.send(
      "Input.dispatchMouseEvent",
      {
        type,
        x: Math.round(point.x),
        y: Math.round(point.y),
        button: "left",
        ...extra,
      },
      sessionId,
    );

  await at(from, "mousePressed", { clickCount: 1 });
  /* Several steps, because a drag that teleports is not a drag: the engine
     is watching pointermove and so is the browser's own gesture handling. */
  for (let step = 1; step <= 6; step++) {
    await at(
      {
        x: from.x + ((to.x - from.x) * step) / 6,
        y: from.y + ((to.y - from.y) * step) / 6,
      },
      "mouseMoved",
      { buttons: 1 },
    );
  }
  await at(to, "mouseReleased", { clickCount: 1 });
}

/** One tap on a key, as the browser would send it. */
export async function pressEnter(cdp, sessionId) {
  const key = {
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
  };
  await cdp.send("Input.dispatchKeyEvent", { ...key, type: "rawKeyDown" }, sessionId);
  await cdp.send("Input.dispatchKeyEvent", { ...key, type: "char", text: "\r" }, sessionId);
  await cdp.send("Input.dispatchKeyEvent", { ...key, type: "keyUp" }, sessionId);
}

/** Where a control is, so it can be pressed rather than programmatically fired. */
export function rectOf(cdp, sessionId, selector) {
  return evaluate(
    cdp,
    sessionId,
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    })()`,
  );
}

/** Put the page on one of the eight screens. */
export async function applyViewport(cdp, sessionId, viewport) {
  await cdp.send(
    "Emulation.setDeviceMetricsOverride",
    {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.mobile ? 2 : 1,
      mobile: viewport.mobile,
    },
    sessionId,
  );
  await cdp.send(
    "Emulation.setTouchEmulationEnabled",
    /* `maxTouchPoints` has to be at least 1 even when touch is off. */
    { enabled: viewport.mobile, maxTouchPoints: viewport.mobile ? 5 : 1 },
    sessionId,
  );
}

/** Load the page under test and let it settle. */
export async function visit(cdp, sessionId, url, ms = 700) {
  await cdp.send("Page.navigate", { url }, sessionId);
  /* `Page.navigate` resolves before the old document has finished being torn
     down, so a timer parked in it can be destroyed with it — Chrome answers
     "Inspected target navigated or closed". The page is the thing being
     waited for, not any particular timer, so wait again in the new context. */
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await settle(cdp, sessionId, ms);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  await settle(cdp, sessionId, ms);
}
