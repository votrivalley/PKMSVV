#!/usr/bin/env python3
"""Instrument ACTUAL native run state for PKMSVV Kanto QA.

The earlier 47/47 test covered only candidate cast pools. This new probe
examines live Enemy objects and rescue state after real Azahar gameplay, checks
the scheduled Kanto boss definitions and fails QA when off-gen leaks appear.
"""
import sys
from pathlib import Path
file=Path(sys.argv[1])/"src/platform/3ds/main.cpp"
s=file.read_text(encoding="utf-8")
anchor='    std::fprintf(at.log, "cargas de sprites durante la partida:'
assert s.count(anchor)==1, f"QA_INSTRUMENT_ANCHOR_FAILED {s.count(anchor)}"
injection=(
'    if (g->cfg.kanto_only) {\n'
'      int live = 0, foreign = 0;\n'
'      for (const Enemy& e : g->enemies) {\n'
'        if (e.dead) continue;\n'
'        ++live;\n'
'        const Mon* m = mon_by_dex(e.dex);\n'
'        if (!m || m->gen != 1 || m->reg != 0) ++foreign;\n'
'      }\n'
'      if (g->lost.on) {\n'
'        const Mon* m = mon_by_dex(g->lost.dex);\n'
'        if (!m || m->gen != 1 || m->reg != 0) ++foreign;\n'
'      }\n'
'      const bool bosses = g->nbosses == 2 &&\n'
'        g->bosses[0].dex == 149 && g->bosses[0].at == 900 &&\n'
'        g->bosses[1].dex == 150 && g->bosses[1].at == 1800;\n'
'      std::fprintf(at.log, "PKMSVV_KANTO_BOSS_CFG_%s first=%d@%d second=%d@%d\\n",\n'
'                   bosses ? "PASS" : "FAIL", int(g->bosses[0].dex), int(g->bosses[0].at),\n'
'                   int(g->bosses[1].dex), int(g->bosses[1].at));\n'
'      std::fprintf(at.log, "PKMSVV_KANTO_LIVE_%s living=%d foreign=%d\\n",\n'
'                   foreign == 0 && live > 0 ? "PASS" : "FAIL", live, foreign);\n'
'      std::fflush(at.log);\n'
'    }\n'
)
file.write_text(s.replace(anchor,injection+anchor),encoding="utf-8")
print("PKMSVV_KANTO02_RUNTIME_TELEMETRY_APPLIED")
