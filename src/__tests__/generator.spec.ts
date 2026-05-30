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
  applyFeatures: vi.fn()
}))

vi.mock("@/utils/file", () => ({
  copy: vi.fn()
}))

vi.mock("@/utils/package", () => ({
  updatePackageJson: vi.fn()
}))

vi.mock("@/config/templates", () => ({
  getTemplate: vi.fn(() => ({
    architectures: [{ value: "flat" }]
  })),
  computeSelectedFeatures: vi.fn(() => ["feat-1"]),
  getFeatureAliases: vi.fn(() => ({}))
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
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any)

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

    it("should throw if source path is missing", async () => {
      vi.mocked(resolver.resolveTemplateSource).mockResolvedValue({
        sourcePath: "",
        tmpDir: null
      })
      vi.mocked(fs.existsSync).mockReturnValue(false)

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
