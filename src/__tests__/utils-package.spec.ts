import fs from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { updatePackageJson } from "@/utils/package"

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
})
