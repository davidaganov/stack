# @davidaganov/stack

[![npm version](https://img.shields.io/npm/v/@davidaganov/stack.svg?style=flat-square)](https://www.npmjs.com/package/@davidaganov/stack)
[![npm downloads](https://img.shields.io/npm/dm/@davidaganov/stack.svg?style=flat-square)](https://www.npmjs.com/package/@davidaganov/stack)
[![License: MIT](https://img.shields.io/npm/l/@davidaganov/stack.svg?style=flat-square)](https://github.com/davidaganov/stack/blob/main/LICENSE)

CLI that scaffolds **Vue PWA**, **Vue Lynx**, and **Astro** projects from template repositories. Each template exposes `.webstack` (`template-empty` plus feature packs); the tool clones from GitHub or uses a local checkout, merges layers, applies marker-based patches, and writes a runnable tree.

**Repository:** [github.com/davidaganov/stack](https://github.com/davidaganov/stack)

Templates (separate repositories):

- [vue-pwa-template](https://github.com/davidaganov/vue-pwa-template)
- [vue-lynx-template](https://github.com/davidaganov/vue-lynx-template)
- [astro-clean-template](https://github.com/davidaganov/astro-clean-template)

Maintainers: **[GUIDLINE.md](https://github.com/davidaganov/stack/blob/main/GUIDLINE.md)** (`.webstack` rules, batch `npm run gen:*`, parity).

## Usage

```bash
npx @davidaganov/stack
```

Presets: **recommended**, **custom** (toggle modules), **empty**.

## Requirements

- Node.js 18+
- Git on `PATH`

## License

MIT © [David Aganov](https://github.com/davidaganov)
