# Genuine Shiny Mega animations — 2026-10-29

The source is the pinned PMDCollab/SpriteCollab revision `448d3af85e2cfa85a8c5ead076eddb145251b473` (CC BY-NC 4.0, original credits included). Shiny is the form-specific artist-supplied `sprite/####/####/0001/` variant, NOT hue-shifted normal art. Verified by checking the pinned GitHub source trees.

Of 36 animated Mega candidates, 32 have published Shiny source subdirectories. Missing: Mega Skarmory, Mega Tyranitar, Mega Medicham and Mega Darkrai. The game must never recolor these or claim they are ready. Each imported Shiny must pass all seven action sheets, 8 directions, per-action metadata, and per-form attribution. If the source doesn't pass, the build must fail rather than ship an incomplete sprite. PC Fast Start packs all 32 Shiny candidates with all 36 normal candidates. Android/Web/iOS bundle the same three battle-ready preview forms, both normal and shiny: Mega Lucario, Mega Charizard X and Mega Excadrill. The other sprite candidates remain PC-only as asset previews to keep Web/Android package size manageable. Gameplay availability for those three is consistent across platforms, while the other 93 forms remain in the encyclopedia.

Game engine's native sprite variant path: `assets/pokemon/{megaSpriteId}/s/{Idle|Walk|Attack|Shoot|Charge|Hurt|Faint}.png`; metadata `G.SPRITE_META[megaSpriteId].sh=true` and `.sa`. The actual species save ID never changes.

Solo Mega Lucario BETA, Champion Mega Charizard X and Mega Excadrill inherit the original Pokémon's Shiny state, preload the matching Shiny sprites, and restore Shiny normal form after 30 seconds. If genuine shiny art is not shipped on a platform, no fake Mega Shiny is shown. LAN/PvP remain blocked until host replication.

Nâng cấp → Tiến hóa Mega has Thường / Shiny tabs. Shiny reveal requires both Mega unlock and owned base Shiny; otherwise dark silhouette and ???. An unlocked form with no verified Shiny art shows a missing-art placeholder instead of regular colors. No new Shiny grants, no Gacha odds changes, no Android identity/save migrations.

Test with `npm run test:mega:shiny` after preparation; Windows also runs the all-form sprite QA. Build statuses must be checked before announcing release artifacts.
