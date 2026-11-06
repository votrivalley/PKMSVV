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


## Stage 3 incremental QA — Reforge Prism (2026-11-05)

**Status:** Stage 3 source + unit tests + isolated Web/PC packaging; **NOT** a release build for Android/Web production.

- Reforge Prism / Lăng Kính Tái Khắc: the first Rank 3 branch choice stays free. A later branch swap consumes **one** Prism, leaving the individual's Rank 3 or Rank 5, Nature, Ability, Shiny, Mega, upgrades and same-species shards untouched. Only an alternate branch valid for the Pokémon's current typing may be selected; Rank never resets.
- Solo PvE kill drops: one roll per eligible, actually defeated, non-remote enemy; type match **0.35%**, exact same species **1.5%**, matching-type elite **3%**, matching-type boss **8%**. Apply **one highest rate** only (dual-type monsters are not double-rolled). Arceus/remote/boss-support guards and Arena, Co-op, Royale, Berry Rescue, menu states are excluded from the QA hook until host/kill attribution is reviewed.
- **Guaranteed drop on eligible kill #180** after the last drop (pity counter stored in pkmsvvReforgePity); at most **1 dropped Prism per run**. Buying in Kecleon does not reset pity. Kill hook watches local G.Enemy.prototype.hurt transition to dead; the per-run cap resets on G.EnemyMgr.clear. Real mixed boss waves/kill-credit handling needs manual Stage 4 validation.
- Kecleon Shop: deterministic **12%** daily availability, **6,500 PokéCoins**, one item maximum per day. The day key follows the shop's existing Europe/Madrid TM refresh. Reopening or switching tabs cannot reroll stock. In Shop the item is shown with price/status; in **Túi đồ / Bag** it shows owned count and where to use it.
- All item purchase, respec, and Prism-drop record writes clone the save and roll back the in-memory save if G.DB.commit(true) signals immediate failure. This does **not** prove crash durability or distributed Cloud Save safety; those remain release blockers.
- Web/PC staging uses scripts/build-pokebox-stage1-qa.cjs and scripts/build-pokebox-stage1-pc-qa.cjs (historical names), emitting dist/pokebox-stage3-qa and dist/pokebox-stage3-pc-qa from the known successful v1.5.93 artifacts. The PC profile remains **PKMSVV-BOX-QA-1**, separate from production save. No Cloudflare deploy, no Android package changes.
- Test command: npm run test:pokebox:stage3 covers Stage 1/2/3 data, shop, drops, Rank reset and failed-commit rollback. Isolated Web QA workflow additionally tests actual browser engine/module/shop/kill hook installation using headless Chromium.

### Stage 4 release blockers

1. Runtime Rank 3/5 elemental trait implementations, 5% Rank 4 cooldown and clear Solo/Champion/Mega balancing (the Rank trait currently stores metadata only).
2. Check combat credit across elite/boss/support deaths and that kill-drop save commits do not cause slowdown at high monster density.
3. Test actual Gacha ×1/×10/×100, restore/import, quota errors, store purchase/respec across restart, and existing Berry crash old-save regression.
4. Build all platforms from the **same approved commit** and smoke-test PC, Android signed in-place update and Web.
5. Keep this PR **DRAFT** and do not merge to feature/lan-local-beta / deploy Cloudflare until all four stages are complete.


## Stage 4 incremental QA — Rank battle + pre-release gates (2026-11-06)

**Code implemented on isolated draft branch. Still NOT approved for production Web/Android/PC.**

- Solo PvE: Rank 0–5 gives +6% max HP and damage per rank (Rank 5 +30%, not compounded).
- Rank 3 dual-type: select a primary type; single-type: choose offense/defense. A 16%-chance proc with 3.5-second cooldown on any successful hit, even if the skill does not match the selected type. Type groups include burn, poison, slow, impact, evasion, guard and healing.
- Rank 4: multiply the active player's final cooldown multiplier by 0.95, after the existing Ability setup.
- Rank 5: hybrid effect every 12 seconds maximum, capped at six nearby enemies, reduced boss damage and triggered by finishing blows. Dual-type Pokémon use the other base type for the additional effect; single-type Pokémon reinforce the chosen specialty.
- Live effects decorate the selected Player's individual Ability object, never G.AbilityFX.FX shared across species.
- Competitive balance guard: Block both Rank stats and active effects in Arena, Champion, Royale, Co-op and Berry Rescue. Rank currently works only for Solo PvE; Mega changed typings do NOT automatically change a selected branch, pending user approval.
- Original Gacha/Rank item and shop logic still use the independently versioned Stage 1-3 QA modules; official source game compilation has no PokéBox injections.

### Performance/save mitigations

- Reforge pity progress is kept in memory, with flush every 25 eligible kills and at new run; a Prism drop still commits immediately. Flush cannot be transferred across a different save profile.
- Rank fodder candidate listing validates only once per view, avoiding repeated O(n²) work with large boxes.
- The migrated original individual, shiny, favorite, locked or Legendary Pokémon are never automatically consumed.
- More QA is still needed for sudden process death, Android lifecycle interruptions, cloud/local save import, 2–4 trainer soak and in-game Mega transitions.

### Automated QA

- npm run test:pokebox:stage4 covers Stage 1–4: Gacha atomicity, duplicate-only Rank A+C, shop odds, Prism reset, pity, old-save retention, Rank proc/cooldown, multiplayer and Champion isolation.
- The Web QA builder produces dist/pokebox-stage4-qa, with headless Chromium boot/hook tests. The Windows QA builder produces dist/pokebox-stage4-pc-qa and keeps Electron data in PKMSVV-BOX-QA-1, separate from production.
- Android QA uses a separate application ID com.votrivalley.pkmsvv.box4qa0 to avoid overwriting the installed app and its saves. The pinned upstream source became inaccessible; an APK repacking workflow attempts to use the previous successfully signed v1.5.93 APK as a baseline, patch QA-only assets and sign with the same permanent key. A successfully packaged QA APK is not a verified native gameplay test.
- Full public release must rebuild all platforms at the SAME approved commit, retain Android package com.votrivalley.pkmsvv.fulllan with increased versionCode, verify save import/export and old-save game startup, and only then deploy Cloudflare.

### Unresolved release blockers

1. Real device Android UI and scene stability, old save import/export, quota and abrupt termination.
2. Validate Boss/Elite kill attribution, 3/5 effects during fast monster waves and long-session performance.
3. Consider Mega changes to elemental typing, Champion AI balance and per-species unique visual traits.
4. Legendary Rank fodder remains intentionally protected; explicit material/confirm rules still need approval.
5. Keep PR #22 DRAFT and production branch untouched until these checks pass.


## PokéBox Hub UI reorganization — user screenshots (2026-11-06)

**User requirement:** PokéBox replaces the old interactive Pokémon chooser. Pokédex is only an encyclopedia: search species/evolution. Swap their places in the game menu: first card **PokéBox**, next **Pokédex**. PC (support, Mega, Berry) remains unchanged.

**Implemented in Stage 4 isolated QA only. No production deploy or merge.**

- src/pkmsvv-box-hub-ui.js and src/pkmsvv-box-hub.css: new responsive PokéBox with 30 cards/page, name/Dex search, Shiny and Favorite filters, and an animated sprite in the selected individual detail. Animation reuses the game's existing lively/spin/hero sprite options.
- Team of six is persisted as save.pkmsvvTeam6, containing at most six unique individual IDs. Migration initially seeds the active Pokémon and marks it Favorite. Adding a member marks it favorite; direct Rank consumption/shard conversion protects Team6 and Favorites. Team order is preserved, and a separate API allows reordering.
- Viewing a Pokémon is NOT the same as changing the active fighter. Explicit Set Active chooses the fighter. Team6 editing never starts gameplay or changes the active fighter.
- src/pkmsvv-box-hub.js adds atomic individual Mint/Nature, Capsule/Ability and TM consumption; failed commits roll back the Bag and the individual. Original legacy per-species nature/ability/TM save fields are preserved; migrated creatures inherit original TM knowledge until an individual TM list is created. The active fighter's in-game Nature, Ability, TM list, and stat adjustment now read the chosen individual where supported.
- The right-hand PokéBox panel has Details, Items/TM, Rank; the Rank dialog works on the FOCUSED individual even if a different fighter is active. Reforge Prism remains in the Rank dialog.
- Main Bag menu entry redirects to PokéBox Items. Kecleon Shop remains available for buying.
- The separate Pokédex overlay contains name/Dex search, Pokémon sprite, discovered/unowned status, base typing, evolution parents/children and conditions from the existing evolution rule data. Pokédex has NO choose, favorite, Mint, TM or Rank controls.
- Language text is selected from VI/EN. The old Spanish/Vietnamese selected-partner toast from the old chooser is bypassed in the new Hub selection flow.

### QA and release blockers

- npm run test:pokebox:hub checks the six-member cap, favorite and Team6 protection against consuming fodder, individual Nature/Ability/TM, save rollback and runtime per-individual selection.
- Web headless Chromium checks Hub boot/menu and confirms the Pokédex has read-only search with no item actions. Web/PC/Android isolated QA bundles include the new assets.
- Real-device Android landscape and actual Windows gameplay require manual inspection of scrolling, animated sprites, Team6, navigation, items/TMs and Rank. Arena's future pre-battle selection DOES NOT YET read Team6; no Arena logic has been silently changed.
- The original JPTER78 upstream source revision remains inaccessible in full native builds. Android QA repacks and re-signs a verified baseline under a DISTINCT QA application ID; never deploy that APK as an in-place update to the official game.


## PokéBox usability repair — 2026-11-06 (supersedes Stage 3 daily-shop lottery)

**QA branch only. No production release or game save overwrite.**

- Pokédex read-only encyclopedia is placed first in the PC menu; custom Gen 1-inspired red vector Pokédex icon. Filters restored: Gen 1–9, type, rarity, owned/missing/Shiny, favorites, sorting by number/name/rarity/new/used, clear/close and count.
- PokéBox offers Choose Fighter and Favorite immediately on an unmigrated legacy save using existing partner/partnerShiny fields and an override map pkmsvvLegacyFavoriteOverrides, rather than silently migrating. Individual Items, Team 6 and Rank require explicit backup and migration.
- Migration reads persisted pnat[dex] and pabil[dex] first; all old fields are unchanged. Details show Nature +10%/-10% hint, Ability name/description if available, learned TMs and six Nature-adjusted base stats.
- Reforge Prism is a real Kecleon item: icon, inventory count, 6,500 PokéCoins, BUY/PURCHASED/insufficient funds, one per shop day; stock is **always available in QA**, replacing former 12% daily availability. Rare Solo loot odds and 180-KO pity unchanged. The player may buy the Prism before migrating the save; its use still requires a migrated Rank 3 Pokémon.
- Purchase is checked on cloned save data, protects old fields and rolls back if immediate save commit fails. Regression tests updated. Syntax/functional isolated checks passed; **not** a real device gameplay pass.

**Remaining release blockers:** live menu/button and event smoke on actual Web/PC/Android, all Pokémon scroll/filter navigation, old-save import/reload, choose active fighter and start battle, Bag→Shop→Rank purchase/consumption, player progression and crashes, Android orientation, same-commit signed Android and Windows packaging. Keep QA branch unmerged; do not deploy to Cloudflare or release it to players.
