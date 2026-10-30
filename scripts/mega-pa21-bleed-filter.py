#!/usr/bin/env python3
"""Private QA-only: remove tiny isolated tile-edge bleed without drawing new pixels."""
from PIL import Image
from collections import deque
from pathlib import Path
import argparse,hashlib,json

NAMES=('scizor','swampert','garchomp','dragonite')
VARIANTS=('normal','shiny')
DIRECTIONS=('front','left','right','back')

def normalize(image,species,variant):
    image=image.convert('RGBA')
    if image.size==(256,256):return image,False
    if species=='garchomp' and variant=='shiny' and image.size==(254,256):
        out=Image.new('RGBA',(256,256));out.paste(image,(0,0));return out,True
    raise ValueError('Unexpected sheet geometry: %s/%s %s'%(species,variant,image.size))

def components(tile):
    px=tile.load();seen=set();parts=[]
    for y in range(64):
        for x in range(64):
            if (x,y) in seen or px[x,y][3]==0:continue
            q=deque([(x,y)]);seen.add((x,y));points=[]
            while q:
                xx,yy=q.popleft();points.append((xx,yy))
                for j in range(max(0,yy-1),min(63,yy+1)+1):
                    for i in range(max(0,xx-1),min(63,xx+1)+1):
                        if (i,j) not in seen and px[i,j][3]:
                            seen.add((i,j));q.append((i,j))
            parts.append(points)
    return sorted(parts,key=len,reverse=True)

def clean(tile):
    groups=components(tile)
    main=len(groups[0]) if groups else 0
    result=tile.copy();px=result.load();removed=[]
    if main<=200:return result,removed
    for group in groups[1:]:
        left=min(x for x,y in group);right=max(x for x,y in group)
        top=min(y for x,y in group);bottom=max(y for x,y in group)
        near_edge=left<=2 or right>=61 or top<=2 or bottom>=61
        if near_edge and len(group)<=40 and len(group)<=.03*main:
            for x,y in group:px[x,y]=(0,0,0,0)
            removed.append({'area':len(group),'bbox':[left,top,right-left+1,bottom-top+1]})
    return result,removed

def run(source,target):
    source=Path(source);target=Path(target);(target/'assets').mkdir(exist_ok=True,parents=True)
    manifest={'qaOnly':True,'battleReady':False,'scale':1,'originalCell':64,
              'newCell':96,'permissionVerified':False,
              'notice':'This removes ONLY small disconnected edge fragments. It cannot recover missing source pixels.',
              'forms':{}}
    for species in NAMES:
        manifest['forms'][species]={}
        for variant in VARIANTS:
            name=species+'_'+variant+'.png'
            original=Image.open(source/name);sheet,geometry=normalize(original,species,variant)
            out=Image.new('RGBA',(384,384));frames=[]
            for row,direction in enumerate(DIRECTIONS):
                for col in range(4):
                    tile=sheet.crop((col*64,row*64,col*64+64,row*64+64))
                    fixed,removed=clean(tile)
                    out.paste(fixed,(col*96+16,row*96+16))
                    main=components(fixed)
                    still_touches=bool(main and any(x in (0,63) or y in (0,63) for x,y in main[0]))
                    frames.append({'direction':direction,'frame':col,'removed':removed,
                        'removedPixels':sum(g['area'] for g in removed),
                        'mainStillTouchesSourceEdge':still_touches,
                        'sourceHash':hashlib.sha256(tile.tobytes()).hexdigest(),
                        'outputHash':hashlib.sha256(fixed.tobytes()).hexdigest()})
            outname=species+'-'+variant+'.png';out.save(target/'assets'/outname)
            manifest['forms'][species][variant]={
                'source':name,'sourceDimensions':list(original.size),'geometryReview':geometry,
                'output':'assets/'+outname,
                'cleanedFrames':sum(bool(f['removed']) for f in frames),
                'remainingMainEdgeRisks':sum(f['mainStillTouchesSourceEdge'] for f in frames),
                'frames':frames}
    (target/'qa-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
    return manifest

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--output',required=True)
    a=p.parse_args();result=run(a.source,a.output)
    for name,versions in result['forms'].items():
        print(name,{v:spec['cleanedFrames'] for v,spec in versions.items()})
