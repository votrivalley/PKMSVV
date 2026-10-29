# Arena Solo 1v1 / Champion 16 — v1.5.48 authoritative specification

This document supersedes the Arena/Champion gameplay description in `ARENA_CHAMPION_CHAPTERS_1_6.md` (v1.5.44). That earlier writeup describes the now-removed mandatory fifth Champion boss. **Do not recreate that fifth boss.** Source of truth: `src/pkmsvv-champion-arena.js` and `src/pkmsvv-arena-solo.js`.

## Entry and story

- Arena is a common top-level mode with **Solo 1v1** and **Champion 16**.
- Chapter 5 introduces Co-op, Sống Còn, Tranh Trứng. Finishing all three genuine modes unlocks the Chapter 6 Arena story. Do not count lobby creation or abandonment.
- Chapter 6 authorizes Arena play. Champion tournament victory in the **fourth real fight** grants the first Crown Seal and opens Chapter 7, which unlocks the Mega system with its remaining Pokémon/Stone/story prerequisites. Keep the prior cúp, Crown Seals, Arena Points and Mega Stones in saves.
- Chapters 8 and 9 remain intentionally undesigned.

## Solo 1v1 (implemented local AI beta)

- A single human fights a **local AI**, not a connected second player. World preparation is solo-isolated, 10–15 minutes randomly chosen per run. AI preparation is simulated and not visible/controllable on a second live map.
- Warning 30s before the duel. Safe Pokémon selection overlay in the last 10s; among owned species, identical human/AI Pokémon cannot be chosen. Three-second VS overlay precedes the duel.
- Both parties use a normalized duel baseline (320 HP, base speed 112, base attack 1.3 for player; AI boss HP/speed 320/112). Farmed skill build carries into the duel. Monster mobs cleared before battle. Duel limit 240s; ring begins shrinking at 150s; remaining HP percentage breaks a timeout tie.
- No Arena Points or tournament trophies are granted by Solo AI matches.
- **Not complete:** real two-player LAN PvP, simultaneous independent remote map simulation and server-authoritative PvP damage/hit registration. Must build and QA separately; do not relabel the current AI match as two connected humans.

## Champion 16 (implemented local AI beta)

- One player and 15 AI enter the bracket. At least two elites; remaining AI tiers random. The 15 AI-only matches are simulated to avoid burdening offline or low-power Android; the human fights four real consecutive duels.
- First **and every subsequent** round starts with 180 seconds of actual local monster farming and skill upgrades. The floating Ready button can skip remaining prep if the player wants. Actual normal enemy spawn is enabled during prep, and suppressed during duels. Existing mobs/projectiles/pickups are removed before each duel.
- Tier behavior: elites use skills more frequently, without stronger normalized base HP. Duels normalize player HP/speed/attack and AI HP/speed, preserve player skill progression and restore original farming stats afterward.
- Winning the final directly awards Champion cup, Crown Seal (once per region), 10 yellow single Gacha tickets per recorded best rank, 40 first-time tournament Arena Points / 20 repeat, and 100 Arena Points on first regional Champion Seal. Existing earned rewards are not erased. Losing semifinals opens a third-place playoff and 3 tickets on win; losing final yields second and 6 tickets. Tournament participant earns PokéCoins.
- Prize screen features three Pokémon on gold/silver/bronze pedestals, animated confetti, and a Hall of Fame record with winning Pokémon, region, result and time. History is merged by deduplication across offline saves.
- Tournament remains **offline 1-vs-AI**, not a true 16-player LAN session; LAN trainer maximum remains 10.

## Test and release

- Run `npm run test:arena:solo`, `npm run test:arena:champion`, `npm run test:story:gates`, `npm run test:mega:gacha` after game preparation.
- All platform builds share source and UI. Retain Android `com.votrivalley.pkmsvv.fulllan`, permanent signing identity/certificate and versionCode increase. Do not tell users to uninstall and lose their save.
- Live physical PC/Android/Web gameplay and LAN PvP require validation beyond Node tests before considering feature fully delivered.
