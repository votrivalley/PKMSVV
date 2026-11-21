# PKMSVV — Stage 8: Beam, Nova & Charge (22/11/2026)

**Draft PR #42, QA ONLY** — no production merge, Cloudflare deploy, APK build/sign, PC installer, Save Guardian migration or multiplayer enablement.

## Native source evidence

The ten skills, exact numeric profiles, owner lists and four-step upgrade ladders were extracted from `juanluismm521/pokesurvivor3ds` tag `v1.0.0` (`src/gen/gamedata.cpp`, with mechanics verified against `src/core/combat.cpp`) in [GitHub Actions #44934326733](https://github.com/votrivalley/PKMSVV/actions/runs/44934326733).

| New ID | Type | Kind | Cooldown | Base damage | Native mechanic | Exclusive Dex |
|---|---|---|---:|---:|---|---|
| blue-flare | Fire | beam | 1.60 s | 16.81 | radius 300, width 40, burn 1.5 | Reshiram #643 |
| aeroblast | Flying | beam | 1.30 s | 33.08 | radius 320, width 36 | Lugia #249 |
| moongeist-beam | Ghost | beam | 1.50 s | 34.40 | radius 300, width 44 | Lunala #792 |
| lava-plume | Fire | nova | 1.40 s | 7.09 | speed 220, count 8, pierce 1, life 0.7, size 7, burn 1, puddle 2.5 s and radius 24 | Unrestricted |
| psystrike | Psychic | nova | 1.20 s | 12.26 | speed 300, count 16, pierce 3, life 1.4, size 9, homing 1.2 | Mewtwo #150 |
| origin-pulse | Water | nova | 1.30 s | 21.56 | speed 320, count 10, pierce 4, life 1.3, size 11, knock 60 | Kyogre #382 |
| sparkling-aria | Water | nova | 1.20 s | 15.32 | speed 280, count 14, pierce 2, life 1.4, size 9 | Primarina #730 |
| roar-of-time | Dragon | charge | 2.40 s | 37.64 | radius 330, width 58, charge time 0.8 s | Dialga #483 |
| photon-geyser | Psychic | charge | 2.30 s | 37.21 | radius 320, width 60, charge time 0.7 s | Necrozma #800 |
| dynamax-cannon | Dragon | charge | 2.40 s | 35.28 | radius 340, width 62, charge time 0.8 s | Eternatus #890 |

**Native four-level upgrades:**

- Beam: damage ×1.45; reach + width ×1.3; CD ×0.75; damage ×1.5.
- Nova: +4 projectiles; damage ×1.4; CD ×0.75; +4 projectiles and +1 pierce.
- Charge: damage ×1.45; reach + width ×1.3; wind-up duration ×0.7 and CD ×0.8; damage ×1.5.

## Engine wiring

- `src/pkmsvv-3ds-stage8-beam-nova-charge.js`: append 10 native IDs and upgrade arrays to the Stage2 add-only registry; never overwrite old IDs.
- `scripts/patch-3ds-stage8-beam-nova-charge.cjs`: extends the Stage7 original Web engine dispatch to Beam/Nova; old Web beam wall-clipping and VFX, nova radial bullet movement, original hit/crit/type/weather/status/props remain in service.
- Native `Lava Plume` Nova bullets pass through the Stage6 status adapter, producing one burning-area zone per bullet with its already established 24-field safety cap. Radius, duration, burn, initial hit damage are native source-backed. The public mirror's puddle damage coefficient is an **approximation**, not proven identical to 3DS.
- `src/pkmsvv-3ds-charge-stage8.js`: new field-only delayed Charge as in original FK_CHARGE; keep the caster's CURRENT location and aim during wind-up, then invoke the original Web `beam(owner,m)` function at the deadline. Ghost VFX never fire damage; non-owner and dead casters cannot trigger.
- Web `moves.js` multiplies `charge` when ranking up instead of setting it to an absolute value: Dialga's 0.8-second charge correctly becomes 0.56-second at Lv5, Necrozma's 0.7 becomes 0.49-second.
- For active Co-op, every newly registered native ID remains excluded from the learn pool; network-synchronized authority and replay QA still needed.

## Verified tests

[Stage8 Web shared-source QA #44934593162](https://github.com/votrivalley/PKMSVV/actions/runs/44934593162) **SUCCESS**: Web regression **379 PASS, 0 FAIL, 5 SKIP**; specialist/controller test suite **89 PASS, 0 FAIL**. Source-patch and real Web move-level tests passed: `original=64, added=56, staged=120, productionNew=54`. New Stage8 Charge tests cover delay, single-fire, owner lock, dead owner, ghost and original-beam callback.

The public QA mirror contains only 64 baseline skills (and needs two extra Rapid Spin/Whirlpool IDs absent from that baseline); the documented original PKMSVV catalog is 103. **54/73 genuinely new 3DS IDs staged, 19 remain**, with expected production registry size 157 (103+54), not yet verified by compiling the complete game.

## Remaining 19 IDs

- Homing 3: `moonblast`, `attack-order`, `flower-trick`.
- Cone 2: `blizzard`, `silver-wind`.
- Melee 2: `crunch`, `behemoth-blade`.
- Shove 2: `relic-song`, `clanging-scales`.
- Spin 2: `mortal-spin`, `darkest-lariat`.
- Stun 2: `waterfall`, `dark-void`.
- Tremor 1: `glaciate`.
- Boomerang 1: `secret-sword`.
- Bounce 1: `psyshock`.
- Buff 1: `geomancy`.
- Chain 1: `malignant-chain`.
- Quake 1: `precipice-blades`.

## Release boundary

The pinned full-game upstream `JPTER78/pokesurvivor` commit `11fe868c640b62ac37beacc222e056bc4d9ec892` remains inaccessible to the current CI. All current changes are confined to the GitHub Draft and compile against a public noncommercial Web source mirror. This is **not** a validated PKMSVV Web, Android, or PC runtime build. Pippi, Fusion, Mega, controller, real multiplayer, saved state, crash/performance and in-game end-to-end testing remain mandatory before approval.
