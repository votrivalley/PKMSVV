#!/usr/bin/env python3
"""Azahar skillqa: two independent passive casts plus manual/AUTO dash.

Only activates when sdmc autotest.txt contains skillqa; never writes saves
or changes any production camera/clock behavior. Applied after skill parity.
"""
from pathlib import Path
import sys
root=Path(sys.argv[1])
p=root/'src/platform/3ds/main.cpp'
s=p.read_text(encoding='utf-8')
def patch(old,new,n=1):
    global s
    count=s.count(old)
    if count!=n:
        raise SystemExit(f"SKILL095_QA_ANCHOR_FAILED {count}/{n}: {old[:110]!r}")
    s=s.replace(old,new)
patch('  bool pk_speed_qa = false; // "speedqa": 18 game seconds at real 1.5x',
      '  bool pk_skill_qa = false; // "skillqa": real auto passive + manual/AUTO dash\n'
      '  bool pk_skill_setup_ok = false, pk_skill_manual_sent = false, pk_skill_auto_on = false;\n'
      '  bool pk_speed_qa = false; // "speedqa": 18 game seconds at real 1.5x')
patch('  else if (!std::strcmp(first, "speedqa")) {\n'
      '    a.pk_speed_qa = true; a.seconds = 18; a.dex = 25; a.immortal = true;\n'
      '  }',
      '  else if (!std::strcmp(first, "speedqa")) {\n'
      '    a.pk_speed_qa = true; a.seconds = 18; a.dex = 25; a.immortal = true;\n'
      '  }\n'
      '  else if (!std::strcmp(first, "skillqa")) {\n'
      '    a.pk_skill_qa = true; a.seconds = 45; a.dex = 25; a.immortal = true;\n'
      '  }')
patch('    if (at.pk_speed_qa) app.pkmsvv_enable_speed_qa();',
      '    if (at.pk_speed_qa) app.pkmsvv_enable_speed_qa();\n'
      '    if (at.pk_skill_qa) {\n'
      '      Player& p = g->me();\n'
      '      const char* ids[] = {"ember", "thunderbolt", "quick-attack"};\n'
      '      for (const char* name : ids) {\n'
      '        const int mi = move_index(name);\n'
      '        if (mi >= 0 && !player_has_move(p, mi)) player_add_move(*g, p, mi);\n'
      '      }\n'
      '      int auto_moves = 0, dash_moves = 0;\n'
      '      for (int i = 0; i < p.nmoves; ++i) {\n'
      '        if (p.moves[i].kind() == K_DASH) ++dash_moves;\n'
      '        else ++auto_moves;\n'
      '      }\n'
      '      at.pk_skill_setup_ok = g->cfg.kanto_only && auto_moves >= 2 && dash_moves >= 1;\n'
      '      if (at.log) std::fprintf(at.log, "PKMSVV_SKILL095_SETUP_%s moves=%d passive=%d dash=%d\\n",\n'
      '        at.pk_skill_setup_ok ? "PASS" : "FAIL", p.nmoves, auto_moves, dash_moves);\n'
      '    }')
patch('    app.update(in, float(std::fmin(frame_ms, 100.0) / 1000.0));',
      '    app.update(in, float(std::fmin(frame_ms, 100.0) / 1000.0));\n'
      '    if (at.pk_skill_qa && g->cfg.kanto_only && g->state == ST_PLAYING) {\n'
      '      Player& p = g->me();\n'
      '      if (!at.pk_skill_manual_sent && g->time > 2.0) {\n'
      '        p.pkmsvv_dash_requested = true; at.pk_skill_manual_sent = true;\n'
      '      }\n'
      '      if (!at.pk_skill_auto_on && g->time > 7.0) {\n'
      '        p.pkmsvv_dash_auto = true; at.pk_skill_auto_on = true;\n'
      '      }\n'
      '    }')
patch('    std::fclose(at.log);\n  }\n  saver3ds::shutdown();',
      '    if (at.pk_skill_qa) {\n'
      '      const Player& p = g->me();\n'
      '      float dash_cooldown = -1.0f;\n'
      '      for (int k = 0; k < p.nmoves; ++k) if (p.moves[k].kind() == K_DASH)\n'
      '        dash_cooldown = p.moves[k].t;\n'
      '      const bool ok = at.pk_skill_setup_ok && at.pk_skill_manual_sent &&\n'
      '        at.pk_skill_auto_on && p.pkmsvv_passive_casts >= 2 &&\n'
      '        p.pkmsvv_dash_manual_casts >= 1 && p.pkmsvv_dash_auto_casts >= 1;\n'
      '      std::fprintf(at.log, "PKMSVV_SKILL095_RUNTIME_%s moves=%d passive_casts=%d manual_dash=%d auto_dash=%d dash_cd=%.2f\\n",\n'
      '        ok ? "PASS" : "FAIL",p.nmoves,p.pkmsvv_passive_casts,\n'
      '        p.pkmsvv_dash_manual_casts,p.pkmsvv_dash_auto_casts,dash_cooldown);\n'
      '    }\n'
      '    std::fclose(at.log);\n'
      '  }\n'
      '  saver3ds::shutdown();')
p.write_text(s,encoding="utf-8")
print("PKMSVV_SKILL095_QA_PATCH_PASS: real 45s two passive moves, manual dash, AUTO dash")
