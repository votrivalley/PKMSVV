# PKMSVV v1.5.50 – Mega 4-direction LOCAL PC QA / translucent Upgrades (2026-10-30)

## What has been changed

1. `src/pkmsvv-phase1-pastel.css` previously set `#scr-upgrade-select.scr.dim` to an **opaque mint/white radial gradient**, hiding the animated Pokémon background. This also blocked the backdrop beneath the Support and Mega sub-dialogs. The fullscreen layer now uses translucent dark RGBA; the content cards remain opaque mint with dark readable text. Support and Mega overlays also use translucent dark backdrops without blur.
2. A strictly opt-in private-PC Mega preview importer exists: `scripts/patch-mega-4dir-pc-qa.cjs`.
3. It reads eight PA2.1 local PNG files: `scizor-normal.png`, `scizor-shiny.png`, `swampert-normal.png`, `swampert-shiny.png`, `garchomp-normal.png`, `garchomp-shiny.png`, `dragonite-normal.png`, `dragonite-shiny.png`. **All must be 384×384 RGBA with 4 rows × 4 frames**. Missing/wrong/blank frames fail closed before any vendor writes.
4. It registers QA-only sprite metadata for Scizor, Swampert, Garchomp and Dragonite using separate virtual sprite IDs and copies the true 4-direction Walk to Idle as a transparent **fallback**, not as genuine new art. No drawn fake diagonal sprites.
5. The game's 8-way direction indexes 0–7 map to the nearest real 4-way rows with the fixed lookup `[0,0,2,3,3,3,1,0]`, where source row order is `front,left,right,back`. The rest of the renderer remains unchanged.
6. `src/pkmsvv-mega-phase3.js` uses established original form base stats to scale each Mega's existing official Mega stats, **only if** `G.PKMSVV_MEGA_4DIR_QA.enabled` and the form is tagged `qa4dir`. Normal production remains Charizard X and Excadrill only in this engine. Story and stone gates, 30-second duration and 30% cooldown reduction remain.
7. `scripts/prepare-mega4-pc-qa-launcher.cjs` creates **separate temporary config and Electron entrypoint**: app ID `com.votrivalley.pkmsvv.mega4qa`, userData directory `PKMSVV-MEGA4-QA-Isolated`, EXE artifact `PKMSVV-MEGA4-QA-...`, output directory `dist/mega4-windows`. It does not overwrite the normal `lan-main.cjs`, `lan-win.json` or normal save.
8. The QA launcher and its files are gitignored. Source images are **never committed or downloaded in public GitHub Actions**.

## Local Windows QA build

This is **not** the normal GitHub Actions EXE. Download the conversation attachment `PKMSVV-Mega4-PC-QA-Kit.zip` and use its `CHAY-BUILD-MEGA4-QA.cmd` after extracting. It contains the private PA2.1 assets and reads your local PKMSVV repo path.

Or, from a clean checkout of `feature/lan-local-beta` with Node 22+ and the pinned JPTER78/pokesurvivor vendor source in `vendor/pokesurvivor`:

~~~powershell
$env:PKMSVV_MEGA_4DIR_PC_QA='1'
$env:PKMSVV_MEGA_4DIR_SOURCE_DIR='C:\path\to\extracted-kit\assets'
npm install --no-audit --no-fund
node --test tests/mega-4dir-pc-qa.test.cjs tests/mega4-isolated-pc-launcher.test.cjs
npm run prepare:lan
npm run test:mega:phase3
node scripts/prepare-mega4-pc-qa-launcher.cjs
npx electron-builder --win portable --x64 --publish never --config lan-win-mega4-qa.json
~~~

Always export a backup of your current save JSON before any testing. QA userData is isolated but progress in this QA EXE is not expected to sync with main release. Do not publish/fork the included source fan-art without checking the authors' permissions.

## Not implemented

- This does **not** generate genuine diagonal sprites or Attack / Shoot / Charge / Hurt / Faint.
- It uses visible Walk/Idle fallback when casting moves; the normal skill projectile/effects system remains active.
- This does **not** implement host-authoritative LAN multiplayer Mega synchronization. Do not treat this as ranked PvP-ready, online-ready or a Web/Android release.
- This does **not** alter Shiny rarity, Mega Stones, Gacha probabilities, story progression, save IDs or release Android signature.
- This does **not** claim third-party source art has legal redistribution clearance.

## Test/QA status

Node tests in `tests/mega-4dir-pc-qa.test.cjs` test opt-in protection, all eight PNG geometry, missing sprite failure, direct four-way metadata, correct 96px tile alignment, Shiny and no save changes. `tests/mega4-isolated-pc-launcher.test.cjs` tests separate app/userData, missing QA marker rejection and no release main modifications. GitHub LAN workflow runs both tests on Windows before building. **A passing standard public Actions build will not contain the eight private Mega sheets.**

Please also manually open Upgrades → Support → Mega and return to the menu, checking that the Pokémon scene remains visible behind each (but the content card is legible), on wide and narrow screens.
