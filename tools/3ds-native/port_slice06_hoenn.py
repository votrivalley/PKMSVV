#!/usr/bin/env python3
"""PKMSVV native 3DS Alpha06: Hoenn Gen3 after Kanto+Johto Alpha05.

Ports Web Region rules to real C++ gameplay:
- Hoenn unlock requires SAVED Johto Badge.
- Wilds/cast/boss eligibility Gen3 only, no original mixed-Gen leakage.
- At 15m 15% Jirachi, 85% true Gen3 Epic; at 30m Jirachi final.
- Separate dual-backed Hoenn Badge, untouched Kanto/Johto files.
- The third stock 3DS terrain profile is a temporary stand-in for Web Hoenn.
Uses anchored, fail-closed patches after slices 01 through 05.
"""
from pathlib import Path
import sys

root=Path(sys.argv[1])
def patch(path,old,new,expected=1):
    p=root/path
    s=p.read_text(encoding="utf-8")
    n=s.count(old)
    if n!=expected:
        raise SystemExit(f"HOENN06_ANCHOR_FAILED {path} expected={expected} got={n}: {old[:130]!r}")
    p.write_text(s.replace(old,new),encoding="utf-8")

# Run config keeps the kanto_only historical flag as the native Explore guard.
# Index/Gen are authoritative and independently set on each new run.
patch("src/platform/3ds/app.cpp",
 '  cfg.pkmsvv_region_index = region_selected_ == 1 ? 1 : 0;',
 '  cfg.pkmsvv_region_index = region_selected_ == 2 ? 2 : (region_selected_ == 1 ? 1 : 0);')
patch("src/platform/3ds/app.cpp",
 '                    (region_selected_ == 0 || region_selected_ == 1 || autotest));',
 '                    (region_selected_ == 0 || region_selected_ == 1 || region_selected_ == 2 || autotest));')

# Replace mascot only, preserving per-index Web health and damage scaling.
patch("src/core/enemies.cpp",
 '    const int mascot = g.cfg.pkmsvv_region_index == 1 ? 249 : 150;',
 '    const int mascot = g.cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                       (g.cfg.pkmsvv_region_index == 1 ? 249 : 150);')

# The original special lost-Pokemon encounter may never force Meowth or another Gen.
patch("src/core/events.cpp",
 'g.cfg.kanto_only ? (g.cfg.pkmsvv_region_index == 1 ? 161 : 52) : (gold ? 1000 : 52)',
 'g.cfg.kanto_only ? (g.cfg.pkmsvv_region_index == 2 ? 252 :\n'
 '                    (g.cfg.pkmsvv_region_index == 1 ? 161 : 52)) : (gold ? 1000 : 52)')

patch("src/core/enemy.cpp",
 '      g.say(g.cfg.pkmsvv_region_index == 1\n'
 '        ? "Huy hiệu Johto! Hoenn sẽ mở khi được port."\n'
 '        : "Huy hiệu Kanto! Johto đã mở.", 5.0f);',
 '      g.say(g.cfg.pkmsvv_region_index == 2\n'
 '        ? "Huy hiệu Hoenn! Sinnoh sẽ mở khi được port."\n'
 '        : g.cfg.pkmsvv_region_index == 1\n'
 '        ? "Huy hiệu Johto! Hoenn đã mở."\n'
 '        : "Huy hiệu Kanto! Johto đã mở.", 5.0f);')
patch("src/core/enemy.cpp",
 '      g.say(g.cfg.pkmsvv_region_index == 1\n'
 '        ? "Hạ Lugia! Hoàn thành Johto."\n'
 '        : "Hạ Mewtwo! Hoàn thành Kanto.", 5.0f);',
 '      g.say(g.cfg.pkmsvv_region_index == 2\n'
 '        ? "Hạ Jirachi! Hoàn thành Hoenn."\n'
 '        : g.cfg.pkmsvv_region_index == 1\n'
 '        ? "Hạ Lugia! Hoàn thành Johto."\n'
 '        : "Hạ Mewtwo! Hoàn thành Kanto.", 5.0f);')

# Save Hoenn Badge to separate primary/backup; never corrupt prior ledgers.
patch("src/platform/3ds/app.h",
 '  bool pkmsvv_johto_badge_saved_ = false;',
 '  bool pkmsvv_johto_badge_saved_ = false;\n'
 '  bool pkmsvv_hoenn_badge_saved_ = false;')
helpers=r'''
constexpr const char* kPKMSVVHoennMarker = "PKMSVV_HOENN_V1\nHOENN=1\n";
bool pkmsvv_read_hoenn_copy(const char* root,const char* name) {
  char path[240]; std::snprintf(path,sizeof(path),"%s/%s",root,name);
  FILE* f=std::fopen(path,"rb"); if(!f) return false;
  char buf[64]={}; const size_t n=std::fread(buf,1,sizeof(buf)-1,f);
  const bool ok=!std::ferror(f) && n==std::strlen(kPKMSVVHoennMarker) &&
    std::memcmp(buf,kPKMSVVHoennMarker,n)==0;
  std::fclose(f); return ok;
}
bool pkmsvv_load_hoenn_badge(const char* root) {
  return pkmsvv_read_hoenn_copy(root,"hoenn-progress-v1.dat") ||
         pkmsvv_read_hoenn_copy(root,"hoenn-progress-v1.bak");
}
bool pkmsvv_write_hoenn_copy(const char* root,const char* name) {
  char path[240],tmp[240];
  std::snprintf(path,sizeof(path),"%s/%s",root,name);
  std::snprintf(tmp,sizeof(tmp),"%s/%s.tmp",root,name);
  FILE* f=std::fopen(tmp,"wb"); if(!f) return false;
  const size_t len=std::strlen(kPKMSVVHoennMarker);
  const bool ok=std::fwrite(kPKMSVVHoennMarker,1,len,f)==len && std::fflush(f)==0;
  const bool closed=std::fclose(f)==0;
  if(!ok||!closed||std::rename(tmp,path)!=0) { std::remove(tmp); return false; }
  return true;
}
bool pkmsvv_save_hoenn_badge(const char* root) {
  const bool primary=pkmsvv_write_hoenn_copy(root,"hoenn-progress-v1.dat");
  const bool backup=pkmsvv_write_hoenn_copy(root,"hoenn-progress-v1.bak");
  return primary||backup;
}
'''
patch("src/platform/3ds/app.cpp",
 '} // namespace\n\n// ---------------- arranque ----------------',
 helpers+'} // namespace\n\n// ---------------- arranque ----------------')
patch("src/platform/3ds/app.cpp",
 '  pkmsvv_johto_badge_saved_ = pkmsvv_load_johto_badge(dir_);',
 '  pkmsvv_johto_badge_saved_ = pkmsvv_load_johto_badge(dir_);\n'
 '  pkmsvv_hoenn_badge_saved_ = pkmsvv_load_hoenn_badge(dir_);')
patch("src/platform/3ds/app.cpp",
 '  cloud_tick();',
 '  if (g_->cfg.kanto_only && g_->cfg.pkmsvv_region_index == 2 &&\n'
 '      g_->pkmsvv_badge_claimed && !pkmsvv_hoenn_badge_saved_ && !autotest && dir_) {\n'
 '    if (pkmsvv_save_hoenn_badge(dir_)) {\n'
 '      pkmsvv_hoenn_badge_saved_ = true;\n'
 '      g_notices.push("Huy hiệu Hoenn đã lưu","Sinnoh chưa được port.",-1);\n'
 '    }\n'
 '  }\n'
 '  cloud_tick();')

# Actually play Hoenn only after previously saved Johto badge.
patch("src/platform/3ds/app.cpp",
 'bool pkmsvv_native_region_playable(int i) { return i == 0 || i == 1; }',
 'bool pkmsvv_native_region_playable(int i) { return i == 0 || i == 1 || i == 2; }')
patch("src/platform/3ds/app.cpp",
 '  if (!pkmsvv_native_region_playable(pick)) {',
 '  if (pick == 2 && !pkmsvv_johto_badge_saved_) {\n'
 '    audio::play("error");\n'
 '    g_notices.push("Hoenn chưa mở","Hạ boss Johto phút 15 lấy Huy hiệu.",-1);\n'
 '    return;\n'
 '  }\n'
 '  if (!pkmsvv_native_region_playable(pick)) {')
patch("src/platform/3ds/app.cpp",
 '    const bool open = pkmsvv_native_region_playable(i) && (i != 1 || pkmsvv_kanto_badge_saved_);',
 '    const bool open = pkmsvv_native_region_playable(i) &&\n'
 '      (i != 1 || pkmsvv_kanto_badge_saved_) && (i != 2 || pkmsvv_johto_badge_saved_);')
patch("src/platform/3ds/app.cpp",
 '  const bool open = pkmsvv_native_region_playable(idx) && (idx != 1 || pkmsvv_kanto_badge_saved_);',
 '  const bool open = pkmsvv_native_region_playable(idx) &&\n'
 '    (idx != 1 || pkmsvv_kanto_badge_saved_) && (idx != 2 || pkmsvv_johto_badge_saved_);')
patch("src/platform/3ds/app.cpp",
 '                         : (pkmsvv_johto_badge_saved_ ? "Đã có Huy hiệu Johto" : "Gen 2 · ĐÃ MỞ")) :',
 '                         : i == 1 ? (pkmsvv_johto_badge_saved_ ? "Đã có Huy hiệu Johto" : "Gen 2 · ĐÃ MỞ")\n'
 '                         : (pkmsvv_hoenn_badge_saved_ ? "Đã có Huy hiệu Hoenn" : "Gen 3 · ĐÃ MỞ")) :')
patch("src/platform/3ds/app.cpp",
 '                  i == 2 && pkmsvv_johto_badge_saved_ ? "Đạt điều kiện · chưa port" :',
 '                  i == 2 ? "Cần Huy hiệu Johto" :\n'
 '                  i == 3 && pkmsvv_hoenn_badge_saved_ ? "Đạt điều kiện · chưa port" :')
patch("src/platform/3ds/app.cpp",
 '      idx == 1 ? (pkmsvv_johto_badge_saved_ ? "Huy hiệu Johto · Lugia 30p"\n'
 '                : "Gen 2 · 15p lấy Huy hiệu · 30p Lugia") :',
 '      idx == 2 ? (pkmsvv_hoenn_badge_saved_ ? "Huy hiệu Hoenn · Jirachi 30p"\n'
 '                : "Gen 3 · 15p lấy Huy hiệu · 30p Jirachi") :\n'
 '      idx == 1 ? (pkmsvv_johto_badge_saved_ ? "Huy hiệu Johto · Lugia 30p"\n'
 '                : "Gen 2 · 15p lấy Huy hiệu · 30p Lugia") :')
patch("src/platform/3ds/app.cpp",
 '      "Cần Huy hiệu Kanto để vào Johto" : "Chưa port gameplay vùng này");',
 '      "Cần Huy hiệu Kanto để vào Johto" :\n'
 '      idx == 2 ? "Cần Huy hiệu Johto để vào Hoenn" : "Chưa port gameplay vùng này");')
patch("src/platform/3ds/app.cpp",
 '"Chỉ Kanto/Johto có gameplay native ở Alpha 05."',
 '"Kanto, Johto, Hoenn đã có gameplay native ở Alpha 06."')
patch("src/platform/3ds/app.cpp",
 'Alpha 05 · Johto Gen 2 QA', 'Alpha 06 · Hoenn Gen 3 QA')
patch("src/platform/3ds/app.cpp",
 'POKÉMON CHUYỂN SINH 3DS · REGION ALPHA 05',
 'POKÉMON CHUYỂN SINH 3DS · REGION ALPHA 06')
patch("src/core/version.h",'kGameTitle = "PKMSVV Region 0.5"','kGameTitle = "PKMSVV Region 0.6"')
patch("Makefile",'APP_TITLE\t:=\tPKMSVV Region 0.5','APP_TITLE\t:=\tPKMSVV Region 0.6')

# Region introspection must follow the selected Region rather than hardcode Johto.
patch("src/platform/3ds/main.cpp",
 'g->bosses[0].dex == (g->cfg.pkmsvv_region_index == 1 ? 249 : 150) ||',
 'g->bosses[0].dex == (g->cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                            (g->cfg.pkmsvv_region_index == 1 ? 249 : 150)) ||')
patch("src/platform/3ds/main.cpp",
 'g->bosses[1].dex == (g->cfg.pkmsvv_region_index == 1 ? 249 : 150) && g->bosses[1].at == 1800;',
 'g->bosses[1].dex == (g->cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                             (g->cfg.pkmsvv_region_index == 1 ? 249 : 150)) &&\n'
 '        g->bosses[1].at == 1800;')
patch("src/platform/3ds/main.cpp",
 'final->dex == (at.pk_johto_qa ? 249 : 150) && !g->pkmsvv_region_victory;',
 'final->dex == (at.pk_hoenn_qa ? 385 : (at.pk_johto_qa ? 249 : 150)) &&\n'
 '      !g->pkmsvv_region_victory;')
patch("src/platform/3ds/main.cpp","PKMSVV_REGION05_CAST_","PKMSVV_REGION06_CAST_")
patch("src/platform/3ds/main.cpp","PKMSVV_REGION05_BOSS_CFG_","PKMSVV_REGION06_BOSS_CFG_")
patch("src/platform/3ds/main.cpp","PKMSVV_REGION05_LIVE_","PKMSVV_REGION06_LIVE_")

# Boot exact Hoenn C++ for Azahar, plus 1801s gate via real kill handler.
patch("src/platform/3ds/app.h",
 '  void start_pkm_johto_qa(int dex,bool immortal);',
 '  void start_pkm_johto_qa(int dex,bool immortal);\n'
 '  void start_pkm_hoenn_qa(int dex,bool immortal);')
patch("src/platform/3ds/app.cpp",
 'void App::start_pkm_johto_qa(int dex,bool immortal) {',
 'void App::start_pkm_hoenn_qa(int dex,bool immortal) {\n'
 '  region_selected_ = 2;\n'
 '  set_autotest(dex,immortal);\n'
 '}\n\n'
 'void App::start_pkm_johto_qa(int dex,bool immortal) {')
patch("src/platform/3ds/main.cpp",
 '  bool pk_johto_qa = false;',
 '  bool pk_hoenn_qa = false;\n'
 '  bool pk_johto_qa = false;')
patch("src/platform/3ds/main.cpp",
 '  else if (!std::strcmp(first, "johtogate")) a.pk_region_gate_qa = a.pk_johto_qa = true;',
 '  else if (!std::strcmp(first, "johtogate")) a.pk_region_gate_qa = a.pk_johto_qa = true;\n'
 '  else if (!std::strcmp(first, "hoenn")) { a.pk_hoenn_qa = true; a.seconds = 12; a.dex = 252; }\n'
 '  else if (!std::strcmp(first, "hoenngate")) a.pk_region_gate_qa = a.pk_hoenn_qa = true;')
patch("src/platform/3ds/main.cpp",
 '    if (at.pk_johto_qa) app.start_pkm_johto_qa(155,true);',
 '    if (at.pk_hoenn_qa) app.start_pkm_hoenn_qa(252,true);\n'
 '    else if (at.pk_johto_qa) app.start_pkm_johto_qa(155,true);')
patch("src/platform/3ds/main.cpp",
 '  } else if (at.on && at.pk_johto_qa) {',
 '  } else if (at.on && at.pk_hoenn_qa) {\n'
 '    app.auto_mode=0; app.auto_diff=0;\n'
 '    app.start_pkm_hoenn_qa(252,true);\n'
 '    at.next_log=10;\n'
 '  } else if (at.on && at.pk_johto_qa) {')

print("PKMSVV_REGION06_HOENN_NATIVE_PATCH_PASS")
