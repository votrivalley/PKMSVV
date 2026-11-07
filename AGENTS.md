# PKMSVV repository rules

## Permanent Android release identity

- The user authorized one permanent FULL LAN Android signing identity on 2026-10-28.
  Its public certificate is pinned in `config/android-signing-identity.json`.
- Never generate, replace or rotate that key, change the pinned fingerprint/alias,
  or change `com.votrivalley.pkmsvv.fulllan` without a new explicit user instruction.
- Use the existing four `PKMSVV_ANDROID_*` Actions Secrets. They describe ONE key,
  not four signing identities. Missing/inconsistent secrets must fail the release.
- Run `scripts/verify-android-signing.cjs` before signing and on the final APK.
  Never weaken/bypass the verifier or tests to accept a different certificate.
- Deliver only `PKMSVV-Android-FULL-LAN-SIGNED-UPDATE` to players. Never publish
  fresh runner debug APKs as updates or create a replacement key to make CI pass.
- Increase the Android versionCode for each subsequent player update, preserving
  save keys and personal ticket/Shiny rules. Keep the same certificate forever.
- The first migration from historical ephemeral debug certificates requires a
  verified JSON save backup before replacing an old app. Never uninstall, clear
  data or claim the new certificate can update those old APKs in place.
- Private backup material is outside this Git repository in a protected sibling
  directory on the owner's machine. Never commit it, log it, expose passwords in
  chat, or upload any keystore/password as a build artifact. See
  `docs/ANDROID_UPDATE_SIGNING.md` for enrollment and recovery boundaries.

## Gameplay and QA

Keep the current maximum of 10 trainers. Read `docs/CLOUD_HANDOFF.md` before
continuing. Preserve offline Wi-Fi hosting and the full existing test suite.


## BẮT BUỘC — Keyboard + controller navigation for EVERY interactive screen

- Treat **keyboard, controller and pointer/touch** as equal first-class inputs on
  Windows, Android and Web. NO new or modified dialog, modal, chooser, Region
  selector, inventory, PokéBox/Pokédex, gacha, pause, rank, Berry, Arena or
  story option may be mouse/touch-only. This is a release-blocking QA gate.
- Every visible actionable option must be reachable with **Tab / Shift+Tab** and
  **arrow keys or WASD**, and the active option must have a **high-contrast,
  visible focus border**. Focus must never go behind the highest open overlay.
  Focus must move/scroll the selected control into view when needed, including
  offscreen panels. Do not steal keyboard input while typing into a text field.
- Default controller scheme: **D-pad or left stick = move focus; A / Cross =
  confirm; B / Circle = back/close**. Respect current user bindings when
  available. Back must dismiss ONLY the highest modal and must not destroy
  saves, exit a match accidentally or award duplicate rewards. Avoid repeated
  selection while A is held; allow repeated direction navigation after delay.
- Numeric hints are contracts: **[1] and [2] choose item options; [3] skips
  the newly dropped item (keeps the old one)**, including Numpad 3.
  Implement real key handlers — never draw labels for non-working keys.
  The cancel/skip choice must invoke the SAME existing callback as clicking
  its button, exactly once, without changing the player's reward/save logic.
- For **any new modal**: install native keyboard focus, arrow navigation,
  controller focus, confirm, back, restore focus on close and a visible focus
  style. Avoid rebinding the same handler on every render; never poll inputs
  during gameplay unless a dialog is actually active.
- Before merging or shipping, perform real Chromium and native QA: open each
  option picker **without mouse/touch**, move across every row and column with
  D-pad/arrow keys, confirm and cancel, test keyboard Digit3 and Numpad3,
  long lists that scroll, gamepad button hold/release, no input leaking into
  underlying gameplay and reopening a modal. Do this on **Web, Windows and
  Android gamepad**; a unit-only pass does not replace device validation.
- QA input implementation: `src/pkmsvv-modal-navigation-qa.js` +
  `src/pkmsvv-modal-navigation-qa.css`, with a Web Chromium smoke test.
  Apply fixes to reusable shared UI/navigation code; do not add fragile
  one-off bindings per platform. Preserve offline LAN, existing save keys
  and Android signing identity.



## BẮT BUỘC — PokéBox Rank / same-species copies

- MAX Rank 5. APPROVED cost escalation is **0→1:1; 1→2:2;
  2→3:3; 3→4:4; 4→5:5 MORE same-species copies or matching Rank shards**.
  Never change this to flat one copy per upgrade. User explicitly corrected it.
- Every additional saved same-species Pokémon can count once for Rank,
  including shiny/legacy/team/favorite. Protected Pokémon stay intact; save
  the unique IDs of claimed protected duplicates in an atomic transaction to
  prevent double credit. Ordinary unprotected fodder is consumed only on the player's explicit **Nâng Rank click**; do not add a second browser confirmation popup. Repeated Gacha never silently ranks up.
- Normal and Shiny share the same species Rank. Keep owned/shiny, tickets,
  Berry, Mega, personal upgrades and team when ranking. Roll back all writes
  if commit fails. Never manufacture historical Gacha pulls absent in JSON.
- The PokéBox ×N badge shows TOTAL stored individuals (Normal and Shiny):
  **singleton: no badge; two stored: ×2; three stored: ×3**. Rank materials
  already credited are shown separately.
- Keep the three primary actions Chọn ra trận / Yêu thích / Vào đội hình
  ABOVE the Pokémon portrait; support controller, keyboard and touch.
- Preserve one-time safe backup/migration of legacy saves, but do not force
  a backup for each Rank upgrade. Rank needs no extra modal or material checkbox: the main panel's **Nâng Rank** click atomically uses stored eligible duplicates and immediately refreshes the full PokéBox.
- Gate releases on tests: costs 1+2+3+4+5, Team/Favorite/Shiny safe
  credits counted once, rollback, no singleton badge, focused #191/#070 Rank
  interactions and Controller-B/Escape modal closing.

## Region and prebattle acceptance — November 2026

- Normal Chơi ngay Kanto/Johto/etc. must use the SAME Gacha generation
  catalogue (`G.DEX[].gen` + sprite eligibility), not arbitrary hardcoded
  pools. Native waves, custom spawns, mini-boss and ordinary bosses obey Gen.
  Even scripted hostile bosses must respect the selected freeplay Region. No leak into Arena or Co-op.
- Arena Pokémon selection: 10 seconds, Solo AI/Champion may start early
  on own confirmation. Real-human Arena only starts early after ALL human
  participants confirm, with Host-authoritative timer/ready packets. Otherwise
  auto-advance at time expiry. No NPC blocks human ready.
- Berry selection: 10 seconds, Solo Confirm/No Berry skips instantly;
  multiplayer early-skip only when ALL human participants confirm, otherwise
  advance on timeout. No duplicate callback, no early death, no stock loss
  if startRun fails.
- QA builds must contain the actual modified Berry/Arena scripts; DO NOT
  claim the changes are tested in PC/APK/Web when using an older compiled
  v1.5.93 baseline missing these modules. Unit-only pass is not device QA.


## PokéBox v5 UX — approved direct implementation (2026-11-07)

- **NO manual \"Đổi bản sao thành Mảnh Rank\" step.** Every genuinely
  persisted duplicate Gacha instance already contributes to its species
  Rank-material balance. The player selects a Pokémon and presses **Nâng Rank**
  once: the game deterministically selects exactly enough saved copies and
  applies the upgrade immediately on that click, **without native confirm()**; no checkbox/item-shard conversion UI.
  Keep legacy shard balances usable as last-resort fallbacks, but do not
  expose `toFragments` as an ordinary upgrade step.
- **Rank cost stays escalating:** 1, then 2, then 3, then 4, then 5 EXTRA
  same-species copies for successive Ranks. Preserve the one-time credit
  ledger for protected Pokémon (Shiny/team/favorite/imported). Do not erase
  protected originals, and do not allow reuse of already-credited IDs if
  their protection status changes. Roll back all changes on failed commit.
- Present clearly framed **BOX 1 / BOX 2 / ...** with left/right navigation
  **above** the six-column Pokémon grid (30 slots per box). Keep Ready Team
  Six white/gold and the three primary actions on top of the right panel.
  Hide `×1` on singleton species; `×2`/ `×3` show stored totals, while
  available unspent materials have their own explicit count.
- The right Pokémon detail panel adapts its accent palette to the actual
  primary Pokémon type (Fire orange-red, Water blue, Electric yellow, Grass
  green, and all other types). Render four horizontal localized stat bars:
  **Máu, Sát thương, Tốc độ, Hồi chiêu** in Vietnamese; HP/Damage/Speed/
  Cooldown in English. Derive values from actual species stats and Rank
  bonuses; never invent a base stat or claim real cooldown effects not in
  the combat engine. Preserve Nature, Ability, TM and Normal/Shiny controls.
- Use only existing game sprites (no image-concept replacement). Feature
  remains isolated QA until browser + Windows + Android and controller
  smoke tests pass. Verify actual compiled artifacts, never just source.


## Region spawn integrity — Kanto regression 2026-11-07

- In normal `Khám phá` with a selected Region, species from **every**
  wild, scripted event, rift, miniboss and non-story boss must pass the
  **same Gacha roster** restricted by canonical National Dex ranges and
  `G.SPRITE_META` (raw `G.DEX[].gen` may be wrong). No mixing in
  Kanto or other single-Gen areas. Mixed Gen is intentional only for Sky.
- A Region must be applied **BEFORE** delegating the selected `startRun`:
  native game logic can cache spawn bags, and Berry's 10-second pre-run
  chooser may defer the real native start. Do not clear a selected Region
  on incidental `G.MenuUI.open()` while that pre-run selection is pending.
  Clear it on explicit run exit and before a new, unselected mode.
- `G.Enemies.bagAt` alone is insufficient. Some scripted/legacy actors
  bypass bag generation or use an earlier Enemy constructor. Keep the
  `G.EnemyMgr.add` enforcement plus a throttled `G.EnemyMgr.update` scan of
  existing actors to correct their displayed species/animator. Never touch
  player/support team, save, boss HP/damage/rewards, or Arena/Co-op rosters.
- Regressions required: delayed Berry start + incidental UI open retains
  Kanto, cached initial waves restricted, manager-bypass actor corrected,
  original boss stats unchanged, explicit exit restores unrestricted roster,
  and the **real compiled Chromium QA bundle** uses the Gacha Gen catalog.
- A green QA artifact is not a public deployment: the official Cloudflare
  website and permanent signed Android app remain unchanged until explicitly
  promoted after real-device/save verification.


## National Pokédex authoritative Gen mapping (2026-11-07)

- External reference for introduction generation and dex numbering:
  https://pokemondb.net/pokedex/national . Generation boundaries MUST remain:
  **Kanto 1–151; Johto 152–251; Hoenn 252–386; Sinnoh 387–493;
  Unova 494–649; Kalos 650–721; Alola 722–809; Galar 810–905;
  Paldea 906–1025**. Sky Pillar is the only intentionally mixed-Gen area.
- NEVER use `G.DEX[].gen` as the sole authority for an enemy's introduction
  generation: that field could be incorrectly tagged. Use the canonical
  **National Dex number + presence in Gacha eligible catalogue + sprite**.
  Do not make Gen membership depend on local biome, type, evolution lineage
  or a Pokémon's latest regional appearance.
- A selected Kanto expedition is **strictly Gen 1 for the entire encounter**,
  including all wilds, random events, rifts, mini-bosses and bosses; no
  story-boss exemption in normal free-play Region runs. Preserve HP, damage,
  rewards, actor type, save, player allies and controller input. Arena and
  Co-op modes remain unaffected.
- No Gacha-eligible species in the requested Gen means an empty wave and a
  visible console diagnostic; do not silently fall back to mixed-Gen monsters.
  Scripts must still work when Gacha metadata is unavailable in a test
  harness, but production eligibility requires sprite-backed catalogue data.
- Do NOT display a Kanto/Gen/National Dex gameplay badge. The user explicitly
  requested a clean HUD (2026-11-07). Debug details belong in console/tests,
  never as a permanent floating overlay on top of gameplay.
- Validate all **1,025** National Dex IDs in tests, plus intentionally
  mis-tagged Gen metadata, foreign bosses, post-Berry delayed startup,
  arrays/Sets/Maps of live enemies, Chromium compiled catalogue, and no
  out-of-Gen sprites after 30+ seconds of play.

## QA UI and Region delivery (2026-11-07 final direction)

- **Nâng Rank** is itself consent: no extra JavaScript `confirm()` popup.
  Render the freshly committed Rank and material balance immediately across
  both left Pokémon cards and right detail without reopening menus. If the
  next Rank lacks enough *unused* eligible duplicates, gray-out the primary
  Rank button, its Rank tab marker and the Rank panel; keep the detail tab
  inspectable. Preserve confirmation only for **separate** purchases such as
  Reforge Prism / irreversible branch changes.
- The **Play launcher** `[data-go="play"]` is **Khám phá** (Explore in
  English); its click still opens the Region selector. The separate collection
  launcher `[data-go="dex"]` MUST remain named **Pokémon** and open
  PokéBox/Pokédex/Nâng cấp. Never add a second "Khám phá" label under Pokémon.
  Preserve native click handlers, accessibility labels and old text-node UI.
- PC: remove the obsolete **Sương Ký Ức / seasonal event** last
  knowledge row. Hide **Skill Awakening / Thức tỉnh kỹ năng** only after
  `G.PKMSVVSkillTrack.progress(save).count >= 8`; keep it for incomplete
  players. Reapply after the native PC repaints, not just on initial mount.
- Keep all shared overlay palettes (PC, PokéBox, Pokédex, Nâng cấp) consistent
  with the main menu's dark teal, pale mint controls, gold headings/borders,
  while preserving Pokémon-specific type colors in the detail hero.
- CRITICAL KANTO START RACE: Berry may wrap `Game.startRun` *after*
  QuickRegion has wrapped it, so choosing a Region may return before the real
  game start callback. Always pin the Region **at card click** and keep it
  active through the 10-second Berry selection, regardless of wrapper order.
  Do not clear `armed` just because `native.click()` returned before
  the delayed start. The wrapper must recognize an already-pinned Region
  without resetting its selection; explicit quit clears it. Regression-test
  both wrapper orders, Game/menu exit and every spawned hostile Gen.


## Exploration wildlife progression — 2026-11-07

- Across **all nine single-Gen Region maps plus mixed-Gen Sky Pillar**,
  wild Pokémon MUST begin as weak/basic forms and grow in variety/strength
  with **minutes elapsed within the active run**. A new run always starts
  at zero (including Berry's pending 10-second choice).
- Base species and low total base stats for minute 0–2; gradually add
  stronger basics (2–4), mid evolutions (4–8), fully evolved/high stats
  (8–12), then unrestricted local species after minute 12. A miniboss may
  favor the stronger part of the **currently permitted** tier; it cannot
  spawn Gyarados, Kangaskhan, Charizard, legendary forms, etc. as opening
  wild encounters or opening mini-bosses.
- Use actual base stats (HP, PA, DF, SA, SD, SPD), rarity and the existing
  `G.PKMSVV_EVOLUTION_DATA.rules` ancestry to calculate tiers; do not
  interpret National Dex order as strength. Keep Gen eligibility separate
  from difficulty eligibility. Never let an in-Gen Pokémon bypass the
  difficulty rule just because its Dex is inside the right numeric range.
- Apply to normal wild bag, direct Enemy constructors, EnemyMgr.add and
  throttled manager integrity scans. Preserve enemy HP/attack/rewards,
  other modes, save data, region lock, actual evolution/loot rates, player
  support, LAN, keyboard and gamepad controls.
- QA must verify: all ten maps start with weak Pokémon; Kanto after ~73s
  contains no #115 Kangaskhan / #130 Gyarados / #150 Mewtwo / fully
  evolved starters; the eligible pool expands after minutes pass; Chromium
  compiled Gacha+sprite data match policy; no visible Gen badge.


## Evolved Fusion gameplay contract — 2026-11-07

- Fusion is a **named evolution of a pair of MAX moves**, not the legacy
  arbitrary two-learned-moves Bond. The only valid ten recipes and WebP names
  are in `G.PKMSVVFusionPilot.RECIPES` and `assets/fusion-icons/`.
  Require **both** source instances `lvl >= def.maxLvl`. No level-one Fusion,
  no arbitrary pair, and do not claim ready from merely owning both moves.
- The player's explicit choice can consume exactly **one Fusion per run**:
  remove exactly two source move instances from `player.moves` AND
  `player.slots`, insert one new evolved skill with its own effect,
  cooldown and max rank, and free one learning slot. Keep unrelated moves,
  active selection, `bind` and per-run state safe. Do not consume account
  currency, delete owned Pokémon or mutate persistent JSON saves.
- Keep **Rift-earned Bonds independent**. Original group-binding mechanics
  still exist for those earned rewards and do NOT award an extra Fusion.
  Never silently make all Bond pairs into special Fusion moves.
- All ten evolved moves require **different real gameplay effects**, not
  just names, icon recolors or FX: persistent fire trail, wave knockback,
  vine pull, electric chain, psychic shock, fire tornado, ice stacking,
  stone/leaf trap, delayed shadow detonation and metal-claw armor break.
  Boss CC must be capped; keep bounded zone counts and cooldown floors.
- Render the exact uploaded WebP icons in **both** DOM recipe cards and
  Canvas skill HUD. Keep controller/keyboard focus in the Fusion selection;
  use the pause action, not a fixed button obscuring combat.
- Treat Fusion scripts, CSS and **all ten** assets as mandatory in the
  separate Web/Windows/Android QA packages. Replace the stale *embedded*
  `G.PKMSVVFusionPilot` module in QA `app.min.js`, rather than loading
  the legacy implementation twice. Fail closed on any missing icon.
- Run `tests/bond-fusion-svv.test.cjs` and real compiled Chromium Fusion
  tests (both MAX conversion and ten actual damaged enemy simulations) as
  **required release gates**. Real device, LAN host/client state sync,
  controls and long-match balance still need manual QA before promoting.
- Never merge this QA feature or publish to production Cloudflare/signed
  Android unless explicitly approved; preserve players' existing save.


## Rank/Dex/Wiki legacy fix — 2026-11-07

- **Legacy saves are not duplicate ledgers.** Old `owned[dex]` is a
  species-ownership flag, and older Gacha results did not retain individual
  IDs. NEVER invent `×2`/materials or auto-convert a save just because the
  user played many Gacha pulls. If `pkmsvvBoxSchema` is absent, explain
  WHY the Rank-ready filter is empty, show a clear one-time **Sao lưu và
  kích hoạt PokéBox** button inside the PokéBox, and keep Rank disabled gray.
- The one-time conversion action is distinct from a Rank click:
  require explicit consent; use `G.PKMSVVSaveUI.backup()` and preserve it at
  `pkmsvv.prepokebox.<offline profile>` before `Box.persistMigration()`.
  Validate commit / rollback, leave owned, Shiny, Team Six, Berry, Mega,
  tickets, Coins, TMs untouched. After conversion, turn off the empty
  Rank-ready filter and render the updated collection immediately. ONLY
  future Gacha summons with saved individual IDs can be counted reliably.
  No silent migration, no automatic deletion.
- A Rank action itself is immediate once enough unused matching saved
  copies exist; button ALWAYS reads **Nâng Rank**, with gold enabled and
  gray disabled states. NEVER show the nonsense disabled label
  "Bật PokéBox để nâng Rank".
- **Ability descriptions must use the real game mechanics**, not the
  third (French) language entry in `G.ABIL[id]`. For both Pokédex and
  PokéBox, use `G.PKMSVVAbilityText.summary(id, mon,
  G.AbilityFX.of(id,mon), english)` and strict foreground contrast:
  dark ink on mint Ability rows and light text on dark Ability info.
  Blaze low-HP +35% Fire; Compound Eyes +6% crit; Solar Power sunshine
  +40% special damage with HP loss. Do not substitute mainline effects
  for this survivor game's actual effect implementation.
- The updated **Fusion Wiki module is a standalone script**, NOT a
  `G.PKMSVVWiki` assignment in QA's compiled `app.min.js`.
  Never append it to `scripts/patch-qa-compiled-modules.cjs` (fails
  Android/Web/Windows builds); instead package updated `src/pkmsvv-wiki.js`
  as `js/ui/pkmsvv-wiki-qa.js` in all three QA builds. It replaces the
  old PC button's `onclick` cleanly and displays all **10 new WebP icons**
  with source pair, MAX+MAX rules and actual Vietnamese/English skill
  effects from `PKMSVVFusionPilot.RECIPES[].viEffect/enEffect`.
- Required regressions: old 966-species saves explain missing Rank records,
  in-Box backup-gated migration works on isolated browser fixture without
  inventing past copies, migrated Gacha duplicates appear in
  **Có thể nâng Rank** and disappear as soon as materials are consumed,
  gray button wording, all 10 real Wiki skill descriptions, high-contrast
  localized abilities, plus existing Web/PC/Android source and smoke tests.
  Keep isolated QA branch: no Cloudflare production deploy or permanent
  `com.votrivalley.pkmsvv.fulllan` APK update until real save QA approval.
