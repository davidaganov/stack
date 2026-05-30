import { exec } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { TEMPLATES } from "@/config/templates"
import type { ResolvedSource } from "@/types"

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DEFAULT_STACK_ROOT = path.resolve(__dirname, "../..")

/**
 * Resolve template source: sibling repo (dev) or shallow git clone.
 */
export const resolveTemplateSource = async (
  templateName: string,
  options: { stackRoot?: string; repoUrl?: string; tmpDirParent?: string } = {}
): Promise<ResolvedSource> => {
  const stackRoot = options.stackRoot ?? DEFAULT_STACK_ROOT
  const repoUrl =
    options.repoUrl ??
    TEMPLATES[templateName]?.repoUrl ??
    `https://github.com/davidaganov/${templateName}`
  const sibling = path.join(stackRoot, "..", templateName)

  if (fs.existsSync(sibling)) {
    return { sourcePath: sibling, tmpDir: null }
  }

  const tmpBase = options.tmpDirParent ?? os.tmpdir()
  const tmpDir = fs.mkdtempSync(path.join(tmpBase, "webstack-"))
  await execAsync(`git clone --depth 1 ${repoUrl}.git ${tmpDir}`)
  return { sourcePath: tmpDir, tmpDir }
}
