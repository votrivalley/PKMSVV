# Mega Phase 3 — Champion Stone & limited solo runtime

2026-10-29. All code is on feature/lan-local-beta; source of truth is the existing 96-form offline catalog.

Agreed planned first ten Champion rosters (NOT completed tournaments): Kanto Charizard X, Johto Scizor, Hoenn Swampert, Sinnoh Garchomp, Unova Excadrill, Kalos Greninja, Alola Golisopod, Galar Falinks, Paldea Baxcalibur, Votri Valley Dragonite. Tournament design remains 16 players, 8→4→2→1, 3 minutes between rounds, then regional title defense and crown stamps. None of these wins/stamps is fabricated or awarded by this patch.

Mega Stone bonus: each successful paid Pokemon Gacha roll has an independent 1% chance of one stone randomly among the ten currently unowned Champion Stones. The stone appears on the same original pull card; it doesn't replace Pokemon, alter original rarity, pity-100, coins, tickets, or Shiny odds. A duplicate is excluded; only one per paid draw. Legend/mythical stones are intentionally absent from this first ordinary Champion pool; their rare-stone miniquest/storyline will require separate implementation.

Player unlock for ordinary Mega forms requires owned base Pokemon + matching Mega Stone + completed Chapter 3. Legendary/mythical forms keep their existing reserved story flags; variants sharing a stone require their own form flag. Rayquaza requires a special story flag, no stone. No shortcut, starter grants, or test-profile unlocks.

Battle: only solo, once per run, 30 seconds and 0.7 cooldown multiplier, stats transformed by each form's official base ratios with original save species ID unchanged. Implemented initially for Mega Charizard X and Mega Excadrill because these are the only two in the ten Champion roster with audited 8-direction SpriteCollab candidate art. On other platforms these two appear as battle-ready only if their art is actually bundled. Eight others remain locked against fake art. Mega Lucario's previous BETA remains separate and does not count as permanent discovery. No LAN/PvP Mega replication yet.

QA: npm run test:mega:phase3 after preparation. Do not ship a release build until relevant CI reports success. Android update must retain com.votrivalley.pkmsvv.fulllan fixed key and increasing versionCode.
