import { removeDir, removeFile } from "../utils/file.js"
import { removePackageDependencies, removePackageScripts } from "../utils/package.js"
import path from "node:path"

/**
 * Remove test-related files and dependencies from the project
 */
export const removeTests = async (targetDir, _templateName) => {
  removeDir(path.join(targetDir, "src", "__tests__"))
  removeDir(path.join(targetDir, "__tests__"))
  removeFile(path.join(targetDir, "vitest.config.ts"))
  removeFile(path.join(targetDir, "tsconfig.vitest.json"))

  const testDeps = [
    "vitest",
    "@vitest/coverage-v8",
    "@vitest/eslint-plugin",
    "@vue/test-utils",
    "jsdom",
    "@types/jsdom"
  ]

  removePackageDependencies(path.join(targetDir, "package.json"), testDeps)
  removePackageScripts(path.join(targetDir, "package.json"), ["test", "test:coverage"])
}
