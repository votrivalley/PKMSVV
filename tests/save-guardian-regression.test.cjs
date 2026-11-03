'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const fs=require('node:fs'),path=require('node:path');
const SOURCE=fs.readFileSync(path.join(__dirname,'../src/cloudflare/save-guardian.js'),'utf8');
const K='ps.save.pkmsvv_offline',LATEST='pkmsvv.safe.v1.pkmsvv_offline.latest';
const PREVIOUS='pkmsvv.safe.v1.pkmsvv_offline.previous';
function save(){
 return {name:'Guardian QA',coins:1000,owned:{25:{at:1}},shiny:{25:{at:2}},
  stats:{runs:6,bestTime:500},itemsFound:{amulet:100},evoMoves:{fusion:100},
  ach:{first:100},legends:{150:100},bag:{mint:2,cap:1},tms:{thunderbolt:1},
  ptm:{25:['quickattack']},megaStones:{lucarionite:1},megaForms:{lucariomega:true},
  megaStoryCleared:{lucariomega:true},pkmsvvChapter7Seen:true,pkmsvvBerryChapterDone:true,
  pkmsvvBerry:{bag:{oran:3},used:{oran:true},rescueWins:4},
  arenas:{pkmChampion:{seals:{Kanto:true},trophies:{Kanto:true}}},
  arenaGacha:{points:200,pulls:10,championPaid:{Kanto:true},trophyPaid:{Kanto:true}}};
}
function run(initial,extra={}){
 const storage=new Map(Object.entries(extra));if(initial)storage.set(K,JSON.stringify(initial));
 const localStorage={getItem:k=>storage.has(k)?storage.get(k):null,
  setItem(k,v){storage.set(k,String(v));}};
 const events={},window={addEventListener(n,f){events[n]=f}};
 vm.runInNewContext(SOURCE,{window,localStorage,Date,console,
  document:{hidden:false,addEventListener(n,f){events[n]=f}},
  setInterval(){}});
 return {guardian:window.PKMSVVSaveGuardian,storage,events,read:k=>JSON.parse(storage.get(k))};
}
test('Guardian protects named permanent achievements, not just total Pokémon count',()=>{
 const original=save(),ctx=run(original),g=ctx.guardian;
 const loss=(change)=>{const next=structuredClone(original);change(next);
  assert.equal(g.regress(JSON.stringify(original),JSON.stringify(next)),true);};
 loss(s=>{delete s.megaStones.lucarionite;});
 loss(s=>{delete s.megaForms.lucariomega;});
 loss(s=>{delete s.megaStoryCleared.lucariomega;});
 loss(s=>{delete s.pkmsvvBerry.used.oran;});
 loss(s=>{s.pkmsvvBerry.rescueWins=3;});
 loss(s=>{delete s.itemsFound.amulet;});
 loss(s=>{s.ptm[25]=[];});
 loss(s=>{s.arenas.pkmChampion.seals={};});
 loss(s=>{s.arenas.pkmChampion.trophies={};});
 loss(s=>{s.arenaGacha.pulls=9;});
 loss(s=>{delete s.arenaGacha.championPaid.Kanto;});
 loss(s=>{delete s.owned[25];s.owned[6]={at:3};});
 loss(s=>{s.pkmsvvChapter7Seen=false;});
 loss(s=>{s.pkmsvvBerryChapterDone=false;});
 loss(s=>{delete s.pkmsvvBerry.bag;});
 loss(s=>{delete s.tms;});
});
test('Spendable Berry, Shop, TM and Arena Point balances can legitimately drop',()=>{
 const original=save(),next=structuredClone(original),g=run(original).guardian;
 next.pkmsvvBerry.bag.oran=0;
 next.bag.mint=0;next.bag.cap=0;next.tms={};
 next.arenaGacha.points=0;next.coins=0;
 assert.equal(g.regress(JSON.stringify(original),JSON.stringify(next)),false,
  'legal spending must not be reported as corrupted progress');
 next.pkmsvvBerry.used.sitrus=true;
 next.ptm[25].push('thunderbolt');
 assert.equal(g.regress(JSON.stringify(original),JSON.stringify(next)),false);
});
test('Guardian keeps a known-good snapshot instead of promoting a save that loses Mega/Berry/items',()=>{
 const original=save(),ctx=run(original),next=structuredClone(original);
 delete next.megaStones.lucarionite;
 delete next.pkmsvvBerry.used.oran;
 delete next.itemsFound.amulet;
 ctx.storage.set(K,JSON.stringify(next));ctx.guardian.snapshot();
 assert.deepEqual(ctx.read(LATEST),original);
 assert.deepEqual(ctx.read(PREVIOUS),original);
 assert.equal(ctx.guardian.regress(JSON.stringify(original),JSON.stringify(next)),true);
});
test('Guardian can recover a damaged primary save from latest validated local backup',()=>{
 const original=save(),ctx=run(null,{[K]:'bad data',[LATEST]:JSON.stringify(original)});
 assert.deepEqual(ctx.read(K),original);
 assert.deepEqual(ctx.read(LATEST),original);
});
