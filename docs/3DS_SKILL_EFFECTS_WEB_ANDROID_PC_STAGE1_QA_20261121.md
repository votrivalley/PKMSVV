# PKMSVV Web / Android / PC — 3DS Skill FX + Passive parity (QA pass 1)

**Branch:** `feature/web-3ds-skill-effects-passives-qa-20261121`, forked from the currently active Web/Android/PC staging snapshot `89398aa454283be0a9835b4828355a2cc8fe7531`.
**Never merge, deploy, sign or replace users' builds automatically.**

## Why not just copy CIA effects?

PokéSurvivor3DS v1.0.0 stores effect behavior in C++ (`src/core/fx.cpp`, `combat.cpp`, `levelup.cpp`) and uses 3DS rendering structures. The Web/PC/Android client already has equivalent pixel-art primitives in `js/entities/fx.js` and `vfx.js` (ring, slash, beam, particles, projectiles). Copying GPU resources or a CIA would provide no usable browser runtime. The original Web `js/systems/combat.js` only uses ~14 attack kinds; the newer 3DS port supports roughly 36 kinds. The **remaining 22 attack-kind implementations and their move data are not yet ported**.

## Implemented in this first shared-source pass

- Register six **in-run** passive cards inspired by 3DS: Critical Eye (+2% crit, capped here at 50% total), Brutal Hit (+5% crit damage), Hunter (+6% damage to bosses), Evasion (+3%, max 15%), Lucky Streak (+10% additive collected coin bonus), Coin Pouch (+60 coins in the current run).
- Use the existing source-level `G.LevelUp.STATS` candidate pool; do not replace earlier stats, abilities, Mega, Fusion, Pippi, Pokémon unlocks or Save Guardian.
- Once level ≥25 **or eight moves are learned**, offer **four different cards**, with a priority of two passive/stat choices where available. Earlier levels keep three-card offers and the existing early offensive move guarantee. Golden evolution card still takes priority.
- Existing PKMSVV navigation keeps **three visible cards per controller page**; R+X/Y/B picks and A turns pages; touch, mouse and keyboard still use the existing RunUI.
- Route real on-hit crit damage bonuses into both melee/direct and projectile hit calculations, and only apply Hunter to `enemy.boss`. Ordinary player hits can trigger dodge, but pure/true damage does not.
- Passive selection triggers lightweight ring/burst/text; crit and dodge show a subtle impact/streak from the **existing Web FX** sprites, throttled to reduce 8-skill particle storms.
- Port is in `src/pkmsvv-3ds-skill-port.js`, installed by `scripts/patch-3ds-skill-effects-passives.cjs` from the **common** `scripts/prepare-game.cjs` build stage. That is the source used when rebuilding Web, PC and Android; **existing precompiled bundles do not magically update**.

## Preserved boundaries

- No 3DS sprites or CIA bytes are imported.
- No permanent save fields, Android app ID, signing identity, achievements, gacha or Cloudflare deployment are changed.
- Additional effects are noncommercial fan-use, preserving JPTER78 and 3DS-port attribution and inherited licensing notices.
- No assumption that client-host/network synchronization covers new passive modifiers until real Co-op/Arena QA establishes it.

## Gates before a release

1. Node unit tests and project Web/controller/regression suites.
2. A fresh **source-generated compiled game** including this patch, not merely a reused `app.min.js`.
3. Playwright/Chromium Web smoke: level 24 vs level 25, 8 moves, 4 cards (pages 1–2), critical hits, damage to bosses, dodge and pure damage.
4. Native Android WebView and Windows/Electron gameplay, performance with 8 AUTO moves, gamepad/touch navigation, save/reload. Test both multiplayer and solo without state divergence.
5. Only after these pass, a separately authorized release/merge/deploy.

## Scope deliberately deferred
Additional 3DS move kinds (homing, bounce, quake, vortex, storm, leap, etc.) need their own native combat conversion, real data definitions, icon mapping, damage QA, multiplayer state/hash compatibility and FPS budgets; simply showing a graphic would produce deceptive non-working skills.
