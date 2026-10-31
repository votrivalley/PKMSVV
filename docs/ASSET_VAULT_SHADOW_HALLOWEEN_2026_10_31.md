# PKMSVV — Shadow & Halloween asset vault (2026-10-31)

**Status: RESEARCH/STAGING ONLY. No imported gameplay sprites and no public release of third-party PNGs.** The user supplied a Doofcraft Shadow/Halloween RAR. Extracted locally and checked without altering the game's current Rayquaza, Tyranitar, Mewtwo or Mega sprites.

## Source / integrity

- Source site: https://pokesurvivor.doofcraft.com/
- User archive: `doofcraft_shadow_halloween_capture_kit (1).rar`
- Source archive SHA-256: `c88135e91d6e5d8ca2e8a105f0b01ff8469e9057328b4be6533e114dfc5657f7`
- Local research vault ZIP SHA-256: `4588d3eb289877dd51f183c51473669926f93790596365b1223dac422d8906e0`
- **Keep the raw RAR/ZIP in a private owner-controlled archive**. The public repository stores the inventory, provenance and planned usage only.
- Related earlier collections in the private vault: 421 Mega Normal/Shiny animation PNGs (41 candidate folders), 157 base Pokémon Idle PNGs and all user-supplied source reports. These may overlap and must not be naively added together as distinct Pokémon.

## Verified extraction

| Group | Form directories | Animation PNGs |
|---|---:|---:|
| `shadow/` | 22 | 146 |
| `halloween_featured/` | 6 | 38 |
| **Total** | **28** | **184** |

- The original local download report lists **184 downloaded and one HTTP 404**: `shadow/10902/Faint.png`.
- **178/184 PNGs** have dimensions matching the supplied animation metadata.
- The other **six PNGs** belong to `shadow/10902`: Attack, Charge, Hurt, Idle, Shoot, Walk. They open as PNGs but **all six have dimensions inconsistent with the metadata**; quarantine that form pending review and do not auto-import it.
- Shadow and Halloween are event/special sprite IDs, not proof of conventional Pokémon "Shiny" palettes. **Do not synthesize Shiny Shadow variants.**
- Captured sprite sheets are not sufficient by themselves to reproduce runtime frame timing, anchors and offsets; preserve the HAR-derived metadata in the private archive.

## Naming / future import plan

Use separate IDs/namespace, for example `shadow/<doofcraft-id>/<animation>.png` and `halloween_featured/<id>/<animation>.png`. Do **not** overwrite any existing base Pokémon, their Mega IDs, Shiny sprites, personal upgrades or save keys. The three Shadow Mega candidates are separate from the base Mega forms.

1. Verify every image and animation's dimensions, frame sequence, bounds, colors, 8-direction behavior, and sprite attribution.
2. Recheck `10902` and identify the missing Faint animation or provide a documented safe fallback based on a licensed source.
3. Audit custom Halloween map objects separately: pumpkin, grave, crypt, lantern and other objects were drawn in game code in the supplied evidence; they are **not standalone PNGs in this RAR**.
4. For any candidate with established distribution rights, import into an isolated namespace behind a **disabled feature flag**. Never silently include the assets in PC/Web/Android shipping bundles.
5. Maintain `assets/third-party/CREDITS.md` and per-file provenance, licensing and changes once assets are cleared.

## Licensing gate

Doofcraft image URLs accessible to a browser do **not** by themselves establish permission to redistribute its custom PNGs. PMDCollab's SpriteCollab uses **CC BY-NC 4.0** (credit + non-commercial conditions); other rights, including Pokémon IP and Doofcraft-specific original assets, may differ. For attribution consult https://github.com/PMDCollab/SpriteCollab/blob/master/LICENSE.md and the upstream contributor records.

Until licensing and origin are resolved, **do not commit the captured binary sprites to this public GitHub repository or distribute them in a release**. Keeping user-supplied research data locally is different from public redistribution.

## Follow-up

- Proposed endgame Shadow storyline: `docs/FUTURE_FINAL_CHAPTER_SHADOW.md`.
- QA helper for owner-side extraction: `node scripts/qa-shadow-halloween-assets.cjs path/to/downloaded_shadow_halloween`.
- The asset vault is for future use; **no chapter unlocks, save migrations, Android signing changes or public gameplay assets were implemented in this commit**.
