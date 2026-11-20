#!/usr/bin/env python3
"""Validate exact PKMSVV native-engine CIA and 3DSX build artifacts.

This verifies binary structures, metadata and the full RomFS directory graph;
it is NOT a substitute for Azahar or real New 3DS execution.
"""
from pathlib import Path
import importlib.util
import hashlib
import json
import struct
import sys

here=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('extract_romfs',here/'extract_romfs.py')
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

folder=Path(sys.argv[1])
cia=folder/'pkmsvv-3ds-qa.cia'
three=folder/'pkmsvv-3ds-qa.3dsx'
b=cia.read_bytes()
h=three.read_bytes()
assert b[:4]==bytes.fromhex('20200000'), 'Unexpected CIA header size'
assert h[:4]==b'3DSX', 'Invalid 3DSX magic'
assert len(h)>10000000 and len(b)>10000000, 'Truncated 3DS binary'
assert b.count(b'NCCH')>=1, 'No NCCH content'
base=b.index(b'NCCH')-0x100
assert base>0, 'Invalid NCCH header'
prod=b[base+0x150:base+0x160].split(b'\0',1)[0]
tid=int.from_bytes(b[base+0x108:base+0x110],'little')
assert tid==0x000400000F5B1300, f'Wrong Title ID {tid:016x}'
assert prod==b'CTR-H-PCS3', f'Wrong Product Code {prod!r}'
assert b'CTR-H-PSV3' not in b[base:base+0x200], 'Upstream product code retained'
rom_off=struct.unpack_from('<I',b,base+0x1b0)[0]*512
rom_len=struct.unpack_from('<I',b,base+0x1b4)[0]*512
exe_off=struct.unpack_from('<I',b,base+0x1a0)[0]*512
exe_len=struct.unpack_from('<I',b,base+0x1a4)[0]*512
assert rom_off>exe_off and exe_len>1000000 and rom_len>40000000
assert b[base+rom_off:base+rom_off+4]==b'IVFC', 'Invalid RomFS signature'
entries=mod.collect(b)
paths={'/'.join(path):size for path,offset,size in entries}
assert len(entries)==4697, f'Unexpected RomFS count: {len(entries)}'
for path in ('credits.txt','credits_en.txt','spr/report.json','spr/1.fr','snd/sfx.bin','cacert.pem'):
    assert paths.get(path,0)>0, f'Missing asset: {path}'
assert sum(sz for _,_,sz in entries)==43939098, 'Unexpected total RomFS payload'
out=dict(title_id=f'{tid:016X}',product_code=prod.decode(),
         cia_size=len(b),three_dsx_size=len(h),romfs_files=len(entries),
         romfs_payload_bytes=sum(sz for _,_,sz in entries),
         sha256_cia=hashlib.sha256(b).hexdigest(),
         sha256_3dsx=hashlib.sha256(h).hexdigest(),
         verified='STATIC_ONLY; runtime boot not verified by this test')
print('PKMSVV_3DS_BINARY_STATIC_QA_PASS')
print(json.dumps(out,indent=2))
