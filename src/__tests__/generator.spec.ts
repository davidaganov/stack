import fs from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as resolver from "@/core/resolver"
import { generateProject } from "@/core/generator"

vi.mock("node:fs")
vi.mock("node:child_process")
vi.mock("node:util", () => ({
  promisify: (fn: any) => fn
}))

vi.mock("@/core/resolver", () => ({
  resolveTemplateSource: vi.fn(),
  DEFAULT_STACK_ROOT: "/root"
}))

vi.mock("@/core/feature-engine", () => ({
  applyFeaturePatches: vi.fn(),
  applyPackageJsonChanges: vi.fn(),
  cleanupMarkers: vi.fn(),
  copyFeatureFiles: vi.fn(),
  resolveFeatures: vi.fn(() => [])
}))

vi.mock("@/utils", () => ({
  cleanup: vi.fn(),
  copy: vi.fn(),
  updatePackageJson: vi.fn()
}))

vi.mock("@/config", () => ({
  computeSelectedFeatures: vi.fn(() => ["feat-1"]),
  TEMPLATES: { t: { label: "T", features: [] } },
  getOptionalFeatureIds: vi.fn(),
  getRecommendedFeatureIds: vi.fn(),
  listTemplateIds: vi.fn()
}))

describe("core/generator", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fs.existsSync).mockReturnValue(true)
  })

  describe("generateProject", () => {
    it("should run full generation flow and cleanup tmpDir", async () => {
      vi.mocked(resolver.resolveTemplateSource).mockResolvedValue({
        sourcePath: "/tmp-dir",
        tmpDir: "/tmp-dir"
      })

      await generateProject({
        templateName: "t",
        projectName: "p",
        targetDir: "/t",
        buildMode: "recommended",
        optionalFeatures: [],
        install: false,
        quiet: true
      } as any)

      expect(fs.rmSync).toHaveBeenCalledWith("/tmp-dir", expect.any(Object))
    })

    it("should throw if finalSourcePath is missing", async () => {
      vi.mocked(resolver.resolveTemplateSource).mockResolvedValue({
        sourcePath: "",
        tmpDir: null
      })

      await expect(
        generateProject({
          templateName: "t",
          projectName: "p",
          targetDir: "/t",
          buildMode: "recommended",
          optionalFeatures: [],
          install: false,
          quiet: true,
          sourcePath: null as any
        } as any)
      ).rejects.toThrow("Failed to resolve source path")
    })
  })
})
