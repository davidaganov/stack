import js from "@eslint/js"
import globals from "globals"

export default [
  {
    ignores: ["**/node_modules/**", ".stack-gen/**", "dist/**"]
  },

  js.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node
      }
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "off",
      "no-undef": "error"
    }
  }
]
