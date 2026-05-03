import { isCancel, multiselect, select, text } from "@clack/prompts"
import { red } from "kolorist"

import { TEMPLATES, getRecommendedFeatureIds } from "./template-config.js"

/**
 * Handle CLI cancellation
 */
const cancel = () => {
  console.log(red("Operation cancelled."))
  process.exit(0)
}

/**
 * Run interactive prompts to collect project configuration
 */
export const runPrompts = async (_cwd) => {
  const templateName = await select({
    message: "Select a template:",
    options: Object.entries(TEMPLATES).map(([value, { label }]) => ({
      value,
      label
    }))
  })

  if (isCancel(templateName)) cancel()

  const defaultProjectName = templateName
  const projectName = await text({
    message: "Project name:",
    placeholder: defaultProjectName,
    initialValue: defaultProjectName,
    validate(value) {
      if (!value) return "Project name is required"
      if (/[^a-z0-9._-]/i.test(value)) return "Invalid characters"
    }
  })

  if (isCancel(projectName)) cancel()

  const buildMode = await select({
    message: "Project mode:",
    options: [
      { value: "recommended", label: "recommended — full build with demo pages" },
      { value: "custom", label: "custom — select features manually" },
      { value: "empty", label: "empty — bare minimum (no features)" }
    ]
  })

  if (isCancel(buildMode)) cancel()

  let features = []

  if (buildMode === "recommended") {
    features = getRecommendedFeatureIds(templateName)
  } else if (buildMode === "custom") {
    const allFeatures = TEMPLATES[templateName].features
    const selected = await multiselect({
      message: "Select features (space to toggle, enter to confirm):",
      options: allFeatures.map((f) => ({ value: f.value, label: f.label })),
      initialValues: [],
      required: false
    })

    if (isCancel(selected)) cancel()
    features = selected || []
  }

  const install = await select({
    message: "Install dependencies?",
    options: [
      { value: true, label: "yes" },
      { value: false, label: "no" }
    ],
    initialValue: true
  })

  if (isCancel(install)) cancel()

  return {
    templateName,
    projectName,
    buildMode,
    features,
    install
  }
}
