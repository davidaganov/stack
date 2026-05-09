import { exec } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { promisify } from "node:util"
import { dim, yellow } from "kolorist"
import {
  applyFeaturePatches,
  applyPackageJsonChanges,
  cleanupMarkers,
  copyFeatureFiles,
  DEFAULT_STACK_ROOT,
  resolveFeatures,
  resolveTemplateSource
} from "@/core"
import { computeSelectedFeatures } from "@/config"
import { cleanup, copy, getDetectedPackageManager, updatePackageJson } from "@/utils"
import type { GenerateOptions } from "@/types"

const execAsync = promisify(exec)

export const isLocalTemplate = (
  templateName: string,
  stackRoot: string = DEFAULT_STACK_ROOT
): boolean => {
  return fs.existsSync(path.join(stackRoot, "..", templateName))
}

export const copyTemplateEmpty = async (sourcePath: string, targetDir: string): Promise<void> => {
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
  packageManager,
  quiet = false,
  repoUrl,
  sourcePath: sourcePathOverride = null
}: GenerateOptions & { repoUrl?: string; sourcePath?: string | null }): Promise<{
  selectedFeatures: string[]
  sourcePath: string
  installFailed?: boolean
}> => {
  const log = quiet ? () => {} : (...a: unknown[]) => console.log(...a)

  let tmpDir: string | null = null
  let sourcePath = sourcePathOverride

  try {
    if (!sourcePath) {
      const resolved = await resolveTemplateSource(templateName, { stackRoot, repoUrl })
      sourcePath = resolved.sourcePath
      tmpDir = resolved.tmpDir
    }

    const finalSourcePath = sourcePath ?? sourcePathOverride
    if (!finalSourcePath) {
      throw new Error("Failed to resolve source path")
    }

    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true })
    }

    fs.mkdirSync(targetDir, { recursive: true })

    await copyTemplateEmpty(finalSourcePath, targetDir)

    const selectedFeatures =
      buildMode === "empty"
        ? []
        : computeSelectedFeatures(templateName, buildMode, optionalFeatures)

    if (selectedFeatures.length > 0) {
      let featuresDir = path.join(finalSourcePath, ".webstack", "features")
      if (!fs.existsSync(featuresDir)) {
        featuresDir = path.join(finalSourcePath, "features")
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

    let installFailed = false

    if (install) {
      const pm = packageManager || getDetectedPackageManager()
      log(`${pm} install → ${targetDir}`)
      try {
        await execAsync(`${pm} install`, { cwd: targetDir })
        try {
          await execAsync(`${pm} run format`, { cwd: targetDir })
        } catch {
          log(`(${pm} run format skipped or failed)`)
        }
      } catch (err: any) {
        installFailed = true
        log(yellow(`Warning: Could not run "${pm} install". Is it installed?`))
        log(dim("Project generated successfully, but dependencies must be installed manually."))
      }
    }

    return { selectedFeatures, sourcePath: finalSourcePath, installFailed }
  } finally {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  }
}
