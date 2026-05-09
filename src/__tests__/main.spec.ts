import fs from "node:fs"
import { outro } from "@clack/prompts"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as core from "@/core"
import * as ui from "@/ui"
import { main } from "@/main"

vi.mock("node:fs")
vi.mock("@clack/prompts", () => ({
  outro: vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  note: vi.fn()
}))
vi.mock("@/core", () => ({
  generateProject: vi.fn().mockResolvedValue({ installFailed: false })
}))
vi.mock("@/ui", () => ({
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
    vi.mocked(ui.runPrompts).mockResolvedValue({
      templateName: "t",
      projectName: "p",
      buildMode: "recommended",
      features: [],
      install: false
    })
    vi.mocked(fs.existsSync).mockReturnValue(false)

    await expect(main()).rejects.toThrow("exit")

    expect(core.generateProject).toHaveBeenCalled()
    expect(ui.runPrompts).toHaveBeenCalled()
  })

  it("should exit if directory exists", async () => {
    vi.mocked(ui.runPrompts).mockResolvedValue({
      projectName: "exists"
    } as any)
    vi.mocked(fs.existsSync).mockReturnValue(true)

    await expect(main()).rejects.toThrow("exit")
    expect(outro).toHaveBeenCalledWith(expect.stringContaining("already exists"))
  })
})
