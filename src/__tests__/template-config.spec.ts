import { describe, expect, it } from "vitest"
import {
  computeSelectedFeatures,
  getRecommendedFeatureIds,
  getTemplate,
  TEMPLATES
} from "@/config/templates"

describe("template-config", () => {
  it("should list available templates", () => {
    const ids = Object.keys(TEMPLATES)
    expect(ids).toBeInstanceOf(Array)
    expect(ids.length).toBeGreaterThan(0)
  })

  it("should compute features for empty build mode", () => {
    const features = computeSelectedFeatures("vue-pwa-template", "empty", ["pinia"])
    expect(features).toEqual([])
  })

  it("should return default features for recommended preset", () => {
    expect(getRecommendedFeatureIds("vue-pwa-template")).toEqual(["tailwind"])
    expect(getRecommendedFeatureIds("astro-clean-template")).toEqual(["i18n"])
  })

  it("should include tailwind when in recommended vue-pwa-template features", () => {
    const features = computeSelectedFeatures(
      "vue-pwa-template",
      "recommended",
      getRecommendedFeatureIds("vue-pwa-template").filter((f) => f !== "tailwind")
    )
    expect(features).toContain("demo-pages")
    expect(features.filter((f) => f === "tailwind").length).toBe(0)
    const allRecommended = computeSelectedFeatures(
      "vue-pwa-template",
      "recommended",
      getRecommendedFeatureIds("vue-pwa-template")
    )
    expect(allRecommended).toContain("tailwind")
  })

  it("should not auto-add platforms for vue-lynx-template", () => {
    const features = computeSelectedFeatures("vue-lynx-template", "custom", [
      "pinia",
      "i18n",
      "tests"
    ])
    expect(features).not.toContain("platforms")
  })

  it("should not add platforms for vue-lynx-template in recommended mode", () => {
    const features = computeSelectedFeatures(
      "vue-lynx-template",
      "recommended",
      getRecommendedFeatureIds("vue-lynx-template")
    )
    expect(features).not.toContain("platforms")
  })

  it("should handle custom mode without demo-pages if logic requires", () => {
    const features = computeSelectedFeatures("vue-pwa-template", "custom", [])
    expect(features).toContain("demo-pages")
  })

  it("should throw for unknown template", () => {
    expect(() => getTemplate("unknown")).toThrow("Unknown template")
  })

  it("should return optional feature ids", () => {
    const ids = getTemplate("vue-pwa-template").features.map((f) => f.value)
    expect(ids).toContain("pinia")
    expect(ids).toContain("tailwind")
  })

  it("should list tailwind as optional for vue-modern-template", () => {
    const ids = getTemplate("vue-modern-template").features.map((f) => f.value)
    expect(ids).toContain("tailwind")
  })

  it("should order vue-modern optional features so tailwind patches run before i18n", () => {
    const features = computeSelectedFeatures("vue-modern-template", "custom", ["tailwind", "i18n"])
    expect(features).toEqual(["tailwind", "i18n", "demo-pages"])
  })

  it("should order vue-pwa optional features so tailwind patches run before i18n", () => {
    const features = computeSelectedFeatures("vue-pwa-template", "custom", ["tailwind", "i18n"])
    expect(features).toEqual(["tailwind", "i18n", "demo-pages"])
  })

  it("should list tailwind as optional for vue-lynx-template", () => {
    const ids = getTemplate("vue-lynx-template").features.map((f) => f.value)
    expect(ids).toContain("tailwind")
  })

  it("should order vue-lynx optional features so tailwind patches run before i18n", () => {
    const features = computeSelectedFeatures("vue-lynx-template", "custom", ["tailwind", "i18n"])
    expect(features).toEqual(["tailwind", "i18n", "demo-pages"])
  })

  it("should use demo-pages-flat for nuxt-modern flat architecture", () => {
    const features = computeSelectedFeatures("nuxt-modern-template", "custom", ["i18n"], "flat")
    expect(features).toEqual(["i18n", "demo-pages-flat"])
  })

  it("should use demo-pages-layered for nuxt-modern layered architecture", () => {
    const features = computeSelectedFeatures(
      "nuxt-modern-template",
      "recommended",
      getRecommendedFeatureIds("nuxt-modern-template"),
      "layered"
    )
    expect(features).toContain("demo-pages-layered")
    expect(features).not.toContain("demo-pages-flat")
  })

  it("should order nuxt-modern optional features so tailwind patches run before i18n", () => {
    const features = computeSelectedFeatures(
      "nuxt-modern-template",
      "custom",
      ["tailwind", "seo"],
      "flat"
    )
    expect(features).toEqual(["seo", "tailwind", "demo-pages-flat"])
  })

  it("should order nuxt-modern i18n after content for localePath patches", () => {
    const features = computeSelectedFeatures(
      "nuxt-modern-template",
      "custom",
      ["i18n", "content"],
      "flat"
    )
    expect(features).toEqual(["content", "i18n", "demo-pages-flat"])
  })
})
