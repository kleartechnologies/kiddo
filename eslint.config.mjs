import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // What `netlify build` and `netlify serve` leave behind: the whole
    // built app copied into a function bundle, plus the CLI's own plugin
    // tree. Build output wearing source's clothes — it is gitignored, so
    // linting it only ever reports on code nobody here wrote.
    ".netlify/**",
    // The character sheet from Claude Design. Reference art, not source.
    "Character Vector Construction/**",
    // The approved visual design package. Prototypes and a design-tool
    // runtime, both vendored as reference; neither is product source.
    "KIDDO DESIGN V1/**",
  ]),
]);

export default eslintConfig;
