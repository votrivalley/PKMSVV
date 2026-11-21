# PKMSVV 3DS — Alpha 09.5: skill logic parity, stage 1

## Problem identified

The pinned PokéSurvivor3DS source runs only the currently selected slot via
`combat_tick(Game&,Player&,dt)`, although PKMSVV Web auto-casts the ordinary
learned moves independently. Switching slots on stock 3DS also clears orbit
projectiles and reduces cooldown. This affects combat much more than simply
porting new regions. Source comparisons: native `src/core/combat.cpp`,
`src/core/player.cpp` and PKMSVV Web `src/pkmsvv-runtime-controls-qa.js`
plus `src/pkmsvv-dash-queue.js`.

## Implemented — native PKMSVV Solo Explore only

- Every learned move **other than K_DASH** ticks and auto-casts
  independently with its native cooldown, target check, and attack/effect
  engine, without requiring the player to select each skill slot.
- Active dash-class moves (e.g. Quick Attack) do not auto-cast until AUTO is
  explicitly enabled. **Press/release X** to use manually, or touch the
  dedicated lower-screen `X: CHIÊU` button at x214–314, y128–160.
- **Hold X or the touchscreen button for 2 real seconds** to toggle AUTO.
  Button highlights green when AUTO is on; subsequent 2-second hold disables
  it. Touch move >18 px cancels to avoid joystick gestures toggling AUTO.
- Manual dash uses player movement direction when moving, and underlying
  native collision/attack logic. AUTO dash requires an in-range enemy; cycles
  among ready dash moves with a shared 0.65-second lockout.
- Changing the *visual focus* slot during PKMSVV Explore no longer clears
  orbits or resets cooldowns. Y still Mega; A uses Orb, B switches Orb; L/R
  still navigate visual skill slots. x1.5 speed from Alpha06.5 remains.
- All changes are isolated behind `cfg.kanto_only && nplayers == 1`
  and the app's `pkmsvv_explore_speed_allowed()` predicate. **Stock
  modes and Co-op lockstep are unchanged**.
- Native title ID `000400000F5B1400` and save directory
  `sdmc:/3ds/pkmsvv-kanto01/` are unchanged. AUTO is runtime-only; it
  resets for each new run.

## Not yet full Web parity

- The source-native level-up and HUD still offer at most **4 distinct new
  skill slots**; the fixed engine array itself holds eight MoveInst entries
  for bonded/fused moves, but eight individually learned skill slots are
  **not implemented** in this first slice.
- Native dash currently uses an instantaneous collision-safe dash instead
  of Web's framewise movement queue. Dash profiles, durations, full Fusion
  level cap, specific move effects and UI still need individual parity QA.
- No hardware input/long-hold or 30-minute high-density performance proof.

## QA plan

- [x] Build devkitARM native CIA and 3DSX with isolated title ID; [Actions
  #44880972109](https://github.com/votrivalley/PKMSVV/actions/runs/44880972109),
  artifact `PKMSVV-3DS-SKILL-PARITY-ALPHA095`.
- [x] Azahar `skillqa`: a real 45-second Kanto run with at least two
  independently auto-casting passive skills and an active dash, verifying
  positive manual **and** AUTO cast counters in the native engine.
- [x] Azahar recheck inherited x1.5 Kanto speed, Kalos 15/30-minute boss
  gate, and nonblank 10-region selection UI.
- [ ] Actual New 3DS manual input, two-second hold and effect visuals, skill
  cooldown UI, long-run stability and SD save QA.

PR is Draft, no merge/release/deploy. Back up the PKMSVV SD save before test.

## Verified native build and Azahar QA (2026-11-21)

- **Native CIA+3DSX PASS:** [Build #44881511699](https://github.com/votrivalley/PKMSVV/actions/runs/44881511699), artifact `PKMSVV-3DS-SKILL-PARITY-ALPHA095`, SHA256 CIA `9c1a97d46d0034bdb75c522023fa936f01aa88babd55c7e55b6e06327ee19b31` and 3DSX `49f07589df4a9374ffca055aac9768f289796e70618059a6a5cd9f1187ba2ea2`. Source commit `fc9f2b4d2d5467305a1935535ce703c6b41534b1` locked to QA.
- **Azahar QA SUCCESS:** [Run #44881727894](https://github.com/votrivalley/PKMSVV/actions/runs/44881727894), evidence artifact `PKMSVV-3DS-SKILL095-AZAHAR-EVIDENCE`.
- 45-second real engine skill test: `PKMSVV_SKILL095_SETUP_PASS moves=4 passive=3 dash=1`. `PKMSVV_SKILL095_RUNTIME_PASS moves=4 passive_casts=213 manual_dash=1 auto_dash=50 dash_cd=0.33` (60.0 average FPS, 59 minimum on Azahar short run).
- Previous build's 25-second test found `auto_dash=0`; actual defect was AUTO dash being constrained to normal target reach. New build picks nearest enemy up to a bounded radius and directs dash toward it; 50 AUTO casts confirmed.
- Inherited fixed-step ×1.5 regression: `PKMSVV_SPEED_REALTIME_PASS game=18.00 wall=12.16 ratio=1.481`.
- Kalos Zygarde #718 final: `PKMSVV_REGION09_KILL_GATED_ZYGARDE_PASS`; UI screenshot `REGION09_KALOS_UNLOCK_UI_CAPTURE_PASS (1280,800)` checks nonblank menu, not touch behavior.
- **Not verified by automation:** actual human long-press of X and touch for 2 seconds (CI injects the manual/AUTO state directly); physical New 3DS responsiveness, long-run performance with many enemy effects, 8 distinct learned slots, exact Web dash animation / Fusion compatibility. Do not mark these PASS.
