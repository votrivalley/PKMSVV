# PKMSVV – Stage 2: Mega overworld animation prototype (2026-10-30)

**Status: offline-only 4-direction walking PREVIEW, not production Mega animation.**

## Implemented
- Verified original normal and Shiny sheets for Mega Scizor, Swampert, Garchomp and Dragonite, 4 cardinal rows × 4 frames at 64×64.
- Produced offline HTML arrow-key viewer, 4 animated GIFs and comparison image for internal review (provided in conversation; **no licensed third-party PNG bytes are committed**).
- Added \`scripts/build-mega-overworld-preview.cjs\` for reproducible, opt-in local QA: it reads manually obtained source images from an input folder, checks geometry and distinct frames, writes only a scratch output folder and sets \`battleReady:false\`.
- Added \`tests/mega-overworld-preview.test.cjs\`; run via \`node --test tests/mega-overworld-preview.test.cjs\`.
- For Garchomp Shiny, source width 254px is extended with 2 **transparent** pixels on the right to achieve 256×256. There is no resampling/stretching. Scizor normal has only 2 unique poses per row.

## How to reproduce
Put the original downloaded PNGs in a temporary directory:
\`scizor_normal.png\`, \`scizor_shiny.png\`, \`swampert_normal.png\`, \`swampert_shiny.png\`, \`garchomp_normal.png\`, \`garchomp_shiny.png\`, \`dragonite_normal.png\`, \`dragonite_shiny.png\`.

Run:
\`\`\`sh
node scripts/build-mega-overworld-preview.cjs --input /path/to/original-ow --out /tmp/pkmsvv-ow-preview
node --test tests/mega-overworld-preview.test.cjs
\`\`\`
This creates scratch 4-dir normal/Shiny atlases and a QA manifest. **It does not write the real game asset directory**.

## What is still missing
- Diagonal 8-direction walking (4 diagonal headings), separate Idle, Attack, Shoot, Charge, Hurt and Faint. The current live engine requires authentic 8-direction action sheets and corresponding metadata.
- Sprite art for the other four champion Mega forms: Greninja, Golisopod, Falinks, Baxcalibur still only have battle front/back source PNGs with one frame each.
- Individual contributor permission/redistribution rules for the fan sprites and rights review. The public pack is posted as a resource, but that alone is not blanket permission to freely relicense and redistribute original artists' derivatives.

## Sources
- https://eeveeexpo.com/resources/1475/
- https://drive.google.com/drive/folders/1y_haYnjc2m5OuXgHp2ZDj_AmtnKD9cVW
- https://github.com/pagefaultgames/pokerogue-assets/tree/beta/images/pokemon
- Full source audit: \`docs/MEGA_STAGE1_ASSET_QA_2026-10-30.md\`

## Release gate
**DO NOT** set any new form to \`sprite-ready\`, \`artReady\`, \`battleReady\`, or \`PKMSVV_MEGA_READY\` from this material. Do not enable Mega use in gameplay, add it to Android/Web release bundles, or grant a Mega Stone. The next work item is authentic eight-direction action art + frame-level QA + explicit source permissions, followed by PC runtime tests.
