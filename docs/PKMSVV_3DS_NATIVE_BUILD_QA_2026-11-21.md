# PKMSVV 3DS Native C++ — Engine QA / 2026-11-21

**NOT a full Pokémon Chuyển Sinh port.** The branch assembles an isolated, renamed native build of the public PokéSurvivor 3DS C++ engine. PKMSVV Web gameplay is not embedded.

## Build with GitHub Actions
1. Open Actions and select **PKMSVV 3DS Native C++ - ENGINE QA ONLY**.
2. Choose **Run workflow**, branch **feature/3ds-native-cpp**.
3. Verify the run is green SUCCESS (do not infer success from a created ZIP alone).
4. Download artifact **PKMSVV-3DS-ENGINE-QA-NOT-FULL-GAME**. It contains 3DSX, CIA and upstream licenses/credits.
5. For a modded New 3DS, install CIA with FBI; or copy 3DSX into sd:/3ds/ for Homebrew Launcher.

## Pinned verified inputs
- Public source: https://github.com/juanluismm521/pokesurvivor3ds
- Source v1.0.0 commit: 7468ec9ba88c374a9b51230c6c8ae481e3bb0ce2
- Official matching CIA SHA256: b1f24b348660e0f32a7395157b89046051eead87215535d428f9045bc4b75199
- CI extracts RomFS from that matching official CIA; no proprietary binaries or Pokémon sprite packs are committed into PKMSVV.
- A user-provided CIA was analyzed independently (4697 files) but is not substituted for the matching release.

## Do not overwrite existing installs or saves
- Experimental Title UniqueId: 0xF5B13; Product Code: CTR-H-PCS3.
- QA save folder: sdmc:/3ds/pkmsvv-3ds-qa.
- The upstream cloud sync and automatic update pathways are disabled for this QA build; server URLs are redirected to loopback.
- The QA title says *Engine Test* to distinguish it from a completed PKMSVV port.
- Keep all noncommercial source and sprite licenses/credits intact. No commercial reuse or implication of endorsement.

## Remaining work before PKMSVV 3DS
1. Verify compiled 3DSX/CIA both boot in Azahar and on New 3DS hardware.
2. Check sprites, button/touch input, music, performance, standby/resume and save/reload.
3. Port PKMSVV-specific chapters, Kanto, Pokédex and skills from JavaScript to C++, then Pippi, Fusion, ten regions, Arena, Co-op, Research Lab and Save Guardian compatibility.
4. QA memory/collision/stability; only then publish PKMSVV 3DS Beta.

**Build PASS proves only that the native engine prototype compiles and packages, not that the full PKMSVV gameplay has been ported.**
