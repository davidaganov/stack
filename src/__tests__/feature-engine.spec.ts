import fs from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  applyFeaturePatches,
  applyFeatures,
  applyPackageJsonChanges,
  cleanupMarkers,
  copyFeatureFiles,
  removeFeatureFiles,
  resolveFeatures
} from "@/core/feature-engine"

vi.mock("node:fs")

describe("core/feature-engine", () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
      expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining("old-file.txt"))
    })
  })

  describe("removeFeatureFiles", () => {
    it("should remove files listed in patch remove", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ remove: ["trash.txt"] }))

      removeFeatureFiles("feat", "featuresDir", "target")
      expect(fs.rmSync).toHaveBeenCalledWith(
        expect.stringContaining("trash.txt"),
        expect.any(Object)
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

  describe("applyFeatures", () => {
    it("should run full pipeline", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue("{}")

      await applyFeatures(["f"], "fdir", "tdir")
      expect(fs.readFileSync).toHaveBeenCalled()
    })
  })
})
