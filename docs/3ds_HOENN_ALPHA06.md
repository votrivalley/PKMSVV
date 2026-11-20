# PKMSVV 3DS — Alpha 06: Hoenn Gen 3 (QA)

## Source of truth
- Web Region data: `src/pkmsvv-quick-region.js` on `feature/research-modular-sprites-qa-20261120`.
- Native engine: pinned upstream `juanluismm521/pokesurvivor3ds` v1.0.0, patched in CI with `port_slice01` through `port_slice06_hoenn.py`.
- Three regions are playable in this isolated native test: Kanto, Johto, Hoenn. Others remain locked, not silently redirected to legacy game modes.

## Actual Hoenn mechanics
- Requires saved Johto Badge, granted only upon tracked boss defeat at the first 15-minute milestone.
- Wild and boss candidates from Gen 3 only; uses source engine sprites. Guard at central enemy-spawn site.
- Boss at 15:00: 15% Jirachi (#385), 85% eligible Gen3 Epic (rarity 4).
- Jirachi at 30:00 requires defeating the preceding tracked boss; defeating Jirachi ends the region.
- Web formula for index 2: 15m boss 44,000 HP / 32 DMG; 30m boss 90,000 HP / 51 DMG.
- Placeholder world: native biome index 2. This is **not a faithful port of Web Hoenn tilemap**.

## Badge saves (native-only)
- Old Kanto `region-progress-v1.dat/.bak` and Johto `johto-progress-v1.dat/.bak` remain untouched.
- New Hoenn `hoenn-progress-v1.dat/.bak` uses marker `PKMSVV_HOENN_V1\nHOENN=1\n`.
- Both copies written via .tmp and rename. At least one valid copy is sufficient for recovery.
- No Web JSON/Android Save Guardian compatibility is implied.

## Acceptance checklist
- [ ] DevkitARM builds both .cia and .3dsx.
- [ ] CIA retains private QA Title ID `000400000F5B1400` and product code `CTR-H-PK01`.
- [ ] Azahar 12-second native Hoenn run: Gen3 cast, living Gen3 enemies, 30-minute boss config Jirachi (#385).
- [ ] Azahar synthetic native boss gate: 15m tracked boss -> Badge -> Jirachi -> victory.
- [ ] Region menu loads saved Johto Badge from backup and allows Hoenn selection.
- [ ] Real New 3DS 30-minute endurance, FBI CIA install and SD write/restart **not yet tested**.

PR remains Draft. Do not merge/deploy as public stable release.
