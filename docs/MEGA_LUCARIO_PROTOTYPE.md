# Mega Lucario proof of concept

- First Mega battle form for Lucario #448; temporary visual sprite #10448 (NOT a Pokédex species).
- PMDCollab/SpriteCollab source pinned at `448d3af85e2cfa85a8c5ead076eddb145251b473`, form `sprite/0448/0001`, attribution CC BY-NC 4.0. Requires noncommercial use and proper credit; Pokemon IP restrictions still apply.
- Seven animated sheets (Idle, Walk, Attack, Shoot, Charge, Hurt, Faint with fallback), offline packaged with 8 directions and shadow anchors.
- UI: circular pulsing Mega Stone button with 30s countdown, key M and reduced-motion support.
- Stats from official Lucario->Mega Lucario ratios: physical 145/110, special 140/115, defense 88/70, speed 112/90; HP and special defense unchanged. Active cooldowns and new cast cooldowns 30% shorter.
- Start by owning Lucario as selected partner, choose **Thử Mega Lucario (BETA)** in the main menu. In **solo** battle press `M` or the touch **MEGA** button; updated original stat ratios and -30% skill cooldown for 30 seconds, once per run. Restores exact base stats and standard sprite; save/Dex identity stays #448.
- Temporary preview only; no Gacha or Arena points granted, and it does not write Lucarionite into save. Future `save.megaStones.lucarionite` can enable it permanently after Mega Gacha releases.
- Disabled in Co-op, AI rooms and PvP until deterministic host/client synchronization and balancing are implemented.
- No new permanent benefits, no modification of normal Gacha odds, shiny odds, or starter.
- Build requires online SpriteCollab fetch at packaging time; game operates fully offline after packaging. Run `npm run prepare:game && npm run test:mega`.
