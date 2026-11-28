# Corrected G-Max upstream route — 2026-11-28

## Verified
- 3DS latest main 24d35fe7cc91c64da71aad603f2ff1dcb81ca482 (2026-11-26), src/core/power.h explicitly says the port lacks Gigamax while Web has 32 forms. src/core/power.cpp contains Dynamax, Z, Tera, Mega, not G-Max. No G-Max-named asset path in complete tree. https://github.com/juanluismm521/pokesurvivor3ds/blob/24d35fe7cc91c64da71aad603f2ff1dcb81ca482/src/core/power.h
- https://pokesurvivor.com/en/powers/ confirms 32 forms, 12s/80s, 3s signature waves. These differ from the local original two-species prototype (on-hit effects at 4s). Web also documents selectable Tera, Stellar, exclusive Z moves and automatic charge. Do not silently replace PKMSVV Arena progression/hotkey.
- https://pokesurvivor.com/ legal notice attributes most G-Max sprites to Pokémon Edición Reloaded (F3R and collaborators incl. Jhony_Ryu) and Venusaur/Butterfree to SrYena. SpriteCollab is not the main G-Max source. Code and third-party art permissions are separate.
- GitHub JPTER78/pokesurvivor returned 404; available checked mirrors are older October snapshots. The original public site is live but direct app.min.js/version.json retrieval from current environment failed. This does not imply that Web source or assets are permanently inaccessible.

## Next audit
Public index and bundle version/hash, literal G-Max references only. CI runs separately from gameplay, does not execute/download a game into PKMSVV or redistribute bundle or art. Confirm explicit artwork permission and exact sheet metadata before any import. Keep G-Max locked until verified. Existing integrated Fusion build unaffected; no deploy.
