# PKMSVV Mega Pokédex — Phase 2 (2026-10-29)

Nâng cấp → Tiến hóa Mega now displays all 96 audited forms, 12 at a time, with All / Unlocked / Locked filters. Locked cards and details show black silhouettes plus ???; names, Mega Stones, abilities and official Mega base stats appear ONLY after unlock. An authentic local Mega sprite is used when available; an unready form never displays a normal Pokémon in color as fake Mega art.

The UI is read-only and does not grant gameplay power, tickets or stones. It reads save.megaStones[stoneKey] (true, 1, or {unlocked:true}). Legendary/Mythical forms additionally require save.megaStoryCleared[showdownKey]===true; shared-stone forms also require save.megaForms[showdownKey]===true. Rayquaza has no Mega Stone and requires story completion. These story/form flags are reserved for future quests; none are written here. BETA Lucario preview is NOT a permanent discovery.

The same preparation pipeline compiles the offline 96-form catalog and UI for PC/Web/Android. PC Fast Start additionally includes its 36 candidate sprite animation packs. Assets are loaded locally only; the screen renders up to 12 grid sprites at once. Leave existing LAN, save keys, Android signing, Gacha, Shiny odds and PvP gameplay untouched.

Run npm run test:mega:phase2 after npm run prepare:lan. Phase 3 will implement quests/unlocks and validated battle transformations.
