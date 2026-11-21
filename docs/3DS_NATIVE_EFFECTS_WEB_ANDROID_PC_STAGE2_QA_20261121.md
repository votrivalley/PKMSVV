# PKMSVV 3DS effects → Web / Android / PC — Stage 2

Source branch: `feature/web-3ds-skill-effects-passives-qa-20261121`, PR #42 **Draft**. No merge, Cloudflare deployment, APK signing, PC release or permanent save migration.

## Corrected source inventory — 176 native 3DS vs 103 PKMSVV

The full 3DS generated registry (13 November update) has **176 moves / 37 kinds**; PKMSVV `docs/SKILL_BALANCE.md` has **103 moves / 23 kinds**. All 103 PKMSVV IDs are already present in 3DS with identical attack kind; **73 additional 3DS IDs** are absent. The authoritative read-only audit is `docs/3DS_176_MOVES_73_MISSING_AUDIT_20261121.md` ([GitHub Actions #44896296990](https://github.com/votrivalley/PKMSVV/actions/runs/44896296990)).

**Release-safe register behavior on the real 103-skill game:**

| Move | Present in original PKMSVV 103? | What this Draft does |
| --- | --- | --- |
| Rapid Spin | YES; `spin` | Preserve original skill, stats, behavior, save ID and multiplayer pool; never register a duplicate |
| Whirlpool | YES; `vortex` | Preserve original skill, stats, behavior, save ID and multiplayer pool; never register a duplicate |
| Magnitude | YES; `quake` | Preserve existing forward shockwave family; do not overwrite |
| **Earthquake** | NO | Register new `tremor` skill: radial 0.55-second expanding earthquake wave, one hit per enemy / prop, knockback, pixel ground ripples |
| **Surf** | NO as independent ID | Register new `wave` skill: wide water wall moving forward, each target damaged once, weak boss push and water foam FX; old Bubble→Surf evolution retained |

The shared patcher now routes **only the newly registered move IDs** to the native-style effect module. New IDs are excluded from multiplayer pools pending authority/replay testing. The battle engine and `G.PKMSVVBalance` retain all 103 original skill behavior and stats. In a 103-skill source checkout the Draft adds **exactly two IDs** (`earthquake`, `surf`), not four.

## Source structure

- `src/pkmsvv-3ds-move-families.js`: data / upgrades / solo-only rollout, no duplicate IDs
- `src/pkmsvv-3ds-combat-families.js`: actual hit/pull/time behavior, 3DS-inspired pixel-art FX via existing `G.FX`
- `scripts/patch-3ds-move-families.cjs`: exact-match source patching of `js/systems/combat.js`, load order in `dev.html`
- `tests/3ds-move-families-shared.test.cjs`: functional hit, quake boundaries, pulling, boss, ghost/no-damage, FX and field-limit tests

**Online/multiplayer:** the learnable pool hides the three additions while `G.Coop.active` is true. Existing skills remain available. Remote ghost casts are visual only. No networked gameplay parity is claimed until explicit host/client authority QA.

## Automated verification

[Actions #44894473836](https://github.com/votrivalley/PKMSVV/actions/runs/44894473836) **SUCCESS** on commit `eb6a88a71fa7e8ba97c8bc4ce9626a453d8b3a49`:
- General Web suite: 384 total, 379 pass, 5 conditional skips, **0 fail**.
- Focused passive + actual combat family + controller suite: **17 pass, 0 fail**.
- Structural source patch smoke: both passive FX and three combat families install on public Web mirror JS and pass Node syntax checks.
- No production server, published Web client, Android APK or Electron executable was updated.

## Real full-game build blocker

The *actual* PKMSVV game preparation is pinned to JPTER78/pokesurvivor commit `11fe868c640b62ac37beacc222e056bc4d9ec892`. GitHub Actions currently cannot fetch this original upstream (authentication required). The public `botgm/PokeSurvivor` mirror at `3959a3f19c1c9842e860595317d792ae09572846` differs; complete `scripts/prepare-game.cjs` fails closed on an unrelated `spawner.js` anchor. Do **not** change game-spawn logic to accommodate the mirror or declare a complete release from it. A standalone mirror-engine compile can verify new effect source/bundling only, not full PKMSVV packaging.

## Remaining release gates

- Restore access to exact pinned upstream or establish an owner-approved, tested source migration.
- Full rebuilt client from `prepare-game.cjs` and `prepare:web` against that source, Windows and Android packaging with original signing identity, no save key changes.
- Chromium and native Android/Windows runtime gameplay, performance at 8 AUTO skills, 1.5× solo, long-duration FPS/stability, device input and safe save/reload.
- Test offline solo skill rarity/progression; then separately QA networking and enable only newly added move IDs in multiplayer after deterministic synchronization.
- Prioritize and adapt the **71 additional skill IDs still absent** (73 new source IDs minus the two currently in Draft), with 14 missing effect families and status behavior requiring new runtime support.

**No deployment / merge / signed APK is authorized by this QA.**

## Isolated browser-engine compilation result (not the PKMSVV release)

[Mirror-engine Actions #44894671170](https://github.com/votrivalley/PKMSVV/actions/runs/44894671170) **SUCCESS** on the independently pinned public-mirror snapshot `3959a3f19c1c9842e860595317d792ae09572846`. It applies both source-level stage-1 and stage-2 patches, then invokes upstream `tools/build.js --sin-seo --expose` to create real `index.html` and minified `js/app.min.js`. The compiled JavaScript passes syntax checks and contains Rapid Spin, Earthquake, Whirlpool and the native combat FX module.

GitHub artifact [PKMSVV-3DS-SKILL-EFFECTS-MIRROR-TECH-DEMO-QA](https://github.com/votrivalley/PKMSVV/actions/runs/44894671170/artifacts/14703293149) (67,111,215 bytes; expires 2026-11-26) is **only an isolated browser-engine demo, not a full PKMSVV save-compatible game**. Do not put it over the main website, Android package or PC build. This isolated compile does not remove the upstream-source release blocker listed above.

## Stage 2.1 — Surf from native K_WAVE (2026-11-21)

**Surf already existed in older Web move data ONLY as the evolution display name of Bubble (`'bubble': ['Surf', 'spd']`).** That previous mechanic was a boosted *nova*, not the distinct native 3DS moving-water wave. To keep existing evolution and saves valid, this branch registers a NEW learnable Water move `id:'surf'`, `kind:'wave'` without touching `js/data/moves.js` or changing the old Bubble evolution ID. The gameplay family is adapted from 3DS native `combat.cpp` `K_WAVE` / `FK_WAVE`:

- Broad 124px wave begins 50px behind player, moves forward at 280px/s, with base travel 260px (210+50), one hit per distinct enemy and one hit per destructible object, including damage type and original Web combat critical/passive calculations.
- Pushes ordinary enemy at 75% of wave step; boss/judge at 15% (same relative values as native 3DS), skips pushing an enemy into a wall and respects Arceus protection.
- Low-FPS sweeping collision uses small movement substeps to avoid tunneling; water palette, animated foam crest and drop pixels, camera-cull, maximum 3 simultaneously active Surf fields per player.
- Surf upgrades: wider (+20%) → more damage (+35%) → farther (+20%) → faster (+15%) and cooldown reduction (-20%). Solo Water type pool; Co-op active pool excludes the new family pending network QA.
- No APK, EXE or hosted Web release was issued.

[GitHub Actions QA #44895685511](https://github.com/votrivalley/PKMSVV/actions/runs/44895685511) **SUCCESS**: `npm run test:web` **379 pass / 0 fail / 5 conditional skipped**; targeted passive/combat/controller tests **20/20 pass** (3 Surf-specific new tests); actual public Web JS source patches and syntax checks passed, including `case 'wave':`.

## Corrected Stage 2.2 verification — 2026-11-21

[Actions #44896468385](https://github.com/votrivalley/PKMSVV/actions/runs/44896468385) SUCCESS: **379/384 Web tests PASS, 5 SKIP, 22/22 dedicated tests PASS**. Confirms no duplicate Rapid Spin/Whirlpool, safe Co-op pool, native Earthquake expanding TREMOR vs existing Magnitude QUAKE, Surf and legacy Bubble compatibility, source patch.

[Mirror compiled engine #44896468430](https://github.com/votrivalley/PKMSVV/actions/runs/44896468430) SUCCESS, artifact [tech demo](https://github.com/votrivalley/PKMSVV/actions/runs/44896468430/artifacts/14704636030). This is **not** a full PKMSVV release; the pinned primary Web source remains inaccessible.
