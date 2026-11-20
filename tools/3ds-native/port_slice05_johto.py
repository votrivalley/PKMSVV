#!/usr/bin/env python3
"""PKMSVV native 3DS Alpha05: Johto Gen2 after Kanto Alpha04.

Web Region rules: unlock with Kanto badge, Gen2 wild encounters,
15m boss 15% Lugia / 85% Gen2 Epic, 30m Lugia victory.
Johto uses a DIFFERENT stock native 3DS biome slot, NOT a Web map port.
Save files remain independent and double-backed-up.
"""
from pathlib import Path
import sys
root=Path(sys.argv[1])
def patch(path,old,new,count=1):
    p=root/path
    s=p.read_text(encoding='utf-8')
    n=s.count(old)
    if n!=count: raise SystemExit(f'JOHTO05_ANCHOR_FAILED {path}: expected={count} saw={n}: {old[:100]!r}')
    p.write_text(s.replace(old,new),encoding='utf-8')

# The legacy kanto_only flag still gates original-engine side modes.
# Add explicit region generation/index to extend those native guards.
patch('src/core/game.h',
 '  bool kanto_only = false;\n  int dex = 1;',
 '  bool kanto_only = false; // isolated native Explore run: Kanto or Johto\n'
 '  uint8_t pkmsvv_region_index = 0;\n  uint8_t pkmsvv_region_gen = 1;\n'
 '  int dex = 1;')
patch('src/platform/3ds/app.cpp',
 '  cfg.kanto_only = (cfg.mode == MODE_NORMAL && !cfg.weekly && cfg.nplayers == 1 &&\n'
 '                    (region_selected_ == 0 || autotest));',
 '  cfg.pkmsvv_region_index = region_selected_ == 1 ? 1 : 0;\n'
 '  cfg.pkmsvv_region_gen = uint8_t(cfg.pkmsvv_region_index + 1);\n'
 '  cfg.kanto_only = (cfg.mode == MODE_NORMAL && !cfg.weekly && cfg.nplayers == 1 &&\n'
 '                    (region_selected_ == 0 || region_selected_ == 1 || autotest));')

# Central native spawn pool, even when the original engine tries off-gen.
patch('src/core/enemies.cpp',
 'int candidates(int ti, const Mon** out, int mono = -1, bool kanto_only = false) {',
 'int candidates(int ti, const Mon** out, int mono = -1, int region_gen = 0) {')
patch('src/core/enemies.cpp',
 '(!kanto_only || (p.gen == 1 && p.reg == 0))) out[n++] = &p;',
 '(!region_gen || (p.gen == region_gen && p.reg == 0))) out[n++] = &p;')
patch('src/core/enemies.cpp','  if (n == 0 && kanto_only)\n','  if (n == 0 && region_gen)\n')
patch('src/core/enemies.cpp',
 '      if (p.gen == 1 && p.reg == 0 && p.rarity < 5) out[n++] = &p;',
 '      if (p.gen == region_gen && p.reg == 0 && p.rarity < 5) out[n++] = &p;')
patch('src/core/enemies.cpp',
 'mono_of(g), g.cfg.kanto_only)',
 'mono_of(g), g.cfg.kanto_only ? g.cfg.pkmsvv_region_gen : 0)',3)
patch('src/core/enemies.cpp',
 'candidates(ti, all, -1, g.cfg.kanto_only)',
 'candidates(ti, all, -1, g.cfg.kanto_only ? g.cfg.pkmsvv_region_gen : 0)')
patch('src/core/enemies.cpp',
 'g.cfg.kanto_only && (p.gen != 1 || p.reg != 0)',
 'g.cfg.kanto_only && (p.gen != g.cfg.pkmsvv_region_gen || p.reg != 0)')
patch('src/core/enemies.cpp',
 'p.gen == 1 && p.reg == 0 && p.rarity == 4 && !p.leg',
 'p.gen == g.cfg.pkmsvv_region_gen && p.reg == 0 && p.rarity == 4 && !p.leg')
patch('src/core/enemies.cpp',
 '    int first_dex = 150;\n',
 '    const int mascot = g.cfg.pkmsvv_region_index == 1 ? 249 : 150;\n'
 '    int first_dex = mascot;\n')
patch('src/core/enemies.cpp',
 '    const int dexes[2] = {first_dex, 150};',
 '    const int dexes[2] = {first_dex, mascot};')
patch('src/core/enemies.cpp',
 'm->gen != 1 || m->reg != 0',
 'm->gen != g.cfg.pkmsvv_region_gen || m->reg != 0')
patch('src/core/enemies.cpp',
 '    const float hp = b.at == 1800 ? 62000.0f : 28000.0f;\n'
 '    const float dmg = b.at == 1800 ? 43.0f : 24.0f;',
 '    const float hp = (b.at == 1800 ? 62000.0f : 28000.0f) +\n'
 '                     g.cfg.pkmsvv_region_index * (b.at == 1800 ? 14000.0f : 8000.0f);\n'
 '    const float dmg = (b.at == 1800 ? 43.0f : 24.0f) +\n'
 '                      4.0f * g.cfg.pkmsvv_region_index;')

patch('src/core/enemy.cpp',
 'native->gen != 1 || native->reg != 0',
 'native->gen != g.cfg.pkmsvv_region_gen || native->reg != 0')
patch('src/core/enemy.cpp',
 '      g.say("Huy hiệu Vùng Kanto! Johto được mở trong tiến trình.", 5.0f);',
 '      g.say(g.cfg.pkmsvv_region_index == 1\n'
 '        ? "Huy hiệu Johto! Hoenn sẽ mở khi được port."\n'
 '        : "Huy hiệu Kanto! Johto đã mở.", 5.0f);')
patch('src/core/enemy.cpp',
 '      g.say("Hạ Mewtwo! Kết thúc chuyến khám phá Kanto.", 5.0f);',
 '      g.say(g.cfg.pkmsvv_region_index == 1\n'
 '        ? "Hạ Lugia! Hoàn thành Johto."\n'
 '        : "Hạ Mewtwo! Hoàn thành Kanto.", 5.0f);')
patch('src/core/events.cpp',
 'g.cfg.kanto_only ? 52 : (gold ? 1000 : 52)',
 'g.cfg.kanto_only ? (g.cfg.pkmsvv_region_index == 1 ? 161 : 52) : (gold ? 1000 : 52)')
patch('src/core/events.cpp',
 '(!g.cfg.kanto_only || (p.gen == 1 && p.reg == 0))) pool[np++] = p.dex;',
 '(!g.cfg.kanto_only || (p.gen == g.cfg.pkmsvv_region_gen && p.reg == 0))) pool[np++] = p.dex;')

# A second native terrain profile, not a claim that the Web Johto map is ported.
patch('src/core/game.cpp',
 '  world.set_biome(run_biome(0), true);\n  biome = 0;',
 '  const int region_start_biome = c.kanto_only ? c.pkmsvv_region_index : 0;\n'
 '  world.set_biome(run_biome(region_start_biome), true);\n'
 '  biome = region_start_biome;')
patch('src/core/game.cpp',
 'const int b = cfg.kanto_only ? 0 : int(std::floor(time / 240));',
 'const int b = cfg.kanto_only ? cfg.pkmsvv_region_index : int(std::floor(time / 240));')

# Keep Kanto file format backward-compatible. Johto has its own two copies.
patch('src/platform/3ds/app.h',
 '  bool pkmsvv_kanto_badge_saved_ = false;',
 '  bool pkmsvv_kanto_badge_saved_ = false;\n'
 '  bool pkmsvv_johto_badge_saved_ = false;')
helpers=r"""
constexpr const char* kPKMSVVJohtoMarker = "PKMSVV_JOHTO_V1\nJOHTO=1\n";
bool pkmsvv_read_johto_copy(const char* root, const char* name) {
  char path[240]; std::snprintf(path,sizeof(path),"%s/%s",root,name);
  FILE* f=std::fopen(path,"rb"); if(!f) return false;
  char buf[64]={}; const size_t n=std::fread(buf,1,sizeof(buf)-1,f);
  const bool ok=!std::ferror(f) && n==std::strlen(kPKMSVVJohtoMarker) &&
    std::memcmp(buf,kPKMSVVJohtoMarker,n)==0;
  std::fclose(f); return ok;
}
bool pkmsvv_load_johto_badge(const char* root) {
  return pkmsvv_read_johto_copy(root,"johto-progress-v1.dat") ||
         pkmsvv_read_johto_copy(root,"johto-progress-v1.bak");
}
bool pkmsvv_write_johto_copy(const char* root,const char* name) {
  char path[240],tmp[240];
  std::snprintf(path,sizeof(path),"%s/%s",root,name);
  std::snprintf(tmp,sizeof(tmp),"%s/%s.tmp",root,name);
  FILE* f=std::fopen(tmp,"wb"); if(!f) return false;
  const size_t len=std::strlen(kPKMSVVJohtoMarker);
  const bool ok=std::fwrite(kPKMSVVJohtoMarker,1,len,f)==len && std::fflush(f)==0;
  const bool closed=std::fclose(f)==0;
  if(!ok||!closed||std::rename(tmp,path)!=0){std::remove(tmp);return false;}
  return true;
}
bool pkmsvv_save_johto_badge(const char* root) {
  const bool primary=pkmsvv_write_johto_copy(root,"johto-progress-v1.dat");
  const bool backup=pkmsvv_write_johto_copy(root,"johto-progress-v1.bak");
  return primary||backup;
}
"""
patch('src/platform/3ds/app.cpp',
 '} // namespace\n\n// ---------------- arranque ----------------',
 helpers+'} // namespace\n\n// ---------------- arranque ----------------')
patch('src/platform/3ds/app.cpp',
 '  pkmsvv_kanto_badge_saved_ = pkmsvv_load_badge(dir_);',
 '  pkmsvv_kanto_badge_saved_ = pkmsvv_load_badge(dir_);\n'
 '  pkmsvv_johto_badge_saved_ = pkmsvv_load_johto_badge(dir_);')
patch('src/platform/3ds/app.cpp',
 '  if (g_->cfg.kanto_only && g_->pkmsvv_badge_claimed &&\n'
 '      !pkmsvv_kanto_badge_saved_ && !autotest && dir_) {',
 '  if (g_->cfg.kanto_only && g_->cfg.pkmsvv_region_index == 0 &&\n'
 '      g_->pkmsvv_badge_claimed && !pkmsvv_kanto_badge_saved_ && !autotest && dir_) {')
patch('src/platform/3ds/app.cpp',
 '  cloud_tick();',
 '  if (g_->cfg.kanto_only && g_->cfg.pkmsvv_region_index == 1 &&\n'
 '      g_->pkmsvv_badge_claimed && !pkmsvv_johto_badge_saved_ && !autotest && dir_) {\n'
 '    if (pkmsvv_save_johto_badge(dir_)) {\n'
 '      pkmsvv_johto_badge_saved_ = true;\n'
 '      g_notices.push("Huy hiệu Johto đã lưu","Hoenn chưa được port.",-1);\n'
 '    }\n'
 '  }\n'
 '  cloud_tick();')

# Real region selection guard + explicit Johto-only playable state.
patch('src/platform/3ds/app.cpp',
 'bool pkmsvv_native_region_playable(int i) { return i == 0; }',
 'bool pkmsvv_native_region_playable(int i) { return i == 0 || i == 1; }')
patch('src/platform/3ds/app.cpp',
 '  if (!pkmsvv_native_region_playable(pick)) {',
 '  if (pick == 1 && !pkmsvv_kanto_badge_saved_) {\n'
 '    audio::play("error");\n'
 '    g_notices.push("Johto chưa mở","Hạ boss Kanto 15 phút lấy Huy hiệu.",-1);\n'
 '    return;\n'
 '  }\n'
 '  if (!pkmsvv_native_region_playable(pick)) {')
patch('src/platform/3ds/app.cpp',
 '"Chỉ Kanto đang mở ở bản Alpha 03."',
 '"Chỉ Kanto/Johto có gameplay native ở Alpha 05."')
patch('src/platform/3ds/app.cpp',
 '    const bool open = pkmsvv_native_region_playable(i);',
 '    const bool open = pkmsvv_native_region_playable(i) && (i != 1 || pkmsvv_kanto_badge_saved_);')
patch('src/platform/3ds/app.cpp',
 '  const bool open = pkmsvv_native_region_playable(idx);',
 '  const bool open = pkmsvv_native_region_playable(idx) && (idx != 1 || pkmsvv_kanto_badge_saved_);')
patch('src/platform/3ds/app.cpp',
 'r_->text_fit(open ? (pkmsvv_kanto_badge_saved_ ? "Đã có Huy hiệu Kanto" : "Gen 1 · ĐÃ MỞ") :\n'
 '                 (i == 1 && pkmsvv_kanto_badge_saved_ ? "Đạt điều kiện · chưa port" :\n'
 '                  i == 9 ? "Cần 9 Huy hiệu · chưa port" : "Chưa port · đang khóa"),',
 'r_->text_fit(open ? (i == 0 ? (pkmsvv_kanto_badge_saved_ ? "Đã có Huy hiệu Kanto" : "Gen 1 · ĐÃ MỞ")\n'
 '                         : (pkmsvv_johto_badge_saved_ ? "Đã có Huy hiệu Johto" : "Gen 2 · ĐÃ MỞ")) :\n'
 '                 (i == 1 ? "Cần Huy hiệu Kanto" :\n'
 '                  i == 2 && pkmsvv_johto_badge_saved_ ? "Đạt điều kiện · chưa port" :\n'
 '                  i == 9 ? "Cần 9 Huy hiệu · chưa port" : "Chưa port · đang khóa"),')
patch('src/platform/3ds/app.cpp',
 '      pkmsvv_kanto_badge_saved_ ? "Đã có Huy hiệu Kanto · Boss cuối 30p"\n'
 '      : "15p hạ Boss nhận Huy hiệu · 30p hạ Mewtwo");',
 '      idx == 1 ? (pkmsvv_johto_badge_saved_ ? "Huy hiệu Johto · Lugia 30p"\n'
 '                : "Gen 2 · 15p lấy Huy hiệu · 30p Lugia") :\n'
 '      (pkmsvv_kanto_badge_saved_ ? "Huy hiệu Kanto · Mewtwo 30p"\n'
 '       : "Gen 1 · 15p lấy Huy hiệu · 30p Mewtwo"));')
patch('src/platform/3ds/app.cpp',
 '    std::snprintf(info, sizeof(info), "CHƯA MỞ - bản 3DS chưa hỗ trợ vùng này");',
 '    std::snprintf(info, sizeof(info), "%s", idx == 1 ?\n'
 '      "Cần Huy hiệu Kanto để vào Johto" : "Chưa port gameplay vùng này");')
patch('src/platform/3ds/app.cpp','Alpha 04 · Huy hiệu Kanto QA','Alpha 05 · Johto Gen 2 QA')
patch('src/platform/3ds/app.cpp','POKÉMON CHUYỂN SINH 3DS · REGION ALPHA 04','POKÉMON CHUYỂN SINH 3DS · REGION ALPHA 05')
patch('src/core/version.h','kGameTitle = "PKMSVV Region 0.4"','kGameTitle = "PKMSVV Region 0.5"')
patch('Makefile','APP_TITLE\t:=\tPKMSVV Region 0.4','APP_TITLE\t:=\tPKMSVV Region 0.5')

# Also generalize native runtime diagnostics to the selected generation.
patch('src/platform/3ds/main.cpp',
 'm->gen != 1 || m->reg != 0',
 'm->gen != g->cfg.pkmsvv_region_gen || m->reg != 0',4)
patch('src/platform/3ds/main.cpp',
 'badge_mon->gen == 1 && badge_mon->reg == 0',
 'badge_mon->gen == g->cfg.pkmsvv_region_gen && badge_mon->reg == 0')
patch('src/platform/3ds/main.cpp',
 'g->bosses[0].dex == 150 ||',
 'g->bosses[0].dex == (g->cfg.pkmsvv_region_index == 1 ? 249 : 150) ||')
patch('src/platform/3ds/main.cpp',
 'g->bosses[1].dex == 150 && g->bosses[1].at == 1800;',
 'g->bosses[1].dex == (g->cfg.pkmsvv_region_index == 1 ? 249 : 150) && g->bosses[1].at == 1800;')
patch('src/platform/3ds/main.cpp','PKMSVV_KANTO_CAST_','PKMSVV_REGION05_CAST_')
patch('src/platform/3ds/main.cpp','PKMSVV_KANTO_BOSS_CFG_','PKMSVV_REGION05_BOSS_CFG_')
patch('src/platform/3ds/main.cpp','PKMSVV_KANTO_LIVE_','PKMSVV_REGION05_LIVE_')

# Dedicated Azahar Johto smoke/gate tests use engine code, not Web simulation.
patch('src/platform/3ds/app.h',
 '  void start_pkm_region_demo();',
 '  void start_pkm_region_demo();\n  void start_pkm_johto_qa(int dex,bool immortal);')
patch('src/platform/3ds/app.cpp',
 'void App::start_pkm_region_demo() {',
 'void App::start_pkm_johto_qa(int dex,bool immortal) {\n'
 '  region_selected_ = 1;\n'
 '  set_autotest(dex,immortal);\n'
 '}\n\n'
 'void App::start_pkm_region_demo() {')
patch('src/platform/3ds/main.cpp',
 '  bool pk_region_gate_qa = false;',
 '  bool pk_johto_qa = false;\n  bool pk_region_gate_qa = false;')
patch('src/platform/3ds/main.cpp',
 '  else if (!std::strcmp(first, "regiongate")) a.pk_region_gate_qa = true;',
 '  else if (!std::strcmp(first, "regiongate")) a.pk_region_gate_qa = true;\n'
 '  else if (!std::strcmp(first, "johto")) { a.pk_johto_qa = true; a.seconds = 12; a.dex = 155; }\n'
 '  else if (!std::strcmp(first, "johtogate")) a.pk_region_gate_qa = a.pk_johto_qa = true;')
patch('src/platform/3ds/main.cpp',
 '    app.set_autotest(25, true);\n    g->time = 1801.0;',
 '    if (at.pk_johto_qa) app.start_pkm_johto_qa(155,true);\n'
 '    else app.set_autotest(25,true);\n'
 '    g->time = 1801.0;')
patch('src/platform/3ds/main.cpp',
 'g->spawner.boss_idx == 2 && final->dex == 150 && !g->pkmsvv_region_victory;',
 'g->spawner.boss_idx == 2 &&\n'
 '      final->dex == (at.pk_johto_qa ? 249 : 150) && !g->pkmsvv_region_victory;')
patch('src/platform/3ds/main.cpp',
 '  } else if (at.on) {\n    // (movimiento "mega": el bot recibe la megapiedra a los 5 s y megaevoluciona)',
 '  } else if (at.on && at.pk_johto_qa) {\n'
 '    app.auto_mode=0; app.auto_diff=0;\n'
 '    app.start_pkm_johto_qa(155,true);\n'
 '    at.next_log=10;\n'
 '  } else if (at.on) {\n'
 '    // (movimiento "mega": el bot recibe la megapiedra a los 5 s y megaevoluciona)')
print('PKMSVV_REGION05_JOHTO_NATIVE_PATCH_PASS')
