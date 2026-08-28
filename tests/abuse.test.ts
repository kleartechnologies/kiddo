/**
 * KIDDO under attack.
 *
 * Every test here is somebody trying to get something they are not
 * entitled to: another parent's account, a subscription they did not pay
 * for, a list of who has an account, more of KIDDO's Firestore bill than
 * they are due. The ordinary suites check that KIDDO works; this one
 * checks that it refuses.
 *
 * The letters match the abuse scenarios in the security audit, so a
 * finding and its regression test can be read together.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

/* ---- Account enumeration ---------------------------------------------- */

test("a failed sign-in never says whether the email is one KIDDO knows", () => {
  const card = read("../src/components/account/AuthCard.tsx");

  /* The two halves of an enumeration oracle: "no account has that email"
     and "that password is wrong". Both must be the same sentence — and,
     now that KIDDO speaks two languages, the same *key*: pointing them at
     one line in the catalogue is what stops a translator reopening the
     oracle in Malay without ever touching this code. */
  assert.match(card, /const SAME_EITHER_WAY: MessageKey = "[^"]+";/);
  assert.match(card, /"wrong-password": SAME_EITHER_WAY,/);
  assert.match(card, /"no-account": SAME_EITHER_WAY,/);

  /* And the words themselves, wherever they now live. */
  const words = read("../src/lib/i18n/messages/en.ts");
  for (const source of [card, words]) {
    assert.doesNotMatch(source, /No KIDDO account has that email/);
    assert.doesNotMatch(source, /There is already a KIDDO account for that email/);
  }

  /* The reset form answers the same way whether or not the address is
     registered — it always says "if there is an account, a link is on
     its way". */
  assert.match(card, /failure !== "no-account"/);
  assert.match(words, /If there is a KIDDO account for/);
});

test("App Check is off unless it is configured, and never guards the webhook", () => {
  const client = read("../src/lib/firebase/appCheck.ts");
  assert.match(client, /if \(started \|\| !key \|\| typeof window === "undefined"\) return;/,
    "no site key, no App Check — local development and the tests keep working");

  const server = read("../src/server/appCheck.ts");
  assert.match(server, /process\.env\.APP_CHECK_ENFORCED === "true"/);
  assert.match(server, /if \(!appCheckEnforced\(\)\) return null;/,
    "a misconfiguration must not lock parents out before it is switched on");

  const webhook = read("../src/app/api/billing/webhook/route.ts");
  assert.doesNotMatch(webhook, /requireAppCheck/, "Stripe is not a browser and has no attestation to send");

  /* The landing page never loads the Firebase SDK, so the public route
     has no token to check and says so rather than pretending. */
  const social = read("../src/app/api/social/recent/route.ts");
  assert.doesNotMatch(social, /requireAppCheck/);
  assert.match(social, /App Check is deliberately not one of the layers/);
});

test("the routes a signed-in parent calls all ask for an attestation", () => {
  for (const path of [
    "../src/app/api/billing/checkout/route.ts",
    "../src/app/api/billing/portal/route.ts",
    "../src/app/api/account/delete/route.ts",
  ]) {
    const source = read(path);
    assert.match(source, /const attested = await requireAppCheck\(request\);/, path);
    assert.match(source, /if \(attested\) return attested;/, path);
  }
  const backend = read("../src/lib/firebase/backend.ts");
  assert.match(backend, /\.\.\.\(await appCheckHeader\(\)\),/, "and the browser sends one");
});

/* ---- A, B, C: every protected route wants a real token ----------------- */

/**
 * The routes KIDDO exposes, and what stands in front of each. A new route
 * file that is in neither list fails the first test below, so the only way
 * to add one is to say here which kind it is.
 */
const PROTECTED: ReadonlyArray<{ path: string; method: "GET" | "POST" }> = [
  { path: "billing/checkout", method: "POST" },
  { path: "billing/portal", method: "POST" },
  { path: "account/delete", method: "POST" },
  { path: "content/round", method: "POST" },
];

/** Public on purpose, each with the guard it has instead of a token. */
const PUBLIC: ReadonlyArray<{ path: string; guard: RegExp }> = [
  /* Answers strangers by design; budgeted per IP and cached instead. */
  { path: "social/recent", guard: /consume\(LIMITS\.social, clientIp\(request\), now\)/ },
  /* Stripe is not a signed-in parent; its signature is the credential. */
  { path: "billing/webhook", guard: /webhooks\.constructEvent\(raw, signature, webhookSecret\(\)\)/ },
];

function apiRoutes(dir: string, prefix = ""): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return apiRoutes(`${dir}/${entry.name}`, `${prefix}${entry.name}/`);
    return entry.name === "route.ts" ? [prefix.replace(/\/$/, "")] : [];
  });
}

test("no API route can be added without declaring how it is guarded", () => {
  const found = apiRoutes(new URL("../src/app/api", import.meta.url).pathname).sort();
  const declared = [...PROTECTED.map((r) => r.path), ...PUBLIC.map((r) => r.path)].sort();
  assert.deepEqual(found, declared,
    "a route in neither PROTECTED nor PUBLIC is a route nobody decided about");

  for (const route of PROTECTED) {
    const source = read(`../src/app/api/${route.path}/route.ts`);
    assert.match(source, /const caller = await requireCaller\(request\);/, route.path);
    assert.match(source, /if \(caller instanceof Response\) return caller;/, route.path);
  }
  for (const route of PUBLIC) {
    const source = read(`../src/app/api/${route.path}/route.ts`);
    assert.doesNotMatch(source, /requireCaller/, `${route.path} is public; say so, don't half-guard it`);
    assert.match(source, route.guard, `${route.path} must keep its own guard`);
  }
});

test("a protected route answers 401 to no token, a malformed one, and a forged one", async () => {
  /* Enough configuration that the routes get past their 503s and reach the
     token check. "{}" is not a usable service account, which is the point:
     verifying any token with it fails, and a failed verification is a 401. */
  process.env.FIREBASE_SERVICE_ACCOUNT = "{}";
  process.env.STRIPE_SECRET_KEY = "sk_test_unit";
  process.env.STRIPE_PRICE_MONTHLY = "price_monthly_unit";
  process.env.STRIPE_PRICE_YEARLY = "price_yearly_unit";

  const headers: ReadonlyArray<[string, Record<string, string>]> = [
    ["no authorization header at all", {}],
    ["an empty one", { authorization: "" }],
    ["the wrong scheme", { authorization: "Basic dXNlcjpwYXNz" }],
    ["Bearer with nothing after it", { authorization: "Bearer" }],
    ["Bearer with only spaces", { authorization: "Bearer    " }],
    ["a token that is not a JWT", { authorization: "Bearer not-a-token" }],
    ["a JWT-shaped forgery", { authorization: "Bearer eyJhbGciOiJub25lIn0.eyJ1aWQiOiJ2aWN0aW0ifQ." }],
    ["somebody else's uid, hopefully", { authorization: "Bearer uid-2" }],
  ];

  for (const route of PROTECTED) {
    const mod = (await import(`@/app/api/${route.path}/route`)) as Record<string, (r: Request) => Promise<Response>>;
    const handler = mod[route.method];
    assert.equal(typeof handler, "function", `${route.path} exports ${route.method}`);

    for (const [what, auth] of headers) {
      const response = await handler(new Request(`https://kiddo.test/api/${route.path}`, {
        method: route.method,
        headers: { "content-type": "application/json", ...auth },
        body: JSON.stringify({ plan: "monthly", uid: "victim", returnTo: "/parents" }),
      }));
      assert.equal(response.status, 401, `${route.path} with ${what}`);
      assert.deepEqual(await response.json(), { error: "unauthorized" }, `${route.path} with ${what}`);
    }
  }
});

test("no route reads an identity out of the request body", () => {
  /* The only two things a body may say are which plan and where to return
     to. Anything that decides *whose* money or *whose* account is involved
     comes from the verified token or from Firestore. */
  const identity = /body\.(uid|userId|customer|customerId|stripeCustomerId|subscription|subscriptionId|price|priceId|amount|email|status|plan_id)\b/;
  for (const route of [...PROTECTED, ...PUBLIC]) {
    const source = read(`../src/app/api/${route.path}/route.ts`);
    assert.doesNotMatch(source, identity, `${route.path} must not trust the browser about identity`);
    for (const field of source.match(/\bbody\.[A-Za-z_$][\w$]*/g) ?? []) {
      /* `body.locale` is on this list because a language is not an identity
         and cannot become one: it picks which words a round is said in and
         nothing else — see `dealRound`. Whose round it is still comes from
         the verified token. */
      assert.ok(["body.plan", "body.returnTo", "body.round", "body.tier", "body.seed",
        "body.locale"].includes(field),
        `${route.path} reads ${field}`);
    }
  }
  /* And the two that matter are read from the token, not the body. */
  const checkout = read("../src/app/api/billing/checkout/route.ts");
  assert.match(checkout, /customerFor\(caller\.uid, caller\.email\)/);
  assert.match(checkout, /client_reference_id: caller\.uid/);
  assert.match(checkout, /line_items: \[\{ price: priceIds\(\)\[plan\], quantity: 1 \}\]/);
  const portal = read("../src/app/api/billing/portal/route.ts");
  assert.match(portal, /const state = await subscriptionOf\(caller\.uid\);/);
  assert.match(portal, /customer: state\.stripeCustomerId,/);
});

/* ---- D, E, F: Stripe takes its instructions from the server ------------ */

test("D — a price the client names is not a price KIDDO will charge", async () => {
  const { isPlan } = await import("@/lib/billing/subscription");
  for (const forged of [
    "price_1FreeForever", "price_live_stolen", "monthly ", "MONTHLY", "yearly\n",
    "", "__proto__", "constructor", "0", "true",
  ]) {
    assert.equal(isPlan(forged), false, forged);
  }
  assert.equal(isPlan("monthly"), true);
  assert.equal(isPlan("yearly"), true);
  for (const notAString of [1, 0, null, undefined, {}, [], { plan: "monthly" }]) {
    assert.equal(isPlan(notAString), false);
  }

  /* And the route turns anything else away before it reaches Stripe. */
  const checkout = read("../src/app/api/billing/checkout/route.ts");
  const decided = checkout.indexOf('if (!plan) return problem(400, "bad-plan");');
  assert.ok(decided > 0, "an unrecognised plan is a 400");
  assert.ok(decided < checkout.indexOf("stripe()."), "and it is refused before any Stripe call");

  /* The amounts live in Stripe. KIDDO sends an id, never a sum, so a
     tampered request cannot change the price of anything. */
  const server = read("../src/server/stripe.ts");
  assert.doesNotMatch(server, /unit_amount|price_data/);
  assert.doesNotMatch(checkout, /unit_amount|price_data|amount/);
});

test("E — the customer is looked up from the token, never accepted from the caller", () => {
  const billing = read("../src/server/billing.ts");
  assert.match(billing, /export async function customerFor\(uid: string/);
  /* Whatever the browser sends, the id used is the one already written
     against this uid — or a new one created for it. */
  assert.match(billing, /metadata: \{ uid \}/);

  const portal = read("../src/app/api/billing/portal/route.ts");
  const lookup = portal.indexOf("await subscriptionOf(caller.uid)");
  assert.ok(lookup > 0 && lookup < portal.indexOf("billingPortal.sessions.create"));
  assert.match(portal, /if \(!state\.stripeCustomerId\) return problem\(404, "no-customer"\);/,
    "no customer of your own means no portal, not somebody else's");
});

test("F — a parent who already subscribes cannot open a second checkout", () => {
  const checkout = read("../src/app/api/billing/checkout/route.ts");
  assert.match(checkout, /const live = await liveSubscriptions\(customer\);/);
  assert.match(checkout, /return problem\(409, "already-subscribed"\);/);
  const guard = checkout.indexOf("already-subscribed");
  assert.ok(guard < checkout.indexOf("checkout.sessions.create"), "checked before a session is made");
  assert.match(checkout, /s\.status === "active" \|\| s\.status === "trialing" \|\| s\.status === "past_due"/);
});

/* ---- G, H, I, J: the client cannot write what it must not -------------- */

test("G — subscription state is written by the webhook and nothing else", () => {
  const rules = read("../firestore.rules");
  /* The allowlist for a client update names the fields it may set; the
     subscription is not among them, so a client write that includes one
     is refused whatever else it contains. */
  assert.doesNotMatch(rules, /'subscription'/, "no rule ever admits a client-written subscription");
  assert.doesNotMatch(rules, /'stripeCustomerId'/);

  const backend = read("../src/lib/firebase/backend.ts");
  assert.doesNotMatch(backend, /subscription:/, "the browser never writes one either");

  /* Server-side, exactly one function writes it, and it is the webhook's. */
  const billing = read("../src/server/billing.ts");
  assert.match(billing, /export async function applySubscription/);
  const webhook = read("../src/app/api/billing/webhook/route.ts");
  assert.match(webhook, /applySubscription\(/);
  for (const route of ["billing/checkout", "billing/portal", "account/delete"]) {
    assert.doesNotMatch(read(`../src/app/api/${route}/route.ts`), /applySubscription/, route);
  }
});

test("H — no client can delete the document its billing identity lives in", () => {
  const rules = read("../firestore.rules");
  const users = rules.slice(rules.indexOf("match /users/{uid}"));
  assert.match(users.slice(0, users.indexOf("match /", 10)), /allow delete: if false;/);
  const backend = read("../src/lib/firebase/backend.ts");
  assert.doesNotMatch(backend, /deleteDoc\(doc\(db, "users"/);
  assert.match(backend, /await callApi\("\/api\/account\/delete", \{\}\);/,
    "deletion still exists — it goes through the server, in the right order");
});

test("I, J — the join log is neither written nor read by any browser", () => {
  const rules = read("../firestore.rules");
  assert.match(rules, /match \/joinEvents\/\{[a-zA-Z]+\} \{\s*allow read, write: if false;/,
    "genuine social proof: only the webhook writes it, only the server reads it");
  assert.match(rules, /match \/stripeEvents\/\{[a-zA-Z]+\} \{\s*allow read, write: if false;/);
  assert.match(rules, /match \/rateLimits\/\{[a-zA-Z]+\} \{\s*allow read, write: if false;/);

  const client = read("../src/lib/firebase/backend.ts");
  for (const collection of ["joinEvents", "stripeEvents", "rateLimits"]) {
    assert.doesNotMatch(client, new RegExp(collection), `${collection} is not a browser's business`);
  }
});

/* ---- M: the return address is KIDDO's, not the caller's ---------------- */

test("M — an Origin header cannot decide where Stripe sends a parent back to", async () => {
  const { siteUrl } = await import("@/server/http");
  const hostile = (url: string, headers: Record<string, string>) =>
    new Request(url, { method: "POST", headers });

  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const env = process.env as Record<string, string | undefined>;
  const mode = env.NODE_ENV;
  try {
    /* In production the configured site is the only answer, whatever the
       request claims about itself. */
    env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "https://kiddo.my/";
    const claims: ReadonlyArray<Record<string, string>> = [
      {},
      { origin: "https://evil.example" },
      { origin: "null" },
      { host: "evil.example" },
      { "x-forwarded-host": "evil.example" },
    ];
    for (const headers of claims) {
      assert.equal(siteUrl(hostile("https://evil.example/api/billing/checkout", headers)), "https://kiddo.my");
    }

    /* Unconfigured in production, the honest answer is "I don't know" —
       which the routes turn into a 503, not into the attacker's origin. */
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.equal(siteUrl(hostile("https://evil.example/x", { origin: "https://evil.example" })), null);

    /* Locally it falls back to the request's own origin, and only when
       that origin is this machine. */
    env.NODE_ENV = "development";
    assert.equal(siteUrl(hostile("http://localhost:3000/x", { origin: "https://evil.example" })), "http://localhost:3000");
    assert.equal(siteUrl(hostile("http://127.0.0.1:4310/x", {})), "http://127.0.0.1:4310");
    assert.equal(siteUrl(hostile("https://evil.example/x", {})), null, "not loopback, not trusted");
  } finally {
    env.NODE_ENV = mode;
    if (configured) process.env.NEXT_PUBLIC_SITE_URL = configured;
    else delete process.env.NEXT_PUBLIC_SITE_URL;
  }

  /* And a route that cannot name its own site refuses rather than guesses. */
  for (const route of ["billing/checkout", "billing/portal"]) {
    const source = read(`../src/app/api/${route}/route.ts`);
    assert.match(source, /if \(!base\) return problem\(503, "site-url-not-configured"\);/, route);
    assert.doesNotMatch(source, /headers\.get\("origin"\)/, route);
  }

  /* `returnTo` is still only ever a path on that site. */
  const { safePath } = await import("@/server/http");
  for (const hostile2 of ["https://evil.example/x", "//evil.example", "\\\\evil.example", "javascript:alert(1)", 7, null]) {
    assert.equal(safePath(hostile2, "/parents"), "/parents", String(hostile2));
  }
  assert.equal(safePath("/welcome", "/parents"), "/welcome");
});

/* ---- N: the headers every response carries ----------------------------- */

test("N — security headers are configured, and the CSP names only what KIDDO uses", async () => {
  const config = read("../next.config.ts");
  assert.match(config, /poweredByHeader: false/, "no framework banner");

  for (const header of [
    'key: "X-Content-Type-Options", value: "nosniff"',
    'key: "X-Frame-Options", value: "DENY"',
    'key: "Referrer-Policy", value: "strict-origin-when-cross-origin"',
    "Permissions-Policy",
    "Strict-Transport-Security",
  ]) {
    assert.ok(config.includes(header), header);
  }
  assert.match(config, /max-age=63072000; includeSubDomains; preload/);
  assert.match(config, /source: "\/:path\*", headers: securityHeaders/, "on every response, not just pages");

  for (const directive of [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ]) {
    assert.ok(config.includes(`"${directive}"`), directive);
  }

  /* connect-src is the directive that decides where an injected script
     could send a parent's data. Firebase's own hosts, and one more:
     www.facebook.com, where the Meta pixel reports a page view from the
     parent's pages. It is the only host here that KIDDO does not need in
     order to run, which is exactly why it is written down. */
  const connect = /"connect-src ([^"]+)"/.exec(config)?.[1] ?? "";
  assert.deepEqual(connect.split(" ").sort(), [
    "'self'",
    "https://content-firebaseappcheck.googleapis.com",
    "https://firebaseinstallations.googleapis.com",
    "https://firestore.googleapis.com",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://www.facebook.com",
    "https://www.google.com/recaptcha/",
  ]);

  /* And the pixel's beacon is an image before it is a fetch, so img-src is
     pinned beside it rather than left as a wildcard nobody reads. */
  const img = /"img-src ([^"]+)"/.exec(config)?.[1] ?? "";
  assert.deepEqual(img.split(" ").sort(), [
    "'self'",
    "blob:",
    "data:",
    "https://www.facebook.com",
  ]);

  /* script-src and frame-src are named just as exactly, because "Continue
     with Google" widened both and a widening nobody has to come back and
     re-approve is how a policy turns into a template. */
  const script = /"script-src ([^"]+)"/.exec(config)?.[1] ?? "";
  assert.deepEqual(script.split(" ").sort(), [
    "'self'",
    "'unsafe-inline'",
    /* Firebase's popup sign-in loads gapi.iframes to talk to the window it
       opened. Third-party script in KIDDO's own origin — see next.config.ts. */
    "https://apis.google.com",
    /* fbevents.js and the pixel's own configuration, which is a second
       script and not a fetch. Parent pages only — tests/analytics.test.ts. */
    "https://connect.facebook.net",
    "https://www.google.com/recaptcha/",
    "https://www.gstatic.com/recaptcha/",
  ]);

  const frame = /"frame-src ([^"]+)"/.exec(config)?.[1] ?? "";
  assert.deepEqual(frame.split(" ").sort(), [
    /* The hidden /__/auth/iframe the Google popup answers through, at both
       the addresses Firebase serves it on for this project: the custom
       Hosting domain `authDomain` points at in production, and the project's
       own domain a build falls back to. Asserted again below. */
    "https://auth.kiddocares.com",
    "https://kiddocares-b105e.firebaseapp.com",
    "https://recaptcha.google.com/",
    "https://www.google.com/recaptcha/",
  ]);

  /* Neither is a loose string. The fallback is spelled the way
     `firebaseConfig()` spells it when the environment does not override it,
     so moving Firebase projects fails here rather than silently blocking the
     popup in a browser nobody is watching; and the custom domain is a
     subdomain of KIDDO's own site, never some other project's. */
  const { FIREBASE_PROJECT_ID } = await import("@/lib/firebase/config");
  assert.ok(
    frame.includes(`https://${FIREBASE_PROJECT_ID}.firebaseapp.com`),
    `frame-src must name ${FIREBASE_PROJECT_ID}.firebaseapp.com`,
  );
  assert.ok(
    frame.includes("https://auth.kiddocares.com"),
    "frame-src must name the custom auth domain NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN points at",
  );

  /* The one weakening is `script-src 'unsafe-inline'`, and it is only
     defensible while KIDDO has no way to inject HTML at all. */
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? walk(`${dir}/${entry.name}`)
        : /\.(ts|tsx)$/.test(entry.name)
          ? [`${dir}/${entry.name}`]
          : [],
    );
  for (const file of walk(new URL("../src", import.meta.url).pathname)) {
    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(text, /dangerouslySetInnerHTML|\beval\(|new Function\(/, file);
  }
});

/* ---- T: a cancellation stays cancelled --------------------------------- */

test("T — a stale event cannot reopen access to an account that was closed", async () => {
  const { isNewer, stateFromStripe } = await import("@/lib/billing/subscription");
  const prices = { monthly: "price_m", yearly: "price_y" };
  const at = 1_700_000_000;
  const sub = (over: Record<string, unknown>) =>
    stateFromStripe(
      {
        id: "sub_1",
        status: "active",
        customer: "cus_1",
        cancel_at_period_end: false,
        cancel_at: null,
        items: { data: [{ price: { id: prices.monthly }, current_period_end: at + 100 }] },
        ...over,
      } as Parameters<typeof stateFromStripe>[0],
      prices,
      (over.eventCreated as number) ?? at,
    );

  const active = sub({});
  const deleted = sub({ status: "canceled" });
  const scheduled = sub({ cancel_at_period_end: true });
  const scheduledByDate = sub({ cancel_at: at + 100 });

  /* The M-1 case: Stripe stamps the update and the deletion with the same
     second and does not promise an order. Whichever arrives last, the
     account stays closed. */
  assert.equal(isNewer(deleted, active), true, "the deletion applies");
  assert.equal(isNewer(active, deleted), false, "the stale update does not");

  /* The same for a cancellation that is merely scheduled — both spellings
     of "scheduled" survive a same-second active update. */
  assert.equal(isNewer(scheduled, active), true);
  assert.equal(isNewer(active, scheduled), false);
  assert.equal(scheduledByDate.cancelAtPeriodEnd, true, "cancel_at is a scheduled cancellation too");
  assert.equal(isNewer(active, scheduledByDate), false);

  /* A genuinely newer event still wins, in both directions: a parent who
     resubscribes a second later gets their access back. */
  assert.equal(isNewer(sub({ eventCreated: at + 1 }), deleted), true);
  assert.equal(isNewer(sub({ status: "canceled", eventCreated: at - 1 }), active), false);

  /* And the transaction that writes it consults this, inside the read. */
  const billing = read("../src/server/billing.ts");
  assert.match(billing, /if \(existing && existing\.eventCreated > 0 && !isNewer\(incoming, existing\)\) return null;/);
});

/* ---- O, P, Q: who may draw a round ------------------------------------- */

test("O, P, Q — a round is dealt only to a signed-in parent who is paying", async () => {
  const route = read("../src/app/api/content/round/route.ts");

  /* O — no token, no content. Covered live by the 401 table above; here we
     hold the order in place, because the value of these checks is entirely
     in running before anything is dealt. */
  const token = route.indexOf("await requireCaller(request)");
  const paid = route.indexOf("hasAccess(state, Date.now())");
  const budget = route.indexOf("consume(LIMITS.content, caller.uid)");
  const dealt = route.indexOf("dealRound(");
  assert.ok(token > 0 && paid > token && budget > paid && dealt > budget,
    "token → subscription → budget → content, in that order");

  /* P — signed in but not paying is 402, and the body says only that. */
  assert.match(route, /return problem\(402, "subscription-required"\);/);
  assert.doesNotMatch(route, /challenges.*402|402.*challenges/);

  /* Q — a subscriber gets the round, and only ever a round. */
  assert.match(route,
    /const challenges = dealRound\(body\.round, body\.tier, body\.seed, body\.locale\);/);
  assert.match(route, /return json\(\{ challenges \}\);/,
    "json() is no-store; a paid answer must not be cached by the CDN");

  /* The subscription is read from Firestore, where only the webhook writes
     it — not from the token's claims, which a client could ask to refresh. */
  assert.match(route, /const state = await subscriptionOf\(caller\.uid\);/);
  assert.doesNotMatch(route, /caller\.(subscription|plan|claims)/);

  /* And the dealer hands out rounds, never the shelf. */
  const dealer = await import("@/server/content");
  assert.deepEqual([...dealer.ROUND_NAMES].sort(), [
    "english-quest", "general-knowledge-quest", "logic-quest",
    "match-quest", "math-quest", "shapes-quest",
  ]);
  const source = read("../src/server/content.ts");
  assert.doesNotMatch(source, /CONTENT_REGISTRY|ACTIVITIES\b|findActivities/,
    "there is no 'give me everything' here, and no route to one");

  /* An unknown round is a 404, not a stack trace and not a guess. */
  assert.equal(dealer.dealRound("everything", undefined, 1), null);
  assert.equal(dealer.dealRound("world:nowhere.nothing", 1, 1), null);
  assert.equal(dealer.dealRound({ round: "math-quest" }, 1, 1), null);
  assert.equal(dealer.dealRound("__proto__", 1, 1), null);
  assert.equal(dealer.dealRound("constructor", 1, 1), null);
  assert.equal(dealer.dealRound("toString", 1, 1), null);

  /* A real round is dealt, and a seed only decides the order. */
  const one = dealer.dealRound("math-quest", undefined, 7);
  assert.ok(one && one.length > 0);
  assert.deepEqual(dealer.dealRound("math-quest", undefined, 7), one, "same seed, same round");
  const world = dealer.dealRound("world:counting.count-the-apples", 2, 7);
  assert.ok(world && world.length > 0);
  /* A tier the caller invents falls back to the gentlest one rather than
     throwing or reaching past the end of the list. */
  assert.ok(dealer.dealRound("world:counting.count-the-apples", 99, 7));
  assert.ok(dealer.dealRound("world:counting.count-the-apples", "2", 7));

  /* A language changes the words and nothing else. Same seed, same ten
     questions, same right answers — a Malay round a caller was sold is the
     round they were sold, not a different or an easier one. */
  const malay = dealer.dealRound("math-quest", undefined, 7, "ms");
  assert.ok(malay);
  assert.deepEqual(
    malay!.map((c) => [c.id, c.activityId, c.packId, c.level]),
    one!.map((c) => [c.id, c.activityId, c.packId, c.level]),
    "a Malay round is the same round",
  );
  /* Which option is right is an id, and ids do not translate. Proved over
     every activity in `tests/contentI18n.test.ts`; held here because this is
     the route that sells the round. */
  assert.deepEqual(
    malay!.map((c) => (c.payload.kind === "choice" ? c.payload.answerId : null)),
    one!.map((c) => (c.payload.kind === "choice" ? c.payload.answerId : null)),
  );
  /* An unknown language is English, never an error: the content is what was
     paid for, and a bad string must not be a way to lock a child out. */
  assert.deepEqual(dealer.dealRound("math-quest", undefined, 7, "kl"), one);
  assert.deepEqual(dealer.dealRound("math-quest", undefined, 7, { ms: true }), one);
});

/* ---- The development surface ------------------------------------------- */

test("the reference screens are not part of a production build", () => {
  /* `robots.txt` asks a crawler not to look. This makes there be nothing
     to look at: a `page.dev.tsx` is only a page when the build says so. */
  const config = read("../next.config.ts");
  assert.match(config, /process\.env\.KIDDO_DEV_PAGES === "1"\n\s*\? \["dev\.tsx", "tsx", "ts"\]\n\s*: \["tsx", "ts"\]/);

  const app = new URL("../src/app", import.meta.url).pathname;
  const pages = (dir: string, prefix = ""): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? pages(`${dir}/${entry.name}`, `${prefix}/${entry.name}`)
        : entry.name.startsWith("page.")
          ? [`${prefix}/${entry.name}`]
          : [],
    );
  for (const page of pages(app)) {
    const isReference = page.startsWith("/playground/") || page.startsWith("/character/");
    assert.equal(page.endsWith("page.dev.tsx"), isReference, page);
  }

  /* The measuring scripts drive these against a production server, so they
     are kept rather than deleted — the flag is how they come back. */
  assert.ok(pages(app).some((page) => page.startsWith("/playground/")), "still there for KIDDO_DEV_PAGES=1");
});

test("the pretend cloud cannot exist on a build that has real credentials", () => {
  const session = read("../src/components/account/CloudSession.tsx");
  /* Configured build → the real backend, and the preview module is not even
     imported. It is a dynamic import inside the else, so a production bundle
     never loads it. */
  assert.match(session, /CLOUD_CONFIGURED\n\s*\? \(\) => import\("@\/lib\/firebase\/backend"\)/);
  assert.match(session, /: previewEnabled\(\)\n\s*\? \(\) => import\("@\/lib\/cloud\/preview"\)/);

  const preview = read("../src/lib/cloud/preview.ts");
  /* And what it pretends is local: no token, no Firestore, no Stripe. It
     grants nothing the server would believe. */
  assert.doesNotMatch(preview, /fetch\(|firebase-|getAuth|adminDb|"\/api\//);
  assert.doesNotMatch(preview, /new Stripe|stripe\(\)/);
  assert.match(preview, /export const PREVIEW_FLAG_KEY = "kiddo\.preview\.cloud";/);
});
