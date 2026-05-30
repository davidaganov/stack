import fs from "node:fs"
import path from "node:path"

const EXCLUDED_DIRS = ["node_modules", ".git", "dist", "coverage", ".tmp-create-aganov-"]

export const copyDirSync = (src: string, dest: string): void => {
  fs.mkdirSync(dest, { recursive: true })

  for (const entry of fs.readdirSync(src)) {
    const srcEntry = path.join(src, entry)
    const destEntry = path.join(dest, entry)
    const stat = fs.statSync(srcEntry)

    if (stat.isDirectory()) {
      copyDirSync(srcEntry, destEntry)
    } else {
      fs.copyFileSync(srcEntry, destEntry)
    }
  }
}

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
