import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { beforeEach, test } from "node:test";

import {
  AUTH_TIMEOUT_MS,
  GOOGLE_TIMEOUT_MS,
  __resetSessionForTests,
  configureSession,
  currentSession,
  signIn,
  signInWithGoogle,
  signUp,
} from "@/lib/cloud/session";
import { en } from "@/lib/i18n/messages/en";
import { ms } from "@/lib/i18n/messages/ms";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import {
  REDIRECT_PENDING_KEY,
  googleSignInMethod,
  isRedirectPending,
  markRedirectPending,
} from "@/lib/firebase/signInMethod";

import { FakeCloud, sessionStore } from "./helpers/fakeCloud";

/**
 * Signing in from a KIDDO that lives on a home screen.
 *
 * The bug these guard against was one promise that never settled. Inside
 * `@firebase/auth`, an installed iOS app takes a branch that hands the Google
 * window to Safari and returns an `AuthPopup` with no window in it; the only
 * thing that would ever reject the sign-in is a poll on `window.closed`, and
 * `null?.closed` is `undefined` forever. The card awaited that promise with
 * the same `busy` flag the email form checked, so one tap on the button at
 * the top of the card killed sign-in, sign-up and password sign-in together.
 *
 * Nothing here can prove the fix on a real iPhone — no Node process can, and
 * the acceptance test is a phone in a hand. What they hold is everything
 * underneath it: that the road is chosen by the same test Firebase makes,
 * that only that one browser is moved off the popup, that a redirect's answer
 * is collected on the next load, that no promise is awaited without a last
 * moment, and that every word of it is in Malay first.
 */

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/* Agents as the devices themselves send them. */
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1";
const IPAD_AS_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";
const DESKTOP =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

let cloud: FakeCloud;

beforeEach(() => {
  __resetSessionForTests();
  sessionStore.clear();
  cloud = new FakeCloud();
});

/* ---- Which road, and only which road ----------------------------------- */

test("an installed iPhone is moved off the popup", () => {
  assert.equal(googleSignInMethod({ userAgent: IPHONE, standalone: true }), "redirect");
  /* Not Safari's privilege: every browser on iOS is WebKit and every one of
     them can add KIDDO to a home screen since 16.4. */
  assert.equal(googleSignInMethod({ userAgent: IPHONE_CHROME, standalone: true }), "redirect");
});

test("every other browser keeps the popup exactly as it was", () => {
  const popup = [
    /* The same iPhone, in a tab. The popup works here and is untouched. */
    { userAgent: IPHONE, standalone: false },
    { userAgent: IPHONE_CHROME, standalone: false },
    /* Android installed to the home screen: `display-mode: standalone`, but
       `navigator.standalone` is Safari's flag alone and Chrome's popup is a
       real window. Moving this one would be replacing a working flow. */
    { userAgent: ANDROID, standalone: false },
    { userAgent: ANDROID, standalone: true },
    { userAgent: DESKTOP, standalone: false },
    /* An iPad that calls itself a Macintosh, installed. KIDDO counts this as
       an Apple device for the install guide; Firebase does not count it as
       iOS, so the SDK still calls `window.open` and the popup still works.
       The two files disagree on purpose — see `signInMethod.ts`. */
    { userAgent: IPAD_AS_MAC, standalone: true },
  ];
  for (const env of popup) {
    assert.equal(googleSignInMethod(env), "popup", `${env.userAgent} (standalone: ${env.standalone})`);
  }
});

test("the iOS test is the SDK's own, character for character", () => {
  /* Copied rather than imported, because `_isIOS` is not exported and a
     private symbol that vanishes in a patch release would take sign-in with
     it. This is the copy's receipt: if Firebase widens or narrows its test,
     this fails rather than KIDDO quietly choosing the wrong road. */
  const sdk = readFileSync(
    "node_modules/@firebase/auth/dist/esm/index-CvXU3_1x.js",
    "utf8",
  );
  const theirs = /function _isIOS\(ua = getUA\(\)\) \{\s*return \(([^;]+)\);/.exec(sdk)?.[1] ?? "";
  const normalise = (s: string) => s.replace(/\s+/g, "");
  assert.ok(theirs, "could not find _isIOS in the installed @firebase/auth");
  assert.equal(
    normalise(theirs),
    normalise("/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && /mobile/i.test(ua))"),
    "@firebase/auth changed how it detects iOS; src/lib/firebase/signInMethod.ts must be changed with it",
  );

  /* And the branch itself: the reason any of this exists. If it ever stops
     returning a windowless popup, the redirect can go. */
  assert.match(
    sdk,
    /_isIOSStandalone\(ua\) && target !== '_self'[\s\S]{0,200}?return new AuthPopup\(null\)/,
    "@firebase/auth no longer opens iOS-standalone sign-in as a windowless popup — re-check signInMethod.ts",
  );
});

/* ---- The answer that comes back on the next page load ------------------ */

test("a pending redirect is a reason to load Firebase, with no account hint", async () => {
  markRedirectPending();
  assert.ok(isRedirectPending());
  assert.equal(sessionStore.getItem(REDIRECT_PENDING_KEY), "1");

  /* No `kiddo.account.v1`: this parent has never signed in on this device.
     Before the fix, `configureSession` would decide there was nothing to
     load and render an empty card over a completed sign-in. */
  cloud.redirectWaiting = true;
  cloud.redirectAnswer = "parent@gmail.test";
  configureSession(async () => cloud);
  assert.equal(currentSession().status, "loading");
  await settle();
  await settle();
  await settle();
  assert.equal(currentSession().user?.email, "parent@gmail.test");
});

test("getRedirectResult is asked on every cold start, not only after a redirect", async () => {
  let asked = 0;
  const watching = new Proxy(cloud, {
    get(target, key, receiver) {
      if (key === "completeGoogleRedirect") {
        asked++;
        return () => target.completeGoogleRedirect();
      }
      return Reflect.get(target, key, receiver);
    },
  });
  configureSession(async () => watching as unknown as FakeCloud);
  await settle();
  await settle();
  assert.equal(asked, 1, "the return leg must be collected before anything else asks a question");
  assert.equal(currentSession().status, "signed-out", "and an ordinary load carries on as before");
});

test("a redirect that comes back empty leaves the parent at a usable card", async () => {
  markRedirectPending();
  configureSession(async () => cloud);
  await settle();
  await settle();
  await settle();
  assert.equal(currentSession().status, "signed-out");
  assert.equal(isRedirectPending(), false, "and the marker does not survive to strand the next launch");
});

test("signing in with Google on an installed iPhone answers nothing and does not fail", async () => {
  cloud.googleRoad = "redirect";
  configureSession(async () => cloud);
  await settle();
  /* `null` is what the card is told, and it means "say nothing": the page
     is on its way to Google. It must not be an error. */
  assert.equal(await signInWithGoogle(), null);
  assert.equal(cloud.redirectWaiting, true);
});

/* ---- No promise is awaited forever ------------------------------------- */

test("every sign-in has a last moment", () => {
  assert.ok(AUTH_TIMEOUT_MS > 30_000, "must outlast Firebase's own 30s network timeout, so its error wins");
  assert.ok(AUTH_TIMEOUT_MS <= 60_000, "but a parent must not be left watching a dead button for a minute");
  assert.ok(GOOGLE_TIMEOUT_MS > AUTH_TIMEOUT_MS, "there is a person inside the Google window, picking an account");
  assert.ok(GOOGLE_TIMEOUT_MS <= 5 * 60_000);
});

test("a sign-in that never answers becomes a sentence, not a frozen button", async () => {
  const never = new FakeCloud();
  never.signIn = () => new Promise(() => {}) as ReturnType<FakeCloud["signIn"]>;
  configureSession(async () => never);
  await settle();

  /* Time is faked rather than waited out: the promise the store is racing
     against is the one that never settles, so the only thing that can end
     the test is the timer firing. */
  const realTimeout = globalThis.setTimeout;
  globalThis.setTimeout = ((fn: () => void, ms?: number) =>
    realTimeout(fn, ms && ms > 1000 ? 0 : ms)) as typeof globalThis.setTimeout;
  try {
    assert.equal(await signIn("parent@kiddo.test", "secret123"), "timed-out");
  } finally {
    globalThis.setTimeout = realTimeout;
  }
});

test("a stuck Google attempt cannot take the email form down with it", async () => {
  cloud.hangGoogle = true;
  configureSession(async () => cloud);
  await settle();

  /* The three-minute backstop is real, and this test is not going to sit
     through it: long timers are dropped for the duration so the attempt
     stays hung, which is the state being tested. Short ones — the `settle`
     below, and sign-up's own bounded wait — go through untouched. */
  const realTimeout = globalThis.setTimeout;
  const realClear = globalThis.clearTimeout;
  globalThis.setTimeout = ((fn: () => void, timeoutMs?: number, ...rest: unknown[]) =>
    (timeoutMs ?? 0) > 1000 ? 0 : realTimeout(fn, timeoutMs, ...rest)) as typeof globalThis.setTimeout;
  globalThis.clearTimeout = ((handle: unknown) => {
    if (handle !== 0) realClear(handle as ReturnType<typeof setTimeout>);
  }) as typeof globalThis.clearTimeout;

  try {
    /* The tap that used to kill the card. Never awaited — that is the
       point: it never answers. */
    let settled = false;
    void signInWithGoogle().then(() => (settled = true));
    await settle();
    assert.equal(settled, false, "the fake is hanging, as an installed iPhone used to");

    /* And the form underneath it still works, both ways round. */
    assert.equal(await signUp("parent@kiddo.test", "secret123"), null);
    assert.equal(currentSession().user?.email, "parent@kiddo.test");
    assert.equal(settled, false, "still hanging — and it changed nothing");
  } finally {
    globalThis.setTimeout = realTimeout;
    globalThis.clearTimeout = realClear;
  }
});

test("the card does not share one busy flag between Google and the form", () => {
  const card = readFileSync("src/components/account/AuthCard.tsx", "utf8");
  /* The bug in one line: `google()` set `busy`, and `submit()` opened with
     `if (busy) return`. Read from the source because the failure is a
     component-level deadlock, and the two handlers are what deadlocked. */
  const googleFn = /async function google\(\)[\s\S]*?\n  \}/.exec(card)?.[0] ?? "";
  const submitFn = /async function submit\(event: FormEvent\)[\s\S]*?\n  \}\n/.exec(card)?.[0] ?? "";
  assert.ok(googleFn && submitFn, "could not find the two handlers");
  assert.match(googleFn, /setGoogleBusy\(true\)/);
  assert.ok(
    !/\bsetBusy\(/.test(googleFn),
    "google() must not touch the form's busy flag — that is how it froze sign-in and sign-up",
  );
  assert.ok(
    !/if \(googleBusy\) return/.test(submitFn),
    "submit() must not refuse to run because Google is busy",
  );
});

/* ---- The words ---------------------------------------------------------- */

test("the new sentences are in both catalogues, and Malay is the default", () => {
  assert.equal(DEFAULT_LOCALE, "ms");
  for (const key of ["auth.error.timed-out", "auth.google.leaving"] as const) {
    assert.ok(en[key], `${key} is missing from the English catalogue`);
    assert.ok(ms[key], `${key} is missing from the Malay catalogue`);
    assert.notEqual(ms[key], en[key], `${key} was never translated`);
  }
});

test("no new authentication string is hardcoded into the card", () => {
  const card = readFileSync("src/components/account/AuthCard.tsx", "utf8");
  /* Every word a parent reads on this card comes through `t(...)`. A string
     literal long enough to be a sentence, sitting inside JSX, would be one
     that skipped the language switcher entirely. */
  const inJsx = card.match(/>\s*[A-Z][a-z]+ [a-z][^<>{}]{12,}</g) ?? [];
  assert.deepEqual(inJsx, [], `hardcoded sentence(s) in AuthCard: ${inJsx.join(" | ")}`);
});

test("the timeout has a sentence of its own, and it does not blame the parent", () => {
  /* `auth.error.timed-out` must not fall back to "something went wrong":
     KIDDO gave up waiting, which is a different thing and suggests a
     different next step. */
  assert.notEqual(ms["auth.error.timed-out"], ms["auth.error.unknown"]);
  assert.match(ms["auth.error.timed-out"], /cuba lagi/i, "it must say that trying again is worth doing");
});

/* ---- What has to be true of the deployment ----------------------------- */

test("the auth handler is proxied onto KIDDO's own origin", () => {
  const netlify = readFileSync("netlify.toml", "utf8");
  /* A redirect sign-in parks its half-finished state in the handler's
     storage while the parent is away at Google. On a third-party origin
     Safari takes that storage away, which is the whole reason Firebase says
     to move `authDomain` onto your own domain before using redirects. */
  assert.match(netlify, /from\s*=\s*"\/__\/auth\/\*"/);
  assert.match(netlify, /status\s*=\s*200/, "must be a rewrite, not a redirect — the browser must not see the other host");
  assert.match(netlify, /force\s*=\s*true/, "Next.js owns every other path and would answer 404 here");
});

test("the policy allows the iframe at its new address", () => {
  const config = readFileSync("next.config.ts", "utf8");
  const frame = /"frame-src ([^"]+)"/.exec(config)?.[1] ?? "";
  assert.ok(frame.includes("'self'"), "the proxied /__/auth/iframe is now same-origin");
  assert.ok(
    frame.includes("https://kiddocares-b105e.firebaseapp.com"),
    "a build with NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN unset must still be able to sign a parent in",
  );
});
