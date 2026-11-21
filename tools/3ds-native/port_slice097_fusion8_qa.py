#!/usr/bin/env python3
"""Alpha09.7 isolated Fusion-on-8-move engine QA, applied after slice096_skill8_qa.

Adds 'fusion8qa' to the native on-device autotest parser. Uses real
player_bond_options/player_fuse C++ paths on an 8-move Solo Explore run.
Validates 8 unique move references after 2 sequential fusions, then runs
combat to detect regressions. No production/save mutation.
This is NOT touchscreen/physical SD QA.
"""
from pathlib import Path
import sys

src = Path(sys.argv[1]) / 'src/platform/3ds/main.cpp'
s = src.read_text(encoding='utf-8')

def patch(old, new, expected=1):
    global s
    count = s.count(old)
    if count != expected:
        raise SystemExit(f'FUSION097_ANCHOR_FAIL expected={expected} saw={count} {old[:90]!r}')
    s = s.replace(old, new)

patch(
    '  bool pk_skill8_qa = false; // "skill8qa" eight independent learned moves',
    '  bool pk_fusion8_qa = false; // "fusion8qa" real bond/Fusion at eight moves\n'
    '  bool pk_fusion8_setup_ok = false;\n'
    '  bool pk_skill8_qa = false; // "skill8qa" eight independent learned moves'
)
patch(
    '  else if (!std::strcmp(first, "skill8qa")) {\n'
    '    a.pk_skill8_qa = a.pk_skill_qa = true;\n'
    '    a.seconds = 30; a.dex = 25; a.immortal = true;\n'
    '  }',
    '  else if (!std::strcmp(first, "skill8qa")) {\n'
    '    a.pk_skill8_qa = a.pk_skill_qa = true;\n'
    '    a.seconds = 30; a.dex = 25; a.immortal = true;\n'
    '  }\n'
    '  else if (!std::strcmp(first, "fusion8qa")) {\n'
    '    a.pk_fusion8_qa = a.pk_skill8_qa = a.pk_skill_qa = true;\n'
    '    a.seconds = 30; a.dex = 25; a.immortal = true;\n'
    '  }'
)
anchor = (
    '          full?"PASS":"FAIL",p.nslots,p.nmoves,p.max_moves);\n'
    '      }\n'
    '      int auto_moves = 0, dash_moves = 0;'
)
injected = r'''          full?"PASS":"FAIL",p.nslots,p.nmoves,p.max_moves);
        if (at.pk_fusion8_qa) {
          // Exercise real native Fusion twice, including slot shifting at the tail.
          auto valid = [&](int expected_slots, int expected_triplets) {
            if (p.nmoves != 8 || p.nslots != expected_slots ||
                p.active_slot < 0 || p.active_slot >= p.nslots) return false;
            bool seen[8] = {};
            int covered = 0, triples = 0;
            for (int si=0; si<p.nslots; ++si) {
              if (p.slot_n[si] < 1 || p.slot_n[si] > 4) return false;
              if (p.slot_n[si] == 3) ++triples;
              for (int j=0; j<p.slot_n[si]; ++j) {
                const int mi = p.slots[si][j];
                if (mi < 0 || mi >= 8 || seen[mi]) return false;
                seen[mi] = true; ++covered;
              }
            }
            return covered == 8 && triples == expected_triplets;
          };
          int8_t loose[8] = {};
          int nloose=0, grow=-1;
          const bool before = full && valid(8,0) &&
              player_bond_options(p,loose,nloose,grow)==2 && nloose==8;
          bool after_pair = false, after_triple = false;
          if (before) {
            int picks[2] = {int(loose[0]), int(loose[nloose-1])};
            p.bonds = 2;
            player_fuse(*g,p,picks,2,-1);
            after_pair = valid(7,0);
            nloose=0; grow=-1;
            if (after_pair && player_bond_options(p,loose,nloose,grow)==1 &&
                nloose==6 && grow>=0) {
              const int next = loose[nloose-1];
              player_fuse(*g,p,&next,1,grow);
              after_triple = valid(6,1);
            }
          }
          at.pk_fusion8_setup_ok = before && after_pair && after_triple;
          if (at.log) std::fprintf(at.log,
              "PKMSVV_FUSION097_SETUP_%s before=%d pair=%d triple=%d slots=%d moves=%d bonds=%d\n",
              at.pk_fusion8_setup_ok?"PASS":"FAIL",int(before),int(after_pair),
              int(after_triple),p.nslots,p.nmoves,p.bonds);
        }
      }
      int auto_moves = 0, dash_moves = 0;'''
patch(anchor, injected)
patch(
    '        const bool full=p.max_moves==8 && p.nslots==8 && p.nmoves==8 &&\n'
    '          p.pkmsvv_passive_casts >= 5 && p.pkmsvv_dash_auto_casts >= 1;',
    '        const bool full=p.max_moves==8 && p.nmoves==8 &&\n'
    '          (at.pk_fusion8_qa ? (p.nslots==6 && at.pk_fusion8_setup_ok) : p.nslots==8) &&\n'
    '          p.pkmsvv_passive_casts >= 5 && p.pkmsvv_dash_auto_casts >= 1;'
)
patch(
    '          full?"PASS":"FAIL",p.nslots,p.nmoves,p.max_moves,p.pkmsvv_passive_casts);\n'
    '      }',
    '          full?"PASS":"FAIL",p.nslots,p.nmoves,p.max_moves,p.pkmsvv_passive_casts);\n'
    '        if (at.pk_fusion8_qa) std::fprintf(at.log,\n'
    '          "PKMSVV_FUSION097_RUNTIME_%s slots=%d moves=%d casts=%d\\n",\n'
    '          full?"PASS":"FAIL",p.nslots,p.nmoves,p.pkmsvv_passive_casts);\n'
    '      }'
)
src.write_text(s, encoding='utf-8')
print('PKMSVV_FUSION097_PATCH_PASS: real Fusion 8->7->6 slots, no save change')
