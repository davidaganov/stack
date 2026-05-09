import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { BuildMode, Template } from "@/types"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const templatesPath = path.join(__dirname, "templates.json")

export const TEMPLATES: Record<string, Template> = JSON.parse(
  fs.readFileSync(templatesPath, "utf-8")
)

export const listTemplateIds = (): string[] => Object.keys(TEMPLATES)

export const getOptionalFeatureIds = (templateName: string): string[] => {
  const t = TEMPLATES[templateName]
  if (!t) throw new Error(`Unknown template: ${templateName}`)
  return t.features.map((f) => f.value)
}

export const getRecommendedFeatureIds = (templateName: string): string[] => {
  return getOptionalFeatureIds(templateName)
}

/**
 * Resolves the feature set for a selected template and setup mode.
 */
const tailwindLast = (features: string[]): string[] => {
  const tw = features.filter((f) => f === "tailwind")
  const rest = features.filter((f) => f !== "tailwind")
  return [...rest, ...tw]
}

export const computeSelectedFeatures = (
  templateName: string,
  buildMode: BuildMode,
  optionalFeatures: string[]
): string[] => {
  let selectedFeatures: string[] = []
  const optionalOrdered =
    templateName === "vue-modern-template" ||
    templateName === "vue-pwa-template" ||
    templateName === "vue-lynx-template"
      ? tailwindLast(optionalFeatures)
      : optionalFeatures

  if (buildMode === "recommended") {
    selectedFeatures = [...optionalOrdered, "demo-pages"]
  } else if (buildMode === "custom") {
    selectedFeatures = [...optionalOrdered, "demo-pages"]
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
