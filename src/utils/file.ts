import fs from "node:fs"
import path from "node:path"

const EXCLUDED_DIRS = ["node_modules", ".git", "dist", "coverage", ".tmp-create-aganov-"]

/**
 * Recursively copy files and directories, excluding common meta folders
 */
export const copy = async (src: string, dest: string): Promise<void> => {
  const stat = fs.statSync(src)

  if (stat.isDirectory()) {
    if (EXCLUDED_DIRS.includes(path.basename(src))) return
    fs.mkdirSync(dest, { recursive: true })
    for (const entry of fs.readdirSync(src)) {
      await copy(path.join(src, entry), path.join(dest, entry))
    }
  } else {
    fs.copyFileSync(src, dest)
  }
}

/**
 * Safely remove a directory
 */
export const removeDir = (dir: string): void => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * Safely remove a file
 */
export const removeFile = (file: string): void => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file)
  }
}

/**
 * Read, transform, and write file content
 */
export const replaceFileContent = (file: string, replacer: (content: string) => string): void => {
  if (!fs.existsSync(file)) return
  const content = fs.readFileSync(file, "utf-8")
  const newContent = replacer(content)
  fs.writeFileSync(file, newContent, "utf-8")
}
