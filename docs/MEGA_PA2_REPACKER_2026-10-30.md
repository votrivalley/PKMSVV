# Mega PA2 – lossless overworld repacker (30/10/2026)

Status: QA-only tool and test. NOT battle-ready, not imported into releases, no unlock or save changes.

User feedback: Scizor Shiny, Swampert normal and Garchomp normal appear cut at source edges. Padded output reduces subsequent clipping, but cannot reconstruct source pixels.

## Run

Prepare source files from the Eevee Expo Willøw pack as:
scizor_normal.png, scizor_shiny.png, swampert_normal.png, swampert_shiny.png,
garchomp_normal.png, garchomp_shiny.png, dragonite_normal.png, dragonite_shiny.png.

Requires Python Pillow:
```sh
python scripts/repack-mega-overworld-pa2.py --source /path/to/source --output /tmp/mega-pa2
python -m unittest discover -s tests -p 'test_mega_pa2.py'
```

The script copies all 128 source cells bit-for-bit (64px) onto 96px transparent canvases with 16px padding per side, per-frame pixel hash and alpha-edge warnings. No scaling or invented content.
Shiny Garchomp source is 254×256; adds two transparent right pixels only and flags geometry for review.

## Real-source frame-boundary flags
| Form | Normal | Shiny |
|---|---:|---:|
| Scizor | 0 / 16 | 10 / 16 |
| Swampert | 7 / 16 | 5 / 16 |
| Garchomp | 16 / 16 | 12 / 16 |
| Dragonite | 13 / 16 | 13 / 16 |

Warning flags indicate source-edge contact; they do not prove missing content. Individual frames must be inspected by a pixel artist. These are still 4-direction walk sheets; missing 4 diagonal directions and separate Idle, Attack, Shoot, Charge, Hurt, Faint. Do not mark battle-ready.

Original source and credits: https://eeveeexpo.com/resources/1475/
Rights to modify or redistribute source fan sprites have not been independently verified; do not add PNGs to public releases.

Next: repair source-edge frame art with permission (especially the three reported variants), then obtain genuine 8-direction battle animation sheets and validate in PC, Web and Android.
