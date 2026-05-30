import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { BuildMode, Feature, Template, TemplateArchitecture } from "@/types"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const templatesPath = path.join(__dirname, "templates.json")

const VUE_SHARED_FEATURES: Feature[] = [
  { value: "tailwind", label: "Tailwind CSS", default: true },
  { value: "pinia", label: "Pinia" },
  { value: "i18n", label: "i18n (vue-i18n + polyglot-keeper)" },
  { value: "tests", label: "Unit Tests (vitest)" }
]

const VUE_FEATURE_ORDER: Template["featureOrder"] = [
  { after: ["tailwind"], before: ["i18n", "pinia"] }
]

const VUE_TEMPLATE_DEFAULTS: Partial<Template> = {
  demoPagesFeature: "demo-pages",
  featureOrder: VUE_FEATURE_ORDER,
  features: VUE_SHARED_FEATURES
}

const VUE_TEMPLATE_IDS = ["vue-pwa-template", "vue-modern-template", "vue-lynx-template"]

const rawTemplates: Record<string, Template> = JSON.parse(fs.readFileSync(templatesPath, "utf-8"))

export const TEMPLATES: Record<string, Template> = Object.fromEntries(
  Object.entries(rawTemplates).map(([id, template]) => {
    if (!VUE_TEMPLATE_IDS.includes(id)) return [id, template]
    const merged: Template = {
      ...VUE_TEMPLATE_DEFAULTS,
      ...template,
      features: template.features ?? VUE_SHARED_FEATURES
    }
    if (id === "vue-lynx-template") {
      merged.features = (template.features ?? VUE_SHARED_FEATURES).map((f) =>
        f.value === "i18n" ? { ...f, label: "i18n (custom + polyglot-keeper)" } : f
      )
    }
    return [id, merged]
  })
)

export const getTemplate = (templateName: string): Template => {
  const t = TEMPLATES[templateName]
  if (!t) throw new Error(`Unknown template: ${templateName}`)
  return t
}

export const getRecommendedFeatureIds = (templateName: string): string[] => {
  const features = getTemplate(templateName).features
  const defaults = features.filter((f) => f.default === true).map((f) => f.value)
  if (defaults.length > 0) return defaults
  return features.map((f) => f.value)
}

const getDemoPagesFeatureId = (
  templateName: string,
  architecture: TemplateArchitecture = "flat"
): string => {
  const config = getTemplate(templateName).demoPagesFeature ?? "demo-pages"
  if (typeof config === "string") return config
  return architecture === "layered" ? config.layered : config.flat
}

export const getFeatureAliases = (
  templateName: string,
  architecture: TemplateArchitecture = "flat"
): Record<string, string> => {
  const demoPagesId = getDemoPagesFeatureId(templateName, architecture)
  if (demoPagesId === "demo-pages") return {}
  return { "demo-pages": demoPagesId }
}

const moveFeaturesLast = (features: string[], ids: string[]): string[] => {
  const last = features.filter((f) => ids.includes(f))
  const rest = features.filter((f) => !ids.includes(f))
  return [...rest, ...last]
}

const applyFeatureOrderRules = (features: string[], rules: Template["featureOrder"]): string[] => {
  if (!rules?.length) return features

  let ordered = [...features]
  for (const rule of rules) {
    const afterSet = new Set(rule.after)
    const beforeSet = new Set(rule.before)
    const afterItems = ordered.filter((f) => afterSet.has(f))
    const beforeItems = ordered.filter((f) => beforeSet.has(f))
    const middle = ordered.filter((f) => !afterSet.has(f) && !beforeSet.has(f))
    ordered = [...middle, ...afterItems, ...beforeItems]
  }
  return ordered
}

export const orderResolvedFeatures = (templateName: string, features: string[]): string[] => {
  const template = getTemplate(templateName)
  let ordered = applyFeatureOrderRules(features, template.featureOrder)
  if (template.applyTailwindLast) {
    ordered = moveFeaturesLast(ordered, ["tailwind"])
  }
  return ordered
}

const orderOptionalFeatures = (templateName: string, features: string[]): string[] => {
  return applyFeatureOrderRules(features, getTemplate(templateName).featureOrder)
}

const resolveAutoFeatures = (
  templateName: string,
  buildMode: BuildMode,
  optionalFeatures: string[]
): string[] => {
  const rules = getTemplate(templateName).autoFeatures ?? []
  const resolved: string[] = []

  for (const rule of rules) {
    const { when, feature } = rule
    let matches = true

    if (when.mode !== undefined && when.mode !== buildMode) {
      matches = false
    }

    if (when.allOf?.length) {
      matches = matches && when.allOf.every((f) => optionalFeatures.includes(f))
    }

    if (matches && !resolved.includes(feature)) {
      resolved.push(feature)
    }
  }

  return resolved
}

export const computeSelectedFeatures = (
  templateName: string,
  buildMode: BuildMode,
  optionalFeatures: string[],
  architecture: TemplateArchitecture = "flat"
): string[] => {
  if (buildMode === "empty") return []

  const optionalOrdered = orderOptionalFeatures(templateName, optionalFeatures)
  const selectedFeatures = [
    ...optionalOrdered,
    getDemoPagesFeatureId(templateName, architecture),
    ...resolveAutoFeatures(templateName, buildMode, optionalFeatures)
  ]

  return [...new Set(selectedFeatures)]
}
