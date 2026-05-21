import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { note, outro, spinner } from "@clack/prompts"
import { bold, cyan, dim, green, yellow } from "kolorist"
import { generateProject } from "@/core"
import { TEMPLATES } from "@/config"
import { getDetectedPackageManager } from "@/utils"
import { runPrompts } from "@/ui"
import type { ProjectAnswers } from "@/types"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const stackRoot = path.resolve(__dirname, "..")

/**
 * Main execution flow
 */
export const main = async (): Promise<void> => {
  const ART = ["█▀▀ ▀█▀ ▄▀█ █▀▀ █▄▀", "▄▄█  █  █▀█ █▄▄ █ █"]

  const banner = [
    "",
    ...ART.map((line) => cyan(bold(line))),
    "",
    dim("  Building your next web project"),
    ""
  ].join("\n")

  console.log(banner)

  const cwd = process.cwd()
  const answers: ProjectAnswers = await runPrompts(cwd)

  const targetDir = path.join(cwd, answers.projectName)
  if (fs.existsSync(targetDir)) {
    outro(yellow(`Directory "${answers.projectName}" already exists.`))
    process.exit(1)
  }

  const s = spinner()
  s.start(`Generating project in ${cyan(answers.projectName)}...`)

  let installFailed = false
  try {
    const result = await generateProject({
      stackRoot,
      templateName: answers.templateName,
      projectName: answers.projectName,
      targetDir,
      buildMode: answers.buildMode,
      optionalFeatures: answers.features,
      install: answers.install,
      packageManager: answers.packageManager,
      quiet: true
    })
    installFailed = result.installFailed || false
  } catch (err) {
    s.stop(yellow("Generation failed"))
    throw err
  }

  const pm = answers.packageManager || getDetectedPackageManager()

  if (installFailed) {
    s.stop(
      yellow(
        `${pm} is not installed.\n   Project generated, but dependencies must be installed manually.`
      )
    )
  } else {
    s.stop(green("Project finalized"))
  }

  const needInstall = !answers.install || installFailed
  const nextSteps = `cd ${answers.projectName}${needInstall ? `\n${pm} install` : ""}\n${pm} run dev`
  note(nextSteps, "Next steps")

  const templateDocs = TEMPLATES[answers.templateName]?.docsUrl
  const docsLines = [
    templateDocs ? `Template guide: ${templateDocs}` : undefined,
    "Stack & starters: https://aganov.dev/en/docs/about/projects/stack",
    "Resume: https://aganov.dev/en/resume"
  ].filter((line): line is string => Boolean(line))
  note(docsLines.join("\n"), "Documentation")

  outro(green(bold("Success! Ready for coding.")))

  process.exit(0)
}

if (process.env.NODE_ENV !== "test") {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
