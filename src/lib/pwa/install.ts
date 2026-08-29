/**
 * Whether KIDDO can be put on a home screen, and by which road.
 *
 * Installing is the one KIDDO feature whose behaviour is decided entirely by
 * somebody else's browser, so this file is deliberately the only place that
 * has an opinion about it. It is pure: every function takes the two or three
 * facts a browser exposes and returns an answer, which is what lets the whole
 * matrix — Chrome on Android, Safari on an iPhone, Safari on an iPad wearing
 * a Mac's user agent, the browser inside the Facebook app, a laptop — be
 * tested without a device in the room.
 *
 * There are exactly two roads, and they are not alternatives so much as two
 * different products:
 *
 *   **prompt** — Chromium fires `beforeinstallprompt`, KIDDO keeps the event,
 *   and a button hands it back. The browser draws its own dialog and puts the
 *   icon on the home screen. Nothing has to be explained.
 *
 *   **guide** — WebKit fires nothing and offers no API at all. The only way
 *   onto an iPhone's home screen is a person tapping Share and then "Add to
 *   Home Screen", so the only honest thing KIDDO can do is show them where
 *   those two taps are.
 *
 * The third answer, `in-app`, is the one that matters most for KIDDO in
 * particular: a good share of the parents who read the landing page arrive by
 * tapping an advertisement inside the Facebook or Instagram app, and that
 * embedded browser cannot install anything at all. Offering them a button
 * would be offering them a button that does nothing, so they are told to open
 * KIDDO in their real browser instead — see §10 of the brief, "do not show a
 * broken button".
 */

/**
 * Where the "not now" lives.
 *
 * Namespaced and versioned like every other key KIDDO writes (see
 * `profile/child.ts`), and holding exactly one thing: that a grown-up has
 * waved the nudge away. It is on the device rather than on the account
 * because it is a fact about *this phone* — the parent who installed KIDDO on
 * their own phone should still be offered it on the tablet.
 */
export const INSTALL_DISMISSED_KEY = "kiddo.install.v1";

/** How this browser lets a person install KIDDO — if it lets them at all. */
export type InstallRoute =
  /** Already on a home screen: this window *is* the installed app. */
  | "installed"
  /** The browser will draw its own install dialog when KIDDO asks. */
  | "prompt"
  /** iOS: Share → Add to Home Screen, by hand, with KIDDO pointing. */
  | "guide"
  /** An in-app browser. Nothing can be installed from inside one. */
  | "in-app"
  /** A desktop or a browser that does not install web apps. Say nothing. */
  | "none";

/** The handful of facts the answer is derived from. */
export interface Browser {
  userAgent: string;
  /**
   * iPadOS 13 and later ask for desktop sites by default, so an iPad's user
   * agent says `Macintosh`. The touch count is the only thing left that
   * separates an iPad from a MacBook.
   */
  maxTouchPoints: number;
  /** The window is running as an installed app rather than in a browser tab. */
  standalone: boolean;
  /** A `beforeinstallprompt` event has been caught and not yet spent. */
  prompt: boolean;
}

/** Apple's own, plus the iPad pretending to be a Mac. */
const APPLE_MOBILE = /iPad|iPhone|iPod/;

/**
 * Browsers that live inside another app.
 *
 * Meta's two are the ones KIDDO actually meets, because that is where its
 * advertisements are; the rest are here so the answer does not depend on
 * which messenger a family happens to use. `FB_IAB` and `FBAN` are the tokens
 * Facebook's and Instagram's web views add to the agent string.
 */
const IN_APP =
  /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|TikTok|Twitter|GSA\//;

/** Every WebKit browser on iOS is WebKit; only one of them is Safari. */
const IOS_NOT_SAFARI = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\//;

/** An iPhone or an iPad, however the iPad describes itself. */
export function isApple(browser: Browser): boolean {
  if (APPLE_MOBILE.test(browser.userAgent)) return true;
  return /Macintosh/.test(browser.userAgent) && browser.maxTouchPoints > 1;
}

/**
 * Safari itself, rather than one of the browsers wearing WebKit on iOS.
 *
 * The distinction is only about the words on the screen: since iOS 16.4 the
 * other browsers can add a web app to the home screen too, but their Share
 * button is in a different corner and their menu is worded differently. So
 * the guide keeps its Safari steps and adds one line for everybody else,
 * rather than pretending to know four browsers' menus.
 */
export function isAppleSafari(browser: Browser): boolean {
  return isApple(browser) && !IOS_NOT_SAFARI.test(browser.userAgent);
}

/** A browser embedded in another app, which can install nothing. */
export function isInApp(browser: Browser): boolean {
  return IN_APP.test(browser.userAgent);
}

/**
 * The one question the whole feature turns on.
 *
 * Order is the argument. Being installed already outranks everything, because
 * an installed KIDDO must never be asked to install itself (§3, §9). A
 * captured prompt comes next, because a browser that has offered one has
 * already decided KIDDO is installable and there is nothing left to detect.
 * In-app is checked before Apple so that a parent reading this inside the
 * Facebook app on an iPhone is told to leave it, rather than shown Safari's
 * Share button in an app that does not have one.
 */
export function installRoute(browser: Browser): InstallRoute {
  if (browser.standalone) return "installed";
  if (browser.prompt) return "prompt";
  if (isInApp(browser)) return "in-app";
  if (isApple(browser)) return "guide";
  return "none";
}

/**
 * Whether there is anything worth putting on a screen for this browser.
 *
 * `installed` and `none` are both silences, and they are different silences:
 * one has nothing left to offer and one never had anything. Neither renders.
 */
export function canOffer(route: InstallRoute): boolean {
  return route === "prompt" || route === "guide" || route === "in-app";
}

/** Whether a grown-up has already waved the nudge away on this device. */
export function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
  } catch {
    /* Private mode, or site data turned off. The nudge is offered again next
       visit, which is the mildest possible failure — the same trade the
       language preference makes in `i18n/storage.ts`. */
    return false;
  }
}

/** Remember the "not now", for good. */
export function writeDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
  } catch {
    /* Holds for this visit, forgotten by the next. */
  }
}
