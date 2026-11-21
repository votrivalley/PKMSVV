#!/usr/bin/env python3
"""PKMSVV 3DS Alpha08: genuine Unova Gen5 native Explore over Alpha07 Sinnoh.

Unova is playable only after a saved Sinnoh Badge (including the backup).
Actual C++ Gen5-only wild/boss pools; 15m 15% Kyurem / 85% eligible Gen5
Epic; tracked 30m Kyurem #646. Independent dual-backed Unova Badge.
Preserves Kanto/Johto/Hoenn/Sinnoh save data, title ID, and x1.5 solo mode.
Native biome remains stock placeholder, not the Web Unova map.
"""
from pathlib import Path
import sys

root=Path(sys.argv[1])
def patch(path, old, new, expected=1):
    p=root/path
    src=p.read_text(encoding="utf-8")
    count=src.count(old)
    if count != expected:
        raise SystemExit(f"UNOVA08_ANCHOR_FAILED {path}: want={expected}, saw={count}, anchor={old[:130]!r}")
    p.write_text(src.replace(old,new), encoding="utf-8")

# Keep the 'kanto_only' legacy flag as the isolated native Solo Explore guard.
# Region index and generation are the actual independent selectors.
patch("src/platform/3ds/app.cpp",
 '  cfg.pkmsvv_region_index = region_selected_ == 3 ? 3 :\n'
 '    (region_selected_ == 2 ? 2 : (region_selected_ == 1 ? 1 : 0));',
 '  cfg.pkmsvv_region_index = region_selected_ == 4 ? 4 :\n'
 '    (region_selected_ == 3 ? 3 :\n'
 '    (region_selected_ == 2 ? 2 : (region_selected_ == 1 ? 1 : 0)));')
patch("src/platform/3ds/app.cpp",
 '                    (region_selected_ == 0 || region_selected_ == 1 || region_selected_ == 2 ||\n'
 '                     region_selected_ == 3 || autotest));',
 '                    (region_selected_ == 0 || region_selected_ == 1 || region_selected_ == 2 ||\n'
 '                     region_selected_ == 3 || region_selected_ == 4 || autotest));')

patch("src/core/enemies.cpp",
 '    const int mascot = g.cfg.pkmsvv_region_index == 3 ? 488 :\n'
 '                       (g.cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                       (g.cfg.pkmsvv_region_index == 1 ? 249 : 150));',
 '    const int mascot = g.cfg.pkmsvv_region_index == 4 ? 646 :\n'
 '                       (g.cfg.pkmsvv_region_index == 3 ? 488 :\n'
 '                       (g.cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                       (g.cfg.pkmsvv_region_index == 1 ? 249 : 150)));')

# Special rescue encounter in the original engine must not leak Gen1 Meowth.
patch("src/core/events.cpp",
 'g.cfg.kanto_only ? (g.cfg.pkmsvv_region_index == 3 ? 387 :\n'
 '                    (g.cfg.pkmsvv_region_index == 2 ? 252 :\n'
 '                    (g.cfg.pkmsvv_region_index == 1 ? 161 : 52))) : (gold ? 1000 : 52)',
 'g.cfg.kanto_only ? (g.cfg.pkmsvv_region_index == 4 ? 495 :\n'
 '                    (g.cfg.pkmsvv_region_index == 3 ? 387 :\n'
 '                    (g.cfg.pkmsvv_region_index == 2 ? 252 :\n'
 '                    (g.cfg.pkmsvv_region_index == 1 ? 161 : 52)))) : (gold ? 1000 : 52)')

patch("src/core/enemy.cpp",
 '      g.say(g.cfg.pkmsvv_region_index == 3\n'
 '        ? "Huy hiệu Sinnoh! Unova sẽ mở khi được port."\n'
 '        : g.cfg.pkmsvv_region_index == 2\n'
 '        ? "Huy hiệu Hoenn! Sinnoh đã mở."\n'
 '        : g.cfg.pkmsvv_region_index == 1\n'
 '        ? "Huy hiệu Johto! Hoenn đã mở."\n'
 '        : "Huy hiệu Kanto! Johto đã mở.", 5.0f);',
 '      g.say(g.cfg.pkmsvv_region_index == 4\n'
 '        ? "Huy hiệu Unova! Kalos sẽ mở khi được port."\n'
 '        : g.cfg.pkmsvv_region_index == 3\n'
 '        ? "Huy hiệu Sinnoh! Unova đã mở."\n'
 '        : g.cfg.pkmsvv_region_index == 2\n'
 '        ? "Huy hiệu Hoenn! Sinnoh đã mở."\n'
 '        : g.cfg.pkmsvv_region_index == 1\n'
 '        ? "Huy hiệu Johto! Hoenn đã mở."\n'
 '        : "Huy hiệu Kanto! Johto đã mở.", 5.0f);')
patch("src/core/enemy.cpp",
 '      g.say(g.cfg.pkmsvv_region_index == 3\n'
 '        ? "Hạ Cresselia! Hoàn thành Sinnoh."\n'
 '        : g.cfg.pkmsvv_region_index == 2\n'
 '        ? "Hạ Jirachi! Hoàn thành Hoenn."\n'
 '        : g.cfg.pkmsvv_region_index == 1\n'
 '        ? "Hạ Lugia! Hoàn thành Johto."\n'
 '        : "Hạ Mewtwo! Hoàn thành Kanto.", 5.0f);',
 '      g.say(g.cfg.pkmsvv_region_index == 4\n'
 '        ? "Hạ Kyurem! Hoàn thành Unova."\n'
 '        : g.cfg.pkmsvv_region_index == 3\n'
 '        ? "Hạ Cresselia! Hoàn thành Sinnoh."\n'
 '        : g.cfg.pkmsvv_region_index == 2\n'
 '        ? "Hạ Jirachi! Hoàn thành Hoenn."\n'
 '        : g.cfg.pkmsvv_region_index == 1\n'
 '        ? "Hạ Lugia! Hoàn thành Johto."\n'
 '        : "Hạ Mewtwo! Hoàn thành Kanto.", 5.0f);')

# Region 5 has its own primary and .bak; do not touch any of the four earlier
# ledgers. The primary is intentionally not trusted unless marker is exact.
patch("src/platform/3ds/app.h",
 '  bool pkmsvv_sinnoh_badge_saved_ = false;',
 '  bool pkmsvv_sinnoh_badge_saved_ = false;\n'
 '  bool pkmsvv_unova_badge_saved_ = false;')
helpers=r'''
constexpr const char* kPKMSVVUnovaMarker = "PKMSVV_UNOVA_V1\nUNOVA=1\n";
bool pkmsvv_read_unova_copy(const char* root,const char* name) {
  char path[240]; std::snprintf(path,sizeof(path),"%s/%s",root,name);
  FILE* f=std::fopen(path,"rb"); if(!f) return false;
  char buf[64]={}; const size_t n=std::fread(buf,1,sizeof(buf)-1,f);
  const bool ok=!std::ferror(f) && n==std::strlen(kPKMSVVUnovaMarker) &&
    std::memcmp(buf,kPKMSVVUnovaMarker,n)==0;
  std::fclose(f); return ok;
}
bool pkmsvv_load_unova_badge(const char* root) {
  return pkmsvv_read_unova_copy(root,"unova-progress-v1.dat") ||
         pkmsvv_read_unova_copy(root,"unova-progress-v1.bak");
}
bool pkmsvv_write_unova_copy(const char* root,const char* name) {
  char path[240],tmp[240];
  std::snprintf(path,sizeof(path),"%s/%s",root,name);
  std::snprintf(tmp,sizeof(tmp),"%s/%s.tmp",root,name);
  FILE* f=std::fopen(tmp,"wb"); if(!f) return false;
  const size_t len=std::strlen(kPKMSVVUnovaMarker);
  const bool ok=std::fwrite(kPKMSVVUnovaMarker,1,len,f)==len && std::fflush(f)==0;
  const bool closed=std::fclose(f)==0;
  if(!ok||!closed||std::rename(tmp,path)!=0) { std::remove(tmp); return false; }
  return true;
}
bool pkmsvv_save_unova_badge(const char* root) {
  const bool primary=pkmsvv_write_unova_copy(root,"unova-progress-v1.dat");
  const bool backup=pkmsvv_write_unova_copy(root,"unova-progress-v1.bak");
  return primary||backup;
}
'''
patch("src/platform/3ds/app.cpp",
 '} // namespace\n\n// ---------------- arranque ----------------',
 helpers+'} // namespace\n\n// ---------------- arranque ----------------')
patch("src/platform/3ds/app.cpp",
 '  pkmsvv_sinnoh_badge_saved_ = pkmsvv_load_sinnoh_badge(dir_);',
 '  pkmsvv_sinnoh_badge_saved_ = pkmsvv_load_sinnoh_badge(dir_);\n'
 '  pkmsvv_unova_badge_saved_ = pkmsvv_load_unova_badge(dir_);')
patch("src/platform/3ds/app.cpp",
 '  cloud_tick();',
 '  if (g_->cfg.kanto_only && g_->cfg.pkmsvv_region_index == 4 &&\n'
 '      g_->pkmsvv_badge_claimed && !pkmsvv_unova_badge_saved_ && !autotest && dir_) {\n'
 '    if (pkmsvv_save_unova_badge(dir_)) {\n'
 '      pkmsvv_unova_badge_saved_ = true;\n'
 '      g_notices.push("Huy hiệu Unova đã lưu","Kalos chưa được port.",-1);\n'
 '    }\n'
 '  }\n'
 '  cloud_tick();')

# Unova entry is guarded on touch and physical buttons in one shared function.
patch("src/platform/3ds/app.cpp",
 'bool pkmsvv_native_region_playable(int i) { return i >= 0 && i <= 3; }',
 'bool pkmsvv_native_region_playable(int i) { return i >= 0 && i <= 4; }')
patch("src/platform/3ds/app.cpp",
 '  if (!pkmsvv_native_region_playable(pick)) {',
 '  if (pick == 4 && !pkmsvv_sinnoh_badge_saved_) {\n'
 '    audio::play("error");\n'
 '    g_notices.push("Unova chưa mở","Hạ boss Sinnoh phút 15 lấy Huy hiệu.",-1);\n'
 '    return;\n'
 '  }\n'
 '  if (!pkmsvv_native_region_playable(pick)) {')
patch("src/platform/3ds/app.cpp",
 '      (i != 3 || pkmsvv_hoenn_badge_saved_);',
 '      (i != 3 || pkmsvv_hoenn_badge_saved_) &&\n'
 '      (i != 4 || pkmsvv_sinnoh_badge_saved_);')
patch("src/platform/3ds/app.cpp",
 '    (idx != 3 || pkmsvv_hoenn_badge_saved_);',
 '    (idx != 3 || pkmsvv_hoenn_badge_saved_) &&\n'
 '    (idx != 4 || pkmsvv_sinnoh_badge_saved_);')
patch("src/platform/3ds/app.cpp",
 '                         : (pkmsvv_sinnoh_badge_saved_ ? "Đã có Huy hiệu Sinnoh" : "Gen 4 · ĐÃ MỞ")) :',
 '                         : i == 3 ? (pkmsvv_sinnoh_badge_saved_ ? "Đã có Huy hiệu Sinnoh" : "Gen 4 · ĐÃ MỞ")\n'
 '                         : (pkmsvv_unova_badge_saved_ ? "Đã có Huy hiệu Unova" : "Gen 5 · ĐÃ MỞ")) :')
patch("src/platform/3ds/app.cpp",
 '                  i == 4 && pkmsvv_sinnoh_badge_saved_ ? "Đạt điều kiện · chưa port" :',
 '                  i == 4 ? "Cần Huy hiệu Sinnoh" :\n'
 '                  i == 5 && pkmsvv_unova_badge_saved_ ? "Đạt điều kiện · chưa port" :')
patch("src/platform/3ds/app.cpp",
 '      idx == 3 ? (pkmsvv_sinnoh_badge_saved_ ? "Huy hiệu Sinnoh · Cresselia 30p"\n'
 '                : "Gen 4 · 15p lấy Huy hiệu · 30p Cresselia") :',
 '      idx == 4 ? (pkmsvv_unova_badge_saved_ ? "Huy hiệu Unova · Kyurem 30p"\n'
 '                : "Gen 5 · 15p lấy Huy hiệu · 30p Kyurem") :\n'
 '      idx == 3 ? (pkmsvv_sinnoh_badge_saved_ ? "Huy hiệu Sinnoh · Cresselia 30p"\n'
 '                : "Gen 4 · 15p lấy Huy hiệu · 30p Cresselia") :')
patch("src/platform/3ds/app.cpp",
 '      idx == 3 ? "Cần Huy hiệu Hoenn để vào Sinnoh" : "Chưa port gameplay vùng này");',
 '      idx == 3 ? "Cần Huy hiệu Hoenn để vào Sinnoh" :\n'
 '      idx == 4 ? "Cần Huy hiệu Sinnoh để vào Unova" : "Chưa port gameplay vùng này");')
patch("src/platform/3ds/app.cpp",
 '"Kanto, Johto, Hoenn, Sinnoh: gameplay native Alpha 07."',
 '"Kanto, Johto, Hoenn, Sinnoh, Unova: native Alpha 08."')
patch("src/platform/3ds/app.cpp",
 'Alpha 07 · Sinnoh Gen 4 QA','Alpha 08 · Unova Gen 5 QA')
patch("src/platform/3ds/app.cpp",
 'POKÉMON CHUYỂN SINH 3DS · REGION ALPHA 07',
 'POKÉMON CHUYỂN SINH 3DS · REGION ALPHA 08')
patch("src/core/version.h",
 'kGameTitle = "PKMSVV Region 0.7"',
 'kGameTitle = "PKMSVV Region 0.8"')
patch("Makefile",
 'APP_TITLE\t:=\tPKMSVV Region 0.7',
 'APP_TITLE\t:=\tPKMSVV Region 0.8')

# Extend the existing deterministic native boss/badge/Gen roster test.
patch("src/platform/3ds/main.cpp",
 'g->bosses[0].dex == (g->cfg.pkmsvv_region_index == 3 ? 488 :\n'
 '                            (g->cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                            (g->cfg.pkmsvv_region_index == 1 ? 249 : 150))) ||',
 'g->bosses[0].dex == (g->cfg.pkmsvv_region_index == 4 ? 646 :\n'
 '                            (g->cfg.pkmsvv_region_index == 3 ? 488 :\n'
 '                            (g->cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                            (g->cfg.pkmsvv_region_index == 1 ? 249 : 150)))) ||')
patch("src/platform/3ds/main.cpp",
 'g->bosses[1].dex == (g->cfg.pkmsvv_region_index == 3 ? 488 :\n'
 '                             (g->cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                             (g->cfg.pkmsvv_region_index == 1 ? 249 : 150))) &&\n'
 '        g->bosses[1].at == 1800;',
 'g->bosses[1].dex == (g->cfg.pkmsvv_region_index == 4 ? 646 :\n'
 '                             (g->cfg.pkmsvv_region_index == 3 ? 488 :\n'
 '                             (g->cfg.pkmsvv_region_index == 2 ? 385 :\n'
 '                             (g->cfg.pkmsvv_region_index == 1 ? 249 : 150)))) &&\n'
 '        g->bosses[1].at == 1800;')
patch("src/platform/3ds/main.cpp",
 'final->dex == (at.pk_sinnoh_qa ? 488 :\n'
 '                     (at.pk_hoenn_qa ? 385 : (at.pk_johto_qa ? 249 : 150))) &&',
 'final->dex == (at.pk_unova_qa ? 646 :\n'
 '                     (at.pk_sinnoh_qa ? 488 :\n'
 '                     (at.pk_hoenn_qa ? 385 : (at.pk_johto_qa ? 249 : 150)))) &&')
patch("src/platform/3ds/main.cpp", "PKMSVV_REGION07_CAST_", "PKMSVV_REGION08_CAST_")
patch("src/platform/3ds/main.cpp", "PKMSVV_REGION07_BOSS_CFG_", "PKMSVV_REGION08_BOSS_CFG_")
patch("src/platform/3ds/main.cpp", "PKMSVV_REGION07_LIVE_", "PKMSVV_REGION08_LIVE_")

# New Unova autotest mode, plus deterministic 15 -> 30m kill gate.
patch("src/platform/3ds/app.h",
 '  void start_pkm_sinnoh_qa(int dex,bool immortal);',
 '  void start_pkm_sinnoh_qa(int dex,bool immortal);\n'
 '  void start_pkm_unova_qa(int dex,bool immortal);')
patch("src/platform/3ds/app.cpp",
 'void App::start_pkm_sinnoh_qa(int dex,bool immortal) {',
 'void App::start_pkm_unova_qa(int dex,bool immortal) {\n'
 '  region_selected_ = 4;\n'
 '  set_autotest(dex,immortal);\n'
 '}\n\n'
 'void App::start_pkm_sinnoh_qa(int dex,bool immortal) {')
patch("src/platform/3ds/main.cpp",
 '  bool pk_sinnoh_qa = false;',
 '  bool pk_unova_qa = false;\n'
 '  bool pk_sinnoh_qa = false;')
patch("src/platform/3ds/main.cpp",
 '  else if (!std::strcmp(first, "sinnohgate")) a.pk_region_gate_qa = a.pk_sinnoh_qa = true;',
 '  else if (!std::strcmp(first, "sinnohgate")) a.pk_region_gate_qa = a.pk_sinnoh_qa = true;\n'
 '  else if (!std::strcmp(first, "unova")) { a.pk_unova_qa = true; a.seconds = 12; a.dex = 495; }\n'
 '  else if (!std::strcmp(first, "unovagate")) a.pk_region_gate_qa = a.pk_unova_qa = true;')
patch("src/platform/3ds/main.cpp",
 '    if (at.pk_sinnoh_qa) app.start_pkm_sinnoh_qa(387,true);',
 '    if (at.pk_unova_qa) app.start_pkm_unova_qa(495,true);\n'
 '    else if (at.pk_sinnoh_qa) app.start_pkm_sinnoh_qa(387,true);')
patch("src/platform/3ds/main.cpp",
 '  } else if (at.on && at.pk_sinnoh_qa) {',
 '  } else if (at.on && at.pk_unova_qa) {\n'
 '    app.auto_mode=0; app.auto_diff=0;\n'
 '    app.start_pkm_unova_qa(495,true);\n'
 '    at.next_log=10;\n'
 '  } else if (at.on && at.pk_sinnoh_qa) {')

print("PKMSVV_REGION08_UNOVA_NATIVE_PATCH_PASS: Gen5+Kyurem646+badge+speed inherited")
