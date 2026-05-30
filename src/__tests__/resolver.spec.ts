import fs from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { resolveTemplateSource } from "@/core/resolver"

vi.mock("@/config/templates", () => ({
  TEMPLATES: {}
}))

vi.mock("node:child_process", () => ({
  exec: vi.fn().mockResolvedValue({ stdout: "" })
}))

vi.mock("node:util", () => ({
  promisify: (fn: any) => fn
}))

vi.mock("node:fs")

describe("core/resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should use local sibling if exists", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    const res = await resolveTemplateSource("t", { stackRoot: "/root" })
    expect(res.sourcePath).toContain("t")
    expect(res.tmpDir).toBeNull()
  })

  it("should clone from git if local missing", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    vi.mocked(fs.mkdtempSync).mockReturnValue("/tmp")
    const res = await resolveTemplateSource("t", { stackRoot: "/root" })
    expect(res.tmpDir).toBe("/tmp")
  })
})
