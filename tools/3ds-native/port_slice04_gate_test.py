#!/usr/bin/env python3
"""Deterministic native Azahar acceptance test for the actual 15/30 boss sequence.

No 1800-second full-speed warp: that feeds max-density waves to a just-loaded
emulator and can hang before the very first logic frame. Instead start the
real native C++ Game and call spawner_update(dt=0) at time=1801. Then kill
tracked boss via enemy_die and verify subsequent spawns/victory, without 30
minutes of live particles. This only runs for explicit autotest 'regiongate'.
"""
from pathlib import Path
import sys

f=Path(sys.argv[1])/"src/platform/3ds/main.cpp"
s=f.read_text(encoding="utf-8")
def patch(old,new):
    global s
    n=s.count(old)
    if n!=1: raise SystemExit(f"REGION04_GATE_TEST_ANCHOR_FAILED {n}: {old[:100]!r}")
    s=s.replace(old,new)

patch('  bool rooms = false;         // "salas":',
      '  bool pk_region_gate_qa = false; // only when autotest.txt = regiongate\n'
      '  bool rooms = false;         // "salas":')
patch('  else if (!std::strcmp(first, "region")) a.pk_region_demo = true;',
      '  else if (!std::strcmp(first, "region")) a.pk_region_demo = true;\n'
      '  else if (!std::strcmp(first, "regiongate")) a.pk_region_gate_qa = true;')

source='  } else if (at.on) {\n    // (movimiento "mega": el bot recibe la megapiedra a los 5 s y megaevoluciona)'
new=r'''  } else if (at.on && at.pk_region_gate_qa) {
    // Isolated internal engine QA: no actual savedata or rewards modified.
    app.set_autotest(25, true);
    g->time = 1801.0;             // skip timer; do not spawn 30 min of waves
    spawner_update(*g, 0.0f);     // first, 15m boss only
    Enemy* first = g->enemy_by_id(g->pkmsvv_badge_boss_id);
    const bool before = g->spawner.boss_idx == 1 && first &&
      g->pkmsvv_badge_boss_id > 0 && g->pkmsvv_final_boss_id < 0 &&
      !g->pkmsvv_badge_claimed;
    if (at.log)
      std::fprintf(at.log, "PKMSVV_REGION04_GATE_BEFORE_%s idx=%d first=%d final=%d\n",
                   before ? "PASS" : "FAIL", g->spawner.boss_idx,
                   int(g->pkmsvv_badge_boss_id), int(g->pkmsvv_final_boss_id));
    if (first) enemy_die(*g, *first);      // real engine's kill handler
    const bool earned = g->pkmsvv_badge_claimed;
    spawner_update(*g, 0.0f);             // 30m boss allowed AFTER 15m kill
    Enemy* final = g->enemy_by_id(g->pkmsvv_final_boss_id);
    const bool after = before && earned && final &&
      g->spawner.boss_idx == 2 && final->dex == 150 && !g->pkmsvv_region_victory;
    if (at.log)
      std::fprintf(at.log, "PKMSVV_REGION04_GATE_AFTER_%s idx=%d badge=%d final=%d\n",
                   after ? "PASS" : "FAIL", g->spawner.boss_idx,
                   int(earned), int(g->pkmsvv_final_boss_id));
    if (final) enemy_die(*g, *final);
    const bool victory = after && g->pkmsvv_region_victory;
    if (at.log) {
      std::fprintf(at.log, "PKMSVV_REGION04_FINAL_DEFEAT_%s victory=%d\n",
                   victory ? "PASS" : "FAIL", int(g->pkmsvv_region_victory));
      std::fflush(at.log);
    }
    app.quit = true;
    at.on = false;
  } else if (at.on) {
    // (movimiento "mega": el bot recibe la megapiedra a los 5 s y megaevoluciona)'''
patch(source,new)
f.write_text(s,encoding='utf-8')
print("PKMSVV_REGION04_GATE_TEST_INSTRUMENTED: explicit 0dt 15m kill => 30m boss => final victory")
