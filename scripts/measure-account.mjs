/**
 * Measures the Phase 8B/8C parent account and subscription experience, in
 * a real browser, on a build with no Firebase and no Stripe.
 *
 * The device opts into the pretend cloud (`kiddo.preview.cloud`), which
 * behaves like the real backend from the screens' point of view: sign-in
 * state arrives through a listener, "Checkout" is a page on this site, and
 * the "webhook" is a timer. Nothing here touches Stripe; what it proves is
 * every screen and transition around Stripe. (Real test-mode steps are in
 * docs/kiddo-billing.md.)
 *
 *    1 signed out        /parents asks the parent to sign in; /play is closed
 *                        for the child with no money words on it
 *    2 sign in / up      create an account → the subscription gate, not
 *                        onboarding; the child is still closed
 *    3 the gate          exactly two plans at the locked prices, yearly
 *                        first and marked best value, "Start KIDDO",
 *                        "Cancel anytime"; no free tier anywhere
 *    4 cancelled         back from Checkout with ?checkout=cancelled: the
 *                        gate again, a calm note, no error, address cleaned
 *    5 monthly           choose Monthly → Checkout → back: "confirming" →
 *                        webhook lands → onboarding → dashboard shows the
 *                        plan; the child's home opens
 *    6 billing           the billing card names the plan and renewal; Manage
 *                        opens the portal; past_due closes the parent area
 *                        with a way to fix the card, and the child's open
 *                        page is not interrupted
 *    7 yearly            a second parent chooses Yearly
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

const MONEY = /RM\d|price|subscri|upgrade|billing|payment|Stripe|checkout|trial|premium|free/i;

/* ======================================================================== */

await applyViewport(cdp, sessionId, VIEWPORTS[1]);
await go("/play", 600);
await js(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem("kiddo.preview.cloud", "1");`);

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
  const gated = await until(`document.querySelector("[data-parent-gate]")?.dataset.parentGate === "needs-subscription"`);
  const onboarding = await exists("[data-onboarding]");
  report(`after sign-up: the subscription gate (${gated}), not onboarding (${!onboarding})`, gated && !onboarding ? [] : ["wrong order"]);
  await shoot("02-gate-after-signup");
  await go("/play");
  report(`/play is still closed for the child`, (await attr("[data-play-gate]", "data-play-gate")) === "closed" ? [] : ["open without payment"]);
}

section("3 · the gate");
{
  await go("/parents");
  await until(`document.querySelector("[data-subscription-gate]")`);
  const g = await jsObject(`(() => ({
    status: document.querySelector("[data-subscription-gate]")?.dataset.subscriptionGate,
    plans: [...document.querySelectorAll("[data-plan]")].map((p) => ({ id: p.dataset.plan, text: p.textContent.replace(/\\s+/g, " ").trim(), selected: p.hasAttribute("data-plan-selected") })),
    start: document.querySelector("[data-subscription-start]")?.textContent.trim(),
    text: document.querySelector("main").textContent,
    title: document.querySelector("[data-subscription-gate] h1")?.textContent.trim(),
  }))()`);
  const problems = [];
  if (g.status !== "none") problems.push(`status ${g.status}`);
  if (g.plans.length !== 2) problems.push(`${g.plans.length} plans`);
  if (g.plans[0]?.id !== "yearly" || !/Yearly/.test(g.plans[0].text) || !/RM59\.90\/year/.test(g.plans[0].text) || !/Best value/i.test(g.plans[0].text)) problems.push(`yearly card "${g.plans[0]?.text}"`);
  if (g.plans[1]?.id !== "monthly" || !/Monthly/.test(g.plans[1].text) || !/RM9\.90\/month/.test(g.plans[1].text)) problems.push(`monthly card "${g.plans[1]?.text}"`);
  if (!g.plans[0]?.selected) problems.push("yearly not preselected");
  if (g.start !== "Start KIDDO") problems.push(`button "${g.start}"`);
  if (!/Cancel anytime/.test(g.text)) problems.push("no 'Cancel anytime'");
  if (/free|trial|lifetime|family|premium/i.test(g.text)) problems.push(`forbidden tier word: ${g.text.match(/free|trial|lifetime|family|premium/i)?.[0]}`);
  if (g.title !== "Your child’s adventure is ready.") problems.push(`title "${g.title}"`);
  if ((await js(`[...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => /gradient|backdrop-filter/.test(r.cssText) && /subscription|plan/.test(r.selectorText ?? "")); } catch { return false; } })`))) problems.push("gradient/glass on the gate");
  report(`gate: ${g.plans.map((p) => p.text).join(" | ")} · "${g.start}"`, problems);
  await shoot("03-gate");
}

section("4 · cancelled checkout");
{
  await go("/parents?checkout=cancelled", 1200);
  const note = await until(`document.querySelector("[data-checkout-cancelled]")`);
  const status = await attr("[data-subscription-gate]", "data-subscription-gate");
  const err = await text("[data-subscription-error]");
  const cleaned = await href();
  const problems = [];
  if (!note) problems.push("no calm note");
  if (status !== "none") problems.push(`status ${status}`);
  if (err) problems.push(`error shown: ${err}`);
  if (cleaned !== "/parents") problems.push(`address not cleaned: ${cleaned}`);
  report(`cancelled: note (${note}), no error, address ${cleaned}`, problems);
  await shoot("04-cancelled");
}

section("5 · monthly plan → checkout → confirming → onboarding → dashboard");
{
  await go("/parents");
  await until(`document.querySelector("[data-plan='monthly']")`);
  await tap("[data-plan='monthly'] input");
  const selected = await attr("[data-plan='monthly']", "data-plan-selected");
  report(`monthly selected (${selected !== null})`, selected !== null ? [] : ["not selected"]);
  await tap("[data-subscription-start]");
  const back = await until(`location.search.includes("checkout=success") || document.querySelector("[data-subscription-gate='confirming']")`, 6000);
  await wait(300);
  const confirming = await attr("[data-subscription-gate]", "data-subscription-gate");
  report(`back from Checkout (${back}): "${await text("[data-subscription-gate] h1")}"`, confirming === "confirming" ? [] : [`gate ${confirming}`]);
  await shoot("05-confirming");
  const onboarding = await until(`document.querySelector("[data-onboarding]")`, 8000);
  report(`webhook lands → onboarding (${onboarding}); address ${await href()}`, onboarding && (await href()) === "/parents" ? [] : ["no onboarding"]);
  await type("[data-onboarding] input", "Mia");
  await tap("[data-onboarding] button[type=submit]");
  const ready = await until(`document.querySelector("[data-parent-gate='ready']")`);
  const plan = await attr("[data-billing-row]", "data-billing-row");
  const planName = await text("[data-billing-plan]");
  const line = await text("[data-billing-line]");
  const chip = await text("[data-billing-status]");
  const problems = [];
  if (!ready) problems.push("no dashboard");
  if (plan !== "active") problems.push(`billing row ${plan}`);
  if (chip !== "Active") problems.push(`status chip "${chip}"`);
  if (!/Monthly · RM9\.90\/month/.test(planName ?? "")) problems.push(`plan "${planName}"`);
  if (!/Monthly plan, RM9\.90 a month\. Renews on/.test(line ?? "")) problems.push(`line "${line}"`);
  report(`dashboard: ${planName} — ${line}`, problems);
  await shoot("05-dashboard");

  await go("/play");
  const open = await exists("[data-play-gate]");
  const greeting = await js(`document.body.textContent.includes("Mia")`);
  report(`/play opens for the child (${!open}) and says hello to Mia (${greeting})`, !open && greeting ? [] : ["child still closed"]);
  await shoot("05-play-open");
}

section("6 · billing management and a failed payment");
{
  await go("/parents");
  await until(`document.querySelector("[data-billing-manage]")`);
  await tap("[data-billing-manage]");
  const portal = await until(`location.search.includes("portal=preview")`, 4000);
  report(`Manage subscription goes to the portal (${portal})`, portal ? [] : ["no portal"]);

  /* Stripe says the renewal failed: the parent area closes with a way to
     fix it; the child's page, already open, is left alone. */
  await go("/play");
  await until(`!document.querySelector("[data-play-gate]")`);
  await go("/parents");
  await until(`document.querySelector("[data-parent-gate='ready']")`);
  await js(`window.__kiddoPreviewSetSubscription?.({ status: "past_due" })`);
  const hasHook = await js(`typeof window.__kiddoPreviewSetSubscription === "function"`);
  const pastDue = hasHook && (await until(`document.querySelector("[data-subscription-gate='past_due']")`, 4000));
  const fix = pastDue && (await exists("[data-billing-manage]"));
  const headline = await text("[data-subscription-gate] h1");
  report(`past_due: parent area shows "${headline}" with a way to fix the card (${fix})`, pastDue && fix ? [] : ["past_due not handled"]);
  await shoot("06-past-due");

  await go("/play");
  report(`/play is closed again on a fresh visit while past due`, (await attr("[data-play-gate]", "data-play-gate")) === "closed" ? [] : ["open while past due"]);

  /* Card fixed. */
  await go("/parents");
  await js(`window.__kiddoPreviewSetSubscription?.({ status: "active" })`);
  const backOpen = await until(`document.querySelector("[data-parent-gate='ready']")`, 4000);
  report(`active again → dashboard (${backOpen})`, backOpen ? [] : ["stuck"]);

  /* Cancelled at period end still opens KIDDO until then. */
  await js(`window.__kiddoPreviewSetSubscription?.({ cancelAtPeriodEnd: true })`);
  await wait(400);
  const line = await text("[data-billing-line]");
  report(`cancel at period end: "${line}"`, /Cancelled\. KIDDO stays open until/.test(line ?? "") ? [] : ["line wrong"]);
  await js(`window.__kiddoPreviewSetSubscription?.({ status: "cancelled", cancelAtPeriodEnd: false })`);
  const ended = await until(`document.querySelector("[data-subscription-gate='cancelled']")`, 4000);
  report(`cancelled and ended: the gate says "${await text("[data-subscription-gate] h1")}" (${ended})`, ended ? [] : ["not gated"]);
  await shoot("06-cancelled");
}

section("7 · yearly plan, second parent");
{
  await go("/parents");
  await until(`document.querySelector("[data-gate-signout]")`);
  await tap("[data-gate-signout]");
  await until(`document.querySelector("[data-auth-card]")`);
  await tap("[data-auth-switch]");
  await type("[data-auth-email]", "second@example.com");
  await type("[data-auth-password]", "secret2");
  await type("[data-auth-confirm]", "secret2");
  await tap("[data-auth-submit]");
  await until(`document.querySelector("[data-plan='yearly']")`);
  await tap("[data-subscription-start]");
  await until(`document.querySelector("[data-subscription-gate='confirming']")`, 6000);
  const onboarding = await until(`document.querySelector("[data-onboarding]")`, 8000);
  await type("[data-onboarding] input", "Leo");
  await tap("[data-onboarding] button[type=submit]");
  await until(`document.querySelector("[data-parent-gate='ready']")`);
  const planName = await text("[data-billing-plan]");
  const confirmed = await exists("[data-checkout-confirmed]");
  report(`yearly: onboarding (${onboarding}) → "${planName}", confirmation shown (${confirmed})`, /Yearly · RM59\.90\/year/.test(planName ?? "") ? [] : [`plan "${planName}"`]);
  await shoot("07-yearly-dashboard");
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
  await js(`window.__kiddoPreviewSetSubscription?.({ status: "expired" })`);
  await until(`document.querySelector("[data-subscription-gate]")`, 4000);
  const gate = await frameProblems();
  await shoot(`10-${screen.name}-gate`);
  await js(`window.__kiddoPreviewSetSubscription?.({ status: "active" })`);
  await until(`document.querySelector("[data-parent-gate='ready']")`, 4000);
  report(`${screen.name} ${screen.width}×${screen.height}: billing dashboard + gate`, [...dash, ...gate.map((p) => `gate: ${p}`)]);
}
await applyViewport(cdp, sessionId, VIEWPORTS[1]);

section("11 · reduced motion");
{
  await reduce(true);
  await go("/parents");
  await js(`window.__kiddoPreviewSetSubscription?.({ status: "none", plan: null })`);
  const gate = await until(`document.querySelector("[data-subscription-gate='none']")`, 4000);
  const visible = await js(`(() => { const el = document.querySelector("[data-subscription-start]"); return el && getComputedStyle(el).opacity === "1"; })()`);
  report(`gate with reduced motion: present (${gate}) and fully visible at once (${visible})`, gate && visible ? [] : ["reduced motion"]);
  await reduce(false);
  await js(`window.__kiddoPreviewSetSubscription?.({ status: "active", plan: "yearly" })`);
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
