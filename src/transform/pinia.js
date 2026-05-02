import { removeDir } from "../utils/file.js"
import { removePackageDependencies } from "../utils/package.js"
import path from "node:path"

/**
 * Remove Pinia feature from the project
 */
export const removePinia = async (targetDir, _templateName) => {
  removeDir(path.join(targetDir, "src", "stores"))
  removePackageDependencies(path.join(targetDir, "package.json"), ["pinia"])

  const entryPoints = [
    path.join(targetDir, "src", "main.ts"),
    path.join(targetDir, "src", "index.ts")
  ]

  for (const entry of entryPoints) {
    const fs = await import("node:fs")
    if (!fs.existsSync(entry)) continue
    let content = fs.readFileSync(entry, "utf-8")
    content = content.replace(/import \{ createPinia \} from "pinia"\n?/g, "")
    content = content.replace(/const pinia = createPinia\(\)\n?/g, "")
    content = content.replace(/app\.use\(pinia\)\n?/g, "")
    fs.writeFileSync(entry, content, "utf-8")
  }
}
