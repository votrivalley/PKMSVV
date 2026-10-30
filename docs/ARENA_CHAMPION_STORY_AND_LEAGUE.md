# Pokémon Chuyển Sinh – Hành Trình Vương Miện và Giải Champion

## Status (2026-10-30)
- **Implemented in beta**: sequential 10-region Champion story, old save/seal compatibility, region-scaled AI, two fixed elite AI in a randomized 16-slot bracket, nonpersistent result podium, no reward on replay, AI-only Champion League unlocked after ten seals, repeatable League Arena Point payouts, map selector/random choice using interim game-owned biome renderers.
- **NOT yet implemented**: host-authoritative multiplayer bracket with real LAN human duels; 10 finished stadium pixel-art skins; Rayquaza sky stadium and boss gate. UI explicitly says AI-only until true network integration exists.
- Do not advertise simulated AI as connected friends or ship placeholder human slots as functioning PvP.

## Two branches
1. **Hành Trình Vương Miện** (story): Kanto → Johto → Hoenn → Sinnoh → Unova → Kalos → Alola → Galar → Paldea → Votri Valley. Region N requires the genuine seal from all N-1 earlier regions. Preserve an old region seal as accessible even when legacy saves have out-of-order trophies. First clear can grant story rewards and Crown Seal, replay cannot grant tickets, coins or Arena Points.
2. **Giải Champion**: unlocked after all 10 genuine seals, not a fake chapter flag. Reusable 16-slot knockout: 1 local human + 15 AI currently. Exactly two elite AI at tournament initialization; other AI are randomized trained/novice. Shuffle all slots including the local player. Placement-based Arena Points; no new story seals or story tickets. Must be a real match completion, never mere lobby join.

## Future true LAN Champion tournament
- Host-authoritative bracket state: stable tournamentId, 16 participant slots, join/leave and bot substitution, stage, map seed, finish results and idempotent rewards. Do not turn client-reported victory into points.
- Allow an existing authenticated local/Wi-Fi room with zero or more friends, filling all remaining tournament slots with AI. Host must not exceed practical concurrent client limits; bracket slots are logical entries, not 16 connected devices.
- Two fixed elite AI per tournament, other bots randomized to meet rising difficulty; never label bots as humans. Shuffle the 16 seed positions for real people and AI.
- Real trainer-vs-trainer damage, positions, chosen Pokémon, learned skills, status effects and deaths must be replicated across devices before enabling LAN PvP. Handle reconnect and forfeit.
- Standings/podium show exactly once on match/tournament completion, then close and clear on reopening the menu. Hall of Fame remains historical text, not an endlessly reappearing podium.

## Arena maps
- **Target art direction**: 10 dedicated, heavily-outlined pixel-art Pokémon stadium floors, one for each Champion. Uniform symmetrical collision/hitboxes, readable projectiles, low stands outside the playable ring, 1-2 symmetric obstacles only, no blurry filters. No copied third-party stadium assets without licensing clearance.
- **Temporary beta**: native biome theme list, not finished stadium art. Sky Arena (Rayquaza) is a separate eleventh venue and NOT an eleventh Champion.
- Story route uses the corresponding Champion venue; League can select an unlocked venue or Random. Future friend PvP should offer the same choice after the full 10-seal completion.
- **Balance**: do not grant type-based damage, cooldown, accuracy or stat boosts in scored multiplayer matches. Random arena should not determine the winner. If thematic hazards are added for story encounters, show them before battle and keep them symmetric; ranked PvP should use neutral collision and hazards.
- Existing Arena farming ×2 normal mob generation rate and ×2 normal mob EXP only during preparation, not selection/duels, boss kills or outside Arena. Existing mob hard cap applies for performance.

## Save migration rules
- Internal story keys `pkmsvvChapter6Seen`, `pkmsvvChapter7Seen` and existing reward ledger indexes represent legacy Arena/Mega gates; their visible headings were renamed to Chapter 7 / Chapter 8. Do not reset flags, renumber ledger indexes, mint a Berry preview ticket, or remove past trophies.
- New Chapter 6 Berry is only a disabled `Sắp ra mắt` placeholder until its real implementation.

## Acceptance tests before production
- Fresh save cannot skip Champion regions. Legacy 10/10 save sees all completed. Replaying a sealed region never adds any currency.
- Two elite AI exactly, full bracket is 16, human seat varies; late Champion rivals genuinely scale stronger. AI tournaments pay only after authoritative rank.
- Result podium never persists after closing/reopening. No AI-match payload is presented as a human LAN match.
- Verify actual PC/Web/Android LAN build and persist save integrity. Current beta changes require QA; workflow started does not equal passed.
