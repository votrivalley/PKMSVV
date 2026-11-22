# PKMSVV full original 176-skill integration — QA handoff

Date: 2026-11-22 UTC. **Draft PR #42, QA only. Do not merge, deploy, sign or migrate live user data.**

## Trusted source recovery

The project's `prepare-game.cjs` pins **JPTER78/pokesurvivor** at `11fe868c640b62ac37beacc222e056bc4d9ec892`; its official remote could not be fetched through GitHub Actions. Its source was recovered from public archival repository `Tpg590/Pokemon` **at the exact same Git commit**, with identical Git tree `0a36feb1d9639efd7383bf30d1bfb08830dd8c6e`.

`scripts/checkout-pinned-upstream.cjs` prioritizes the official author remote and only accepts the archive as fallback when the pinned commit SHA **and** tree object SHA match. It also validates essential Web source files and original required copyright notice. No branch head, replacement gameplay engine or unverified alternate revision may be used.

## Full Web run — verified SUCCESS

[GitHub Actions #45048832143](https://github.com/votrivalley/PKMSVV/actions/runs/45048832143) built original PKMSVV with its existing systems, then added all Stages6–10 after `prepare:game` already integrated Stages1–5.

- **176 move IDs:** base PKMSVV 103, added 73, no duplicate or original ID overwrite. Native move levelups reach Level 5, ownership restrictions preserved, new moves unavailable in active networked Co-op pending authority QA.
- Compiled `app.min.js` with original project builder: **149 scripts**. This is not the separate 64-move public PokéSurvivor technical mirror.
- Web test suite: **379 PASS, 5 SKIP, 0 FAIL**.
- Native skill/controller focused test suite: **100 PASS, 0 FAIL**.
- Auto-cast: **3 PASS, 0 FAIL**; balance: **8 PASS, 0 FAIL**; Save Guardian: **4 PASS, 0 FAIL**.
- Full Web game QA artifact: [#14764517157](https://github.com/votrivalley/PKMSVV/actions/runs/45048832143/artifacts/14764517157), ≈78.6 MB; expiry **2026-11-27 17:20 UTC**.

### Baseline failures explicitly NOT fixed

The prepared original PKMSVV source had four failing tests **before** Stage6–10 and the exact same tests fail after the new native moves. `scripts/qa-v15-baseline-diff.cjs` records the whole TAP inventory before/after, compares all test names and individual statuses, and rejects any new failed test.

- v1.5 (3/149 already failing): LAN menu pixel icon layout, remote human-owned support heals/HP broadcasts, late collection Gacha weight.
- Controller (1/8 already failing): legacy two-key map compatibility.
- Balance (0/8 failing both before and after).

**The full build and integration passed; the legacy baseline is NOT all green.** Do not silently skip these tests; fix them separately with their own before/after guard. Device graphics and long-run crash QA have not been run.

## Platform QA isolation and builds

[GitHub Actions #45049136193](https://github.com/votrivalley/PKMSVV/actions/runs/45049136193) was started to compile two additional downloadable, **non-production** QA artifacts from the same exact pinned source and 176-move scripts.

- **Windows QA:** Electron portable EXE is built after modifying *only ephemeral runner copies* of app ID to `com.ronvotri.pkmsvv.qa`, portable artifact name to include `176-Skill-QA`, and hardcoded `app.getPath('appData')` user data folder to `PKMSVV-176-Skill-QA`. This prevents live installed game save collisions.
- **Android QA:** Capacitor project generates an Android debug APK. After `configure-android.cjs`, `scripts/isolate-3ds-qa-packages.cjs android` changes **Gradle applicationId** by appending `.qa`, and verifies the output APK package ID. It installs side-by-side with the real game and cannot overwrite the real package's private data.
- No Cloudflare Pages publish, no Play Store upload, no signed release, no automatic import of saves.

Only regard a platform build as successful after checking that its job reports **conclusion=success**, its artifact exists, and the isolation validation passed. Device testing, controller, performance, co-op network authority and gameplay still need manual QA prior to release.

## Release safety

Keep this PR Draft. All new native skills are initially solo-only. Preserve Save Guardian and existing live user save schema. Do not merge or deploy until the four baseline bugs are addressed or explicitly triaged, device QA validates Pippi/Mega/Fusion, all 176 moves and mobile performance, and the user explicitly approves a production release.
