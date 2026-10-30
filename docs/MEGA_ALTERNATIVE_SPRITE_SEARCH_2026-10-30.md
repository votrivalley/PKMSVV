# PKMSVV — Deep Mega Sprite Source Search (30 Oct 2026)

**Scope**: Search for the eight missing original Champion Mega forms after the 29 Oct SpriteCollab audit. This is a **research handoff**, not a claim that eight ready-to-play sprites have been imported.

## Verified research findings

The original PMDCollab/SpriteCollab *master* currently does not expose the eight requested Mega form directories, including Greninja `sprite/0658/0002`. Its `sprite/0006/0001` Charizard Mega X is accessible as a positive control. `audinowho/CustomSpriteCollab` repository tree also has no requested Mega sprite subtrees. Source absence does not mean all sprite artwork is unavailable on the Internet.

**All eight Champion gaps have at least one static pixel/battle sprite or small animated front sprite found outside SpriteCollab**, but **none has been confirmed as a full ready-to-import eight-direction set** with seven action sheets (`Idle Walk Attack Shoot Charge Hurt Faint`). Do not change `sprite.state` from missing to sprite-ready based on a single front/back PNG or animated battle GIF.

| Region | Requested form | Verifiable pixel/battle source | Overworld/other leads | 8-dir animated ready? |
|---|---|---|---|---|
| Johto | Scizor-Mega | https://play.pokemonshowdown.com/sprites/gen5/scizor-mega.png ; https://play.pokemonshowdown.com/sprites/ani/scizor-mega.gif | Eevee Expo Mega OW pack; Ser's PokeMMO Mega Scizor mod | **No confirmation** |
| Hoenn | Swampert-Mega | https://play.pokemonshowdown.com/sprites/ani/swampert-mega.gif ; https://play.pokemonshowdown.com/sprites/gen5/swampert-mega.png | Eevee Expo Mega OW pack; Ser's PokeMMO Mega Swampert mod | **No confirmation** |
| Sinnoh | Garchomp-Mega | https://play.pokemonshowdown.com/sprites/gen5/garchomp-mega.png ; https://play.pokemonshowdown.com/sprites/ani/garchomp-mega.gif | Eevee Expo Mega OW pack; Ser's PokeMMO Mega Garchomp mod | **No confirmation** |
| Kalos | Greninja-Mega | https://play.pokemonshowdown.com/sprites/gen5/greninja-mega.png ; https://play.pokemonshowdown.com/sprites/afd/greninja-mega.png | Smogon community sprite thread has artists credited | **No confirmation** |
| Alola | Golisopod-Mega | https://play.pokemonshowdown.com/sprites/gen5/golisopod-mega.png ; https://play.pokemonshowdown.com/sprites/afd-back/golisopod-mega.png | Smogon community front/back sprites | **No confirmation** |
| Galar | Falinks-Mega | https://play.pokemonshowdown.com/sprites/afd/falinks-mega.png ; https://play.pokemonshowdown.com/sprites/afd-back/falinks-mega.png | Smogon community regular/shiny sprites | **No confirmation** |
| Paldea | Baxcalibur-Mega | https://play.pokemonshowdown.com/sprites/gen5/baxcalibur-mega.png ; https://play.pokemonshowdown.com/sprites/afd-back/baxcalibur-mega.png | Smogon community pixel sprites | **No confirmation** |
| Votri Valley | Dragonite-Mega | https://play.pokemonshowdown.com/sprites/gen5/dragonite-mega.png ; https://play.pokemonshowdown.com/sprites/ani/dragonite-mega.gif | Eevee Expo **March 2026 ZA Mega** update explicitly includes a Mega Dragonite overworld form | **No confirmation** |

Caveat: Showdown `ani` contains battle-view animation, **not** 8-direction walking/action; `gen5` is typically a single static battle sprite. `afd` is a separate community/April-Fools sprite collection; visually check form and authorship, and never assume all are official overworld-ready designs.

## Confirmed sources, with reuse caution

- Pokémon Showdown battle front / back / Gen 5 pixel / GIF directories: https://play.pokemonshowdown.com/sprites/ ; front/back resources and `afd` do not provide a license to redistribute or grant 8-direction motion.
- Eevee Expo — Willøw, **Gmax, Mega and Primal OW Sprites Pack + ZA Mega**, last updated **30 Mar 2026**. The update explicitly lists Mega Dragonite along with Clefable, Hawlucha, Lucario Z, Raichu X/Y, Malamar, Starmie and Victreebel. **Do not presume remaining ZA Megas exist in this pack**, or that every OW sprite uses eight directions: https://eeveeexpo.com/resources/1475/updates ; https://eeveeexpo.com/resources/1475/
- Smogon April Fools sprite artists explicitly share front/back PNGs for Mega Falinks, Baxcalibur, Golisopod and other Z-A forms; **still image artwork**, author-credit and license permission check needed: https://www.smogon.com/forums/threads/april-fools-day-sprites.3719011/page-2
- Ser's PokeMMO Full Sprite Swaps specifically links Mega Scizor, Swampert and Garchomp ZIPs. Files/formats, provenance, redistributability and available directions need manual inspection before use: https://forums.pokemmo.com/index.php?/topic/170356-sers-full-sprite-swaps/
- PokéRogue gameplay sprite packs and static/animated credits are **front/back combat resources**, not proven 8-direction PMD sprite sheets: https://github.com/pagefaultgames/pokerogue-assets ; https://github.com/pagefaultgames/pokerogue/blob/beta/CREDITS.md
- Pokémon Workshop Legends Z-A GameDataPacks `graphics/characters` has base sprites and author credits, but 8 targeted base indices appear without confirmed form-specific Mega variants in folder listing: https://github.com/PokemonWorkshop/GameDataPacks/tree/main/Gen%209/Legends%20Z-A/graphics/characters

## Suggested integration workflow (not yet implemented)

1. Download or request explicit permission for each source from original artists; keep `CREDITS-MEGA.txt` and record license. PMDCollab assets require attribution and noncommercial use under **CC BY-NC 4.0**; Showdown, Eevee Expo and Smogon contributor licenses cannot be inferred from visibility alone.
2. Inspect ZIP/PNG dimensions and directions (minimum eight directions required for the existing PMD engine), verify color palette, true Mega identity, including separate Shiny variants.
3. Prioritize original regional battle form art (first 3 legacy Mega sprites + Dragonite OW reference), then commission/draw the missing directional action frames. Do **not** mirror front art and call it verified 8-direction.
4. If only front/back assets exist, classify them as `battle-portrait-only` in a *separate* source audit. Do not register them as `sprite-ready` or unlock form/battle gameplay, and never substitute generic silhouette as finished art.
5. QA every frame and all directions; verify PC/Web/Android resource packaging and sprite scale. Preserve original base species ID and save data, and gate legendary Rayquaza's separate quest.

## Related existing audit
- `docs/MEGA_SOURCE_AUDIT_2026-10-29.md`: 96 catalog forms; 36 animated candidates, 6 partial, 54 missing under pinned PMDCollab source.
- `docs/MEGA_PC_CANDIDATE_PACK.md`: PC candidates are asset-only except specified playable forms.
