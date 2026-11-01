# PKMSVV v1.5.64 — C + D + E (2026-11-01)

Source: `feature/lan-local-beta`. Shared HTML5 engine; Windows/Web/Android use the same patches. No engine swap, new sprite imports, or changes to the existing save schema.

## C. Held battle equipment + Kecleon

- Keep the upstream **one held item per match**, independent of two pre-run Berries.
- Picking a new item when one is held now shows **old vs new** descriptions and explicit **Keep / Equip / Skip** actions.
- The 11 upstream items are translated individually, including item drawbacks and conditional effects. The underlying `G.Items.BY` on/off, host authoritative Co-op equipment behavior, luck and drop percentages are unchanged.
- A UI epoch guard prevents double-clicking and stale callbacks. `runDiscardedItemIds` is an in-memory Set, reset at the next run; it never becomes a permanent blacklist or save field.
- Kecleon Shop and Bag explain the difference between run-only held gear and Mint/Capsule/TM/Berry. Shop tabs are sticky on Android; purchase buttons disable synchronously to avoid repeated mobile taps. No extra purchasable items.
- Source: `src/pkmsvv-held-item-ui.js`, `scripts/patch-held-item-ui.cjs`, `src/kecleon/*`.
- QA: `npm run test:ced`, `npm run test:kecleon`, `npm run test:choice:queue`.

## D. Solo PvE Fusion pilot

Engine owns the move instances, cast and all existing VFX. The pilot adds only five validated **two-move recipes**:

| Fusion name | Move 1 | Move 2 |
| --- | --- | --- |
| Lửa Lướt | Ember | Quick Attack |
| Thủy Kích | Water Gun | Tackle |
| Lốc Dây Leo | Vine Whip | Rapid Spin |
| Điện Quang | Thunder Shock | Quick Attack |
| Tâm Lực | Confusion | Tackle |

Rules: both moves must be learned, evolved and at max level, and be separate single-move slots; one Fusion per human Pokémon/run. Uses the original `Player.fuse`, no invented attack/stats and no permanent save unlock. The game's existing Bond logic remains untouched for **Co-op, AI, Royale, Egg Rush, Berry Rescue, Arena Solo/Champion** until net synchronization tests are approved. A new Pokémon knowledge article explains this restriction and recipes.

Source: `src/pkmsvv-bond-fusion.js`, `scripts/patch-bond-fusion.cjs`.

## E. Lễ Hội Sương Ký Ức — MVP seasonal visuals

- Fixed UTC window: **2026-11-01T00:00:00Z** through **2026-12-01T00:00:00Z** (end exclusive).
- One event ID: `mist-memory-2026`; configuration flag `enabled`.
- Three deterministic decorative terrain variants from the original run seed: Amber Leaves, Blue Mist and Firefly Dusk.
- Host stamps `seasonId` and `weatherState` on the existing room start packet. All clients reconstruct the same visual skin from their synchronized `seed`. Older offline room packets may derive this from the seed and current UTC window.
- Draw capped to 48 visual spots per camera pass; no new bitmap assets, no collisions, stat boosts, drop rates, AI pathfinding changes or new rewards. Runs in normal Solo PvE and Co-op Survival only. Competitive, Champion and Berry Rescue retain original visuals.
- No permanent save fields. Event automatically stops after the end UTC boundary. A home-menu notification and knowledge article describe it honestly.
- Source: `src/pkmsvv-season-event.js`, `scripts/patch-season-event.cjs`.

## QA / shipping

- `npm run test:ced` tests 11 held-item effects, once-only callbacks, five valid Fusion recipes and mode isolation, deterministic host/client seed equality, UTC schedule, visual draw cap, save isolation.
- Android, PC LAN, PC Fast Start and Cloudflare workflows run the C+D+E test gate before packaging and publishing artifacts.
- Browser tests and physical Android interaction still require manual device QA. Do not represent CI success as proof of flawless touchscreen behavior.
- Android update remains `com.votrivalley.pkmsvv.fulllan`, same fixed signing key with incremented `versionCode`; never use a DEBUG APK as an update or ask players to uninstall before exporting JSON.
- Future expansions (12 shop items, more Fusion recipes, seasonal cosmetics/rewards, procedural collisions) are **not** implemented. They require separate balancing and permissions decisions.

Rollback: disable `CONFIG.enabled` for season. Revert new script patch calls for C/D if needed; no old save migration required.
