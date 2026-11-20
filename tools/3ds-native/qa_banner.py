#!/usr/bin/env python3
"""Offline QA artwork (no web source, Pokémon sprites, or font downloads).

Replaces upstream banner generation because its original gen_banner.py
imports private reference/web-gran data absent from the public repository.
"""
from pathlib import Path
import math
import sys
import struct
import wave

from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[2]
OUT=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'build'/'cia'
OUT.mkdir(parents=True,exist_ok=True)

fontfile=ROOT/'assets-src'/'fonts'/'PixelifyPS-700.ttf'
def font(size):
    return ImageFont.truetype(str(fontfile),size) if fontfile.exists() else ImageFont.load_default()
NAVY=(19,26,55)
CYAN=(81,216,236)
GOLD=(252,212,115)

icon=Image.new('RGBA',(48,48),NAVY+(255,))
d=ImageDraw.Draw(icon)
d.rounded_rectangle((3,3,44,44),radius=11,outline=CYAN,width=3)
d.ellipse((11,10,37,36),outline=GOLD,width=3)
d.line((11,23,37,23),fill=GOLD,width=3)
d.ellipse((20,19,28,27),fill=NAVY+(255,),outline=CYAN,width=2)
icon.save(ROOT/'assets-src'/'icon-48.png')

banner=Image.new('RGB',(256,128),NAVY)
d=ImageDraw.Draw(banner)
for y in range(128):
    b=round(55+35*y/127)
    d.line((0,y,255,y),fill=(17,26,b))
d.rounded_rectangle((6,6,249,121),radius=12,outline=CYAN,width=2)
d.text((15,24),'PKMSVV',font=font(31),fill=GOLD)
d.text((15,62),'CHON REGION',font=font(20),fill=CYAN)
d.text((15,94),'ALPHA 03 - THUC TINH',font=font(12),fill=(232,240,255))
banner.save(OUT/'banner.png')

samples=[]
rate=22050
for hz,duration in ((523.25,.12),(659.25,.12),(783.99,.35)):
    n=int(rate*duration)
    for i in range(n):
        envelope=min(1.0,i/200)*math.exp(-3.0*i/n)
        samples.append(int(7800*envelope*math.sin(2*math.pi*hz*i/rate)))
with wave.open(str(OUT/'banner.wav'),'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(rate)
    f.writeframes(b''.join(struct.pack('<h',s) for s in samples))
print('PKMSVV_QA_BRANDING_ASSETS_PASS')
