import { removeI18n } from "./i18n.js"
import { removePinia } from "./pinia.js"
import { removeRouter } from "./router.js"
import { removeTests } from "./tests.js"

const TRANSFORMS = {
  router: removeRouter,
  pinia: removePinia,
  i18n: removeI18n,
  tests: removeTests
}

/**
 * Run removal transforms for disabled features
 */
export const applyTransforms = async (targetDir, templateName, features) => {
  for (const [feature, enabled] of Object.entries(features)) {
    if (!enabled && TRANSFORMS[feature]) {
      await TRANSFORMS[feature](targetDir, templateName)
    }
  }
}
