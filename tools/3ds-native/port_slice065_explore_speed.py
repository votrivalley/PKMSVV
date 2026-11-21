#!/usr/bin/env python3
"""PKMSVV 3DS native Alpha 06.5: real ×1.5 Solo Explore test toggle.

Applied after slices 01..06, only to the isolated PKMSVV 3DS C++ engine.
Speed is extra fixed simulation steps, NOT fake clock acceleration, and is
disabled for Co-op, original side modes, paused/choice screens and all menus.
No permanent settings/save format modifications.
"""
from pathlib import Path
import sys
root=Path(sys.argv[1])
def patch(path,old,new,count=1):
    p=root/path
    s=p.read_text(encoding='utf-8')
    n=s.count(old)
    if n!=count:
        raise SystemExit(f'PKMSVV_SPEED_ANCHOR_FAILED {path}: {n} matches, expected={count}, anchor={old[:140]!r}')
    p.write_text(s.replace(old,new),encoding='utf-8')

# Single source of truth for gate; render, touch and simulation use the same
# condition. A single-player LEGACY stock mode must never gain speed.
patch('src/platform/3ds/app.h',
 '  void start_mode_demo(bool medal);',
 '  void start_mode_demo(bool medal);\n'
 '  // QA only: enable the same real fixed-step speed switch used by touch UI.\n'
 '  void pkmsvv_enable_speed_qa() { pkmsvv_speed_1p5_ = true; }')
patch('src/platform/3ds/app.h',
 '  float t_ = 0;\n  int cur_ = 0, cur2_ = 0, scroll_ = 0;',
 '  float t_ = 0;\n'
 '  bool pkmsvv_speed_1p5_ = false;\n'
 '  bool pkmsvv_explore_speed_allowed() const {\n'
 '    return g_ && !coop_ && g_->cfg.kanto_only && g_->nplayers == 1 &&\n'
 '           g_->cfg.mode == MODE_NORMAL && !g_->cfg.weekly;\n'
 '  }\n'
 '  int cur_ = 0, cur2_ = 0, scroll_ = 0;')

# Reset per run and when returning to main menu (not persisted on SD).
patch('src/platform/3ds/app.cpp',
 'void App::start_run() {\n  over_synced_ = false;',
 'void App::start_run() {\n'
 '  pkmsvv_speed_1p5_ = false;\n'
 '  over_synced_ = false;')
patch('src/platform/3ds/app.cpp',
 '  if (sc == SC_MENU) {\n    region_selected_ = -1;',
 '  if (sc == SC_MENU) {\n'
 '    pkmsvv_speed_1p5_ = false;\n'
 '    region_selected_ = -1;')

# Toggle on a compact 3DS touchscreen pill at the minimap top-right.
# Coordinates x=250..312, y=58..82 avoid skill and orb slots (y=172+).
# Consume touch before the minimap legend handler, but leave game inputs intact.
patch('src/platform/3ds/app.cpp',
 'void App::in_run(const UiIn& in) {\n  Game& g = *g_;',
 'void App::in_run(const UiIn& in0) {\n'
 '  UiIn in = in0;\n'
 '  Game& g = *g_;\n'
 '  if (!autotest && g.state == ST_PLAYING && pkmsvv_explore_speed_allowed() &&\n'
 '      in_rect(&in, 250, 58, 62, 24)) {\n'
 '    pkmsvv_speed_1p5_ = !pkmsvv_speed_1p5_;\n'
 '    audio::play("hover");\n'
 '    in.tap = false;\n'
 '    in.down &= ~KEY_TOUCH; // touching speed must not toggle map legend\n'
 '  }')

# Draw over the regular minimap, only for an active eligible solo Explore run.
# The ordinary 3DS HUD remains identical everywhere else.
patch('src/platform/3ds/app.cpp',
 '  if (scene == SC_RUN) { r_->draw_bottom(*g_, autotest); return; }',
 '  if (scene == SC_RUN) {\n'
 '    r_->draw_bottom(*g_, autotest);\n'
 '    if (g_->state == ST_PLAYING && pkmsvv_explore_speed_allowed()) {\n'
 '      const u32 edge = pkmsvv_speed_1p5_\n'
 '        ? C2D_Color32(99, 226, 148, 255) : C2D_Color32(97, 116, 152, 245);\n'
 '      C2D_DrawRectSolid(249, 57, 0, 64, 26, edge);\n'
 '      C2D_DrawRectSolid(251, 59, 0, 60, 22, C2D_Color32(16, 27, 43, 235));\n'
 '      r_->text(pkmsvv_speed_1p5_ ? "x1.5" : "x1", 281, 62, 0.53f,\n'
 '        pkmsvv_speed_1p5_ ? C2D_Color32(132, 255, 168, 255)\n'
 '                           : C2D_Color32(234, 243, 255, 255), 1);\n'
 '    }\n'
 '    return;\n'
 '  }')

# The native game itself uses fixed 60 Hz steps (g_->step advances all
# enemies, combat, cooldowns, boss timeline and player at once).
# Add 0.5 * frame delta to the solo local accumulator before its normal
# fixed-step loop, not to Game::time and not to the Co-op lockstep clock.
# No extra simulation work while paused, choosing cards, or already over.
patch('src/platform/3ds/app_coop.cpp',
 'void App::advance(double& acc, float dt) {\n  if (!coop_) {\n    int steps = 0;',
 'void App::advance(double& acc, float dt) {\n'
 '  if (!coop_) {\n'
 '    if (pkmsvv_explore_speed_allowed() && pkmsvv_speed_1p5_ &&\n'
 '        g_->state == ST_PLAYING) {\n'
 '      acc += double(dt) * 500.0; // 0.5 extra sec of fixed steps per wall sec\n'
 '    }\n'
 '    int steps = 0;')

# Azahar real-time QA: launch a real native Kanto run with the touch toggle on.
# This tests that the game advances faster in real wall time; no timewarp.
patch('src/platform/3ds/main.cpp',
 '  bool pk_hoenn_qa = false;',
 '  bool pk_speed_qa = false; // "speedqa": 18 game seconds at real 1.5x\n'
 '  bool pk_hoenn_qa = false;')
patch('src/platform/3ds/main.cpp',
 '  else if (!std::strcmp(first, "hoenngate")) a.pk_region_gate_qa = a.pk_hoenn_qa = true;',
 '  else if (!std::strcmp(first, "hoenngate")) a.pk_region_gate_qa = a.pk_hoenn_qa = true;\n'
 '  else if (!std::strcmp(first, "speedqa")) {\n'
 '    a.pk_speed_qa = true; a.seconds = 18; a.dex = 25; a.immortal = true;\n'
 '  }')
patch('src/platform/3ds/main.cpp',
 '    app.set_autotest(at.dex, at.immortal, at.warp, at.move[0] && !mega ? move_index(at.move) : -1);',
 '    app.set_autotest(at.dex, at.immortal, at.warp, at.move[0] && !mega ? move_index(at.move) : -1);\n'
 '    if (at.pk_speed_qa) app.pkmsvv_enable_speed_qa();')
patch('src/platform/3ds/main.cpp',
 '  const double boot_s = last / 1000.0;',
 '  const double boot_s = last / 1000.0;\n'
 '  const u64 pkmsvv_speed_started_ms = last;')
patch('src/platform/3ds/main.cpp',
 '    std::fclose(at.log);\n  }\n  saver3ds::shutdown();',
 '    if (at.pk_speed_qa) {\n'
 '      const double wall = std::fmax(0.001, double(osGetTime() - pkmsvv_speed_started_ms) / 1000.0);\n'
 '      const double ratio = double(g->time) / wall;\n'
 '      const bool good = g->cfg.kanto_only && g->nplayers == 1 &&\n'
 '        g->time >= 17.9 && ratio >= 1.22 && ratio <= 1.90;\n'
 '      std::fprintf(at.log, "PKMSVV_SPEED_REALTIME_%s game=%.2f wall=%.2f ratio=%.3f\\n",\n'
 '                   good ? "PASS" : "FAIL", double(g->time), wall, ratio);\n'
 '    }\n'
 '    std::fclose(at.log);\n'
 '  }\n'
 '  saver3ds::shutdown();')

print('PKMSVV_3DS_SPEED_1P5_PATCH_PASS: touch 250,58 + solo-only fixed-step multiplier + real-time Azahar test')
