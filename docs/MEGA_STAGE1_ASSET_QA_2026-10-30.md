# PKMSVV – Mega Champion sprite stage 1: original-file QA

Date: **2026-10-30**. Branch: `feature/lan-local-beta`.

> Research/audit only. **Do not add these images to published builds or mark them as `sprite-ready`**. These are *not* verified Pokémon Mystery Dungeon-compatible 8-direction battle animation sheets. No gameplay, save, Mega Stone, or Champion unlocking code was changed in this stage.

## Summary

- Inspected original downloadable PNG files (not thumbnails) for **four of eight missing Champion Mega forms**, both normal **and Shiny**: Scizor, Swampert, Garchomp and Dragonite, from Willøw's Eevee Expo overworld pack.
- The regular files are **256 × 256 px** each, laid out in **4 rows × 4 columns**, i.e. **64 × 64 px cells**. Visual inspection identifies four cardinal orientations; **not eight directions**.
- Shiny sheets were also downloaded: Scizor **256 × 256**, Swampert **256 × 256**, Garchomp **254 × 256 (nonconforming width)**, Dragonite **256 × 256**.
- Simple per-cell RGBA pixel-hash comparison found **Scizor normal only 2 distinct cell appearances per row** (4 slots); other 256px-wide sheets have 4 distinct cells/row. Distinct hashes do not by themselves guarantee fluent motion.
- **None** of these assets supplies a standalone `Attack / Shoot / Charge / Hurt / Faint` eight-direction animation sheet required by `scripts/build-mega-forms.cjs`.
- For the remaining four Z-A Champion Megas (Greninja, Golisopod, Falinks, Baxcalibur), inspected PokéRogue asset metadata on the current public `beta` branch. Each `images/pokemon/{dex}-mega.json` **and** `images/pokemon/back/{dex}-mega.json` contains precisely **one frame**, no overworld direction/action metadata; `images/pokemon/exp/{dex}-mega.json` is absent. Battle portrait only.
- Verdict: **4/8 have real four-direction walking sheets; 8/8 have a useful visual/art reference; 0/8 newly meet the engine's eight-direction, multi-action animation requirements.**

## 1. Original Eevee Expo file audit

Main public pack: https://eeveeexpo.com/resources/1475/ ; source Drive: https://drive.google.com/drive/folders/1y_haYnjc2m5OuXgHp2ZDj_AmtnKD9cVW

All files were retrieved from linked public Drive folders, saved locally for QA, and inspected using Pillow in RGBA mode. PNGs are **not** committed to this repository.

| Champion | Normal source | Shiny source | Normal size | Shiny size | Pixel check | Classification |
|---|---|---|---|---|---|---|
| Scizor | [SCIZOR_1.png](https://drive.google.com/file/d/1FOOlixcycyxCP7xJg3tibVyWEL1Qh-WO/view) | [Shiny](https://drive.google.com/file/d/1lTANmj0V4ld9yoskQhDTOk6_DwQS-Pju/view) | 256×256 | 256×256 | 4×4 cells; only **2 unique normal poses per row** | 4-dir OW; motion needs work |
| Swampert | [SWAMPERT_1.png](https://drive.google.com/file/d/1u90HQQPOob1b464961hsQQWg3e3kxOO6/view) | [Shiny](https://drive.google.com/file/d/1jKKrfU5OHktDe4W_sQ-hoL_ryHNxeCJe/view) | 256×256 | 256×256 | 4×4 cells, all four cells per row differ | 4-dir OW |
| Garchomp | [GARCHOMP_1.png](https://drive.google.com/file/d/15MmZbmTznMx1wE3rI7XMAu0Rzzf-aIvs/view) | [Shiny](https://drive.google.com/file/d/19yp17y-FuMAwcSbEww4U-6TMyLbhUvFM/view) | 256×256 | **254×256** | 4×4 regular sheet; Shiny width not divisible by 4/64 | 4-dir OW; Shiny grid needs repair |
| Dragonite | [DRAGONITE_1.png](https://drive.google.com/file/d/14ruVXuwtlMPVuZRoKkIHNt076oUm4hLb/view) | [Shiny](https://drive.google.com/file/d/1d6uRPUlup_1yZfHfiFsh-6YkgTftd_j5/view) | 256×256 | 256×256 | 4×4 cells, all four cells per row differ | 4-dir OW |

Normal PNG SHA-256 digests used for inspection, to detect source drift:
- Scizor: `ed230edee85a12ae058e124222bc1422bdf60b35f44ed082b67eb64fc2c5ddf2`
- Swampert: `b56783ca947b13040f4c1453bedfaa77d6db606aa39bb87b0e7fa76ffd333a94`
- Garchomp: `50f71640cd6dd4411ea0b024d002ea083999fb187865d8f691b635768ad2e107`
- Dragonite: `7e5a60df3cefce6210c4dcf9c49e4a09a73794c3aa2e5edbd92344a0289af1c7`

The Eevee Expo author's public pack says Dragonite was added in the 30 March 2026 Z-A update. The linked Drive **Credits** document lists Kidkatt, Larryturbo and Princess-Phoenix for older Megas and DarkusShadow / BlueBirdDxD for Z-A Megas. These are **credits, not an explicit license grant to redistribute or modify all files**. See:
https://docs.google.com/document/d/11FoVLS6IMm38dqGkVlFddfUXznzRx6_sZ3lP1J5BFZ0/edit

## 2. Four remaining Z-A forms: verified single-frame battle art

Public repository: https://github.com/pagefaultgames/pokerogue-assets/tree/beta/images/pokemon

| Champion | Dex | Front JSON | Back JSON | Verified frame count | Verdict |
|---|---:|---|---|---:|---|
| Greninja-Mega | 658 | [front](https://github.com/pagefaultgames/pokerogue-assets/blob/beta/images/pokemon/658-mega.json) | [back](https://github.com/pagefaultgames/pokerogue-assets/blob/beta/images/pokemon/back/658-mega.json) | 1 + 1 | Battle still, not OW |
| Golisopod-Mega | 768 | [front](https://github.com/pagefaultgames/pokerogue-assets/blob/beta/images/pokemon/768-mega.json) | [back](https://github.com/pagefaultgames/pokerogue-assets/blob/beta/images/pokemon/back/768-mega.json) | 1 + 1 | Battle still, not OW |
| Falinks-Mega | 870 | [front](https://github.com/pagefaultgames/pokerogue-assets/blob/beta/images/pokemon/870-mega.json) | [back](https://github.com/pagefaultgames/pokerogue-assets/blob/beta/images/pokemon/back/870-mega.json) | 1 + 1 | Battle still, not OW |
| Baxcalibur-Mega | 998 | [front](https://github.com/pagefaultgames/pokerogue-assets/blob/beta/images/pokemon/998-mega.json) | [back](https://github.com/pagefaultgames/pokerogue-assets/blob/beta/images/pokemon/back/998-mega.json) | 1 + 1 | Battle still, not OW |

PokéRogue's `REUSE.toml` may attach file-specific licenses; project-wide description says assets generally use **CC BY-NC-SA 4.0 to the extent licensable**, subject to exceptions and franchise rights. **Do not use or redistribute without checking the exact files' rights/credits.** https://github.com/pagefaultgames/pokerogue-assets

Other leads not certified as 8-dir: Ser's PokeMMO mods contain follower sprites and credits (ZIP contents not inspected in this pass): https://forums.pokemmo.com/index.php?/topic/170356-sers-full-sprite-swaps/ ; Pokéngine pages show front/back and sometimes an Overworld heading but do not alone prove that directional PNGs exist.

## 3. Technical acceptance gates for Stage 2

The game engine's existing `scripts/build-mega-forms.cjs` requests **Idle / Walk / Attack / Shoot / Charge / Hurt / Faint**, each using valid metadata, frame dimensions, `>=8` facing-direction rows and legitimate PNG assets. Importer must not fake missing movement, stretch 254px Shiny Garchomp to fit, or mirror a front portrait into nonexistent back/side animation.

1. Preserve each author's identity, permission evidence and license terms before any redistribution. Respect the source's ownership and the Pokémon franchise's IP.
2. Map authentic 4-direction walks only as candidate **overworld previews**, never `G.PKMSVV_MEGA_READY` battle forms. Check whether permission allows adaptation to 8 directions.
3. For Scizor normal, review duplicated walk cells; for Garchomp Shiny, pad/crop carefully without resampling and confirm row/column frame alignment visually.
4. Commission/draw genuine 8-direction attack/hurt/faint etc. for the missing art, or locate a licensed source with those actions. Keep true Shiny art and scale.
5. Once each form is complete, run `test:mega:pack`, `test:mega:shiny`, animation rendering on actual PC, then Web/Android cross-platform QA. Keep Mega unlocks and old save flags unchanged until it passes.

**Outcome of Stage 1: source inspection completed; binary assets deliberately NOT imported to game or source control.**
