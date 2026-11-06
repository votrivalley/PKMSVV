# Butterfree Altcolor #012 — research-only asset vault

**Status:** `RESEARCH_ONLY` · `assetOnly: true` · `gameplayEnabled: false`

## Why only a manifest?
The SpriteCollab submission/use policy and root license are **CC BY-NC 4.0** (attribution + noncommercial). The original Pokémon / Chunsoft artwork and inherited material may be subject to third-party rights not resolved by that license. This public PKMSVV branch therefore stores **only metadata, immutable source URLs and Git blob SHA-1 checksums**. It stores **no raw PNG or XML** and does not package the asset into Web, PC or Android. If future rights are confirmed, a separate review will be required before staging binaries.

## Identity and separation
- Pokémon #012 Butterfree, alternate color index `portrait/0012/0002` and `sprite/0012/0002`; never map this to normal or Shiny dex IDs.
- Base source pinned to PMDCollab/SpriteCollab commit `13eb5a7733c5f5ba66031a2c5fb7bc67371d7310`.
- Source portrait revision: [Some_Shinx commit](https://github.com/PMDCollab/SpriteCollab/commit/47539496eb043ba69bf89f3862377706fb10eebb).
- Compared Git blobs with Butterfree base (`portrait/0012`, `sprite/0012`). **All 16 portrait PNG blobs differ from normal; all 12 root `*-Anim.png` blobs differ from normal.** The **12 `*-Offsets.png`**, **12 `*-Shadow.png`**, and `AnimData.xml` are **byte-identical** to normal at pinned source revision (identical Git SHA-1). This indicates a visual recolor with shared animation geometry, not an independently redrawn offset set. Precise color/wing/eye differences are **not visually verified** without decoding original PNGs.
- The repository also contains nested `sprite/0012/0002/0000/0002` and `0001/...` variants. They are inventoried, not merged into the root alternate-color identity. See manifest for their exact names/checksums.

## Inventory at the pinned revision
- **Portraits:** 16 separate PNGs: Normal, Angry, Crying, Determined, Dizzy, Happy, Inspired, Joyous, Pain, Sad, Shouting, Sigh, Stunned, Surprised, Teary-Eyed, Worried.
- **Base motion:** 12 `*-Anim.png` spritesheets + 12 `*-Offsets.png` + 12 `*-Shadow.png` + `AnimData.xml` + `credits.txt` (38 base files). Animation names: Walk, Attack, Shoot, FlapAround, Sleep, Hurt, Idle, Swing, Double, Hop, Charge, Rotate. The thirteenth XML entry **Strike** is an alias `CopyOf=Attack`, **not** a missing `Strike-Anim.png`.
- **Nested variant motion:** 114 additional file entries under two alternate subtrees. Total **169 file entries** across selected portrait and sprite trees, including credits and XML.
- **Frames:** `AnimData.xml` includes frame width/height, durations and selected `HitFrame`, `RushFrame`, `ReturnFrame`. Metadata suggests an existing production animation set, but pixel dimensions, 8-direction occupancy, pivot offsets and cropping cannot be certified without binary sheet inspection. **Do not claim 8/8 verified.**

## Artist credits — do not collapse names
Portrait credits (`portrait/0012/0002/credits.txt`):
- `2023-05-02` `<@!356635814668664832>`, marker `PMDCollab_1`: **Normal**.
- `2026-11-05` `<@!1519393734008115314>` **Some_Shinx**, marker `CC_BY-NC_4`: **the other 15 expressions**.
Sprite credits (`sprite/0012/0002/credits.txt`):
- `2023-05-03` `<@!356635814668664832>`, marker `PMDCollab_1`: **all listed animations** including Strike (alias).
Base Butterfree `sprite/0012/credits.txt` lists CHUNSOFT/Unspecified, reinforcing that underlying derivative rights need specific consideration. No independent permission beyond this was checked.

## Safety conditions
- No gameplay, Gacha, Pokédex, Mega, Fusion, save or Pokémon ID edits.
- No game asset import, build job change, public PNG redistribution or auto-enabled species.
- Future adoption checklist: obtain permission where required; preserve complete artist/CHUNSOFT attribution; download original files to a permitted local/private staging area; verify SHA-256, PNG dimensions, 8 directions and animation frame/pivot/crop in-engine; test against regular/Shiny.

**Manifest:** [manifest.json](./manifest.json) — full pinned source URLs, file sizes and Git blob SHA-1, not SHA-256.
