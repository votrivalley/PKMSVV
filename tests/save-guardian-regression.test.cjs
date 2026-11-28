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

test('Guardian protects bought station skins but allows spending coins and changing equipment',()=>{
 const original=save();
 original.pkmsvvCoopLab={coopCoins:350,stationSkins:{owned:{mega_copper:true},equipped:{mega:'mega_copper'}}};
 const ctx=run(original),g=ctx.guardian;
 const next=structuredClone(original);next.pkmsvvCoopLab.coopCoins=250;
 next.pkmsvvCoopLab.stationSkins.owned.berry_copper=true;
 delete next.pkmsvvCoopLab.stationSkins.equipped.mega;
 next.pkmsvvCoopLab.stationSkins.equipped.berry='berry_copper';
 assert.equal(g.regress(JSON.stringify(original),JSON.stringify(next)),false);
 ctx.storage.set(K,JSON.stringify(next));assert.equal(g.snapshot(),true);
 assert.deepEqual(ctx.read(LATEST),next);
 assert.deepEqual(ctx.read(PREVIOUS),original);
 const diff=g.compare(JSON.stringify(original),JSON.stringify(next));
 assert.equal(diff.risk,false);
 assert.equal(diff.balances.find(x=>x.name==='Xu Đồng Đội').delta,-100);
 assert.ok(diff.permanent.some(x=>x.name==='Skin máy nghiên cứu'&&x.change==='gain'));
 const lost=structuredClone(next);delete lost.pkmsvvCoopLab.stationSkins.owned.mega_copper;
 assert.equal(g.regress(JSON.stringify(next),JSON.stringify(lost)),true);
 assert.equal(g.compare(JSON.stringify(next),JSON.stringify(lost)).risk,true);
 ctx.storage.set(K,JSON.stringify(lost));assert.equal(g.snapshot(),false);
 assert.deepEqual(ctx.read(LATEST),next);
});

test('Guardian treats lower machine research ranks as permanent progression loss',()=>{
 const original=save();original.pkmsvvResearchRanks={power:2};original.pkmsvvCoopLab={coopCoins:40};
 const ctx=run(original),g=ctx.guardian,next=structuredClone(original);
 next.pkmsvvResearchRanks.power=3;next.pkmsvvCoopLab.coopCoins=0;
 assert.equal(g.regress(JSON.stringify(original),JSON.stringify(next)),false);
 assert.equal(g.compare(JSON.stringify(original),JSON.stringify(next)).risk,false);
 const lost=structuredClone(original);lost.pkmsvvResearchRanks.power=1;
 assert.equal(g.regress(JSON.stringify(original),JSON.stringify(lost)),true);
 assert.equal(g.compare(JSON.stringify(original),JSON.stringify(lost)).risk,true);
});

test('Guardian keeps egg evolution unlocks and the original rolled egg variant',()=>{
 const original=save();original.pkmsvvEggEvolutions={176:true};
 original.pkmsvvIncubator={serial:1,active:null,eggs:{'egg-1':{dex:175,kills:50,region:1,from:'baby-egg',shiny:true}},hatched:{}};
 const g=run(original).guardian;
 for(const mutate of [s=>{s.pkmsvvEggEvolutions={}},s=>{s.pkmsvvIncubator.eggs['egg-1'].shiny=false},s=>{s.pkmsvvIncubator.eggs['egg-1'].from='region-boss'}]){
  const next=structuredClone(original);mutate(next);
  assert.equal(g.regress(JSON.stringify(original),JSON.stringify(next)),true);
 }
 const next=structuredClone(original);next.pkmsvvEggEvolutions[468]=true;
 assert.equal(g.regress(JSON.stringify(original),JSON.stringify(next)),false);
});

test('Guardian permits prize redemption, but rejects lost entitlement, shortened goal or paid level',()=>{
 const original=save();original.pkmsvvIncubator={level:3,serial:1,active:null,eggs:{'egg-1':{dex:175,kills:600,goal:1000,region:9,from:'mission-baby'}},hatched:{},prizes:{'room-A.1':{count:2,claimed:[]}}};
 const g=run(original).guardian,next=structuredClone(original);
 next.pkmsvvIncubator.serial=2;
 next.pkmsvvIncubator.eggs['egg-2']={dex:447,kills:0,goal:1000,region:9,from:'egg-rush-baby',prize:'room-A.1'};
 next.pkmsvvIncubator.prizes['room-A.1'].claimed.push('egg-2');
 assert.equal(g.regress(JSON.stringify(original),JSON.stringify(next)),false);
 for(const mutate of [s=>{delete s.pkmsvvIncubator.prizes},s=>{s.pkmsvvIncubator.level=2},s=>{s.pkmsvvIncubator.eggs['egg-1'].goal=500},s=>{s.pkmsvvIncubator.prizes['room-A.1'].claimed=['egg-1']}]){
  const bad=structuredClone(next);mutate(bad);assert.equal(g.regress(JSON.stringify(next),JSON.stringify(bad)),true);
 }
});

test('Guardian preserves earned recruitment egg counter and prevents removal of claim history',()=>{
 const original=save();original.pkmsvvIncubator={serial:1,active:null,eggs:{'egg-1':{dex:175,kills:0,goal:1000,region:9,from:'gacha-baby',gachaMilestone:100}},hatched:{},gacha:{pulls:200,claimed:['egg-1']}};
 const g=run(original).guardian,next=structuredClone(original);
 next.pkmsvvIncubator.gacha.pulls=201;assert.equal(g.regress(JSON.stringify(original),JSON.stringify(next)),false);
 for(const change of [i=>delete i.gacha,i=>{i.gacha.pulls=199},i=>{i.gacha.claimed=[]},i=>{i.eggs['egg-1'].gachaMilestone=200}]){
  const bad=structuredClone(original);change(bad.pkmsvvIncubator);assert.equal(g.regress(JSON.stringify(original),JSON.stringify(bad)),true);
 }
});

test('Guardian permits only newly receipted Blank TM removal, rejects unrelated lost moves and old journal reuse',()=>{
 const a=save();a.bag.blankTm=1;a.ptm[25]=['quickattack','surf'];
 const {eraseTM,recordTM}=require('../src/pkmsvv-progression-merge.js');
 const b=structuredClone(a);eraseTM(b,{dex:25,move:'surf'});
 const g=run(a).guardian;assert.equal(g.regress(JSON.stringify(a),JSON.stringify(b)),false);
 const diff=g.compare(JSON.stringify(a),JSON.stringify(b));assert.equal(diff.risk,false);assert.ok(diff.warnings.some(x=>x.includes('Intentional Blank TM erase')));
 const bad=structuredClone(b);bad.ptm[25]=[];assert.equal(g.regress(JSON.stringify(a),JSON.stringify(bad)),true);
 assert.equal(g.regress(JSON.stringify(b),JSON.stringify(a)),true);
 const c=structuredClone(b);c.ptm[25].push('surf');recordTM(c,{dex:25,move:'surf',instance:null,legacy:true,action:'teach'});
 const lost=structuredClone(c);lost.ptm[25]=['quickattack'];assert.equal(g.regress(JSON.stringify(c),JSON.stringify(lost)),true);
});
