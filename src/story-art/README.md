# Pixel artwork for Chapter 0 / Tranh Chương 0

Upload these **two real images** into this folder to replace the primitive SVG illustrations:

- `eyes.webp` — the approved giant eyes under the night sky; Chapter 0 visual beats 1–3.
- `gate.webp` — the approved shining gate; Chapter 0 beats 4–5 and Pokémon awakening.

Images should be 16:9 WebP (1280×720 recommended). No words or UI baked into images; dialogue stays localized in code.

The shared `scripts/patch-story.cjs` copies these into `vendor/pokesurvivor/assets/story/` as part of building Windows, Android and Web. If files are missing, the old lightweight generated SVG fallback is used instead, with a warning in the build logs. Uploading or replacing either file changes `src/**` and triggers fresh builds.

**Please do not delete / overwrite browser storage or player saves to update illustrations.**

- `reveal.webp` — a NEW third illustration, the approved image WITHOUT the person, for the Pokémon result scene only (after the personality quiz). The existing `eyes.webp` and `gate.webp` stay unchanged. The starter Pokémon canvas is visually 2× bigger **only** in reveal scene #5.

## Chương 2 – Tiếng Vọng Thứ Tám (chưa build)

Upload **hai hình WebP 16:9** vào chính thư mục `src/story-art/` này:

- `chapter2-orbs.webp` — Cảnh 1: vòng tròn tám sức mạnh, các Mystery Orb nổi lên (8 lượt thoại đầu).
- `chapter2-shadow.webp` — Cảnh 2: **cùng không gian/cùng bố cục cảnh 1**, nhưng có thêm hình bóng trắng bí ẩn xuất hiện (4 lượt thoại cuối).

Kích thước khuyên dùng: **1280 × 720**, WebP quality ~80–85. Không đè lên `eyes.webp`, `gate.webp` hoặc `reveal.webp`.

**Chỉ upload ở nhánh `wip/v14-story-art-missions`** nếu muốn chưa build: workflow tự động chỉ chạy trên `main`. Code dựng truyện đã tham chiếu tới hai tên này, và khi chưa có ảnh thì tạm dùng `gate.webp`.
