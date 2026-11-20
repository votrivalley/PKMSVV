#!/usr/bin/env python3
"""Isolate the *upstream engine QA build*, not a finished PKMSVV port.

This only changes the QA title/product ID, save directory, and server URLs.
Every source edit is exact-match guarded; fail rather than ship a title that
overwrites the official PokéSurvivor install or contacts its update service.
"""
import sys
from pathlib import Path

root=Path(sys.argv[1])
def patch(path, old, new, required=1):
    file=root/path
    source=file.read_text(encoding='utf-8')
    actual=source.count(old)
    if actual!=required:
        raise SystemExit(f'BRANDING_FAIL {path}: expected {required} instances of {old!r}, saw {actual}')
    file.write_text(source.replace(old,new),encoding='utf-8')

patch('Makefile','TARGET\t\t:=\tpokesurvivor-3ds','TARGET\t\t:=\tpkmsvv-3ds-qa')
patch('Makefile','APP_TITLE\t:=\tPokéSurvivor 3DS','APP_TITLE\t:=\tPKMSVV 3DS QA')
patch('Makefile','APP_AUTHOR\t:=\tjuanluismm520','APP_AUTHOR\t:=\tVotri Valley')
patch('Makefile','APP_DESCRIPTION\t:=\tBullet-heaven con Pokémon (proyecto de fans)',
      'APP_DESCRIPTION\t:=\tC++ engine test - NOT full PKMSVV')
patch('src/core/version.h','kGameTitle = "PokéSurvivor 3DS"','kGameTitle = "PKMSVV 3DS QA"')
patch('src/platform/3ds/main.cpp','sdmc:/3ds/pokesurvivor-3ds','sdmc:/3ds/pkmsvv-3ds-qa')
# No shared account/sync and no self-updating from the upstream service.
patch('src/platform/3ds/datos3ds.cpp','https://pokesurvivor3ds.duckdns.org/datos/',
      'https://127.0.0.1/pkmsvv-qa-offline/')
patch('src/platform/3ds/cloud3ds.cpp','https://pokesurvivor3ds.duckdns.org',
      'https://127.0.0.1')
patch('src/platform/3ds/main.cpp','if (!at.boot) app.cloud_autostart();',
      '/* PKMSVV native QA: never auto-sync another game account. */')
patch('src/platform/3ds/main.cpp','    prog3ds::start_check(true);',
      '    /* PKMSVV native QA: never auto-update the upstream application. */',1)
patch('tools/cia/app.rsf','Title                   : PokeSurvivor3DS',
      'Title                   : PKMSVV3DSQA')
patch('tools/cia/app.rsf','ProductCode             : CTR-H-PSV3',
      'ProductCode             : CTR-H-PCS3')
patch('tools/cia/app.rsf','UniqueId                : 0xF5A3D',
      'UniqueId                : 0xF5B13')
patch('tools/cia/gen_banner.py',"title = 'PokéSurvivor 3DS'","title = 'PKMSVV 3DS QA'")
patch('tools/cia/gen_banner.py',"'port de juanluismm520'","'Engine QA: Votri Valley'")
patch('tools/make_cia.sh','pokesurvivor-3ds','pkmsvv-3ds-qa',5)
patch('tools/make_cia.sh','-s "PokéSurvivor 3DS"','-s "PKMSVV 3DS QA"')
patch('tools/make_cia.sh','-p "juanluismm520"','-p "Votri Valley"')
print('PKMSVV_3DS_QA_ISOLATION_PASS titleID=000400000F5B1300 save=sdmc:/3ds/pkmsvv-3ds-qa cloud=disabled')
