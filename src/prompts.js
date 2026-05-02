import { isCancel, multiselect, select, text } from "@clack/prompts"
import { red } from "kolorist"

const TEMPLATES = {
  "vue-pwa-template": {
    label: "Vue PWA Template",
    features: [
      { value: "pinia", label: "Pinia" },
      { value: "i18n", label: "i18n (vue-i18n + polyglot-keeper)" },
      { value: "tests", label: "Unit Tests (vitest)" }
    ]
  },
  "vue-lynx-template": {
    label: "Vue Lynx Template",
    features: [
      { value: "router", label: "Vue Router" },
      { value: "pinia", label: "Pinia" },
      { value: "i18n", label: "i18n (custom + polyglot-keeper)" },
      { value: "tests", label: "Unit Tests (vitest)" }
    ]
  },
  "astro-clean-template": {
    label: "Astro Clean Template",
    features: [{ value: "i18n", label: "i18n (@mannisto/astro-i18n)" }]
  }
}

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

  const scaffold = await select({
    message: "Scaffold mode:",
    options: [
      { value: "recommended", label: "recommended — full scaffold with demo pages" },
      { value: "custom", label: "custom — select features manually" },
      { value: "empty", label: "empty — bare minimum (no features)" }
    ]
  })

  if (isCancel(scaffold)) cancel()

  let features = []

  if (scaffold === "recommended") {
    features = TEMPLATES[templateName].features.map((f) => f.value)
  } else if (scaffold === "custom") {
    const allFeatures = TEMPLATES[templateName].features
    const selected = await multiselect({
      message: "Select features (space to toggle, enter to confirm):",
      options: allFeatures.map((f) => ({ value: f.value, label: f.label })),
      initialValues: allFeatures.map((f) => f.value),
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
    scaffold,
    features,
    install
  }
}
