# @davidaganov/stack

[![npm version](https://img.shields.io/npm/v/@davidaganov/stack.svg?style=flat-square)](https://www.npmjs.com/package/@davidaganov/stack)
[![npm downloads](https://img.shields.io/npm/dm/@davidaganov/stack.svg?style=flat-square)](https://www.npmjs.com/package/@davidaganov/stack)
[![License: MIT](https://img.shields.io/npm/l/@davidaganov/stack.svg?style=flat-square)](https://github.com/davidaganov/stack/blob/main/LICENSE)

Interactive CLI for creating project starters with ready-made structure, examples, configs, linters, and optional modules.

It helps you start a new project without assembling the same baseline by hand every time. Pick a template, choose a preset, and get a runnable project directory.

## Quick Start

```bash
npx @davidaganov/stack
```

The CLI will ask for:

- a project template;
- a project name;
- a setup mode;
- optional features;
- whether to install dependencies.

After generation:

```bash
cd your-project
npm run dev
```

If you skipped dependency installation, run `npm install` first.

## Templates

- **[Nuxt Modern](https://aganov.dev/en/docs/guides/templates/nuxt-modern-template)**: Nuxt starter with modern setup.
- **[Vue PWA](https://aganov.dev/en/docs/guides/templates/vue-pwa-template)**: Vue application starter with PWA-oriented setup.
- **[Vue Lynx](https://aganov.dev/en/docs/guides/templates/vue-lynx-template)**: Vue starter for Lynx projects.
- **[Vue Modern](https://aganov.dev/en/docs/guides/templates/vue-modern-template)**: Vue starter with clean architecture and essential features.
- **[Astro Clean](https://aganov.dev/en/docs/guides/templates/astro-clean-template)**: Astro starter with a clean baseline.

## Setup Modes

- **recommended**: a complete starter with demo pages and common modules enabled.
- **custom**: choose the modules you want.
- **empty**: a minimal runnable project.

## Requirements

- Node.js 18+
- Git on `PATH`

## License

MIT © [David Aganov](https://aganov.dev/en)
