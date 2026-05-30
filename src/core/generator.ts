import { exec } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { promisify } from "node:util"
import { dim, yellow } from "kolorist"
import { applyFeatures } from "@/core/feature-engine"
import { DEFAULT_STACK_ROOT, resolveTemplateSource } from "@/core/resolver"
import { computeSelectedFeatures, getFeatureAliases, getTemplate } from "@/config/templates"
import { copy } from "@/utils/file"
import { getDetectedPackageManager, updatePackageJson } from "@/utils/package"
import type { GenerateOptions, TemplateArchitecture } from "@/types"

const execAsync = promisify(exec)

const GENERATED_ARTIFACTS = [
  ".git",
  "node_modules",
  "dist",
  "coverage",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  ".eslintcache"
]

const removeGeneratedArtifacts = (targetDir: string): void => {
  for (const item of GENERATED_ARTIFACTS) {
    const fullPath = path.join(targetDir, item)
    if (!fs.existsSync(fullPath)) continue

    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true })
    } else {
      fs.unlinkSync(fullPath)
    }
  }
}

export const copyTemplateEmpty = async (
  sourcePath: string,
  targetDir: string,
  architecture: TemplateArchitecture = "flat"
): Promise<void> => {
  const basePath = path.join(sourcePath, "template-empty-base")
  if (fs.existsSync(basePath)) await copy(basePath, targetDir)

  const candidates = [
    path.join(sourcePath, `template-empty-${architecture}`),
    path.join(sourcePath, "template-empty")
  ]

  const emptyPath = candidates.find((p) => fs.existsSync(p))
  if (!emptyPath) {
    throw new Error(`template-empty not found in ${sourcePath} (architecture: ${architecture})`)
  }

  await copy(emptyPath, targetDir)
}

export const generateProject = async ({
  stackRoot = DEFAULT_STACK_ROOT,
  templateName,
  projectName,
  targetDir,
  buildMode,
  architecture: architectureInput,
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
  const template = getTemplate(templateName)
  const architecture = architectureInput ?? template.architectures?.[0]?.value ?? "flat"
  const featureAliases = getFeatureAliases(templateName, architecture)

  let tmpDir: string | null = null
  let sourcePath = sourcePathOverride

  try {
    if (!sourcePath) {
      const resolved = await resolveTemplateSource(templateName, { stackRoot, repoUrl })
      sourcePath = resolved.sourcePath
      tmpDir = resolved.tmpDir
    }

    if (!sourcePath) {
      throw new Error("Failed to resolve source path")
    }

    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true })
    }

    fs.mkdirSync(targetDir, { recursive: true })

    await copyTemplateEmpty(sourcePath, targetDir, architecture)

    const selectedFeatures = computeSelectedFeatures(
      templateName,
      buildMode,
      optionalFeatures,
      architecture
    )

    if (selectedFeatures.length > 0) {
      const featuresDir = path.join(sourcePath, "features")

      if (fs.existsSync(featuresDir)) {
        await applyFeatures(
          selectedFeatures,
          featuresDir,
          targetDir,
          templateName,
          featureAliases,
          architecture
        )
      }
    }

    removeGeneratedArtifacts(targetDir)

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
      } catch {
        installFailed = true
        log(yellow(`Warning: Could not run "${pm} install". Is it installed?`))
        log(dim("Project generated successfully, but dependencies must be installed manually."))
      }
    }

    return { selectedFeatures, sourcePath, installFailed }
  } finally {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  }
}
