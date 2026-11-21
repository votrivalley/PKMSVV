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
- [ ] Azahar `skillqa`: a real 25-second Kanto run with at least two
  independently auto-casting passive skills and an active dash, verifying
  positive manual **and** AUTO cast counters in the native engine.
- [ ] Azahar recheck inherited x1.5 Kanto speed, Kalos 15/30-minute boss
  gate, and nonblank 10-region selection UI.
- [ ] Actual New 3DS manual input, two-second hold and effect visuals, skill
  cooldown UI, long-run stability and SD save QA.

PR is Draft, no merge/release/deploy. Back up the PKMSVV SD save before test.
