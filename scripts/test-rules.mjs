/**
 * `npm run test:rules` — runs tests/firestore.rules.test.mjs against the
 * Firestore emulator. The emulator needs Java; if none is on PATH this adds
 * the Homebrew OpenJDK location before giving up, so a plain `brew install
 * openjdk` is enough on a Mac.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const candidates = ["/opt/homebrew/opt/openjdk/bin", "/usr/local/opt/openjdk/bin"];
const hasJava = spawnSync("java", ["-version"]).status === 0;
const extra = hasJava ? null : candidates.find((dir) => existsSync(`${dir}/java`));
if (!hasJava && !extra) {
  console.error("The Firestore emulator needs Java. Install it (e.g. `brew install openjdk`) and retry.");
  process.exit(1);
}

const result = spawnSync(
  "npx",
  [
    "firebase",
    "emulators:exec",
    "--only",
    "firestore",
    "--project",
    "demo-kiddo",
    "node --test tests/firestore.rules.test.mjs",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, PATH: extra ? `${extra}:${process.env.PATH}` : process.env.PATH },
  },
);
process.exit(result.status ?? 1);
