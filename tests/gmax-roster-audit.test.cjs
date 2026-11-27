'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {ROSTER,ACTIONS,isForm,findForms,checkSheet,auditSpecies,summarize}=require('../scripts/audit-gmax-roster.cjs');
const node=(name,subgroups={})=>({name,subgroups});
function png(w,h){const b=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(b);b.write('IHDR',12);b.writeUInt32BE(w,16);b.writeUInt32BE(h,20);return b;}
test('32 unique base species and precise G-Max labels',()=>{
 assert.equal(ROSTER.length,32);assert.equal(new Set(ROSTER.map(x=>x[0])).size,32);
 for(const s of ['Gigantamax','G-Max','Gigantamax Rapid Strike','Single Strike Style Gigantamax'])assert.ok(isForm(s),s);
 for(const s of ['Mega','Dynamax','Meganium','Gmax-like','Gigantamax Cutscene','Gigantamax Shiny'])assert.equal(isForm(s),false,s);
});
test('discover nested styles, skip Shiny ancestry and unrelated forms',()=>{
 const root=node('Urshifu',{'0000':node('Single Strike',{'0002':node('Gigantamax',{'0001':node('Shiny')})}),'0001':node('Rapid Strike',{'0003':node('G-Max')}),'0002':node('Shiny',{'0001':node('Gigantamax')}),'0003':node('Mega')});
 assert.deepEqual(findForms(root).map(x=>x.parts),[['0000','0002'],['0001','0003']]);
});
test('strict eight-row and frame metadata checks, no visual approval',()=>{
 const a={w:32,h:40,dur:[4,6]};
 assert.equal(checkSheet(a,png(64,320)).ok,true);
 assert.equal(checkSheet(a,png(64,160)).ok,false);
 assert.equal(checkSheet(a,png(32,320)).ok,false);
 assert.equal(checkSheet({...a,dur:[0]},png(64,320)).ok,false);
 assert.equal(checkSheet({...a,w:0},png(64,320)).ok,false);
 assert.equal(checkSheet(a,Buffer.from('bad')).ok,false);
});
test('missing exact form and missing species stay distinct',async()=>{
 const read=async()=>{throw Error('must not fetch unrelated art');};
 assert.equal((await auditSpecies({'0025':node('Pikachu')},25,'Pikachu',read)).status,'no-exact-form-label');
 assert.equal((await auditSpecies({},25,'Pikachu',read)).status,'species-not-in-tracker');
});
test('normal complete with missing Shiny stays gated, even if all normal headers pass',async()=>{
 const tracker={'0006':node('Charizard',{'0003':node('Gigantamax')})};
 const xml='<AnimData>'+ACTIONS.map(n=>'<Anim><Name>'+n+'</Name><FrameWidth>32</FrameWidth><FrameHeight>40</FrameHeight><Durations><Duration>4</Duration></Durations></Anim>').join('')+'</AnimData>';
 const read=async file=>file.endsWith('.xml')?Buffer.from(xml):file.endsWith('credits.txt')?Buffer.from('fixture credits'):png(32,320);
 const r=await auditSpecies(tracker,6,'Charizard',read);
 assert.equal(r.forms[0].normal.structuralCandidate,true);assert.equal(r.forms[0].shiny,null);assert.equal(r.forms[0].bothStructural,false);assert.equal(r.battleReady,false);
 assert.deepEqual(summarize([r]),{species:1,exactLabelSpecies:1,missingExactLabelSpecies:0,forms:1,normalStructural:1,shinyStructural:0,bothStructural:0,battleReady:0});
});
test('both structurally valid variants never become battle ready',async()=>{
 const tracker={'0025':node('Pikachu',{'0001':node('Gigantamax',{'0001':node('Shiny')})})};
 const xml='<AnimData>'+ACTIONS.map(n=>'<Anim><Name>'+n+'</Name><FrameWidth>32</FrameWidth><FrameHeight>40</FrameHeight><Durations><Duration>4</Duration></Durations></Anim>').join('')+'</AnimData>';
 const read=async file=>file.endsWith('.xml')?Buffer.from(xml):file.endsWith('credits.txt')?Buffer.from('fixture credits'):png(32,320);
 const r=await auditSpecies(tracker,25,'Pikachu',read);
 assert.equal(r.forms[0].bothStructural,true);assert.equal(r.forms[0].battleReady,false);assert.equal(summarize([r]).battleReady,0);
});
