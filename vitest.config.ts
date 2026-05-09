import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    alias: {
      "@": path.resolve(__dirname, "./src")
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "scripts/**",
        "**/*.d.ts",
        "src/types/**",
        "src/index.ts",
        "index.ts",
        "eslint.config.ts"
      ]
    },
    exclude: ["node_modules/**", "dist/**", ".stack-gen/**"]
  }
})
