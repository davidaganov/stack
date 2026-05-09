#!/usr/bin/env node
/**
 * Batch-generate template variants under `.stack-gen/` for local DX.
 *
 * See package.json: gen:all, gen:pwa, gen:lynx, gen:astro
 */
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import minimist from "minimist"
import { getRecommendedFeatureIds, listTemplateIds, TEMPLATES } from "../src/config/index.ts"
import { generateProject, resolveTemplateSource } from "../src/core/index.ts"
import { linkNodeModules } from "./lib/link-node-modules.mjs"
import { mergePackageJsonFiles } from "./lib/merge-package-json.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STACK_ROOT = path.resolve(__dirname, "..")
const OUT_ROOT = path.join(STACK_ROOT, ".stack-gen")

/**
 * @typedef {{ id: string, flags: string[], templates?: string[], buildMode: string, optionalFeatures: (t: string) => string[], blurb: string }} VariantDef
 */

/** @type {VariantDef[]} */
const VARIANTS = [
  {
    id: "empty",
    flags: ["empty"],
    buildMode: "empty",
    optionalFeatures: () => [],
    blurb: "Minimal runnable project without demo pages or optional modules."
  },
  {
    id: "full",
    flags: ["full"],
    buildMode: "recommended",
    optionalFeatures: (t) => getRecommendedFeatureIds(t),
    blurb: "Recommended preset with demo pages and common optional modules."
  },
  {
    id: "config-all",
    flags: ["config-all"],
    buildMode: "custom",
    optionalFeatures: (t) => getRecommendedFeatureIds(t),
    blurb: "Custom mode with every optional module enabled."
  },
  {
    id: "config-none",
    flags: ["config-none"],
    buildMode: "custom",
    optionalFeatures: () => [],
    blurb: "Custom mode with demo pages and no optional modules."
  },
  {
    id: "config-i18n",
    flags: ["config-i18n"],
    buildMode: "custom",
    optionalFeatures: () => ["i18n"],
    blurb: "Custom mode — i18n only."
  },
  {
    id: "config-pinia",
    flags: ["config-pinia"],
    templates: ["vue-pwa-template", "vue-lynx-template", "vue-modern-template"],
    buildMode: "custom",
    optionalFeatures: () => ["pinia"],
    blurb: "Custom mode — Pinia only (Vue templates)."
  },
  {
    id: "config-tests",
    flags: ["config-tests"],
    templates: ["vue-pwa-template", "vue-lynx-template", "vue-modern-template"],
    buildMode: "custom",
    optionalFeatures: () => ["tests"],
    blurb: "Custom mode — Vitest module only (Vue templates)."
  },
  {
    id: "config-tailwind",
    flags: ["config-tailwind"],
    templates: ["vue-modern-template", "vue-pwa-template", "vue-lynx-template"],
    buildMode: "custom",
    blurb: "Custom mode — Tailwind CSS only (Vue Modern / Vue PWA / Vue Lynx).",
    optionalFeatures: () => ["tailwind"]
  }
]

const variantAppliesToTemplate = (v, templateId) => {
  if (!v.templates) return true
  return v.templates.includes(templateId)
}

const scriptHintAll = "npm run gen:all"
const scriptHintPwa = "npm run gen:vue-pwa"
const scriptHintModern = "npm run gen:vue-modern"
const scriptHintLynx = "npm run gen:vue-lynx"
const scriptHintAstro = "npm run gen:astro"

const printHelpBrief = () => {
  console.log(`
Fixture generator — writes under ${OUT_ROOT}/

npm scripts (pass flags after -- so npm forwards them):
  ${scriptHintAll} [-- VARIANT FLAGS…]
  ${scriptHintPwa} [-- VARIANT FLAGS…]
  ${scriptHintModern} [-- VARIANT FLAGS…]
  ${scriptHintLynx} [-- VARIANT FLAGS…]
  ${scriptHintAstro} [-- VARIANT FLAGS…]

Help for each preset:
  ${scriptHintAll} -- --help
  ${scriptHintPwa} -- --help
  ${scriptHintModern} -- --help
  ${scriptHintLynx} -- --help
  ${scriptHintAstro} -- --help

Other:
  node scripts/generate-fixtures.mjs --list    template ids + variant ids

Always pass script-only flags after double hyphen, e.g.:
  ${scriptHintAll} -- --install
  ${scriptHintAstro} -- --full --install
`)
}

const printHelpAll = () => {
  console.log(`
${scriptHintAll} — generate EVERY catalog template × EVERY variant that applies

Output layout:
  ${OUT_ROOT}/<template-id>/<variant-id>/

Shared dependencies per template (not shared across templates):
  ${OUT_ROOT}/<template-id>/_deps/package.json   (merged deps from all generated variants)
  ${OUT_ROOT}/<template-id>/_deps/node_modules    → linked into each variant as node_modules

Flags:
  --install              Delete ONLY this run's template folder(s) _deps/, merge package.json, npm install once per template that ran.
                         Templates you did NOT run are untouched (e.g. after gen:all --install, later gen:astro --install only refreshes Astro _deps).

Variant filters (optional; default = all variants that apply to each template):
  --empty --full --config-all --config-none --config-i18n --config-pinia --config-tests --config-tailwind

Examples:
  ${scriptHintAll}
  ${scriptHintAll} -- --install
  ${scriptHintAll} -- --full --empty

Configurable templates are listed in src/templates.json
`)
}

const printHelpTemplate = (templateId) => {
  const meta = TEMPLATES[templateId]
  const mods = meta.features.map((f) => `  • ${f.value} — ${f.label}`).join("\n")
  const variants = VARIANTS.filter((v) => variantAppliesToTemplate(v, templateId))

  let npmCmd = scriptHintPwa
  if (templateId === "vue-modern-template") npmCmd = scriptHintModern
  if (templateId === "vue-lynx-template") npmCmd = scriptHintLynx
  if (templateId === "astro-clean-template") npmCmd = scriptHintAstro

  const variantLines = variants
    .map((v) => `  ${v.flags.map((f) => `--${f}`).join(", ")}\n      folder: ${v.id}/ — ${v.blurb}`)
    .join("\n")

  console.log(`
${npmCmd} — fixtures for ${templateId}

Title: ${meta.label}

Optional modules (for prompts / full preset):
${mods}

Output:
  ${OUT_ROOT}/${templateId}/<variant>/

Shared deps for THIS template only:
  ${OUT_ROOT}/${templateId}/_deps/

Flags:
  --install              Recreate ${templateId}/_deps and npm install (other templates under .stack-gen/ unchanged).

Variants (default: generate all listed below):
${variantLines}

Examples:
  ${npmCmd}
  ${npmCmd} -- --full --empty
  ${npmCmd} -- --install
`)
}

const wipeVariantDirs = (templateRoot, variantIds, reinstallDeps) => {
  const depsDir = path.join(templateRoot, "_deps")
  if (reinstallDeps && fs.existsSync(depsDir)) {
    fs.rmSync(depsDir, { recursive: true, force: true })
  }

  for (const id of variantIds) {
    const p = path.join(templateRoot, id)
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true })
    }
  }
}

const ensureSharedDeps = (templateRoot, variantDirs, reinstallDeps) => {
  const depsDir = path.join(templateRoot, "_deps")
  const pkgPaths = variantDirs
    .map((d) => path.join(d, "package.json"))
    .filter((p) => fs.existsSync(p))

  if (pkgPaths.length === 0) return

  const merged = mergePackageJsonFiles(pkgPaths)
  fs.mkdirSync(depsDir, { recursive: true })
  fs.writeFileSync(
    path.join(depsDir, "package.json"),
    JSON.stringify(merged, null, 2) + "\n",
    "utf-8"
  )

  const nm = path.join(depsDir, "node_modules")
  if (reinstallDeps || !fs.existsSync(nm)) {
    console.log(`npm install (shared) → ${depsDir}`)
    execSync("npm install", { cwd: depsDir, stdio: "inherit", shell: true })
  }

  for (const dir of variantDirs) {
    linkNodeModules(dir, depsDir)
  }
}

const runTemplateBatch = async ({ templateId, variants, installShared }) => {
  const templateRoot = path.join(OUT_ROOT, templateId)
  const variantIds = variants.map((v) => v.id)

  wipeVariantDirs(templateRoot, variantIds, installShared)

  const { sourcePath, tmpDir } = await resolveTemplateSource(templateId, { stackRoot: STACK_ROOT })
  try {
    const variantDirs = []

    for (const v of variants) {
      const targetDir = path.join(templateRoot, v.id)
      console.log(`generate ${templateId}/${v.id} (${v.buildMode})`)

      await generateProject({
        stackRoot: STACK_ROOT,
        templateName: templateId,
        projectName: `${templateId}-${v.id}`,
        targetDir,
        buildMode: v.buildMode,
        optionalFeatures: v.optionalFeatures(templateId),
        install: false,
        quiet: true,
        sourcePath
      })

      variantDirs.push(targetDir)
    }

    ensureSharedDeps(templateRoot, variantDirs, installShared)
  } finally {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  }
}

const pickVariantsFromArgv = (argv) => {
  const requested = new Set()
  for (const v of VARIANTS) {
    const hit = v.flags.some((f) => argv[f] === true)
    if (hit) requested.add(v.id)
  }
  if (requested.size === 0) return VARIANTS
  return VARIANTS.filter((v) => requested.has(v.id))
}

const main = async () => {
  const argv = minimist(process.argv.slice(2), {
    boolean: [
      "all",
      "install",
      "empty",
      "full",
      "config-all",
      "config-none",
      "config-i18n",
      "config-pinia",
      "config-tests",
      "config-tailwind",
      "help",
      "list"
    ],
    string: ["template", "t"],
    alias: { t: "template", h: "help" }
  })

  if (argv.help) {
    if (argv.all) {
      printHelpAll()
      process.exit(0)
    }
    const tid = argv.template || argv.t
    if (tid) {
      if (!listTemplateIds().includes(tid)) {
        console.error(`Unknown template: ${tid}`)
        process.exit(1)
      }
      printHelpTemplate(tid)
      process.exit(0)
    }
    printHelpBrief()
    process.exit(0)
  }

  if (argv.list) {
    console.log("Templates:", listTemplateIds().join(", "))
    console.log("Variants:", VARIANTS.map((v) => `${v.id} (${v.flags.join(", ")})`).join("\n"))
    process.exit(0)
  }

  const installShared = argv.install === true
  const variantFilter = pickVariantsFromArgv(argv)

  let templates = []
  if (argv.all) {
    templates = listTemplateIds()
  } else if (argv.template || argv.t) {
    templates = [argv.template || argv.t]
    if (!listTemplateIds().includes(templates[0])) {
      console.error(`Unknown template: ${templates[0]}`)
      process.exit(1)
    }
  } else {
    printHelpBrief()
    process.exit(2)
  }

  fs.mkdirSync(OUT_ROOT, { recursive: true })

  for (const templateId of templates) {
    const variants = variantFilter.filter((v) => variantAppliesToTemplate(v, templateId))
    if (variants.length === 0) {
      console.warn(`No variants apply to ${templateId}; skipping.`)
      continue
    }
    await runTemplateBatch({
      templateId,
      variants,
      installShared
    })
  }

  console.log(`\nDone. Output: ${OUT_ROOT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
