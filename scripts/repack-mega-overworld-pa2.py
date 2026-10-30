#!/usr/bin/env python3
"""Lossless 4-dir Mega OW repacker for PRIVATE QA. NOT a battle sprite importer."""
from pathlib import Path
from PIL import Image
import argparse,hashlib,json

SPECIES=('scizor','swampert','garchomp','dragonite')
VARIANTS=('normal','shiny')
DIRECTIONS=('front','left','right','back')
SOURCE_CELL=64
DEST_CELL=96
PAD=16

def normalize_original(image,species,variant):
    image=image.convert('RGBA')
    if image.size==(256,256):return image,{'rightTransparentPad':0,'geometryReview':False}
    if (species,variant,image.size)==('garchomp','shiny',(254,256)):
        canvas=Image.new('RGBA',(256,256),(0,0,0,0));canvas.paste(image,(0,0))
        return canvas,{'rightTransparentPad':2,'geometryReview':True,
                       'note':'Last 2px are unknown, NOT recovered; confirm source frame alignment'}
    raise ValueError(f'Unexpected source PNG geometry: {species}/{variant}: {image.size}')

def analyze_frame(tile):
    alpha=list(tile.getchannel('A').getdata())
    bb=tile.getchannel('A').getbbox()
    edge={
      'left':sum(alpha[y*64+x]>0 for y in range(64) for x in (0,1)),
      'right':sum(alpha[y*64+x]>0 for y in range(64) for x in (62,63)),
      'top':sum(alpha[y*64+x]>0 for y in (0,1) for x in range(64)),
      'bottom':sum(alpha[y*64+x]>0 for y in (62,63) for x in range(64))
    }
    touched=[k for k,v in edge.items() if v>0]
    return {'bbox':list(bb) if bb else None,'touches':touched,'edgeCounts2px':edge,
            'needsReview':bool(touched) or not bb,
            'pixelSha256':hashlib.sha256(tile.tobytes()).hexdigest()}

def repack(image,species,variant):
    source,geometry=normalize_original(image,species,variant)
    output=Image.new('RGBA',(384,384),(0,0,0,0));frames=[]
    for row,direction in enumerate(DIRECTIONS):
        for col in range(4):
            tile=source.crop((col*64,row*64,(col+1)*64,(row+1)*64))
            data=analyze_frame(tile)
            output.paste(tile,(col*96+PAD,row*96+PAD))
            assert output.crop((col*96+PAD,row*96+PAD,col*96+PAD+64,row*96+PAD+64)).tobytes()==tile.tobytes()
            data.update({'direction':direction,'frame':col,'sourceRect':[col*64,row*64,64,64],
                         'outputRect':[col*96,row*96,96,96],'spriteOffset':[PAD,PAD],
                         'padding':{'left':PAD,'right':PAD,'top':PAD,'bottom':PAD}})
            frames.append(data)
    return output,frames,geometry

def pack_folder(source,output):
    source=Path(source);output=Path(output);(output/'assets').mkdir(parents=True,exist_ok=True)
    audit={'format':'PKMSVV Mega PA2 QA','qaOnly':True,'sourceCellSize':64,'outputCellSize':96,
           'sourceArtUnmodified':True,'battleReady':False,'redistributionPermissionVerified':False,
           'recoveredMissingPixels':False,
           'warning':'Adding transparent padding CANNOT restore pixels cropped from source sheet',
           'missing':['4 diagonal directions','Idle standalone','Attack','Shoot','Charge','Hurt','Faint'],
           'forms':{}}
    for species in SPECIES:
        audit['forms'][species]={}
        for variant in VARIANTS:
            src=source/f'{species}_{variant}.png'
            if not src.exists():raise FileNotFoundError(src)
            im=Image.open(src)
            out,frames,geometry=repack(im,species,variant)
            file=f'{species}-{variant}-pa2.png'
            out.save(output/'assets'/file,optimize=True)
            audit['forms'][species][variant]={
              'sourceFile':src.name,'sourceDimensions':list(im.size),
              'outputFile':'assets/'+file,'outputDimensions':[384,384],
              'frameCount':16,'frames':frames,'geometry':geometry,
              'sourceEdgeRiskCount':sum(f['needsReview'] for f in frames),
              'sha256':hashlib.sha256(src.read_bytes()).hexdigest()
            }
    (output/'qa-manifest.json').write_text(json.dumps(audit,indent=2,ensure_ascii=False),encoding='utf-8')
    return audit

if __name__=='__main__':
    cli=argparse.ArgumentParser()
    cli.add_argument('--source',required=True,type=Path)
    cli.add_argument('--output',required=True,type=Path)
    args=cli.parse_args()
    manifest=pack_folder(args.source,args.output)
    print({s:{v:manifest['forms'][s][v]['sourceEdgeRiskCount'] for v in VARIANTS} for s in SPECIES})
