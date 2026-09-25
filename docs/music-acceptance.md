# Music PRD acceptance review — 2026-09-24

Spec read in full before edits: `Music/Gambl_Balatro_Music_PRD.md`. The supplied archive was preserved. Its six MP3 entries were extracted directly into `public/audio/music/`; filenames and SHA-256 hashes match the archive byte for byte.

## Cause and fix

The previous `src/soundtrack.ts` synthesized audio and never referenced the supplied MP3s. It also used broad gesture listeners and asynchronous AudioContext resumption rather than the explicit file-backed player specified here. It has been removed. A single MusicPlayer owned by MusicProvider above App now calls HTMLAudioElement.play() synchronously in the music button/Records-row click stack. No effect, timer, async callback, screen change, or page reload initiates playback. Play rejections are logged and surfaced to the player.

## Acceptance criteria

| PRD criterion | Result and evidence |
| --- | --- |
| Six MP3s, exact names | PASS: byte-for-byte archive comparison; all six HTTP paths returned 200 with audio content and decoded in browsers. |
| First-click random playback in Chrome, Edge, Safari; no errors | PASS in installed Chrome, Edge, and Playwright WebKit 26.6. First play had active user activation, media time advanced, all six files decoded, and no page errors or missing files occurred. Native macOS/iOS Safari is unavailable on this Windows machine and is **not verified**. |
| Play Music / Music On; clicking again stops | PASS: initial/reload state waits for click; successful playback updates label; stopping pauses and resets media. |
| Go to Records immediately right of toggle | PASS: bounding-box assertions in all tested sizes; identical gold-outline/navy pill styles. |
| Display titles only, playing highlight, tap selection | PASS: exact six titles and displayed durations compared to catalog; no sources or filenames in rows; gold highlight and playing indicator; every row plays its selected MP3. Re-selecting the active track does not call play or reset time. |
| Shuffle autoplay, no repeats | PASS: 100 shuffle cycles in unit tests; six unique tracks in browser sequence; a real media-ended event advances automatically; no repeat across cycle boundary. Manual selection anchors a new cycle followed by the other five tracks. |
| Continuous music across screens | PASS: one Audio instance; unchanged source and play-call count across Records, menu, game, settings, shop, and next-round transitions. Records Back restores the prior game/shop screen. |
| Credit pinned at bottom | PASS: exact PRD text, visible bounds at desktop, short landscape, and portrait sizes. Only the track list scrolls. |
| Existing volume/mute affects music | PASS: master mute changes audio.muted; independent music slider changes audio.volume; saved volume survives reload. SFX channel remains independent. |
| Main PRD and game features unchanged | PASS: no diff to Gamble_Balatro_PRD.md or src/engine.ts; 27 existing engine tests pass; eight required layout/interaction regression viewports pass. |

Music browser matrix: Chrome, Edge, and WebKit at 1280×720, 667×375, and 390×844. This is browser testing, not a claim of physical-device speaker verification. Arrow keys + Enter, end-of-track autoplay, six playable files, muted state, saved preferences, and Records return navigation were exercised in each case.

Required commands: `npm test` (36 passed), `npm run build` (passed), `scripts/browser-check.mjs` against local dev server (eight viewports; no issues). Detailed JSON and screenshots are in ignored `test-results/`. Run `MUSIC_BROWSER=chrome`, `msedge`, or `webkit` with `scripts/music-check.mjs`; TEST_URL selects the local/preview URL.

## Release verification record

On 2026-09-24, the user confirmed all six tracks are verified and authorized public push and deployment. The register records the supplied license names, dates, five Pixabay URLs, and StockTune artist. No PDFs are present; the user accepts source URLs and verification dates as records. The supplied StockTune URL remains placeholder text, explicitly identified in the register rather than presented as a real link.

## Files changed

- Added six unchanged MP3s under `public/audio/music/`.
- Added `src/data/tracks.ts`, `src/music-player.ts`, `src/MusicProvider.tsx`, `src/Records.tsx`, and `src/vite-env.d.ts`.
- Updated `src/main.tsx`, `src/style.css`, and the music section of `README.md`.
- Removed the obsolete synthesized player `src/soundtrack.ts`.
- Added `tests/music.test.ts`; updated `scripts/music-check.mjs` for actual MP3 playback and the PRD behavior.
- Added `licenses/music/LICENSES.md`, ready for the user-supplied PDFs.
- Added this acceptance review. The supplied music PRD, ZIP, main game PRD, gameplay engine, homepage, and other games were not edited.
