import type { BuildMode, TemplateArchitecture } from "@/types"
import { getRecommendedFeatureIds, getTemplate } from "./templates"

export interface FixtureVariantDef {
  id: string
  flags: string[]
  requiredFeature?: string
  buildMode: BuildMode
  optionalFeatures: (templateId: string) => string[]
  blurb: string
}

export interface ExpandedFixtureVariant extends FixtureVariantDef {
  architecture: TemplateArchitecture
}

export const FIXTURE_VARIANTS: FixtureVariantDef[] = [
  {
    id: "empty",
    flags: ["empty"],
    buildMode: "empty",
    optionalFeatures: () => [],
    blurb: "Minimal runnable project without demo pages or optional modules."
  },
  {
    id: "full",
    flags: ["full"],
    buildMode: "recommended",
    optionalFeatures: (t) => getRecommendedFeatureIds(t),
    blurb: "Recommended preset with demo pages and default optional modules."
  },
  {
    id: "config-all",
    flags: ["config-all"],
    buildMode: "custom",
    optionalFeatures: (t) => getTemplate(t).features.map((f) => f.value),
    blurb: "Custom mode with every optional module enabled."
  },
  {
    id: "config-none",
    flags: ["config-none"],
    buildMode: "custom",
    optionalFeatures: () => [],
    blurb: "Custom mode with demo pages and no optional modules."
  },
  {
    id: "config-i18n",
    flags: ["config-i18n"],
    buildMode: "custom",
    optionalFeatures: () => ["i18n"],
    blurb: "Custom mode — i18n only."
  },
  {
    id: "config-pinia",
    flags: ["config-pinia"],
    requiredFeature: "pinia",
    buildMode: "custom",
    optionalFeatures: () => ["pinia"],
    blurb: "Custom mode — Pinia only."
  },
  {
    id: "config-tests",
    flags: ["config-tests"],
    requiredFeature: "tests",
    buildMode: "custom",
    optionalFeatures: () => ["tests"],
    blurb: "Custom mode — Vitest module only."
  },
  {
    id: "config-tailwind",
    flags: ["config-tailwind"],
    requiredFeature: "tailwind",
    buildMode: "custom",
    optionalFeatures: () => ["tailwind"],
    blurb: "Custom mode — Tailwind CSS only."
  },
  {
    id: "config-seo",
    flags: ["config-seo"],
    requiredFeature: "seo",
    buildMode: "custom",
    optionalFeatures: () => ["seo"],
    blurb: "Custom mode — SEO module only."
  },
  {
    id: "config-content",
    flags: ["config-content"],
    requiredFeature: "content",
    buildMode: "custom",
    optionalFeatures: () => ["content"],
    blurb: "Custom mode — Nuxt Content + blog only."
  }
]

export const multiArchVariantId = (baseId: string, architecture: TemplateArchitecture): string => {
  if (baseId.startsWith("config-")) {
    const suffix = baseId.slice("config-".length)
    return architecture === "flat" ? `config-flat-${suffix}` : `config-layered-${suffix}`
  }
  return architecture === "flat" ? `${baseId}-flat` : `${baseId}-layered`
}

export const variantAppliesToTemplate = (
  variant: FixtureVariantDef,
  templateId: string
): boolean => {
  if (!variant.requiredFeature) return true
  return getTemplate(templateId).features.some((f) => f.value === variant.requiredFeature)
}

export const expandVariantsForTemplate = (
  variants: FixtureVariantDef[],
  templateId: string
): ExpandedFixtureVariant[] => {
  const architectures = getTemplate(templateId).architectures
  const defaultArchitecture = architectures?.[0]?.value ?? "flat"

  if (!architectures || architectures.length <= 1) {
    return variants.map((v) => ({ ...v, architecture: defaultArchitecture }))
  }

  return variants.flatMap((v) =>
    architectures.map((arch) => ({
      ...v,
      id: multiArchVariantId(v.id, arch.value),
      architecture: arch.value
    }))
  )
}

export const getFixtureVariantFlags = (): string[] => FIXTURE_VARIANTS.flatMap((v) => v.flags)
