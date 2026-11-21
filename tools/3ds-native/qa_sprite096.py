#!/usr/bin/env python3
"""Read actual 3DS RomFS Pokemon .fr descriptors; never pretend sprites exist.

One .fr contains the seven PMD animations, each frame's directional rows,
and one or more .t3x pages. Verifies binary bounds and counts distinct normal
and shiny sprites. Not an import/conversion of Web or updated Pokemon images.
"""
from pathlib import Path
import argparse
import json
import re
import struct

ANIMS=["Idle","Walk","Attack","Shoot","Charge","Hurt","Faint"]
BOSSES={"Kanto":150,"Johto":249,"Hoenn":385,"Sinnoh":488,"Unova":646,"Kalos":718}
GENS=[("Kanto",1,151),("Johto",152,251),("Hoenn",252,386),
      ("Sinnoh",387,493),("Unova",494,649),("Kalos",650,721)]

def inspect_fr(fr):
    blob=fr.read_bytes()
    if len(blob)<8 or blob[:4]!=b"PSF1":
        raise ValueError(f"Bad PSF1 magic: {fr.name}")
    pages=blob[4]
    images=struct.unpack_from("<H",blob,6)[0]
    if pages<1 or images<1: raise ValueError(f"No images/pages {fr.name}")
    pos=8+pages*4+images*10
    if pos>len(blob): raise ValueError(f"Bad descriptors {fr.name}")
    anims={}
    for name in ANIMS:
        if pos+2>len(blob): raise ValueError(f"Bad {name} {fr.name}")
        n,rows=struct.unpack_from("<BB",blob,pos)
        pos+=2
        if pos+8*n*rows>len(blob): raise ValueError(f"Truncated {name} {fr.name}")
        per_row=[]
        for row in range(rows):
            yes=False
            for i in range(n):
                frame=struct.unpack_from("<H",blob,pos+(row*n+i)*8)[0]
                yes|=(frame!=0xffff and frame<images)
            per_row.append(yes)
        anims[name]={"frames":n,"rows":rows,"live_rows":sum(per_row)}
        pos+=n*rows*8
    if pos!=len(blob): raise ValueError(f"Extra trailing bytes {fr.name}: {len(blob)-pos}")
    for page in range(pages):
        if not (fr.parent/(fr.stem+f"_{page}.t3x")).is_file():
            raise ValueError(f"Missing t3x page: {fr.stem}_{page}.t3x")
    return {"pages":pages,"images":images,"anims":anims}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("spr",type=Path)
    ap.add_argument("--out",type=Path,required=True)
    args=ap.parse_args()
    if not args.spr.is_dir(): raise SystemExit("SPRITE096_NO_ROMFS_SPR")
    base={"normal":{},"shiny":{}}
    errors=[]
    for fr in sorted(args.spr.glob("*.fr")):
        match=re.fullmatch(r"(\d+)(s?)",fr.stem)
        if not match: continue
        try: obj=inspect_fr(fr)
        except Exception as e: errors.append(str(e)); continue
        base["shiny" if match.group(2) else "normal"][int(match.group(1))]=obj
    roster={}
    for name,start,end in GENS:
        ids=range(start,end+1)
        normal=[x for x in ids if x in base["normal"]]
        shiny=[x for x in ids if x in base["shiny"]]
        all8=[x for x in normal if
          all(base["normal"][x]["anims"][a]["live_rows"]>=8 for a in ("Idle","Walk"))]
        roster[name]={"expected":end-start+1,"normal":len(normal),
                      "shiny":len(shiny),"idle_walk_8_directions":len(all8),
                      "normal_missing":[x for x in ids if x not in base["normal"]]}
    boss_sprites={name:{"dex":dex,"normal":dex in base["normal"],
         "shiny":dex in base["shiny"],
         "idle_rows":base["normal"].get(dex,{}).get("anims",{}).get("Idle",{}).get("live_rows",0)}
         for name,dex in BOSSES.items()}
    report={
      "source":"official PokéSurvivor3DS v1.0.0 unencrypted homebrew CIA RomFS",
      "verified_against_pkmsvv_web_sprite_bytes":False,
      "note":"Current Web branch does not include its full Pokemon sprite sheets; no new Web Pokemon images have been imported.",
      "raw_counts":{"normal":len(base["normal"]),"shiny":len(base["shiny"])},
      "regions":roster,"regional_bosses":boss_sprites,"descriptor_errors":errors[:40],
      "errors_total":len(errors)
    }
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf8")
    if not base["normal"] or errors: raise SystemExit(f"SPRITE096_INTEGRITY_FAIL normal={len(base['normal'])} errors={len(errors)}")
    print("PKMSVV_SPRITE096_ROMFS_AUDIT_PASS "+
          f"normal={len(base['normal'])} shiny={len(base['shiny'])} "+
          " ".join(f"{g}:{v['normal']}/{v['expected']}" for g,v in roster.items()))
    missing=[name for name,v in boss_sprites.items() if not v["normal"]]
    if missing: print("PKMSVV_SPRITE096_MISSING_BOSSES "+",".join(missing))
    else: print("PKMSVV_SPRITE096_SIX_BOSSES_HAVE_SOURCE_SPRITES")
    print("PKMSVV_SPRITE096_WEB_BINARY_PARITY_NOT_VERIFIED")
if __name__=="__main__": main()
