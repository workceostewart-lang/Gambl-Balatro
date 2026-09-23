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
