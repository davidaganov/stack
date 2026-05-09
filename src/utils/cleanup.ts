import fs from "node:fs"
import path from "node:path"
import { removeDir, removeFile } from "@/utils"

/**
 * Recursively remove empty directories
 */
const removeEmptyDirs = (dir: string): void => {
  if (!fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir)

  for (const entry of entries) {
    const fullPath = path.join(dir, entry)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) removeEmptyDirs(fullPath)
  }

  const remaining = fs.readdirSync(dir)
  if (remaining.length === 0) {
    fs.rmdirSync(dir)
  }
}

/**
 * Remove development artifacts and clean up empty structures
 */
export const cleanup = (targetDir: string): void => {
  const toRemove = [
    ".git",
    "node_modules",
    "dist",
    "coverage",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    ".eslintcache"
  ]

  for (const item of toRemove) {
    const fullPath = path.join(targetDir, item)
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        removeDir(fullPath)
      } else {
        removeFile(fullPath)
      }
    }
  }

  // Remove .gitkeep from components so empty folders get cleaned up
  const gitkeepComponents = path.join(targetDir, "src", "components", ".gitkeep")

  if (fs.existsSync(gitkeepComponents)) {
    fs.unlinkSync(gitkeepComponents)
  }

  removeEmptyDirs(path.join(targetDir, "src", "components"))
}
