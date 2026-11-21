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
- [x] devkitARM native CIA/3DSX build and Title ID checked
- [x] Azahar short live run Gen5-only cast/active enemies, no outsiders
- [x] First boss Gen5 and final Kyurem #646 at game t=1800
- [x] 15m tracked kill unlocks in-game Badge and 30m kill wins; no early final (deterministic synthetic test)
- [x] Azahar rechecks x1.5 real fixed-step speed after the new region
- [x] Nonblank Region menu screenshot captured with corrupt primary + valid Sinnoh backup Badge fixture; real touch unlock still unverified
- [ ] Actual New 3DS installation, physical touch/D-pad menu selection, true SD save across reboots, and extended 30m FPS/endurance — pending

The changes are Draft QA; never merge or deploy to the Web/main until separately requested.

## Green CI and Azahar evidence — 2026-11-21

- **Build PASS:** [GitHub Actions #44878607311](https://github.com/votrivalley/PKMSVV/actions/runs/44878607311). Artifact `PKMSVV-3DS-5-REGIONS-UNOVA-ALPHA08` (CIA+3DSX); SHA256 CIA `f74f4b53d6662a99dc508f0d84bf67fa5d965dd091b129b2148a589f2420142c`, 3DSX `0a2f14c0846a39bf5354af25ec5062f2df5efdf87d3ef805e156c2297be2327a`. Isolated Title ID checked.
- **Azahar QA PASS:** [GitHub Actions #44878821707](https://github.com/votrivalley/PKMSVV/actions/runs/44878821707). Artifact `PKMSVV-3DS-REGION08-AZAHAR-EVIDENCE`.
- Native Unova Gen5 roster: `PKMSVV_REGION08_CAST_PASS total=41 outsiders=0`; live enemies: `PKMSVV_REGION08_LIVE_PASS living=15 foreign=0`; mean **60.0 FPS in 12-second emulator smoke** (not hardware performance).
- Tested boss configuration: first Gen5 Epic `#612` at game time 900s; final Kyurem `#646` at 1800s. First-boss legendary 15% is configured probabilistically, **not established by a single run**.
- `PKMSVV_REGION04_GATE_BEFORE_PASS`, `PKMSVV_REGION04_GATE_AFTER_PASS`, `PKMSVV_REGION04_FINAL_DEFEAT_PASS victory=1` and `PKMSVV_REGION08_KILL_GATED_KYUREM_PASS`. Synthetic 1801-second diagnostic deliberately has zero live enemies and emits `REGION08_LIVE_FAIL living=0`; do not confuse that with the successful actual 12-second gameplay run.
- Native ×1.5 regression: `PKMSVV_SPEED_REALTIME_PASS game=18.00 wall=12.16 ratio=1.481`, Kanto solo on Azahar.
- Screenshot `REGION08_UNOVA_UNLOCK_UI_CAPTURE_PASS (1280, 800)` validates nonblank screenshot only. It does **not** prove real button/touch selection or save reload on physical 3DS.
- **Outstanding:** actual FBI CIA installation, New3DS sustained 30m FPS, SD badge save/restart, input and menu access, real Web Unova tilemap.
