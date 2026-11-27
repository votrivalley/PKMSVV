# PKMSVV — Stage 9: native Homing, Cone, Melee, Boomerang & Chain (22/11/2026)

**PR #42 DRAFT / QA ONLY** — no merge, deploy, Android signing, Windows release, live save migration or multiplayer enablement.

## Source of truth

All nine MoveDef numeric profiles and their four-step kind ladders were extracted from `juanluismm521/pokesurvivor3ds` **v1.0.0** (`src/gen/gamedata.cpp`) and cross-checked with native combat (`src/core/combat.cpp`). [Native extraction #45023655923 — SUCCESS](https://github.com/votrivalley/PKMSVV/actions/runs/45023655923).

| ID | Kind | Type | CD (s) | Base DMG | Native extras / exclusive Dex |
| --- | --- | --- | ---: | ---: | --- |
| moonblast | homing | Fairy | 0.80 | 7.61 | 1 tracking shot; splash radius 56 at 60% primary damage |
| attack-order | homing | Bug | 0.75 | 22.69 | 4 tracking shots; Vespiquen #416 only |
| flower-trick | homing | Grass | 0.80 | 22.54 | 4 tracking shots; +50% skill-local crit chance; Meowscarada #908 only |
| blizzard | cone | Ice | 0.90 | 15.74 | 9 short cone shots; slow 0.55 |
| silver-wind | cone | Bug | 0.75 | 10.60 | 8 short cone shots; 15% cast chance of +8% ATK/+8% SPD for 6s, up to 3 stacks |
| crunch | melee | Dark | 1.00 | 16.74 | 63 radius / 1.38 arc; 4s shred, direct damage to target +25% |
| behemoth-blade | melee | Steel | 0.90 | 24.82 | 88 radius / 3.0 arc; Zacian #888 only |
| secret-sword | boomerang | Fighting | 0.85 | 11.70 | 2 returning blades, speed 360, reach 240; Keldeo #647 only |
| malignant-chain | chain | Poison | 1.00 | 34.30 | 6 chain targets, radius 150, poison 2; Pecharunt #1025 only |

## Exact native rank ladders (Lv2–Lv5)

- **Homing:** +1 projectile and 30% more **spread** (not size); +45% damage; -25% CD; +1 projectile and +40% damage.
- **Cone:** +3 shots; +40% damage; +30% **life** (travel range); +3 shots and +1 pierce.
- **Melee:** +40% damage; +25% radius; -25% CD; final arc full 360° (native 9.0) and +50% damage. In the Web multiplier registry, the arc receives a move-specific factor `9/baseArc`, preserving the native final arc.
- **Boomerang:** +1 return blade; +45% damage; +30% reach; +1 blade and +40% damage.
- **Chain:** +2 hops; +45% damage; -25% CD; +2 hops and +40% damage.

## Implementation boundary

- `src/pkmsvv-3ds-stage9-homing-cone-melee.js` appends the nine source-verified skill IDs, never overwrites existing IDs, requires exclusive owners and preserves the existing solo-only Co-op gate.
- `scripts/patch-3ds-stage9-homing-cone-melee.cjs` reuses original Web target validation, swept homing projectile collisions, actual wall/prop damage, cone shots, melee hits, boomerang return and chain hops. The single new Homing dispatch points to the existing projectile function.
- Moonblast splash is non-recursive, excludes the primary target and deals 60% of primary final damage to neighboring enemies. Flower Trick crit boost applies to its own projectile only; original Stage1 crit passives and Stage6 native projectile extras stay operational.
- Silver Wind buffs ATK/SPD only on an actual cast, never during a ghost visual replay. Crunch shred uses `dt`-based duration on enemies and increases direct melee/projectile damage, without changing 103 legacy move definitions. The Web approximation does not prove exact parity for all game-specific abilities/status interactions; in-game QA still required.
- Preserve `G.PKMSVV3DSStage6ProjectileFX.payload` and Stage1 bonus crit chain; do not bypass the previously working adapters.

## CI evidence

- [Shared Web source regressions #45024214274](https://github.com/votrivalley/PKMSVV/actions/runs/45024214274) **SUCCESS**: 379 Web PASS / 5 SKIP / 0 FAIL; 94 focused + controller PASS / 0 FAIL; patched mirror registry test **base 64 + added 65 = 129**. Two of those 65 additions are QA-mirror-only Rapid Spin/Whirlpool IDs that PKMSVV already has; genuine new 3DS IDs in original PKMSVV would be **63**.
- [Compiled isolated Web-mirror engine #45024214222](https://github.com/votrivalley/PKMSVV/actions/runs/45024214222) **SUCCESS**: technical artifact [#14754554341](https://github.com/votrivalley/PKMSVV/actions/runs/45024214222/artifacts/14754554341), approximately 67MB, expires 27 Nov 2026; **NOT a full PKMSVV game**.
- Full PKMSVV original source remains pinned to currently inaccessible `JPTER78/pokesurvivor` revision `11fe868c640b62ac37beacc222e056bc4d9ec892`. Do not substitute the public `botgm/PokeSurvivor` QA mirror for production, skip identity checks or claim Web/Android/Windows end-to-end QA.

## Progress

- **63/73 real missing 3DS IDs staged**, expected actual PKMSVV full registry `103+63=166` once original source is recovered; this production figure is theoretical, not compiled.
- **10 remaining:** Shove 2 (`relic-song`, `clanging-scales`), Spin 2 (`mortal-spin`, `darkest-lariat`), Stun 2 (`waterfall`, `dark-void`), Tremor 1 (`glaciate`), Bounce 1 (`psyshock`), Buff 1 (`geomancy`), Quake 1 (`precipice-blades`).
- Stage10 needs real damage/status/field mechanics (especially Stun, Bounce and Geomancy), not just 10 registry entries. QA Pippi/Mega/Fusion/network authority/performance/save/reload still mandatory.
