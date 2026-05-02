import fs from "node:fs"
import path from "node:path"

/**
 * Resolve feature packs including dependencies (requires)
 */
export const resolveFeatures = (selectedFeatures, featuresDir) => {
  const resolved = new Set()

  const add = (feature) => {
    if (resolved.has(feature)) return
    const patchPath = path.join(featuresDir, feature, "patch.json")
    if (!fs.existsSync(patchPath)) return
    const patch = JSON.parse(fs.readFileSync(patchPath, "utf-8"))

    for (const dep of patch.requires || []) {
      add(dep)
    }

    resolved.add(feature)
  }

  for (const f of selectedFeatures) {
    add(f)
  }

  // Topological sort
  const order = []
  const visited = new Set()
  const temp = new Set()

  const visit = (feature) => {
    if (temp.has(feature)) throw new Error(`Circular dependency in features: ${feature}`)
    if (visited.has(feature)) return
    temp.add(feature)
    const patchPath = path.join(featuresDir, feature, "patch.json")

    if (fs.existsSync(patchPath)) {
      const patch = JSON.parse(fs.readFileSync(patchPath, "utf-8"))
      for (const dep of patch.requires || []) {
        visit(dep)
      }
    }

    temp.delete(feature)
    visited.add(feature)
    order.push(feature)
  }

  for (const f of resolved) {
    visit(f)
  }

  return order
}

/**
 * Copy files from feature pack to target directory
 */
export const copyFeatureFiles = async (feature, featuresDir, targetDir) => {
  const patchPath = path.join(featuresDir, feature, "patch.json")
  if (!fs.existsSync(patchPath)) return
  const patch = JSON.parse(fs.readFileSync(patchPath, "utf-8"))
  const files = patch.copy || []

  for (const file of files) {
    const src = path.join(featuresDir, feature, file)
    const dest = path.join(targetDir, file)
    if (!fs.existsSync(src)) continue
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    const stat = fs.statSync(src)
    if (stat.isDirectory()) {
      copyDir(src, dest)
    } else {
      fs.copyFileSync(src, dest)
    }
  }
}

/**
 * Recursive directory copy
 */
const copyDir = (src, dest) => {
  fs.mkdirSync(dest, { recursive: true })

  for (const entry of fs.readdirSync(src)) {
    const srcEntry = path.join(src, entry)
    const destEntry = path.join(dest, entry)
    const stat = fs.statSync(srcEntry)

    if (stat.isDirectory()) {
      copyDir(srcEntry, destEntry)
    } else {
      fs.copyFileSync(srcEntry, destEntry)
    }
  }
}

/**
 * Apply patches from a feature pack
 */
export const applyFeaturePatches = (feature, featuresDir, targetDir) => {
  const patchPath = path.join(featuresDir, feature, "patch.json")
  if (!fs.existsSync(patchPath)) return
  const patch = JSON.parse(fs.readFileSync(patchPath, "utf-8"))
  const patches = patch.patches || []

  for (const p of patches) {
    const filePath = path.join(targetDir, p.file)
    if (!fs.existsSync(filePath)) {
      console.warn(`  Skip patch: ${p.file} not found`)
      continue
    }

    if (p.action === "replace-entire") {
      fs.writeFileSync(filePath, p.content, "utf-8")
      continue
    }

    if (p.action === "replace-marker") {
      let content = fs.readFileSync(filePath, "utf-8")
      content = content.replace(/\r\n/g, "\n")
      const replacement = p.lines ? p.lines.join("\n") : p.content
      content = content.replace(p.marker, replacement)
      fs.writeFileSync(filePath, content, "utf-8")
      continue
    }

    if (p.action === "insert-before-marker") {
      let content = fs.readFileSync(filePath, "utf-8")
      content = content.replace(/\r\n/g, "\n")

      if (!content.includes(p.marker)) {
        console.warn(`  Marker not found in ${p.file}: "${p.marker}"`)
        continue
      }

      const lines = p.lines.join("\n")
      content = content.replace(p.marker, lines + "\n" + p.marker)
      fs.writeFileSync(filePath, content, "utf-8")
      continue
    }
  }
}

/**
 * Clean up remaining webstack markers from all files
 */
export const cleanupMarkers = (targetDir) => {
  const markerRegex = /\/\/\s*@webstack:[^\n]*/g
  const htmlMarkerRegex = /<!--\s*@webstack:[^\n]*-->/g

  const processFile = (filePath) => {
    if (!fs.existsSync(filePath)) return
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(filePath)) {
        processFile(path.join(filePath, entry))
      }
      return
    }

    const ext = path.extname(filePath)
    if (![".ts", ".js", ".vue", ".json", ".html", ".css"].includes(ext)) return

    let content = fs.readFileSync(filePath, "utf-8")
    content = content.replace(/\r\n/g, "\n")
    content = content.replace(markerRegex, "")
    content = content.replace(htmlMarkerRegex, "")

    // Collapse multiple newlines (3 or more) to 2
    content = content.replace(/\n{3,}/g, "\n\n")
    // Trim trailing newlines at the end of file, but keep one
    content = content.trimEnd() + "\n"

    fs.writeFileSync(filePath, content, "utf-8")
  }

  processFile(targetDir)
}

/**
 * Apply package.json changes from feature packs
 */
export const applyPackageJsonChanges = (features, featuresDir, targetDir) => {
  const pkgPath = path.join(targetDir, "package.json")
  if (!fs.existsSync(pkgPath)) return
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))

  for (const feature of features) {
    const patchPath = path.join(featuresDir, feature, "patch.json")
    if (!fs.existsSync(patchPath)) continue
    const patch = JSON.parse(fs.readFileSync(patchPath, "utf-8"))
    const pj = patch.packageJson || {}

    // Add dependencies
    for (const dep of pj.dependencies || []) {
      if (!pkg.dependencies) pkg.dependencies = {}
      if (!pkg.dependencies[dep]) pkg.dependencies[dep] = "latest"
    }

    // Add devDependencies
    for (const dep of pj.devDependencies || []) {
      if (!pkg.devDependencies) pkg.devDependencies = {}
      if (!pkg.devDependencies[dep]) pkg.devDependencies[dep] = "latest"
    }

    // Add scripts
    for (const [name, script] of Object.entries(pj.scripts || {})) {
      if (!pkg.scripts) pkg.scripts = {}
      if (!pkg.scripts[name]) pkg.scripts[name] = script
    }
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8")
}

/**
 * Full apply: resolve, copy, patch, package.json, cleanup
 */
export const applyFeatures = async (selectedFeatures, featuresDir, targetDir) => {
  const features = resolveFeatures(selectedFeatures, featuresDir)

  for (const feature of features) {
    await copyFeatureFiles(feature, featuresDir, targetDir)
  }

  for (const feature of features) {
    applyFeaturePatches(feature, featuresDir, targetDir)
  }

  applyPackageJsonChanges(features, featuresDir, targetDir)
  cleanupMarkers(targetDir)
}
