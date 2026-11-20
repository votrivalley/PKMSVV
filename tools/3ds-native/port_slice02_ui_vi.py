#!/usr/bin/env python3
"""PKMSVV Kanto native 3DS Vietnamese UI pass 02 (first-screen scope only).

Source is Spanish C++; changing an installer banner does NOT translate the UI.
This handles the main menu, mode selection, starter, 3DS top screen and
run-status dialogue. Skills, item names, Pokémon names remain original.
Do not call this a complete translation.
"""
import sys
from pathlib import Path

base=Path(sys.argv[1])
def patch(path,old,new,count=1):
    f=base/path
    s=f.read_text(encoding="utf-8")
    n=s.count(old)
    if n!=count:
        raise SystemExit(f"UI_VI02_ANCHOR_FAILED {path} count={n} expected={count} {old[:95]!r}")
    f.write_text(s.replace(old,new),encoding="utf-8")

# Existing alpha01 in-game markers and mode copy.
patch("src/platform/3ds/app.cpp",
      "POKÉMON CHUYỂN SINH 3DS · KANTO QA 01",
      "POKÉMON CHUYỂN SINH 3DS · KANTO ALPHA 02")
patch("src/platform/3ds/app.cpp",
      '"Kanto (Gen 1)", "PKMSVV - thử nghiệm Kanto",',
      '"Kanto (Gen 1)", "Khám phá · bản thử C++",')
patch("src/platform/3ds/app.cpp",
      '"Quái thường và boss ngẫu nhiên chỉ thuộc Kanto. Các boss kịch bản và cốt truyện PKMSVV chưa được port."',
      '"Quái Kanto, boss phút 15 và 30. Chưa có bản đồ truyện, Pippi hay Phòng nghiên cứu."')
patch("src/platform/3ds/app.cpp",
      '"Dùng kiểm thử engine gốc. Chế độ này chưa phải bản đồ hoặc cốt truyện Pokémon Chuyển Sinh."',
      '"Chế độ cũ chỉ để đối chiếu engine. Chơi Khám phá Kanto để thử nội dung mới."')
patch("src/platform/3ds/app.cpp",
      '"Khám phá", "Co-op", "Pokédex", "Nâng cấp", "Gacha", "Nhiệm vụ", "Cài đặt", "Credits", "Thoát"',
      '"Khám phá", "Co-op gốc", "Pokédex", "Nâng cấp", "Gacha", "Nhiệm vụ", "Cài đặt", "Credits", "Thoát"')
# Native header and footer previously remained Spanish.
patch("src/platform/3ds/app.cpp",
      'r_->text("SELECT: ¡Novedades!", 12, 223, 0.34f, C_GOLD, 0);',
      'r_->text("SELECT: Tin mới", 12, 223, 0.34f, C_GOLD, 0);')
patch("src/platform/3ds/app.cpp",
      'r_->text_width("SELECT: ¡Novedades!", 0.34f)',
      'r_->text_width("SELECT: Tin mới", 0.34f)')
patch("src/platform/3ds/app.cpp",
      'r_->text("Y: normal / shiny", 312, 224, 0.32f, C_MUTED, 2);',
      'r_->text("Y: Thường / Shiny", 312, 224, 0.32f, C_MUTED, 2);')
patch("src/platform/3ds/app.cpp",
      'st[0].lbl = "Runs";', 'st[0].lbl = "Số trận";')
patch("src/platform/3ds/app.cpp",
      'st[1].lbl = "Mejor tiempo";', 'st[1].lbl = "Kỷ lục";')
patch("src/platform/3ds/app.cpp",
      'st[2].lbl = "Mejor nivel";', 'st[2].lbl = "Cấp cao";')
patch("src/platform/3ds/app.cpp",
      'st[3].lbl = "Pokémon";', 'st[3].lbl = "Pokémon";')

# Starter: only the presentation is translated. This is intentionally NOT a
# full PKMSVV starter onboarding rewrite yet.
patch("src/platform/3ds/app.cpp",
      'std::snprintf(b, sizeof(b), "Pregunta %d de %d", q_ + 1, kTestCount);',
      'std::snprintf(b, sizeof(b), "Câu %d/%d", q_ + 1, kTestCount);')
patch("src/platform/3ds/app.cpp",
      'header("Tu compañero");', 'header("Pokémon đồng hành");')
patch("src/platform/3ds/app.cpp",
      '"¡%s quiere ser tu compañero!"',
      '"%s muốn đồng hành với bạn!"')
patch("src/platform/3ds/app.cpp",
      '"¡Vamos juntos!"', '"Đi cùng nhau!"')
patch("src/platform/3ds/app.cpp",
      '"Elegir otro compañero"', '"Chọn Pokémon khác"')
patch("src/platform/3ds/app.cpp",
      'header("Elige tu compañero");', 'header("Chọn Pokémon khởi đầu");')
patch("src/platform/3ds/app.cpp",
      '"A: elegir · B: volver"', '"A: chọn · B: quay lại"',1)
patch("src/platform/3ds/app.cpp",
      '"¡%s se une a ti!"', '"%s gia nhập đội!"')

# Main mode and touch-screen guidance.
patch("src/platform/3ds/app.cpp",
      'r_->text(cur_ == MODE_QUICK ? "Modo rápido" : "Modo normal", 200, 58, 0.5f, C_TEXT, 1);',
      'r_->text(cur_ == MODE_QUICK ? "Gốc (QA)" : "Khám phá Kanto", 200, 58, 0.5f, C_TEXT, 1);')
patch("src/platform/3ds/app.cpp",
      'r_->text("Arceus es invencible: aguanta todo lo que puedas", 200, 84, 0.38f, C_MUTED, 1);',
      'r_->text("Boss Kanto: 15p Dragonite · 30p Mewtwo", 200, 84, 0.38f, C_MUTED, 1);')
patch("src/platform/3ds/app.cpp",
      'r_->text("¡Arceus se puede derrotar!", 210, 84, 0.45f, C_GOLD, 1);',
      'r_->text("Chế độ gốc chưa chuyển đổi", 210, 84, 0.45f, C_GOLD, 1);')
patch("src/platform/3ds/app.cpp",
      'r_->text(tr("A: jugar · B: volver"), 160, 226, 0.34f, C_MUTED, 1);',
      'r_->text("A: chơi · B: quay lại", 160, 226, 0.34f, C_MUTED, 1);')
patch("src/platform/3ds/app.cpp",
      'r_->text(tr("A: jugar · < >: dificultad · B: volver"), 160, 226, 0.34f, C_MUTED, 1);',
      'r_->text("A: chơi · Trái/Phải: độ khó · B: quay lại", 160, 226, 0.34f, C_MUTED, 1);')

# Status speech must be Vietnamese, not only the menu title.
patch("src/core/spawner.cpp",
      '"¡%s%s salvaje apareció!"',
      '"Boss %s%s xuất hiện!"')
patch("src/core/spawner.cpp",
      'g.say("¡Marea de Pokémon!", 2.2f);',
      'g.say("Quái triều kéo tới! Chạy hay đánh đây?", 2.2f);')
patch("src/core/events.cpp",
      '"¡Horda de tipo %s!"',
      '"Quái hệ %s kéo tới!"')
patch("src/core/events.cpp",
      '"¡Hora dorada! Doble de experiencia"',
      '"Giờ vàng! EXP nhân đôi!"')
patch("src/core/game.cpp",
      '"— %s —"',
      '"Khu vực: %s"')

patch("src/core/version.h", 'kGameTitle = "PKMSVV Kanto 0.1"', 'kGameTitle = "PKMSVV Kanto 0.2"')
patch("Makefile", "APP_TITLE\t:=\tPKMSVV Kanto 0.1", "APP_TITLE\t:=\tPKMSVV Kanto 0.2")

print("PKMSVV_KANTO02_VI_FIRST_SCREENS_APPLIED")
