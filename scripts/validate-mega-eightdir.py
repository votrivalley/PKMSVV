#!/usr/bin/env python3
"""Strict Mega 8-direction draft auditor. Reads offline studio JSON; never unlocks gameplay."""
import argparse,base64,io,json,sys
from pathlib import Path
from PIL import Image
ACTIONS=('Idle','Walk','Attack','Shoot','Charge','Hurt','Faint')
DIRECTIONS=('front','front-left','left','back-left','back','back-right','right','front-right')
CARDINAL=('front','left','back','right')
SPECIES=('scizor','swampert','garchomp','dragonite')
VARIANTS=('normal','shiny')
def check(project,mon,variant,source_sheet=None):
    if project.get('format')!='pkmsvv-mega-stage3-draft' or project.get('version')!=1:
        raise ValueError('Not a PKMSVV Mega Stage3 project')
    approved=project.get('approved') or {}
    sheets=project.get('draft') or {}
    if not isinstance(approved,dict) or not isinstance(sheets,dict):raise ValueError('Invalid project data')
    # An editor project alone must not pretend source Walk frames exist.
    # The original 384x384 PA2.1 sheet is supplied via --source-sheet,
    # or embedded by the repository's source-upload Studio.
    sourcedata=source_sheet or (project.get('sources') or {}).get(mon+'-'+variant)
    source_ok=False
    if sourcedata:
        try:
            if isinstance(sourcedata,Path):src=Image.open(sourcedata).convert('RGBA')
            elif isinstance(sourcedata,str) and sourcedata.startswith('data:image/png;base64,'):
                src=Image.open(io.BytesIO(base64.b64decode(sourcedata.split(',',1)[1],validate=True))).convert('RGBA')
            else:src=None
            if src and src.size==(384,384):
                source_ok=all(src.crop((col*96,row*96,col*96+96,row*96+96)).getchannel('A').getbbox()
                              for row in range(4) for col in range(4))
        except Exception:source_ok=False
    sources=0;authored=0;invalid=[];missing=[];nonempty=0
    for action in ACTIONS:
        for direction in DIRECTIONS:
            for frame in range(4):
                k='|'.join((mon,variant,action,direction,str(frame)))
                if action=='Walk' and direction in CARDINAL:
                    if source_ok:sources+=1
                    else:missing.append(k+': source PA2.1 sheet not supplied/invalid')
                    continue
                data=sheets.get(k)
                if not approved.get(k):
                    missing.append(k)
                    continue
                if not isinstance(data,str) or not data.startswith('data:image/png;base64,'):
                    invalid.append(k+': missing approved PNG');continue
                try:
                    img=Image.open(io.BytesIO(base64.b64decode(data.split(',',1)[1],validate=True))).convert('RGBA')
                    if img.size!=(96,96) or not img.getchannel('A').getbbox():
                        invalid.append(k+': empty/wrong dimensions')
                    else:
                        nonempty+=1;authored+=1
                except Exception:
                    invalid.append(k+': corrupt PNG')
    return {'pokemon':mon,'variant':variant,'originalWalkFrames':sources,
            'authoredAndApproved':authored,'requiredManual':len(ACTIONS)*len(DIRECTIONS)*4-sources,
            'missing':missing,'invalid':invalid,'candidateComplete':not missing and not invalid,
            'battleReady':False,'licenseApproved':False,
            'warning':'Human art review + source license + engine action metadata still required.'}
def main():
    p=argparse.ArgumentParser()
    p.add_argument('project',type=Path,help='QA-Mega-8dir-project.json from offline Studio')
    p.add_argument('--pokemon',choices=SPECIES,default='scizor')
    p.add_argument('--variant',choices=VARIANTS,default='normal')
    p.add_argument('--report',type=Path)
    p.add_argument('--source-sheet',type=Path,help='Original PA2.1 384x384 PNG (required for older offline Studio JSON)')
    a=p.parse_args()
    result=check(json.loads(a.project.read_text(encoding='utf-8')),a.pokemon,a.variant,a.source_sheet)
    text=json.dumps(result,indent=2,ensure_ascii=False)
    if a.report:a.report.write_text(text,encoding='utf-8')
    else:print(text)
    return 0 if result['candidateComplete'] else 2
if __name__=='__main__':sys.exit(main())
