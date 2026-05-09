import fs from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup } from "@/utils/cleanup"

vi.mock("node:fs")
vi.mock("@/utils/file", () => ({
  removeDir: vi.fn(),
  removeFile: vi.fn()
}))

describe("utils/cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fs.readdirSync).mockReturnValue([])
  })

  it("should remove common artifacts and recurse", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any)

    // Level 0: readdir finds .stack-gen
    // Level 1: readdir inside .stack-gen is empty (rmdirSync)
    // After recursion: Level 0 readdir again
    vi.mocked(fs.readdirSync)
      .mockReturnValueOnce([".stack-gen"] as any)
      .mockReturnValueOnce([] as any)
      .mockReturnValueOnce([] as any)

    cleanup("target")

    expect(fs.rmdirSync).toHaveBeenCalled()
  })

  it("should ignore missing files", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    cleanup("non-existent")
    expect(fs.rmdirSync).not.toHaveBeenCalled()
  })
})
