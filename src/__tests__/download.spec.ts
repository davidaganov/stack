import { execSync } from "node:child_process"
import fs from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { downloadTemplate } from "@/core/download"
import { copy } from "@/utils"

vi.mock("node:fs")
vi.mock("node:child_process", () => ({
  execSync: vi.fn()
}))
vi.mock("@/utils", () => ({
  copy: vi.fn()
}))

describe("core/download", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should clone and copy recommended template", async () => {
    vi.mocked(fs.mkdtempSync).mockReturnValue("tmpDir")
    vi.mocked(fs.existsSync).mockReturnValue(true)

    await downloadTemplate("url", "dest", "recommended")

    expect(execSync).toHaveBeenCalledWith(expect.stringContaining("git clone"), expect.any(Object))
    expect(copy).toHaveBeenCalledWith("tmpDir", "dest")
  })

  it("should throw if source missing", async () => {
    vi.mocked(fs.mkdtempSync).mockReturnValue("tmpDir")
    vi.mocked(fs.existsSync).mockReturnValue(false)

    await expect(downloadTemplate("url", "dest", "empty")).rejects.toThrow()
  })
})
