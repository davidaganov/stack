import fs from "node:fs"
import { outro } from "@clack/prompts"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as generator from "@/core/generator"
import * as prompts from "@/prompts"
import { main } from "@/main"

vi.mock("node:fs")
vi.mock("@/config/templates", () => ({
  TEMPLATES: { t: { label: "T", docsUrl: "https://example.com" } }
}))
vi.mock("@clack/prompts", () => ({
  outro: vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  note: vi.fn()
}))
vi.mock("@/core/generator", () => ({
  generateProject: vi.fn().mockResolvedValue({ installFailed: false })
}))
vi.mock("@/prompts", () => ({
  runPrompts: vi.fn()
}))

describe("main", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit")
    })
  })

  it("should run main flow successfully", async () => {
    vi.mocked(prompts.runPrompts).mockResolvedValue({
      templateName: "t",
      projectName: "p",
      buildMode: "recommended",
      features: [],
      install: false
    })
    vi.mocked(fs.existsSync).mockReturnValue(false)

    await expect(main()).rejects.toThrow("exit")

    expect(generator.generateProject).toHaveBeenCalled()
    expect(prompts.runPrompts).toHaveBeenCalled()
  })

  it("should exit if directory exists", async () => {
    vi.mocked(prompts.runPrompts).mockResolvedValue({
      projectName: "exists"
    } as any)
    vi.mocked(fs.existsSync).mockReturnValue(true)

    await expect(main()).rejects.toThrow("exit")
    expect(outro).toHaveBeenCalledWith(expect.stringContaining("already exists"))
  })
})
