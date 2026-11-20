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
- [x] DevkitARM builds both .cia and .3dsx.
- [x] CIA retains private QA Title ID `000400000F5B1400` and product code `CTR-H-PK01`.
- [x] Azahar 12-second native Hoenn run: Gen3 cast, living Gen3 enemies, 30-minute boss config Jirachi (#385).
- [x] Azahar synthetic native boss gate: 15m tracked boss -> Badge -> Jirachi -> victory.
- [x] Azahar captures nonblank Region menu while Johto Badge backup is present. The screenshot automation does not yet assert exact unlock text or touch selection.
- [ ] Interactive Hoenn selection and SD Badge persistence on real New 3DS hardware.
- [ ] Real New 3DS 30-minute endurance, FBI CIA install and SD write/restart **not yet tested**.

PR remains Draft. Do not merge/deploy as public stable release.

## Verified CI evidence
- Compile + CIA + 3DSX: [Actions #44831720515](https://github.com/votrivalley/PKMSVV/actions/runs/44831720515) SUCCESS, artifact `PKMSVV-3DS-KANTO-JOHTO-HOENN-ALPHA06`.
- Azahar: [Actions #44832065192](https://github.com/votrivalley/PKMSVV/actions/runs/44832065192) SUCCESS. Native 12s Hoenn: 43/43 cast Gen3, 12 living enemies, 0 outsiders, 60 FPS. Boss config Wailord #321 @900 and Jirachi #385 @1800 (one seeded random sample). Synthetic actual engine kill-gate test PASS. Menu screenshot captured but its badge text was not machine-asserted.
- Hardware endurance, CIA FBI install, button-touch selection, and actual SD writes remain pending.
