# Mega Stage 3 — 8-direction offline workbench (30/10/2026)

## Status
**Prototype working locally, NOT ready for gameplay.** A private offline ZIP with the 8 PA2.1 fan-art source atlases and a pixel-editing Studio was provided in the ChatGPT conversation. The repo retains the source-independent QA validator and tests. We deliberately do not commit third-party image bytes before license review.

Stage3 Studio can select one of four Pokémon (Scizor, Swampert, Garchomp, Dragonite), normal or Shiny, eight direction slots, four frames each and seven engine actions (Idle, Walk, Attack, Shoot, Charge, Hurt, Faint). Four source cardinal-direction Walk rows are read-only and serve as genuine reference. Diagonal action frames start **empty**, never auto-filled by flipping or cloning. A user can paint and erase individual pixels, sample colors, undo edits, mark nonempty frames as reviewed, export draft action sheet PNG (384×768) and save/load progress JSON. The preview reference is not included in exported artwork.

## Honest completeness
Per Pokémon *and* per variant:
- 7 actions × 8 directions × 4 frames = **224 animation frame slots**.
- 16 sourced Walk frames (4 directions × 4 frames) are available as **unverified candidate art**.
- **208 frames remain to be authored or sourced.** The workbench intentionally shows 0/208 new frames approved.
- Even if all manual slots are filled and approved, do not set battleReady until visual QA, source permission, 8-row order check against the runtime and per-action metadata/anchor tests pass.

## Run validation
Requires Python and Pillow, no original image files needed for checking project JSON:

```sh
python scripts/validate-mega-eightdir.py QA-Mega-8dir-project.json --pokemon scizor --variant shiny --report qa-report.json
python -m unittest discover -s tests -p 'test_validate_mega_eightdir.py'
```

Missing frames and fake approvals produce exit code 2. No source art is saved to repo or imported into game. Existing Mega registries, saves, Android signatures, PC and Web builds are unchanged.

## Rendering and license limits
Direction labels in the editor are a **QA convention**, not verified engine row indexing. Porting 384×768 draft sheets into `build-mega-forms.cjs` requires true animation metadata, action frame durations, anchors, QA and appropriate rights. Keep sprites marked `assetOnly` until full acceptance.

Source and prior edge QA:
- `docs/MEGA_PA21_EDGE_BLEED_FIX_2026-10-30.md`
- `docs/MEGA_STAGE1_ASSET_QA_2026-10-30.md`
- Eevee Expo author's public pack: https://eeveeexpo.com/resources/1475/

## Next production tasks
1. Artist checks remaining source-edge clipping and confirms permissions.
2. Draw/find real diagonal Walk frames for 4 Mega + Shiny without mirror/fake copies.
3. Add seven actions with original animation frames and correct eight-way row mapping.
4. Run strict validator, visually QA representative actions, integrate only on PC beta, then Web/Android, without changing existing save IDs.
