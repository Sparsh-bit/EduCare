import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // react-hooks v5 flags valid async setState as "set-state-in-effect". Downgrade to warn.
      "react-hooks/set-state-in-effect": "warn",
      // Explicit any is used in backend-integration code where API types are loose.
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars at warn level; many pre-existing across the codebase.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
