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
    // The character sheet from Claude Design. Reference art, not source.
    "Character Vector Construction/**",
    // The approved visual design package. Prototypes and a design-tool
    // runtime, both vendored as reference; neither is product source.
    "KIDDO DESIGN V1/**",
  ]),
]);

export default eslintConfig;
