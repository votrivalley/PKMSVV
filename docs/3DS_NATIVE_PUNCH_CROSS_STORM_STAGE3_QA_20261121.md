# PKMSVV ← PokéSurvivor 3DS — Stage 3 (2026-11-21)

## Scope & reality of the build

Stage 3 adds **nine new skill IDs** to the *shared JavaScript source preparation path* for PKMSVV Web/Android/Windows. It is not a native 3DS port, a signed Android APK, a packaged Windows EXE, or a deployed Web build. The pull request remains **Draft**. Source preparation for the full original PKMSVV client is still blocked on access to pinned JPTER78 revision `11fe868c640b62ac37beacc222e056bc4d9ec892`.

### Authentic source data

All nine base stat lines and attack kinds are extracted from `juanluismm521/pokesurvivor3ds` tag `v1.0.0`, `src/gen/gamedata.cpp`, not guessed from move names. The code `scripts/extract-3ds-combat-profiles.cjs` audits the generated native stats through [Actions #44923102398](https://github.com/votrivalley/PKMSVV/actions/runs/44923102398). The four level-up mods per attack family were extracted from native `kLadder[K_COUNT][4]` and adapted to the current Web `G.Moves` upgrade structure.

| Skill ID | Category | Native kind | Cooldown | Base damage | Unique effect / restriction |
|---|---|---|---:|---:|---|
| fire-punch | Physical / Fire | punch | 0.85s | 10.37 | 3 blows, burn |
| ice-punch | Physical / Ice | punch | 0.85s | 15.69 | Slow, short 0.35s freeze on final punch |
| thunder-punch | Physical / Electric | punch | 0.85s | 11.98 | Final blow arcs to 2 nearby enemies |
| drain-punch | Physical / Fighting | punch | 0.90s | 17.12 | Heals 1.5 HP per enemy hit |
| plasma-fists | Physical / Electric | punch | 0.80s | 10.19 | Final blow arcs to 3 enemies; **Zeraora dex 807 only** |
| fire-blast | Special / Fire | cross | 1.60s | 15.9 | Delayed cross-shaped fire explosion, burn |
| seed-flare | Special / Grass | cross | 1.40s | 23.2 | Delayed cross explosion; **Shaymin dex 492 only** |
| thunder | Special / Electric | storm | 1.50s | 4.29 | 5 lightning strikes over visible enemies |
| judgment | Special / Normal | storm | 1.40s | 2.85 | 8 light strikes; **Arceus dex 493 only** |

### Real gameplay mechanics in shared engine

**Punch (3DS FK_PUNCH):** attacks fire at 0.09-second intervals in alternating aim arcs. Final strike deals 140% damage and 70 knockback, earlier ones 10. The original `hit()` callback applies type resistance, crit and status effects. Drain Punch heals up to six per strike; Thunder Punch and Plasma Fists chain 60% damage to limited nearby enemies. Ice Punch prefers a real `applyStun` method when supported, falling back to a brief 100% slow when the Web source lacks a native stun API. This fallback requires real-device QA.

**Cross (3DS FK_CROSS):** 0.3-second targeting warning, then one-time cross-shaped area explosion centered on a living enemy, with pixel ring/bursts; each enemy and breakable prop takes one blast. Never targets a crate just because it is `Player.target`.

**Storm (3DS FK_BOLT):** choose enemies visible on camera (excluding Arceus), spawn a capped number of delayed lightning fields (0.09-second stagger). Telegraph circles, pixel lightning beams and burst followed by genuine `blast()` collision damage. Ghost/remote-only fields never cause damage. Global new-field hard cap remains 24.

**Species locks:** New moves with `only` are excluded by the native skill pool unless `mon.dex` matches. The casting logic also rejects unauthorized manual/saved casts. All nine new IDs remain excluded from active Co-op rooms pending synchronization testing.

### Preserve original PKMSVV balancing

- Exact original 103 move IDs and mechanics remain untouched. Rapid Spin and Whirlpool are already in PKMSVV; they are **not** redefined. Existing Magnitude remains `quake`.
- Stage 2 Earthquake (`tremor`) and Surf (`wave`) also remain untouched, and Bubble→Surf evolution is still available.
- Stage 3 uses the existing Web four-rank, five-level upgrade mechanism, without modifying saved ID formats.
- [Full audit of 176 native vs 103 original PKMSVV IDs](./3DS_176_MOVES_73_MISSING_AUDIT_20261121.md): 73 originally missing = 2 Stage 2 + 9 Stage 3 + **62 still unported**. 14 novel effect families originally missing, 5 now staged (`tremor`, `wave`, `punch`, `cross`, `storm`); nine more await full implementation.

### QA & release gates

- Shared source tests must show 379/384 pass, 5 skipped, zero failures, plus the focused skill/passive/controller suites.
- Browser-engine source patch and compiled mirror need to pass the new Stage 3 checks, including name IDs inside minified app.
- Real full PKMSVV Web build on correct pinned upstream, Android/WebView + Windows device gameplay, 8 AUTO skill load, 1.5× solo, UI cards, rare move unlocks and PvP/Co-op sync remain mandatory **before any release**.
- This QA branch must **not** deploy, sign packages, change save schema or bypass the locked-source build blocker.
