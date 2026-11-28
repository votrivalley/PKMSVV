# Big Update completion tracker — 2026-11-28
Base 353b82ec99846c8a9aec2febea26d24a27462a65. Verified private Mega run 46123716240: 51 recovered forms, 102 variants, 714 sheets, 5712 direction rows, 20/20 native combat pilots and lifecycle; 87/96 preview possible, only 10 new forms battle-tested. Original 36 sprite-ready unchanged; 10 missing/partial or derived. No public release of Reloaded artwork. Owner reports verbal closed-group permission; written record pending.

This commit implements cosmetic Mastery and permanent recruitment egg incubator in isolated native QA:
- Native start/end hook, species at start (Normal/Shiny share Mastery), only local solo Explore, min 60s, points floor(minutes)+floor(kills/100)+5 per boss (max 5 bosses, 120 points/run), tiers 20/60/150/350/750, title and portrait gold/glow only; no avatar profile selector or combat aura/stat effect.
- Real 15m badge boss can grant one egg after run, only discovered but unowned regional nonfossil rarity 1–5 with Idle/Walk, max six queued, one incubating; progress from real result kills, goal 500, no Gacha grant yet. Native permanent owned + individual copy if migrated; no forced migration or forged defeated flag; save rollback on hatch failure. Separate lab support tab. Save Guardian checks mastery/egg loss and legitimate hatch.
- Native QA fixture seeds egg at 499 and requires actual kill and actual native result after 61s; validates hatch via UI. Unit tests cover no duplication, failure and mode scope. New CI pending.

Remaining acceptance gates (do not claim complete):
1. 1025 species/388 variants: real compiled inventory captured; exact source variant mapping, per-variant identity, dex persistence and sprites still outstanding.
2. 176 moves native port and Fusion tested previously on PR42 ancestor; compare against current Web Big Update exact IDs/effects; Signature Move+ not implemented.
3. Mega 41 remaining preview-only (40 Web plus Sceptile), 10 total gaps; 32 Gigantamax source sheets and actual combat verification pending. Dynamax/Z/Tera logic implemented and unit-tested, native lifecycle QA pending; no new power in competitive modes.
4. Long-run stress, mobile/controller and actual physical Co-op retest pending after combined changes.
5. Mastery and egg UI/runtime now in QA; native CI not yet verified, additional Gacha/mission egg sources and optional cosmetics pending.
6. Galar-only Eternamax phase boss (keep native 15m/30m gate), Munchlax Berry quest, optional Wisdom and Blank TM still pending. No x3 XP change. Blank TM requires explicit Save Guardian legitimate-removal transaction rather than weakening regression detection.
No merge/deploy. Web/PC/Android final package parity and stable APK signature remain release gates.
