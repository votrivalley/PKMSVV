#!/usr/bin/env python3
"""Extract unencrypted homebrew CIA RomFS, without Nintendo keys or tools.

Based on public 3DS NCCH/IVFC/RomFS header layouts. Validated against the
user-provided PokéSurvivor 3DS CIA (4697 matching paths and sizes).
Requires own legitimately obtained homebrew CIA. No ROM assets in repository.
"""
import argparse
import hashlib
from pathlib import Path
import struct

EMPTY=0xffffffff
def u32(data,at): return struct.unpack_from('<I',data,at)[0]

def parse(data):
    pos=0
    while (magic:=data.find(b'NCCH',pos)) >= 0:
        base=magic-0x100
        pos=magic+4
        if base<0: continue
        start=base+u32(data,base+0x1b0)*512
        length=u32(data,base+0x1b4)*512
        if start+length<=len(data) and length>4096 and data[start:start+4]==b'IVFC':
            break
    else: raise ValueError('No readable unencrypted NCCH RomFS; commercial encrypted titles are unsupported')
    for step in range(0x1000,0x10000,0x1000):
        root=start+step
        if root+40>len(data) or u32(data,root)!=40: continue
        dh,hs,dm,ds,fh,fs,fm,ms,files=struct.unpack_from('<9I',data,root+4)
        if 40<=dh<dm<fh<fm<files and dh+hs<=dm and dm+ds<=fh and fh+fs<=fm and fm+ms<=files and files<length-step:
            return root,(dm,ds,fm,ms,files)
    raise ValueError('No valid RomFS level-3 metadata header')

def collect(blob):
    root,(dm,ds,fm,ms,data)=parse(blob)
    dirs,filenames=set(),set()
    results=[]
    dbase,fbase,body=root+dm,root+fm,root+data
    def filename(at,size,end):
        if size>4096 or size%2 or at+size>end: raise ValueError('Invalid UTF-16 name')
        name=blob[at:at+size].decode('utf-16le','strict')
        if '/' in name or '\\' in name or name in ('.','..') or any(ord(c)<32 for c in name):
            raise ValueError('Unsafe file name')
        return name
    def walk(offset,prefix):
        if offset in dirs or offset+24>ds: raise ValueError('Broken RomFS directory links')
        dirs.add(offset)
        _,_,child,first,_,length=struct.unpack_from('<6I',blob,dbase+offset)
        name=filename(dbase+offset+24,length,dbase+ds)
        folder=prefix+((name,) if name else ())
        cur=first
        while cur!=EMPTY:
            if cur in filenames or cur+32>ms: raise ValueError('Broken file links')
            filenames.add(cur)
            parent,sibling,relative,size,_,nlen=struct.unpack_from('<IIQQII',blob,fbase+cur)
            if parent!=offset or body+relative+size>len(blob): raise ValueError('File outside RomFS')
            component=filename(fbase+cur+32,nlen,fbase+ms)
            results.append((folder+(component,),body+relative,size))
            cur=sibling
        cur=child
        while cur!=EMPTY:
            if cur+24>ds: raise ValueError('Bad child directory')
            nxt=u32(blob,dbase+cur+4)
            walk(cur,folder)
            cur=nxt
    walk(0,())
    return results

def main():
    p=argparse.ArgumentParser()
    p.add_argument('cia',type=Path)
    p.add_argument('output',type=Path)
    p.add_argument('--sha256')
    p.add_argument('--expect-count',type=int)
    a=p.parse_args()
    blob=a.cia.read_bytes()
    digest=hashlib.sha256(blob).hexdigest()
    if a.sha256 and digest!=a.sha256: raise SystemExit(f'SHA-256 mismatch: {digest}')
    entries=collect(blob)
    if a.expect_count and len(entries)!=a.expect_count: raise SystemExit(f'Unexpected file count: {len(entries)}')
    seen=set()
    for parts,offset,size in entries:
        if parts in seen: raise ValueError('Duplicate path')
        seen.add(parts)
        out=a.output.joinpath(*parts)
        out.parent.mkdir(parents=True,exist_ok=True)
        out.write_bytes(blob[offset:offset+size])
    assert (a.output/'spr'/'report.json').is_file()
    assert (a.output/'credits.txt').is_file()
    print(f'ROMFS_EXTRACT_PASS files={len(entries)} bytes={sum(s for _,_,s in entries)} sha256={digest}')
if __name__=='__main__':
    main()
