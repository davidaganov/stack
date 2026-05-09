import { describe, expect, it } from "vitest"
import {
  computeSelectedFeatures,
  getOptionalFeatureIds,
  getRecommendedFeatureIds,
  listTemplateIds
} from "@/config/templates"

describe("template-config", () => {
  it("should list available templates", () => {
    const ids = listTemplateIds()
    expect(ids).toBeInstanceOf(Array)
    expect(ids.length).toBeGreaterThan(0)
  })

  it("should compute features for empty build mode", () => {
    const features = computeSelectedFeatures("vue-pwa-template", "empty", ["pinia"])
    expect(features).toEqual([])
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

  it("should add platforms for vue-lynx-template if all requirements met", () => {
    const features = computeSelectedFeatures("vue-lynx-template", "custom", [
      "pinia",
      "i18n",
      "tests"
    ])
    expect(features).toContain("platforms")
  })

  it("should handle custom mode without demo-pages if logic requires", () => {
    const features = computeSelectedFeatures("vue-pwa-template", "custom", [])
    expect(features).toContain("demo-pages")
  })

  it("should throw for unknown template", () => {
    expect(() => getOptionalFeatureIds("unknown")).toThrow("Unknown template")
  })

  it("should return optional feature ids", () => {
    const ids = getOptionalFeatureIds("vue-pwa-template")
    expect(ids).toContain("pinia")
    expect(ids).toContain("tailwind")
  })

  it("should list tailwind as optional for vue-modern-template", () => {
    const ids = getOptionalFeatureIds("vue-modern-template")
    expect(ids).toContain("tailwind")
  })

  it("should order vue-modern optional features so tailwind is applied after other toggles", () => {
    const features = computeSelectedFeatures("vue-modern-template", "custom", ["tailwind", "i18n"])
    expect(features).toEqual(["i18n", "tailwind", "demo-pages"])
  })

  it("should order vue-pwa optional features so tailwind is applied after other toggles", () => {
    const features = computeSelectedFeatures("vue-pwa-template", "custom", ["tailwind", "i18n"])
    expect(features).toEqual(["i18n", "tailwind", "demo-pages"])
  })

  it("should list tailwind as optional for vue-lynx-template", () => {
    const ids = getOptionalFeatureIds("vue-lynx-template")
    expect(ids).toContain("tailwind")
  })

  it("should order vue-lynx optional features so tailwind is applied after other toggles", () => {
    const features = computeSelectedFeatures("vue-lynx-template", "custom", ["tailwind", "i18n"])
    expect(features).toEqual(["i18n", "tailwind", "demo-pages"])
  })
})
