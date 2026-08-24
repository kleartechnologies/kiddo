/**
 * Teaches `node --test` how this project writes its imports.
 *
 * Node strips TypeScript types by itself now, but it resolves modules the way
 * the web does: no `@/…` alias, and no guessing at file extensions. Both are
 * everywhere in `src/`, because that is how `tsconfig` and the bundler read
 * it. These few lines are the whole reason this repo can run tests with no
 * test framework, no bundler and no new dependency.
 */
import { statSync } from "node:fs";
import { join } from "node:path";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = join(import.meta.dirname, "..", "src");
const SUFFIXES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

/** The first of `path`, `path.ts`, `path/index.ts`… that is really there. */
function isFile(path) {
  return statSync(path, { throwIfNoEntry: false })?.isFile() ?? false;
}

function onDisk(path) {
  /* A directory answers to `existsSync` and then fails to import, so the
     search is for a file: `x`, `x.ts`, `x.tsx`, then `x/index.*`. */
  const found = SUFFIXES.map((suffix) => path + suffix).find(isFile);
  return found ? pathToFileURL(found).href : null;
}

/**
 * `server-only` throws on import anywhere but a React server bundle, which
 * is exactly what it is for in the app and exactly wrong under `node --test`.
 * The route handlers that import it are tested here with a stub, with the
 * same env-gated behaviour they have in production.
 */
const SERVER_ONLY_STUB = "data:text/javascript,export%20%7B%7D";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: SERVER_ONLY_STUB, shortCircuit: true };
    if (specifier.startsWith("@/")) {
      return next(onDisk(join(SRC, specifier.slice(2))) ?? specifier, context);
    }

    /* Only this project's own files leave the extension off. A package's
       internal `require("./cjs/…")` must reach the CommonJS loader as is. */
    if (
      specifier.startsWith(".") &&
      context.parentURL?.startsWith("file:") &&
      !context.parentURL.includes("/node_modules/")
    ) {
      const path = fileURLToPath(new URL(specifier, context.parentURL));
      return next(onDisk(path) ?? specifier, context);
    }

    return next(specifier, context);
  },
});
