import fs from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { removePackageDependencies, removePackageScripts, updatePackageJson } from "@/utils/package"

vi.mock("node:fs")

describe("utils/package", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("updatePackageJson", () => {
    it("should reset package.json fields", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          name: "old",
          version: "1.0.0",
          repository: "some-url"
        })
      )

      await updatePackageJson("testDir", "new-project")

      const call = vi.mocked(fs.writeFileSync).mock.calls[0]
      const savedPkg = JSON.parse(call[1] as string)

      expect(savedPkg.name).toBe("new-project")
      expect(savedPkg.version).toBe("0.0.1")
      expect(savedPkg.repository).toBeUndefined()
    })
  })

  describe("removePackageDependencies", () => {
    it("should delete specified dependencies", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          dependencies: { a: "1", b: "2" },
          devDependencies: { c: "3" }
        })
      )

      removePackageDependencies("pkg.json", ["a", "c"])

      const savedPkg = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string)
      expect(savedPkg.dependencies).toEqual({ b: "2" })
      expect(savedPkg.devDependencies).toEqual({})
    })
  })

  describe("removePackageScripts", () => {
    it("should delete specified scripts", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          scripts: { test: "vitest", dev: "tsx index.ts" }
        })
      )

      removePackageScripts("pkg.json", ["test"])

      const savedPkg = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string)
      expect(savedPkg.scripts).toEqual({ dev: "tsx index.ts" })
    })
  })
})
