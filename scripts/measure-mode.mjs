/**
 * What kind of server a measurement is pointed at, and how to say so.
 *
 * Eleven measurement scripts drive a *production* build, and the security
 * work gave that build three shapes rather than one. A script that assumes
 * the wrong one does not fail usefully — it clicks a selector that is not
 * there and prints a stack trace about `null`, which reads as "the product is
 * broken" when it means "the server was started without a flag". This module
 * is the difference between those two sentences.
 *
 * The three shapes:
 *
 *  - **cloud** — `NEXT_PUBLIC_FIREBASE_API_KEY` and `…_APP_ID` are set, so
 *    `CLOUD_CONFIGURED` is true and accounts are real. `/parents` is behind
 *    `ParentGate` and a signed-out visitor gets the sign-in card. This is
 *    what Netlify builds and what a parent meets.
 *  - **device-only** — neither is set. KIDDO runs account-free, which is a
 *    shipped product mode and not a test rig: `PlayGate` lets a child
 *    straight through and `ParentGate` renders the dashboard. This is the
 *    isolated fixture the measurements want, and it exists because the
 *    product wanted it first.
 *  - **dev pages** — either of the above built with `KIDDO_DEV_PAGES=1`, which
 *    is the only thing that puts `/playground/*` and `/character` back into
 *    `pageExtensions`. See `next.config.ts`.
 *
 * None of these is a bypass. Nothing here asks the server to open a route,
 * lower a gate or accept a fake credential; a script either finds the mode it
 * needs or says which command builds it and stops.
 */
import { evaluate, settle, visit } from "./cdp.mjs";

/** The reading itself: what `/parents` has settled into, right now. */
const READ_GATE = `(() => {
  const gate = document.querySelector("[data-parent-gate]");
  const state = gate && gate.getAttribute("data-parent-gate");
  /* No gate attribute and a dashboard means \`session.status === "unavailable"\`,
     which is what an unconfigured build reports for every session. */
  const dashboard = !!document.querySelector("[data-parent-privacy]");
  return {
    cloud: !!state || !dashboard,
    gate: state || (dashboard ? "dashboard" : "unknown"),
    dashboard,
    auth: !!document.querySelector("[data-auth-card]"),
  };
})()`;

/**
 * How KIDDO was built, read from the page rather than from the environment.
 *
 * Waited for rather than sampled once. `/parents` renders nothing decisive
 * until the session store has answered, and on the first visit of a run —
 * cold route, cold chunk — that can take longer than any single settle worth
 * hard-coding. A fixed wait that loses the race does not report "slow": it
 * reports `gate: "unknown"`, which this module then translates into "you
 * built the wrong server", sending someone off to rebuild a server that was
 * correct. So poll until the page says something, and only then believe it.
 */
export async function serverMode(cdp, sessionId, origin) {
  await visit(cdp, sessionId, `${origin}/parents`, 600);

  /* One device setting can make an account-free build look like a cloud one:
     the pretend cloud in `lib/cloud/preview.ts`, which an earlier measurement
     turned on and Chrome then kept in the profile. With it on, `/parents`
     answers "signed-out" instead of rendering bare, and this probe would
     report "you built the wrong server" about a server that is exactly right.
     The question here is what the *build* is, so the opt-in is cleared before
     the reading — every script that wants the pretend cloud sets it for
     itself, deliberately, a few lines after asking. */
  await evaluate(
    cdp,
    sessionId,
    `(() => {
      try { window.localStorage.removeItem("kiddo.preview.cloud"); } catch {}
      return true;
    })()`,
  );
  await visit(cdp, sessionId, `${origin}/parents`, 600);

  let reading = await evaluate(cdp, sessionId, READ_GATE);
  for (let waited = 0; reading.gate === "unknown" && waited < 8000; waited += 400) {
    await settle(cdp, sessionId, 400);
    reading = await evaluate(cdp, sessionId, READ_GATE);
  }
  return reading;
}

/**
 * Stop early, and helpfully, when a specimen page is not in this build.
 *
 * `/playground/*` is not deleted and is not public: the pages are `.dev.tsx`
 * and `next.config.ts` only reads that extension when `KIDDO_DEV_PAGES=1`.
 * A measuring run turns them on for itself; a deploy never does.
 */
export async function requireDevPages(cdp, sessionId, url) {
  await visit(cdp, sessionId, url, 1200);
  const missing = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const text = document.body ? document.body.innerText : "";
      return /This page could not be found|404/.test(text) && document.title.indexOf("404") >= 0;
    })()`,
  );
  if (!missing) return;
  console.error(
    [
      "",
      `  ${url} is not in this build.`,
      "",
      "  The playground pages are development specimens. They ship as `.dev.tsx`",
      "  and `next.config.ts` only reads that extension when KIDDO_DEV_PAGES=1,",
      "  so a deployed KIDDO does not serve them at all. Build a measuring server:",
      "",
      "      KIDDO_DEV_PAGES=1 npm run build && npm start -- -p 4310",
      "",
      "  Do not make them public to get past this.",
      "",
    ].join("\n"),
  );
  process.exit(2);
}

/**
 * Stop early, and helpfully, when the server has real accounts on it.
 *
 * The measurements that walk a parent through signing in, paying and losing
 * access are written against the account-free build plus the pretend cloud.
 * Pointed at a configured server they would sit in front of a real sign-in
 * form with no credentials, and every check after the first would fail for a
 * reason that has nothing to do with what it measures. The fix is a different
 * server, never a different gate.
 */
export async function requireAccountFree(cdp, sessionId, origin) {
  const mode = await serverMode(cdp, sessionId, origin);
  if (!mode.cloud) return mode;
  console.error(
    [
      "",
      `  ${origin} is a build with Firebase configured, and this measurement`,
      "  needs the account-free one.",
      "",
      "  KIDDO runs account-free when NEXT_PUBLIC_FIREBASE_API_KEY and",
      "  NEXT_PUBLIC_FIREBASE_APP_ID are unset — a shipped product mode, not a",
      "  rig — and `lib/cloud/preview.ts` then gives the account screens a",
      "  pretend backend the device opts into. Build one:",
      "",
      "      npm run measure:serve",
      "",
      "  Do not sign in with a real account and do not lower the gate.",
      "",
    ].join("\n"),
  );
  process.exit(2);
}

/** Say which server this is, once, at the top of a run. */
export function announce(mode) {
  const shape = mode.cloud ? "cloud (accounts configured)" : "device-only (account-free)";
  console.log(`  server: ${shape} · /parents shows ${mode.gate}`);
}
