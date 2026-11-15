# Fusion Skill Icons — Pokémon Chuyển Sinh

10 original illustrated Fusion skill icons approved for asset handoff. Upload the 10 **individual WebP files** into this directory. Do not upload the ZIP as a single GitHub file.

**Path:** `assets/fusion-icons/` on branch `feature/pokebox-stage1-isolated-qa`
**Format:** 256 × 256 px, square, WebP lossless with alpha transparency.
**Filename convention:** exactly `RECIPES[].id + '.webp'` from `src/pkmsvv-bond-fusion.js`.

| Fusion (VI) | Recipe ID / Filename | Source moves |
| --- | --- | --- |
| Lướt Lửa | `ember-quick.webp` | ember + quick-attack |
| Húc Sóng | `water-tackle.webp` | water-gun + tackle |
| Dây Leo Xoáy | `grass-spin.webp` | vine-whip + rapid-spin |
| Lướt Điện | `spark-quick.webp` | thunder-shock + quick-attack |
| Húc Tâm Linh | `mind-tackle.webp` | confusion + tackle |
| Lốc Lửa | `fire-gust.webp` | flamethrower + gust |
| Bong Bóng Băng | `bubble-ice.webp` | bubble-beam + ice-shard |
| Lá Sắc Đá Rơi | `leaf-rock.webp` | razor-leaf + rock-tomb |
| Bóng Ma Siêu Năng | `shadow-mind.webp` | shadow-ball + psychic |
| Vuốt Sét | `thunder-claw.webp` | thunderbolt + metal-claw |

## Upload
1. Extract `PKMSVV-Fusion-10-Icons-WebP-256.zip` locally.
2. Open this GitHub folder on the exact QA branch.
3. Click **Add file → Upload files** and choose all ten `*.webp` files.
4. Commit to this QA branch, not `main`.

## Integration rule
Uploading assets **does not** yet implement the final Fusion gameplay discussed in chat. The current `src/pkmsvv-bond-fusion.js` still has pilot/free-bond behavior. The new rule (both source skills at MAX, once per run, two skill slots replaced by one special Fusion) and the unique attack effects need code changes and testing before production release. The renderer/packaging must load these filenames explicitly; never claim assets have deployed automatically. Preserve PC/Android/Web parity and gamepad/keyboard control.
