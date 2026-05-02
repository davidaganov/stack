import { removeDir, replaceFileContent } from "../utils/file.js"
import { removePackageDependencies } from "../utils/package.js"
import path from "node:path"

/**
 * Remove Vue Router feature from the project
 */
export const removeRouter = async (targetDir, _templateName) => {
  removeDir(path.join(targetDir, "src", "router"))
  removePackageDependencies(path.join(targetDir, "package.json"), ["vue-router"])

  const appVue = path.join(targetDir, "src", "App.vue")
  replaceFileContent(appVue, (content) => {
    return content.replace(/<RouterView\s*\/>/g, "<div>Hello from Vue PWA Template</div>")
  })

  const entryPoints = [
    path.join(targetDir, "src", "main.ts"),
    path.join(targetDir, "src", "index.ts")
  ]

  for (const entry of entryPoints) {
    replaceFileContent(entry, (content) => {
      let result = content
      result = result.replace(/import router from "@\/router"\n?/g, "")
      result = result.replace(/import router from "\.\/router"\n?/g, "")
      result = result.replace(/app\.use\(router\)\n?/g, "")
      return result
    })
  }
}
