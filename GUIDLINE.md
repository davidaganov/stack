## WebStack template maintenance guide (for humans + AI)

This document explains **how templates are structured**, **how the generator works**, **how to update/create templates and features**, and the **common pitfalls**.  
Goal: give an AI this file + a task, and it should make correct changes without breaking `.webstack` generation.

---

## Overview: repositories and responsibilities

- **`stack/`**: the `@davidaganov/stack` CLI (wizard, resolver, feature engine, `.stack-gen/` fixtures).
- **Each template is a separate repository** (in local development it lives next to `stack/` as a sibling folder):
  - `vue-pwa-template`
  - `vue-modern-template`
  - `vue-lynx-template`
  - `astro-clean-template`

Local DX: if `../vue-lynx-template` (etc.) exists next to `stack/`, the generator uses it as the source instead of cloning.

---

## 1) Template repo layout: `.webstack/`

Each template repository contains `.webstack/`, which defines **layers**:

- **`.webstack/template-empty/`**
  - Minimal runnable project.
  - No optional dependencies/imports/files that require a selected feature.
- **`.webstack/features/demo-pages/`**
  - Baseline for `recommended/custom` modes (pages, routing, components).
  - Must work **without** optional features (either static content or markers).
- **`.webstack/features/<feature>/`**
  - Optional modules: `i18n`, `pinia`, `tests`, `tailwind`, `platforms`, …

---

## 2) How the CLI builds a project (actual internals)

Key places in `stack/`:

- Template catalog and selectable options: `stack/src/config/templates.json`
- Feature selection logic: `stack/src/config/templates.ts`
- Layering engine: `stack/src/core/feature-engine.ts`

Generation pipeline (essentials):

1. Copy `.webstack/template-empty/` into the target project.
2. Compute the feature list and its order (respecting `requires` and special rules like applying Tailwind last).
3. For each feature:
   - **Copy phase**: if `features/<name>/src/` exists, it is copied entirely into `target/src/`. Then paths from `copy` in `patch.json` are copied.
   - **Remove phase**: remove files listed in `remove` in `patch.json`.
4. **Patch phase**: apply marker-based operations from `patches`.
5. **package.json phase**: add `dependencies/devDependencies/scripts` from each feature’s `packageJson`.
6. **Cleanup phase**: `cleanupMarkers()` removes `@webstack` markers and normalizes blank lines.

---

## 3) Feature contract: `patch.json`

`.webstack/features/<feature>/patch.json` (typical contract):

- **`name`**: feature id (must match a `value` in `stack/src/config/templates.json`)
- **`requires`**: list of features that must be applied earlier
- **`copy`**: extra files/directories to copy (in addition to `src/`)
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

Tests must live **only** under `src/__tests__/...`. No `*.test.ts` colocated with components.

### Why this matters (and how duplicates happen)

The feature engine automatically copies **all** of `features/<name>/src/` into the project.  
So the `tests` feature must not contain `src/components/.../*.test.ts`, or they will end up in the output.

### Recommended safety in `vitest.config.ts`

Narrow `include`:

```ts
include: ["src/__tests__/**/*.test.ts"]
```

---

## 6) Tailwind as an optional feature (model)

Goal: the baseline project does not depend on Tailwind, while the `tailwind` feature wires it in:

- Tailwind config (`tailwind.config.*`)
- `postcss.config.*` (if needed)
- `tailwind.css` import in `src/assets/styles/main.css`
- dependencies in `package.json`

Important: Tailwind should be applied **last** (see `tailwindLast()` in `stack/src/config/templates.ts`).

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

1. Create a template repo with `.webstack` structure:
   - `.webstack/template-empty/`
   - `.webstack/features/demo-pages/`
   - `.webstack/features/<feature>/`
2. Add an entry to `stack/src/config/templates.json`.
3. Add special rules (if needed) in `stack/src/config/templates.ts`.
4. (Optional) add a variant in `stack/scripts/generate-fixtures.mjs`.
5. Verify end-to-end: `npx <path_to_stack>` → wizard → `npm run dev`.

---

## 10) `.stack-gen/` fixtures (why and how)

`stack/scripts/generate-fixtures.mjs` generates combinations under:

`.stack-gen/<template-id>/<variant>/`

This is a quick way to catch:

- missing markers,
- wrong feature ordering,
- extra files accidentally committed into feature `src/`,
- dependency incompatibilities.

Windows pitfall: if generation fails with `EBUSY`, a process is holding the folder (dev server, indexer, antivirus). Stop the process and regenerate.
