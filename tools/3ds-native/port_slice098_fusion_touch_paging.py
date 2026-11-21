#!/usr/bin/env python3
"""Alpha09.8: native Fusion 8-choice paging on the 320x240 touch screen.
Apply after Alpha09.6 and Alpha09.7 QA patches. No save schema change.
The original list overflows below y=240 at 5+ choices; render 4 visible
rows, with page arrows clickable at the bottom and L/R support.
"""
from pathlib import Path
import sys

root = Path(sys.argv[1])

def patch(path, old, new, n=1):
    p = root / path
    code = p.read_text(encoding="utf-8")
    seen = code.count(old)
    if seen != n:
        raise SystemExit(f"FUSION098_ANCHOR_FAIL {path}: {seen}/{n} {old[:100]!r}")
    p.write_text(code.replace(old, new), encoding="utf-8")

patch("src/platform/3ds/app.cpp",
'''    if (nl > 0) {
      if (in.rep & KEY_DUP) r_->card_cursor = (r_->card_cursor + nl - 1) % nl;
      if (in.rep & KEY_DDOWN) r_->card_cursor = (r_->card_cursor + 1) % nl;
      const bool touched = in.tap && in.ty >= 92 && in.ty < 92 + 32 * nl;
      if (touched) r_->card_cursor = (in.ty - 92) / 32;
      if ((in.down & KEY_A) || touched) {
''',
'''    if (nl > 0) {
      // 320x240 lower-screen safety: four rows x 32px fit y=92..220.
      // Paging derives from the same cursor used by Renderer's Bond view.
      r_->card_cursor = clamp(r_->card_cursor, 0, nl - 1);
      if (in.rep & KEY_DUP) r_->card_cursor = (r_->card_cursor + nl - 1) % nl;
      if (in.rep & KEY_DDOWN) r_->card_cursor = (r_->card_cursor + 1) % nl;
      if (nl > 4) {
        if (in.down & KEY_L) r_->card_cursor = std::max(0, r_->card_cursor - 4);
        if (in.down & KEY_R) r_->card_cursor = std::min(nl - 1, r_->card_cursor + 4);
        // Tap the footer arrows, never conflate it with a skill choice.
        if (in.tap && in.ty >= 220 && in.ty < 240) {
          if (in.tx >= 0 && in.tx < 70)
            r_->card_cursor = std::max(0, r_->card_cursor / 4 - 1) * 4;
          else if (in.tx >= 250 && in.tx < 320)
            r_->card_cursor = std::min(nl - 1, (r_->card_cursor / 4 + 1) * 4);
        }
      }
      const int page_start = (r_->card_cursor / 4) * 4;
      const int visible = std::min(4, nl - page_start);
      const bool touched = in.tap && in.tx >= 8 && in.tx < 312 &&
                           in.ty >= 92 && in.ty < 92 + 32 * visible;
      if (touched) r_->card_cursor = page_start + (in.ty - 92) / 32;
      if ((in.down & KEY_A) || touched) {
''')

patch("src/platform/3ds/render.cpp",
'''    for (int i = 0; i < nl; ++i) {
      const MoveInst& m = p.moves[loose[i]];
      const float y = 92 + i * 32;
''',
'''    // Show only four Fusion options per page. No sprites/text below footer.
    const int page_start = (clamp(card_cursor, 0, std::max(0, nl - 1)) / 4) * 4;
    for (int i = page_start; i < std::min(nl, page_start + 4); ++i) {
      const MoveInst& m = p.moves[loose[i]];
      const float y = 92 + (i - page_start) * 32;
''')
patch("src/platform/3ds/render.cpp",
'''    if (mode == 1) text("A: elegir", 160, 226, 0.34f, rgb(0x8fa3c4), 1);
    else if (bond_first < 0) text("A: elegir el primero", 160, 226, 0.34f, rgb(0x8fa3c4), 1);
    else text("A: elegir el segundo · B (o A en el marcado): quitar", 160, 226, 0.34f, rgb(0x8fa3c4), 1);
''',
'''    if (nl > 4) {
      char page[32];
      std::snprintf(page, sizeof(page), "%d/%d", page_start / 4 + 1, (nl + 3) / 4);
      text("L / <", 34, 226, 0.34f, rgb(0x9ae6ff), 1);
      text("A: chọn", 145, 226, 0.34f, rgb(0x8fa3c4), 1);
      text(page, 224, 226, 0.34f, rgb(0xffd23f), 1);
      text("> / R", 289, 226, 0.34f, rgb(0x9ae6ff), 1);
    } else if (mode == 1) text("A: elegir", 160, 226, 0.34f, rgb(0x8fa3c4), 1);
    else if (bond_first < 0) text("A: elegir el primero", 160, 226, 0.34f, rgb(0x8fa3c4), 1);
    else text("A: elegir el segundo · B (o A en el marcado): quitar", 160, 226, 0.34f, rgb(0x8fa3c4), 1);
''')
print("PKMSVV_FUSION098_UI_PAGING_PATCH_PASS four_visible_rows=4 page_footer=220..239")
