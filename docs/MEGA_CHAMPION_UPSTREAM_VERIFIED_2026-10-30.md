# Champion Mega sprites – strict upstream validation (30 Oct 2026)

## Decision
**Stage4A hand-drawn Scizor diagonals are REJECTED and must not be used.** This audit uses source trackers to avoid treating similarly named variants as Mega. Nothing in this research is battle-ready, and no game builds, save keys or Mega stones were modified.

## Verified upstream (30 Oct 2026)
- PMDCollab/SpriteCollab `master` tracker (10.5 MB): https://github.com/PMDCollab/SpriteCollab/blob/master/tracker.json
- NotSpriteCollab `main` tracker (2.57 MB): https://github.com/marius851000/NotSpriteCollab/blob/main/tracker.json
- **All 8 exact Mega entries** in PMDCollab `tracker.json` have `sprite_complete:0` and **zero sprite_files**. These are placeholders, not eight-direction walking/attack sheets.
- Scizor `sprite/0212/0003` is **Cutscene** and `0005` is **Cutscene_Altcolor**. Both have animated sprites, but neither is Mega Scizor. Swampert `0260/0002`, Garchomp `0445/0003`, Dragonite `0149/0002` are **Altcolor**, not Mega. Golisopod `0768/0002` is **Alternate**. Falinks `0870/0002` / `0003` are **Brass** and **Trooper**, not Mega.
- NotSpriteCollab tracker has no exact `Scizor_Mega`, `Mega_Scizor`, etc. among these eight; `Garchomp_Alternate_Shiny` exists but is **not** Mega.
- Latest playable fan ROM project Pokémon Mystery Dungeon Explorers Remixed publicly reports **Mega Scizor / Swampert / Dragonite / Greninja / Golisopod** among forms using Shiny placeholders due to missing animation: https://projectpokemon.org/home/files/file/5247-pok%C3%A9mon-mystery-dungeon-explorers-remixed/

| Champion | Exact SpriteCollab path | Name | Complete | Anim entries | Status |
|---|---|---|---:|---:|---|
| Dragonite-Mega | `sprite/0149/0001` | Mega | 0 | 0 | Missing |
| Scizor-Mega | `sprite/0212/0001` | Mega | 0 | 0 | Missing |
| Swampert-Mega | `sprite/0260/0001` | Mega | 0 | 0 | Missing |
| Garchomp-Mega | `sprite/0445/0001` | Mega | 0 | 0 | Missing |
| Greninja-Mega | `sprite/0658/0002` | Mega | 0 | 0 | Missing |
| Golisopod-Mega | `sprite/0768/0001` | Mega | 0 | 0 | Missing |
| Falinks-Mega | `sprite/0870/0001` | Mega | 0 | 0 | Missing |
| Baxcalibur-Mega | `sprite/0998/0001` | Mega | 0 | 0 | Missing |

## Source leads with honest limits
- Willøw's Eevee Expo OW pack: Mega Scizor/Swampert/Garchomp/Dragonite have **4 cardinal walking directions**, no verified eight-way attacks. Source: https://eeveeexpo.com/resources/1475/
- PokéRogue/Showdown fronts/backs and animated battle GIFs provide a **side-specific battle reference**, not eight-way overworld motion: https://github.com/pagefaultgames/pokerogue-assets
- Ghasty_001 animated Mega Dragonite **front/back combat sprite** by RetroNC, not eight-way PMD sprites; explicit author credits: https://eeveeexpo.com/threads/9059/
- PMD Sprite Tool and PMDSpriteManager can correctly parse and repackage **existing genuine PMD 8-direction source art**, but do **not create missing art**: https://github.com/netraular/PMDSpriteManager
- Existing official 3D Mega Scizor assets in Rescue Team DX cannot simply be treated as licensed redistributable pixel sprites.

## New read-only checker
`scripts/audit-champion-mega-upstream.cjs`, with deterministic test `tests/champion-mega-source-audit.test.cjs`, uses **exact variant name + ID** rather than guessing from folders. No images imported or form flags changed.

Use:
```sh
node scripts/audit-champion-mega-upstream.cjs --fetch --out /tmp/champion-mega-upstream.json
node --test tests/champion-mega-source-audit.test.cjs
```
For offline trackers: `--spritecollab tracker.json --notcollab NotSpriteCollab-tracker.json`.

A status of `unverified_candidate` **never means playable**. For future sources, validate the original PNG/XML, 8 facing-direction rows, 7 action sets, coordinates, credits and permission individually before setting `assetOnly:false`.

## Safe next work
1. Prioritize *source discovery / artist permission*, not manually distorted Mega imitations.
2. Keep existing 36 audited genuine PMD candidate forms from the catalog in their QA lane. Do not claim 8 newly ready Champion Megas.
3. If a complete genuine Mega sprite is published, validate geometry/timing/actions with the existing `build-mega-forms.cjs` gates on PC only, before Web/Android.
4. Continue developing the Arena and Champion features independently; absence of Mega sprites should not block functional fixes or corrupt saves.
