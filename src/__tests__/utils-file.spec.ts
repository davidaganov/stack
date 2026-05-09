import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { copy, removeDir, removeFile, replaceFileContent } from "@/utils/file"

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

      // Mock second call for the file inside dir
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

  describe("removeDir", () => {
    it("should remove existing directory", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      removeDir("testDir")
      expect(fs.rmSync).toHaveBeenCalledWith("testDir", { recursive: true, force: true })
    })

    it("should not fail if directory missing", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      removeDir("missing")
      expect(fs.rmSync).not.toHaveBeenCalled()
    })
  })

  describe("removeFile", () => {
    it("should remove existing file", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      removeFile("test.txt")
      expect(fs.unlinkSync).toHaveBeenCalledWith("test.txt")
    })
  })

  describe("replaceFileContent", () => {
    it("should read, transform and write file", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue("hello")

      replaceFileContent("test.txt", (c) => c + " world")

      expect(fs.writeFileSync).toHaveBeenCalledWith("test.txt", "hello world", "utf-8")
    })

    it("should do nothing if file missing", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      replaceFileContent("missing", (c) => c)
      expect(fs.writeFileSync).not.toHaveBeenCalled()
    })
  })
})
