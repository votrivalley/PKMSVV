# PKMSVV 3DS Alpha 08 — Unova Gen 5 (native C++)

## Scope
- Inherits all Alpha07 Kanto, Johto, Hoenn, Sinnoh native game modes, independent save ledgers, and ×1.5 Solo Explore touch toggle.
- Region `4` Unova is playable only after **saved Sinnoh Badge**. The Region chooser remains 10 regions overall but only the first five are native.
- Actual C++ Gen5-only native wild and eligible Epic roster and special rescue Snivy #495. This is not a cosmetically re-labelled mixed-generation ROM.
- At game 15:00, one first boss: 15% Kyurem #646 or 85% eligible Gen5 Epic, then claim Unova Badge **on actual defeat**, not just timer.
- At game 30:00, tracked final Kyurem #646. Final is kill-gated on the first boss and awards the region win after actual defeat.
- Native HP/damage formula: first boss 60,000 HP / 40 DMG, final 118,000 HP / 59 DMG (unless balancing is changed separately).
- Native terrain profile is a **placeholder** from the source port; not the Web Unova tilemap or full story.

## Persistence
All files under `sdmc:/3ds/pkmsvv-kanto01/`, same isolated title ID `000400000F5B1400`. Existing `region-progress-v1`, `johto-progress-v1`, `hoenn-progress-v1`, `sinnoh-progress-v1` primary and backups remain unchanged. Adds `unova-progress-v1.dat` and `unova-progress-v1.bak`, with marker `PKMSVV_UNOVA_V1\nUNOVA=1\n`. Back up before installing on real hardware.

## QA gates
- [ ] devkitARM native CIA/3DSX build and Title ID checked
- [ ] Azahar short live run Gen5-only cast/active enemies, no outsiders
- [ ] First boss Gen5 and final Kyurem #646 at game t=1800
- [ ] 15m tracked kill unlocks Badge and 30m kill wins; no early final
- [ ] Azahar rechecks x1.5 real fixed-step speed after the new region
- [ ] Region menu captured with a corrupt primary + valid Sinnoh backup Badge
- [ ] Actual New 3DS installation, physical touch/D-pad menu selection, true SD save across reboots, and extended 30m FPS/endurance — pending

The changes are Draft QA; never merge or deploy to the Web/main until separately requested.
