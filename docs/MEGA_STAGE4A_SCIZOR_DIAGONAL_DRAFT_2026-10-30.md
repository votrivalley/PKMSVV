# REJECTED — DO NOT USE (2026-10-30)

The user rejected all four hand-drawn diagonal Scizor and Shiny Scizor directions as visually incorrect and poor-quality. These Stage 4A draft sprites are **cancelled**, not real source art, not approved, and **must never be imported into builds, candidate Mega packs, or cited as finished eight-direction sprites**. Discard Stage4A draft atlases and GIFs. No new sprite images from Stage4A were committed to the repository. Retain verified original four-direction source sheets and the independent PA2.1 tooling. Further art work should use verified source animations with appropriate permissions; do not synthesize or mirror inaccurate Pokémon silhouettes.

---

# Mega Stage 4A — Scizor 8-direction Walk art DRAFT (2026-10-30)

## Work completed
- Drafted **four new 3/4 angle Scizor views**: front-left, front-right, back-left, back-right. Original normal and Shiny variants, 4 Walk keyframes each view.
- Unlike 2D flip/rotate cheats, each view uses separately specified geometric details (occlusion, far/near claw, back helmet, wings and legs). This is **prototype art**, not final Pokémon sprite art.
- Reused the PA2.1 **original** 4 cardinal Walk directions (front/left/right/back) and confirmed all 16 source frames per variant remain pixel-for-pixel unchanged.
- Local generator creates two 384×768 RGBA Walk atlases (8 rows × 4 columns, 96px cells), two GIF animations with diagonal previews, side-by-side overview PNGs, and a manifest marking **battleReady: false** and **16 diagonal frames per variant not approved**.
- 16/16 draft diagonal cells for both variants contain nontransparent drawn pixels and are pairwise distinct; this **does not mean** the animation is visually approved. The original author/source permissions are still unresolved.
- Local QA package includes the drawing generator `build-scizor-diagonal-draft.py`, source-independent hand-edited view definitions and browser viewer. The **ZIP is given in the conversation**, not committed with Pokémon fan-art bytes to a public repo.

## Repository changes
- `tools/mega-eightdir-studio/index.html` now supports loading a user-selected 384×768 8-way draft PNG into the currently selected Pokémon/variant/action, retaining actual sourced cardinal Walk slots and **never auto-approving any imported draft cells**. No new gameplay flags.
- All prior PA2.1 files, save keys and full-PC Mega candidate rules unchanged.

## How to review
1. Extract `PKMSVV-Mega-Stage4A-Scizor-8Huong-DRAFT.zip` on PC.
2. Open `PKMSVV-Mega-Stage4-Scizor-Diagonal-Draft/index.html` locally and toggle Normal/Shiny, front-left/back-left/back-right/front-right. All pixels are rendered nearest-neighbor at identical effective scale.
3. Compare orange **DRAFT** angles with green **SOURCE** angles in overview images. Check body outline, near/far pincer placement, wings, legs, transition while turning, and scale. At this stage the rough diagonal art may not match source character-quality; artist review and redraw should occur before game test.
4. Download `tools/mega-eightdir-studio/index.html` from this repo; open offline. Upload the original 384×384 PA2.1 source PNG in the Studio's source control, then choose action Walk and upload a supplied 384×768 draft PNG to **Nhập sheet nháp 8 hướng**. Verify the diagonal frames and approve each one *only if correct*.
5. Export a JSON draft and run `scripts/validate-mega-eightdir.py` with the same valid PA2.1 sheet. Even a fully approved Walk sheet is **not ready** for runtime because other action sets and source permissions remain missing.

## Still missing / release gate
- All 16 newly drawn oblique Walk frames per Normal/Shiny still require art review.
- Same four diagonal art sets for Swampert, Garchomp and Dragonite not yet drawn.
- Original eight-direction Idle / Attack / Shoot / Charge / Hurt / Faint actions (and proper durations/anchors) for every form.
- Correctness of character silhouette, original contributor credit and distribution/modification permission. No sprite image assets added to repo; no enabled Mega Stone or automatic unlock.

**Current status:** Stage4A Scizor only: **8-direction Walk prototype**, **not** playable/approved Mega animation.
