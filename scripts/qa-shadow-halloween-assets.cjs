#!/usr/bin/env node
'use strict';
// Research QA only. This script intentionally NEVER imports sprites into gameplay.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const target=process.argv[2];
if(!target){console.error('Usage: node scripts/qa-shadow-halloween-assets.cjs <extracted/downloaded_shadow_halloween> [--output=report.json]');process.exit(2);}
let root=path.resolve(target);
if(fs.existsSync(path.join(root,'downloaded_shadow_halloween')))root=path.join(root,'downloaded_shadow_halloween');
function sha(buf){return crypto.createHash('sha256').update(buf).digest('hex');}
const expected={shadow:22,halloween_featured:6};
const seen=[],issues=[];const groups={};
for(const [category,expectedForms] of Object.entries(expected)){
 const folder=path.join(root,category);
 if(!fs.existsSync(folder)){issues.push('MISSING_CATEGORY: '+category);continue;}
 const keys=fs.readdirSync(folder,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort();
 if(keys.length!==expectedForms)issues.push('FORM_COUNT '+category+': '+keys.length+' != '+expectedForms);
 groups[category]={forms:keys.length,pngs:0};
 for(const key of keys){
  const p=path.join(folder,key);
  const images=fs.readdirSync(p).filter(x=>x.endsWith('.png')).sort();
  const animations=new Set(images.map(x=>path.basename(x,'.png')));
  for(const requirement of ['Idle','Walk','Attack','Charge','Hurt']){
   if(!animations.has(requirement))issues.push('MISSING_ANIMATION '+category+'/'+key+'/'+requirement);
  }
  if(category==='shadow'&&key==='10902'){
   // Downloaded sheets demonstrably disagree with the user's HAR metadata.
   issues.push('QUARANTINE shadow/10902: six metadata dimension mismatches; Faint 404');
  }
  for(const file of images){
   const buf=fs.readFileSync(path.join(p,file));
   if(buf.length<24||buf.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'){
    issues.push('NOT_PNG '+category+'/'+key+'/'+file);continue;
   }
   const width=buf.readUInt32BE(16),height=buf.readUInt32BE(20);
   if(!width||!height||width>65535||height>65535)issues.push('BAD_DIMENSIONS '+category+'/'+key+'/'+file);
   seen.push({path:[category,key,file].join('/'),width,height,bytes:buf.length,sha256:sha(buf)});
   groups[category].pngs++;
  }
 }
}
const report={source:'user-local research files — not licensed for public redistribution',root,
 generatedAt:new Date().toISOString(),pngs:seen.length,groups,
 expected:{shadow:146,halloween_featured:38,total:184},issues,files:seen};
const outArg=process.argv.find(x=>x.startsWith('--output='));
const printed=JSON.stringify(report,null,2);
if(outArg){const dest=path.resolve(outArg.slice('--output='.length));fs.writeFileSync(dest,printed+'\n');console.log('Wrote QA report to '+dest);}
console.log('Shadow/Halloween QA: '+seen.length+' PNGs; Shadow='+(groups.shadow?.pngs||0)+', Halloween='+(groups.halloween_featured?.pngs||0));
console.log('Checks: '+(issues.length?'REVIEW NEEDED: '+issues.join('; '):'no reported issues'));
console.log('No assets were copied to this repository or game build.');
if(seen.length!==184||issues.some(x=>x.startsWith('MISSING_')||x.startsWith('FORM_COUNT')||x.startsWith('NOT_PNG')))process.exitCode=1;
