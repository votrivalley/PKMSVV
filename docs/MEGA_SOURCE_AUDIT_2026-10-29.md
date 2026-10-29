# PKMSVV — Mega source audit (2026-10-29)

**Source readiness, not a promise of shipped functionality.**

Authoritative battle/form list: Pokémon Showdown `data/pokedex.ts`, pinned commit `ccfaa20f32af363569cd21a9d501b2bc1ded26b1`.
Sprite source: PMDCollab/SpriteCollab `tracker.json`, pinned commit `448d3af85e2cfa85a8c5ead076eddb145251b473`.

* **96** distinct official Mega form records (Meowstic male/female collapsed as one cosmetic family).
* **36** have a candidate PMD animation set with Idle, Walk, Attack and Hurt tracked.
* **6** contain some animation files but cannot be accepted for game without animation fallbacks/QA.
* **54** lack a qualifying animated Mega set in SpriteCollab.

**Important:** `sprite_complete=1` is a repository status, not finished runtime QA; an individual `AnimData.xml` and PNG sheets must pass parsing, directions, first-frame texture loads, credits, and gameplay checks before enabling a form.

## Available candidates for the import pipeline

| Dex | Mega form | Source directory | PMD sprites |
|---:|---|---|---:|
| 6 | Charizard-Mega-X | `sprite/0006/0001` | 13 |
| 65 | Alakazam-Mega | `sprite/0065/0001` | 13 |
| 94 | Gengar-Mega | `sprite/0094/0001` | 13 |
| 115 | Kangaskhan-Mega | `sprite/0115/0001` | 13 |
| 142 | Aerodactyl-Mega | `sprite/0142/0001` | 13 |
| 150 | Mewtwo-Mega-Y | `sprite/0150/0002` | 12 |
| 208 | Steelix-Mega | `sprite/0208/0001` | 15 |
| 227 | Skarmory-Mega | `sprite/0227/0001` | 13 |
| 229 | Houndoom-Mega | `sprite/0229/0001` | 17 |
| 248 | Tyranitar-Mega | `sprite/0248/0001` | 13 |
| 282 | Gardevoir-Mega | `sprite/0282/0001` | 14 |
| 302 | Sableye-Mega | `sprite/0302/0001` | 14 |
| 303 | Mawile-Mega | `sprite/0303/0001` | 35 |
| 308 | Medicham-Mega | `sprite/0308/0001` | 13 |
| 310 | Manectric-Mega | `sprite/0310/0001` | 14 |
| 323 | Camerupt-Mega | `sprite/0323/0001` | 12 |
| 334 | Altaria-Mega | `sprite/0334/0001` | 13 |
| 354 | Banette-Mega | `sprite/0354/0001` | 13 |
| 359 | Absol-Mega | `sprite/0359/0001` | 10 |
| 362 | Glalie-Mega | `sprite/0362/0001` | 13 |
| 380 | Latias-Mega | `sprite/0380/0001` | 16 |
| 381 | Latios-Mega | `sprite/0381/0001` | 16 |
| 384 | Rayquaza-Mega | `sprite/0384/0001` | 11 |
| 428 | Lopunny-Mega | `sprite/0428/0001` | 18 |
| 448 | Lucario-Mega | `sprite/0448/0001` | 14 |
| 475 | Gallade-Mega | `sprite/0475/0001` | 13 |
| 491 | Darkrai-Mega | `sprite/0491/0002` | 11 |
| 530 | Excadrill-Mega | `sprite/0530/0001` | 13 |
| 604 | Eelektross-Mega | `sprite/0604/0001` | 13 |
| 670 | Floette-Mega | `sprite/0670/0006` | 13 |
| 691 | Dragalge-Mega | `sprite/0691/0001` | 13 |
| 718 | Zygarde-Mega | `sprite/0718/0005` | 13 |
| 719 | Diancie-Mega | `sprite/0719/0001` | 13 |
| 780 | Drampa-Mega | `sprite/0780/0001` | 13 |
| 807 | Zeraora-Mega | `sprite/0807/0001` | 15 |
| 978 | Tatsugiri-Curly-Mega | `sprite/0978/0003` | 14 |

## Partly drawn; needs animation repair

- **Slowbro-Mega** — Walk, Attack, Strike, Shoot, Twirl, Idle, Swing, Double, Hop, Charge, Rotate, Special1 (sprite/0080/0002)
- **Sceptile-Mega** — Walk, Idle, Rotate (sprite/0254/0001)
- **Sharpedo-Mega** — Walk, Attack, Idle, Double, Rotate (sprite/0319/0001)
- **Chimecho-Mega** — Idle, Rotate (sprite/0358/0001)
- **Scrafty-Mega** — Walk, Attack, Sleep, Idle, Swing, Double, Rotate (sprite/0560/0001)
- **Hawlucha-Mega** — Walk, Idle, Swing, Double, Rotate (sprite/0701/0001)

## Gaps in originally proposed 10 regional Champions

| Region | Planned Mega | Source readiness |
|---|---|---|
| Kanto | Charizard-Mega-X | sprite-ready |
| Johto | Scizor-Mega | missing |
| Hoenn | Swampert-Mega | missing |
| Sinnoh | Garchomp-Mega | missing |
| Unova | Excadrill-Mega | sprite-ready |
| Kalos | Greninja-Mega | missing |
| Alola | Golisopod-Mega | missing |
| Galar | Falinks-Mega | missing |
| Paldea | Baxcalibur-Mega | missing |
| Votri Valley | Dragonite-Mega | missing |

Only **2 of 10** original picks are sprite-ready. For a first release use ten distinct non-legendary candidates from the 28 available before promising 10 region-accurate champions.

## Rules before integrating

1. Preserve permanent Pokémon Dex IDs: Mega forms are variants, not new species/Gacha entries.
2. Copy each source `credits.txt` and preserve CC BY-NC 4.0 attribution; check official franchise rights separately.
3. Check source `AnimData.xml` and 8-direction motion for Idle/Walk/Attack/Hurt; fallback only for secondary actions.
4. Import in offline asset packages during CI, never fetch from the internet at runtime.
5. Select a unique virtual sprite key by form, e.g. Charizard Mega X and Y cannot use one key.
6. Use official per-form stats/abilities from the pinned data; adapt carefully to PKMSVV's action stat system, not one fixed +% buff.
7. Mega legendaries remain feature-locked behind story quests and earned stones; no freebies in production save.
8. If an incomplete Mega lacks moving sprites, leave the form unavailable; never render the generic yellow placeholder in release.
9. Keep new Mega UI separate from four/eight skill slots; Mega cooldown stays reversible and host-authoritative online.

## Recommended first 10 Champion Mega candidates with usable animation data

- Kanto: Charizard-Mega-X
- Johto: Steelix-Mega
- Hoenn: Gardevoir-Mega
- Sinnoh: Gallade-Mega
- Unova: Excadrill-Mega
- Kalos: Floette-Mega
- Alola: Drampa-Mega
- Galar: Houndoom-Mega (guest Pokémon, not native to Galar)
- Paldea: Tatsugiri-Curly-Mega
- Votri Valley: Tyranitar-Mega

Special note: Tatsugiri-Curly-Mega has a distinct animated form in SpriteCollab; the other Tatsugiri Mega shape variants currently do not. If Kalos Floette-Mega is reserved for a mini-quest, substitute Lopunny-Mega or Altaria-Mega.

## Unavailable forms

Venusaur-Mega, Charizard-Mega-Y, Blastoise-Mega, Beedrill-Mega, Pidgeot-Mega, Raichu-Mega-X, Raichu-Mega-Y, Clefable-Mega, Victreebel-Mega, Starmie-Mega, Pinsir-Mega, Gyarados-Mega, Dragonite-Mega, Mewtwo-Mega-X, Meganium-Mega, Feraligatr-Mega, Ampharos-Mega, Scizor-Mega, Heracross-Mega, Blaziken-Mega, Swampert-Mega, Aggron-Mega, Absol-Mega-Z, Salamence-Mega, Metagross-Mega, Staraptor-Mega, Garchomp-Mega, Garchomp-Mega-Z, Lucario-Mega-Z, Abomasnow-Mega, Froslass-Mega, Heatran-Mega, Emboar-Mega, Audino-Mega, Scolipede-Mega, Chandelure-Mega, Golurk-Mega, Chesnaught-Mega, Delphox-Mega, Greninja-Mega, Pyroar-Mega, Meowstic-M-Mega, Malamar-Mega, Barbaracle-Mega, Crabominable-Mega, Golisopod-Mega, Magearna-Mega, Magearna-Original-Mega, Falinks-Mega, Scovillain-Mega, Glimmora-Mega, Tatsugiri-Droopy-Mega, Tatsugiri-Stretchy-Mega, Baxcalibur-Mega

**No Mega pack was added to the game by this audit.** This change is documentation/catalog only, safeguarding existing PC/Android/Web/Switch builds.