# PKMSVV — Stage 7: Native 3DS Dash + Meteor (22/11/2026)

**Draft PR #42 — isolated source QA only; no merge, deploy or release.**

Native source: `juanluismm521/pokesurvivor3ds` tag `v1.0.0`, `src/gen/gamedata.cpp` and `src/core/combat.cpp`. All ten source profiles and both four-rank ladders extracted by [Actions #44933368536](https://github.com/votrivalley/PKMSVV/actions/runs/44933368536).

| ID | Type | Kind | CD (s) | Base damage | Native parameters | Restricted Dex |
|---|---|---|---:|---:|---|---|
| megahorn | Bug | dash | 1.80 | 41.68 | radius 220, width 40, knock 120 | none |
| dragon-ascent | Flying | dash | 0.90 | 17.61 | radius 175, width 50, knock 100 | Rayquaza #384 |
| volt-tackle | Electric | dash | 0.90 | 22.14 | radius 150, width 44, knock 120 | Pichu #172, Pikachu #25, Raichu #26 |
| meteor-assault | Fighting | dash | 1.10 | 32.74 | radius 180, width 50, knock 140 | Sirfetch'd #865 |
| sunsteel-strike | Steel | dash | 1.00 | 20.33 | radius 170, width 52, knock 120 | Solgaleo #791 |
| sacred-fire | Fire | meteor | 1.30 | 4.49 | count 4, radius 58, burn 1.5 | Entei #244, Ho-Oh #250 |
| diamond-storm | Rock | meteor | 1.25 | 8.87 | count 5, radius 50, knock 50 | Diancie #719 |
| doom-desire | Steel | meteor | 2.40 | 22.14 | count 1, radius 95, knock 120 | Jirachi #385 |
| glacial-lance | Ice | meteor | 1.40 | 5.69 | count 4, radius 60, slow 0.5 | Calyrex #898 |
| thousand-arrows | Ground | meteor | 1.30 | 4.84 | count 7, radius 44 | Zygarde #718 |

**Native upgrade ladders:**

- Dash: damage ×1.4; range ×1.3; cooldown ×0.75; damage ×1.6 plus width ×1.4.
- Meteor: +1 projectile; damage ×1.45; radius ×1.3; +2 projectiles and cooldown ×0.8.

## Implementation boundaries

- `src/pkmsvv-3ds-stage7-dash-meteor.js` registers only the ten missing IDs via existing add-only `G.PKMSVV3DSMoveFamilies.addDefs`.
- `scripts/patch-3ds-stage7-dash-meteor.cjs` follows Stage6 and routes Stage7-only Dash/Meteor via original Web `dash()` and `meteors()`, keeping native source-matched wall-safe traversal, swept collision damage, real target selection, true explosions, damage status and prop hits.
- Native-exclusive moves are checked in Pokémon learn pools and direct casts. New IDs remain excluded from live Co-op learn pools.
- Prevent field overload only for new 3DS meteors: maximum 32 simultaneous native-meteor fields, without modifying existing Web meteor IDs or save formats.
- Source gameplay matches native original `dash()` and `meteors()` implementations in their basic movement and timing. This is not proof of identical 3DS rendering or complete parity on live client.

## Source QA — PASS

[Stage7 shared source QA #44933624669](https://github.com/votrivalley/PKMSVV/actions/runs/44933624669): 379 Web regression PASS, 0 FAIL, 5 SKIP; 80 skill/controller regression PASS, 0 FAIL. Actual patched public-mirror `moves.js` smoke: `original=64, staged=110, new=46, productionNew=44`, including the two additional mirror-only Rapid Spin/Whirlpool IDs absent from its original registry.

**Overall:** 44/73 genuine missing 3DS skill IDs staged, 29 pending. The documented 103-skill PKMSVV baseline would expect 103+44 = 147 IDs after full upstream source integration. This number is *not* confirmed by full production compilation.

## Release block

The exact pinned `JPTER78/pokesurvivor` original revision `11fe868c640b62ac37beacc222e056bc4d9ec892` is not accessible in current CI. Public `botgm/PokeSurvivor` remains a technical QA mirror only, not complete PKMSVV. Full Web, Android, Windows runtime and Pippi/Fusion/Mega/8 AUTO/save/boss/Co-op authority QA remain outstanding. No merge, deploy, signing or save migration was authorized or performed.
