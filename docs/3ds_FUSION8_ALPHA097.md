# PKMSVV 3DS — Alpha 09.7 Fusion8 QA (Draft only)

Extends [Alpha 09.6 PR #39](https://github.com/votrivalley/PKMSVV/pull/39) with **one isolated diagnostic**, not a claim that all Web Fusion behavior has been ported.

## New test
- Boot the actual 3DS native game in Azahar, load 8 distinct learned moves in Solo Explore.
- Invoke **real C++** `player_bond_options` and `player_fuse` twice: 8 singles → 7 groups (one pair) → 6 groups (one triple).
- Assert original 8 move instances are present **exactly once** across slots (no loss, duplication or out-of-range index), active slot stays valid, independent combat casts still happen.
- Verify HUD calculation for 5–8 compact cells uses 27px icons with 3px gaps, stays inside the orb reserve on 320px bottom screen, and render/touch formulas match in source.
- Build both CIA and 3DSX with **unchanged PKMSVV Title ID** and native save directory. QA is opt-in via `sdmc:/3ds/pkmsvv-kanto01/autotest.txt` containing `fusion8qa`. No save schema migration.

## Explicit limitations
- This tests the real native Fusion engine path; it **does not** emulate tapping all Fusion menu buttons or validate every Fusion combination.
- Azahar 3DSX boot does **not** establish that CIA installation, hardware touchscreen or 30-minute New 3DS performance passes.
- No physical SD save / resume validation has been performed. Test with an SD backup before using this QA CIA.
- Existing native sprite inventory (1,175 Normal / 1,159 Shiny) is **not** evidence of new Web sprite imports.
- Do not merge or deploy to stable, PC/Web or Android based on this gate alone.

## Evidence markers (must all be present to declare QA PASS)
```
PKMSVV_SKILL096_EIGHT_SETUP_PASS
PKMSVV_FUSION097_SETUP_PASS
PKMSVV_FUSION097_RUNTIME_PASS
PKMSVV_SKILL096_EIGHT_RUNTIME_PASS
```

CI build and runtime results should be linked here **only after** Actions actually completes.