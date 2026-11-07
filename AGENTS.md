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
  prevent double credit. Ordinary unprotected fodder is consumed only with
  explicit confirmation. Repeated Gacha never silently ranks up.
- Normal and Shiny share the same species Rank. Keep owned/shiny, tickets,
  Berry, Mega, personal upgrades and team when ranking. Roll back all writes
  if commit fails. Never manufacture historical Gacha pulls absent in JSON.
- The PokéBox ×N badge shows TOTAL stored individuals (Normal and Shiny):
  **singleton: no badge; two stored: ×2; three stored: ×3**. Rank materials
  already credited are shown separately.
- Keep the three primary actions Chọn ra trận / Yêu thích / Vào đội hình
  ABOVE the Pokémon portrait; support controller, keyboard and touch.
- Preserve one-time safe backup/migration of legacy saves, but do not force
  a backup for each Rank upgrade. If Rank modal unavailable, show working
  material selection fallback rather than an inert button.
- Gate releases on tests: costs 1+2+3+4+5, Team/Favorite/Shiny safe
  credits counted once, rollback, no singleton badge, focused #191/#070 Rank
  interactions and Controller-B/Escape modal closing.

## Region and prebattle acceptance — November 2026

- Normal Chơi ngay Kanto/Johto/etc. must use the SAME Gacha generation
  catalogue (`G.DEX[].gen` + sprite eligibility), not arbitrary hardcoded
  pools. Native waves, custom spawns, mini-boss and ordinary bosses obey Gen.
  Exempt only explicitly marked story-only bosses. No leak into Arena or Co-op.
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
  asks for one explicit confirmation; no checkbox/item-shard conversion UI.
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

- In normal `Chơi ngay` with a selected Region, species from **every**
  wild, scripted event, rift, miniboss and non-story boss must pass the
  **same Gacha Gen roster** `G.DEX[].gen` + `G.SPRITE_META`. No mixing in
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
- Keep a tiny QA gameplay badge showing the active Gen and National Dex range
  (e.g. `KANTO · GEN 1 · #0001–0151`); if it is absent in the user's
  screenshot, this QA Region build may not be loaded or active.
- Validate all **1,025** National Dex IDs in tests, plus intentionally
  mis-tagged Gen metadata, foreign bosses, post-Berry delayed startup,
  arrays/Sets/Maps of live enemies, Chromium compiled catalogue, and no
  out-of-Gen sprites after 30+ seconds of play.
