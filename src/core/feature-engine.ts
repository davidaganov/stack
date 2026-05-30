import fs from "node:fs"
import path from "node:path"
import { getTemplate, orderResolvedFeatures } from "@/config/templates"
import { copyDirSync } from "@/utils/file"
import type { FeatureAliases, FeaturePatch, TemplateArchitecture } from "@/types"

const resolveFeatureName = (feature: string, aliases: FeatureAliases): string =>
  aliases[feature] ?? feature

const patchCache = new Map<string, FeaturePatch>()

const readFeaturePatch = (featuresDir: string, feature: string): FeaturePatch => {
  const cacheKey = path.join(featuresDir, feature, "patch.json")
  const cached = patchCache.get(cacheKey)
  if (cached) return cached

  const patchPath = cacheKey
  if (!fs.existsSync(patchPath)) {
    const empty: FeaturePatch = {}
    patchCache.set(cacheKey, empty)
    return empty
  }

  const patch: FeaturePatch = JSON.parse(fs.readFileSync(patchPath, "utf-8"))
  patchCache.set(cacheKey, patch)
  return patch
}

export const clearFeaturePatchCache = (): void => {
  patchCache.clear()
}

export const findExistingPatchTarget = (
  relativeFile: string,
  targetDir: string,
  architecture: TemplateArchitecture = "flat"
): string | null => {
  const direct = path.join(targetDir, relativeFile)
  if (fs.existsSync(direct)) return direct
  if (architecture !== "layered") return null
  if (relativeFile.startsWith("app/")) return null
  return null
}

const shouldSilenceMissingPatch = (
  relativeFile: string,
  architecture: TemplateArchitecture
): boolean => {
  if (architecture === "flat" && relativeFile.startsWith("layers/")) return true
  if (architecture === "layered" && relativeFile.startsWith("app/")) return true
  return false
}

export const shouldCopyFeaturePath = (
  relativePath: string,
  architecture: TemplateArchitecture,
  layeredAppAllowlist: string[] = []
): boolean => {
  const p = relativePath.replace(/\\/g, "/")
  if (architecture === "flat") return !p.startsWith("layers/")
  if (p.startsWith("layers/")) return true
  if (p.startsWith("app/")) {
    return layeredAppAllowlist.some(
      (prefix) => p === prefix.replace(/\/$/, "") || p.startsWith(prefix)
    )
  }
  return true
}

export const resolveFeatures = (
  selectedFeatures: string[],
  featuresDir: string,
  aliases: FeatureAliases = {}
): string[] => {
  const order: string[] = []
  const visited = new Set<string>()
  const temp = new Set<string>()

  const visit = (feature: string) => {
    const resolved = resolveFeatureName(feature, aliases)
    if (temp.has(resolved)) throw new Error(`Circular dependency in features: ${resolved}`)
    if (visited.has(resolved)) return

    temp.add(resolved)
    const patch = readFeaturePatch(featuresDir, resolved)
    for (const dep of patch.requires || []) {
      visit(dep)
    }

    temp.delete(resolved)
    visited.add(resolved)
    order.push(resolved)
  }

  for (const f of selectedFeatures) {
    visit(f)
  }

  return order
}

const copyFeaturePath = (src: string, dest: string): void => {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    copyDirSync(src, dest)
  } else {
    fs.copyFileSync(src, dest)
  }
}

export const copyFeatureFiles = async (
  feature: string,
  featuresDir: string,
  targetDir: string,
  contentRoot = "src",
  architecture: TemplateArchitecture = "flat",
  layeredAppAllowlist: string[] = []
): Promise<void> => {
  const featurePath = path.join(featuresDir, feature)
  const patch = readFeaturePatch(featuresDir, feature)
  const copyContentRoot = patch.copyContentRoot === true

  if (copyContentRoot) {
    const appPath = path.join(featurePath, "app")
    const srcPath = path.join(featurePath, "src")
    const layersPath = path.join(featurePath, "layers")

    if (contentRoot === "app" && fs.existsSync(appPath)) {
      if (architecture === "flat") {
        copyDirSync(appPath, path.join(targetDir, "app"))
      } else {
        for (const entry of fs.readdirSync(appPath)) {
          const rel = `app/${entry}`
          if (!shouldCopyFeaturePath(rel, architecture, layeredAppAllowlist)) continue
          copyFeaturePath(path.join(appPath, entry), path.join(targetDir, "app", entry))
        }
      }
    } else if (fs.existsSync(srcPath)) {
      copyDirSync(srcPath, path.join(targetDir, contentRoot))
    }

    if (architecture === "layered" && fs.existsSync(layersPath)) {
      copyDirSync(layersPath, path.join(targetDir, "layers"))
    }
  }

  for (const file of patch.copy || []) {
    if (!shouldCopyFeaturePath(file, architecture, layeredAppAllowlist)) continue
    copyFeaturePath(path.join(featurePath, file), path.join(targetDir, file))
  }
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const buildMarkerRegex = (marker: string): RegExp => {
  const normalized = marker.replace(/\r\n/g, "\n")

  if (normalized.includes("-->")) {
    const commentEnd = normalized.indexOf("-->") + 3
    const comment = normalized.slice(0, commentEnd)
    const trailing = normalized.slice(commentEnd)
    const commentPattern = escapeRegex(comment)
    if (!trailing.trim()) {
      return new RegExp(commentPattern, "g")
    }
    const trailingPattern = escapeRegex(trailing.trim()).replace(/\s+/g, "\\s+")
    return new RegExp(`${commentPattern}\\s*${trailingPattern}`, "g")
  }

  return new RegExp(escapeRegex(normalized).replace(/\\n/g, "\\n\\s*"), "g")
}

const markerMatches = (content: string, marker: string): boolean => buildMarkerRegex(marker).test(content)

const applyMarkerPatch = (
  content: string,
  marker: string,
  replacement: string,
  action: string
): string => {
  const regex = buildMarkerRegex(marker)
  const isReplace = action === "replace-marker" || action === "replace"

  if (isReplace) {
    return content.replace(regex, replacement)
  }
  if (action === "insert-before-marker" || action === "insert-before") {
    return content.replace(regex, (match) => `${replacement}\n${match}`)
  }
  if (action === "insert-after-marker" || action === "insert-after") {
    return content.replace(regex, (match) => `${match}\n${replacement}`)
  }
  return content
}

export const applyFeaturePatches = (
  feature: string,
  featuresDir: string,
  targetDir: string,
  architecture: TemplateArchitecture = "flat"
): void => {
  const patch = readFeaturePatch(featuresDir, feature)
  const patches = patch.patches || []

  for (const file of patch.remove || []) {
    const filePath = path.join(targetDir, file)
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { recursive: true, force: true })
    }
  }

  for (const p of patches) {
    const filePath = findExistingPatchTarget(p.file, targetDir, architecture)
    if (!filePath) {
      if (!p.optional && !shouldSilenceMissingPatch(p.file, architecture)) {
        console.warn(`  Skip patch: ${p.file} not found`)
      }
      continue
    }

    if (p.action === "replace-entire") {
      fs.writeFileSync(filePath, p.content || "", "utf-8")
      continue
    }

    let content = fs.readFileSync(filePath, "utf-8")
    content = content.replace(/\r\n/g, "\n")
    const marker = p.marker || p.target
    if (!marker) continue

    const replacement = p.content || (p.lines ? p.lines.join("\n") : "")

    if (!markerMatches(content, marker)) {
      if (!p.optional && !shouldSilenceMissingPatch(p.file, architecture)) {
        console.warn(`  Marker not found in ${p.file}: "${marker}"`)
      }
      continue
    }

    content = applyMarkerPatch(content, marker, replacement, p.action)

    fs.writeFileSync(filePath, content, "utf-8")
  }
}

export const cleanupMarkers = (targetDir: string): void => {
  const markerRegex = /\/\/\s*@webstack:[^\n]*/g
  const htmlMarkerRegex = /<!--\s*@webstack:[^\n]*-->/g
  const cssMarkerRegex = /\/\*\s*@webstack:[^*]*\*\//g

  const processFile = (filePath: string) => {
    if (!fs.existsSync(filePath)) return
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(filePath)) {
        processFile(path.join(filePath, entry))
      }
      return
    }

    const ext = path.extname(filePath)
    if (![".ts", ".js", ".vue", ".json", ".html", ".css", ".astro"].includes(ext)) return

    let content = fs.readFileSync(filePath, "utf-8")
    content = content.replace(/\r\n/g, "\n")
    content = content.replace(markerRegex, "")
    content = content.replace(htmlMarkerRegex, "")
    content = content.replace(cssMarkerRegex, "")
    content = content.replace(/\n{3,}/g, "\n\n")
    content = content.trimEnd() + "\n"

    fs.writeFileSync(filePath, content, "utf-8")
  }

  processFile(targetDir)
}

export const applyPackageJsonChanges = (
  features: string[],
  featuresDir: string,
  targetDir: string
): void => {
  const pkgPath = path.join(targetDir, "package.json")
  if (!fs.existsSync(pkgPath)) return
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))

  for (const feature of features) {
    const patch = readFeaturePatch(featuresDir, feature)
    const pj = patch.packageJson || {}

    for (const dep of pj.dependencies || []) {
      if (!pkg.dependencies) pkg.dependencies = {}
      if (!pkg.dependencies[dep]) pkg.dependencies[dep] = "latest"
    }

    for (const dep of pj.devDependencies || []) {
      if (!pkg.devDependencies) pkg.devDependencies = {}
      if (!pkg.devDependencies[dep]) pkg.devDependencies[dep] = "latest"
    }

    for (const [name, script] of Object.entries(pj.scripts || {})) {
      if (!pkg.scripts) pkg.scripts = {}
      if (!pkg.scripts[name]) pkg.scripts[name] = script
    }
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8")
}

export const applyFeatures = async (
  selectedFeatures: string[],
  featuresDir: string,
  targetDir: string,
  templateName: string,
  aliases: FeatureAliases = {},
  architecture: TemplateArchitecture = "flat"
): Promise<void> => {
  clearFeaturePatchCache()

  const template = getTemplate(templateName)
  const contentRoot = template.contentRoot ?? "src"
  const layeredAppAllowlist = template.layeredAppAllowlist ?? []
  const features = orderResolvedFeatures(
    templateName,
    resolveFeatures(selectedFeatures, featuresDir, aliases)
  )

  for (const feature of features) {
    await copyFeatureFiles(
      feature,
      featuresDir,
      targetDir,
      contentRoot,
      architecture,
      layeredAppAllowlist
    )
  }

  for (const feature of features) {
    applyFeaturePatches(feature, featuresDir, targetDir, architecture)
  }

  applyPackageJsonChanges(features, featuresDir, targetDir)
  cleanupMarkers(targetDir)
}
