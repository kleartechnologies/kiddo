/**
 * Measures the road into KIDDO — landing → pricing → account → payment →
 * welcome → play — in a real browser, on a build with no Firebase and no
 * Stripe.
 *
 * The device opts into the pretend cloud (`kiddo.preview.cloud`), the same
 * one `measure-account.mjs` uses: sign-in state arrives through a listener,
 * "Checkout" is a page on this site, and the "webhook" is a timer. Nothing
 * here touches Stripe; what it proves is every screen and transition
 * around it, in the order a parent meets them.
 *
 *    1 signed out       /join asks for an account and charges nothing;
 *                       /welcome says where to go; /play stays closed with
 *                       no money words and no way to sign out
 *    2 the main road    plan → account → Checkout starts by itself →
 *                       /welcome: confirming → "Welcome to KIDDO! 🎉" →
 *                       the child's name → Enter KIDDO → /play opens
 *    3 log out          the parent area signs out; the child's home closes
 *    4 coming back      a parent who is already signed in gets a button,
 *                       not an automatic charge; paying opens KIDDO again
 *    5 already paid     /join tells a subscriber there is nothing to pay
 *    6 access           an expired subscription closes the child's home
 *    7 viewports        /join and /welcome at every size
 *    8 reduced motion   both pages readable at once
 *    9 console          nothing logged, nothing failed
 *
 * Expects a server already running (`npm run build && npm start -- -p 4310`).
 *
 *   node scripts/measure-join.mjs [--shots=DIR] [origin]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { VIEWPORTS, applyViewport, clickAt, evaluate, openBrowser, visit } from "./cdp.mjs";

const ARGS = process.argv.slice(2);
const SHOTS = ARGS.find((arg) => arg.startsWith("--shots="))?.slice(8) ?? null;
const ORIGIN = ARGS.find((arg) => arg.startsWith("http")) ?? "http://127.0.0.1:4310";

const WATCH_FOR_TROUBLE = `
  window.__trouble = [];
  for (const kind of ["error", "warn"]) {
    const real = console[kind].bind(console);
    console[kind] = (...args) => { window.__trouble.push(args.join(" ")); real(...args); };
  }
  addEventListener("error", (e) => window.__trouble.push(String(e.message)));
  addEventListener("unhandledrejection", (e) => window.__trouble.push(String(e.reason)));
`;

let failures = 0;
const troubleSeen = [];
const failedRequests = [];
const FAILED = `performance.getEntriesByType("resource").filter((e) => e.responseStatus >= 400).map((e) => e.responseStatus + " " + e.name)`;
const report = (line, problems) => {
  if (problems.length) failures += 1;
  console.log(`  ${line}${problems.length ? `  ✗ ${problems.join("; ")}` : "  ✓"}`);
};
const section = (title) => console.log(`\n${title}`);
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const { cdp, sessionId, close } = await openBrowser(9353);
await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: WATCH_FOR_TROUBLE }, sessionId);

const js = (expression) => evaluate(cdp, sessionId, expression);
const jsObject = async (expression) => JSON.parse(await evaluate(cdp, sessionId, `JSON.stringify((${expression}))`));
const drain = async () => {
  const got = await js("window.__trouble ? window.__trouble.splice(0) : []");
  troubleSeen.push(...got);
};
const go = async (path, ms = 900) => {
  await drain();
  failedRequests.push(...(await js(FAILED).catch(() => [])));
  await visit(cdp, sessionId, `${ORIGIN}${path}`, ms);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rect = (selector) =>
  jsObject(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    el.scrollIntoView({ block: "center", behavior: "instant" });
    const b = el.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  })()`);
async function tap(selector) {
  const at = await rect(selector);
  if (!at) throw new Error(`nothing at ${selector}`);
  await clickAt(cdp, sessionId, at);
}
async function type(selector, value) {
  await tap(selector);
  await js(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.focus(); el.select?.(); })()`);
  await cdp.send("Input.insertText", { text: value }, sessionId);
}
const text = (selector) => js(`document.querySelector(${JSON.stringify(selector)})?.textContent?.trim() ?? null`);
const attr = (selector, name) => js(`document.querySelector(${JSON.stringify(selector)})?.getAttribute(${JSON.stringify(name)}) ?? null`);
const exists = (selector) => js(`!!document.querySelector(${JSON.stringify(selector)})`);
const href = () => js("location.pathname + location.search");
async function until(expression, ms = 8000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await js(`!!(${expression})`)) return true;
    await wait(150);
  }
  return false;
}
async function shoot(name) {
  if (!SHOTS) return;
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
  writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(data, "base64"));
}

/** Sign up, confirmation included, wherever the auth card is showing. */
async function createAccount(email, password) {
  await until(`document.querySelector("[data-auth-card]")`);
  if ((await attr("[data-auth-card]", "data-auth-card")) !== "signup") await tap("[data-auth-switch]");
  await type("[data-auth-email]", email);
  await type("[data-auth-password]", password);
  await type("[data-auth-confirm]", password);
  await tap("[data-auth-submit]");
}

await applyViewport(cdp, sessionId, VIEWPORTS[1]);
await go("/");
await js(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem("kiddo.preview.cloud", "1");`);

section("1 · signed out: nothing is charged and nothing is open");
{
  await go("/join?plan=yearly");
  const gate = await attr("[data-join-gate]", "data-join-gate");
  const card = await exists("[data-auth-card]");
  const plan = await attr("[data-join-plan]", "data-join-plan");
  const stayed = (await href()) === "/join?plan=yearly";
  await wait(1200);
  report(`/join (gate=${gate}) asks for an account for the ${plan} plan, and stays put`, [
    gate === "signed-out" ? null : `gate ${gate}`,
    card ? null : "no auth card",
    plan === "yearly" ? null : `plan ${plan}`,
    stayed && (await href()) === "/join?plan=yearly" ? null : "left /join on its own",
  ].filter(Boolean));
  await shoot("01-join-signed-out");

  await go("/welcome");
  report(`/welcome without an account: "${await text("[data-welcome] h1, [data-welcome-celebration] h1")}"`,
    (await attr("[data-welcome]", "data-welcome")) === "signed-out" ? [] : ["wrong welcome state"]);

  await go("/play");
  const closed = (await attr("[data-play-gate]", "data-play-gate")) === "closed";
  const money = await js(`/RM|price|subscri|payment|pay\\b/i.test(document.body.innerText)`);
  const signout = await exists("[data-account-signout], [data-gate-signout], [data-join-signout]");
  report(`/play is closed (${closed}), with no money words (${!money}) and no sign-out (${!signout})`, [
    closed ? null : "open without paying",
    money ? "money words on the child's screen" : null,
    signout ? "a sign-out button on the child's screen" : null,
  ].filter(Boolean));
}

section("2 · the main road: plan → account → payment → welcome → play");
{
  await go("/");
  await tap("[data-pricing-cta='yearly']");
  await until(`location.pathname === "/join"`);
  report(`Start Yearly → ${await href()}`, (await href()) === "/join?plan=yearly" ? [] : ["wrong destination"]);

  await createAccount("parent@example.com", "secret1");
  /* The parent said which plan they wanted; Checkout starts by itself. */
  await until(`location.pathname === "/welcome"`, 15000);
  /* Read once: /welcome strips `?checkout=success` from the address as
     soon as it has read it, so a second look would miss it. */
  const landed = await href();
  report(`the account is made and Checkout takes over → ${landed}`,
    landed.startsWith("/welcome") ? [] : ["did not reach Checkout"]);

  const confirming = await until(`document.querySelector("[data-welcome='confirming']")`, 6000);
  report(`/welcome while the webhook is in flight: "${await text("[data-welcome='confirming'] h1")}"`,
    confirming ? [] : ["no confirming state"]);
  await shoot("02-welcome-confirming");

  const open = await until(`document.querySelector("[data-welcome='open']")`, 8000);
  const facts = await jsObject(`(() => ({
    heading: document.querySelector("[data-welcome-celebration] h1")?.textContent.trim(),
    line: document.querySelector("[data-welcome-celebration] p")?.textContent.trim(),
    enter: document.querySelector("[data-welcome-enter]")?.textContent.trim(),
    asksName: !!document.querySelector("[data-onboarding]"),
    address: location.pathname + location.search,
    h1s: document.querySelectorAll("h1").length,
  }))()`);
  report(`welcome: "${facts.heading}" / "${facts.line}" / [${facts.enter}] · asks the child's name (${facts.asksName})`, [
    open ? null : "never opened",
    facts.heading === "Welcome to KIDDO! 🎉" ? null : "wrong heading",
    facts.line === "Your KIDDO adventure starts here." ? null : "wrong line",
    facts.enter === "Enter KIDDO" ? null : "wrong call to action",
    facts.asksName ? null : "never asks who is playing",
    facts.h1s === 1 ? null : `${facts.h1s} h1s`,
    facts.address === "/welcome" ? null : `address not cleaned: ${facts.address}`,
  ].filter(Boolean));
  await shoot("02-welcome-open");

  await type("[data-onboarding] input", "Mia");
  await tap("[data-onboarding] button[type=submit]");
  await until(`!document.querySelector("[data-onboarding]")`);
  await tap("[data-welcome-enter]");
  const arrived = await until(`location.pathname === "/play"`, 6000);
  const greeting = await js(`document.body.textContent.includes("Mia")`);
  report(`Enter KIDDO → /play (${arrived}), which says hello to Mia (${greeting})`,
    arrived && greeting && !(await exists("[data-play-gate]")) ? [] : ["the child's home did not open"]);
  await shoot("02-play-open");
}

section("3 · log out, from the parent area and nowhere else");
{
  await go("/parents");
  await until(`document.querySelector("[data-parent-gate='ready']")`);
  await tap("[data-account-signout]");
  const signedOut = await until(`document.querySelector("[data-parent-gate='signed-out']")`, 6000);
  report(`the account area signs out (${signedOut}) → back to the auth card`,
    signedOut && (await exists("[data-auth-card]")) ? [] : ["still signed in"]);
  await go("/play");
  report(`/play is closed again for the child`, (await attr("[data-play-gate]", "data-play-gate")) === "closed" ? [] : ["still open"]);
}

section("4 · coming back: signed in already, nothing charged without a press");
{
  await go("/parents");
  await until(`document.querySelector("[data-auth-card]")`);
  await type("[data-auth-email]", "parent@example.com");
  await type("[data-auth-password]", "secret1");
  await tap("[data-auth-submit]");
  await until(`document.querySelector("[data-parent-gate='ready']")`, 8000);
  /* Pretend the subscription lapsed, so pricing is the road again. */
  await js(`window.__kiddoPreviewSetSubscription?.({ status: "none", plan: null })`);
  await go("/");
  await tap("[data-pricing-cta='monthly']");
  await until(`location.pathname === "/join"`);
  const started = await until(`document.querySelector("[data-join-start]")`, 6000);
  await wait(1500);
  const stillHere = (await href()) === "/join?plan=monthly";
  report(`/join offers a button (${started}) and charges nothing by itself (${stillHere})`,
    started && stillHere ? [] : ["a signed-in parent was sent to Checkout without pressing anything"]);
  const chosen = await attr("[data-join-plan]", "data-join-plan");
  report(`the plan carried across: ${chosen}`, chosen === "monthly" ? [] : [`plan ${chosen}`]);
  await shoot("04-join-signed-in");

  await tap("[data-join-start]");
  await until(`location.pathname === "/welcome"`, 15000);
  const open = await until(`document.querySelector("[data-welcome='open']")`, 8000);
  report(`paying again opens KIDDO (${open}) without asking for the child's name twice`,
    open && !(await exists("[data-onboarding]")) ? [] : ["welcome did not open cleanly"]);
}

section("5 · already paid");
{
  await go("/join?plan=yearly");
  const gate = await until(`document.querySelector("[data-join-gate='subscribed']")`, 6000);
  report(`/join tells a subscriber there is nothing to pay: "${await text("[data-join-gate='subscribed'] h1")}"`,
    gate ? [] : ["offered to charge a subscriber again"]);
}

section("6 · access follows the subscription");
{
  await go("/parents");
  await until(`document.querySelector("[data-parent-gate='ready']")`);
  await js(`window.__kiddoPreviewSetSubscription?.({ status: "expired" })`);
  await go("/play");
  report(`expired → /play closed`, (await attr("[data-play-gate]", "data-play-gate")) === "closed" ? [] : ["open while expired"]);
  await go("/parents");
  await until(`document.querySelector("[data-subscription-gate]")`, 6000);
  await js(`window.__kiddoPreviewSetSubscription?.({ status: "active", plan: "monthly" })`);
  await go("/play");
  report(`active → /play open`, (await exists("[data-play-gate]")) ? ["still closed"] : []);
}

section("7 · viewports");
for (const viewport of VIEWPORTS) {
  await applyViewport(cdp, sessionId, viewport);
  await go("/welcome");
  const welcome = await jsObject(`(() => {
    const small = [...document.querySelectorAll("a[href],button")]
      .map((el) => ({ r: el.getBoundingClientRect(), n: (el.textContent || "").trim().slice(0, 20) }))
      .filter((t) => t.r.height > 0 && t.r.height < 48).map((t) => t.n);
    return { small, wide: document.documentElement.scrollWidth > innerWidth, h1s: document.querySelectorAll("h1").length };
  })()`);
  await go("/join?plan=yearly");
  const joined = await jsObject(`(() => {
    const small = [...document.querySelectorAll("a[href],button")]
      .map((el) => ({ r: el.getBoundingClientRect(), n: (el.textContent || "").trim().slice(0, 20) }))
      .filter((t) => t.r.height > 0 && t.r.height < 48).map((t) => t.n);
    return { small, wide: document.documentElement.scrollWidth > innerWidth, h1s: document.querySelectorAll("h1").length };
  })()`);
  report(`${viewport.name}: welcome + join`, [
    welcome.wide || joined.wide ? "sideways scroll" : null,
    welcome.small.length ? `welcome under 48px: ${welcome.small.join(", ")}` : null,
    joined.small.length ? `join under 48px: ${joined.small.join(", ")}` : null,
    welcome.h1s === 1 && joined.h1s === 1 ? null : `h1s ${welcome.h1s}/${joined.h1s}`,
  ].filter(Boolean));
}

section("8 · reduced motion");
{
  await applyViewport(cdp, sessionId, VIEWPORTS[1]);
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }, sessionId);
  await go("/welcome", 400);
  const welcome = await jsObject(`(() => {
    const h = document.querySelector("h1");
    return { opacity: +getComputedStyle(h).opacity, moving: [...document.querySelectorAll("*")].filter((el) => { const a = getComputedStyle(el); return a.animationIterationCount === "infinite" && a.animationName !== "none"; }).length };
  })()`);
  await go("/join?plan=yearly", 400);
  const joinOpacity = await js(`+getComputedStyle(document.querySelector("h1")).opacity`);
  report(`readable at once: welcome ${welcome.opacity}, join ${joinOpacity}, ${welcome.moving} loop(s)`, [
    welcome.opacity === 1 && joinOpacity === 1 ? null : "not visible at once",
    welcome.moving === 0 ? null : "something loops forever",
  ].filter(Boolean));
  await cdp.send("Emulation.setEmulatedMedia", { features: [] }, sessionId);
}

section("9 · console and requests");
{
  await drain();
  failedRequests.push(...(await js(FAILED).catch(() => [])));
  report(`${troubleSeen.length} error/warning line(s)`, troubleSeen.slice(0, 3));
  report(`${failedRequests.length} failed request(s)`, failedRequests.slice(0, 3));
}

await close();
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
