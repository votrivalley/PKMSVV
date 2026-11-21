#!/usr/bin/env python3
"""Native Alpha09.6 8-slot QA mode, applied after slice095_skill_qa.

skill8qa: Kanto Solo run with 200 kills and 20 ranks simulated in RunConfig,
adds eight distinct original skills using native player_add_move. No saves.
"""
from pathlib import Path
import sys
p=Path(sys.argv[1])/'src/platform/3ds/main.cpp'
s=p.read_text(encoding='utf8')
def patch(old,new,n=1):
    global s
    count=s.count(old)
    if count!=n: raise SystemExit(f"SKILL096_EIGHT_QA_ANCHOR_FAIL {count} expected {n}: {old[:80]!r}")
    s=s.replace(old,new)
patch('  bool pk_skill_qa = false; // "skillqa": real auto passive + manual/AUTO dash',
      '  bool pk_skill8_qa = false; // "skill8qa" eight independent learned moves\n'
      '  bool pk_skill_qa = false; // "skillqa": real auto passive + manual/AUTO dash')
patch('  else if (!std::strcmp(first, "skillqa")) {\n'
      '    a.pk_skill_qa = true; a.seconds = 45; a.dex = 25; a.immortal = true;\n'
      '  }',
      '  else if (!std::strcmp(first, "skillqa")) {\n'
      '    a.pk_skill_qa = true; a.seconds = 45; a.dex = 25; a.immortal = true;\n'
      '  }\n'
      '  else if (!std::strcmp(first, "skill8qa")) {\n'
      '    a.pk_skill8_qa = a.pk_skill_qa = true;\n'
      '    a.seconds = 30; a.dex = 25; a.immortal = true;\n'
      '  }')
patch('    if (at.pk_skill_qa) {\n'
      '      Player& p = g->me();\n'
      '      const char* ids[] = {"ember", "thunderbolt", "quick-attack"};',
      '    if (at.pk_skill_qa) {\n'
      '      Player& p = g->me();\n'
      '      if (at.pk_skill8_qa) {\n'
      '        g->cfg.pkmsvv_total_kills = 200;\n'
      '        g->cfg.pkmsvv_upgrade_total = 20;\n'
      '        p.max_moves = 8;\n'
      '      } else p.max_moves = 4;\n'
      '      const char* ids[] = {"ember", "thunderbolt", "quick-attack"};')
patch('      int auto_moves = 0, dash_moves = 0;',
      '      if (at.pk_skill8_qa) {\n'
      '        const char* extra[] = {"water-gun","ice-beam","shadow-ball",\n'
      '                               "confusion","tackle","vine-whip","gust"};\n'
      '        for (const char* name : extra) {\n'
      '          if (p.nslots >= 8) break;\n'
      '          const int id=move_index(name);\n'
      '          if (id >= 0 && !player_has_move(p,id)) player_add_move(*g,p,id);\n'
      '        }\n'
      '        const bool full = p.max_moves==8 && p.nslots==8 && p.nmoves==8;\n'
      '        if (at.log) std::fprintf(at.log,\n'
      '          "PKMSVV_SKILL096_EIGHT_SETUP_%s slots=%d moves=%d cap=%d\\n",\n'
      '          full?"PASS":"FAIL",p.nslots,p.nmoves,p.max_moves);\n'
      '      }\n'
      '      int auto_moves = 0, dash_moves = 0;')
patch('    if (at.pk_skill_qa) {\n'
      '      const Player& p = g->me();',
      '    if (at.pk_skill_qa) {\n'
      '      const Player& p = g->me();\n'
      '      if (at.pk_skill8_qa) {\n'
      '        const bool full=p.max_moves==8 && p.nslots==8 && p.nmoves==8 &&\n'
      '          p.pkmsvv_passive_casts >= 5 && p.pkmsvv_dash_auto_casts >= 1;\n'
      '        std::fprintf(at.log,\n'
      '          "PKMSVV_SKILL096_EIGHT_RUNTIME_%s slots=%d moves=%d cap=%d casts=%d\\n",\n'
      '          full?"PASS":"FAIL",p.nslots,p.nmoves,p.max_moves,p.pkmsvv_passive_casts);\n'
      '      }')
p.write_text(s,encoding='utf8')
print('PKMSVV_SKILL096_EIGHT_QA_PATCH_PASS mode=skill8qa 8 native moves + real cooldowns')
