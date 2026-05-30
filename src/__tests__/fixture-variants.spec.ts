import { describe, expect, it } from "vitest"
import {
  expandVariantsForTemplate,
  FIXTURE_VARIANTS,
  multiArchVariantId,
  variantAppliesToTemplate
} from "@/config/fixtures"
import { getTemplate } from "@/config/templates"

describe("fixture-variants", () => {
  it("should apply feature-specific variants only when template supports the feature", () => {
    expect(
      variantAppliesToTemplate(
        FIXTURE_VARIANTS.find((v) => v.id === "config-pinia")!,
        "vue-pwa-template"
      )
    ).toBe(true)
    expect(
      variantAppliesToTemplate(
        FIXTURE_VARIANTS.find((v) => v.id === "config-pinia")!,
        "astro-clean-template"
      )
    ).toBe(false)
    expect(
      variantAppliesToTemplate(
        FIXTURE_VARIANTS.find((v) => v.id === "config-seo")!,
        "nuxt-modern-template"
      )
    ).toBe(true)
    expect(
      variantAppliesToTemplate(
        FIXTURE_VARIANTS.find((v) => v.id === "config-seo")!,
        "vue-pwa-template"
      )
    ).toBe(false)
  })

  it("should expand multi-arch template variants", () => {
    const base = FIXTURE_VARIANTS.find((v) => v.id === "full")!
    const expanded = expandVariantsForTemplate([base], "nuxt-modern-template")
    expect(expanded.map((v) => v.id)).toEqual(["full-flat", "full-layered"])
    expect(expanded.map((v) => v.architecture)).toEqual(["flat", "layered"])
  })

  it("should keep single variant for single-arch templates", () => {
    const base = FIXTURE_VARIANTS.find((v) => v.id === "full")!
    const expanded = expandVariantsForTemplate([base], "vue-pwa-template")
    expect(expanded).toHaveLength(1)
    expect(expanded[0].id).toBe("full")
    expect(expanded[0].architecture).toBe("flat")
  })

  it("should name config variants for multi-arch templates", () => {
    expect(multiArchVariantId("config-i18n", "flat")).toBe("config-flat-i18n")
    expect(multiArchVariantId("config-i18n", "layered")).toBe("config-layered-i18n")
    expect(multiArchVariantId("full", "flat")).toBe("full-flat")
    expect(multiArchVariantId("full", "layered")).toBe("full-layered")
  })

  it("should differentiate full and config-all optional features", () => {
    const full = FIXTURE_VARIANTS.find((v) => v.id === "full")!
    const all = FIXTURE_VARIANTS.find((v) => v.id === "config-all")!
    expect(full.optionalFeatures("vue-pwa-template")).toEqual(["tailwind"])
    expect(all.optionalFeatures("vue-pwa-template")).toEqual(
      getTemplate("vue-pwa-template").features.map((f) => f.value)
    )
  })
})
