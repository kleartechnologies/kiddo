/**
 * Measures KIDDO in both of its languages, in a real browser.
 *
 * The unit tests already prove the two catalogues are complete, that every
 * dealt challenge means the same thing in Malay as in English, and that no id
 * ever moves. None of that says the language actually *reaches the screen* —
 * that a parent can find the switch, that pressing it changes the sentence
 * over a game board, and that a household reading Bahasa Melayu is not handed
 * an English button halfway down the page. That is what this measures.
 *
 *    1 the switch      in the chrome on phone and on desktop: two options,
 *                      the current one ticked, openable from the keyboard
 *    2 landing         every named part of the page says something else, the
 *                      prices say the same thing, and `<html lang>` follows
 *    3 privacy         the same page in two languages
 *    4 join            both; the plan the parent chose survives the switch
 *    5 welcome         both; the child's name is a name, not a string
 *    6 parent area     both; account, subscription and billing labels
 *    7 games           all six quests, in both — and a language changed in
 *                      the middle of a round moves nothing but the words:
 *                      same options, same ids, same order, same verdict on
 *                      the tile just pressed, same progress, no restart
 *    8 memory          the preference outlives the tab, and a device asking
 *                      for Malay is answered in Malay — while a device
 *                      asking for Indonesian is not
 *    9 console         nothing logged
 *
 *   node scripts/measure-language.mjs [--shots=<dir>] [http://host:port]
 *
 * Expects the account-free measuring server on port 4310:
 *
 *     npm run measure:serve
 *
 * That is a production build with the NEXT_PUBLIC_FIREBASE_* variables unset
 * — a mode KIDDO ships rather than a rig, see `scripts/measure-serve.mjs` —
 * and the account screens are reached through the pretend cloud the same way
 * `measure-account.mjs` reaches them. Pointed at a configured server this
 * exits 2 and says so: the way past a real sign-in form is a different
 * server, never a weaker gate.
 *
 * ## Why the language is changed twice, two different ways
 *
 * On a grown-up's screen it is changed the way a grown-up changes it: the
 * switcher is tapped. On the child's screen there is no switcher, on purpose
 * — a four year old does not need one and must not find one — so the round
 * is switched the way it really happens, from another tab: the preference is
 * written and a `storage` event is fired, which is exactly what a second tab
 * would deliver. `useLocale` subscribes to that event because a language is
 * a household decision. Nothing here reaches inside React, and nothing here
 * exists in the product only for this script.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { VIEWPORTS, applyViewport, clickAt, evaluate, openBrowser, settle, visit } from "./cdp.mjs";
import { announce, requireAccountFree } from "./measure-mode.mjs";

const ARGS = process.argv.slice(2);
const SHOTS = ARGS.find((arg) => arg.startsWith("--shots="))?.slice(8) ?? null;
const ORIGIN = ARGS.find((arg) => arg.startsWith("http")) ?? "http://127.0.0.1:4310";

const LOCALE_KEY = "kiddo.locale.v1";
const CHILD = "Mia";
const MIN_TOUCH = 48;

/**
 * English words with no Malay homograph.
 *
 * A leaked English sentence is the failure this looks for, and looking for it
 * word by word is the only way that scales: there are hundreds of strings and
 * a list of the expected Malay ones would be a second catalogue to keep in
 * step. Function words are the reliable signal — none of these is a Malay
 * word, and no Malay sentence contains one. Names do not matter (KIDDO,
 * Stripe, Mia), and neither do prices, because none of them is here.
 */
const ENGLISH_ONLY =
  /\b(the|and|your|you're|you|with|from|that|this|these|those|are|is|was|were|will|our|its|their|about|when|what|which|who|there|here|every|any|each|of|for|to)\b/i;

const WATCH_FOR_TROUBLE = `
  window.__trouble = [];
  for (const kind of ["error", "warn"]) {
    const real = console[kind].bind(console);
    console[kind] = (...args) => {
      const line = args.join(" ");
      if (!line.includes("motion.dev/troubleshooting/reduced-motion")) window.__trouble.push(line);
      real(...args);
    };
  }
  addEventListener("error", (e) => window.__trouble.push(String(e.message)));
  addEventListener("unhandledrejection", (e) => window.__trouble.push(String(e.reason)));
`;

let failures = 0;
const troubleSeen = [];
const report = (line, problems) => {
  if (problems.length) failures += 1;
  console.log(`  ${line}${problems.length ? `  ✗ ${problems.join("; ")}` : "  ✓"}`);
};
const section = (title) => console.log(`\n${title}`);

if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const { cdp, sessionId, close } = await openBrowser(9352);
const mode = await requireAccountFree(cdp, sessionId, ORIGIN);
announce(mode);
await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: WATCH_FOR_TROUBLE }, sessionId);

const js = (expression) => evaluate(cdp, sessionId, expression);
const jsObject = async (expression) =>
  JSON.parse(await evaluate(cdp, sessionId, `JSON.stringify((${expression}))`));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const collectTrouble = async () => {
  troubleSeen.push(...(await js("window.__trouble ? window.__trouble.splice(0) : []")));
};
const go = async (path, ms = 900) => {
  await collectTrouble();
  await visit(cdp, sessionId, `${ORIGIN}${path}`, ms);
};
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
async function typeInto(selector, value) {
  await tap(selector);
  await js(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.focus(); el.select?.(); })()`);
  await cdp.send("Input.insertText", { text: value }, sessionId);
}
const text = (selector) =>
  js(`document.querySelector(${JSON.stringify(selector)})?.textContent?.replace(/\\s+/g, " ")?.trim() ?? null`);
const attr = (selector, name) =>
  js(`document.querySelector(${JSON.stringify(selector)})?.getAttribute(${JSON.stringify(name)}) ?? null`);
const exists = (selector) => js(`!!document.querySelector(${JSON.stringify(selector)})`);
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

/* ---------------------------------------------------------------- speaking */

/** Change the language the way a grown-up does: press the switch. */
async function chooseLanguage(locale) {
  await tap("[data-language-switcher] button[data-locale-trigger]");
  await until(`document.querySelector('[data-locale-option="${locale}"]')`, 2000);
  await tap(`[data-locale-option="${locale}"]`);
  await until(`document.documentElement.lang === "${locale}"`, 2000);
  await settle(cdp, sessionId, 300);
}

/**
 * Change the language from another tab, which is the only way a language can
 * change while a child is playing. `useLocale` listens for exactly this.
 */
async function languageFromAnotherTab(locale) {
  await js(
    `(() => {
      localStorage.setItem(${JSON.stringify(LOCALE_KEY)}, ${JSON.stringify(locale)});
      window.dispatchEvent(new StorageEvent("storage", { key: ${JSON.stringify(LOCALE_KEY)} }));
    })()`,
  );
  await settle(cdp, sessionId, 350);
}

/** The words on a page, by the hooks that name its parts. */
const saidOn = (hooks) =>
  jsObject(`(() => {
    const said = {};
    for (const [name, selector] of ${JSON.stringify(Object.entries(hooks))}) {
      const el = document.querySelector(selector);
      said[name] = el ? (el.innerText || el.textContent || "").replace(/\\s+/g, " ").trim() : null;
    }
    said.__lang = document.documentElement.lang;
    said.__body = (document.body.innerText || "").replace(/\\s+/g, " ").trim();
    return said;
  })()`);

/**
 * Compare one page said twice.
 *
 * `changes` are the parts that must say something else — a heading still in
 * English is the bug this whole file exists to catch. `keeps` are the parts
 * that must not: a price is a price in every language.
 */
function compare(english, malay, { changes, keeps }) {
  const problems = [];
  for (const name of changes) {
    if (english[name] === null) problems.push(`${name} is not on the page`);
    else if (english[name] === malay[name]) problems.push(`${name} still says "${english[name]?.slice(0, 40)}"`);
  }
  for (const name of keeps) {
    if (english[name] !== malay[name]) problems.push(`${name} moved: "${english[name]}" → "${malay[name]}"`);
  }
  if (malay.__lang !== "ms") problems.push(`<html lang> is "${malay.__lang}"`);
  if (english.__lang !== "en") problems.push(`<html lang> in English is "${english.__lang}"`);
  const leak = malay.__body.match(ENGLISH_ONLY);
  if (leak) {
    const at = malay.__body.indexOf(leak[0]);
    problems.push(`English left in the Malay page: "…${malay.__body.slice(Math.max(0, at - 30), at + 40)}…"`);
  }
  return problems;
}

/** Say a page in both languages, from the switcher that is on it. */
async function bothWays(path, hooks) {
  await go(path);
  await until(`document.querySelector("[data-language-switcher]")`, 4000);
  await chooseLanguage("en");
  const english = await saidOn(hooks);
  await chooseLanguage("ms");
  const malay = await saidOn(hooks);
  return { english, malay };
}

/* ======================================================================== */

await applyViewport(cdp, sessionId, VIEWPORTS[7]);
await go("/play", 600);
await js(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem("kiddo.preview.cloud", "1");`);

section("1 · the switch");
for (const viewport of [VIEWPORTS[0], VIEWPORTS[7]]) {
  await applyViewport(cdp, sessionId, viewport);
  await go("/");
  const shut = await jsObject(`(() => {
    const trigger = document.querySelector("[data-language-switcher] button[data-locale-trigger]");
    const box = trigger?.getBoundingClientRect();
    return {
      there: !!trigger,
      locale: trigger?.dataset.localeTrigger,
      expanded: trigger?.getAttribute("aria-expanded"),
      popup: trigger?.getAttribute("aria-haspopup"),
      named: (trigger?.getAttribute("aria-label") || "").trim(),
      height: box ? Math.round(box.height) : 0,
      onScreen: box ? box.left >= -0.5 && box.right <= innerWidth + 0.5 : false,
      open: !!document.querySelector("[data-locale-option]"),
    };
  })()`);
  const problems = [];
  if (!shut.there) problems.push("no switcher in the chrome");
  if (shut.open) problems.push("the list is open before anyone asked");
  if (shut.expanded !== "false") problems.push(`aria-expanded ${shut.expanded}`);
  if (shut.popup !== "menu") problems.push(`aria-haspopup ${shut.popup}`);
  if (!shut.named) problems.push("the button has no accessible name");
  if (shut.height < MIN_TOUCH - 0.5) problems.push(`${shut.height}px tall`);
  if (!shut.onScreen) problems.push("off the edge of the screen");
  report(`${viewport.name} · switch closed, showing ${shut.locale}, named "${shut.named}"`, problems);

  /* Down opens it from the keyboard, and the list is a radio group: exactly
     one option is checked and it is the language that is on. */
  await js(`document.querySelector("[data-language-switcher] button[data-locale-trigger]").focus()`);
  await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 }, sessionId);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 }, sessionId);
  await settle(cdp, sessionId, 250);
  const opened = await jsObject(`(() => {
    const options = [...document.querySelectorAll("[data-locale-option]")];
    return {
      list: options.map((o) => ({
        locale: o.dataset.localeOption,
        role: o.getAttribute("role"),
        checked: o.getAttribute("aria-checked"),
        label: o.textContent.replace(/\\s+/g, " ").trim(),
        height: Math.round(o.getBoundingClientRect().height),
      })),
      menu: document.querySelector("[data-language-switcher] [role=menu]") !== null,
      expanded: document.querySelector("[data-locale-trigger]")?.getAttribute("aria-expanded"),
    };
  })()`);
  const list = opened.list;
  const checked = list.filter((o) => o.checked === "true");
  const open = [];
  if (list.length !== 2) open.push(`${list.length} option(s)`);
  if (!opened.menu) open.push("the list is not a menu");
  if (opened.expanded !== "true") open.push(`aria-expanded ${opened.expanded}`);
  if (list.some((o) => o.role !== "menuitemradio")) open.push("an option is not a radio");
  if (checked.length !== 1) open.push(`${checked.length} option(s) marked as current`);
  if (checked[0]?.locale !== shut.locale) open.push(`${checked[0]?.locale} is ticked but ${shut.locale} is on`);
  if (list.some((o) => o.height < MIN_TOUCH - 0.5)) open.push("an option is under 48px");
  if (!list.some((o) => /Bahasa Melayu/.test(o.label))) open.push("Bahasa Melayu is not offered by name");
  if (!list.some((o) => /English/.test(o.label))) open.push("English is not offered by name");
  report(`${viewport.name} · opens on ArrowDown → ${list.map((o) => o.label).join(" | ")}`, open);
  await shoot(`01-switch-${viewport.width}`);

  /* Escape puts it away and hands focus back, so a keyboard is never
     stranded inside a menu it cannot leave. */
  await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }, sessionId);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }, sessionId);
  await settle(cdp, sessionId, 250);
  const escaped = await jsObject(`(() => ({
    open: !!document.querySelector("[data-locale-option]"),
    focused: document.activeElement?.dataset?.localeTrigger ?? null,
  }))()`);
  report(`${viewport.name} · Escape closes it and gives focus back`, [
    escaped.open ? "the list stayed open" : null,
    escaped.focused ? null : "focus was dropped",
  ].filter(Boolean));
}

await applyViewport(cdp, sessionId, VIEWPORTS[7]);

section("2 · landing");
{
  const hooks = {
    hero: "#hero-heading",
    cta: "[data-landing-cta]",
    signin: "[data-landing-signin]",
    header: "header",
    footer: "footer",
    closing: "[data-landing-closing-cta]",
    yearly: '[data-pricing-plan="yearly"]',
    monthly: '[data-pricing-plan="monthly"]',
    yearlyCta: '[data-pricing-cta="yearly"]',
    badge: '[data-pricing-plan="yearly"] [data-pricing-note]',
    saving: "[data-pricing-saving]",
    yearlyPrice: '[data-pricing-plan="yearly"] [data-pricing-price]',
    monthlyPrice: '[data-pricing-plan="monthly"] [data-pricing-price]',
  };
  const { english, malay } = await bothWays("/", hooks);
  report(
    `landing · en "${english.hero?.slice(0, 34)}…" → ms "${malay.hero?.slice(0, 34)}…"`,
    compare(english, malay, {
      changes: ["hero", "cta", "signin", "header", "footer", "closing", "yearly", "monthly", "yearlyCta", "badge", "saving"],
      keeps: ["yearlyPrice", "monthlyPrice"],
    }),
  );
  report(`landing · prices unmoved: ${malay.yearlyPrice} / ${malay.monthlyPrice}`, [
    /RM59\.90/.test(malay.yearlyPrice ?? "") ? null : `yearly says ${malay.yearlyPrice}`,
    /RM9\.90/.test(malay.monthlyPrice ?? "") ? null : `monthly says ${malay.monthlyPrice}`,
  ].filter(Boolean));
  await shoot("02-landing-ms");

  /* The plan is chosen by pressing a card, and which card was pressed is in
     the address. A language is not a plan. */
  await tap('[data-pricing-cta="yearly"]');
  await until(`location.pathname === "/join"`, 4000);
  const wentTo = await js("location.pathname + location.search");
  report(`landing · a Malay parent choosing yearly lands on ${wentTo}`, wentTo === "/join?plan=yearly" ? [] : ["plan lost in translation"]);
}

section("3 · privacy");
{
  const hooks = { title: "main h1", body: "main", back: 'a[aria-label="KIDDO home"]' };
  const { english, malay } = await bothWays("/privacy", hooks);
  report(`privacy · en "${english.title}" → ms "${malay.title}"`, compare(english, malay, { changes: ["title", "body"], keeps: [] }));
  await shoot("03-privacy-ms");
}

section("4 · join");
{
  const hooks = {
    plan: "[data-join-plan]",
    yearly: '[data-join-plan-option="yearly"]',
    monthly: '[data-join-plan-option="monthly"]',
    auth: "[data-auth-card]",
    submit: "[data-auth-submit]",
    switch: "[data-auth-switch]",
    back: "[data-join-back]",
  };
  await go("/join?plan=monthly");
  await until(`document.querySelector("[data-join-gate='signed-out']")`, 6000);
  await chooseLanguage("en");
  const english = await saidOn(hooks);
  const gateBefore = await attr("[data-join-gate]", "data-join-gate");
  const chosenBefore = await attr("[data-join-plan]", "data-join-plan");
  const selectedBefore = await js(`[...document.querySelectorAll("[data-join-plan-option]")].filter((o) => o.hasAttribute("data-join-plan-selected")).map((o) => o.dataset.joinPlanOption).join()`);
  await chooseLanguage("ms");
  const malay = await saidOn(hooks);
  const gateAfter = await attr("[data-join-gate]", "data-join-gate");
  const chosenAfter = await attr("[data-join-plan]", "data-join-plan");
  const selectedAfter = await js(`[...document.querySelectorAll("[data-join-plan-option]")].filter((o) => o.hasAttribute("data-join-plan-selected")).map((o) => o.dataset.joinPlanOption).join()`);
  report(
    `join · the sign-up form in two languages ("${english.submit}" → "${malay.submit}")`,
    compare(english, malay, { changes: ["plan", "yearly", "monthly", "auth", "submit", "switch", "back"], keeps: [] }),
  );
  report(`join · the plan chosen stays chosen: ${gateBefore}/${chosenBefore}/${selectedBefore} → ${gateAfter}/${chosenAfter}/${selectedAfter}`, [
    gateBefore === "signed-out" ? null : `arrived at the ${gateBefore} gate`,
    gateAfter === gateBefore ? null : `the switch moved the gate to ${gateAfter}`,
    chosenBefore === "monthly" ? null : `arrived on ${chosenBefore}`,
    chosenAfter === chosenBefore ? null : `the switch changed the plan to ${chosenAfter}`,
    selectedAfter === selectedBefore ? null : `the selected card moved to ${selectedAfter}`,
    (await exists("[data-auth-email]")) && (await exists("[data-auth-password]")) ? null : "the sign-up form went missing",
  ].filter(Boolean));
  await shoot("04-join-ms");
}

section("5 · an account, in Malay");
{
  /* Made in Malay on purpose: a parent who switched on the landing page
     should never meet English again on the way in. */
  await go("/parents");
  await until(`document.querySelector("[data-auth-card]")`, 6000);
  await tap("[data-auth-switch]");
  await typeInto("[data-auth-email]", "parent@example.com");
  await typeInto("[data-auth-password]", "secret1");
  await typeInto("[data-auth-confirm]", "secret1");
  await tap("[data-auth-submit]");
  const gate = await until(`document.querySelector("[data-subscription-gate]")`, 8000);
  const gateText = await text("[data-subscription-gate] h1");
  report(`signing up in Malay reaches the subscription gate (${gate}): "${gateText}"`, [
    gate ? null : "no gate",
    ENGLISH_ONLY.test(gateText ?? "") ? `the gate is in English: "${gateText}"` : null,
  ].filter(Boolean));

  await tap("[data-subscription-start]");
  await until(`location.search.includes("checkout=success") || document.querySelector("[data-subscription-gate='confirming']")`, 8000);
  const onboarding = await until(`document.querySelector("[data-onboarding]")`, 10000);
  report(`the pretend webhook lands and onboarding asks in Malay (${onboarding})`, onboarding ? [] : ["no onboarding"]);
  await typeInto("[data-onboarding] input", CHILD);
  await tap("[data-onboarding] button[type=submit]");
  const ready = await until(`document.querySelector("[data-parent-gate='ready']")`, 8000);
  report(`the dashboard opens (${ready})`, ready ? [] : ["no dashboard"]);
  await shoot("05-dashboard-ms");
}

section("6 · welcome & the parent area");
{
  const welcome = await bothWays("/welcome", {
    body: "main",
    enter: "[data-welcome-enter]",
  });
  const welcomeState = await attr("[data-welcome]", "data-welcome");
  report(
    `welcome · ${welcomeState} · "${welcome.english.enter}" → "${welcome.malay.enter}"`,
    [
      ...compare(welcome.english, welcome.malay, { changes: ["body", "enter"], keeps: [] }),
      welcomeState === "open" ? null : `the switch left the page at "${welcomeState}"`,
    ].filter(Boolean),
  );
  await shoot("06-welcome-ms");

  const parents = await bothWays("/parents", {
    greeting: "#parent-heading",
    open: "[data-open-kiddo]",
    summary: "[data-parent-summary]",
    overview: "[data-parent-overview]",
    worlds: "[data-parent-worlds]",
    next: "[data-parent-next]",
    account: "[data-account-row]",
    signout: "[data-account-signout]",
    billing: "[data-billing-row]",
    plan: "[data-billing-plan]",
    line: "[data-billing-line]",
    status: "[data-billing-status]",
    manage: "[data-billing-manage]",
    privacy: "[data-parent-privacy]",
    email: "[data-account-email]",
    child: "[data-parent-child]",
  });
  report(
    `parent area · billing "${parents.english.status}" → "${parents.malay.status}"`,
    compare(parents.english, parents.malay, {
      changes: ["greeting", "open", "summary", "overview", "worlds", "next", "account", "signout", "billing", "plan", "line", "status", "manage", "privacy", "child"],
      /* An email address is a fact about the account, not a word. */
      keeps: ["email"],
    }),
  );
  /* The child's row is written in whichever language the parent reads, and
     the child's name is the one thing in it that is not. */
  report(`parent area · the account still reads ${parents.malay.email} for ${CHILD}`, [
    parents.malay.email === "parent@example.com" ? null : `email says "${parents.malay.email}"`,
    (parents.english.child ?? "").includes(CHILD) ? null : `English row says "${parents.english.child}"`,
    (parents.malay.child ?? "").includes(CHILD) ? null : `Malay row says "${parents.malay.child}"`,
  ].filter(Boolean));
  await shoot("06-parents-ms");
}

section("7 · games, and a language changed mid-round");

/** Everything a board is, told in a way a language cannot change. */
const BOARD = `(() => {
  const bar = document.querySelector("[role=progressbar]");
  const tiles = [...document.querySelectorAll("[data-option-id]")];
  const nodes = [...document.querySelectorAll("[data-node-id]")];
  return {
    title: document.querySelector("h1")?.textContent.replace(/\\s+/g, " ").trim() ?? null,
    said: document.querySelector("main p[role=status]")?.textContent.replace(/\\s+/g, " ").trim() ?? null,
    ids: tiles.map((t) => t.dataset.optionId),
    states: tiles.map((t) => t.dataset.optionState),
    nodes: nodes.map((n) => n.dataset.nodeId),
    now: bar?.getAttribute("aria-valuenow") ?? null,
    max: bar?.getAttribute("aria-valuemax") ?? null,
    lang: document.documentElement.lang,
    english: (document.querySelector("main")?.innerText || "").match(${ENGLISH_ONLY})?.[0] ?? null,
  };
})()`;

const QUESTS = [
  { id: "math-quest", answers: "tiles" },
  { id: "english-quest", answers: "tiles" },
  { id: "logic-quest", answers: "tiles" },
  { id: "shapes-colours-quest", answers: "tiles" },
  { id: "general-knowledge-quest", answers: "tiles" },
  { id: "match-quest", answers: "cards" },
];

for (const quest of QUESTS) {
  await languageFromAnotherTab("en");
  await go(`/play/${quest.id}`, 1200);
  const started = await until(`document.querySelector("main button")`, 6000);
  if (started) await tap("main button");
  const dealt = await until(`document.querySelector("[data-option-id]") || document.querySelector("[data-node-id]")`, 8000);
  if (!dealt) {
    report(`${quest.id} · never dealt a board`, ["no board"]);
    continue;
  }
  await settle(cdp, sessionId, 400);

  /* Answer once, wrongly if the board allows it: a wrong answer in a quest
     advances nothing, which leaves a verdict standing on the tile long
     enough to carry it across a language. */
  const listening = `![...document.querySelectorAll('[data-option-id] button')].some((b) => b.getAttribute("aria-disabled") === "true")`;
  const quiet = async () => {
    /* A locked board is a board part-way through saying something. Reading
       one is how a measurement ends up comparing two different questions. */
    await until(listening, 6000);
    await settle(cdp, sessionId, 350);
  };
  if (quest.answers === "tiles") {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await quiet();
      const board = await jsObject(BOARD);
      if (board.states.some((state) => state === "wrong" || state === "tried")) break;
      const idle = board.states.indexOf("idle");
      if (idle < 0) break;
      await tap(`[data-option-id="${board.ids[idle]}"] button`);
      await settle(cdp, sessionId, 400);
    }
    await quiet();
  }

  const english = await jsObject(BOARD);
  await languageFromAnotherTab("ms");
  const malay = await jsObject(BOARD);

  const problems = [];
  if (english.ids.join("|") !== malay.ids.join("|")) problems.push(`answer ids changed: ${english.ids.join()} → ${malay.ids.join()}`);
  if (english.nodes.join("|") !== malay.nodes.join("|")) problems.push(`node ids changed: ${english.nodes.join()} → ${malay.nodes.join()}`);
  if (english.states.join("|") !== malay.states.join("|")) problems.push(`the verdict changed: ${english.states.join()} → ${malay.states.join()}`);
  if (english.now !== malay.now || english.max !== malay.max) problems.push(`progress moved: ${english.now}/${english.max} → ${malay.now}/${malay.max}`);
  if (english.said && english.said === malay.said) problems.push(`the question is still in English: "${english.said?.slice(0, 46)}"`);
  if (english.title === malay.title) problems.push(`the game is still called "${english.title}"`);
  if (malay.lang !== "ms") problems.push(`<html lang> is "${malay.lang}"`);
  if (malay.english) problems.push(`English left on the Malay board: "${malay.english}"`);
  const board = quest.answers === "tiles" ? `${english.ids.length} tiles ${english.states.join("/")}` : `${english.nodes.length} cards`;
  report(`${quest.id} · ${board} at ${english.now}/${english.max} → ${malay.lang}, unmoved`, problems);
  await shoot(`07-${quest.id}-ms`);

  /* And the round goes on from where it was rather than starting again:
     answering correctly, now in Malay, advances the same round. */
  if (quest.answers === "tiles") {
    let advanced = false;
    const trail = [];
    const moved = `(document.querySelector("[role=progressbar]")?.getAttribute("aria-valuenow") ?? null) !== ${JSON.stringify(malay.now)}`;
    /* Every tile, and then every tile again: a nudge redraws the board under
       the finger, so a press can be swallowed by the redraw rather than by
       being wrong. Two passes over three tiles cannot miss the right one. */
    for (const id of [...malay.ids, ...malay.ids]) {
      if (advanced) break;
      await until(listening, 5000);
      await settle(cdp, sessionId, 200);
      /* A tile already ruled out is ruled out in both languages: pressing it
         again proves nothing and marks nothing. */
      const state = await js(`document.querySelector('[data-option-id="${id}"]')?.dataset.optionState ?? null`);
      if (state !== "idle") continue;
      await tap(`[data-option-id="${id}"] button`);
      /* A right answer is celebrated before the round moves on, so the dots
         are given the length of that celebration to catch up. */
      advanced = await until(moved, 5000);
      trail.push(`${id}→${advanced ? "on" : await js(`document.querySelector('[data-option-id="${id}"]')?.dataset.optionState ?? "gone"`)}`);
    }
    report(`${quest.id} · answered in Malay, the same round moves on (${trail.join(" ")})`, advanced ? [] : ["the round did not advance"]);
  }
}

section("8 · memory");
{
  /* Chosen once, remembered for ever: a new visit opens in Malay with
     nobody pressing anything. */
  await go("/", 1200);
  const remembered = await jsObject(`(() => ({ lang: document.documentElement.lang, stored: localStorage.getItem(${JSON.stringify(LOCALE_KEY)}) }))()`);
  report(`a new visit opens in ${remembered.lang} (stored: ${remembered.stored})`, [
    remembered.stored === "ms" ? null : `stored "${remembered.stored}"`,
    remembered.lang === "ms" ? null : `opened in "${remembered.lang}"`,
  ].filter(Boolean));

  /* And with nothing chosen, the device decides — Malay for a Malaysian
     phone, and English for an Indonesian one, because `id` is not `ms`. */
  const ua = await js("navigator.userAgent");
  for (const [asked, expected] of [["ms-MY", "ms"], ["ms", "ms"], ["id-ID", "en"], ["en-GB", "en"], ["fr-FR", "en"]]) {
    await cdp.send("Emulation.setUserAgentOverride", { userAgent: ua, acceptLanguage: asked }, sessionId);
    await go("/", 900);
    await js(`localStorage.removeItem(${JSON.stringify(LOCALE_KEY)})`);
    await go("/", 1200);
    const got = await jsObject(`(() => ({ lang: document.documentElement.lang, languages: navigator.languages.join() }))()`);
    report(`a device asking for ${asked} (navigator: ${got.languages}) is answered in ${got.lang}`, got.lang === expected ? [] : [`expected ${expected}`]);
  }
  await cdp.send("Emulation.setUserAgentOverride", { userAgent: ua, acceptLanguage: "en-US" }, sessionId);
}

section("9 · console");
await collectTrouble();
report(`${troubleSeen.length} error/warning line(s) across both languages`, troubleSeen.length ? troubleSeen.slice(0, 3) : []);

await close();
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
