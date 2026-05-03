# WebStack template maintenance guide

How `@davidaganov/stack` assembles projects from template repos, how to keep `.webstack` aligned with expectations, and how to extend or safely change templates.

This file lives in **[davidaganov/stack](https://github.com/davidaganov/stack)** on branch `main`. Each starter is its **own** GitHub repository:

- [vue-pwa-template](https://github.com/davidaganov/vue-pwa-template)
- [vue-lynx-template](https://github.com/davidaganov/vue-lynx-template)
- [astro-clean-template](https://github.com/davidaganov/astro-clean-template)

By default `npx @davidaganov/stack` clones `https://github.com/davidaganov/<templateName>` (see `resolveTemplateSource` in this repo). Local development often uses sibling folders next to the cloned `stack` repo with **matching directory names** (`vue-pwa-template`, etc.).

## Why `.webstack` exists

Templates are **one Git repo per stack** (`vue-pwa-template`, `vue-lynx-template`, `astro-clean-template`). The `.webstack` directory splits that repo into:

| Layer | Role |
|--------|------|
| `template-empty/` | Minimal runnable core: no optional modules (no Pinia, no i18n in `package.json`, no imports of optional deps). |
| `features/<name>/` | Optional capabilities: merge `src/`, `copy` paths from `patch.json`, apply `patches`, merge `packageJson`. |
| `features/demo-pages/` | Baseline slice for non-empty modes: routes/pages/components when optional modules are off. |

`.webstack` keeps **one source repo** and explicit layering instead of duplicating presets across repos.

## How the CLI builds a project

Implementation: `src/generate-project.js` and `src/feature-engine.js`.

1. Resolve template source (local sibling `../<templateName>` in dev, or shallow clone from `https://github.com/davidaganov/<templateName>`).
2. Copy `.webstack/template-empty` into the target directory.
3. `resolveFeatures(selected)` — topological order using `requires` in each feature `patch.json`.
4. **Phase A — copy:** for each feature in order: `copyFeatureFiles` merges `features/<name>/src/` into project `src/`, then applies explicit `copy` list from `patch.json`.
5. **Phase B — patch:** for each feature: `applyFeaturePatches` (plus `remove` list).
6. `applyPackageJsonChanges` merges dependency/script snippets from all features.
7. `cleanupMarkers` strips `@webstack` markers from allowed extensions.
8. If `tests` was not selected: remove `src/__tests__` and `vitest.config.ts`.

Root **`src/`** (outside `.webstack`) is the day-to-day authoring reference (“full product”). Generated output should match **behavior** when all wizard options are on; byte-identical parity with root `src/` is optional unless you maintain a golden export.

## Sources of truth and drift

| Role | Location |
|------|-----------|
| What users edit most | Repo root `src/`, root configs |
| What the CLI actually applies | `.webstack/template-empty` + `.webstack/features/*` |

After UI or route changes, update the matching `.webstack` layers so **recommended / all-on** matches the reference UX and **partial** presets still run with static English (or neutral placeholders) where a module is off.

## Layering rules

1. **`template-empty`** must not import optional packages or optional paths (`@/i18n`, stores, etc.).
2. **`demo-pages`** must run with **zero** optional features enabled: no imports from disabled modules (use markers removed only when a feature applies, or plain static copy).
3. **Optional features** extend shared files via markers: `// @webstack:…`, `<!-- @webstack:… -->`, `/* @webstack:… */`. Document conventions for your repo in `STACK_DOCK.md` if you maintain one.
4. **`requires` in `patch.json`** encodes order when feature B patches files introduced or shaped by feature A.

## Feature engine pitfalls

- **Whole-folder merge:** if `features/<name>/src/` exists, **every** file under it is copied over the project. A file here overwrites the same path from an earlier feature or `template-empty`. Do not ship a “final” file under feature `src/` if a **later** patch expects **markers** left by `demo-pages` (example: avoid duplicating `404.astro` under `i18n/src/pages/` when patches target the demo-pages version).
- **Patch markers:** `replace-marker` / `insert-before-marker` use exact substring matches after normalizing to `\n`. CRLF and spacing matter.
- **Optional patches:** set `"optional": true` on a patch object when the target file or marker may legitimately be absent (e.g. patches to `src/__tests__/utils.ts` when the `tests` feature was not selected). Skips are silent for optional entries.
- **Vue router:** not a user-toggle. Router setup lives in **`demo-pages`**, not a separate `router` feature pack.

## Astro: localized vs non-localized

- **Without i18n:** root-level pages (`src/pages/index.astro`, `about.astro`, …), layout without `@mannisto/astro-i18n` imports; plain strings until `i18n` patches add `t()` where needed.
- **With i18n:** feature supplies `src/pages/[locale]/…`, removes conflicting root pages per `patch.json`, patches layout, links, `404.astro`.

Do not put `[locale]` routes in `demo-pages` unless they build **without** installing the i18n package.

## Vue PWA / Lynx specifics

- **Lynx `platforms`:** `template-config.js` adds `platforms` when `buildMode` is `recommended` or when **all** of `pinia`, `i18n`, `tests` are in `optionalFeatures`. Adjust that block when introducing new Lynx-only toggles.
- **PWA `tailwind-config`:** added for non-empty PWA modes in `computeSelectedFeatures`; keep in sync if presets change.

## Checklist: changing an existing template

1. Decide whether the change belongs in `template-empty`, `demo-pages`, or an optional feature.
2. Keep **empty** preset runnable: no stray optional imports.
3. Update `patch.json` / markers; run **`npm run gen:all`** (from `stack/`) and confirm **no** `Marker not found` / non-optional `Skip patch` noise.
4. Manually run the wizard for **empty**, **recommended**, **custom none**, **custom all**; `npm install`, `npm run dev`, `npm run build` as applicable.
5. Optionally: `npm run parity -- --baseline <repo-or-src> --generated <output> --subset src`.

## Checklist: adding a new template repository

1. **Repo id:** folder name and GitHub repo should match what users select (clone URL is `https://github.com/davidaganov/<templateName>` unless you change `resolveTemplateSource` / prompts).

2. **`stack/src/templates.json`:** add a top-level key `<templateName>` with `label` and `features` (wizard toggles). IDs must match `value` strings used in `.webstack/features/*/patch.json` names and in code.

3. **`stack/src/template-config.js`:** extend `computeSelectedFeatures` if the stack needs special rules (tailwind-only PWA, Lynx `platforms`, etc.).

4. **`stack/src/prompts.js`:** uses `TEMPLATES` from `template-config.js` automatically; verify labels read well.

5. **Batch fixtures (`scripts/generate-fixtures.mjs`):**
   - Local DX expects a **sibling folder** next to `stack/` named exactly like `templates.json` key (`vue-pwa-template`, …).
   - Add `VARIANTS[*].templates` filter if a variant only applies to some stacks (see `config-pinia`).
   - Add `npm run gen:<name>` script in `stack/package.json` if you want a dedicated preset.

6. **`.webstack` layout:** create `template-empty/` + `features/demo-pages/` + optional features with `patch.json` (`name`, `requires`, `copy`, `patches`, `packageJson`, `remove` as needed).

7. **Documentation:** update template README and this guide’s examples if clone paths or variant matrix change.

## Verification

**Manual:** after edits, generate four scenarios — empty, recommended, custom with no modules, custom with all modules — and smoke-test dev/build.

**Parity helper:** does not run the generator; compare trees after you generate into a known folder:

```bash
cd stack
npm run parity -- --baseline ../vue-pwa-template --generated ../tmp/my-app --subset src
```

- `--baseline`: reference tree (repo root or golden folder).
- `--generated`: CLI output directory.
- `--subset`: comma-separated path prefixes (e.g. `src`).

Exit code `1` means content or file set differences (CRLF normalized on text). Ignores include `node_modules`, `dist`, lockfiles by default.

## Local batch generation (`npm run gen:*`)

Output: **`.stack-gen/<template-id>/<variant>/`** (gitignored). Sibling template folders supply sources without cloning.

| Script | Scope |
|--------|--------|
| `npm run gen:all` | All templates × all variants that apply; per-template `_deps/` handling as implemented |
| `npm run gen:pwa` / `gen:lynx` / `gen:astro` | One template, all its variants by default |

Pass flags **after** `--`:

```bash
npm run gen:all -- --install
npm run gen:pwa -- --full --empty --help
```

Variant flags include: `--empty`, `--full`, `--config-all`, `--config-none`, `--config-i18n`, `--config-pinia`, `--config-tests`.

Template catalog for the wizard: **`src/templates.json`**.

Shared deps: variant `node_modules` may link to `<template>/_deps/node_modules`; `--install` refreshes merged deps for the templates touched in that command.

## Release process

1. Ship `.webstack` + root `src/` updates together in the template repo.
2. Ship CLI changes in `stack`, bump `@davidaganov/stack` on npm.
3. `npm link` (or `npx`) smoke-test all templates.
4. Optional: parity against golden outputs before publish.

## Related material

- Optional per-repo notes: `STACK_DOCK.md` in a template repository.
