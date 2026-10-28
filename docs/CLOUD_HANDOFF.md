# PKMSVV — handoff for Claude / cloud continuation

Updated: 2026-10-28, Asia/Saigon. Working version: **1.5.29 (unreleased)**.

## Active work — v1.5.29 (unreleased)

P0 Issue #7 source implementation and all three CI builds are complete. Read the
full linked v1.5.29 spec. Physical-device QA and old-install save migration remain open.
Do not interpret a build as acceptance of real Android/PC/Web networking.
The final user decision on 2026-10-28 is Wi-Fi-only crossplay: no Internet,
no rented service. PC/Web/APK each run their own Host using local WebRTC.
Manual offer + answer exchange uses QR, text or a file. The Internet room-service
prototype was removed and must not be revived as the default. See
`docs/WIFI_CROSSPLAY.md`. Physical mixed-device Wi-Fi QA remains outstanding.
Do not claim existing historical LAN-only behavior below implements this feature.

### Verified builds and permanent signing — 2026-10-28

All three release workflows passed on the SAME commit **915ba8c678cdc3379f440721ee17f759a1cc3028**:
PC 40565021889, Web 40565021820, Android 40565021872.
Documentation-only commits after this revision do not change these binaries.
Android now produces the verified permanent-key SIGNED-UPDATE, not a debug fallback.
Download links and remaining physical-device/performance limits: docs/QA_V1529.md.

The user explicitly authorized ONE permanent APK signing key (not an API key).
Read the mandatory root AGENTS.md and config/android-signing-identity.json.
All four existing GitHub signing Secrets describe this ONE identity. Never rotate,
regenerate, change app ID, weaken the verifier or publish debug fallback APKs.
The release-only workflow verifies the keystore AND final APK against the pin.

The protected local backup outside Git has now passed DPAPI encrypt/decrypt
roundtrip and keystore certificate verification. A substitute debug key was rejected.
The user explicitly approved encrypted-only password recovery after automatic
review initially rejected the unapproved proposal. Recovery succeeded without
changing the APK key; the temporary transport private key and GitHub branch were
removed. Local DPAPI recovery is bound to this Windows account/machine; use the
private Open-Recovery.cmd helper locally to make an independent password-manager
backup. Never print credentials or commit private backup material.

Historical inspection: supplied Downloads APK was 1.5.27 / 1005027; run
40486676126 was 1.5.28 / 1005028. Their debug certificates differ from each other,
from the cached local debug keystore, and from the new permanent release key.
No matching old private keystore was found on GitHub. A verified JSON save
migration is still required for old debug installs; do not uninstall/clear the
user's old app. The user says these APKs have not been shared publicly.

## Permanent publishing rule — Android (DO NOT OVERRIDE)

Every Android APK delivered to players as an **update** MUST use the same
`com.votrivalley.pkmsvv.fulllan` application ID, a strictly higher versionCode,
and the **persistent protected release signing keystore** stored in GitHub Actions
Secrets. Distribute only `PKMSVV-Android-FULL-LAN-SIGNED-UPDATE`; ephemeral
`DEBUG-TEST-ONLY` APKs are CI/debug output and NEVER player updates.
If release secrets are missing, block update publication rather than handing
out a debug APK. Back up player save JSON before any one-time signer migration.
See `docs/ANDROID_UPDATE_SIGNING.md`. Do not commit private .jks or passwords.

Starter-selection invariant: skipping the Chapter 0 story after setting a nickname,
or skipping the personality test, must ALWAYS open the starter Pokémon grid for
players without a chosen starter. No gameplay/menu route should silently treat
a missing starter as a completed onboarding. Regression test:
`tests/starter-onboarding-browser.cjs` in the Android packaging workflow.

## Current continuation — overrides historical 1.5.21 packaging notes below

- 1.5.23 Survival HUD keeps only own HP and a Survival ranking; no opponent HP
  list or duplicate support leaderboard. AI now kites monsters while roaming,
  and receives random normal/trained/elite capped upgrade profiles for Royale.
  Human rescue of a fallen Co-op AI is verified: within 56 px for 3 seconds,
  revives at half HP. Ranking uses compact “Sống” / “Ngủm” statuses.
  The four-minute audit retained 9/9 updated bots; old baseline ended at 209s.
  See LAN_1_5_23.md, docs/qa/survival-ai-1.5.23.json and listed runtime checks.

- Cloud work through `9d62a7d` added a genuine standalone `/ai/` engine with an
  in-memory room bus. Web AI does **not** need PC, Firebase or WebSocket.
- 1.5.22 packages that same engine into Android FULL LAN at `/ai/`, reusing the
  root offline assets. `prepare:android:full-lan` now also compiles this engine;
  allow time for the second build, and do not run vendor-mutating builds together.
- Android Co-op opens the shared three-mode menu. Its main menu click handler
  must call `PKMSVVCoop.open`, not `PKMSVVOpenAndroidLan` directly. The dialog
  installs even if offline game omits `G.MultiplayerUI`.
- Choosing AI routes to `/ai/` **before** checking the Android native bridge.
  Only human Host/Join actions invoke the native LAN picker with `{role,mode}`.
- Standalone bots randomize over the game dex, avoid duplicate species, and are
  removed after finishing a round, matching PC lobby lifecycle.
- Independent human LAN hosting on a phone or static website is still absent.
  Their Host action creates a room on the selected PC Host; showing a button is
  not evidence of a native Android/serverless Web transport Host.
- `tests/coop-platform-browser.cjs` starts from the actual Web/Android packaged
  menu, checks all three cards, enters real local AI gameplay, exercises match
  checkpoints and a second round. Android native dispatch is mocked in browser;
  this does not substitute for physical-device Wi-Fi QA.

Historical notes below describe 1.5.21 and must not override this section.
Repository: https://github.com/votrivalley/PKMSVV
Working branch: **feature/lan-local-beta**. Keep `main` untouched pending QA.

## First action: verify source before editing

Read this document, `package.json`, and `docs/LAN_1_5_18.md` through
`docs/LAN_1_5_21.md` (1.5.18 is `docs/LAN_AI_1_5_18.md`).
Run `git status --short`, `git log -8 --oneline`, and check your branch.
Do not assume an older GitHub head contains the current gameplay fixes.

The following local gameplay commits must be present in your history:

- `365371a`: real engine AI combat, terrain-aware navigation, legal automatic rewards.
- `a74ca0a`: clean completed AI rounds, random species, Egg Rush without PvP.
- `0b0d874`: independent Royale, support eggs, minute eggs, respawns, targeted kicks.
- `8285f2f`: natural nearby Co-op AI and individual two-support teams.

The subsequent release-preparation commit adds this handoff, versioned APK
metadata, web build metadata, and refreshed PWA cache names. Identify that commit
from `git log`; a document cannot contain its own commit hash.

At preparation time GitHub was still at `b8561f3`, while local source had the four
commits above. The connector returned `allforusers` with `push:false`; local Git
push was denied to `RVTGMzz`. User is reconnecting `votrivalley`. **Only a verified
remote branch head confirms synchronization.** Read `RELEASE-1.5.21.txt` supplied
with the download for the final local/remote IDs and upload status.

If GitHub is older, import the supplied source bundle first, in a new clone:

```sh
git clone -b feature/lan-local-beta PKMSVV-1.5.21-source.bundle PKMSVV
cd PKMSVV
git remote set-url origin https://github.com/votrivalley/PKMSVV.git
git fetch origin
# Review divergence before a normal fast-forward push. Never force push.
git push origin feature/lan-local-beta
```

Alternatively use the source ZIP (tracked files only) for review, or apply the
cumulative source.patch onto `b8561f3` with `git am`. Do not apply the patch if its
commits are already present. Release downloads are not committed into Git.

## User requirements implemented

- **Sống Sót / Co-op (2–4)**: bots move naturally near the group without rigid
  following or standing on top of the host. Each person and bot independently
  collects/incubates up to **2 own support Pokémon**. Supports follow and affect
  their owner only. Bots still fight, evade, collect eggs and prioritize rescue.
- **Sống Còn / Royale (2–10)**: last survivor; safe spread-out starts, independent
  AI roaming and spacing. Eggs/incubation stay enabled; max **2 own supports**
  per participant. Do not change this mode to Co-op following or Egg Rush respawn.
- **Tranh Trứng / Egg Rush (4)**: one egg at minute 1, then one randomly placed
  safe egg every 60 seconds, with announcement and directional HUD guidance.
  No old two-egg ceiling, six-egg victory or finite respawn count. Match lasts
  12 minutes; highest score wins. Respawn after **8 seconds**, half health and
  2 seconds invulnerability. **No damage between players/bots.** Environment and
  enemies still damage participants. Do not re-enable PvP.
- Bots use actual host `Player` engine abilities, damage, cooldowns and terrain
  rules. They choose from legal `G.LevelUp.offer` rewards, respecting move limits
  and Pokémon stats. Dead bots also acknowledge choices to prevent level-up lock.
- Random AI selects from committed roster of 966 playable species, including
  87 legendary/mythical entries. It avoids duplicates unless explicitly chosen.
  Level 1 is the match starting level; species stats are not copied from host.
- Host can kick a specific human/bot in the open lobby (not self), and choose a
  Pokémon species for a new AI or leave blank for random. Guests cannot kick.
- Finishing a match removes old bots, retains humans and reopens the lobby.
  Changing mode leaves/creates the right room instead of reusing a stale match.
- PC IP join has bounded health/load timeouts and retry; compiled LAN mode marker
  survives bundling. Original Pokémon mode cards restored. Menu capped at 30 FPS,
  gameplay at 60 FPS; Fast Start ZIP avoids portable EXE extraction on each launch.

## Important architecture and limits

- LAN simulation/game content is served by the **PC LAN Host 1.5.21**. Android
  and static web/PWA join that Host. Neither static hosting nor the APK turns a
  phone into a standalone native LAN transport Host. Do not promise this feature.
- Web and Android include complete offline solo game assets and a LAN entry UI.
  New LAN AI rules execute in PC-served LAN content, not the offline solo module.
- Keep save keys/origins intact. Different web domains, installed PWA, Android
  offline and LAN host can have separate saves; use existing JSON export/import.
- Android FULL LAN identity is `com.votrivalley.pkmsvv.fulllan`, separate from
  the original offline app. Debug signing keys may differ between build machines;
  export saves before replacing an installed build. Do not silently delete saves.
- No confirmed physical PC/Android Wi-Fi QA yet. Browser/engine multi-context
  tests and Windows executable checks on one PC do not prove cross-device LAN.

## Reproducible builds

Use Node 22 and fetch exact upstream commit:

```sh
npm install --no-audit --no-fund
git init vendor/pokesurvivor
git -C vendor/pokesurvivor remote add origin https://github.com/JPTER78/pokesurvivor.git
git -C vendor/pokesurvivor fetch --depth 1 origin 11fe868c640b62ac37beacc222e056bc4d9ec892
git -C vendor/pokesurvivor checkout --detach FETCH_HEAD
```

Patch scripts require clean upstream. Before **each independent** `prepare:game`,
`prepare:lan` or `prepare:cloudflare`, restore tracked upstream files:
`git -C vendor/pokesurvivor restore --worktree .`. Do not restore the main repo.
Do not run these builds simultaneously; they mutate the same upstream checkout.

- Web: `npm run prepare:cloudflare`, then `npm run test:cloudflare`.
  Deploy **contents of `dist/cloudflare` at site root**; `index.html`, `_headers`
  and `game/` must be at the deployment root, not inside an extra wrapper folder.
  Keep existing domain to retain browser saves. Static HTTPS hosting is required
  for PWA. `build-info.json` includes version and source revision.
- Android: follow `.github/workflows/build-android-full-lan.yml` exactly; JDK 21,
  Android platform/build-tools 36. `prepare:game`, `prepare:icons`,
  `prepare:android`, `test:android`, `prepare:android:full-lan`,
  `test:android:full-lan`, `npx cap add android`, `npx cap sync android`,
  `configure-android.cjs`, `configure-android-full-lan.cjs`,
  `apply-android-icons.cjs`, then the release-only signing steps and Gradle `:app:assembleRelease` in that workflow.
  The FULL LAN preparation changes tracked `capacitor.config.json`; restore it
  afterwards. Release APK filename and native version come from package.json.
- PC: `npm run prepare:lan`; use `lan-win.json`. Existing Fast Start 1.5.21 ZIP
  contains the unpacked Windows app; extract the whole ZIP before running EXE.

## Verification and next work

Completed before this packaging turn: 86 LAN/shared/egg unit tests; compiled
runtime checks `lan-ai-runtime.cjs`, `lan-rounds-runtime.cjs`,
`lan-mode-features-runtime.cjs`, `lan-coop-runtime.cjs`; PC UI/EXE smoke tests.
Packaging validation and actual deliverable status are in `RELEASE-1.5.21.txt`.
Do not confuse source-level checks, successful APK assembly and physical-device QA.

Next priority: play a complete match of each mode on a real PC plus Android on
the same Wi-Fi. Verify IP failure/retry, legal AI reward progression, water
avoidance, per-owner supports, recurring Egg Rush nests/respawn, final scoring,
return to lobby, then immediately start a second round and change modes.
Profile PC slowdowns using reproducible scenes before changing simulation rules.
Keep all fixes on LAN beta until this QA is complete.

## v1.5.24 — global first-run flow, single-source platform invariant

The rule is shared by PC LAN, Cloudflare HTML5 and Android FULL LAN: if the
player has no starter, neither skipping Chapter 0 (including after nickname)
nor skipping the personality questionnaire can bypass the starter grid.
Explicit starter selection must be committed and stored in the owned roster
before gameplay/menu access. All three workflows gate packaging on the SAME
`tests/starter-onboarding-browser.cjs` with different build roots. The Android
landscape CSS display/pointer-events fix remains scoped exclusively to
`src/android/compact-landscape.css`; never fork gameplay onboarding by platform.
Use PC Fast Start as the primary Windows delivery.

Android update distribution ALWAYS requires stable signing, same package ID
`com.votrivalley.pkmsvv.fulllan`, and increasing versionCode (1.5.24 -> 1005024).
Without protected stable signing secrets, a debug artifact is NOT an installable
upgrade to an existing release. Never advise uninstalling before save backup.
