# PokéBox Stage 1 — QA-only build

## Scope (implemented)

- Separate **Pokédex** (existing discovery view) and **PokéBox** (new 30-slot instance view) in menu.
- Search, filter Shiny, pagination, view individual Nature/Ability snapshot, select individual for next battle through the existing `partner`/`partnerShiny` compatibility fields.
- No silent save conversion. First export original JSON backup; explicit confirmation before creating `pkmsvvBoxSchema=1`, `pkmsvvBox`, `pkmsvvSelectedInstanceId`.
- A normal representative for each original `owned[dex]`; an additional Shiny for `shiny[dex]`, even if previous save had only a flag. Stable deterministic IDs. Re-import/reload does not duplicate.
- Preserve original `owned`, `shiny`, `pupg`, `pnat`, `pabil`, `tickets`, `pity`, chapter progress, Mega, Berry and all other fields. Unknown schema fails closed rather than rewriting saves.
- Stage 1 is a **bridge**, not full individual combat mechanics: per-individual Nature/Ability snapshot is stored, but live battle, Mint, Capsule, TM and Gacha still use the legacy species-based systems. These move to individual IDs in Stage 2 after QA.
- No Rank buff, duplicate-to-shard, prism loot or shop yet. They belong to Stages 2–3.

## QA build, no production publication

Build normal Cloudflare dist through existing scripts, then run:

```sh
node scripts/build-pokebox-stage1-qa.cjs
node --test tests/pokebox-stage1.test.cjs
```

The builder copies the already-built Web into `dist/pokebox-stage1-qa` and adds standalone scripts to `/game/` and `/ai/game/`. It cannot modify or upload the production directory. No Android package ID, signing key, versionCode or live deployment is changed.

Test a **copy** of save JSON and confirm the backup is downloaded before clicking migration. Stage 1 must not be merged to `feature/lan-local-beta` until all four stages and cross-platform QA pass.

## Windows QA

Use a successful baseline `dist/lan-windows/win-unpacked` and run `node scripts/build-pokebox-stage1-pc-qa.cjs`. The new standalone output is `dist/pokebox-stage1-pc-qa`. Never overlay the installed PC application or deploy to the public website.

Local browser smoke tests are **not yet verified**: sandbox Chromium could not navigate even to its loopback server, although the game assets returned HTTP 200 from curl. Check the actual menu/selection and save restore manually on Windows/Android before merging.

**PC save isolation:** the Windows QA builder patches the packaged Electron launcher to use a separate `PKMSVV-BOX-QA-1` user-data directory. The normal `PKMSVV-LAN-Beta` save directory is never opened by the QA client. User must explicitly import a **copy** of save into QA to test conversion.
## Stage 2 incremental QA — 2026-11-05

**Status: isolated code + source tests, not a verified game release.**

- Gacha after opt-in migration creates one immutable b2-N individual per result (including repeats and Shiny), with independent Nature and Ability snapshot. It does not change star rates, regional pity, ticket costs or x100 guarantees.
- The original Gacha is called against a deep-cloned save; the resulting tickets/pity/owned/shiny and PokéBox instances are applied together only when safe and G.DB.commit(true) does not report immediate failure. This is **not yet verified as durable across sudden termination, cloud-sync races or device quota**, so release is blocked pending QA.
- Rank costs: 0→1 = 1, 1→2 = 2, 2→3 = 3, 3→4 = 4, 4→5 = 5; use A (direct same-species duplicate) or C (convert same-species duplicate to a species shard, proposed 1:1) or a mixture. Evolution-family materials are deliberately invalid.
- Protected: no automatic conversion, selected fighter, Shiny, Legendary, favorites, locked, upgraded instances or preexisting migrated b1-* specimens may be consumed.
- Rank +6% HP and damage per level (up to 30%) is currently applied through G.Mons.monFor for solo PvE, excluded from recognized multiplayer/PvP. Rank 4 -5% cooldown is **metadata only**; Rank 3 branch and Rank 5 hybrid are **stored choices but their special battle effects (burn, evade etc.) are not yet implemented**. Exact combat traits and Champion/AI balance remain release blockers for Stage 4.
- New Stage 2 QA UI lives inside PokéBox and asks for explicit confirmation of each sacrifice or branch choice. First Rank 3 branch is free; the later Prism reset belongs to Stage 3.
- Existing isolated Web and PC builders now include Stage 2 JS/CSS; they write to dist/pokebox-stage2-qa and dist/pokebox-stage2-pc-qa respectively. The PC QA builder preserves its separate Electron userData identity, so production PC save remains isolated.

**Tests:** npm run test:pokebox:stage2. The draft-branch test:web suite includes both Stage 1 and Stage 2 test files; source CI green at 2d6cb617. No production build, production site deploy or Android APK is authorized before all four stages.

**Before release:** browser runtime and Windows executable smoke, legacy save replay/export, full Gacha ×1/10/100 after restart, real quota exhaustion, service worker cache/version behavior, per-individual Nature/Ability during actual battle, rank trait implementation, Reforge Prism economy, 3-platform same-commit QA.
