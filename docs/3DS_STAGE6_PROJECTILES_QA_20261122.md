# PKMSVV — 3DS Stage 6 Projectile (22/11/2026)

**QA DRAFT PR #42. Do not merge or deploy.** Native source data: 3DS v1.0.0 src/gen/gamedata.cpp, verified by [Actions #44932620009](https://github.com/votrivalley/PKMSVV/actions/runs/44932620009).

| New ID | Type | Cooldown | Damage | Native details |
|---|---|---:|---:|---|
| dragon-pulse | Dragon | 0.90 | 18.17 | speed 270, pierce 99 |
| sludge-bomb | Poison | 0.75 | 3.82 | poison 1, puddle 3 s, radius 32 |
| scald | Water | 0.55 | 22.90 | pierce 1, burn 1 |
| hurricane | Flying | 1.00 | 57.68 | pierce 99, knockback 240 |
| water-pulse | Water | 0.70 | 44.11 | stun 0.45 s |
| stone-edge | Rock | 0.85 | 42.72 | pierce 1, critical bonus 0.30 |
| pyro-ball | Fire | 0.70 | 18.56 | burn 1, pierce 3; Cinderace #815 only |
| snipe-shot | Water | 0.60 | 10.71 | pierce 99, critical bonus 0.30; Inteleon #818 only |
| spirit-shackle | Ghost | 0.75 | 24.41 | pierce 3, slow 0.50; Decidueye #724 only |

All nine use the native projectile ladder: +1 shot and spread ×1.4; damage ×1.45; cooldown ×0.75; +1 shot, +1 pierce, spread ×1.2.

## Implementation

- src/pkmsvv-3ds-stage6-projectiles.js: 9 new IDs; source values; signature-only locks.
- src/pkmsvv-3ds-projectile-stage6-fx.js: limited native-only extras: Water Pulse stun, Sludge Bomb poisoned puddles, per-projectile critical chance.
- scripts/patch-3ds-stage6-projectiles.cjs: sends Stage6 projectile-kind skills through the original Web shot/swept collision path, not native-only field dispatch. Preserves type chart, weather, original burn/poison/slow, knockback, walls and props.
- Puddle has a hard cap of 24 active fields, clear-on-match-reset, and a ghost-effect guard. **Damage-over-time balance is an adapter approximation** (30% of projectile base damage per half-second); the exact original 3DS DoT formula is not established by source-profile extraction. The native puddle duration, size, status and initial bullet damage are source-verified.
- Existing Web projectiles continue using their original crit roll. Stage6-specific 30% extra crit applies only to marked native bullets.
- Signature moves cannot be learned by the wrong species; casts are guarded. All newly registered IDs are excluded from active Co-op learn pools until network authority and replay QA.

## Verified QA

[Stage6 source and test CI #44933129467](https://github.com/votrivalley/PKMSVV/actions/runs/44933129467): **SUCCESS**. Web regression 379 PASS, 0 FAIL, 5 SKIP. Dedicated tests 71 PASS, 0 FAIL. Source-patch smoke passed and authentic mirror-based move-level checks confirm 64 original mirror IDs + 36 additions = 100. Actual source has 103 documented old IDs; Stage6 contributes 34 genuinely new IDs overall, so the expected production count would be 137, but cannot be proven by the public mirror.

### Release blocker

Pinned full-game upstream source JPTER78/pokesurvivor commit 11fe868c640b62ac37beacc222e056bc4d9ec892 is not currently accessible in CI. This PR cannot claim to build or run complete PKMSVV Web, Android or Windows. All real-device performance, multiplayer, Pippi, Fusion, Mega, full save and boss behavior remain pending.

No merge, deploy, signing, release, or save migration was performed.
