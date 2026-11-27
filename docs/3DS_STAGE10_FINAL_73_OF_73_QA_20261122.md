# PKMSVV — Stage 10: finish all 73 source-backed 3DS skill IDs (22/11/2026)

**Draft PR #42, QA ONLY**. Do not merge, Cloudflare deploy, distribute an APK/Windows package, migrate saves or enable network matches. Every addition remains source-patched to a **public QA mirror**, not the actual full PKMSVV client.

## Native source and exact 3DS v1.0.0 profiles

[Native `gamedata.cpp` and seven family ladder extraction #45023655923 — SUCCESS](https://github.com/votrivalley/PKMSVV/actions/runs/45023655923); checked `juanluismm521/pokesurvivor3ds` tag v1.0.0 `src/core/combat.cpp` for timing, knockback, enemy stun, rebound and field execution.

| New native ID | Kind | Type | CD | Base damage | Key source profile / owner |
| --- | --- | --- | ---: | ---: | --- |
| `relic-song` | shove | Normal | 1.10s | 84.58 | radius 110, knock 360, Meloetta #648 |
| `clanging-scales` | shove | Dragon | 1.10s | 85.80 | radius 100, knock 300, Kommo-o #784 |
| `mortal-spin` | spin | Poison | 1.00s | 8.82 | count 4, radius 72, poison 1.5, Glimmora #970 |
| `darkest-lariat` | spin | Dark | 1.00s | 9.72 | count 4, radius 78, knock 60, Incineroar #727 |
| `waterfall` | stun | Water | 1.40s | 23.01 | radius 46, stun 0.8s, no owner restriction |
| `dark-void` | stun | Dark | 2.00s | 25.30 | radius 110, stun 1.8s, Darkrai #491 |
| `glaciate` | tremor | Ice | 1.50s | 24.00 | radius 190, slow 0.6, Kyurem #646 |
| `psyshock` | bounce | Psychic | 0.70s | 26.17 | speed 360, count 1, life 1.6, size 8, 4 rebounds, no restriction |
| `geomancy` | buff | Fairy | 0.85s | none | special attack +18% per cast, 8s, max 5 stacks, Xerneas #716 |
| `precipice-blades` | quake | Ground | 1.25s | 12.87 | count 8, radius 40, Groudon #383 |

The native move categories (physical / special / status) and five-level rank ladders are preserved, including exact modification keys:

- **Shove:** damage ×1.4; radius ×1.25; CD ×0.75; knock ×1.5 and damage ×1.4.
- **Spin:** damage ×1.4; radius ×1.25; count +1; CD ×0.75 and damage ×1.3.
- **Stun:** damage ×1.4; radius ×1.25; stun duration ×1.5; CD ×0.75 and damage ×1.3.
- **Tremor:** damage ×1.4; radius ×1.25; CD ×0.75; damage ×1.5 and radius ×1.2.
- **Bounce:** +1 bounce; damage ×1.45; CD ×0.75; count +1, bounce +1, spread ×1.3.
- **Buff:** stacks +1; amount ×1.4; duration ×1.5; stacks +1 and amount ×1.4.
- **Quake:** count +2; damage ×1.45; radius ×1.25; CD ×0.75 and count +2.

## Runtime logic wired to real Web engine

- `src/pkmsvv-3ds-stage10-final-moves.js`: append ten add-only IDs through `G.PKMSVV3DSMoveFamilies.addDefs` (including signature-owner restrictions and a solo-only Co-op learn-pool gate). No existing 103 ID or save schema changed.
- `src/pkmsvv-3ds-combat-stage10.js`: hook Shove, Stun, Bounce and Geomancy. Shove runs via the shared field update (one frame after cast, rather than native immediate call); genuine hit callback is used for damage, type/weather/crit, props and knockback. Timed Stun telegraphs a circle for 0.45s, applies real damage, then freezes ordinary enemies and reduces boss/judge stun time to ×0.35 through the pre-existing Stage6 enemy stun update hook.
- Native **Psyshock** uses the original Web swept projectile resolver and new `rebound` redirect on hit: no rehit of already-hit IDs, retarget within 220px, retain speed, extend remaining life by 0.5 seconds per valid bounce, cap by `m.bounce`. Ghost projectiles only rebound visually without damaging.
- **Geomancy** maintains a temporary special-attack-only buff on the player, with stacking and 8-second expiration tied to simulation `dt`. The bonus is applied in original Web hit and projectile pipelines only when the move category is `special`, **never to physical moves**. Older Web moves without category metadata cannot receive a guaranteed special classification; this remains a QA mirror adaptation pending full PKMSVV source access.
- Pre-existing Stage2 real Canvas Spin / Tremor / Quake fields are reused, including multiple timed hits, actual poison/slow status, props, forward 34px quake steps and wall cutoff. Stage10 upgrades Stun as a multiplier and Bounce as a cumulative stat, preserving existing 103 skill values.
- Original Stage1 passive crit/boss bonuses, Stage6 projectile puddles/status and Stage9 Moonblast splash, Silver Wind/Crunch are left in place. All new skill IDs remain unavailable in **active Co-op** pending synchronized authority, replay and mode QA.

## Verified CI — not full-game validation

- [Source/Web regressions #45028539924 — SUCCESS](https://github.com/votrivalley/PKMSVV/actions/runs/45028539924): 379 Web PASS, 0 FAIL, 5 SKIP; 104 specialized skill/controller tests PASS, 0 FAIL. Source-patched actual mirror registry is **64 baseline + 75 appended = 139 unique IDs**; 2 extra are the QA mirror's absent Rapid Spin/Whirlpool (already in PKMSVV's 103).
- [Isolated Web QA mirror compilation #45028545276 — SUCCESS](https://github.com/votrivalley/PKMSVV/actions/runs/45028545276); [technical artifact #14757165318](https://github.com/votrivalley/PKMSVV/actions/runs/45028545276/artifacts/14757165318), about 67 MB, expires 27 Nov 2026. This is **not PKMSVV's complete Web/Android/Windows game**.
- Final inventory: **73/73 genuinely new 3DS IDs staged**. Expected theoretical full PKMSVV move count is **103 + 73 = 176** after obtaining exact upstream source, resolving differences and redoing end-to-end QA. Do **not** report 176 as a compiled, tested, shipped full PKMSVV catalog.

## Remaining production blockers and acceptance gates

1. Recover/access exact pinned upstream `JPTER78/pokesurvivor` revision `11fe868c640b62ac37beacc222e056bc4d9ec892`. Current CI cannot fetch it; public `botgm/PokeSurvivor` mirror has different catalogs, spawners and gameplay. **Do not silently migrate to mirror or disable `prepare-game.cjs` identity checks.**
2. Full original Web/Android/Windows build and device QA: Pippi follow/skills/chat, Pokédex/gacha ownership, PokéBox, Mega/Fusion/Orb, 8 AUTO skills, weather reset, AI casting, skill animations/effect counts, Switch/3DS branches if intended, controller, mobile performance and long-crowd crash, save/reload/Save Guardian.
3. Explicit per-mode authority and rollback/replay QA for Co-op, Arena, Battle Royale and Egg Rush, then optional separate approval to enable, merge or deploy. No production operations have been performed.

**Boundary:** This milestone is *source integration + source tests + isolated mirror compile*, not a full PKMSVV feature release.
