import fs from "node:fs"
import path from "node:path"

/**
 * Replace `<project>/node_modules` with a link/junction to `<depsRoot>/node_modules`.
 */
export const linkNodeModules = (projectDir, depsRoot) => {
  const sharedNm = path.resolve(depsRoot, "node_modules")
  const linkPath = path.join(projectDir, "node_modules")

  if (!fs.existsSync(sharedNm)) {
    throw new Error(`Shared node_modules missing: ${sharedNm}. Run with --install first.`)
  }

  if (fs.existsSync(linkPath)) {
    fs.rmSync(linkPath, { recursive: true, force: true })
  }

  const linkType = process.platform === "win32" ? "junction" : "dir"
  fs.symlinkSync(sharedNm, linkPath, linkType)
}
