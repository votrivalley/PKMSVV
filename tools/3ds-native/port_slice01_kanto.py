#!/usr/bin/env python3
"""PKMSVV 3DS native vertical slice 01: genuine Kanto-only random combat.

Only patch the open-source upstream C++ engine on the isolated QA branch.
Fail closed when upstream source diverges; do not silently build stock gameplay.
This is NOT the full chapters, Pippi, Co-op, Fusion or save port.
"""
from pathlib import Path
import sys

root=Path(sys.argv[1])
def patch(path,old,new,count=1):
    f=root/path
    s=f.read_text(encoding="utf-8")
    n=s.count(old)
    if n!=count:
        raise SystemExit(f"KANTO_PORT_ANCHOR_FAILED {path} wanted={count} got={n} anchor={old!r}")
    f.write_text(s.replace(old,new),encoding="utf-8")

# A run-level flag is important: legacy/weekly/multiplayer gameplay is left
# unchanged; only solo normal exploration receives the Kanto population.
patch("src/core/game.h", "struct RunConfig {\n  int dex = 1;",
      "struct RunConfig {\n  // PKMSVV 3DS Kanto slice: deterministic solo-only spawn pool.\n  bool kanto_only = false;\n  int dex = 1;")
patch("src/platform/3ds/app.cpp",
      "  const u64 t0 = svcGetSystemTick();\n  g_->now_ms = now_ms();",
      "  // First real PKMSVV C++ gameplay rule: Kanto for solo normal runs.\n"
      "  cfg.kanto_only = (cfg.mode == MODE_NORMAL && !cfg.weekly && cfg.nplayers == 1);\n"
      "  const u64 t0 = svcGetSystemTick();\n  g_->now_ms = now_ms();")
patch("src/platform/3ds/app.cpp",
      "  g_->start_run(cfg, autotest && !auto_real ? nullptr : s_);",
      "  g_->start_run(cfg, autotest && !auto_real ? nullptr : s_);\n"
      "  if (cfg.kanto_only && !autotest)\n"
      "    g_->say(\"PKMSVV Kanto: quái và boss ngẫu nhiên thuộc Gen 1!\", 5.0f);")

# Native tier selection and spawned random boss choices (not the scripted
# Eternatus/Arceus content, which remains explicitly legacy).
patch("src/core/enemies.cpp",
      "int candidates(int ti, const Mon** out, int mono = -1) {",
      "int candidates(int ti, const Mon** out, int mono = -1, bool kanto_only = false) {")
patch("src/core/enemies.cpp",
      "if (p.rarity < 5 && p.bst >= t.bst0 && p.bst <= t.bst1) out[n++] = &p;",
      "if (p.rarity < 5 && p.bst >= t.bst0 && p.bst <= t.bst1 &&\n"
      "        (!kanto_only || (p.gen == 1 && p.reg == 0))) out[n++] = &p;")
patch("src/core/enemies.cpp",
      "  if (mono < 0) return n;",
      "  // If Kanto lacks a monster in a late power tier, recycle eligible\n"
      "  // Kanto creatures rather than importing another generation.\n"
      "  if (n == 0 && kanto_only)\n"
      "    for (int i = 0; i < kDexCount; ++i) {\n"
      "      const Mon& p = kDex[i];\n"
      "      if (p.gen == 1 && p.reg == 0 && p.rarity < 5) out[n++] = &p;\n"
      "    }\n"
      "  if (mono < 0) return n;")
patch("src/core/enemies.cpp",
      "const int nall = candidates(ti, all, mono_of(g));",
      "const int nall = candidates(ti, all, mono_of(g), g.cfg.kanto_only);",2)
patch("src/core/enemies.cpp",
      "const int nall = candidates(ti, all);",
      "const int nall = candidates(ti, all, -1, g.cfg.kanto_only);")
patch("src/core/enemies.cpp",
      "const int nall = candidates(enemies_tier_at(t), all, mono_of(g));",
      "const int nall = candidates(enemies_tier_at(t), all, mono_of(g), g.cfg.kanto_only);")
patch("src/core/enemies.cpp",
      "      if (p.leg) return false;",
      "      if (p.leg) return false;\n"
      "      if (g.cfg.kanto_only && (p.gen != 1 || p.reg != 0)) return false;")
patch("src/core/enemies.cpp",
      "    if (!np) for (int i = 0; i < kDexCount; ++i) if (!kDex[i].leg && kDex[i].bst >= 580) {",
      "    if (!np && g.cfg.kanto_only)\n"
      "      for (int i = 0; i < kDexCount; ++i)\n"
      "        if (ok(kDex[i]) && kDex[i].bst >= 450) pool[np++] = &kDex[i];\n"
      "    if (!np && !g.cfg.kanto_only) for (int i = 0; i < kDexCount; ++i) if (!kDex[i].leg && kDex[i].bst >= 580) {")
patch("src/core/enemies.cpp",
      "    const Mon& p = *pool[int(g.rng.next() * np)];",
      "    if (!np) { g.nbosses = s; break; } // guard against empty boss pools\n"
      "    const Mon& p = *pool[int(g.rng.next() * np)];")
# Clear, visible PKMSVV identity in actual 3DS gameplay menus, not only HOME.
patch("src/platform/3ds/app.cpp",
      'r_->text("PokéSurvivor", 8, 4, 0.48f, C_GOLD);',
      'r_->text("PKMSVV · KANTO", 8, 4, 0.48f, C_GOLD);')
patch("src/platform/3ds/app.cpp",
      'r_->text("PokéSurvivor 3DS · port de juanluismm520", 200, 222, 0.34f, C2D_Color32(255, 255, 255, 140), 1, false);',
      'r_->text("POKÉMON CHUYỂN SINH 3DS · KANTO QA 01", 200, 222, 0.34f, C2D_Color32(255, 255, 255, 140), 1, false);')
patch("src/platform/3ds/app.cpp",
      'static const char* const L[9] = {"Jugar", "En grupo", "Pokémon", "Mejoras", "Gacha", "Misiones", "Ajustes", "Créditos", "Salir"};',
      'static const char* const L[9] = {"Khám phá", "Co-op", "Pokédex", "Nâng cấp", "Gacha", "Nhiệm vụ", "Cài đặt", "Credits", "Thoát"};')
patch("src/platform/3ds/app.cpp",
      'header("Jugar");',
      'header("Khám phá");')
patch("src/platform/3ds/app.cpp",
      '{"Normal", "La Sentencia a los 30 minutos",\n'
      '     "La partida de siempre: aguanta la horda, sube de nivel, cambia de mapa cada 4 minutos y, a los 30, Arceus desciende."},',
      '{"Kanto (Gen 1)", "PKMSVV - thử nghiệm Kanto",\n'
      '     "Quái thường và boss ngẫu nhiên chỉ thuộc Kanto. Các boss kịch bản và cốt truyện PKMSVV chưa được port."},')
patch("src/platform/3ds/app.cpp",
      '{"Rápido", "La Sentencia a los 20 minutos",\n'
      '     "Arceus llega a los 20 minutos y aquí SÍ se le puede derrotar: tumba a sus 8 legendarios y bajará la guardia. Difícil: ¡medalla si ganas!"},',
      '{"Gốc (QA)", "Giữ cơ chế PokéSurvivor",\n'
      '     "Dùng kiểm thử engine gốc. Chế độ này chưa phải bản đồ hoặc cốt truyện Pokémon Chuyển Sinh."},')

# A distinct title and SD save folder prevent the first real gameplay port
# from sharing state with the earlier unmodified engine QA installation.
patch("Makefile", "pkmsvv-3ds-qa", "pkmsvv-kanto01")
patch("Makefile", "APP_TITLE\\t:=\\tPKMSVV 3DS QA",
      "APP_TITLE\\t:=\\tPKMSVV Kanto 0.1")
patch("src/core/version.h", 'kGameTitle = "PKMSVV 3DS QA"',
      'kGameTitle = "PKMSVV Kanto 0.1"')
patch("src/platform/3ds/main.cpp",
      "sdmc:/3ds/pkmsvv-3ds-qa", "sdmc:/3ds/pkmsvv-kanto01",2)
patch("tools/cia/app.rsf", "ProductCode             : CTR-H-PCS3",
      "ProductCode             : CTR-H-PK01")
patch("tools/cia/app.rsf", "UniqueId                : 0xF5B13",
      "UniqueId                : 0xF5B14")
patch("tools/make_cia.sh", "pkmsvv-3ds-qa", "pkmsvv-kanto01",4)
patch("tools/make_cia.sh", '-s "PKMSVV 3DS QA"', '-s "PKMSVV Kanto 0.1"')

# Native gameplay instrumentation allows emulator QA to inspect real randomly
# selected Gen1 wave and boss definitions, beyond code-grep or compile PASS.
patch("src/platform/3ds/main.cpp",
      '  if (at.log) {\\n    std::fprintf(at.log, "cargas de sprites durante la partida:',
      '  if (at.log) {\\n'
      '    if (g->cfg.kanto_only) {\\n'
      '      int total = 0, outsiders = 0;\\n'
      '      for (int tier = 0; tier < g->ncast; ++tier) {\\n'
      '        for (int i = 0; i < g->cast[tier].n; ++i) {\\n'
      '          const Mon* m = mon_by_dex(g->cast[tier].list[i].dex);\\n'
      '          ++total; if (!m || m->gen != 1 || m->reg != 0) ++outsiders;\\n'
      '        }\\n'
      '      }\\n'
      '      for (int i = 0; i < g->nbosses; ++i) {\\n'
      '        const Mon* m = mon_by_dex(g->bosses[i].dex);\\n'
      '        ++total; if (!m || m->gen != 1 || m->reg != 0) ++outsiders;\\n'
      '      }\\n'
      '      std::fprintf(at.log, "PKMSVV_KANTO_CAST_%s total=%d outsiders=%d\\\\n",\\n'
      '                   total > 0 && !outsiders ? "PASS" : "FAIL", total, outsiders);\\n'
      '    }\\n'
      '    std::fprintf(at.log, "cargas de sprites durante la partida:')

print("PKMSVV_NATIVE_KANTO_SLICE01_APPLIED: SOLO_MODE_NORMAL KANTO_GEN1_ONLY + MENU_VI + RANDOM_BOSS_KANTO")
