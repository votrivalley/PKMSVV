#!/usr/bin/env python3
"""PKMSVV native 3DS Alpha07 Sinnoh, after Kanto/Johto/Hoenn and 1.5x solo speed.

True Gen4 C++ region, unlocked by a saved Hoenn badge, not by displaying a
mock menu item. 15m boss 15% Cresselia/85% Gen4 Epic, 30m Cresselia (#488).
Independent dual backup Sinnoh Badge. Preserves existing saves and title ID.
Uses stock native terrain index 3 as a temporary biome, NOT the Web tilemap.
"""
from pathlib import Path
import sys
root = Path(sys.argv[1])
def patch(path, old, new, expected=1):
    p=root/path
    src=p.read_text(encoding="utf-8")
    found=src.count(old)
    if found != expected:
        raise SystemExit(f"SINNOH07_ANCHOR_FAILED {path}: want {expected}, got {found}: {old[:120]!r}")
    p.write_text(src.replace(old,new),encoding="utf-8")

# Native RunConfig is the source of truth for selected playable generation.
patch("src/platform/3ds/app.cpp",
 '  cfg.pkmsvv_region_index = region_selected_ == 2 ? 2 : (region_selected_ == 1 ? 1 : 0);',
 '  cfg.pkmsvv_region_index = region_selected_ == 3 ? 3 :\n'
 '    (region_selected_ == 2 ? 2 : (region_selected_ == 1 ? 1 : 0));')
patch("src/platform/3ds/app.cpp",
 '                    (region_selected_ == 0 || region_selected_ == 1 || region_selected_ == 2 || autotest));',
 '                    (region_selected_ == 0 || region_selected_ == 1 || region_selected_ == 2 ||\n'
 '                     region_selected_ == 3 || autotest));')

# Central enemy spawn uses cfg.pkmsvv_region_gen. Add correct Gen4 mascot.
patch("src/core/enemies.cpp",
 '    const int mascot = g.cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                       (g.cfg.pkmsvv_region_index == 1 ? 249 : 150);',
 '    const int mascot = g.cfg.pkmsvv_region_index == 3 ? 488 :\n'
 '                       (g.cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                       (g.cfg.pkmsvv_region_index == 1 ? 249 : 150));')

# Original 3DS engine's special encounter must not leak Gen1 into Sinnoh.
patch("src/core/events.cpp",
 'g.cfg.kanto_only ? (g.cfg.pkmsvv_region_index == 2 ? 252 :\n'
 '                    (g.cfg.pkmsvv_region_index == 1 ? 161 : 52)) : (gold ? 1000 : 52)',
 'g.cfg.kanto_only ? (g.cfg.pkmsvv_region_index == 3 ? 387 :\n'
 '                    (g.cfg.pkmsvv_region_index == 2 ? 252 :\n'
 '                    (g.cfg.pkmsvv_region_index == 1 ? 161 : 52))) : (gold ? 1000 : 52)')

patch("src/core/enemy.cpp",
 '      g.say(g.cfg.pkmsvv_region_index == 2\n'
 '        ? "Huy hiệu Hoenn! Sinnoh sẽ mở khi được port."\n'
 '        : g.cfg.pkmsvv_region_index == 1\n'
 '        ? "Huy hiệu Johto! Hoenn đã mở."\n'
 '        : "Huy hiệu Kanto! Johto đã mở.", 5.0f);',
 '      g.say(g.cfg.pkmsvv_region_index == 3\n'
 '        ? "Huy hiệu Sinnoh! Unova sẽ mở khi được port."\n'
 '        : g.cfg.pkmsvv_region_index == 2\n'
 '        ? "Huy hiệu Hoenn! Sinnoh đã mở."\n'
 '        : g.cfg.pkmsvv_region_index == 1\n'
 '        ? "Huy hiệu Johto! Hoenn đã mở."\n'
 '        : "Huy hiệu Kanto! Johto đã mở.", 5.0f);')
patch("src/core/enemy.cpp",
 '      g.say(g.cfg.pkmsvv_region_index == 2\n'
 '        ? "Hạ Jirachi! Hoàn thành Hoenn."\n'
 '        : g.cfg.pkmsvv_region_index == 1\n'
 '        ? "Hạ Lugia! Hoàn thành Johto."\n'
 '        : "Hạ Mewtwo! Hoàn thành Kanto.", 5.0f);',
 '      g.say(g.cfg.pkmsvv_region_index == 3\n'
 '        ? "Hạ Cresselia! Hoàn thành Sinnoh."\n'
 '        : g.cfg.pkmsvv_region_index == 2\n'
 '        ? "Hạ Jirachi! Hoàn thành Hoenn."\n'
 '        : g.cfg.pkmsvv_region_index == 1\n'
 '        ? "Hạ Lugia! Hoàn thành Johto."\n'
 '        : "Hạ Mewtwo! Hoàn thành Kanto.", 5.0f);')

# One new Sinnoh badge namespace, two complete independent primary/backup
# markers. Do not rewrite earlier regions' ledger formats or flags.
patch("src/platform/3ds/app.h",
 '  bool pkmsvv_hoenn_badge_saved_ = false;',
 '  bool pkmsvv_hoenn_badge_saved_ = false;\n'
 '  bool pkmsvv_sinnoh_badge_saved_ = false;')
helpers=r'''
constexpr const char* kPKMSVVSinnohMarker = "PKMSVV_SINNOH_V1\nSINNOH=1\n";
bool pkmsvv_read_sinnoh_copy(const char* root,const char* name) {
  char path[240]; std::snprintf(path,sizeof(path),"%s/%s",root,name);
  FILE* f=std::fopen(path,"rb"); if(!f) return false;
  char buf[64]={}; const size_t n=std::fread(buf,1,sizeof(buf)-1,f);
  const bool ok=!std::ferror(f) && n==std::strlen(kPKMSVVSinnohMarker) &&
    std::memcmp(buf,kPKMSVVSinnohMarker,n)==0;
  std::fclose(f); return ok;
}
bool pkmsvv_load_sinnoh_badge(const char* root) {
  return pkmsvv_read_sinnoh_copy(root,"sinnoh-progress-v1.dat") ||
         pkmsvv_read_sinnoh_copy(root,"sinnoh-progress-v1.bak");
}
bool pkmsvv_write_sinnoh_copy(const char* root,const char* name) {
  char path[240],tmp[240];
  std::snprintf(path,sizeof(path),"%s/%s",root,name);
  std::snprintf(tmp,sizeof(tmp),"%s/%s.tmp",root,name);
  FILE* f=std::fopen(tmp,"wb"); if(!f) return false;
  const size_t len=std::strlen(kPKMSVVSinnohMarker);
  const bool ok=std::fwrite(kPKMSVVSinnohMarker,1,len,f)==len && std::fflush(f)==0;
  const bool closed=std::fclose(f)==0;
  if(!ok||!closed||std::rename(tmp,path)!=0) { std::remove(tmp); return false; }
  return true;
}
bool pkmsvv_save_sinnoh_badge(const char* root) {
  const bool primary=pkmsvv_write_sinnoh_copy(root,"sinnoh-progress-v1.dat");
  const bool backup=pkmsvv_write_sinnoh_copy(root,"sinnoh-progress-v1.bak");
  return primary||backup;
}
'''
patch("src/platform/3ds/app.cpp",
 '} // namespace\n\n// ---------------- arranque ----------------',
 helpers+'} // namespace\n\n// ---------------- arranque ----------------')
patch("src/platform/3ds/app.cpp",
 '  pkmsvv_hoenn_badge_saved_ = pkmsvv_load_hoenn_badge(dir_);',
 '  pkmsvv_hoenn_badge_saved_ = pkmsvv_load_hoenn_badge(dir_);\n'
 '  pkmsvv_sinnoh_badge_saved_ = pkmsvv_load_sinnoh_badge(dir_);')
patch("src/platform/3ds/app.cpp",
 '  cloud_tick();',
 '  if (g_->cfg.kanto_only && g_->cfg.pkmsvv_region_index == 3 &&\n'
 '      g_->pkmsvv_badge_claimed && !pkmsvv_sinnoh_badge_saved_ && !autotest && dir_) {\n'
 '    if (pkmsvv_save_sinnoh_badge(dir_)) {\n'
 '      pkmsvv_sinnoh_badge_saved_ = true;\n'
 '      g_notices.push("Huy hiệu Sinnoh đã lưu","Unova chưa được port.",-1);\n'
 '    }\n'
 '  }\n'
 '  cloud_tick();')

# Unlock cannot be faked by picking a locked region with D-pad or touch.
patch("src/platform/3ds/app.cpp",
 'bool pkmsvv_native_region_playable(int i) { return i == 0 || i == 1 || i == 2; }',
 'bool pkmsvv_native_region_playable(int i) { return i >= 0 && i <= 3; }')
patch("src/platform/3ds/app.cpp",
 '  if (!pkmsvv_native_region_playable(pick)) {',
 '  if (pick == 3 && !pkmsvv_hoenn_badge_saved_) {\n'
 '    audio::play("error");\n'
 '    g_notices.push("Sinnoh chưa mở","Hạ boss Hoenn phút 15 lấy Huy hiệu.",-1);\n'
 '    return;\n'
 '  }\n'
 '  if (!pkmsvv_native_region_playable(pick)) {')
patch("src/platform/3ds/app.cpp",
 '      (i != 1 || pkmsvv_kanto_badge_saved_) && (i != 2 || pkmsvv_johto_badge_saved_);',
 '      (i != 1 || pkmsvv_kanto_badge_saved_) && (i != 2 || pkmsvv_johto_badge_saved_) &&\n'
 '      (i != 3 || pkmsvv_hoenn_badge_saved_);')
patch("src/platform/3ds/app.cpp",
 '    (idx != 1 || pkmsvv_kanto_badge_saved_) && (idx != 2 || pkmsvv_johto_badge_saved_);',
 '    (idx != 1 || pkmsvv_kanto_badge_saved_) && (idx != 2 || pkmsvv_johto_badge_saved_) &&\n'
 '    (idx != 3 || pkmsvv_hoenn_badge_saved_);')
patch("src/platform/3ds/app.cpp",
 '                         : (pkmsvv_hoenn_badge_saved_ ? "Đã có Huy hiệu Hoenn" : "Gen 3 · ĐÃ MỞ")) :',
 '                         : i == 2 ? (pkmsvv_hoenn_badge_saved_ ? "Đã có Huy hiệu Hoenn" : "Gen 3 · ĐÃ MỞ")\n'
 '                         : (pkmsvv_sinnoh_badge_saved_ ? "Đã có Huy hiệu Sinnoh" : "Gen 4 · ĐÃ MỞ")) :')
patch("src/platform/3ds/app.cpp",
 '                  i == 3 && pkmsvv_hoenn_badge_saved_ ? "Đạt điều kiện · chưa port" :',
 '                  i == 3 ? "Cần Huy hiệu Hoenn" :\n'
 '                  i == 4 && pkmsvv_sinnoh_badge_saved_ ? "Đạt điều kiện · chưa port" :')
patch("src/platform/3ds/app.cpp",
 '      idx == 2 ? (pkmsvv_hoenn_badge_saved_ ? "Huy hiệu Hoenn · Jirachi 30p"\n'
 '                : "Gen 3 · 15p lấy Huy hiệu · 30p Jirachi") :',
 '      idx == 3 ? (pkmsvv_sinnoh_badge_saved_ ? "Huy hiệu Sinnoh · Cresselia 30p"\n'
 '                : "Gen 4 · 15p lấy Huy hiệu · 30p Cresselia") :\n'
 '      idx == 2 ? (pkmsvv_hoenn_badge_saved_ ? "Huy hiệu Hoenn · Jirachi 30p"\n'
 '                : "Gen 3 · 15p lấy Huy hiệu · 30p Jirachi") :')
patch("src/platform/3ds/app.cpp",
 '      idx == 2 ? "Cần Huy hiệu Johto để vào Hoenn" : "Chưa port gameplay vùng này");',
 '      idx == 2 ? "Cần Huy hiệu Johto để vào Hoenn" :\n'
 '      idx == 3 ? "Cần Huy hiệu Hoenn để vào Sinnoh" : "Chưa port gameplay vùng này");')
patch("src/platform/3ds/app.cpp",
 '"Kanto, Johto, Hoenn đã có gameplay native ở Alpha 06."',
 '"Kanto, Johto, Hoenn, Sinnoh: gameplay native Alpha 07."')
patch("src/platform/3ds/app.cpp",
 'Alpha 06 · Hoenn Gen 3 QA',
 'Alpha 07 · Sinnoh Gen 4 QA')
patch("src/platform/3ds/app.cpp",
 'POKÉMON CHUYỂN SINH 3DS · REGION ALPHA 06',
 'POKÉMON CHUYỂN SINH 3DS · REGION ALPHA 07')
patch("src/core/version.h",'kGameTitle = "PKMSVV Region 0.6"','kGameTitle = "PKMSVV Region 0.7"')
patch("Makefile",'APP_TITLE\t:=\tPKMSVV Region 0.6','APP_TITLE\t:=\tPKMSVV Region 0.7"')

# Runtime diagnostics and native 15m -> 30m tracked boss victory QA.
patch("src/platform/3ds/main.cpp",
 'g->bosses[0].dex == (g->cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                            (g->cfg.pkmsvv_region_index == 1 ? 249 : 150)) ||',
 'g->bosses[0].dex == (g->cfg.pkmsvv_region_index == 3 ? 488 :\n'
 '                            (g->cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                            (g->cfg.pkmsvv_region_index == 1 ? 249 : 150))) ||')
patch("src/platform/3ds/main.cpp",
 'g->bosses[1].dex == (g->cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                             (g->cfg.pkmsvv_region_index == 1 ? 249 : 150)) &&\n'
 '        g->bosses[1].at == 1800;',
 'g->bosses[1].dex == (g->cfg.pkmsvv_region_index == 3 ? 488 :\n'
 '                             (g->cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                             (g->cfg.pkmsvv_region_index == 1 ? 249 : 150))) &&\n'
 '        g->bosses[1].at == 1800;')
patch("src/platform/3ds/main.cpp",
 'final->dex == (at.pk_hoenn_qa ? 385 : (at.pk_johto_qa ? 249 : 150)) &&',
 'final->dex == (at.pk_sinnoh_qa ? 488 :\n'
 '                     (at.pk_hoenn_qa ? 385 : (at.pk_johto_qa ? 249 : 150))) &&')
patch("src/platform/3ds/main.cpp","PKMSVV_REGION06_CAST_","PKMSVV_REGION07_CAST_")
patch("src/platform/3ds/main.cpp","PKMSVV_REGION06_BOSS_CFG_","PKMSVV_REGION07_BOSS_CFG_")
patch("src/platform/3ds/main.cpp","PKMSVV_REGION06_LIVE_","PKMSVV_REGION07_LIVE_")

# New exact Sinnoh 12s smoke test and 1801s tracked boss death gate.
patch("src/platform/3ds/app.h",
 '  void start_pkm_hoenn_qa(int dex,bool immortal);',
 '  void start_pkm_hoenn_qa(int dex,bool immortal);\n'
 '  void start_pkm_sinnoh_qa(int dex,bool immortal);')
patch("src/platform/3ds/app.cpp",
 'void App::start_pkm_hoenn_qa(int dex,bool immortal) {',
 'void App::start_pkm_sinnoh_qa(int dex,bool immortal) {\n'
 '  region_selected_ = 3;\n'
 '  set_autotest(dex,immortal);\n'
 '}\n\n'
 'void App::start_pkm_hoenn_qa(int dex,bool immortal) {')
patch("src/platform/3ds/main.cpp",
 '  bool pk_hoenn_qa = false;',
 '  bool pk_sinnoh_qa = false;\n'
 '  bool pk_hoenn_qa = false;')
patch("src/platform/3ds/main.cpp",
 '  else if (!std::strcmp(first, "hoenngate")) a.pk_region_gate_qa = a.pk_hoenn_qa = true;',
 '  else if (!std::strcmp(first, "hoenngate")) a.pk_region_gate_qa = a.pk_hoenn_qa = true;\n'
 '  else if (!std::strcmp(first, "sinnoh")) { a.pk_sinnoh_qa = true; a.seconds = 12; a.dex = 387; }\n'
 '  else if (!std::strcmp(first, "sinnohgate")) a.pk_region_gate_qa = a.pk_sinnoh_qa = true;')
patch("src/platform/3ds/main.cpp",
 '    if (at.pk_hoenn_qa) app.start_pkm_hoenn_qa(252,true);',
 '    if (at.pk_sinnoh_qa) app.start_pkm_sinnoh_qa(387,true);\n'
 '    else if (at.pk_hoenn_qa) app.start_pkm_hoenn_qa(252,true);')
patch("src/platform/3ds/main.cpp",
 '  } else if (at.on && at.pk_hoenn_qa) {',
 '  } else if (at.on && at.pk_sinnoh_qa) {\n'
 '    app.auto_mode=0; app.auto_diff=0;\n'
 '    app.start_pkm_sinnoh_qa(387,true);\n'
 '    at.next_log=10;\n'
 '  } else if (at.on && at.pk_hoenn_qa) {')

print("PKMSVV_REGION07_SINNOH_NATIVE_PATCH_PASS: 4 region engine, Gen4, Cresselia488")
