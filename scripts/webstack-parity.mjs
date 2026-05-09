#!/usr/bin/env node
/**
 * Compare two directories (e.g. repository reference tree vs CLI-generated project).
 *
 * Usage:
 *   node scripts/webstack-parity.mjs --baseline <dir> --generated <dir>
 *
 * Options:
 *   --baseline, -b    Reference directory (e.g. template repo root or exported golden tree)
 *   --generated, -g   Directory produced by `npx stack` or a manual merge
 *   --subset, -s      Optional comma-separated path prefixes to limit comparison (e.g. "src")
 *   --ignore          Extra comma-separated relative path globs (merged with defaults)
 *
 * Exits with code 1 if file lists or normalized contents differ (after ignoring paths).
 */
import fs from "node:fs"
import path from "node:path"
import minimist from "minimist"

const DEFAULT_IGNORE = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  ".tmp-cws-",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  ".eslintcache"
])

const shouldIgnore = (rel, ignoreNames, ignorePrefixes) => {
  const parts = rel.split(/[/\\]/).filter(Boolean)

  for (const p of parts) {
    if (ignoreNames.has(p)) return true
  }
  for (const prefix of ignorePrefixes) {
    if (rel === prefix || rel.startsWith(prefix + path.sep)) return true
  }

  return false
}

const walk = (dir, base, ignoreNames, ignorePrefixes, out) => {
  if (!fs.existsSync(dir)) return
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name)
    const rel = path.relative(base, abs).split(path.sep).join("/")
    if (shouldIgnore(rel, ignoreNames, ignorePrefixes)) continue
    const st = fs.statSync(abs)
    if (st.isDirectory()) walk(abs, base, ignoreNames, ignorePrefixes, out)
    else out.push(rel)
  }
}

const normalizeText = (buf) => {
  let s = buf.toString("utf8")
  s = s.replace(/\r\n/g, "\n").trimEnd() + "\n"
  return s
}

const compareOne = (baseA, baseB, rel) => {
  const a = path.join(baseA, rel)
  const b = path.join(baseB, rel)
  const ba = fs.readFileSync(a)
  const bb = fs.readFileSync(b)

  if (ba.equals(bb)) return null
  if (/\.(vue|ts|js|mjs|astro|json|css|html|md)$/i.test(rel)) {
    if (normalizeText(ba) === normalizeText(bb)) return null
  }

  return rel
}

const main = () => {
  const argv = minimist(process.argv.slice(2), {
    string: ["baseline", "generated", "subset", "ignore"],
    alias: { b: "baseline", g: "generated", s: "subset" }
  })

  const baseline = argv.baseline || argv.b
  const generated = argv.generated || argv.g

  if (!baseline || !generated) {
    console.error(
      "Usage: node scripts/webstack-parity.mjs --baseline <dir> --generated <dir> [--subset src] [--ignore a,b]"
    )
    process.exit(2)
  }

  const absBase = path.resolve(baseline)
  const absGen = path.resolve(generated)

  const ignoreNames = new Set(DEFAULT_IGNORE)
  const extra = (argv.ignore || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  for (const e of extra) ignoreNames.add(e)

  const subsets = (argv.subset || argv.s || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\\/g, "/"))

  const ignorePrefixes = []

  const filesBase = []
  walk(absBase, absBase, ignoreNames, ignorePrefixes, filesBase)

  const filesGen = []
  walk(absGen, absGen, ignoreNames, ignorePrefixes, filesGen)

  const filterSubset = (list) => {
    if (subsets.length === 0) return list
    return list.filter((rel) => subsets.some((pre) => rel === pre || rel.startsWith(pre + "/")))
  }

  const setBase = new Set(filterSubset(filesBase))
  const setGen = new Set(filterSubset(filesGen))

  const onlyBase = [...setBase].filter((f) => !setGen.has(f)).sort()
  const onlyGen = [...setGen].filter((f) => !setBase.has(f)).sort()
  const common = [...setBase].filter((f) => setGen.has(f)).sort()

  const contentDiffs = []
  for (const rel of common) {
    const d = compareOne(absBase, absGen, rel)
    if (d) contentDiffs.push(d)
  }

  let ok = true

  if (onlyBase.length) {
    ok = false
    console.error("Only in baseline:\n  " + onlyBase.join("\n  "))
  }
  if (onlyGen.length) {
    ok = false
    console.error("Only in generated:\n  " + onlyGen.join("\n  "))
  }
  if (contentDiffs.length) {
    ok = false
    console.error("Content differs:\n  " + contentDiffs.join("\n  "))
  }

  if (ok) {
    console.log(
      `Parity OK: ${common.length} file(s) compared (${path.relative(process.cwd(), absBase)} vs ${path.relative(process.cwd(), absGen)})`
    )
    process.exit(0)
  }

  process.exit(1)
}

main()
