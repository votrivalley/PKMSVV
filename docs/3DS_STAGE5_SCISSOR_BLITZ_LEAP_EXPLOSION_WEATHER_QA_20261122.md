# PKMSVV Web/Android/PC — Stage 5: Scissor, Blitz, Leap, Boom & Weather

**Checked source:** `juanluismm521/pokesurvivor3ds` tag `v1.0.0`, generated `src/gen/gamedata.cpp` and native engine `src/core/combat.cpp`, `src/core/weather.cpp`. [Extraction CI #44930680528](https://github.com/votrivalley/PKMSVV/actions/runs/44930680528).

**Safety:** Draft PR #42 only. No merge, deployment, full PKMSVV Web release, Android APK, Windows EXE, native 3DS build or save migration.

## Nine newly staged skills — exact native base numbers

| ID | Category/kind | CD (s) | Damage | Other native stats / notes |
|---|---|---:|---:|---|
| `x-scissor` | Bug / scissor | 0.75 | 16.59 | radius 70, arc 1.3; two cross-cut strikes |
| `stone-axe` | Rock / scissor | 0.80 | 18.55 | radius 78, arc 1.3; **Kleavor #900 only** |
| `extreme-speed` | Normal / blitz | 1.30 | 74.86 | count 3, radius 220; hops enemy-to-enemy |
| `acrobatics` | Flying / leap | 1.30 | 13.30 | radius 70, range 220, ×1.5 damage with no held item |
| `shadow-force` | Ghost / leap | 1.30 | 18.48 | radius 90, range 260; **Giratina #487 only** |
| `explosion` | Normal / boom | 2.50 | 38.57 | radius 150, knock 220, costs 25% of current HP, never self-KO |
| `sunny-day` | Fire / weather | 4.00 | none | wx=0, force Sun for 20 seconds |
| `rain-dance` | Water / weather | 4.00 | none | wx=1, force Rain for 20 seconds |
| `sandstorm` | Rock / weather | 4.00 | none | wx=2, force Sand for 20 seconds |

All nine use their *actual native four-rank upgrade ladders*. **X-Scissor** is a separate skill ID from the existing Bug Bite evolution with the same display name, just as Surf is separate from Bubble's evolved Surf.

## True gameplay mechanics, not cosmetic FX

- **Scissor** calls two independently aimed `hit()` passes at +/-0.45 radians. Enemies and destructible props at the intersection can take both hits; original Web type chart, boss modifiers, burn, critical and loot still run through `hit()`. Renders with existing PMD slash FX.
- **Blitz** tracks a per-cast set of enemies already hit, selects the nearest *new* enemy up to configured count, teleports only to a terrain-valid spot at its rim, draws a brief streak trail, adds a short invulnerability frame and hits through the native Web damage pipeline. Arceus is never targeted for this combo; ghost presentation never teleports/damages.
- **Leap** waits 0.32s at the target, then lands if the terrain is clear (otherwise it still explodes at target) and does genuine radial `blast()`. No-held-item Acrobatics receives the native ×1.5 damage bonus. Giratina-only Shadow Force uses the same family logic.
- **Explosion** hits monsters and breakables within its true radius, takes the native 25% current HP self-cost without self-KO, and does not let a visual-only field mutate player HP. It never deliberately bypasses original team mechanics.
- **Weather** calls `G.Weather.force(kind, duration)` from the *actual shared Web weather engine*: weather multipliers, weather damage, chip damage and presentation follow normal game rules. The three categories map to native indices Sun=0, Rain=1 and Sand=2; visual-only ghost fields cannot change weather.

## Integration and source compatibility

- `src/pkmsvv-3ds-stage5-moves.js`: true stats, four upgrade steps each, Kleavor/Giratina-only locks, no original ID changes
- `src/pkmsvv-3ds-combat-stage5.js`: hooks into the shared real hit / blast / FX / world / weather systems; preserves earlier 3DS stage fields with the adapter chain
- `scripts/patch-3ds-stage5-families.cjs`: source patch after Stage4 to add new Web scripts and original-Web native targeting gate, and extend the `MULT` upgrade list by `range` and `knock` so +30% reach/+25% knock do not become raw values 1.3/1.25
- `scripts/qa-3ds-stage5-levelups.cjs`: evaluate real patched Web `moves.js` and all five staged move registries, assert 128 total moves, original 103 unchanged, 25 new added, actual 5th-rank bonuses and conditional owner rules
- `tests/3ds-stage5-combat.test.cjs`: 15 source-level and runtime-mock tests for categories, double hits, chain uniqueness, terrain constraints, ghost-only effects, nonlethal self-cost, actual climate changes and owner locks

No new permanent save fields, Pokedex unlock rules or Pokémon stats added. Original 103 move IDs, their evolution names and multiplayer pool are preserved. New move IDs are excluded from active Co-op pending deterministic authority/replay/network tests.

## Overall catalog coverage

Original PKMSVV 103 + **25 new IDs in Draft** = **128 staged entries**. Of the 73 missing IDs in the 3DS v1.0.0 comparison, **25/73** now have implementation; **48 remain**.

**All 14 distinct previously missing effect families now have at least one integrated skill**: Stage2 (`tremor,wave`), Stage3 (`punch,cross,storm`), Stage4 (`guard,screen,rest,decoy`), Stage5 (`scissor,blitz,leap,boom,weather`). This does **not** mean all missing moves have been ported; the 48 remaining IDs still need careful matching to original Web effect family, special Pokémon restrictions and balancing.

## Mandatory release QA

- Full main-game Web bundle must compile from the exact pinned source revision, with Pippi, pokédex, 10 chapters, Sky Tower and all existing PKMSVV changes; public mirror builds cannot serve as replacements.
- Dedicated Android mobile WebView and Windows game runtime, 8-skill AUTO and Fusion interaction, player item bonus, long-run field cap and FPS, boss arena and legendary moves, weather persistence/arena resets, networked Co-op / BR / Egg Rush authority must pass on actual devices.
- `prepare-game.cjs` currently pins inaccessible upstream `JPTER78/pokesurvivor` commit `11fe868c640b62ac37beacc222e056bc4d9ec892`; until access is solved, Stage5 tests and mirror-only compiled QA **are not proof of production compatibility**.

