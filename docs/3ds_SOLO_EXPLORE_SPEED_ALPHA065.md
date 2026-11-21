# PKMSVV 3DS — Solo Explore ×1.5 QA (Alpha 06.5)

## What this build changes
- A new **touch pill x1 / x1.5** is overlaid on the top-right side of the lower-screen minimap: x250–312, y58–82. Tapping it toggles the speed. Touch events are consumed, so tapping the pill will not open the minimap legend.
- Affects **actual fixed simulation steps**: player, regular and boss enemies, cooldowns, pickups and region timeline all advance at approximately 1.5× real time. The simulated 15-minute boss should appear after about **10 minutes wall time**, and the 30-minute boss after about **20 minutes** on hardware able to sustain the required steps.
- Only solo Pokémon Chuyển Sinh native Kanto, Johto and Hoenn Normal Explore runs qualify. **Co-op, side modes, weekly and non-PKMSVV engine screens never get the speed toggle.**
- During pause, level-up and item choices, the extra simulation steps stop. Start a fresh run or return to the menu to reset to x1.
- The setting is a runtime toggle, never written to the SD or included in native Badge ledgers.
- This is **not an instant time-skip**. If New 3DS cannot keep up with the extra CPU work, game speed and frame rate can drop.

## Source & CI
- Native C++ patch applied after `port_slice06_hoenn.py`: `tools/3ds-native/port_slice065_explore_speed.py`.
- Build with `.github/workflows/build-3ds-explore-speed065.yml`; expected artifact: `PKMSVV-3DS-EXPLORE-X1P5-ALPHA065`.
- The optional Azahar `speedqa` mode starts a real Kanto test with speed enabled and logs `PKMSVV_SPEED_REALTIME_PASS` only when game time / actual host time is consistent with 1.5× (allowing startup jitter and real emulator timing).
- The preceding Kanto/Johto/Hoenn game rules and SD Badge formats stay unchanged, as does isolated Title ID `000400000F5B1400`.

## Hardware validation
- [ ] New 3DS actual CIA install, touch target visible and responsive
- [ ] x1 normal speed; x1.5 advances both combat and clock
- [ ] x1.5 reaches a Kanto boss at ~10 minutes wall time
- [ ] Pause/choice does not advance boss clock
- [ ] Reset speed after quitting/restarting, no Co-op control
- [ ] No stability regression in 30-minute run or saved Kanto Badge

**This is a Draft QA build, not a stable release.** Back up `sdmc:/3ds/pkmsvv-kanto01/` before testing.
