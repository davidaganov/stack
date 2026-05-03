#!/usr/bin/env node

console.log(`
  @davidaganov/stack
  ==================

  USAGE
    npx @davidaganov/stack       # CLI (remote)
    stack                        # CLI (local link)

  GENERATION (.stack-gen/)
    npm run gen:all              # all templates × all variants
    npm run gen:pwa              # gen:lynx | gen:astro — one template
    --install                    # wipe that template's _deps/, merge pkg, npm install once
    --help                       # variant flags & paths for this preset

    npm run gen:all -- --install
    npm run gen:astro -- --full --empty
    npm run gen:pwa -- --config-i18n --install
    npm run gen:lynx -- --help

    node scripts/generate-fixtures.mjs --list

  PARITY & QUALITY
    npm run parity -- --baseline <path> --generated <path> [--subset src]

    npm run parity -- --baseline ../vue-pwa-template --generated ./.stack-gen/vue-pwa-template/full --subset src

  MAINTENANCE
    src/templates.json           # catalog
    https://github.com/davidaganov/stack/blob/main/GUIDLINE.md
`)
