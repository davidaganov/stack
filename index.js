#!/usr/bin/env node
import { generateProject } from "./src/generate-project.js"
import { runPrompts } from "./src/prompts.js"
import { outro, spinner, note } from "@clack/prompts"
import { cyan, green, dim, bold, yellow } from "kolorist"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Main execution flow
 */
const main = async () => {
  const ART = ["  █▀▀ █▀█ █▀▀ ▄▀█ ▀█▀ █▀▀", "  █▄▄ █▀▄ ██▄ █▀█  █  ██▄"]

  const banner = [
    "",
    ...ART.map((line) => cyan(bold(line))),
    "",
    dim("  Building your next web project"),
    ""
  ].join("\n")

  console.log(banner)

  const cwd = process.cwd()
  const answers = await runPrompts(cwd)

  const targetDir = path.join(cwd, answers.projectName)
  if (fs.existsSync(targetDir)) {
    outro(yellow(`Directory "${answers.projectName}" already exists.`))
    process.exit(1)
  }

  const s = spinner()
  s.start(`Generating project in ${cyan(answers.projectName)}...`)

  try {
    await generateProject({
      stackRoot: __dirname,
      templateName: answers.templateName,
      projectName: answers.projectName,
      targetDir,
      buildMode: answers.buildMode,
      optionalFeatures: answers.features,
      install: answers.install,
      quiet: true
    })
  } catch (err) {
    s.stop(yellow("Generation failed"))
    throw err
  }

  s.stop(green("Project finalized"))

  const nextSteps = `cd ${answers.projectName}${!answers.install ? "\nnpm install" : ""}\nnpm run dev`

  note(nextSteps, "Next steps")
  outro(green(bold("Success! Ready for coding.")))

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
