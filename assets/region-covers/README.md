# Pokémon Chuyển Sinh — Region selection covers (QA only)

Place **exactly ten WebP images** here, on branch `feature/pokebox-stage1-isolated-qa`:

| Index | Region | Filename |
|---|---|---|
| 01 | Kanto | `01-kanto.webp` |
| 02 | Johto | `02-johto.webp` |
| 03 | Hoenn | `03-hoenn.webp` |
| 04 | Sinnoh | `04-sinnoh.webp` |
| 05 | Unova | `05-unova.webp` |
| 06 | Kalos | `06-kalos.webp` |
| 07 | Alola | `07-alola.webp` |
| 08 | Galar | `08-galar.webp` |
| 09 | Paldea | `09-paldea.webp` |
| 10 | Tháp Thiên Không (Sky Tower) | `10-sky-tower.webp` |

- Upload all ten **individual .webp files** into this exact folder, not the ZIP.
- Recommended 960 × 500 px or similar ~1.92:1 ratio, ideally under 300 KB each.
- The `src/pkmsvv-quick-region.js` chooser loads the fixed names as `images/regions/*.webp`, with a built-in original SVG fallback if a file is missing.
- QA packaging scripts copy these images to the right Web/Windows/Android bundle paths; simply uploading is **not** a live production deployment. Rebuild and download the QA artifact to view changed covers.
- These images illustrate the **Region selection cards only**; gameplay biome maps and reward/unlock logic are unchanged.
- Never upload or modify player saves here.
