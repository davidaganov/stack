import js from "@eslint/js"
import configPrettier from "eslint-config-prettier"
import pluginPrettier from "eslint-plugin-prettier"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", ".stack-gen/**", "dist/**"]
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  configPrettier,

  {
    plugins: {
      prettier: pluginPrettier
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node
      }
    },
    rules: {
      "prettier/prettier": ["error", { endOfLine: "auto" }],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "warn"
    }
  },
  {
    files: ["src/__tests__/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
)
