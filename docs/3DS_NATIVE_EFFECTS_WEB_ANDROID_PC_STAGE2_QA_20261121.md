# PKMSVV 3DS effects → Web / Android / PC — Stage 2

Source branch: `feature/web-3ds-skill-effects-passives-qa-20261121`, PR #42 **Draft**. No merge, Cloudflare deployment, APK signing, PC release or permanent save migration.

## 3 game mechanics converted from the native 3DS engine

| New move | Native family | Gameplay in shared JavaScript engine | Performance / safety |
| --- | --- | --- | --- |
| Rapid Spin (Normal) | `K_SPIN` | Up to three timed spin hits at base level (more through upgrades), AoE `hit()` damage to enemies and damage to destructible props, rotating slash sprites | 0.13s cadence; field cap 6 per owner |
| Earthquake (Ground) | `K_QUAKE` | Five shockwave positions stepping 34px ahead; each deals actual `blast()` damage and pixel ring/rock FX; terminates at solid tiles | 0.07s step; at most 3 waves/frame; never crosses wall |
| Whirlpool (Water) | `K_VORTEX` | Area placed at target; pulls normal enemies toward center, boss/judge at 25% force, damages at 0.4s interval, Canvas vortex rings/animated wind | 2 active zones max per owner; 80 nearby-enemy cap; max 24 extra fields; camera-cull VFX |

The original 103 Web skills remain unchanged and original `G.PKMSVVBalance` validates/tunes them before the three new entries are registered. The new definitions are added *after* that balance pass. Each gets four upgrades and appears in the appropriate type's learnable pool. New move fields are a separate Web/Android/PC source module, inserted by the common `scripts/prepare-game.cjs` build route.

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
- Test offline solo skill rarity/progression; then separately QA networking and enable three move families in multiplayer only if deterministic.
- Continue converting the other 19 native move families when validated, not just fake effect sprites.

**No deployment / merge / signed APK is authorized by this QA.**

## Isolated browser-engine compilation result (not the PKMSVV release)

[Mirror-engine Actions #44894671170](https://github.com/votrivalley/PKMSVV/actions/runs/44894671170) **SUCCESS** on the independently pinned public-mirror snapshot `3959a3f19c1c9842e860595317d792ae09572846`. It applies both source-level stage-1 and stage-2 patches, then invokes upstream `tools/build.js --sin-seo --expose` to create real `index.html` and minified `js/app.min.js`. The compiled JavaScript passes syntax checks and contains Rapid Spin, Earthquake, Whirlpool and the native combat FX module.

GitHub artifact [PKMSVV-3DS-SKILL-EFFECTS-MIRROR-TECH-DEMO-QA](https://github.com/votrivalley/PKMSVV/actions/runs/44894671170/artifacts/14703293149) (67,111,215 bytes; expires 2026-11-26) is **only an isolated browser-engine demo, not a full PKMSVV save-compatible game**. Do not put it over the main website, Android package or PC build. This isolated compile does not remove the upstream-source release blocker listed above.
