#!/usr/bin/env node
/**
 * Batch-generate template variants under `.stack-gen/` for local DX.
 *
 * See package.json: gen:all, gen:vue-pwa, gen:vue-modern, gen:vue-lynx, gen:astro, gen:nuxt-modern
 */
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import minimist from "minimist"
import {
  expandVariantsForTemplate,
  FIXTURE_VARIANTS,
  getFixtureVariantFlags,
  variantAppliesToTemplate
} from "../src/config/fixtures.ts"
import { getTemplate, TEMPLATES } from "../src/config/templates.ts"
import { generateProject } from "../src/core/generator.ts"
import { resolveTemplateSource } from "../src/core/resolver.ts"
import { linkNodeModules } from "./lib/link-node-modules.mjs"
import { mergePackageJsonFiles } from "./lib/merge-package-json.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STACK_ROOT = path.resolve(__dirname, "..")
const OUT_ROOT = path.join(STACK_ROOT, ".stack-gen")

const scriptHintAll = "npm run gen:all"

const printStackHelp = () => {
  console.log(`
  @davidaganov/stack
  ==================

  USAGE
    npx @davidaganov/stack       # CLI (remote)
    stack                        # CLI (local link)

  GENERATION (.stack-gen/)
    npm run gen:all              # all templates × all variants
    npm run gen:vue-pwa          # gen:vue-modern | gen:vue-lynx | gen:astro | gen:nuxt-modern
    --install                    # wipe that template's _deps/, merge pkg, npm install once
    --help                       # variant flags & paths for this preset

    npm run gen:all -- --install
    npm run gen:astro -- --full --empty
    npm run gen:vue-pwa -- --config-i18n --install
    npm run gen:vue-lynx -- --help

    node scripts/generate-fixtures.mjs --list

  MAINTENANCE
    src/config/templates.json    # catalog
    https://github.com/davidaganov/stack/blob/main/GUIDLINE.md
`)
}

const printHelpBrief = () => {
  printStackHelp()
  console.log(`
Fixture generator — writes under ${OUT_ROOT}/

npm scripts (pass flags after -- so npm forwards them):
  ${scriptHintAll} [-- VARIANT FLAGS…]
  npm run gen:vue-pwa [-- VARIANT FLAGS…]
  npm run gen:vue-modern [-- VARIANT FLAGS…]
  npm run gen:vue-lynx [-- VARIANT FLAGS…]
  npm run gen:astro [-- VARIANT FLAGS…]
  npm run gen:nuxt-modern [-- VARIANT FLAGS…]
  Multi-arch templates: config-flat-<feature>, config-layered-<feature>, full-flat, full-layered, …

Help for each preset:
  ${scriptHintAll} -- --help
  npm run gen:vue-pwa -- --help

Other:
  node scripts/generate-fixtures.mjs --list    template ids + variant ids

Always pass script-only flags after double hyphen, e.g.:
  ${scriptHintAll} -- --install
  npm run gen:astro -- --full --install
`)
}

const printHelpAll = () => {
  const variantFlags = FIXTURE_VARIANTS.flatMap((v) => v.flags.map((f) => `--${f}`)).join(" ")

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
  ${variantFlags}

Examples:
  ${scriptHintAll}
  ${scriptHintAll} -- --install
  ${scriptHintAll} -- --full --empty

Configurable templates are listed in src/config/templates.json
`)
}

const printHelpTemplate = (templateId) => {
  const meta = TEMPLATES[templateId]
  const mods = meta.features.map((f) => `  • ${f.value} — ${f.label}`).join("\n")
  const variants = FIXTURE_VARIANTS.filter((v) => variantAppliesToTemplate(v, templateId))
  const npmCmd =
    getTemplate(templateId).genScript ??
    `node scripts/generate-fixtures.mjs --template ${templateId}`

  const variantLines = variants
    .flatMap((v) => {
      const expanded = expandVariantsForTemplate([v], templateId)
      return expanded.map(
        (ev) => `  ${v.flags.map((f) => `--${f}`).join(", ")}\n      folder: ${ev.id}/ — ${v.blurb}`
      )
    })
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
        architecture: v.architecture,
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
  for (const v of FIXTURE_VARIANTS) {
    const hit = v.flags.some((f) => argv[f] === true)
    if (hit) requested.add(v.id)
  }
  if (requested.size === 0) return FIXTURE_VARIANTS
  return FIXTURE_VARIANTS.filter((v) => requested.has(v.id))
}

const main = async () => {
  const argv = minimist(process.argv.slice(2), {
    boolean: ["all", "install", "help", "list", "stack-help", ...getFixtureVariantFlags()],
    string: ["template", "t"],
    alias: { t: "template", h: "help" }
  })

  if (argv["stack-help"]) {
    printStackHelp()
    process.exit(0)
  }

  if (argv.help) {
    if (argv.all) {
      printHelpAll()
      process.exit(0)
    }
    const tid = argv.template || argv.t
    if (tid) {
      if (!Object.keys(TEMPLATES).includes(tid)) {
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
    console.log("Templates:", Object.keys(TEMPLATES).join(", "))
    console.log(
      "Base variants:",
      FIXTURE_VARIANTS.map((v) => `${v.id} (${v.flags.join(", ")})`).join("\n")
    )
    for (const templateId of Object.keys(TEMPLATES)) {
      const architectures = TEMPLATES[templateId]?.architectures
      if (architectures?.length > 1) {
        const ids = expandVariantsForTemplate(FIXTURE_VARIANTS, templateId).map((v) => v.id)
        console.log(`${templateId} fixture folders:`, ids.join(", "))
      }
    }
    process.exit(0)
  }

  const installShared = argv.install === true
  const variantFilter = pickVariantsFromArgv(argv)

  let templates = []
  if (argv.all) {
    templates = Object.keys(TEMPLATES)
  } else if (argv.template || argv.t) {
    templates = [argv.template || argv.t]
    if (!Object.keys(TEMPLATES).includes(templates[0])) {
      console.error(`Unknown template: ${templates[0]}`)
      process.exit(1)
    }
  } else {
    printHelpBrief()
    process.exit(2)
  }

  fs.mkdirSync(OUT_ROOT, { recursive: true })

  for (const templateId of templates) {
    const variants = expandVariantsForTemplate(
      variantFilter.filter((v) => variantAppliesToTemplate(v, templateId)),
      templateId
    )
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
