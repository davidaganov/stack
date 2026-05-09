import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { copy } from "@/utils"
import type { BuildMode } from "@/types"

/**
 * Clone template from GitHub and copy to target directory
 */
export const downloadTemplate = async (
  repoUrl: string,
  targetDir: string,
  buildMode: BuildMode
): Promise<void> => {
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
