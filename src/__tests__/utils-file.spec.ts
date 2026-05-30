import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { copy, copyDirSync } from "@/utils/file"

vi.mock("node:fs")

describe("utils/file", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("copy", () => {
    it("should copy file", async () => {
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any)
      await copy("src.txt", "dest.txt")
      expect(fs.copyFileSync).toHaveBeenCalledWith("src.txt", "dest.txt")
    })

    it("should recursively copy directory", async () => {
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)
      vi.mocked(fs.readdirSync).mockReturnValue(["file.txt"] as any)

      vi.mocked(fs.statSync)
        .mockReturnValueOnce({ isDirectory: () => true } as any)
        .mockReturnValueOnce({ isDirectory: () => false } as any)

      await copy("srcDir", "destDir")

      expect(fs.mkdirSync).toHaveBeenCalledWith("destDir", { recursive: true })
      expect(fs.copyFileSync).toHaveBeenCalledWith(
        path.join("srcDir", "file.txt"),
        path.join("destDir", "file.txt")
      )
    })

    it("should skip excluded directories", async () => {
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)
      await copy("node_modules", "dest")
      expect(fs.mkdirSync).not.toHaveBeenCalled()
    })
  })

  describe("copyDirSync", () => {
    it("should copy directory entries synchronously", () => {
      vi.mocked(fs.readdirSync).mockReturnValue(["file.txt"] as any)
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any)

      copyDirSync("srcDir", "destDir")

      expect(fs.mkdirSync).toHaveBeenCalledWith("destDir", { recursive: true })
      expect(fs.copyFileSync).toHaveBeenCalledWith(
        path.join("srcDir", "file.txt"),
        path.join("destDir", "file.txt")
      )
    })
  })
})
