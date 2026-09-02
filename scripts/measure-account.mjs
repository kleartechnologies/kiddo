/**
 * Measures the Phase 8B/8C parent account and purchase experience, in a
 * real browser, on a build with no Firebase and no Billplz.
 *
 * The device opts into the pretend cloud (`kiddo.preview.cloud`), which
 * behaves like the real backend from the screens' point of view: sign-in
 * state arrives through a listener, the "payment page" is a page on this
 * site, and the "callback" is a timer. Nothing here touches Billplz; what
 * it proves is every screen and transition around Billplz. (Real sandbox
 * steps are in docs/kiddo-billing.md.)
 *
 *    1 signed out        /parents asks the parent to sign in; /play is closed
 *                        for the child with no money words on it
 *    2 sign in / up      create an account → the purchase gate, not
 *                        onboarding; the child is still closed
 *    3 the gate          one offer at the locked price, "Get KIDDO —
 *                        RM29.90", "Nothing renews"; no plan to choose and
 *                        no free tier anywhere
 *    4 came back unpaid  back with billplz[paid]=false: the gate again, a
 *                        calm note, no error, address cleaned
 *    5 the purchase      press the button → back: "confirming" → the
 *                        callback lands → onboarding → the dashboard says
 *                        what was bought; the child's home opens
 *    6 billing           the billing card is a receipt: what was paid and
 *                        that it does not run out, with no renewal date and
 *                        nothing to cancel
 *    7 a second parent   buys the same one thing
 *    8 password reset    forgot → sent → link → new password → sign in;
 *                        an expired link has its own state
 *    9 verification      the account card offers resend / check
 *   10 eight viewports   the gate and the billing dashboard at each size
 *   11 reduced motion    the gate, at once
 *   12 console           nothing logged
 *
 * Expects the account-free measuring server on port 4310:
 *
 *     npm run measure:serve
 *
 * That is a production build with the NEXT_PUBLIC_FIREBASE_* variables
 * unset, which is a mode KIDDO ships rather than a rig — see
 * `scripts/measure-serve.mjs`. Pointed at a configured server this exits
 * 2 and says so, because the way past a real sign-in form is a different
 * server and never a weaker gate.
 *
 *   node scripts/measure-account.mjs [--quick] [--shots=DIR] [origin]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { VIEWPORTS, applyViewport, clickAt, evaluate, openBrowser, visit } from "./cdp.mjs";
import { announce, requireAccountFree } from "./measure-mode.mjs";

const ARGS = process.argv.slice(2);
const QUICK = ARGS.includes("--quick");
const SHOTS = ARGS.find((arg) => arg.startsWith("--shots="))?.slice(8) ?? null;
const ORIGIN = ARGS.find((arg) => arg.startsWith("http")) ?? "http://127.0.0.1:4310";
const MIN_TOUCH = 48;
const screens = QUICK ? [VIEWPORTS[0], VIEWPORTS[3], VIEWPORTS[7]] : VIEWPORTS;

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

const { cdp, sessionId, close } = await openBrowser(9349);
const mode = await requireAccountFree(cdp, sessionId, ORIGIN);
announce(mode);
await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: WATCH_FOR_TROUBLE }, sessionId);
/* Failed requests are read from the page's own performance entries. */

const js = (expression) => evaluate(cdp, sessionId, expression);
/* Objects cross the wire as JSON text; Chrome refuses deep object graphs. */
const jsObject = async (expression) => JSON.parse(await evaluate(cdp, sessionId, `JSON.stringify((${expression}))`));
const trouble = async () => {
  const got = await js("window.__trouble ? window.__trouble.splice(0) : []");
  troubleSeen.push(...got);
  return got;
};
const go = async (path, ms = 900) => {
  await trouble();
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
const reduce = (on) =>
  cdp.send("Emulation.setEmulatedMedia", { features: on ? [{ name: "prefers-reduced-motion", value: "reduce" }] : [] }, sessionId);

const FRAME = `(() => {
  const page = document.scrollingElement;
  const name = (el) => (el.getAttribute("aria-label") || el.textContent || "").trim();
  const controls = [...document.querySelectorAll("a[href], button, input:not([type=radio])")]
    .filter((el) => el.getBoundingClientRect().width > 0 && !el.closest("dialog"));
  const rects = controls.map((el) => el.getBoundingClientRect());
  const small = controls
    .filter((el, i) => rects[i].width < ${MIN_TOUCH} - 0.5 || rects[i].height < ${MIN_TOUCH} - 0.5)
    .map((el) => name(el).slice(0, 24) + " " + Math.round(el.getBoundingClientRect().width) + "×" + Math.round(el.getBoundingClientRect().height));
  const unnamed = controls.filter((el) => !name(el) && el.tagName !== "INPUT").length;
  const clipped = rects.filter((r) => r.left < -0.5 || r.right > innerWidth + 0.5).length;
  const loudArt = [...document.querySelectorAll("svg")].filter((s) => {
    let a = s;
    while (a && a !== document.body) { if (a.getAttribute("aria-hidden") === "true" || a.getAttribute("role") === "img") return false; a = a.parentElement; }
    return true;
  }).length;
  const clippedText = [...document.querySelectorAll("main p, main h1, main h2, main h3, main dd, main dt, main li")]
    .filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible" && !el.classList.contains("truncate")).length;
  return { sideways: page.scrollWidth - page.clientWidth, small, unnamed, clipped, loudArt, clippedText, h1: document.querySelectorAll("h1").length };
})()`;
async function frameProblems() {
  const f = await jsObject(FRAME);
  const problems = [];
  if (f.sideways > 0) problems.push(`scrolls sideways ${f.sideways}px`);
  if (f.clipped) problems.push(`${f.clipped} control(s) off the edge`);
  if (f.small.length) problems.push(`under 48px: ${f.small.join(", ")}`);
  if (f.unnamed) problems.push(`${f.unnamed} unnamed control(s)`);
  if (f.loudArt) problems.push(`${f.loudArt} svg(s) not hidden from readers`);
  if (f.clippedText) problems.push(`${f.clippedText} clipped text block(s)`);
  if (f.h1 !== 1) problems.push(`${f.h1} h1`);
  return problems;
}

const MONEY = /RM\d|price|subscri|upgrade|billing|payment|Stripe|Billplz|checkout|trial|premium|free/i;

/* ======================================================================== */

await applyViewport(cdp, sessionId, VIEWPORTS[1]);
await go("/play", 600);
/* English, deliberately: every sentence this script checks is quoted in
   English, and what KIDDO says in Bahasa Melayu is measured by
   `measure:language`, which reads both catalogues rather than one screen. */
await js(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem("kiddo.preview.cloud", "1"); localStorage.setItem("kiddo.locale.v1", "en");`);

section("1 · signed out");
{
  await go("/parents");
  const gate = await attr("[data-parent-gate]", "data-parent-gate");
  report(`/parents shows sign-in (gate=${gate})`, gate === "signed-out" && (await exists("[data-auth-card]")) ? [] : ["no auth card"]);
  await shoot("01-signed-out");

  await go("/play");
  const closed = await attr("[data-play-gate]", "data-play-gate");
  const body = await js(`document.querySelector("main")?.textContent ?? ""`);
  const problems = [];
  if (closed !== "closed") problems.push(`play gate ${closed}`);
  if (MONEY.test(body)) problems.push(`money words on the child's closed screen: ${body.match(MONEY)?.[0]}`);
  if (!(await exists("[data-play-gate-parents]"))) problems.push("no door for grown-ups");
  report(`/play is closed for the child: "${body.slice(0, 40).trim()}"`, problems);
  await shoot("01-play-closed");
  await go("/worlds/counting");
  report(`/worlds/counting is closed too`, (await attr("[data-play-gate]", "data-play-gate")) === "closed" ? [] : ["world open"]);
  await go("/");
  report(`/ (landing) stays open`, (await exists("[data-play-gate]")) ? ["landing gated"] : []);
}

section("2 · create an account");
{
  await go("/parents");
  await tap("[data-auth-switch]");
  await type("[data-auth-email]", "parent@example.com");
  await type("[data-auth-password]", "secret1");
  /* The confirmation is checked here, before Firebase is asked anything. */
  await type("[data-auth-confirm]", "secret2");
  await tap("[data-auth-submit]");
  const mismatch = await until(`/don.t match/.test(document.querySelector("[data-auth-error]")?.textContent || "")`);
  report(`two different passwords are refused before the account is made (${mismatch})`, mismatch ? [] : ["mismatch accepted"]);
  await type("[data-auth-confirm]", "secret1");
  await tap("[data-auth-submit]");
  const gated = await until(`document.querySelector("[data-parent-gate]")?.dataset.parentGate === "needs-purchase"`);
  const onboarding = await exists("[data-onboarding]");
  report(`after sign-up: the purchase gate (${gated}), not onboarding (${!onboarding})`, gated && !onboarding ? [] : ["wrong order"]);
  await shoot("02-gate-after-signup");
  await go("/play");
  report(`/play is still closed for the child`, (await attr("[data-play-gate]", "data-play-gate")) === "closed" ? [] : ["open without payment"]);
}

section("3 · the gate");
{
  await go("/parents");
  await until(`document.querySelector("[data-access-gate]")`);
  const g = await jsObject(`(() => ({
    status: document.querySelector("[data-access-gate]")?.dataset.accessGate,
    offers: [...document.querySelectorAll("[data-access-offer]")].map((o) => o.textContent.replace(/\\s+/g, " ").trim()),
    price: document.querySelector("[data-access-price]")?.textContent.trim(),
    was: document.querySelector("[data-access-was]")?.textContent.trim(),
    start: document.querySelector("[data-access-start]")?.textContent.trim(),
    text: document.querySelector("main").textContent,
    title: document.querySelector("[data-access-gate] h1")?.textContent.trim(),
    manage: !!document.querySelector("[data-billing-manage]"),
  }))()`);
  const problems = [];
  if (g.status !== "none") problems.push(`status ${g.status}`);
  if (g.offers.length !== 1) problems.push(`${g.offers.length} things to buy`);
  if (!/Lifetime Access/.test(g.offers[0] ?? "")) problems.push(`the offer reads "${g.offers[0]}"`);
  if (g.price !== "RM29.90") problems.push(`price "${g.price}"`);
  if (g.was !== "RM39.90") problems.push(`struck original "${g.was}"`);
  if (g.start !== "Get KIDDO — RM29.90") problems.push(`button "${g.start}"`);
  if (!/Nothing renews/.test(g.text)) problems.push("the gate does not say nothing renews");
  /* No plan, no recurrence, no free tier — and nothing to manage, because a
     parent who has bought nothing yet has no billing to manage. */
  const FORBIDDEN = /monthly|yearly|per month|per year|subscri|renews on|cancel anytime|free|trial|premium/i;
  const said = g.text.replace(/Nothing renews/g, "");
  if (FORBIDDEN.test(said)) problems.push(`forbidden word: ${said.match(FORBIDDEN)?.[0]}`);
  if (g.manage) problems.push("a billing button before anything was bought");
  if (g.title !== "Your child’s adventure is ready.") problems.push(`title "${g.title}"`);
  if ((await js(`[...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => /gradient|backdrop-filter/.test(r.cssText) && /access|offer/.test(r.selectorText ?? "")); } catch { return false; } })`))) problems.push("gradient/glass on the gate");
  report(`gate: ${g.offers[0]?.slice(0, 60)} · "${g.start}"`, problems);
  await shoot("03-gate");
}

section("4 · back from Billplz without paying");
{
  await go("/parents?billplz%5Bid%5D=preview-bill-unpaid&billplz%5Bpaid%5D=false", 1200);
  const note = await until(`document.querySelector("[data-checkout-cancelled]")`);
  const status = await attr("[data-access-gate]", "data-access-gate");
  const returned = await attr("[data-access-gate]", "data-checkout-return");
  const err = await text("[data-access-error]");
  const cleaned = await href();
  const problems = [];
  if (!note) problems.push("no calm note");
  if (status !== "none") problems.push(`status ${status}`);
  if (returned !== "unpaid") problems.push(`return read as ${returned}`);
  if (err) problems.push(`error shown: ${err}`);
  if (cleaned !== "/parents") problems.push(`address not cleaned: ${cleaned}`);
  report(`unpaid: note (${note}), no error, address ${cleaned}`, problems);
  await shoot("04-unpaid");
}

section("5 · buy → confirming → onboarding → dashboard");
{
  await go("/parents");
  await until(`document.querySelector("[data-access-start]")`);
  await tap("[data-access-start]");
  /* The pretend payment page sends the parent back the way Billplz does:
     with the bill in the address. The screen must not believe it. */
  const back = await until(`location.search.includes("billplz") || document.querySelector("[data-access-gate='confirming']")`, 6000);
  await wait(300);
  const confirming = await attr("[data-access-gate]", "data-access-gate");
  const open = await js(`!!document.querySelector("[data-parent-gate='ready']")`);
  report(`back from the payment page (${back}): "${await text("[data-access-gate] h1")}"`,
    confirming === "confirming" && !open ? [] : [confirming === "confirming" ? "let in before the callback" : `gate ${confirming}`]);
  await shoot("05-confirming");

  const onboarding = await until(`document.querySelector("[data-onboarding]")`, 8000);
  report(`the callback lands → onboarding (${onboarding}); address ${await href()}`, onboarding && (await href()) === "/parents" ? [] : ["no onboarding"]);
  await type("[data-onboarding] input", "Mia");
  await tap("[data-onboarding] button[type=submit]");
  const ready = await until(`document.querySelector("[data-parent-gate='ready']")`);
  const kind = await attr("[data-billing-row]", "data-billing-row");
  const offer = (await text("[data-billing-offer]"))?.replace(/\s+/g, " ").trim();
  const chip = await text("[data-billing-status]");
  const line = await text("[data-billing-line]");
  const problems = [];
  if (!ready) problems.push("no dashboard");
  if (kind !== "lifetime") problems.push(`billing row ${kind}`);
  if (chip !== "Lifetime access") problems.push(`status chip "${chip}"`);
  if (!/Lifetime Access · RM29\.90/.test(offer ?? "")) problems.push(`offer "${offer}"`);
  if (!/Bought for RM29\.90, once\./.test(line ?? "")) problems.push(`line "${line}"`);
  report(`dashboard: ${offer} — ${line}`, problems);
  await shoot("05-dashboard");

  await go("/play");
  const closed = await exists("[data-play-gate]");
  const greeting = await js(`document.body.textContent.includes("Mia")`);
  report(`/play opens for the child (${!closed}) and says hello to Mia (${greeting})`, !closed && greeting ? [] : ["child still closed"]);
  await shoot("05-play-open");
}

section("6 · the account card is a receipt, and access is read live");
{
  await go("/parents");
  await until(`document.querySelector("[data-billing-row]")`);
  const r = await jsObject(`(() => ({
    manage: !!document.querySelector("[data-billing-manage]"),
    line: document.querySelector("[data-billing-line]")?.textContent.trim(),
    text: document.querySelector("[data-billing-row]").textContent.replace(/\\s+/g, " "),
  }))()`);
  const problems = [];
  /* Nothing to manage: no card is on file, because nothing will be charged
     again. Only the billing card is read — the "Cancel" on the confirmations
     further down the page dismisses a dialog, not a subscription. The one
     sentence that says "renewal" and "cancel" is the sentence that denies
     them, so it is set aside before the card is searched. */
  const said = r.text.replace(/there is no renewal date and nothing to cancel/gi, "");
  if (r.manage) problems.push("a subscription to manage on a one-time purchase");
  if (!/Bought for RM29\.90, once/.test(r.line ?? "")) problems.push(`line "${r.line}"`);
  if (/renew|cancel|monthly|yearly|next payment|billing cycle|subscri/i.test(said)) problems.push(`recurring word: ${said.match(/renew|cancel|monthly|yearly|next payment|billing cycle|subscri/i)?.[0]}`);
  if (/\b(19|20)\d\d\b|\bJan|\bFeb|\bMar|\bApr|\bJun|\bJul|\bAug|\bSep|\bOct|\bNov|\bDec/.test(r.line ?? "")) problems.push(`a date on a purchase that never expires: "${r.line}"`);
  report(`receipt: "${r.line}" · nothing to manage (${!r.manage})`, problems);
  await shoot("06-receipt");

  /* The screens follow the entitlement, not a memory of having paid: take it
     away and both doors shut on the next look. (Nothing in KIDDO does this;
     it is here so that a refund or a mistaken grant cannot leave a device
     quietly open.) */
  await js(`window.__kiddoPreviewSetAccess?.({ lifetime: false })`);
  const shut = await until(`document.querySelector("[data-parent-gate='needs-purchase']")`, 4000);
  report(`access removed → the offer again (${shut})`, shut ? [] : ["parent area stayed open"]);
  await go("/play");
  report(`/play is closed again on a fresh visit`, (await attr("[data-play-gate]", "data-play-gate")) === "closed" ? [] : ["open with no purchase"]);
  await go("/parents");
  await js(`window.__kiddoPreviewSetAccess?.({ lifetime: true })`);
  const backOpen = await until(`document.querySelector("[data-parent-gate='ready']")`, 4000);
  report(`access restored → dashboard (${backOpen})`, backOpen ? [] : ["stuck"]);
}

section("7 · a second parent buys the same one thing");
{
  await go("/parents");
  await until(`document.querySelector("[data-gate-signout]") || document.querySelector("[data-account-signout]")`);
  await tap(`${(await exists("[data-gate-signout]")) ? "[data-gate-signout]" : "[data-account-signout]"}`);
  await until(`document.querySelector("[data-auth-card]")`);
  await tap("[data-auth-switch]");
  await type("[data-auth-email]", "second@example.com");
  await type("[data-auth-password]", "secret2");
  await type("[data-auth-confirm]", "secret2");
  await tap("[data-auth-submit]");
  await until(`document.querySelector("[data-access-start]")`);
  const choices = await js(`document.querySelectorAll("[data-access-offer]").length`);
  await tap("[data-access-start]");
  await until(`document.querySelector("[data-access-gate='confirming']")`, 6000);
  const onboarding = await until(`document.querySelector("[data-onboarding]")`, 8000);
  await type("[data-onboarding] input", "Leo");
  await tap("[data-onboarding] button[type=submit]");
  await until(`document.querySelector("[data-parent-gate='ready']")`);
  const offer = (await text("[data-billing-offer]"))?.replace(/\s+/g, " ").trim();
  const confirmed = await exists("[data-checkout-confirmed]");
  report(`second parent: ${choices} thing to buy → onboarding (${onboarding}) → "${offer}", confirmation shown (${confirmed})`,
    choices === 1 && /Lifetime Access · RM29\.90/.test(offer ?? "") ? [] : [`${choices} offers, row "${offer}"`]);
  await shoot("07-second-parent");
}

section("8 · password reset");
{
  await tap("[data-account-signout]");
  await until(`document.querySelector("[data-auth-card]")`);
  await tap("[data-auth-forgot]");
  const forgot = await attr("[data-auth-card]", "data-auth-card");
  await type("[data-auth-email]", "second@example.com");
  await tap("[data-auth-submit]");
  const sent = await until(`document.querySelector("[data-auth-card='forgot-sent']")`);
  report(`forgot (${forgot}) → sent (${sent}): "${await text("[data-auth-card] p[role=status]")}"`, forgot === "forgot" && sent ? [] : ["reset flow"]);
  await shoot("08-reset-sent");

  /* Someone else's email gets the same sentence. */
  await tap("[data-auth-switch]");
  await tap("[data-auth-forgot]");
  await type("[data-auth-email]", "nobody@example.com");
  await tap("[data-auth-submit]");
  report(`an unknown email gets the same sentence`, (await until(`document.querySelector("[data-auth-card='forgot-sent']")`)) ? [] : ["enumeration"]);

  await go("/parents/reset?mode=resetPassword&oobCode=preview-reset-1", 1200);
  const stage = await until(`document.querySelector("[data-reset-stage='reset']")`);
  await type("[data-reset-password]", "123");
  await tap("[data-reset-submit]");
  const weak = await until(`document.querySelector("[data-reset-error]")?.textContent.includes("6 characters")`);
  await type("[data-reset-password]", "newpass9");
  await tap("[data-reset-submit]");
  const done = await until(`document.querySelector("[data-reset-stage='done-reset']")`);
  report(`reset page: form (${stage}), weak password refused (${weak}), done (${done})`, stage && weak && done ? [] : ["reset page"]);
  await shoot("08-reset-done");
  await tap("[data-reset-back]");
  await until(`document.querySelector("[data-auth-card]")`);
  await type("[data-auth-email]", "second@example.com");
  await type("[data-auth-password]", "newpass9");
  await tap("[data-auth-submit]");
  report(`sign in with the new password → dashboard`, (await until(`document.querySelector("[data-parent-gate='ready']")`)) ? [] : ["new password rejected"]);

  await go("/parents/reset?mode=resetPassword&oobCode=preview-reset-1", 1200);
  const spent = await until(`document.querySelector("[data-reset-stage='bad-link']")`);
  report(`a used link: "${await text("[data-reset-stage] h1")}" (${spent})`, spent ? [] : ["no bad-link state"]);
  await shoot("08-reset-bad-link");
  await go("/parents/reset", 1200);
  report(`no code at all: bad-link state too`, (await until(`document.querySelector("[data-reset-stage='bad-link']")`)) ? [] : ["no state"]);
}

section("9 · email verification");
{
  await go("/parents");
  await until(`document.querySelector("[data-account-verify]")`);
  await tap("[data-account-verify-send]");
  const sent = await until(`document.querySelector("[data-account-verify='sent']")`);
  await tap("[data-account-verify-check]");
  const still = await until(`document.querySelector("[data-account-verify='still']")`);
  report(`unverified → send (${sent}) → check: still unverified (${still})`, sent && still ? [] : ["verification line"]);
  await shoot("09-verify-line");
  await go("/parents/reset?mode=verifyEmail&oobCode=preview-verify-1", 1500);
  const verified = await until(`document.querySelector("[data-reset-stage='done-verify']")`);
  report(`verify link: "${await text("[data-reset-stage] h1")}" (${verified})`, verified ? [] : ["verify link"]);
  await shoot("09-verified");
  await go("/parents");
  await until(`document.querySelector("[data-parent-gate='ready']")`);
  report(`the account card no longer asks`, (await exists("[data-account-verify]")) ? ["still asking"] : []);
}

section("10 · eight viewports");
for (const screen of screens) {
  await applyViewport(cdp, sessionId, screen);
  await go("/parents");
  await until(`document.querySelector("[data-parent-gate='ready']")`);
  const dash = await frameProblems();
  await shoot(`10-${screen.name}-billing`);
  await js(`window.__kiddoPreviewSetAccess?.({ lifetime: false })`);
  await until(`document.querySelector("[data-access-gate]")`, 4000);
  const gate = await frameProblems();
  await shoot(`10-${screen.name}-gate`);
  await js(`window.__kiddoPreviewSetAccess?.({ lifetime: true })`);
  await until(`document.querySelector("[data-parent-gate='ready']")`, 4000);
  report(`${screen.name} ${screen.width}×${screen.height}: billing dashboard + gate`, [...dash, ...gate.map((p) => `gate: ${p}`)]);
}
await applyViewport(cdp, sessionId, VIEWPORTS[1]);

section("11 · reduced motion");
{
  await reduce(true);
  await go("/parents");
  await js(`window.__kiddoPreviewSetAccess?.({ lifetime: false })`);
  const gate = await until(`document.querySelector("[data-access-gate='none']")`, 4000);
  const visible = await js(`(() => { const el = document.querySelector("[data-access-start]"); return el && getComputedStyle(el).opacity === "1"; })()`);
  report(`gate with reduced motion: present (${gate}) and fully visible at once (${visible})`, gate && visible ? [] : ["reduced motion"]);
  await reduce(false);
  await js(`window.__kiddoPreviewSetAccess?.({ lifetime: true })`);
}

section("12 · console and requests");
{
  const late = await trouble();
  const all = troubleSeen.concat(late);
  report(`${all.length} error/warning line(s)`, all.length ? all.slice(0, 4).map((t) => t.slice(0, 140)) : []);
  failedRequests.push(...(await js(FAILED).catch(() => [])));
  const bad = [...new Set(failedRequests)].filter((r) => !/favicon/.test(r));
  report(`${bad.length} failed request(s)`, bad.slice(0, 4));
}

await close();
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
