# Berry Rescue tree sprites (optional WebP atlas)

**Upload one file only:** `berry_trees_3x6.webp` into this directory:
`src/berry-tree-assets/berry_trees_3x6.webp`.

The script `scripts/patch-berry-coop.cjs` automatically copies it into
`vendor/pokesurvivor/assets/berry-trees/berry_trees_3x6.webp` during PC/Web/Android offline builds.
The in-game URL is `assets/berry-trees/berry_trees_3x6.webp`.

Dimensions: **1152 × 576 pixels**, RGBA transparent, lossless WebP.
Each cell: **192 × 192 pixels**.

| Row index | Tree / objective |
|---|---|
| 0 | Pink Berry / Oran |
| 1 | Yellow Berry / Sitrus |
| 2 | Mixed Berry / Lum |

Column indices (left to right): **100%, 80%, 60%, 40%, 20%, 0% HP**.
Image cropping is performed in `src/pkmsvv-berry-rescue.js`.

If the WebP has not been uploaded or cannot decode, gameplay falls back to the original Canvas tree; no broken image boxes or online fetches.
The six stages change visual appearance only; tree HP, three-host LAN synchronization and Berry rewards are still authoritative in gameplay code.

**Don't rename this file** or place it inside `assets/berry/`: those are the ten 32px Berry item icons, not the Berry Rescue environmental trees.

For browser pixel art use Canvas `imageSmoothingEnabled=false`; the current renderer draws one cropped cell at 90 × 90 world pixels, with the trunk anchored near the objective ring center.
