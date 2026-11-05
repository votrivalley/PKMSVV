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