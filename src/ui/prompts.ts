import { isCancel, multiselect, select, text } from "@clack/prompts"
import { red } from "kolorist"
import { getRecommendedFeatureIds, TEMPLATES } from "@/config"
import { getDetectedPackageManager } from "@/utils"
import type { BuildMode, ProjectAnswers } from "@/types"

/**
 * Handle CLI cancellation
 */
const cancel = (): never => {
  console.log(red("Operation cancelled."))
  process.exit(0)
}

/**
 * Helper to ensure prompt is not cancelled and return narrowed type
 */
async function requiredPrompt<T>(promise: Promise<T | symbol>): Promise<T> {
  const result = await promise
  return !isCancel(result) ? result : cancel()
}

/**
 * Run interactive prompts to collect project configuration
 */
export const runPrompts = async (_cwd: string): Promise<ProjectAnswers> => {
  const templateName = await requiredPrompt<string>(
    select({
      message: "Select a template:",
      options: Object.entries(TEMPLATES).map(([value, template]) => ({
        value,
        label: template.label
      }))
    })
  )

  const defaultProjectName = templateName
  const projectName = await requiredPrompt<string>(
    text({
      message: "Project name:",
      placeholder: defaultProjectName,
      initialValue: defaultProjectName,
      validate(value) {
        if (!value) return "Project name is required"
        if (/[^a-z0-9._-]/i.test(value)) return "Invalid characters"
      }
    })
  )

  const buildMode = await requiredPrompt<BuildMode>(
    select({
      message: "Project mode:",
      options: [
        { value: "recommended", label: "recommended — full build with demo pages" },
        { value: "custom", label: "custom — select features manually" },
        { value: "empty", label: "empty — bare minimum (no features)" }
      ]
    })
  )

  let features: string[] = []

  if (buildMode === "recommended") {
    features = getRecommendedFeatureIds(templateName)
  } else if (buildMode === "custom") {
    const allFeatures = TEMPLATES[templateName].features
    const initialValues = allFeatures.filter((f) => f.default === true).map((f) => f.value)
    const selected = await requiredPrompt<string[]>(
      multiselect({
        message: "Select features (space to toggle, enter to confirm):",
        options: allFeatures.map((f) => ({ value: f.value, label: f.label })),
        initialValues,
        required: false
      })
    )
    features = selected
  }

  const install = await requiredPrompt<boolean>(
    select({
      message: "Install dependencies?",
      options: [
        { value: true, label: "yes" },
        { value: false, label: "no" }
      ],
      initialValue: true
    })
  )

  let packageManager: ProjectAnswers["packageManager"]
  if (install) {
    packageManager = await requiredPrompt<ProjectAnswers["packageManager"]>(
      select({
        message: "Select package manager:",
        options: [
          { value: "npm", label: "npm" },
          { value: "pnpm", label: "pnpm" },
          { value: "yarn", label: "yarn" },
          { value: "bun", label: "bun" }
        ],
        initialValue: getDetectedPackageManager()
      })
    )
  }

  return {
    templateName,
    projectName,
    buildMode,
    features,
    install,
    packageManager
  }
}
