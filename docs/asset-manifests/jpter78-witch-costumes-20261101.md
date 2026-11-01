# PKMSVV — Witch Pokémon sprite source reserve (2026-11-01)

> **RESEARCH/SOURCE BOOKMARK ONLY — no third-party PNG files imported, no gameplay flags changed, no release.** This file reserves immutable source references for three cosmetic skins, pending artistic QA and per-skin licensing/attribution review. Its presence does NOT mark a skin battle-ready.

## Origin and license checkpoint

- Upstream: [JPTER78/pokesurvivor](https://github.com/JPTER78/pokesurvivor), pinned at commit `b742e43772e37d077549bf2fad3d615d60f42961`.
- Upstream [LICENSE](https://github.com/JPTER78/pokesurvivor/blob/b742e43772e37d077549bf2fad3d615d60f42961/LICENSE) states that `assets/pokemon/` sprites originate from PMDCollab/SpriteCollab under CC BY-NC 4.0 (noncommercial + attribution). [CREDITS.md](https://github.com/JPTER78/pokesurvivor/blob/b742e43772e37d077549bf2fad3d615d60f42961/CREDITS.md) lists contributors by Pokédex species, but **per-Witch-skin authorship, derivative permissions and original file provenance have not yet been independently verified**.
- Pokémon franchise IP is separately owned. **No public redistribution of candidate binary art until rights and original artist credit are confirmed.**
- Store third-party source PNGs in the owner's PRIVATE vault for review; this repository stores **only URL references**. Do not automatically package them in Web, Windows, Android or Switch.

## Exact source entries

| Costume | Dex | Pinned directory | Normal & Shiny files | Verified Normal PNG sizes (Idle / Walk / Attack / Shoot / Charge / Hurt / Faint) |
|---|---:|---|---|---|
| Witch Gengar | 94 | [k-bruja-gengar](https://github.com/JPTER78/pokesurvivor/tree/b742e43772e37d077549bf2fad3d615d60f42961/assets/pokemon/94/k-bruja-gengar) | seven root PNGs; seven matching `s/` PNGs | 384×448 / 192×448 / 968×768 / 864×640 / 480×448 / 128×576 / 192×448 |
| Witch Pikachu | 25 | [k-bruja-pikachu](https://github.com/JPTER78/pokesurvivor/tree/b742e43772e37d077549bf2fad3d615d60f42961/assets/pokemon/25/k-bruja-pikachu) | seven root PNGs; seven `s/` PNGs | 336×576 / 192×448 / 960×768 / 616×576 / 560×448 / 128×640 / 224×448 |
| Witch Umbreon | 197 | [k-bruja-umbreon](https://github.com/JPTER78/pokesurvivor/tree/b742e43772e37d077549bf2fad3d615d60f42961/assets/pokemon/197/k-bruja-umbreon) | seven root PNGs; seven `s/` PNGs | 560×512 / 192×448 / 800×704 / 528×512 / 480×448 / 144×640 / 192×448 |

- All three `Walk.png` files are 192×448, geometrically consistent with eight facing rows × 56 px per row (three horizontal 64 px frame cells). All seven verified normal sheets have heights compatible with eight rows, using different frame heights per action. Gengar's seven Shiny sheet dimensions also match its Normal counterparts.
- **Eight-row geometry does not prove eight distinct, visually correct viewpoints.** Independent PNG pixel/animation preview and exact runtime frame metadata, anchors/offsets, clipping, direction order and Shiny parity are still needed.
- This is costume/skin art **not Mega art**. Preserve base species ID, evolution/shiny/mega ownership state, save keys, and current animations.

## Checklist before any import

1. Confirm per-skin artist and its use, modification, attribution and redistribution permissions; collect the original credit file where possible.
2. Inspect real frame art: 8 distinct directions, animations for Idle/Walk/Attack/Shoot/Charge/Hurt/Faint, no duplicated fake diagonals, clipping or color/scale drift.
3. Verify `s/` Shiny images for all seven actions, geometry, original palettes and frame counts.
4. Stage in an isolated `skin-candidates/` namespace, **assetOnly=true / gameplayEnabled=false**, and keep out of public/production builds until cleared.
5. Test with PC's sprite renderer, then Web/Android. Avoid replacing `assets/pokemon/{dex}/` originals; track source hash and per-file credits.

## Other sprite status

- Original eight missing Champion Mega forms (Mega Dragonite, Scizor, Swampert, Garchomp, Greninja, Golisopod, Falinks and Baxcalibur) still lack qualifying PMD 8-direction multi-action sheets (see `docs/MEGA_CHAMPION_UPSTREAM_VERIFIED_2026-10-30.md`).
- The prior 36 candidate Mega animation sets in `docs/MEGA_SOURCE_AUDIT_2026-10-29.md` are a *different, partly asset-only* pipeline. Do not call them 36 newly playable forms.
- An earlier Doofcraft Shadow/Halloween owner-private archive is separately indexed at `docs/ASSET_VAULT_SHADOW_HALLOWEEN_2026_10_31.md`; avoid duplicate or confused credits.

**No source binaries, code, build settings, saves or Android signing identity changed by this reference document.**
