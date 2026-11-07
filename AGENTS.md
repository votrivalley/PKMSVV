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
