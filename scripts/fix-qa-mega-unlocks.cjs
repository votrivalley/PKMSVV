#!/usr/bin/env node
'use strict';
// QA ONLY: Repair an EXPORTED backup for exhaustive Mega UI testing.
// Does not touch a live save, passwords, player tickets, Shiny or account storage.
const fs=require('node:fs'),path=require('node:path');
const [input,output]=process.argv.slice(2);
if(!input||!output||path.resolve(input)===path.resolve(output)){
 console.error('Usage: node scripts/fix-qa-mega-unlocks.cjs <exported-save.json> <qa-full-out.json>');
 process.exit(1);
}
const wrapper=JSON.parse(fs.readFileSync(input,'utf8'));
if(wrapper?.format!=='PKMSVV_SAVE'||wrapper.version!==1||!wrapper.save?.owned||!wrapper.save?.stats||!wrapper.save?.pupg){
 throw Error('Expected a valid exported PKMSVV_SAVE v1 backup; export from game first.');
}
const cat=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/mega-source-catalog.json'),'utf8'));
if(cat.forms.length!==96)throw Error('Mega registry changed; stop instead of producing a partial QA file.');
const save=wrapper.save;
save.pkmsvvChapter3Seen=true;
save.pkmsvvChapter7Seen=true;
save.megaStones=save.megaStones||{};
save.megaForms=save.megaForms||{};
save.megaStoryCleared=save.megaStoryCleared||{};
for(const f of cat.forms){
 if(!save.owned[f.dex])save.owned[f.dex]={at:Date.now(),from:'qa'};
 if(f.megaStone)save.megaStones[f.megaStone.toLowerCase().replace(/[^a-z0-9]/g,'')]=true;
 save.megaForms[f.showdownKey]=true;
 save.megaStoryCleared[f.showdownKey]=true;
}
wrapper.qaNote='FULL MEGA QA TEST — not a legitimately earned progression save';
wrapper.createdAt=new Date().toISOString();
fs.writeFileSync(output,JSON.stringify(wrapper,null,2)+'\n','utf8');
console.log('QA backup created: '+cat.forms.length+'/96 Mega unlock flags. Import only into a disposable QA profile.');
