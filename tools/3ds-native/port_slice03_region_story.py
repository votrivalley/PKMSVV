#!/usr/bin/env python3
"""PKMSVV 3DS native alpha03: actual region-selection scene and Chapter 1 prologue.

Adapt the flow from PKMSVV Web src/pkmsvv-quick-region.js + src/pkmsvv-story.js:
  - Khám phá => choose one of 10 named Regions, *before* game.start_run().
  - Kanto (Gen1) is the only supported map in this *native port*.
  - Other 9 are visible but NEVER launch the stock engine or fabricate unlocks.
  - Show authentic first-run Web prologue lines before the existing starter flow.
  - From Region screen, Y allows rewatching the prologue even on existing saves.

No fake 10-map implementation and no overwriting PKMSVV Web/Android save flags.
Require prior isolate + alpha01 + alpha02 patches and fail closed on anchors.
"""
from pathlib import Path
import sys

root=Path(sys.argv[1])

def patch(path, old, new, expected=1):
    p=root/path
    text=p.read_text(encoding="utf-8")
    n=text.count(old)
    if n != expected:
        raise SystemExit(f"REGION03_ANCHOR_FAILED {path}: {n} matches, wanted {expected}: {old[:110]!r}")
    p.write_text(text.replace(old,new),encoding="utf-8")

patch("src/platform/3ds/app.h",
      "  SC_GIFT      // Regalos (core/gift.h)",
      "  SC_GIFT,     // Regalos (core/gift.h)\n"
      "  SC_PKM_REGION,  // PKMSVV native: Region chooser before every exploration run\n"
      "  SC_PKM_STORY    // PKMSVV native: Chapter 1 Awakening intro")
patch("src/platform/3ds/app.h",
      "  void in_mode(const UiIn& in);",
      "  void in_mode(const UiIn& in);\n"
      "  void in_pkm_region(const UiIn& in);\n"
      "  void bottom_pkm_region();\n"
      "  void top_pkm_region();\n"
      "  void in_pkm_story(const UiIn& in);\n"
      "  void bottom_pkm_story();\n"
      "  void top_pkm_story();\n"
      "  void start_pkm_region_demo();")
patch("src/platform/3ds/app.h",
      "  int cur_ = 0, cur2_ = 0, scroll_ = 0;",
      "  int cur_ = 0, cur2_ = 0, scroll_ = 0;\n"
      "  // Region and story UI are native-only state; never mutate Web seals/save.\n"
      "  int region_selected_ = -1;\n"
      "  int pk_story_pos_ = 0;\n"
      "  bool pk_story_replay_ = false;")

# Existing save continues at main menu. Brand new saves see the native Web
# Chapter 1 intro, then proceed to the original starter/personality UI.
patch("src/platform/3ds/app.cpp",
      "  if (!s_->partner) { q_ = 0; scores_ = TraitScores(); go(SC_TEST); }",
      "  if (!s_->partner) {\n"
      "    q_ = 0; scores_ = TraitScores();\n"
      "    pk_story_replay_ = false; pk_story_pos_ = 0;\n"
      "    go(SC_PKM_STORY);\n"
      "  }")
patch("src/platform/3ds/app.cpp",
      "  if (sc == SC_MENU) {\n    progress_check_ach(*s_, now_ms());",
      "  if (sc == SC_MENU) {\n"
      "    region_selected_ = -1;\n"
      "    progress_check_ach(*s_, now_ms());")

# The real player flow no longer shows the original Normal/Quick/Weekly screen.
# We keep that old scene exclusively for QA/demo paths.
patch("src/platform/3ds/app.cpp",
      "    case 0: go(SC_MODE); cur_ = st_->play_mode; break;   // (normal o rápido)",
      "    case 0: go(SC_PKM_REGION); break; // Pokémon Chuyển Sinh: chọn Region TRƯỚC khi chạy")
patch("src/platform/3ds/app.cpp",
      "    case SC_MODE: in_mode(in); break;",
      "    case SC_MODE: in_mode(in); break;\n"
      "    case SC_PKM_REGION: in_pkm_region(in); break;\n"
      "    case SC_PKM_STORY: in_pkm_story(in); break;")
patch("src/platform/3ds/app.cpp",
      "    case SC_MODE: bottom_mode(); break;",
      "    case SC_MODE: bottom_mode(); break;\n"
      "    case SC_PKM_REGION: bottom_pkm_region(); break;\n"
      "    case SC_PKM_STORY: bottom_pkm_story(); break;")
patch("src/platform/3ds/app.cpp",
      "      case SC_MODE: {   // (tu compañero y el reloj de la Sentencia del modo elegido)",
      "      case SC_PKM_REGION: top_pkm_region(); break;\n"
      "      case SC_PKM_STORY: top_pkm_story(); break;\n"
      "      case SC_MODE: {   // (tu compañero y el reloj de la Sentencia del modo elegido)")

# The previous native prototype chose Gen1 even without region selection;
# only activate it for explicit Kanto selection or the opt-in native QA run.
patch("src/platform/3ds/app.cpp",
      "  cfg.kanto_only = (cfg.mode == MODE_NORMAL && !cfg.weekly && cfg.nplayers == 1);",
      "  cfg.kanto_only = (cfg.mode == MODE_NORMAL && !cfg.weekly && cfg.nplayers == 1 &&\n"
      "                    (region_selected_ == 0 || autotest));")

native_ui = r'''
// ---------------- PKMSVV native: Region Journey ----------------
// Name, order and cover species from src/pkmsvv-quick-region.js.
// Web's internal last region key is Votri Valley; its in-game map is Sky Pillar.
namespace {
constexpr int kPKMSVVRegionCount = 10;
const char* const kPKMSVVRegionKeys[kPKMSVVRegionCount] = {
    "Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos",
    "Alola", "Galar", "Paldea", "Votri Valley"
};
const char* const kPKMSVVRegionLabels[kPKMSVVRegionCount] = {
    "Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos",
    "Alola", "Galar", "Paldea", "Tháp Thiên Không"
};
const int kPKMSVVRegionCovers[kPKMSVVRegionCount] = {
    150, 249, 385, 488, 646, 718, 800, 890, 1024, 384
};
// The native port has only ONE playable biome; locking 1..9 is honest.
// Real Region Journey seals are not imported from JS/Save Guardian yet.
bool pkmsvv_native_region_playable(int i) { return i == 0; }

struct PKMSVVIntroLine { const char* speaker; const char* line; };
// Verbatim dialogue from PKMSVV Web src/pkmsvv-story.js, prologue,
// except name-entry turns: native 3DS has no name entry yet.
const PKMSVVIntroLine kPKMSVVIntro[] = {
  {"???", "...Mình đang ở đâu?"},
  {"Tôi", "Tối quá... Mình còn sống sao?"},
  {"Tôi", "Tên của mình... Sao không thể nhớ nổi?"},
  {"Giọng nói bí ẩn", "Ngươi cuối cùng cũng tỉnh lại."},
  {"Giọng nói bí ẩn", "Đây là vùng đất của những ký ức thất lạc."},
  {"Giọng nói bí ẩn", "Nếu muốn tiếp tục, trái tim ngươi phải chọn một hình hài."},
  {"Giọng nói bí ẩn", "Hãy trả lời các câu hỏi. Đừng nghĩ quá lâu... hãy là chính mình."}
};
constexpr int kPKMSVVIntroCount = int(sizeof(kPKMSVVIntro) / sizeof(kPKMSVVIntro[0]));
} // namespace

void App::start_pkm_region_demo() {
  // CI/Azahar UI view. No gameplay and no save modifications.
  pk_story_replay_ = false;
  go(SC_PKM_REGION);
}

void App::in_pkm_region(const UiIn& in) {
  if (in.down & KEY_B) { go(SC_MENU); return; }
  if (in.down & KEY_Y) {
    pk_story_pos_ = 0; pk_story_replay_ = true;
    go(SC_PKM_STORY);
    return;
  }
  if (in.rep & KEY_DUP) cur_ = std::max(0, cur_ - 2);
  if (in.rep & KEY_DDOWN) cur_ = std::min(kPKMSVVRegionCount - 1, cur_ + 2);
  if (in.rep & KEY_DLEFT) cur_ = (cur_ / 2) * 2;
  if (in.rep & KEY_DRIGHT) cur_ = (cur_ / 2) * 2 + 1;
  int pick = -1;
  for (int i = 0; i < kPKMSVVRegionCount; ++i) {
    const float x = 9 + (i % 2) * 153;
    const float y = 31 + (i / 2) * 36;
    if (in_rect(&in, x, y, 147, 33)) pick = i;
  }
  if (in.down & KEY_A) pick = cur_;
  if (pick < 0) return;
  cur_ = pick;
  if (!pkmsvv_native_region_playable(pick)) {
    audio::play("error");
    g_notices.push("Region chưa được port lên 3DS",
                   "Chỉ Kanto đang mở ở bản Alpha 03.", -1);
    return;
  }
  // Run config Kanto Gen1, not upstream Quick/Weekly, only after explicit choice.
  region_selected_ = pick;
  st_->play_mode = MODE_NORMAL;
  st_->diff = 0;
  weekly_run_ = false;
  start_run();
}

void App::bottom_pkm_region() {
  header("KHÁM PHÁ · CHỌN REGION");
  for (int i = 0; i < kPKMSVVRegionCount; ++i) {
    const int c = i % 2, line = i / 2;
    const float x = 9 + c * 153, y = 31 + line * 36;
    const bool selected = cur_ == i;
    const bool open = pkmsvv_native_region_playable(i);
    const u32 dark = C2D_Color32(23, 30, 52, 255);
    const u32 locked = C2D_Color32(38, 39, 52, 255);
    C2D_DrawRectSolid(x, y, 0, 147, 33, selected ? C_SEL : open ? dark : locked);
    C2D_DrawRectSolid(x, y, 0, 3, 33, selected ? C_GOLD : open ? rgb(0x5fe08a) : rgb(0x65718b));
    char label[56];
    std::snprintf(label, sizeof(label), "%d. %s", i + 1, kPKMSVVRegionLabels[i]);
    r_->text_fit(label, x + 8, y + 2, 133, 0.42f, open ? C_TEXT : C_MUTED, false, 0);
    r_->text_fit(open ? "Gen 1 · ĐÃ MỞ" :
                 (i == 9 ? "Sky Pillar · chưa mở" : "Chưa port · đang khóa"),
                 x + 8, y + 17, 132, 0.31f,
                 open ? rgb(0x5fe08a) : C_MUTED, false, 0);
  }
  r_->text("A: chọn · Y: truyện · B: trở lại", 160, 223, 0.32f, C_GOLD, 1);
}

void App::top_pkm_region() {
  const int idx = std::max(0, std::min(kPKMSVVRegionCount - 1, cur_));
  const bool open = pkmsvv_native_region_playable(idx);
  C2D_DrawRectSolid(28, 12, 0, 344, 45, C2D_Color32(12, 25, 43, 195));
  r_->text("POKÉMON CHUYỂN SINH 3DS", 200, 20, 0.59f, C_GOLD, 1);
  r_->text("CHỌN VÙNG KHÁM PHÁ", 200, 44, 0.37f, C_TEXT, 1);
  const int dex = kPKMSVVRegionCovers[idx];
  if (mon_by_dex(dex)) {
    C2D_DrawEllipseSolid(145, 181, 0, 110, 25,
                         rgbf(open ? 0x5fe08a : 0x8c9bb0, 0.35f));
    draw_mon(dex, false, 200, 190, 2);
  }
  r_->text(kPKMSVVRegionLabels[idx], 200, 81, 0.72f, C_GOLD, 1);
  char info[128];
  if (open) {
    std::snprintf(info, sizeof(info), "Gen 1 · 15p boss · 30p kết thúc");
  } else {
    std::snprintf(info, sizeof(info), "CHƯA MỞ - bản 3DS chưa hỗ trợ vùng này");
  }
  r_->text_fit(info, 200, 113, 356, 0.40f, open ? C_TEXT : C_MUTED, true, 1);
  r_->text("Alpha 03 · Khám phá không phải Arena", 200, 221, 0.34f, C_MUTED, 1);
}

void App::in_pkm_story(const UiIn& in) {
  if (in.down & KEY_B) {
    if (pk_story_pos_ > 0) { --pk_story_pos_; return; }
    if (pk_story_replay_) go(SC_PKM_REGION);
    return;
  }
  if ((in.down & KEY_START) || (in.down & KEY_A) || in.tap) {
    if (in.down & KEY_START) pk_story_pos_ = kPKMSVVIntroCount;
    else ++pk_story_pos_;
    if (pk_story_pos_ >= kPKMSVVIntroCount) {
      pk_story_pos_ = 0;
      if (pk_story_replay_) go(SC_PKM_REGION);
      else go(SC_TEST); // First-time personality & starter choices
    }
  }
}

void App::bottom_pkm_story() {
  header("CHƯƠNG 1 · THỨC TỈNH");
  const int n = std::max(0, std::min(kPKMSVVIntroCount - 1, pk_story_pos_));
  C2D_DrawRectSolid(11, 44, 0, 298, 148, C2D_Color32(19, 28, 46, 255));
  C2D_DrawRectSolid(11, 44, 0, 4, 148, C_GOLD);
  r_->text(kPKMSVVIntro[n].speaker, 24, 53, 0.50f, C_GOLD);
  r_->text_wrap(kPKMSVVIntro[n].line, 25, 83, 0.52f, C_TEXT, 275);
  char progress[40];
  std::snprintf(progress, sizeof(progress), "%d / %d", n + 1, kPKMSVVIntroCount);
  r_->text(progress, 295, 30, 0.36f, C_MUTED, 2);
  r_->text("A: tiếp · START: bỏ qua", 160, 222, 0.35f, C_MUTED, 1);
}

void App::top_pkm_story() {
  C2D_DrawRectSolid(32, 28, 0, 336, 120, C2D_Color32(8, 15, 28, 205));
  r_->text("POKÉMON CHUYỂN SINH", 200, 43, 0.65f, C_GOLD, 1);
  r_->text("CHƯƠNG 1 · THỨC TỈNH", 200, 83, 0.56f, C_TEXT, 1);
  r_->text("VÙNG ĐẤT KÝ ỨC", 200, 116, 0.38f, C_MUTED, 1);
}
'''
anchor="// ---------------- Jugar: normal o rápido ----------------"
patch("src/platform/3ds/app.cpp",anchor,native_ui+"\n"+anchor)

# The alpha02 CLI instrumentation remains intact. Make a deterministic UI
# view available to CI/Azahar with "region" in autotest.txt (it doesn't start
# normal gameplay and will never mutate save, account or unlock region flags).
patch("src/platform/3ds/main.cpp",
      '  bool rooms = false;         // "salas":',
      '  bool pk_region_demo = false; // "region": PKMSVV Region selector QA\n'
      '  bool rooms = false;         // "salas":')
patch("src/platform/3ds/main.cpp",
      '  else if (!std::strcmp(first, "modo")) a.mode_demo = 1;',
      '  else if (!std::strcmp(first, "region")) a.pk_region_demo = true;\n'
      '  else if (!std::strcmp(first, "modo")) a.mode_demo = 1;')
patch("src/platform/3ds/main.cpp",
      '  if (at.menu) { app.start_menu_demo(); at.on = false; }',
      '  if (at.menu) { app.start_menu_demo(); at.on = false; }\n'
      '  if (at.pk_region_demo) { app.start_pkm_region_demo(); at.on = false; }')

# Update app name in the separate 3DS install metadata, not upstream 3DSX.
patch("src/core/version.h",
      'kGameTitle = "PKMSVV Kanto 0.2"',
      'kGameTitle = "PKMSVV Region 0.3"')
patch("Makefile",
      "APP_TITLE\t:=\tPKMSVV Kanto 0.2",
      "APP_TITLE\t:=\tPKMSVV Region 0.3")

print("PKMSVV_3DS_REGION03_PATCH_PASS: real 10-region chooser + Kanto-only start + Chapter1 prologue")
