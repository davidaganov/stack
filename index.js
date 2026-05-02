#!/usr/bin/env node
import {
  resolveFeatures,
  copyFeatureFiles,
  applyFeaturePatches,
  applyPackageJsonChanges,
  cleanupMarkers
} from "./src/feature-engine.js"
import { runPrompts } from "./src/prompts.js"
import { cleanup } from "./src/utils/cleanup.js"
import { copy } from "./src/utils/file.js"
import { updatePackageJson } from "./src/utils/package.js"
import { outro, spinner, note } from "@clack/prompts"
import { cyan, green, dim, bold, yellow, white } from "kolorist"
import { exec } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Check if the template exists locally for development
 */
const isLocalDev = (templateName) => {
  return fs.existsSync(path.join(__dirname, "..", templateName))
}

/**
 * Copy the base empty template to the target directory
 */
const copyTemplateEmpty = async (sourcePath, targetDir) => {
  let emptyPath = path.join(sourcePath, ".webstack", "template-empty")

  // Fallback to root for older templates
  if (!fs.existsSync(emptyPath)) {
    emptyPath = path.join(sourcePath, "template-empty")
  }

  if (!fs.existsSync(emptyPath)) {
    throw new Error(`template-empty not found in ${sourcePath}`)
  }

  await copy(emptyPath, targetDir)
}

/**
 * Main execution flow
 */
const main = async () => {
  const ART = ["  █▀▀ █▀█ █▀▀ ▄▀█ ▀█▀ █▀▀", "  █▄▄ █▀▄ ██▄ █▀█  █  ██▄"]

  const banner = [
    "",
    ...ART.map((line) => cyan(bold(line))),
    "",
    dim("  Building your next web project"),
    ""
  ].join("\n")

  console.log(banner)

  const cwd = process.cwd()
  const answers = await runPrompts(cwd)

  const targetDir = path.join(cwd, answers.projectName)
  if (fs.existsSync(targetDir)) {
    outro(yellow(`Directory "${answers.projectName}" already exists.`))
    process.exit(1)
  }

  const s = spinner()

  // Step 1: Base Template Source
  const templateName = answers.templateName
  const repoUrl = `https://github.com/davidaganov/${templateName}`
  const localDev = isLocalDev(templateName)

  let sourcePath = null
  let tmpDir = null

  if (localDev) {
    sourcePath = path.join(__dirname, "..", templateName)
  } else {
    s.start(`Cloning ${cyan(templateName)}...`)
    tmpDir = fs.mkdtempSync(path.join(cwd, ".tmp-cws-"))
    try {
      await execAsync(`git clone --depth 1 ${repoUrl}.git ${tmpDir}`)
      sourcePath = tmpDir
    } catch {
      s.stop(yellow("Failed to clone template from GitHub"))
      if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true })
      process.exit(1)
    }
  }

  // Step 1.1: Scaffolding
  s.start(`Generating project in ${cyan(answers.projectName)}...`)
  fs.mkdirSync(targetDir, { recursive: true })
  await copyTemplateEmpty(sourcePath, targetDir)
  s.stop(green("Template ready"))

  // Step 2: Determine feature packs to apply
  let selectedFeatures = []
  if (answers.scaffold === "recommended") {
    selectedFeatures = ["router", ...answers.features, "demo-pages"]
    if (templateName === "vue-pwa-template") {
      selectedFeatures.push("tailwind-config")
    }
  } else if (answers.scaffold === "custom") {
    selectedFeatures = ["router", ...answers.features, "demo-pages"]
    if (templateName === "vue-pwa-template") {
      selectedFeatures.push("tailwind-config")
    }
  }

  // Step 3: Apply feature packs
  if (selectedFeatures.length > 0) {
    let featuresDir = path.join(sourcePath, ".webstack", "features")

    // Fallback for older templates
    if (!fs.existsSync(featuresDir)) {
      featuresDir = path.join(sourcePath, "features")
    }

    if (fs.existsSync(featuresDir)) {
      const features = resolveFeatures(selectedFeatures, featuresDir)

      const coreFeatures = ["router", "tailwind-config", "demo-pages"]
      const modules = features.filter((f) => !coreFeatures.includes(f))

      // Phase 1: Copy all files
      for (const feature of features) {
        await copyFeatureFiles(feature, featuresDir, targetDir)
      }

      // Phase 2: Apply patches (with progress reporting)
      if (modules.length > 0) {
        s.start(`Applying modules: ${dim(modules.join(", "))}`)
      }

      for (const feature of features) {
        applyFeaturePatches(feature, featuresDir, targetDir)
      }

      if (modules.length > 0) {
        s.stop(green(`Modules applied: ${white(modules.join(", "))}`))
      }

      applyPackageJsonChanges(features, featuresDir, targetDir)
    }
  }

  // Step 4: Cleanup and finalize
  s.start("Finalizing project...")
  await cleanup(targetDir)
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

  await updatePackageJson(targetDir, answers.projectName)

  // Step 5: Install dependencies
  if (answers.install) {
    s.message = `Installing dependencies... ${dim("(this may take a minute)")}`
    try {
      await execAsync("npm install", { cwd: targetDir })
    } catch {
      s.stop(yellow("Failed to install dependencies."))
    }
  }

  s.stop(green("Project finalized"))

  // Final Cleanup
  if (tmpDir) {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  const nextSteps = `cd ${answers.projectName}${!answers.install ? "\nnpm install" : ""}\nnpm run dev`

  note(nextSteps, "Next steps")
  outro(green(bold("Success! Ready for coding.")))

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
