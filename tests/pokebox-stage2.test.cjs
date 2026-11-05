'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=require('../src/pkmsvv-box-stage1.js');
const stage2=require('../src/pkmsvv-box-stage2.js');
const mk=()=>({coins:8300,created:444,owned:{6:{at:1},25:{at:2}},shiny:{6:{at:2}},
 partner:6,partnerShiny:false,tickets:{t1:105,t10:10},pity:{0:99},stats:{runs:38},
 pupg:{6:{atk:5}},pkmsvvBerry:{bag:{oran:4}},megaStones:{6:1}});
const setup=()=>{
 const state=base.migrate(mk()).save;
 let writes=0,persisted='',fail=false;
 global.G={PKMSVVBox:base,DEX_BY:{6:{dex:6,rarity:3,types:['fire','flying']},
  25:{dex:25,rarity:2,types:['electric']},150:{dex:150,rarity:5,types:['psychic']}},
  DEX_ABIL:{6:[11,12,13],25:[23,0,0]},NATURES:[{id:'hardy'},{id:'jolly'},{id:'adamant'}],
  Coop:{active:false},DB:{save:state,commit(){
   if(fail)return false;
   writes++;persisted=JSON.stringify(this.save);return true;
  }}};
 return {s:state,get writes(){return writes},get persisted(){return persisted},
  set fail(v){fail=v}};
};
const roll=(dex,shiny=false)=>({dex,rarity:3,shiny,isNew:false,refund:0});
const add=(s,dex,shiny=false)=>{
 const item=stage2.makeOne(s,roll(dex,shiny),{random:()=>0,natures:[{id:'jolly'}],abilities:{[dex]:[10,11,12]}});
 return item;
};
test('existing migration still holds legacy Shiny, Berry, Mega and upgrades untouched',()=>{
 const h=setup(),before=JSON.stringify(h.s);
 assert.equal(h.s.pkmsvvBox.length,3);
 const x=add(h.s,6);
 assert.equal(x.id,'b2-1');assert.equal(x.dex,6);
 assert.equal(x.natureId,'jolly');assert.equal(x.abilitySlot,2,'controlled random 0 must hit 5% hidden Ability');
 assert.equal(h.s.pkmsvvBox.length,4);
 assert.equal(h.s.pupg[6].atk,5);assert.equal(h.s.pkmsvvBerry.bag.oran,4);
 assert.equal(h.s.shiny[6].at,2);assert.ok(before.includes('pkmsvvSelectedInstanceId'));
});
test('every Gacha result receives a unique instance, including duplicates; tickets and pity use original Gacha policy',()=>{
 const h=setup(),save=h.s;
 G.Gacha={pull(draft,n){
  if(draft.tickets.t1<n)return null;
  draft.tickets.t1-=n;draft.pity[0]=0;draft.stats.pulls=(draft.stats.pulls||0)+n;
  return Array.from({length:n},(_,i)=>roll(i%3?6:25,i===5));
 }};
 assert.equal(stage2.wrappedPull(G.Gacha,G.DB),true);
 const res=G.Gacha.pull(save,10,0,'t1');
 assert.equal(res.length,10);assert.equal(new Set(res.map(x=>x.instanceId)).size,10);
 assert.equal(save.tickets.t1,95);assert.equal(save.pity[0],0);
 assert.equal(save.pkmsvvBox.length,13);assert.equal(h.writes,1);
 assert.equal(save.pkmsvvBox.find(x=>x.id===res[5].instanceId).shiny,true);
 assert.equal(save.owned[6].at,1);assert.equal(save.shiny[6].at,2);
 assert.equal(G.Gacha.pull(save,100,0,'t1'),null,'not enough tickets');
 assert.equal(save.pkmsvvBox.length,13);assert.equal(h.writes,1);
});
test('100-roll batch does not spend tickets or create partial individuals when commit fails',()=>{
 const h=setup(),before=JSON.stringify(h.s);
 G.Gacha={pull(draft,n){
  draft.tickets.t1-=n;
  return Array.from({length:n},()=>roll(6));
 }};
 stage2.wrappedPull(G.Gacha,G.DB);h.fail=true;
 assert.throws(()=>G.Gacha.pull(h.s,100,1,'t1'),/Persistence failed/);
 assert.equal(JSON.stringify(h.s),before);
 assert.equal(h.writes,0);
});
test('no migration: gacha keeps legacy behavior until the user backs up and opts in',()=>{
 const h=setup(),raw=mk();
 G.Gacha={pull(s,n){s.tickets.t1-=n;return [roll(6)];}};
 stage2.wrappedPull(G.Gacha,G.DB);
 const old=G.Gacha.pull(raw,1);
 assert.equal(old.length,1);assert.equal(raw.pkmsvvBox,undefined);assert.equal(raw.tickets.t1,104);
});
test('only exact-species ordinary duplicates can become Rank shards',()=>{
 const h=setup(),a=add(h.s,6),p=add(h.s,25),shiny=add(h.s,6,true);
 assert.equal(stage2.eligible(h.s,a),true);
 assert.equal(stage2.eligible(h.s,p),true);
 assert.equal(stage2.eligible(h.s,shiny),false);
 assert.equal(stage2.eligible(h.s,h.s.pkmsvvBox.find(x=>x.id==='b1-6-n')),false);
 assert.throws(()=>stage2.toFragments(shiny.id,h.s),/protected/);
 assert.deepEqual(stage2.toFragments(a.id,h.s),{dex:6,fragments:1});
 assert.equal(stage2.shards(h.s,6),1);
 assert.equal(stage2.get(h.s,a.id),null);
 assert.equal(h.s.pkmsvvBox.find(x=>x.id==='b1-6-n').rank,0);
 assert.equal(h.s.owned[6].at,1,'Pokédex species flag is retained');
});
test('rank 0→1 uses one exact-species duplicate; mixing shards and originals works at Rank 1→2',()=>{
 const h=setup(),lead='b1-6-n';
 const a=add(h.s,6),b=add(h.s,6),c=add(h.s,6);
 stage2.toFragments(a.id,h.s);
 assert.equal(stage2.shards(h.s,6),1);
 assert.deepEqual(stage2.rankUp(lead,[b.id],0,h.s),{id:lead,from:0,to:1,consumed:1,fragments:0});
 assert.equal(h.s.pkmsvvBox.find(x=>x.id===lead).rank,1);
 const d=add(h.s,6);
 stage2.rankUp(lead,[c.id],1,h.s);
 assert.equal(h.s.pkmsvvBox.find(x=>x.id===lead).rank,2);
 assert.equal(stage2.shards(h.s,6),0);
 assert.equal(stage2.get(h.s,d.id).rank,0,'unselected duplicate survives');
 assert.equal(h.s.pupg[6].atk,5,'old personal upgrades preserved');
});
test('cannot cross-evolution-family, reuse duplicate material ID, or consume protected originals',()=>{
 const h=setup(),lead='b1-6-n',a=add(h.s,6),b=add(h.s,25);
 const before=JSON.stringify(h.s);
 assert.throws(()=>stage2.rankUp(lead,[b.id],0,h.s),/same species/);
 assert.throws(()=>stage2.rankUp(lead,['b1-6-s'],0,h.s),/protected|same species/);
 assert.throws(()=>stage2.rankUp(lead,[a.id,a.id],0,h.s),/exactly|Duplicate/);
 assert.equal(JSON.stringify(h.s),before);
});
test('Rank 3 choice is stored once and permanent stats do not leak into PvP',()=>{
 const h=setup(),lead='b1-6-n',x=stage2.get(h.s,lead);x.rank=3;
 assert.deepEqual(stage2.branches(6),['fire','flying']);
 assert.deepEqual(stage2.branches(25),['offense','defense']);
 const chosen=stage2.chooseBranch(lead,'fire',h.s);
 assert.equal(chosen.branch,'fire');
 assert.throws(()=>stage2.chooseBranch(lead,'flying',h.s),/already chosen/);
 assert.equal(stage2.formatRank(5).hp,30);
 G.Mons={monFor:dex=>({dex,hp:100,pa:20,sa:30,atk:30})};
 stage2.hookPveStats(G.Mons,G.DB);
 let mon=G.Mons.monFor(6);
 assert.equal(mon.hp,118);assert.ok(mon.pa>20);assert.ok(mon.sa>30);
 G.Coop.active=true;mon=G.Mons.monFor(6);assert.equal(mon.hp,100);
 G.Coop.active=false;mon=G.Mons.monFor(25);assert.equal(mon.hp,100);
});
test('stage2 is only bundled in isolated QA, not production prepare scripts',()=>{
 const a=fs.readFileSync(path.join(__dirname,'../scripts/build-pokebox-stage1-qa.cjs'),'utf8');
 const b=fs.readFileSync(path.join(__dirname,'../scripts/build-pokebox-stage1-pc-qa.cjs'),'utf8');
 const production=fs.readFileSync(path.join(__dirname,'../scripts/prepare-game.cjs'),'utf8');
 for(const p of [a,b]){
  assert.match(p,/pkmsvv-box-stage2\.js/);
  assert.match(p,/pkmsvv-box-stage2-ui\.js/);
  assert.match(p,/pkmsvv-box-stage2\.css/);
 }
 assert.doesNotMatch(production,/pkmsvv-box-stage2/);
});

test('Individual traits follow the selected PokéBox instance',()=>{
 const h=setup(),second=add(h.s,6);
 G.NATURE_BY={hardy:{id:'hardy'},jolly:{id:'jolly',up:'spd',down:'sa'}};
 G.DEX_BY[6]={...G.DEX_BY[6],hp:100,pa:20,sa:30,df:30,sd:20,spd:50};
 G.Mons={natureOf(){return G.NATURE_BY.hardy;},abilityOf(){return {id:11,slot:0}},
  monFor(){return {dex:6,hp:100,pa:20,sa:30,df:30,sd:20,spd:50,atk:30,nature:'hardy'}}};
 second.natureId='jolly';second.abilitySlot=1;
 stage2.hookIndividualTraits(G.Mons,G.DB);stage2.hookPveStats(G.Mons,G.DB);
 h.s.pkmsvvSelectedInstanceId=second.id;
 assert.equal(G.Mons.natureOf(6).id,'jolly');
 assert.equal(G.Mons.abilityOf(6).id,12);
 const mon=G.Mons.monFor(6);
 assert.equal(mon.hp,100);
 assert.ok(Math.abs(mon.spd-55)<1e-9);assert.ok(Math.abs(mon.sa-27)<1e-9);
 h.s.pkmsvvSelectedInstanceId='b1-6-n';
 assert.equal(G.Mons.natureOf(6).id,'hardy');
 assert.equal(G.Mons.abilityOf(6).id,11);
});
