# Gambl Balatro

A menu-first poker roguelike foundation for FantomZone. React + TypeScript UI, Three.js/WebGL felt renderer, Python asset validation, and Cloudflare static hosting.

## Run

- `npm ci`
- `npm run dev`
- `npm test`
- `npm run build`
- `node scripts/browser-check.mjs` (headless Microsoft Edge; set TEST_URL for a preview or deployed URL)
- `python scripts/audit_assets.py`
- `node scripts/music-check.mjs` (set TEST_URL to the running game)

## Current release: v0.1 solo preview

Original casino artwork, responsive main menu, settings, local records, Joker collection, four-part rules guide, saved solo runs, eight-ante progression, blind selection, live score previews, play/discard, seven original Jokers with reordering and selling, cash-out, seeded shops, rerolls, and hand level upgrades. All 12 poker hands are recognized by the pure scoring engine. Standard decks cannot produce secret hands until card-duplication consumables are implemented.

Mobile landscape uses a fixed dynamic-viewport layout. Portrait has a compact top scoreboard. Fullscreen/orientation locking is best effort because browser support varies. All fonts and art are bundled locally.

## Remaining PRD work

CPU opponents, authoritative multiplayer rooms and reconnects, eight-step interactive tutorial, full 30-Joker catalog, additional boss modifiers (including the Final Call), skips and tags, vouchers, boosters, card modifiers and editions, consumable slots, endless mode, layered music, detailed scoring VFX, exact-size cover asset variants, and real-device 60fps validation. CPU and online menu entries explicitly show their development status. The current four rotating boss rules debuff one suit. Music uses one shared HTMLAudioElement mounted at the app root and six user-supplied third-party MP3s from Pixabay and StockTune. The exact original filenames are preserved. Play Music starts a shuffled queue directly from its click handler; Records supports manual selection, a playing highlight, keyboard navigation, and pinned source credit. Music continues across menu, game, and shop, respects master mute and its separate saved volume, and waits for an explicit music click after reload. These tracks are not original compositions by this project. Before public release, complete the source-page license verification specified in Music/Gambl_Balatro_Music_PRD.md; see docs/music-acceptance.md.

## Deployment

`npm run deploy` builds and publishes the game to `balatro.fantomzone.app`. Cloudflare authentication is required. The separate FantomZone repository owns the homepage listing; its predeploy source guard must remain enabled. Do not replace existing hub links.

## Assets

`public/casino-art.png` is original generated artwork produced for this project. Cinzel and DM Sans fonts are bundled from their Fontsource packages, which include their licenses. No official Balatro artwork or characters are used. No real money wagering.
