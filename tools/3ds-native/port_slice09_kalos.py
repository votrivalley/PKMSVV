#!/usr/bin/env python3
"""PKMSVV native 3DS Alpha09 - Kalos Gen6 with Zygarde #718.

Apply after slices 01,02,03,04,05,06,065,07,08.
Playable Kalos is gated by the saved Unova Badge (primary/backup); genuine
native Gen6 wild and boss pools, 15m 15% Zygarde/85% eligible Gen6 Epic,
30m tracked Zygarde. Independent dual-backed Kalos Badge.
Preserves the prior five Region badges, Title ID and solo x1.5 touch speed.
The native terrain slot is provisional and not a Web/PC Kalos map port.
"""
from pathlib import Path
import sys

root=Path(sys.argv[1])
def patch(path, old, new, expected=1):
    p=root/path
    src=p.read_text(encoding="utf-8")
    n=src.count(old)
    if n!=expected:
        raise SystemExit(f"KALOS09_ANCHOR_FAILED {path}: expected {expected}, found {n}: {old[:130]!r}")
    p.write_text(src.replace(old,new),encoding="utf-8")

# Native Explore RunConfig region index and region_gen remains authoritative.
patch("src/platform/3ds/app.cpp",
 '  cfg.pkmsvv_region_index = region_selected_ == 4 ? 4 :\n'
 '    (region_selected_ == 3 ? 3 :\n'
 '    (region_selected_ == 2 ? 2 : (region_selected_ == 1 ? 1 : 0)));',
 '  cfg.pkmsvv_region_index = region_selected_ == 5 ? 5 :\n'
 '    (region_selected_ == 4 ? 4 :\n'
 '    (region_selected_ == 3 ? 3 :\n'
 '    (region_selected_ == 2 ? 2 : (region_selected_ == 1 ? 1 : 0))));')
patch("src/platform/3ds/app.cpp",
 '                    (region_selected_ == 0 || region_selected_ == 1 || region_selected_ == 2 ||\n'
 '                     region_selected_ == 3 || region_selected_ == 4 || autotest));',
 '                    (region_selected_ == 0 || region_selected_ == 1 || region_selected_ == 2 ||\n'
 '                     region_selected_ == 3 || region_selected_ == 4 ||\n'
 '                     region_selected_ == 5 || autotest));')

# Three sources of native creatures: cast candidates, mascot boss, rescue.
# Cast candidate function was made region_gen-dependent in slice05.
patch("src/core/enemies.cpp",
 '    const int mascot = g.cfg.pkmsvv_region_index == 4 ? 646 :\n'
 '                       (g.cfg.pkmsvv_region_index == 3 ? 488 :\n'
 '                       (g.cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                       (g.cfg.pkmsvv_region_index == 1 ? 249 : 150)));',
 '    const int mascot = g.cfg.pkmsvv_region_index == 5 ? 718 :\n'
 '                       (g.cfg.pkmsvv_region_index == 4 ? 646 :\n'
 '                       (g.cfg.pkmsvv_region_index == 3 ? 488 :\n'
 '                       (g.cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                       (g.cfg.pkmsvv_region_index == 1 ? 249 : 150))));')
patch("src/core/events.cpp",
 'g.cfg.kanto_only ? (g.cfg.pkmsvv_region_index == 4 ? 495 :\n'
 '                    (g.cfg.pkmsvv_region_index == 3 ? 387 :\n'
 '                    (g.cfg.pkmsvv_region_index == 2 ? 252 :\n'
 '                    (g.cfg.pkmsvv_region_index == 1 ? 161 : 52)))) : (gold ? 1000 : 52)',
 'g.cfg.kanto_only ? (g.cfg.pkmsvv_region_index == 5 ? 650 :\n'
 '                    (g.cfg.pkmsvv_region_index == 4 ? 495 :\n'
 '                    (g.cfg.pkmsvv_region_index == 3 ? 387 :\n'
 '                    (g.cfg.pkmsvv_region_index == 2 ? 252 :\n'
 '                    (g.cfg.pkmsvv_region_index == 1 ? 161 : 52))))) : (gold ? 1000 : 52)')

# First boss grants badge on defeat; final boss grants victory on defeat.
patch("src/core/enemy.cpp",
 '      g.say(g.cfg.pkmsvv_region_index == 4\n'
 '        ? "Huy hiệu Unova! Kalos sẽ mở khi được port."\n'
 '        : g.cfg.pkmsvv_region_index == 3\n'
 '        ? "Huy hiệu Sinnoh! Unova đã mở."\n'
 '        : g.cfg.pkmsvv_region_index == 2\n'
 '        ? "Huy hiệu Hoenn! Sinnoh đã mở."\n'
 '        : g.cfg.pkmsvv_region_index == 1\n'
 '        ? "Huy hiệu Johto! Hoenn đã mở."\n'
 '        : "Huy hiệu Kanto! Johto đã mở.", 5.0f);',
 '      g.say(g.cfg.pkmsvv_region_index == 5\n'
 '        ? "Huy hiệu Kalos! Alola sẽ mở khi được port."\n'
 '        : g.cfg.pkmsvv_region_index == 4\n'
 '        ? "Huy hiệu Unova! Kalos đã mở."\n'
 '        : g.cfg.pkmsvv_region_index == 3\n'
 '        ? "Huy hiệu Sinnoh! Unova đã mở."\n'
 '        : g.cfg.pkmsvv_region_index == 2\n'
 '        ? "Huy hiệu Hoenn! Sinnoh đã mở."\n'
 '        : g.cfg.pkmsvv_region_index == 1\n'
 '        ? "Huy hiệu Johto! Hoenn đã mở."\n'
 '        : "Huy hiệu Kanto! Johto đã mở.", 5.0f);')
patch("src/core/enemy.cpp",
 '      g.say(g.cfg.pkmsvv_region_index == 4\n'
 '        ? "Hạ Kyurem! Hoàn thành Unova."\n'
 '        : g.cfg.pkmsvv_region_index == 3\n'
 '        ? "Hạ Cresselia! Hoàn thành Sinnoh."\n'
 '        : g.cfg.pkmsvv_region_index == 2\n'
 '        ? "Hạ Jirachi! Hoàn thành Hoenn."\n'
 '        : g.cfg.pkmsvv_region_index == 1\n'
 '        ? "Hạ Lugia! Hoàn thành Johto."\n'
 '        : "Hạ Mewtwo! Hoàn thành Kanto.", 5.0f);',
 '      g.say(g.cfg.pkmsvv_region_index == 5\n'
 '        ? "Hạ Zygarde! Hoàn thành Kalos."\n'
 '        : g.cfg.pkmsvv_region_index == 4\n'
 '        ? "Hạ Kyurem! Hoàn thành Unova."\n'
 '        : g.cfg.pkmsvv_region_index == 3\n'
 '        ? "Hạ Cresselia! Hoàn thành Sinnoh."\n'
 '        : g.cfg.pkmsvv_region_index == 2\n'
 '        ? "Hạ Jirachi! Hoàn thành Hoenn."\n'
 '        : g.cfg.pkmsvv_region_index == 1\n'
 '        ? "Hạ Lugia! Hoàn thành Johto."\n'
 '        : "Hạ Mewtwo! Hoàn thành Kanto.", 5.0f);')

# Exact primary and backup Kalos Badge; never reinterpret/overwrite older files.
patch("src/platform/3ds/app.h",
 '  bool pkmsvv_unova_badge_saved_ = false;',
 '  bool pkmsvv_unova_badge_saved_ = false;\n'
 '  bool pkmsvv_kalos_badge_saved_ = false;')
helpers=r'''
constexpr const char* kPKMSVVKalosMarker = "PKMSVV_KALOS_V1\nKALOS=1\n";
bool pkmsvv_read_kalos_copy(const char* root,const char* name) {
  char path[240]; std::snprintf(path,sizeof(path),"%s/%s",root,name);
  FILE* f=std::fopen(path,"rb"); if(!f) return false;
  char buf[64]={}; const size_t n=std::fread(buf,1,sizeof(buf)-1,f);
  const bool ok=!std::ferror(f) && n==std::strlen(kPKMSVVKalosMarker) &&
    std::memcmp(buf,kPKMSVVKalosMarker,n)==0;
  std::fclose(f); return ok;
}
bool pkmsvv_load_kalos_badge(const char* root) {
  return pkmsvv_read_kalos_copy(root,"kalos-progress-v1.dat") ||
         pkmsvv_read_kalos_copy(root,"kalos-progress-v1.bak");
}
bool pkmsvv_write_kalos_copy(const char* root,const char* name) {
  char path[240],tmp[240];
  std::snprintf(path,sizeof(path),"%s/%s",root,name);
  std::snprintf(tmp,sizeof(tmp),"%s/%s.tmp",root,name);
  FILE* f=std::fopen(tmp,"wb"); if(!f) return false;
  const size_t len=std::strlen(kPKMSVVKalosMarker);
  const bool ok=std::fwrite(kPKMSVVKalosMarker,1,len,f)==len && std::fflush(f)==0;
  const bool closed=std::fclose(f)==0;
  if(!ok||!closed||std::rename(tmp,path)!=0) { std::remove(tmp); return false; }
  return true;
}
bool pkmsvv_save_kalos_badge(const char* root) {
  const bool primary=pkmsvv_write_kalos_copy(root,"kalos-progress-v1.dat");
  const bool backup=pkmsvv_write_kalos_copy(root,"kalos-progress-v1.bak");
  return primary||backup;
}
'''
patch("src/platform/3ds/app.cpp",
 '} // namespace\n\n// ---------------- arranque ----------------',
 helpers+'} // namespace\n\n// ---------------- arranque ----------------')
patch("src/platform/3ds/app.cpp",
 '  pkmsvv_unova_badge_saved_ = pkmsvv_load_unova_badge(dir_);',
 '  pkmsvv_unova_badge_saved_ = pkmsvv_load_unova_badge(dir_);\n'
 '  pkmsvv_kalos_badge_saved_ = pkmsvv_load_kalos_badge(dir_);')
patch("src/platform/3ds/app.cpp",
 '  cloud_tick();',
 '  if (g_->cfg.kanto_only && g_->cfg.pkmsvv_region_index == 5 &&\n'
 '      g_->pkmsvv_badge_claimed && !pkmsvv_kalos_badge_saved_ && !autotest && dir_) {\n'
 '    if (pkmsvv_save_kalos_badge(dir_)) {\n'
 '      pkmsvv_kalos_badge_saved_ = true;\n'
 '      g_notices.push("Huy hiệu Kalos đã lưu","Alola chưa được port.",-1);\n'
 '    }\n'
 '  }\n'
 '  cloud_tick();')

# Both touch and physical navigation share one locked-region validation.
patch("src/platform/3ds/app.cpp",
 'bool pkmsvv_native_region_playable(int i) { return i >= 0 && i <= 4; }',
 'bool pkmsvv_native_region_playable(int i) { return i >= 0 && i <= 5; }')
patch("src/platform/3ds/app.cpp",
 '  if (!pkmsvv_native_region_playable(pick)) {',
 '  if (pick == 5 && !pkmsvv_unova_badge_saved_) {\n'
 '    audio::play("error");\n'
 '    g_notices.push("Kalos chưa mở","Hạ boss Unova phút 15 lấy Huy hiệu.",-1);\n'
 '    return;\n'
 '  }\n'
 '  if (!pkmsvv_native_region_playable(pick)) {')
patch("src/platform/3ds/app.cpp",
 '      (i != 4 || pkmsvv_sinnoh_badge_saved_);',
 '      (i != 4 || pkmsvv_sinnoh_badge_saved_) &&\n'
 '      (i != 5 || pkmsvv_unova_badge_saved_);')
patch("src/platform/3ds/app.cpp",
 '    (idx != 4 || pkmsvv_sinnoh_badge_saved_);',
 '    (idx != 4 || pkmsvv_sinnoh_badge_saved_) &&\n'
 '    (idx != 5 || pkmsvv_unova_badge_saved_);')
patch("src/platform/3ds/app.cpp",
 '                         : (pkmsvv_unova_badge_saved_ ? "Đã có Huy hiệu Unova" : "Gen 5 · ĐÃ MỞ")) :',
 '                         : i == 4 ? (pkmsvv_unova_badge_saved_ ? "Đã có Huy hiệu Unova" : "Gen 5 · ĐÃ MỞ")\n'
 '                         : (pkmsvv_kalos_badge_saved_ ? "Đã có Huy hiệu Kalos" : "Gen 6 · ĐÃ MỞ")) :')
patch("src/platform/3ds/app.cpp",
 '                  i == 5 && pkmsvv_unova_badge_saved_ ? "Đạt điều kiện · chưa port" :',
 '                  i == 5 ? "Cần Huy hiệu Unova" :\n'
 '                  i == 6 && pkmsvv_kalos_badge_saved_ ? "Đạt điều kiện · chưa port" :')
patch("src/platform/3ds/app.cpp",
 '      idx == 4 ? (pkmsvv_unova_badge_saved_ ? "Huy hiệu Unova · Kyurem 30p"\n'
 '                : "Gen 5 · 15p lấy Huy hiệu · 30p Kyurem") :',
 '      idx == 5 ? (pkmsvv_kalos_badge_saved_ ? "Huy hiệu Kalos · Zygarde 30p"\n'
 '                : "Gen 6 · 15p lấy Huy hiệu · 30p Zygarde") :\n'
 '      idx == 4 ? (pkmsvv_unova_badge_saved_ ? "Huy hiệu Unova · Kyurem 30p"\n'
 '                : "Gen 5 · 15p lấy Huy hiệu · 30p Kyurem") :')
patch("src/platform/3ds/app.cpp",
 '      idx == 4 ? "Cần Huy hiệu Sinnoh để vào Unova" : "Chưa port gameplay vùng này");',
 '      idx == 4 ? "Cần Huy hiệu Sinnoh để vào Unova" :\n'
 '      idx == 5 ? "Cần Huy hiệu Unova để vào Kalos" : "Chưa port gameplay vùng này");')
patch("src/platform/3ds/app.cpp",
 '"Kanto, Johto, Hoenn, Sinnoh, Unova: native Alpha 08."',
 '"Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos: native Alpha 09."')
patch("src/platform/3ds/app.cpp",
 'Alpha 08 · Unova Gen 5 QA','Alpha 09 · Kalos Gen 6 QA')
patch("src/platform/3ds/app.cpp",
 'POKÉMON CHUYỂN SINH 3DS · REGION ALPHA 08',
 'POKÉMON CHUYỂN SINH 3DS · REGION ALPHA 09')
patch("src/core/version.h",
 'kGameTitle = "PKMSVV Region 0.8"',
 'kGameTitle = "PKMSVV Region 0.9"')
patch("Makefile",
 'APP_TITLE\t:=\tPKMSVV Region 0.8',
 'APP_TITLE\t:=\tPKMSVV Region 0.9')

# Validate live cast, tracked-boss configuration and final defeat ID in Azahar.
patch("src/platform/3ds/main.cpp",
 'g->bosses[0].dex == (g->cfg.pkmsvv_region_index == 4 ? 646 :\n'
 '                            (g->cfg.pkmsvv_region_index == 3 ? 488 :\n'
 '                            (g->cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                            (g->cfg.pkmsvv_region_index == 1 ? 249 : 150)))) ||',
 'g->bosses[0].dex == (g->cfg.pkmsvv_region_index == 5 ? 718 :\n'
 '                            (g->cfg.pkmsvv_region_index == 4 ? 646 :\n'
 '                            (g->cfg.pkmsvv_region_index == 3 ? 488 :\n'
 '                            (g->cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                            (g->cfg.pkmsvv_region_index == 1 ? 249 : 150))))) ||')
patch("src/platform/3ds/main.cpp",
 'g->bosses[1].dex == (g->cfg.pkmsvv_region_index == 4 ? 646 :\n'
 '                             (g->cfg.pkmsvv_region_index == 3 ? 488 :\n'
 '                             (g->cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                             (g->cfg.pkmsvv_region_index == 1 ? 249 : 150)))) &&\n'
 '        g->bosses[1].at == 1800;',
 'g->bosses[1].dex == (g->cfg.pkmsvv_region_index == 5 ? 718 :\n'
 '                             (g->cfg.pkmsvv_region_index == 4 ? 646 :\n'
 '                             (g->cfg.pkmsvv_region_index == 3 ? 488 :\n'
 '                             (g->cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                             (g->cfg.pkmsvv_region_index == 1 ? 249 : 150))))) &&\n'
 '        g->bosses[1].at == 1800;')
patch("src/platform/3ds/main.cpp",
 'final->dex == (at.pk_unova_qa ? 646 :\n'
 '                     (at.pk_sinnoh_qa ? 488 :\n'
 '                     (at.pk_hoenn_qa ? 385 : (at.pk_johto_qa ? 249 : 150)))) &&',
 'final->dex == (at.pk_kalos_qa ? 718 :\n'
 '                     (at.pk_unova_qa ? 646 :\n'
 '                     (at.pk_sinnoh_qa ? 488 :\n'
 '                     (at.pk_hoenn_qa ? 385 : (at.pk_johto_qa ? 249 : 150))))) &&')
patch("src/platform/3ds/main.cpp", "PKMSVV_REGION08_CAST_", "PKMSVV_REGION09_CAST_")
patch("src/platform/3ds/main.cpp", "PKMSVV_REGION08_BOSS_CFG_", "PKMSVV_REGION09_BOSS_CFG_")
patch("src/platform/3ds/main.cpp", "PKMSVV_REGION08_LIVE_", "PKMSVV_REGION09_LIVE_")

# Actual Kalos game 12s smoke and deterministic tracked first/final boss test.
patch("src/platform/3ds/app.h",
 '  void start_pkm_unova_qa(int dex,bool immortal);',
 '  void start_pkm_unova_qa(int dex,bool immortal);\n'
 '  void start_pkm_kalos_qa(int dex,bool immortal);')
patch("src/platform/3ds/app.cpp",
 'void App::start_pkm_unova_qa(int dex,bool immortal) {',
 'void App::start_pkm_kalos_qa(int dex,bool immortal) {\n'
 '  region_selected_ = 5;\n'
 '  set_autotest(dex,immortal);\n'
 '}\n\n'
 'void App::start_pkm_unova_qa(int dex,bool immortal) {')
patch("src/platform/3ds/main.cpp",
 '  bool pk_unova_qa = false;',
 '  bool pk_kalos_qa = false;\n'
 '  bool pk_unova_qa = false;')
patch("src/platform/3ds/main.cpp",
 '  else if (!std::strcmp(first, "unovagate")) a.pk_region_gate_qa = a.pk_unova_qa = true;',
 '  else if (!std::strcmp(first, "unovagate")) a.pk_region_gate_qa = a.pk_unova_qa = true;\n'
 '  else if (!std::strcmp(first, "kalos")) { a.pk_kalos_qa = true; a.seconds = 12; a.dex = 650; }\n'
 '  else if (!std::strcmp(first, "kalosgate")) a.pk_region_gate_qa = a.pk_kalos_qa = true;')
patch("src/platform/3ds/main.cpp",
 '    if (at.pk_unova_qa) app.start_pkm_unova_qa(495,true);',
 '    if (at.pk_kalos_qa) app.start_pkm_kalos_qa(650,true);\n'
 '    else if (at.pk_unova_qa) app.start_pkm_unova_qa(495,true);')
patch("src/platform/3ds/main.cpp",
 '  } else if (at.on && at.pk_unova_qa) {',
 '  } else if (at.on && at.pk_kalos_qa) {\n'
 '    app.auto_mode=0; app.auto_diff=0;\n'
 '    app.start_pkm_kalos_qa(650,true);\n'
 '    at.next_log=10;\n'
 '  } else if (at.on && at.pk_unova_qa) {')

print("PKMSVV_REGION09_KALOS_NATIVE_PATCH_PASS: Gen6 Zygarde#718 + 6 regions + solo x1.5")
