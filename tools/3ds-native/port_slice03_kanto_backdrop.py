#!/usr/bin/env python3
"""PKMSVV 3DS Alpha03: Region selector background must also be Kanto.

On the first Azahar screenshot the native top-screen backdrop still used the
upstream mixed-generation roaming character list. These are menu decoration,
not actual enemies, but falsely suggest Kanto contains other generations.
Fix Kanto Region selection background without touching ordinary game menus.
"""
from pathlib import Path
import sys

root=Path(sys.argv[1])
def patch(path,old,new,expected=1):
    p=root/path; s=p.read_text(encoding='utf-8')
    n=s.count(old)
    if n!=expected: raise SystemExit(f'REGION_BACKDROP_ANCHOR_FAILED {path}: {n} vs {expected}: {old[:90]!r}')
    p.write_text(s.replace(old,new),encoding='utf-8')

patch('src/platform/3ds/app.cpp',
      '  scene = sc;\n  cur_ = cur2_ = scroll_ = 0;',
      '  scene = sc;\n  cur_ = cur2_ = scroll_ = 0;\n'
      '  if (sc == SC_PKM_REGION) {\n'
      '    // Kanto is the only playable native region in this alpha.\n'
      '    bbiome_ = 0; bbiome_t_ = 0;\n'
      '    backdrop_init();\n'
      '  }')
patch('src/platform/3ds/app.cpp',
      '  menu_hw_ = hw3ds::on();',
      '  menu_hw_ = scene == SC_PKM_REGION ? false : hw3ds::on();')
patch('src/platform/3ds/app.cpp',
      '    d.dex = menu_hw_ ? CAST_HW[i] : CAST[i];',
      '    // Background walkers must also be from Gen 1, NOT the original\n'
      '    // all-generation PokéSurvivor mixed menu roster.\n'
      '    static const int16_t PKM_KANTO_WALKERS[20] = {\n'
      '      10,16,19,25,35,43,52,54,58,63,\n'
      '      66,69,74,77,81,92,111,113,129,133\n'
      '    };\n'
      '    d.dex = scene == SC_PKM_REGION ? PKM_KANTO_WALKERS[i]\n'
      '             : menu_hw_ ? CAST_HW[i] : CAST[i];')
patch('src/platform/3ds/app.cpp',
      '  if (bbiome_t_ > 30) { bbiome_t_ = 0; bbiome_ = (bbiome_ + 1) % 3; w.set_biome(menu_hw_ ? kBiomeHw + bbiome_ : bbiome_); }',
      '  if (bbiome_t_ > 30 && scene != SC_PKM_REGION) {\n'
      '    bbiome_t_ = 0; bbiome_ = (bbiome_ + 1) % 3;\n'
      '    w.set_biome(menu_hw_ ? kBiomeHw + bbiome_ : bbiome_);\n'
      '  }')
print('PKMSVV_3DS_REGION03_KANTO_BACKDROP_PASS 20/20 menu walkers Gen1')
