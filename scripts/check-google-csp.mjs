/**
 * What "Continue with Google" actually asks the browser for.
 *
 * The CSP in `next.config.ts` names two hosts for the Google popup, and
 * both were read off Firebase's source rather than guessed. This checks the
 * reading against a real Chrome: it loads /parents, presses the button, and
 * reports every `securitypolicyviolation` the page raises.
 *
 * Nobody signs in. The Google window opens and is closed again without a
 * credential ever being typed; what is being measured is the requests the
 * SDK makes on the way there, which happen before any account is involved.
 *
 * Run against a production build:  node scripts/check-google-csp.mjs
 *
 * `localhost`, not `127.0.0.1`. Firebase's Authorized domains list starts
 * with `localhost` and the two firebase-hosted names, and nothing else —
 * the same machine under its numeric spelling is a different domain to
 * Firebase, and the popup comes back `auth/unauthorized-domain`, which the
 * card can only report as "Something went wrong". An hour is easy to lose
 * to that, so the default below says localhost.
 */
import { openBrowser, evaluate, rectOf, clickAt, visit, settle } from "./cdp.mjs";

const BASE = process.env.KIDDO_BASE ?? "http://localhost:4310";

const { cdp, sessionId, close } = await openBrowser(9341);
try {
  /* Installed before any of the page's own script runs, so a violation
     raised during Firebase's first tick is still caught. */
  await cdp.send(
    "Page.addScriptToEvaluateOnNewDocument",
    {
      source: `
        window.__cspViolations = [];
        document.addEventListener("securitypolicyviolation", (e) => {
          window.__cspViolations.push(e.effectiveDirective + " <- " + e.blockedURI);
        });
      `,
    },
    sessionId,
  );

  await visit(cdp, sessionId, `${BASE}/parents`, 1200);

  const button = await rectOf(cdp, sessionId, "[data-auth-google]");
  if (!button) throw new Error("no [data-auth-google] on /parents — is this a cloud-configured build?");
  await clickAt(cdp, sessionId, button);
  await settle(cdp, sessionId, 4000);

  const report = await evaluate(
    cdp,
    sessionId,
    `JSON.stringify({
       violations: [...new Set(window.__cspViolations ?? [])],
       error: document.querySelector("[data-auth-error]")?.textContent ?? "",
       /* An empty violation list only means something if the two hosts were
          asked for at all. These are the proof that they were. */
       gapi: performance.getEntriesByType("resource")
         .some((r) => r.name.startsWith("https://apis.google.com/")),
       authIframe: [...document.querySelectorAll("iframe")]
         .some((f) => (f.src || "").includes("/__/auth/iframe")),
       csp: (document.querySelector("meta[http-equiv='Content-Security-Policy']") || {}).content ?? "(header)",
     })`,
  );
  /* An empty `error` is the pass: the popup opened and is waiting for a
     real person to choose an account, which no script should do for them. */
  console.log(report);
} finally {
  close();
}
