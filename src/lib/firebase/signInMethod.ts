/**
 * Which road "Continue with Google" takes on this browser.
 *
 * There is one browser in the world where `signInWithPopup` cannot work, and
 * it is the one KIDDO was just taught to install itself onto. Inside
 * `@firebase/auth` (12.18.0, `index-CvXU3_1x.js:10576`) the popup opener has
 * a branch nobody reaches from a tab:
 *
 *     if (_isIOSStandalone(ua) && target !== '_self') {
 *         openAsNewWindowIOS(url || '', target);
 *         return new AuthPopup(null);      // ← no window handle
 *     }
 *     const newWin = window.open(url || '', target, optionsString);
 *
 * `openAsNewWindowIOS` synthesises a click on an `<a target="_blank">`, which
 * iOS hands to *Safari* — a different application, with a different storage
 * partition, which can never post an answer back into the installed app. The
 * returned `AuthPopup` carries `window: null`, and the only thing that would
 * ever reject the sign-in promise is a poll on that missing window:
 *
 *     if (this.authWindow?.window?.closed) { … reject("popup-closed-by-user") }
 *
 * `null?.closed` is `undefined`, so it polls every two seconds forever. The
 * promise never settles: no account, no error, no timeout. Measured on the
 * live site — three profiles, same build, same origin, `window.open`
 * instrumented — and the installed profile is the only one where it is never
 * called at all.
 *
 * So this file answers one question, and it answers it by *mirroring the
 * SDK's own test rather than KIDDO's*. `install.ts` has its own idea of
 * "an Apple device", which is deliberately wider — it counts an iPad that
 * calls itself a Macintosh, because that iPad really can add KIDDO to its
 * home screen. Firebase's `_isIOS` does not count that iPad unless the agent
 * also says `Mobile`, so on that one device the SDK still calls `window.open`
 * and the popup still works. Answering `redirect` there would be replacing a
 * working flow with an unverified one, which §5 of the brief forbids. The two
 * files disagree on purpose, and this is the disagreement.
 *
 * Everywhere else — every desktop, Android in a tab, Android installed,
 * iPhone Safari in a tab — keeps the popup exactly as it was.
 */

/** The three facts the answer is derived from. Pure in, pure out. */
export interface SignInEnvironment {
  userAgent: string;
  /** `navigator.standalone`: Safari's flag for a home-screen launch. */
  standalone: boolean;
}

export type GoogleSignInMethod =
  /** A real second window on KIDDO's own opener. The original road. */
  | "popup"
  /** A full-page trip to Google and back. iOS home-screen apps only. */
  | "redirect";

/**
 * `_isIOS` from `@firebase/auth`, copied rather than imported: it is not
 * exported, and a private symbol that disappears in a patch release would
 * take sign-in with it. Held in step by `tests/pwaAuth.test.ts`, which reads
 * the SDK's own source and fails if the two regexes drift apart.
 */
function isFirebaseIOS(userAgent: string): boolean {
  return /iphone|ipad|ipod/i.test(userAgent) || (/macintosh/i.test(userAgent) && /mobile/i.test(userAgent));
}

/**
 * True exactly when the SDK would take the branch that never answers.
 *
 * `standalone` is read from `navigator.standalone` and nowhere else — not
 * from `display-mode: standalone`, which is true of an installed Android
 * KIDDO whose popup works perfectly well.
 */
export function isIOSStandalone(env: SignInEnvironment): boolean {
  return isFirebaseIOS(env.userAgent) && env.standalone;
}

/** The one question this file exists to answer. */
export function googleSignInMethod(env: SignInEnvironment): GoogleSignInMethod {
  return isIOSStandalone(env) ? "redirect" : "popup";
}

/** What the browser in front of us looks like, or a stand-in on the server. */
export function readSignInEnvironment(): SignInEnvironment {
  if (typeof window === "undefined") return { userAgent: "", standalone: false };
  return {
    userAgent: window.navigator.userAgent,
    standalone: (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
  };
}

/**
 * A note left on the device saying "we went to Google; look for an answer".
 *
 * The session store loads Firebase on a cold start only when the account
 * hint says a parent has signed in here before (`cloud/session.ts`). A
 * parent signing in with Google for the *first* time has no such hint, and
 * the redirect brings them back to a page that would otherwise decide there
 * was nothing to load — and render an empty sign-in card over the top of a
 * completed sign-in. This marker is the second reason to load.
 *
 * `sessionStorage`, not `localStorage`: it describes one trip through one
 * tab, and a stale one must not outlive it. It lives here rather than in
 * `backend.ts` so that reading it costs the session store nothing — this
 * module has no import of the SDK and never will.
 */
export const REDIRECT_PENDING_KEY = "kiddo.auth.redirect.v1";

/** True while a Google redirect is out and its answer has not been read. */
export function isRedirectPending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(REDIRECT_PENDING_KEY) === "1";
  } catch {
    /* Private mode. A parent who has signed in on this device before is
       unaffected — the account hint is the other reason to load. */
    return false;
  }
}

export function markRedirectPending(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(REDIRECT_PENDING_KEY, "1");
  } catch {
    /* Holds for nothing. The redirect itself still happens. */
  }
}

export function clearRedirectPending(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(REDIRECT_PENDING_KEY);
  } catch {
    /* Nothing was written, so there is nothing to clear. */
  }
}
