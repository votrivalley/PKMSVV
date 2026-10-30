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
def check(project,mon,variant):
    if project.get('format')!='pkmsvv-mega-stage3-draft' or project.get('version')!=1:
        raise ValueError('Not a PKMSVV Mega Stage3 project')
    approved=project.get('approved') or {}
    sheets=project.get('draft') or {}
    if not isinstance(approved,dict) or not isinstance(sheets,dict):raise ValueError('Invalid project data')
    sources=0;authored=0;invalid=[];missing=[];nonempty=0
    for action in ACTIONS:
        for direction in DIRECTIONS:
            for frame in range(4):
                k='|'.join((mon,variant,action,direction,str(frame)))
                if action=='Walk' and direction in CARDINAL:
                    sources+=1
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
    a=p.parse_args()
    result=check(json.loads(a.project.read_text(encoding='utf-8')),a.pokemon,a.variant)
    text=json.dumps(result,indent=2,ensure_ascii=False)
    if a.report:a.report.write_text(text,encoding='utf-8')
    else:print(text)
    return 0 if result['candidateComplete'] else 2
if __name__=='__main__':sys.exit(main())
