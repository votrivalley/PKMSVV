#!/usr/bin/env python3
"""PKMSVV 3DS Alpha09.6: Web-based 3->8 skill awakening + 103 move CDs.

Run after Alpha09.5. Only Solo Explore sees the expanded move capacity,
Web's kill/upgrade milestones, and documented 103-move skill balancing.
Co-op retains the original cap and combat; no native Save format change.
Skill sprites (existing move icons) remain real sprites on a compact 8-slot HUD.
"""
from pathlib import Path
import re
import sys

root=Path(sys.argv[1])
repo=Path(__file__).resolve().parents[2]

def patch(path, old, new, expected=1):
    p=root/path
    src=p.read_text(encoding="utf8")
    n=src.count(old)
    if n!=expected:
        raise SystemExit(f"SKILL096_ANCHOR_FAIL {path}: expected={expected} saw={n} old={old[:125]!r}")
    p.write_text(src.replace(old,new),encoding="utf8")

# Verify this chart is exactly the Web 103 original-move cooldown table.
text=(repo/"docs/SKILL_BALANCE.md").read_text(encoding="utf8")
ms=re.findall(r"^\|\s*([a-z0-9-]+)\s*\|[^\n]*?\*\*(\d+(?:\.\d+)?)s\*\*",text,re.M)
names=[x for x,_ in ms]
if len(ms)!=103 or len(set(names))!=103:
    raise SystemExit(f"SKILL096_WEB_COOLDOWN_DOC_DRIFT count={len(ms)} distinct={len(set(names))}")
# Cross-check 5 staged unlocks against Web script; refuses silent drift.
track=(repo/"src/pkmsvv-skill-track.js").read_text(encoding="utf8")
for marker in ["value:50","value:100","value:200","value:10","value:20","count:3+milestones"]:
    if marker not in track:
        raise SystemExit("SKILL096_WEB_AWAKENING_DRIFT "+marker)
cd_lines="\n".join(f'  {{"{name}", {sec}f}},' for name,sec in ms)

# Existing MoveInst[] capacity is already 8; expand only the array of
# slots and each corresponding indexed scratch buffer, including Fusion UI.
patch("src/core/game.h",
 '  int8_t slots[4][4];       // huecos: índices en moves (se lanzan a la vez)\n'
 '  int8_t slot_n[4] = {};\n'
 '  int nslots = 0;',
 '  int8_t slots[8][4];       // PKMSVV: up to 8 learned groups (Co-op max 4)\n'
 '  int8_t slot_n[8] = {};\n'
 '  int nslots = 0;')
patch("src/core/game.h",
 '  bool kanto_only = false;',
 '  int32_t pkmsvv_total_kills = 0;   // snapshot of native Save stats\n'
 '  uint16_t pkmsvv_upgrade_total = 0; // count of native upgrade ranks\n'
 '  bool kanto_only = false;')
patch("src/core/player.cpp",
 '  for (int s = 0; s < 4; ++s) for (int j = 0; j < 4; ++j) p.slots[s][j] = -1;',
 '  for (int s = 0; s < 8; ++s) for (int j = 0; j < 4; ++j) p.slots[s][j] = -1;')
patch("src/core/player.cpp",
 '  p = Player();\n  p.active = true;',
 '  p = Player();\n'
 '  if (cfg.kanto_only) {\n'
 '    const int k=cfg.pkmsvv_total_kills;\n'
 '    const int u=cfg.pkmsvv_upgrade_total;\n'
 '    p.max_moves=3+int(k>=50)+int(k>=100)+int(k>=200)+int(u>=10)+int(u>=20);\n'
 '  }\n'
 '  p.active = true;')
patch("src/core/player.cpp",
 '  int out[4] = {-1, -1, -1, -1};   // hueco nuevo → hueco viejo',
 '  int out[8] = {-1, -1, -1, -1, -1, -1, -1, -1}; // 8 groups')
patch("src/core/player.cpp",
 '  int order[4], no = 0;',
 '  int order[8], no = 0;')
patch("src/core/player.cpp",
 '  int8_t ns[4][4], nn[4];',
 '  int8_t ns[8][4], nn[8];')
# C++ code references loose[4] in exactly five places; it would otherwise
# overwrite memory when eight skills are unlocked.
patch("src/platform/3ds/app.cpp","int8_t loose[4]; int nl, grow;",
      "int8_t loose[8]; int nl, grow;",2)
patch("src/platform/3ds/render.cpp","int8_t loose[4]; int nl, grow;",
      "int8_t loose[8]; int nl, grow;")
patch("src/core/game.cpp","int8_t loose[4];",
      "int8_t loose[8];",2)

# Web move-level cooldowns: only documented original 103 moves are retuned.
# Never adjust the hundreds of unrelated newer source-defined moves.
helper=r'''
struct PKMSVVWebCD { const char* id; float cd; };
static const PKMSVVWebCD pkmsvv_web_cd[] = {
''' + cd_lines + r'''
};
static void pkmsvv_apply_web_cd(MoveInst& m) {
  if (m.def < 0 || m.def >= kMoveCount) return;
  const char* name = kMoves[m.def].id;
  for (const auto& cd : pkmsvv_web_cd) {
    if (std::strcmp(cd.id,name)==0) {
      m.v[MS_CD] = cd.cd;
      m.has |= (uint64_t(1) << MS_CD);
      return;
    }
  }
}
'''
patch("src/core/player.cpp",
 '#include <cstdio>\n',
 '#include <cstdio>\n#include <cstring>\n')
patch("src/core/player.cpp",
 'namespace ps {\n\n// (herramienta',
 'namespace ps {\n'+helper+'\n// (herramienta')
patch("src/core/player.cpp",
 '  p.moves[mi] = move_instance(def, 1);\n'
 '  const int s = p.nslots++;',
 '  p.moves[mi] = move_instance(def, 1);\n'
 '  if (g.cfg.kanto_only && g.nplayers==1) pkmsvv_apply_web_cd(p.moves[mi]);\n'
 '  const int s = p.nslots++;')

# Permanent count uses existing native SaveStats + native Pokémon upgrades:
# +1 at kills 50/100/200, +1 at total 10/20 ranks (Web milestones).
# Web JSON saves are different and intentionally NOT imported.
patch("src/platform/3ds/app.cpp",
 '  g_->start_run(cfg, autotest && !auto_real ? nullptr : s_);',
 '  if (cfg.kanto_only && !autotest) {\n'
 '    cfg.pkmsvv_total_kills=std::max(int32_t(0),s_->stats.total_kills);\n'
 '    unsigned ranks=0;\n'
 '    for (int d=1;d<=kMaxDex;++d)\n'
 '      for (int k=0;k<UP_COUNT;++k) ranks+=s_->pupg[d][k];\n'
 '    cfg.pkmsvv_upgrade_total=uint16_t(std::min(65535u,ranks));\n'
 '  }\n'
 '  g_->start_run(cfg, autotest && !auto_real ? nullptr : s_);')
patch("src/core/combat.cpp",
 'void combat_tick(Game& g, Player& p, float dt) {\n'
 '  if (p.dead || p.rest_t > 0) return;',
 'void combat_tick(Game& g, Player& p, float dt) {\n'
 '  if (g.cfg.kanto_only && g.nplayers == 1) {\n'
 '    const int k = g.cfg.pkmsvv_total_kills + p.kills;\n'
 '    const int u = g.cfg.pkmsvv_upgrade_total;\n'
 '    p.max_moves = 3+int(k>=50)+int(k>=100)+int(k>=200)+int(u>=10)+int(u>=20);\n'
 '  }\n'
 '  if (p.dead || p.rest_t > 0) return;')

# Eight skill icon sprites in a single 3DS 320px row. Adaptive 27px
# cells avoid overlap with the four outer Orb slots (x 14..40 / 280..306).
# 1..4 uses original large icons; 5..8 uses compact HUD.
patch("src/platform/3ds/render.cpp",
 '    const float S = kSlotS, GAP = kSlotGap;\n'
 '    const int n = std::max(1, p.nslots);',
 '    const bool compact = g.cfg.kanto_only && g.nplayers==1 && p.nslots>4;\n'
 '    const float S = compact ? 27.0f : kSlotS;\n'
 '    const float GAP = compact ? 3.0f : kSlotGap;\n'
 '    const int n = std::max(1, p.nslots);')
patch("src/platform/3ds/render.cpp",
 '        const float sz = p.slot_n[i] > 1 ? 1.0f : 1.75f;\n'
 '        const float ix = p.slot_n[i] > 1 ? x + 5 + (j % 2) * 18 : x + 8, iy = p.slot_n[i] > 1 ? y + 3 + (j / 2) * 15 : y + 3;',
 '        const float sz = compact ? (p.slot_n[i]>1 ? 0.58f : 1.08f)\n'
 '                                 : (p.slot_n[i]>1 ? 1.0f : 1.75f);\n'
 '        const float ix = compact ? (p.slot_n[i]>1 ? x+2+(j%2)*11 : x+5)\n'
 '                                 : (p.slot_n[i]>1 ? x+5+(j%2)*18 : x+8);\n'
 '        const float iy = compact ? (p.slot_n[i]>1 ? y+2+(j/2)*10 : y+2)\n'
 '                                 : (p.slot_n[i]>1 ? y+3+(j/2)*15 : y+3);')
patch("src/platform/3ds/render.cpp",
 '          if (cd > 0) C2D_DrawRectSolid(ix, iy, 0, 16 * sz, 16 * sz * cd, C2D_Color32(0, 0, 0, 120));',
 '          if (cd > 0) C2D_DrawRectSolid(ix, iy, 0, 16 * sz, 16 * sz * cd, C2D_Color32(0, 0, 0, 120));')
patch("src/platform/3ds/render.cpp",
 '      text(b, x + S / 2, y + S - 12, 0.3f, rgb(m0.evolved ? 0xffd23f : 0xeaf2ff), 1);',
 '      text(b, x + S / 2, y + S - (compact ? 10 : 12), compact ? 0.25f : 0.3f,\n'
 '           rgb(m0.evolved ? 0xffd23f : 0xeaf2ff), 1);')
# Touch selects exactly the same icon rectangle as the draw geometry.
patch("src/platform/3ds/app.cpp",
 '      const float S = Renderer::kSlotS, GAP = Renderer::kSlotGap, x0 = (320 - (me.nslots * S + (me.nslots - 1) * GAP)) / 2;',
 '      const bool compact = g.cfg.kanto_only && g.nplayers==1 && me.nslots>4;\n'
 '      const float S = compact ? 27.0f : Renderer::kSlotS;\n'
 '      const float GAP = compact ? 3.0f : Renderer::kSlotGap;\n'
 '      const float x0 = (320 - (me.nslots * S + (me.nslots - 1) * GAP)) / 2;')

print(f"PKMSVV_SKILL096_PATCH_PASS moves=3..8 webCooldowns={len(ms)} HUD=compact+native-icons saves=unchanged")
