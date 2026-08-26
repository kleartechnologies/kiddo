/**
 * Builds and starts the server the measurements are written against.
 *
 * Eight of the eleven browser measurements walk a parent through signing in,
 * paying, coming back from Checkout and losing access again. None of that can
 * be measured against a real Firebase project without either a real account
 * and a real card, or a bypass in the product — and a bypass in the product is
 * the one thing that must never be added for a test.
 *
 * KIDDO already has the answer, and it is a shipped product mode rather than a
 * rig: with no `NEXT_PUBLIC_FIREBASE_API_KEY` and no `NEXT_PUBLIC_FIREBASE_APP_ID`,
 * `CLOUD_CONFIGURED` is false and KIDDO runs account-free — every session is
 * `unavailable`, `PlayGate` lets the child through and `ParentGate` shows the
 * dashboard. On top of that, `lib/cloud/preview.ts` is a pretend backend that
 * a device opts into with `localStorage["kiddo.preview.cloud"] = "1"`; it is
 * only *loaded* when the build is unconfigured, so it cannot exist in anything
 * a family is served, and it grants nothing real — the "webhook" is a timer.
 *
 * This script stands that build up:
 *
 *     npm run measure:serve         account-free, production build, port 4310
 *     npm run measure:serve:dev     the same, plus the `.dev.tsx` specimen pages
 *
 * It does not edit any file, does not touch `.env.local`, and does not change
 * how KIDDO behaves when it *is* configured. It sets the two public Firebase
 * variables to empty for its own child processes — which is exactly what a
 * Netlify deploy without them looks like — and then proves it worked by
 * reading the built client chunks back. If a key leaked into the bundle the
 * build is thrown away rather than served, because a half-configured server
 * would measure something that is neither mode.
 */
import { spawn } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv.find((a) => /^--port=/.test(a))?.split("=")[1] ?? 4310);
const DEV_PAGES = process.argv.includes("--dev-pages");
const ROOT = new URL("..", import.meta.url).pathname;

/* Empty rather than deleted: `@next/env` skips a `.env.local` line whose key
   is already present in the environment, and an empty string is present. */
const ACCOUNT_FREE = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "",
  NEXT_PUBLIC_FIREBASE_APP_ID: "",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "",
  NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY: "",
};

const env = {
  ...process.env,
  ...ACCOUNT_FREE,
  ...(DEV_PAGES ? { KIDDO_DEV_PAGES: "1" } : {}),
};

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))));
  });

console.log(`\n  building an account-free KIDDO${DEV_PAGES ? " with the specimen pages" : ""}…\n`);
await run("npx", ["next", "build"]);

/* The proof. A configured build inlines the API key into a client chunk; an
   account-free one has nowhere to put it. Reading it back is the only check
   that does not depend on how a particular version of Next merges env files. */
const leaked = [];
const real = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
if (real) {
  for (const file of chunks(join(ROOT, ".next", "static"))) {
    if (readFileSync(file, "utf8").includes(real)) leaked.push(file.slice(ROOT.length));
  }
}
if (leaked.length) {
  console.error(
    [
      "",
      "  The Firebase API key reached the client bundle, so this is not an",
      "  account-free build and the measurements would be walking a gate they",
      `  cannot open: ${leaked[0]}`,
      "",
      "  Move .env.local aside for the run, or point the measurements at a",
      "  server you built yourself with the NEXT_PUBLIC_FIREBASE_* variables",
      "  unset. Do not weaken the gate instead.",
      "",
    ].join("\n"),
  );
  process.exit(2);
}

console.log(
  [
    "",
    `  account-free build verified — no Firebase key in .next/static`,
    `  starting on http://127.0.0.1:${PORT}`,
    "",
    "  In another terminal:  npm run measure:landing   (and the rest)",
    "",
  ].join("\n"),
);
await run("npx", ["next", "start", "-p", String(PORT)]);

function* chunks(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* chunks(path);
    else if (path.endsWith(".js")) yield path;
  }
}
