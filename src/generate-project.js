import {
  resolveFeatures,
  copyFeatureFiles,
  applyFeaturePatches,
  applyPackageJsonChanges,
  cleanupMarkers
} from "./feature-engine.js"
import { cleanup } from "./utils/cleanup.js"
import { copy } from "./utils/file.js"
import { updatePackageJson } from "./utils/package.js"
import { exec } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import { computeSelectedFeatures } from "./template-config.js"

const execAsync = promisify(exec)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DEFAULT_STACK_ROOT = path.resolve(__dirname, "..")

export const isLocalTemplate = (templateName, stackRoot = DEFAULT_STACK_ROOT) => {
  return fs.existsSync(path.join(stackRoot, "..", templateName))
}

export const copyTemplateEmpty = async (sourcePath, targetDir) => {
  let emptyPath = path.join(sourcePath, ".webstack", "template-empty")

  if (!fs.existsSync(emptyPath)) {
    emptyPath = path.join(sourcePath, "template-empty")
  }

  if (!fs.existsSync(emptyPath)) {
    throw new Error(`template-empty not found in ${sourcePath}`)
  }

  await copy(emptyPath, targetDir)
}

/**
 * Resolve template source: sibling repo (dev) or shallow git clone.
 */
export const resolveTemplateSource = async (templateName, options = {}) => {
  const stackRoot = options.stackRoot ?? DEFAULT_STACK_ROOT
  const repoUrl = options.repoUrl ?? `https://github.com/davidaganov/${templateName}`
  const sibling = path.join(stackRoot, "..", templateName)

  if (fs.existsSync(sibling)) {
    return { sourcePath: sibling, tmpDir: null }
  }

  const tmpBase = options.tmpDirParent ?? stackRoot
  const tmpDir = fs.mkdtempSync(path.join(tmpBase, ".tmp-stack-src-"))
  await execAsync(`git clone --depth 1 ${repoUrl}.git ${tmpDir}`)
  return { sourcePath: tmpDir, tmpDir }
}

/**
 * Generate a project directory (non-interactive core used by CLI and fixtures).
 */
export const generateProject = async ({
  stackRoot = DEFAULT_STACK_ROOT,
  templateName,
  projectName,
  targetDir,
  buildMode,
  optionalFeatures = [],
  install = false,
  quiet = false,
  repoUrl,
  /** When set, skips clone/sibling resolve (advanced / batch after warm cache). */
  sourcePath: sourcePathOverride = null
}) => {
  const log = quiet ? () => {} : (...a) => console.log(...a)

  let tmpDir = null
  let sourcePath = sourcePathOverride

  try {
    if (!sourcePath) {
      const resolved = await resolveTemplateSource(templateName, { stackRoot, repoUrl })
      sourcePath = resolved.sourcePath
      tmpDir = resolved.tmpDir
    }

    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true })
    }
    fs.mkdirSync(targetDir, { recursive: true })

    await copyTemplateEmpty(sourcePath, targetDir)

    const selectedFeatures =
      buildMode === "empty"
        ? []
        : computeSelectedFeatures(templateName, buildMode, optionalFeatures)

    if (selectedFeatures.length > 0) {
      let featuresDir = path.join(sourcePath, ".webstack", "features")
      if (!fs.existsSync(featuresDir)) {
        featuresDir = path.join(sourcePath, "features")
      }

      if (fs.existsSync(featuresDir)) {
        const features = resolveFeatures(selectedFeatures, featuresDir)

        for (const feature of features) {
          await copyFeatureFiles(feature, featuresDir, targetDir)
        }

        for (const feature of features) {
          applyFeaturePatches(feature, featuresDir, targetDir)
        }

        applyPackageJsonChanges(features, featuresDir, targetDir)
      }
    }

    cleanup(targetDir)
    cleanupMarkers(targetDir)

    if (!selectedFeatures.includes("tests")) {
      const testsDir = path.join(targetDir, "src", "__tests__")
      if (fs.existsSync(testsDir)) {
        fs.rmSync(testsDir, { recursive: true, force: true })
      }

      const vitestConfig = path.join(targetDir, "vitest.config.ts")
      if (fs.existsSync(vitestConfig)) {
        fs.unlinkSync(vitestConfig)
      }
    }

    await updatePackageJson(targetDir, projectName)

    if (install) {
      log(`npm install → ${targetDir}`)
      await execAsync("npm install", { cwd: targetDir })
      try {
        await execAsync("npm run format", { cwd: targetDir })
      } catch {
        log("(npm run format skipped or failed)")
      }
    }

    return { selectedFeatures, sourcePath }
  } finally {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  }
}
