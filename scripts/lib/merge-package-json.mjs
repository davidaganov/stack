import fs from "node:fs"

/**
 * Merge dependencies from multiple package.json files (union of keys).
 */
export const mergePackageJsonFiles = (absolutePaths) => {
  const merged = {
    name: "stack-gen-shared-deps",
    private: true,
    version: "0.0.0",
    dependencies: {},
    devDependencies: {}
  }

  for (const pkgPath of absolutePaths) {
    if (!fs.existsSync(pkgPath)) continue
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
    Object.assign(merged.dependencies, pkg.dependencies || {})
    Object.assign(merged.devDependencies, pkg.devDependencies || {})
  }

  return merged
}
