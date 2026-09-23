# Release verification — 2026-09-22

- Production build: passed, TypeScript strict checking enabled.
- Unit tests: 27 passed. All 12 hand types, Ace-low straight, scoring cards, level increments, Joker order, debuffs, deterministic decks/shops, selection validation, discard limits, loss, cash-out and final-ante progression.
- Python: PNG signature/chunk checksums, 1536×1024 cover dimensions, local manifest assets, and release files passed.
- Live browser checks: 1440×900, 1280×720, 844×390, 667×375, 740×360, 932×430, 390×844, 360×640. No page errors or clipped scoreboard, hand row, Joker row, or action controls. Play, discard, save/resume, help, and mode-status dialogs passed.
- Live shop checks: 1440×900, 667×375, 740×360, 390×844. A controlled winning-hand fixture exercised cash-out, purchase, hand upgrade, and Big Blind advancement. No clipped shop controls.
- Hub preview: all 15 live game links/titles preserved; new same-origin cover loaded; 390×844 navigation opened the live game.
- Dependency audit for this game: zero known vulnerabilities after updating Vitest to 4.1.11.
- Domain routing: existing Solitaire wildcard intercepted the new custom domain. Added only `balatro.fantomzone.app/*` to the game configuration; no existing route was modified.

Screenshots and JSON reports are generated under ignored `test-results/`. Browser runs use headless Microsoft Edge, not physical phones; native Safari behavior, touch ergonomics, and sustained 60fps remain real-device checks. The release is a menu-first solo preview, not full PRD completion. See README.md for the remaining systems.

Published homepage verification: 16 total game cards, all 15 prior links/titles unchanged, cover decoded successfully, mobile link opened Balatro, no page errors. FantomZone commit `f4d977e`, Cloudflare version `d4e25c03-6936-4d1d-b6e8-176301eb452d`. Final game Cloudflare version `561cd441-c127-47ad-b6a9-5bf7ec308366`; final 667×375 live smoke test showed all eight cards with no page errors.

Soundtrack fix: added an original synthesized 16-bar lounge arrangement, first-interaction audio unlock, visible Play Music control, separate saved music volume, master mute, hidden-tab pause, and legacy settings migration. Headless audio analyser checks at 1280×720, 667×375, and 390×844 confirmed nonzero output while playing and zero while muted, zero-volume silence, restored output after unmute, first-gesture playback, persisted volume, and no page errors. This verifies the generated signal, not physical device speakers.
