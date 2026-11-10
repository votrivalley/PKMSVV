#!/usr/bin/env python3
"""Generate an unmistakable NRO menu icon for each render diagnostic."""
from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFont

MODES={
    'MIN': ((12,90,103),(91,238,216),'MIN','01'),
    'STATIC': ((111,66,9),(255,222,123),'STATIC','02'),
    'FULL': ((89,26,71),(255,161,205),'FULL','03'),
}

def main():
    if len(sys.argv)!=2 or sys.argv[1] not in MODES:
        raise SystemExit('usage: make_icon.py MIN|STATIC|FULL')
    mode=sys.argv[1]
    bg,accent,title,num=MODES[mode]
    im=Image.new('RGB',(256,256),bg)
    d=ImageDraw.Draw(im)
    d.rounded_rectangle((17,17,239,239),radius=27,outline=accent,width=7)
    d.rounded_rectangle((35,39,221,85),radius=12,fill=accent)
    d.rectangle((45,108,211,114),fill=accent)
    bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
    def font(size):
        try:return ImageFont.truetype(bold,size)
        except OSError:return ImageFont.load_default()
    d.text((128,61),'PKMSVV',anchor='mm',font=font(24),fill=bg)
    size=62 if mode!='STATIC' else 37
    d.text((128,154),title,anchor='mm',font=font(size),fill=(255,255,255))
    d.text((128,215),'DIAG '+num,anchor='mm',font=font(19),fill=accent)
    path=Path(__file__).with_name('icon.jpg')
    im.save(path,format='JPEG',quality=92,subsampling=0)
    print(f'Wrote {path} for {mode} ({path.stat().st_size} bytes)')

if __name__=='__main__':main()
