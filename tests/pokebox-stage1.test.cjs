'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const api=require('../src/pkmsvv-box-stage1.js');
const base=()=>({v:3,coins:54321,tickets:{t1:5},owned:{'4':{at:1},'6':{at:5},'150':{at:5}},shiny:{'6':{at:4}},partner:6,partnerShiny:true,pkmsvvBerry:{bag:{oran:3}},megaStones:{'6':1},pupg:{6:{atk:9}}});
const lookups={natureOf:d=>({id:d===6?'jolly':'hardy'}),abilityOf:d=>({slot:d===6?2:0})};
test('stage1 migration preserves legacy save and creates separate shiny instance',()=>{
 const s=base(),serialized=JSON.stringify(s),r=api.migrate(s,lookups);
 assert.equal(JSON.stringify(s),serialized,'original object must not be touched');
 assert.equal(r.changed,true);assert.equal(r.count,4);
 assert.equal(r.save.pkmsvvSelectedInstanceId,'b1-6-s');
 assert.deepEqual(r.save.owned,s.owned);assert.deepEqual(r.save.shiny,s.shiny);
 assert.deepEqual(r.save.tickets,s.tickets);assert.deepEqual(r.save.pupg,s.pupg);
 assert.equal(r.save.pkmsvvBox.find(x=>x.id==='b1-6-s').natureId,'jolly');
 assert.equal(r.save.pkmsvvBox.find(x=>x.id==='b1-6-s').abilitySlot,2);
 assert.equal(api.validBox(r.save),true);
});
test('migration is idempotent; no duplication after reloading',()=>{
 const first=api.migrate(base(),lookups).save;
 const second=api.migrate(JSON.parse(JSON.stringify(first)),lookups);
 assert.equal(second.changed,false);assert.deepEqual(second.save,first);
});
test('shiny-only legacy right is retained without inventing a normal Pokémon',()=>{
 const s={owned:{},shiny:{'25':{at:1}},partner:25,partnerShiny:true};
 const r=api.migrate(s,lookups);
 assert.equal(r.count,1);assert.equal(r.save.pkmsvvBox[0].shiny,true);
});
test('reject unknown/corrupt schema without changing anything',()=>{
 const s=base();s.pkmsvvBoxSchema=2;s.pkmsvvBox=[];
 const raw=JSON.stringify(s);assert.throws(()=>api.migrate(s),/Unknown PokéBox/);
 assert.equal(JSON.stringify(s),raw);
});
test('reject duplicate ids and invalid Pokédex numbers',()=>{
 const s=api.migrate(base()).save;
 s.pkmsvvBox.push({...s.pkmsvvBox[0]});assert.equal(api.validBox(s),false);
 s.pkmsvvBox.pop();s.pkmsvvBox[0].dex=9999;assert.equal(api.validBox(s),false);
});
test('migrate a large legitimate collection without dropping legacy progression',()=>{
 const s=base();s.owned={};s.shiny={};
 for(let i=1;i<=540;i++)s.owned[i]={at:12345,from:'gacha'};
 for(let i=1;i<=18;i++)s.shiny[i]={at:12345,from:'gacha'};
 s.partner=150;s.partnerShiny=false;
 const original=JSON.stringify(s);const migrated=api.migrate(s,lookups);
 assert.equal(migrated.count,558);assert.equal(api.validBox(migrated.save),true);
 assert.equal(JSON.stringify(s),original);
 assert.equal(migrated.save.pkmsvvSelectedInstanceId,'b1-150-n');
 assert.equal(migrated.save.pkmsvvBox.filter(x=>x.shiny).length,18);
 assert.equal(api.migrate(migrated.save).count,558);
});
test('use original private save only as in-memory QA; never print or commit it',()=>{
 const privatePath=process.env.PKMSVV_LEGACY_SAVE_QA;
 if(!privatePath)return;
 const json=JSON.parse(fs.readFileSync(path.resolve(privatePath),'utf8'));
 assert.equal(json.format,'PKMSVV_SAVE');
 const before=JSON.stringify(json.save);const r=api.migrate(json.save,lookups);
 assert.equal(JSON.stringify(json.save),before);
 assert.equal(r.save.pkmsvvBox.length,Object.keys(json.save.owned).length+Object.keys(json.save.shiny).length);
 for(const k of Object.keys(json.save))assert.deepEqual(json.save[k],r.save[k]);
 assert.equal(api.validBox(r.save),true);
});
test('legacy persisted Nature and Ability outrank runtime defaults; favorite override survives migration',()=>{
 const raw=base();
 raw.pnat={6:['adamant',12]};raw.pabil={6:[2,98]};
 raw.favorites={6:true};raw.pkmsvvLegacyFavoriteOverrides={6:false};
 const dex=api.listLegacy(raw,lookups);
 const normal=dex.find(x=>x.id==='b1-6-n');
 assert.equal(normal.natureId,'adamant');
 assert.equal(normal.abilitySlot,2);
 assert.equal(normal.favorite,false,'explicit legacy favorite toggle overrides original favorite');
 const moved=api.migrate(raw,lookups).save;
 assert.deepEqual(moved.pnat,raw.pnat);
 assert.deepEqual(moved.pabil,raw.pabil);
 assert.equal(moved.pkmsvvBox.find(x=>x.id==='b1-6-n').favorite,false);
 assert.equal(raw.pkmsvvBoxSchema,undefined,'read-only migration must not mutate original');
});
