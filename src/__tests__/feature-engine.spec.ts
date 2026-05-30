import fs from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  applyFeaturePatches,
  applyFeatures,
  applyPackageJsonChanges,
  cleanupMarkers,
  clearFeaturePatchCache,
  copyFeatureFiles,
  findExistingPatchTarget,
  resolveFeatures,
  shouldCopyFeaturePath
} from "@/core/feature-engine"

vi.mock("@/config/templates", () => ({
  getTemplate: vi.fn(() => ({
    architectures: [{ value: "flat" }]
  })),
  orderResolvedFeatures: (_templateName: string, features: string[]) => features,
  computeSelectedFeatures: vi.fn(() => ["feat-1"]),
  getFeatureAliases: vi.fn(() => ({}))
}))

const NUXT_LAYERED_ALLOWLIST = [
  "app/__tests__/",
  "app/composables/",
  "app/utils/",
  "app/config/",
  "app/stores/",
  "app/components/OgImage/"
]

vi.mock("node:fs")

describe("core/feature-engine", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearFeaturePatchCache()
  })

  describe("resolveFeatures", () => {
    it("should resolve features with dependencies in topological order", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
        if (p.includes("feat-a")) return JSON.stringify({ requires: ["feat-b"] })
        if (p.includes("feat-b")) return JSON.stringify({ requires: [] })
        return "{}"
      })

      const resolved = resolveFeatures(["feat-a"], "featuresDir")
      expect(resolved).toEqual(["feat-b", "feat-a"])
    })

    it("should throw on circular dependencies", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
        if (p.includes("feat-a")) return JSON.stringify({ requires: ["feat-b"] })
        if (p.includes("feat-b")) return JSON.stringify({ requires: ["feat-a"] })
        return "{}"
      })

      expect(() => resolveFeatures(["feat-a"], "featuresDir")).toThrow("Circular dependency")
    })
  })

  describe("shouldCopyFeaturePath", () => {
    it("should skip layers paths for flat architecture", () => {
      expect(shouldCopyFeaturePath("layers/base/app/pages/index.vue", "flat")).toBe(false)
      expect(shouldCopyFeaturePath("app/pages/index.vue", "flat")).toBe(true)
    })

    it("should skip flat app UI paths for layered architecture", () => {
      expect(
        shouldCopyFeaturePath(
          "app/components/pages/home/HomeHero.vue",
          "layered",
          NUXT_LAYERED_ALLOWLIST
        )
      ).toBe(false)
      expect(
        shouldCopyFeaturePath("app/composables/useSiteHead.ts", "layered", NUXT_LAYERED_ALLOWLIST)
      ).toBe(true)
      expect(
        shouldCopyFeaturePath("layers/base/app/pages/index.vue", "layered", NUXT_LAYERED_ALLOWLIST)
      ).toBe(true)
    })
  })

  describe("copyFeatureFiles", () => {
    it("should copy src and extra files", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ copy: ["extra.txt"] }))
      vi.mocked(fs.readdirSync).mockReturnValue([])
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any)

      await copyFeatureFiles("feat", "featuresDir", "target")
      expect(fs.copyFileSync).toHaveBeenCalled()
    })
  })

  describe("applyFeaturePatches", () => {
    it("should apply patches correctly", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
        if (p.includes("patch.json"))
          return JSON.stringify({
            patches: [
              { file: "App.vue", action: "insert-after", marker: "<script>", content: "c1" },
              { file: "App.vue", action: "insert-before", marker: "</script>", content: "c2" },
              { file: "App.vue", action: "replace", marker: "OLD", content: "NEW" },
              { file: "App.vue", action: "replace-entire", content: "WHOLE" }
            ],
            remove: ["old-file.txt"]
          })
        if (p.includes("App.vue")) return "<script>\nOLD\n</script>"
        return "{}"
      })

      applyFeaturePatches("feat", "featuresDir", "target")
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("App.vue"),
        "WHOLE",
        "utf-8"
      )
      expect(fs.rmSync).toHaveBeenCalledWith(
        expect.stringContaining("old-file.txt"),
        expect.objectContaining({ recursive: true, force: true })
      )
    })

    it("should match html markers across line breaks", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((p: unknown) => {
        const path = String(p)
        if (path.includes("patch.json")) {
          return JSON.stringify({
            patches: [
              {
                file: "src/components/pages/home/HomeHero.vue",
                action: "replace-marker",
                marker: "<!-- @webstack:hero-badge -->Template v{{ appVersion }}",
                lines: ["{{ $t(\"home.badge\", { version: appVersion }) }}"]
              }
            ]
          })
        }
        return `<span>
      <!-- @webstack:hero-badge -->
      Template v{{ appVersion }}
    </span>`
      })

      applyFeaturePatches("i18n", "featuresDir", "target")

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("HomeHero.vue"),
        expect.stringContaining('{{ $t("home.badge", { version: appVersion }) }}'),
        "utf-8"
      )
    })
  })

  describe("applyPackageJsonChanges", () => {
    it("should merge deps and scripts", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
        if (p.includes("package.json")) return JSON.stringify({ dependencies: {} })
        return JSON.stringify({
          packageJson: { dependencies: ["lodash"], scripts: { start: "node index.js" } }
        })
      })

      applyPackageJsonChanges(["feat"], "featuresDir", "target")

      const saved = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string)
      expect(saved.dependencies.lodash).toBe("latest")
    })
  })

  describe("cleanupMarkers", () => {
    it("should remove various marker types", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any)
      vi.mocked(fs.readFileSync).mockReturnValue(
        "/* @webstack:c */ // @webstack:l <!-- @webstack:h -->\nKeep"
      )

      cleanupMarkers("target/App.vue")
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("Keep"),
        "utf-8"
      )
    })

    it("should recurse into directories", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.statSync)
        .mockReturnValueOnce({ isDirectory: () => true } as any)
        .mockReturnValueOnce({ isDirectory: () => false } as any)
      vi.mocked(fs.readdirSync).mockReturnValue(["file.ts"] as any)
      vi.mocked(fs.readFileSync).mockReturnValue("data")

      cleanupMarkers("target")
      expect(fs.readFileSync).toHaveBeenCalledTimes(1)
    })
  })

  describe("findExistingPatchTarget", () => {
    it("should not remap app/types/ in layered mode (avoids duplicate type patches)", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      expect(findExistingPatchTarget("app/types/index.ts", "target", "layered")).toBeNull()
    })

    it("should not remap app/layouts/ in layered mode (avoids duplicate layout patches)", () => {
      vi.mocked(fs.existsSync).mockImplementation((p: any) => {
        const s = String(p)
        if (s.endsWith("layers\\base\\app\\layouts\\default.vue")) return true
        return false
      })

      expect(findExistingPatchTarget("app/layouts/default.vue", "target", "layered")).toBeNull()
    })

    it("should not remap app/components/ in layered mode (use explicit layers/base paths)", () => {
      vi.mocked(fs.existsSync).mockImplementation((p: any) => {
        const s = String(p)
        if (s.endsWith("layers\\base\\app\\components\\pages\\home\\HomeHero.vue")) return true
        return false
      })

      expect(
        findExistingPatchTarget("app/components/pages/home/HomeHero.vue", "target", "layered")
      ).toBeNull()
      expect(
        findExistingPatchTarget(
          "layers/base/app/components/pages/home/HomeHero.vue",
          "target",
          "layered"
        )
      ).toContain("layers")
    })
  })

  describe("applyFeatures", () => {
    it("should run full pipeline", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue("{}")

      await applyFeatures(["f"], "fdir", "tdir", "vue-pwa-template")
      expect(fs.readFileSync).toHaveBeenCalled()
    })
  })
})
