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

- [x] 3DSX/CIA native compilation, original isolated Title ID and save path unchanged
- [x] Binary RomFS normal/shiny/directional sprite audit completed (existing assets; not new Web sprite imports)
- [x] Azahar skill8qa 8 distinct learned moves casting independently and using real move icons
- [x] Azahar skillqa original 4-skill and manual/AUTO dash regression
- [x] Azahar x1.5 realtime, Kalos boss 15/30 gate and native menu regression
- [ ] Physical New3DS 8-icon touch, all Fusion menu paths, 30m frame-rate and real SD-save persistence — pending

Draft-only PR; do not merge or deploy main/Web/Android. Back up the entire sdmc:/3ds/pkmsvv-kanto01 folder before installation.

## CI evidence — 2026-11-21

- **Compiled native CIA + 3DSX PASS:** [Actions #44886104602](https://github.com/votrivalley/PKMSVV/actions/runs/44886104602), `PKMSVV-3DS-WEB-SKILLS-8SLOTS-SPRITES-ALPHA096`, source `782566349029bc3b3097ef8fd5fdf2bbbb57295d`. CIA SHA256 `4fdaefa5fc8d541c624409dcde94146df56bba8db04d86ff7fa8948cb381d8d0`, 3DSX SHA256 `ce0cbce131aa3f6980ee26b94fb277512bfa0826dcf0be800f561ba5524c346a`.
- **Azahar QA PASS:** [Actions #44886359624](https://github.com/votrivalley/PKMSVV/actions/runs/44886359624), artifact `PKMSVV-3DS-SKILL096-AZAHAR-EVIDENCE`. Compiled binary hashes and source SHA verified.
- Sprite source inventory: `PKMSVV_SPRITE096_AUDIT_QA_PASS normal=1175 shiny=1159`, descriptor integrity and native texture page existence checked. No normal sprite missing Gen1–6; six region bosses have sprite files. `PKMSVV_SPRITE096_WEB_BINARY_PARITY_STILL_PENDING` is intentional.
- 45-second 4-slot backward compatibility: `PKMSVV_SKILL095_RUNTIME_PASS moves=4 passive_casts=56 manual_dash=1 auto_dash=11`, average 60.0 FPS, minimum 59 in Azahar.
- **30-second real eight-slot game run:** `PKMSVV_SKILL096_EIGHT_SETUP_PASS slots=8 moves=8 cap=8`, `PKMSVV_SKILL096_EIGHT_RUNTIME_PASS slots=8 moves=8 cap=8 casts=79`, plus `PKMSVV_SKILL095_RUNTIME_PASS moves=8 passive_casts=79 manual_dash=1 auto_dash=7`; average 60.0 FPS, minimum 60 in this emulator short smoke. Nonblank 1280×800 screenshot `PKMSVV_SKILL096_EIGHT_ICON_SCREENSHOT_PASS` **is not proof of touchscreen hit regions or visual similarity**.
- Original Kanto solo speed regression `PKMSVV_SPEED_REALTIME_PASS game=18.00 wall=12.16 ratio=1.481`.
- Synthetic Kalos boss kill gate `PKMSVV_REGION09_BOSS_CFG_PASS first=700@900 second=718@1800`, `PKMSVV_REGION09_KILL_GATED_ZYGARDE_PASS`; 10-region UI nonblank screenshot `REGION09_KALOS_UNLOCK_UI_CAPTURE_PASS`.
- **Still unverified:** actual physical New 3DS CIA install and held touch controls, precise Web sprite binary sync, individual eight skill icon readability on 320×240 lower display, Fusion in eight-slot states, long-run performance and SD save-reload after unlock. The independent 30m gate is a synthetic diagnostic, NOT a full 30-minute live session.
