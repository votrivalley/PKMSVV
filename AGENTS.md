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

- Maximum Rank is **5** and the player must confirm each upgrade. Rank N -> N+1
  costs exactly **ONE** additional same-species individual or same-species Rank
  shard. Never silently restore the old escalating material costs 1+2+3+4+5.
- Normal and Shiny variants share the **same species Rank**. A second saved
  Shiny form may count as one **non-destructive, single-use Rank credit**;
  its unique instance ID must be journaled on the save so it cannot be claimed
  twice or farmed by changing selection. Never delete a Shiny or migrated
  original, or auto-consume anything during Gacha.
- An ordinary eligible disposable copy may be consumed only with an explicit
  confirmation and atomic save commit. Favorite, locked and six-member Ready
  Team Pokémon remain protected; Rank operations must retain owned/shiny,
  Mega, Berry, tickets and prior upgrades. Failed save writes fully roll back.
- In PokéBox, count **all currently stored individuals**, but display the ×N
  badge only for **N >= 2**. Clearly differentiate actual ordinary consumable
  copies, safe Shiny credits, and Rank shards from mere form counts.
- Keep **Chọn ra trận / Yêu thích / Đội hình** together ABOVE the Pokémon
  portrait in the RIGHT details pane on all three platforms. Keyboard/controller
  must reach these actions and the Rank confirmation dialog.
- Old saves may have only one Normal/one Shiny record per species (no historic
  Gacha duplicate ledger). Do not fabricate lost historical pulls or require
  "backing up" on every Rank upgrade. One-time conversion to PokéBox is an
  explicit, save-safe action after creating an external JSON backup.
- Gate merges/releases on regression tests for 0→5 per-copy Rank progression,
  normal/shiny shared Rank, Shiny one-time credit, invalid/reused source IDs,
  save rollback, no ×1 badge, and correct focused-species Rank dialogs.
