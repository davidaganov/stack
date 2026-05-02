import fs from "node:fs"
import path from "node:path"

/**
 * Reset package.json fields to match new project
 */
export const updatePackageJson = async (targetDir, projectName) => {
  const pkgPath = path.join(targetDir, "package.json")
  if (!fs.existsSync(pkgPath)) return

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
  pkg.name = projectName
  pkg.version = "0.0.1"
  pkg.description = ""
  pkg.author = undefined
  pkg.homepage = undefined
  pkg.bugs = undefined
  pkg.repository = undefined

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8")
}

/**
 * Clean up dependencies from package.json
 */
export const removePackageDependencies = (pkgPath, depsToRemove) => {
  if (!fs.existsSync(pkgPath)) return
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))

  for (const dep of depsToRemove) {
    if (pkg.dependencies) delete pkg.dependencies[dep]
    if (pkg.devDependencies) delete pkg.devDependencies[dep]
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8")
}

/**
 * Clean up scripts from package.json
 */
export const removePackageScripts = (pkgPath, scriptsToRemove) => {
  if (!fs.existsSync(pkgPath)) return
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
  if (!pkg.scripts) return

  for (const script of scriptsToRemove) {
    delete pkg.scripts[script]
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8")
}
