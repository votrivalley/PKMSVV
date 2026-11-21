# PKMSVV 3DS — Alpha 07 Sinnoh native QA

## Included gameplay

- Inherits the Kanto Gen1, Johto Gen2, Hoenn Gen3 native implementation and the touchscreen ×1 / ×1.5 Solo Explore toggle (Alpha06.5).
- Sinnoh (Region index 3, Gen4) is playable only after the **saved Hoenn Badge** is successfully reloaded. Menu touch/button navigation never silently falls back into the original engine's mixed-Gen modes.
- Wild and boss candidate queries use `pkmsvv_region_gen=4`, plus central enemy spawn and event guards against Gen1–3 spillover; lost/rescue event uses Gen4 starter Turtwig #387.
- 15:00 first tracked boss: 15% Cresselia (#488), 85% eligible native Gen4 Epic. First boss must be defeated to claim Sinnoh Badge.
- 30:00 final tracked boss: Cresselia #488. It is gated on the first tracked boss and only Cresselia defeat finishes the Region.
- HP/damage scaling by native prior-region formula (index 3): first boss 52,000 HP / 36 DMG; final 104,000 HP / 55 DMG.
- Uses native 3DS biome slot 3 as a **temporary Sinnoh-themed terrain placeholder**, not the Web/PC map tile assets.

## Save backward compatibility

- Kanto: `region-progress-v1.dat/.bak` unchanged.
- Johto: `johto-progress-v1.dat/.bak` unchanged.
- Hoenn: `hoenn-progress-v1.dat/.bak` unchanged.
- Sinnoh: new `sinnoh-progress-v1.dat/.bak` marker `PKMSVV_SINNOH_V1\nSINNOH=1\n`.
- All are stored in isolated `sdmc:/3ds/pkmsvv-kanto01/`; title ID `000400000F5B1400` (CTR-H-PK01). Back up the directory before installing an experimental CIA.
- This does not import Web/Android JSON saves, and no real-3DS persistence guarantee is implied from CI smoke tests.

## Acceptance checklist

- [x] Full devkitARM native CIA + 3DSX compile and identity check.
- [x] Azahar 12-second Sinnoh gameplay: all 4th-gen encounters, 0 outsiders, Cresselia at 1800 seconds.
- [x] Azahar deterministic first boss kill / Badge / Cresselia final kill victory.
- [x] Azahar nonblank 10-region menu capture with a corrupted Hoenn primary and valid backup Badge fixture. [ ] Text/access through real button/touch selection still unverified.
- [x] Azahar ×1.5 Kanto solo real-time regression. [ ] Touch placement/Co-op hardware regression remains pending.
- [ ] Real New 3DS 30-minute gameplay, FBI install, actual touchscreen press and SD read/write persistence — pending.

PR remains Draft. No merge or public release.

## Verified builds / emulator logs (2026-11-21)

- Native build: [GitHub Actions #44872569903](https://github.com/votrivalley/PKMSVV/actions/runs/44872569903), **SUCCESS**; artifact `PKMSVV-3DS-4-REGIONS-SINNOH-ALPHA07` (CIA + 3DSX), isolated Title ID `000400000F5B1400` checked.
- Emulator: [Azahar QA #44873119782](https://github.com/votrivalley/PKMSVV/actions/runs/44873119782), **SUCCESS**.
- Sinnoh actual native 12s gameplay: `PKMSVV_REGION07_CAST_PASS total=44 outsiders=0`, `PKMSVV_REGION07_LIVE_PASS living=11 foreign=0`, mean 60 FPS in this short emulator smoke; first boss sampled Mamoswine #473 at t=900, final configured Cresselia #488 t=1800.
- Inherited speed: `PKMSVV_SPEED_REALTIME_PASS game=18.00 wall=12.16 ratio=1.481` in Kanto solo, not an endurance measurement.
- Gate: `PKMSVV_REGION04_GATE_BEFORE_PASS`, `GATE_AFTER_PASS`, `FINAL_DEFEAT_PASS victory=1`; `PKMSVV_REGION07_KILL_GATED_CRESSELIA_PASS`. Synthetic 1801s gate run logs `REGION07_LIVE_FAIL living=0` because it intentionally skips normal live enemies; the separate normal 12s live run passed.
- UI screenshot: `REGION07_SINNOH_UNLOCK_UI_CAPTURE_PASS (1280,800)` checks screenshot dimensions/variation only, not the exact unlock text or actual touch interaction.
- Hardware 30-minute performance, SD write/read across reboots, and touch access to Sinnoh are still pending.
