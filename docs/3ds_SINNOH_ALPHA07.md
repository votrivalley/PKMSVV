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

- [ ] Full devkitARM native CIA + 3DSX compile and identity check.
- [ ] Azahar 12-second Sinnoh gameplay: all 4th-gen encounters, 0 outsiders, Cresselia at 1800 seconds.
- [ ] Azahar deterministic first boss kill / Badge / Cresselia final kill victory.
- [ ] Azahar render of 10-region menu with Hoenn backup Badge fixture (do not claim pixel text verified unless specifically asserted).
- [ ] Verify ×1.5 inherited native controls and no Co-op speed modification.
- [ ] Real New 3DS 30-minute gameplay, FBI install, actual touchscreen press and SD read/write persistence — pending.

PR remains Draft. No merge or public release.
