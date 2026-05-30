## WebStack template maintenance guide (for humans + AI)

This document explains **how templates are structured**, **how the generator works**, **how to update/create templates and features**, and the **common pitfalls**.  
Goal: give an AI this file + a task, and it should make correct changes without breaking generation.

---

## Overview: repositories and responsibilities

- **`stack/`**: the `@davidaganov/stack` CLI (wizard, resolver, feature engine, `.stack-gen/` fixtures).
- **Each template is a separate repository** (in local development it lives next to `stack/` as a sibling folder):
  - `vue-pwa-template`
  - `vue-modern-template`
  - `vue-lynx-template`
  - `astro-clean-template`
  - `nuxt-modern-template`

Local DX: if `../vue-lynx-template` (etc.) exists next to `stack/`, the generator uses it as the source instead of cloning.

---

## 1) Template repo layout (repo root = generator source)

Each template repository root **is** the generator source. It is **not** a runnable app checkout.

Layers at repo root:

- **`template-empty/`** (or `template-empty-flat/` / `template-empty-layered/` for Nuxt)
  - Minimal runnable project.
  - No optional dependencies/imports/files that require a selected feature.
- **`features/demo-pages/`** (or `demo-pages-flat` / `demo-pages-layered` for Nuxt)
  - Baseline for `recommended/custom` modes (pages, routing, components).
  - Must work **without** optional features (either static content or markers).
- **`features/<feature>/`**
  - Optional modules: `i18n`, `pinia`, `tests`, `tailwind`, …

To smoke-test a layer, generate a project with `stack` into `.stack-gen/` and run `npm run dev` there.

---

## 2) How the CLI builds a project (actual internals)

Key places in `stack/`:

- Template catalog and selectable options: `stack/src/config/templates.json`
- Feature selection logic: `stack/src/config/templates.ts`
- Layering engine: `stack/src/core/feature-engine.ts`

Generation pipeline (essentials):

1. Copy `template-empty/` (or architecture-specific empty) into the target project.
2. Compute the feature list and its order (respecting `requires` and special rules like applying Tailwind last).
3. For each feature:
   - **Copy phase**: paths from `copy` in `patch.json` are copied. A full `src/` / `app/` / `layers/` tree is copied **only** when `"copyContentRoot": true` (opt-in; most features use explicit `copy` + patches instead).
   - **Remove phase**: remove files listed in `remove` in `patch.json`.
4. **Patch phase**: apply marker-based operations from `patches`.
5. **package.json phase**: add `dependencies/devDependencies/scripts` from each feature’s `packageJson`.
6. **Cleanup phase**: `cleanupMarkers()` removes `@webstack` markers and normalizes blank lines.

---

## 3) Feature contract: `patch.json`

`features/<feature>/patch.json` (typical contract):

- **`name`**: feature id (must match a `value` in `stack/src/config/templates.json`)
- **`requires`**: list of features that must be applied earlier
- **`copy`**: extra files/directories to copy (always applied when listed)
- **`copyContentRoot`**: when `true`, copy all of `features/<name>/src/` (or `app/` / `layers/` for Nuxt) before `copy` paths
- **`remove`**: files to delete
- **`patches`**: file edit operations
- **`packageJson`**:
  - `dependencies: string[]`
  - `devDependencies: string[]`
  - `scripts: Record<string,string>`

### Patch operations (what the engine actually supports)

Most important:

- `replace-entire`: overwrite the entire file.
- `replace-marker`: replace a marker with `content`/`lines`.
- `insert-before-marker` / `insert-after-marker`: insert lines around a marker.
- `"optional": true`: if the file/marker is missing, this is not an error.

Marker matching is whitespace/newline tolerant, but the marker still needs to be unique enough.

---

## 4) Golden rules for layers

### 4.1 `template-empty` (zero layer)

- Must run without any optional modules.
- No imports of `@/i18n`, `@/stores`, Tailwind CSS, etc.

### 4.2 `demo-pages` (works without features)

- No dependencies on optional packages.
- If behavior needs to change with a feature, use markers + feature patches.

### 4.3 `features/*`

- If a feature adds dependencies, list them in `packageJson`.
- If a feature patches files that may not exist, set `"optional": true`.
- If a feature depends on files introduced by another feature, use `requires`.

---

## 5) Tests: one standard

### Requirement

Tests must live **only** under `src/__tests__/...` (or `app/__tests__/` for Nuxt). No colocated test files next to components.

Use **`*.spec.ts`** everywhere (not `*.test.ts`).

### Why this matters (and how duplicates happen)

The `tests` feature uses `"copyContentRoot": true` and owns the entire `__tests__/` tree.  
Do not put specs in `demo-pages`, `i18n`, or other features — they would ship to every generated project that selects those features.

### Recommended safety in `vitest.config.ts`

Narrow `include`:

```ts
include: ["src/__tests__/**/*.spec.ts"]
```

---

## 6) Tailwind as an optional feature (model)

Goal: the baseline project does not depend on Tailwind, while the `tailwind` feature wires it in:

- Tailwind config (`tailwind.config.*`)
- `postcss.config.*` (if needed)
- `tailwind.css` import in `src/assets/styles/main.css`
- dependencies in `package.json`

Prefer **CSS + marker patches** (vue-lynx model) over copying a full `features/tailwind/src/` tree.

Important: Tailwind should be applied **before** i18n/pinia content patches (see `featureOrder` in `templates.json`). Tailwind `replace-entire` on Vue files must keep `@webstack` markers so later features can patch them.

Marker matching is whitespace/newline tolerant between HTML comment markers and placeholder text.

---

## 7) Lynx (vue-lynx) specifics you must not ignore

### 7.1 `<style scoped>`

Depending on `vue-lynx`/Rspeedy/renderer versions, scoped styles can be unreliable.  
For stable templates, prefer:

- regular `<style>` + namespaced classes (BEM-like),
- only re-introduce scoped after verifying it on the target version.

### 7.2 Rspeedy dev host on Windows

IP auto-detection can pick `169.254.x.x` and the printed URLs won’t open in the browser.  
Fix: set in `lynx.config.ts`:

```ts
server: {
  host: "127.0.0.1"
}
```

---

## 8) How to safely change an existing template (checklist)

- Pick the layer: `template-empty` / `demo-pages` / `features/<feature>`.
- Ensure `template-empty` still runs.
- Verify `requires` and ordering (especially with Tailwind).
- Generate fixtures: `npm run gen:<template>` inside `stack/`.
- Smoke test: empty/recommended/custom-none/custom-all.
- Run `stack` tests: `npm test` (verifies generator internals).

---

## 9) How to add a new template repo (step-by-step)

1. Create a template repo with generator source at root:
   - `template-empty/`
   - `features/demo-pages/`
   - `features/<feature>/`
2. Add an entry to `stack/src/config/templates.json`.
3. Add special rules (if needed) in `stack/src/config/templates.ts`.
4. (Optional) add a fixture variant in `stack/src/config/fixtures.ts` (expanded per template in `expandVariantsForTemplate`).
5. Verify end-to-end: `npx @davidaganov/stack` (or local `node ../stack/index.js`) → wizard → `npm run dev`.

---

## 10) `.stack-gen/` fixtures (why and how)

`stack/scripts/generate-fixtures.mjs` generates combinations under:

`.stack-gen/<template-id>/<variant-id>/`

This is a quick way to catch:

- missing markers,
- wrong feature ordering,
- extra files accidentally committed into feature `src/`,
- dependency incompatibilities.

Windows pitfall: if generation fails with `EBUSY`, a process is holding the folder (dev server, indexer, antivirus). Stop the process and regenerate.

Fixture variants are defined in `stack/src/config/fixtures.ts` (`empty`, `full`, `config-*`, …). Run `npm run gen:all` or `npm run gen:<template>` to refresh `.stack-gen/`.
