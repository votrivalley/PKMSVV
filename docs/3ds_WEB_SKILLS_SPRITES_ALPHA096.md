# PKMSVV 3DS — Alpha 09.6: Web skill awakening + verified sprite inventory

## Source, not an unverified visual port

Native source: PokéSurvivor3DS v1.0.0 (official homebrew CIA, pinned SHA256), plus PKMSVV Alpha09.5. Web reference: feature/lan-local-beta commit 0fa2af6129f7573ad764750a5cfd7ef8bf89913e.

PKMSVV Web's 3-to-8 learned-skill awakening triggers at cumulative 50/100/200 kills and 10/20 upgrade ranks. Native C++ now expands the Player arrays, arrangement scratch buffers and Fusion-selection scratch arrays to 8. Recalculates capacity from native Save stats plus current-run kills; **does not migrate Web/Android JSON saves**. Native Save does not yet contain global-team upgrade ranks, so only individual Pokemon ranks count. Original Co-op cap/rules are retained.

Exactly 103 original move cooldowns are read from PKMSVV docs/SKILL_BALANCE.md and applied in native Solo Explore on learning the move. Source file and Web milestone drift are build errors. Other native Gen moves are not silently rebalanced.

Native lower-screen icons: 1–4 slots retain 44px HUD; 5–8 use 27px icons in one row fitting the 320px screen between Orb controls. Existing move-icon textures are reused, with touch selection hit boxes matching the drawn positions. Manual/2s AUTO dash from 09.5 and solo x1.5 are inherited.

### Sprite assets: factual limits

Native ROMFS contains PSF1 animation descriptors (.fr) plus texture pages (.t3x). Build QA checks all descriptors and page references; prints counts for normal/shiny, 8-direction Idle/Walk per region Kanto–Kalos, and the six cover bosses. The report is pkmsvv-sprite-source-audit-096.json alongside CIA/3DSX.

This is **a verified inventory of existing native images, not a claim of importing updated Web Pokemon sprite sheets**. Full current Pokemon sheets and any missing new Mega/Pippi sprites were not found as versioned binary source assets in the checked Web repository. Source sprites must be supplied/identified, checked for usage rights, then converted before a truthful visual parity claim.

## Automated QA checklist

- [ ] 3DSX/CIA native compilation, original isolated Title ID and save path unchanged
- [ ] Binary RomFS normal/shiny/directional sprite audit
- [ ] Azahar skill8qa 8 distinct learned moves casting independently and using real move icons
- [ ] Azahar skillqa original 4-skill and manual/AUTO dash regression
- [ ] Azahar x1.5 realtime, Kalos boss 15/30 gate and native menu regression
- [ ] Physical New3DS 8-icon touch, all Fusion menu paths, 30m frame-rate and real SD-save persistence — pending

Draft-only PR; do not merge or deploy main/Web/Android. Back up the entire sdmc:/3ds/pkmsvv-kanto01 folder before installation.
