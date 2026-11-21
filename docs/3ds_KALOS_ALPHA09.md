# PKMSVV 3DS — Kalos Gen6 native Alpha09

## Gameplay & boundaries

- Uses native engine on top of Alpha08, retaining Kanto through Unova, fixed-step ×1.5 touch speed in solo Explore, and the 10-region chooser.
- Kalos (index 5, Gen6) unlocks **only after Unova Badge has been saved**. Wild and eligible boss candidates are filtered by `pkmsvv_region_gen=6`, not the original mixed-Gen pool.
- Special lost/rescued creature: Chespin #650 (Gen6). 15min first boss is **15% Zygarde #718 / 85% eligible Gen6 Epic**; defeating it claims Kalos Badge. The 30min tracked final is Zygarde #718 and requires first-boss defeat; only defeating the final ends the region.
- Inherited stat scaling uses index5: first boss **68,000 HP / 44 damage**, final **132,000 HP / 63 damage**, before skill-specific modifiers.
- **Map limitation:** the 3DS source engine’s stock biome for index5 is a placeholder; this is not the Web Kalos map, story, Pippi or full Web/Android feature parity.

## Save layout

Title ID stays `000400000F5B1400`, product `CTR-H-PK01`. Existing Kanto/Johto/Hoenn/Sinnoh/Unova save markers under `sdmc:/3ds/pkmsvv-kanto01/` are unchanged.

The added `kalos-progress-v1.dat` and `kalos-progress-v1.bak` use `PKMSVV_KALOS_V1\nKALOS=1\n`. The game checks both copies when reopening the app. This is separate from the Web/Android JSON save format.

## QA acceptance

- [ ] CIA and 3DSX native devkitARM build succeeds, isolated Title ID and output hashes checked
- [ ] Azahar 12-second native Kalos run: Gen6 wild cast, live creatures, zero outsiders
- [ ] Zygarde #718 final at t=1800, Gen6 first boss at t=900, 15m kill-gated 30m win
- [ ] x1.5 solo real simulation time regression remains close to x1.5
- [ ] Region menu screenshot with valid Unova backup marker, corrupted primary
- [ ] Physical New3DS installation, active button/touch region selection, persistent Badge save and 30m endurance (pending)

No merge/deploy; Draft PR only. Back up the SD game save folder before any hardware install.
