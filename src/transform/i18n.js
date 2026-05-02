import { removeDir, removeFile } from "../utils/file.js"
import { removePackageDependencies, removePackageScripts } from "../utils/package.js"
import fs from "node:fs"
import path from "node:path"

/**
 * Remove i18n feature from the project
 */
export const removeI18n = async (targetDir, _templateName) => {
  removeDir(path.join(targetDir, "src", "i18n"))
  removeFile(path.join(targetDir, "polyglot.config.json"))

  const i18nDeps = ["vue-i18n", "@mannisto/astro-i18n", "polyglot-keeper"]
  removePackageDependencies(path.join(targetDir, "package.json"), i18nDeps)
  removePackageScripts(path.join(targetDir, "package.json"), ["translate"])

  const entryPoints = [
    path.join(targetDir, "src", "main.ts"),
    path.join(targetDir, "src", "index.ts")
  ]

  for (const entry of entryPoints) {
    if (!fs.existsSync(entry)) continue
    let content = fs.readFileSync(entry, "utf-8")
    content = content.replace(/import \{ createI18n \} from "vue-i18n"\n?/g, "")
    content = content.replace(/import \{ createI18n \} from "@\/i18n"\n?/g, "")
    content = content.replace(/import \{ createI18n \} from "\.\/i18n"\n?/g, "")
    content = content.replace(/import .* from "@\/i18n\/locales\/.*"\n?/g, "")
    content = content.replace(/import .* from "@\/types\/enums\/locales\.enum"\n?/g, "")
    content = content.replace(/const i18n = createI18n\(\{[\s\S]*?\}\)\n?/g, "")
    content = content.replace(/app\.use\(i18n\)\n?/g, "")
    fs.writeFileSync(entry, content, "utf-8")
  }

  const envExample = path.join(targetDir, ".env.example")
  if (fs.existsSync(envExample)) {
    let env = fs.readFileSync(envExample, "utf-8")
    env = env.replace(/VITE_POLYGLOT_API_KEY=.*\n?/g, "")
    fs.writeFileSync(envExample, env, "utf-8")
  }
}
