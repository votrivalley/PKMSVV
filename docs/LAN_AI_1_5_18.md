# LAN AI 1.5.18

- Fixed the level-up deadlock: every AI acknowledges its current reward sequence, including fallen AI. Human players still choose their own reward cards.
- AI selects from G.LevelUp.offer(player), using the same three legal cards, slot limits, skill pool, upgrades and evolution prerequisites. Ranking considers physical/special fit, type, missing ranged coverage and low-health healing.
- Bots are host-owned G.Player actors. Their movement, collision, terrain slowdown/damage, abilities, cooldowns, learned attacks, damage and Co-op revival use the existing game engine. Removed invented proximity damage and simulated client HP.
- Bounded A* routes around solid props and penalizes water/swamps or damaging terrain according to the Pokemon's actual types/ability/hover rules. A trainer already in liquid can route out. Steering considers nearby monsters, predicted hostile projectiles and ground warning zones. Learned dash skills may be used toward a clear, safer landing, with normal cooldown and shared dash lock.
- Co-op bots can approach fallen teammates to revive them. Royale bots remain eliminated. Egg Rush bots seek unclaimed nests, use normal PvP hit/slow/immunity processing, receive their own pet support and have the same two-revive limit as players.
- Bot projectiles keep simulating near their owner outside the Host camera. Projectile modifiers and healing belong to the actual owner.

## Validation

Run `npm run prepare:lan`, then `npm run test:lan:ai`.

Unit scenarios cover legal reward ranking, a fallen trainer's reward barrier, low-health recovery, pond detours, escaping water, water-type movement, solid-wall clearance, projectile/ground warning evasion, Royale elimination and Egg Rush objectives.

The compiled-game test starts three bots in each mode, downs all of them, opens two consecutive shared level rewards and verifies the human can resume. It also checks legal learned skill IDs/slots and real skill, projectile, ground-hazard and Egg Rush PvP damage. Existing multi-client LAN and native-PC connection tests remain enabled in CI.

The strategy is heuristic. Dodging is not guaranteed in a surrounded position, and AI can still be defeated under normal game rules. Device-to-device Wi-Fi QA remains separate from automated tests on one machine.
