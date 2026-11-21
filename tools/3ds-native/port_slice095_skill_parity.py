#!/usr/bin/env python3
"""PKMSVV native 3DS skill parity stage 1, applied after Alpha09.

PKMSVV Explore Solo: every learned non-active move ticks/casts independently,
not only the selected 3DS skill slot. Active dash skills are manual by default
(X or touchscreen; hold for 2s toggles AUTO), with own cooldown + 650ms shared
lockout and actual native collision/damage. The original source modes, Co-op
network inputs and engine's combat rules are unchanged.
"""
from pathlib import Path
import sys

root=Path(sys.argv[1])
def patch(path,old,new,n=1):
    p=root/path
    src=p.read_text(encoding="utf-8")
    count=src.count(old)
    if count!=n:
        raise SystemExit(f"SKILL095_ANCHOR_FAILED {path}: {count} expected {n}: {old[:130]!r}")
    p.write_text(src.replace(old,new),encoding="utf-8")

# Keep skill AUTO state on a real player, not in save data nor as a network
# command. The state is reset naturally at Player() creation on each new run.
patch('src/core/game.h',
 '  int max_moves = 4;\n  int bonds = 0;',
 '  int max_moves = 4;\n'
 '  bool pkmsvv_dash_auto = false;\n'
 '  bool pkmsvv_dash_requested = false;\n'
 '  float pkmsvv_dash_lock = 0;\n'
 '  int pkmsvv_dash_cursor = 0;\n'
 '  int pkmsvv_passive_casts = 0;\n'
 '  int pkmsvv_dash_manual_casts = 0;\n'
 '  int pkmsvv_dash_auto_casts = 0;\n'
 '  int bonds = 0;')

# Manual native dash MUST be allowed as an evasive action even when the cursor
# has no enemy. Auto K_DASH still requires a target in its own move range.
patch('src/core/combat.cpp',
 '  if (needs_target(m.kind()) && !(p.has_target && dist(p.x, p.y, p.target_x, p.target_y) <= reach(m))) {',
 '  const bool manual_dash = g.cfg.kanto_only && g.nplayers == 1 &&\n'
 '    p.pkmsvv_dash_requested && m.kind() == K_DASH;\n'
 '  if (needs_target(m.kind()) && !manual_dash &&\n'
 '      !(p.has_target && dist(p.x, p.y, p.target_x, p.target_y) <= reach(m))) {')
patch('src/core/combat.cpp',
 'void combat_tick(Game& g, Player& p, float dt) {\n'
 '  if (p.dead || p.rest_t > 0) return;   // (dormido con Descanso no se ataca)\n'
 '  // Vínculos: todos los movimientos del hueco activo, cada uno con su recarga.\n'
 '  const int s = p.active_slot;\n'
 '  for (int j = 0; j < p.slot_n[s]; ++j) tick_move(g, p, p.slots[s][j], dt);\n'
 '}',
 'void combat_tick(Game& g, Player& p, float dt) {\n'
 '  if (p.dead || p.rest_t > 0) return;   // sleeping players never attack\n'
 '  if (!g.cfg.kanto_only || g.nplayers != 1) {\n'
 '    // Upstream/Co-op lockstep: preserve native slot-only combat exactly.\n'
 '    const int s = p.active_slot;\n'
 '    for (int j = 0; j < p.slot_n[s]; ++j) tick_move(g, p, p.slots[s][j], dt);\n'
 '    return;\n'
 '  }\n'
 '  // PKMSVV: each learned move has its OWN cooldown; no slot switches needed.\n'
 '  // Bound by the source engine\\x27s eight MoveInst entries (no extra proc loops).\n'
 '  for (int i = 0; i < p.nmoves && i < 8; ++i) {\n'
 '    MoveInst& m = p.moves[i];\n'
 '    if (m.def < 0) continue;\n'
 '    if (m.kind() == K_DASH) { m.t = std::fmax(0.0f, m.t - dt); continue; }\n'
 '    const float before = m.cast_at;\n'
 '    tick_move(g, p, i, dt);\n'
 '    if (m.cast_at > before) ++p.pkmsvv_passive_casts;\n'
 '  }\n'
 '  p.pkmsvv_dash_lock = std::fmax(0.0f, p.pkmsvv_dash_lock - dt);\n'
 '  const bool manual = p.pkmsvv_dash_requested;\n'
 '  const bool auto_cast = !manual && p.pkmsvv_dash_auto;\n'
 '  if (p.pkmsvv_dash_lock <= 0 && (manual || auto_cast)) {\n'
 '    // Rotate among ready active moves, not always the same Quick Attack.\n'
 '    for (int d = 0; d < p.nmoves && d < 8; ++d) {\n'
 '      const int i = (p.pkmsvv_dash_cursor + d) % p.nmoves;\n'
 '      MoveInst& m = p.moves[i];\n'
 '      if (m.def < 0 || m.kind() != K_DASH || m.t > 0) continue;\n'
 '      const float before = m.cast_at;\n'
 '      const float old_aim = p.aim;\n'
 '      if (manual && p.walking) p.aim = p.move_angle;\n'
 '      tick_move(g, p, i, 0);\n'
 '      p.aim = old_aim;\n'
 '      if (m.cast_at > before) {\n'
 '        if (manual) ++p.pkmsvv_dash_manual_casts;\n'
 '        else ++p.pkmsvv_dash_auto_casts;\n'
 '        p.pkmsvv_dash_cursor = (i + 1) % p.nmoves;\n'
 '        p.pkmsvv_dash_lock = 0.65f;\n'
 '      }\n'
 '      break; // max one dash per simulation step\n'
 '    }\n'
 '  }\n'
 '  p.pkmsvv_dash_requested = false;\n'
 '}')

# Switching a visual skill slot in PKMSVV no longer erases orbiting effects,
# prematurely shortens cooldown, or disables other learned skills.
patch('src/core/player.cpp',
 'void player_set_active(Game& g, Player& p, int i) {\n'
 '  if (i < 0 || i >= p.nslots || i == p.active_slot) return;',
 'void player_set_active(Game& g, Player& p, int i) {\n'
 '  if (i < 0 || i >= p.nslots || i == p.active_slot) return;\n'
 '  if (g.cfg.kanto_only && g.nplayers == 1) {\n'
 '    p.active_slot = i; // visual focus only; every learned move keeps casting\n'
 '    g.sfx(SFX_SELECT);\n'
 '    return;\n'
 '  }')

# Physical/touch hold times are measured by OS wall clock (2 real seconds even
# when x1.5 is enabled). Dedicated control does not steal Y Mega or A/B Orbs.
patch('src/platform/3ds/app.h',
 '  bool pkmsvv_speed_1p5_ = false;',
 '  bool pkmsvv_speed_1p5_ = false;\n'
 '  u64 pkmsvv_skill_x_at_ = 0, pkmsvv_skill_touch_at_ = 0;\n'
 '  bool pkmsvv_skill_x_toggled_ = false, pkmsvv_skill_touch_toggled_ = false;\n'
 '  bool pkmsvv_skill_touch_cancel_ = false;\n'
 '  int pkmsvv_skill_touch_x_ = 0, pkmsvv_skill_touch_y_ = 0;')
patch('src/platform/3ds/app.cpp',
 'void App::start_run() {\n  pkmsvv_speed_1p5_ = false;',
 'void App::start_run() {\n'
 '  pkmsvv_skill_x_at_ = pkmsvv_skill_touch_at_ = 0;\n'
 '  pkmsvv_skill_x_toggled_ = pkmsvv_skill_touch_toggled_ = false;\n'
 '  pkmsvv_skill_touch_cancel_ = false;\n'
 '  pkmsvv_speed_1p5_ = false;')
patch('src/platform/3ds/app.cpp',
 '  if (sc == SC_MENU) {\n    pkmsvv_speed_1p5_ = false;',
 '  if (sc == SC_MENU) {\n'
 '    pkmsvv_skill_x_at_ = pkmsvv_skill_touch_at_ = 0;\n'
 '    pkmsvv_skill_x_toggled_ = pkmsvv_skill_touch_toggled_ = false;\n'
 '    pkmsvv_skill_touch_cancel_ = false;\n'
 '    pkmsvv_speed_1p5_ = false;')

# The isolated Run only. X is the active move, hold 2 s toggles AUTO.
# Touch button is 214..314, y128..160 and consumes the map-legend tap.
controls=r'''
  if (!autotest && g.state == ST_PLAYING && pkmsvv_explore_speed_allowed()) {
    Player& sp = g.me();
    const u64 now = osGetTime();
    auto toggle_auto = [&]() {
      sp.pkmsvv_dash_auto = !sp.pkmsvv_dash_auto;
      g.say(sp.pkmsvv_dash_auto ? "AUTO chiêu chủ động: BẬT" :
                                      "AUTO chiêu chủ động: TẮT", 2.5f);
      audio::play("hover");
    };
    if (in.down & KEY_X) { pkmsvv_skill_x_at_ = now; pkmsvv_skill_x_toggled_ = false; }
    if (pkmsvv_skill_x_at_ && (in.held & KEY_X) &&
        now - pkmsvv_skill_x_at_ >= 2000 && !pkmsvv_skill_x_toggled_) {
      pkmsvv_skill_x_toggled_ = true; toggle_auto();
    }
    if (pkmsvv_skill_x_at_ && !(in.held & KEY_X)) {
      if (!pkmsvv_skill_x_toggled_) sp.pkmsvv_dash_requested = true;
      pkmsvv_skill_x_at_ = 0; pkmsvv_skill_x_toggled_ = false;
    }
    const bool in_skill = in.tx >= 214 && in.tx < 314 && in.ty >= 128 && in.ty < 160;
    if (in.tap && in_skill) {
      pkmsvv_skill_touch_at_ = now;
      pkmsvv_skill_touch_x_ = in.tx; pkmsvv_skill_touch_y_ = in.ty;
      pkmsvv_skill_touch_toggled_ = false;
      pkmsvv_skill_touch_cancel_ = false;
      in.tap = false; in.down &= ~KEY_TOUCH;
    }
    if (pkmsvv_skill_touch_at_ && (in.held & KEY_TOUCH)) {
      const int dx = in.tx - pkmsvv_skill_touch_x_;
      const int dy = in.ty - pkmsvv_skill_touch_y_;
      if (dx * dx + dy * dy > 18 * 18) pkmsvv_skill_touch_cancel_ = true;
      if (!pkmsvv_skill_touch_cancel_ && !pkmsvv_skill_touch_toggled_ &&
          now - pkmsvv_skill_touch_at_ >= 2000) {
        pkmsvv_skill_touch_toggled_ = true; toggle_auto();
      }
      in.tap = false;
    }
    if (pkmsvv_skill_touch_at_ && !(in.held & KEY_TOUCH)) {
      if (!pkmsvv_skill_touch_cancel_ && !pkmsvv_skill_touch_toggled_)
        sp.pkmsvv_dash_requested = true;
      pkmsvv_skill_touch_at_ = 0;
      pkmsvv_skill_touch_toggled_ = pkmsvv_skill_touch_cancel_ = false;
    }
  } else {
    pkmsvv_skill_x_at_ = pkmsvv_skill_touch_at_ = 0;
    pkmsvv_skill_x_toggled_ = pkmsvv_skill_touch_toggled_ = false;
    pkmsvv_skill_touch_cancel_ = false;
  }
'''
patch('src/platform/3ds/app.cpp',
 '  const Player& me = g.me();\n  Input gi;',
 '  const Player& me = g.me();\n'+controls+'  Input gi;')
# X is no longer slot-cycle during native PKMSVV Explore; L/R still preview.
patch('src/platform/3ds/app.cpp',
 '      if (in.down & (KEY_R | KEY_X | KEY_ZR)) gi.cycle = 1;',
 '      if (in.down & (KEY_R | KEY_ZR | (pkmsvv_explore_speed_allowed() ? 0 : KEY_X))) gi.cycle = 1;')

# Overlay uses the same rectangle as input (no full-screen illustration).
# No button is shown until a native dash-class move is learned.
overlay=r'''
    if (!autotest && g_->state == ST_PLAYING && pkmsvv_explore_speed_allowed()) {
      const Player& sp = g_->me();
      bool has_active = false;
      for (int i = 0; i < sp.nmoves && i < 8; ++i)
        if (sp.moves[i].def >= 0 && sp.moves[i].kind() == K_DASH) { has_active = true; break; }
      if (has_active) {
        const bool enabled = sp.pkmsvv_dash_auto;
        const u32 edge = enabled ? C2D_Color32(80, 214, 144, 255)
                                 : C2D_Color32(130, 166, 235, 255);
        C2D_DrawRectSolid(213, 127, 0, 102, 34, edge);
        C2D_DrawRectSolid(215, 129, 0, 98, 30, C2D_Color32(14, 24, 42, 250));
        r_->text(enabled ? "AUTO CHIÊU" : "X: CHIÊU", 264, 133, 0.39f,
                 enabled ? C2D_Color32(144, 255, 182, 255) :
                           C2D_Color32(238, 245, 255, 255), 1);
        r_->text("GIỮ 2s: AUTO", 264, 147, 0.28f,
                 C2D_Color32(165, 185, 214, 255), 1);
      }
    }
'''
patch('src/platform/3ds/app.cpp',
 '    return;\n  }\n  C2D_TextBufClear(r_->tbuf);',
 overlay+'    return;\n  }\n  C2D_TextBufClear(r_->tbuf);')

print("PKMSVV_SKILL095_PATCH_PASS: learned autos concurrent + X/touch 2s active AUTO + upstream modes protected")
