import { copy } from "./utils/file.js"
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

/**
 * Clone template from GitHub and copy to target directory
 */
export const downloadTemplate = async (repoUrl, targetDir, buildMode) => {
  const tmpDir = fs.mkdtempSync(path.join(targetDir, "..", ".tmp-create-aganov-"))

  try {
    execSync(`git clone --depth 1 ${repoUrl}.git ${tmpDir}`, { stdio: "ignore" })

    const source = buildMode === "empty" ? path.join(tmpDir, "template-empty") : tmpDir

    if (!fs.existsSync(source)) {
      throw new Error(`Source not found: ${source}`)
    }

    await copy(source, targetDir)
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}
