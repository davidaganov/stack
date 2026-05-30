import * as prompts from "@clack/prompts"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TEMPLATES } from "@/config/templates"
import { runPrompts } from "@/prompts"

vi.mock("@clack/prompts", () => ({
  isCancel: vi.fn(() => false),
  select: vi.fn(),
  text: vi.fn(),
  multiselect: vi.fn(),
  note: vi.fn(),
  outro: vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() }))
}))

describe("prompts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock data for TEMPLATES
    TEMPLATES["t"] = { label: "T", features: [{ value: "f1", label: "F1" }] } as any
  })

  it("should collect all answers correctly including custom features", async () => {
    vi.mocked(prompts.select)
      .mockResolvedValueOnce("t") // template
      .mockResolvedValueOnce("custom") // mode
      .mockResolvedValueOnce(true) // install
      .mockResolvedValueOnce("npm") // package manager

    vi.mocked(prompts.text).mockResolvedValueOnce("my-project")
    vi.mocked(prompts.multiselect).mockResolvedValueOnce(["f1"])

    const answers = await runPrompts("/cwd")

    expect(answers.features).toEqual(["f1"])
    expect(answers.projectName).toBe("my-project")
    expect(answers.packageManager).toBe("npm")
  })

  it("should validate project name", async () => {
    vi.mocked(prompts.select).mockResolvedValue("t")

    // Capture the validator function
    let validator: any
    vi.mocked(prompts.text).mockImplementation((options: any) => {
      validator = options.validate
      return Promise.resolve("valid-name")
    })

    await runPrompts("/cwd")

    expect(validator("")).toBe("Project name is required")
    expect(validator("invalid name!")).toBe("Invalid characters")
    expect(validator("valid-name")).toBeUndefined()
  })

  it("should handle cancellation", async () => {
    vi.mocked(prompts.select).mockResolvedValueOnce(Symbol("cancel"))
    vi.mocked(prompts.isCancel).mockReturnValue(true)

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit")
    })

    await expect(runPrompts("/cwd")).rejects.toThrow("exit")
    expect(exitSpy).toHaveBeenCalledWith(0)
  })
})
