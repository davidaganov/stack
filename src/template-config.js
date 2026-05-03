import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const templatesPath = path.join(__dirname, "templates.json")

/** @type {Record<string, { label: string, features: { value: string, label: string }[] }>} */
export const TEMPLATES = JSON.parse(fs.readFileSync(templatesPath, "utf-8"))

export const listTemplateIds = () => Object.keys(TEMPLATES)

export const getOptionalFeatureIds = (templateName) => {
  const t = TEMPLATES[templateName]
  if (!t) throw new Error(`Unknown template: ${templateName}`)
  return t.features.map((f) => f.value)
}

export const getRecommendedFeatureIds = (templateName) => getOptionalFeatureIds(templateName)

/**
 * Resolves the feature set for a selected template and setup mode.
 * @param {string} templateName
 * @param {"empty"|"recommended"|"custom"} buildMode
 * @param {string[]} optionalFeatures selected optional modules (Pinia, i18n, etc.)
 */
export const computeSelectedFeatures = (templateName, buildMode, optionalFeatures) => {
  let selectedFeatures = []

  if (buildMode === "recommended") {
    selectedFeatures = [...optionalFeatures, "demo-pages"]
    if (templateName === "vue-pwa-template") {
      selectedFeatures.push("tailwind-config")
    }
  } else if (buildMode === "custom") {
    selectedFeatures = [...optionalFeatures, "demo-pages"]
    if (templateName === "vue-pwa-template") {
      selectedFeatures.push("tailwind-config")
    }
  }

  if (templateName === "vue-lynx-template") {
    const lynxFeatures = ["pinia", "i18n", "tests"]
    const hasAllLynxFeatures = lynxFeatures.every((f) => optionalFeatures.includes(f))

    if (buildMode === "recommended" || hasAllLynxFeatures) {
      selectedFeatures.push("platforms")
    }
  }

  return selectedFeatures
}
