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

test('first successful Gacha on legacy profile auto-safeguards and records ordinary clones atomically',()=>{
 const h=setup(),raw=mk(),priorLocal=global.localStorage;
 const stored=new Map([['ps.session','"poketrainer"']]);
 global.localStorage={getItem:k=>stored.get(k)??null,setItem(k,v){stored.set(k,v)},removeItem:k=>stored.delete(k)};
 G.DB.save=raw;
 G.PKMSVVSaveUI={backup(){
  const snapshot=JSON.stringify({format:'PKMSVV_SAVE',version:1,save:JSON.parse(JSON.stringify(G.DB.save))});
  assert.equal(G.DB.save.pkmsvvBoxSchema,undefined,'backup must be of the untouched old save');
  return snapshot;
 }};
 G.Gacha={pull(draft,n){draft.tickets.t1-=n;return [roll(6)]}};
 try{
  stage2.wrappedPull(G.Gacha,G.DB);
  const original=JSON.stringify(raw);
  const res=G.Gacha.pull(raw,1);
  assert.equal(res.length,1);
  assert.equal(base.validBox(raw),true,'a successful new Gacha activates the individual ledger');
  assert.equal(raw.pkmsvvBox.length,4,'three historical originals plus exactly one new ordinary copy');
  assert.equal(raw.pkmsvvBox.filter(x=>x.dex===6&&!x.shiny).length,2);
  assert.equal(stage2.rankMaterials(raw,'b1-6-n').available,1);
  assert.ok(stored.get('pkmsvv.prepokebox.poketrainer'),'original profile has persistent recovery JSON');
  const backup=JSON.parse(stored.get('pkmsvv.prepokebox.poketrainer'));
  assert.equal(backup.save.pkmsvvBoxSchema,undefined);
  assert.equal(backup.save.tickets.t1,105,'backup is BEFORE Gacha ticket consumption');
  assert.equal(raw.tickets.t1,104);
  assert.equal(h.writes,1,'Gacha and new Box ledger commit once (backup mock does not write)');
  assert.equal(stage2.rankUpAuto('b1-6-n',raw).to,1,'new clone can immediately Rank without confirming/material conversion');
  assert.notEqual(JSON.stringify(raw),original);
 }finally{global.localStorage=priorLocal;}
});
test('failed first Gacha does not migrate old profile or consume tickets',()=>{
 const h=setup(),raw=mk(),old=JSON.stringify(raw);
 G.DB.save=raw;G.Gacha={pull(){return null}};
 stage2.wrappedPull(G.Gacha,G.DB);
 assert.equal(G.Gacha.pull(raw,1),null);
 assert.equal(JSON.stringify(raw),old);
 assert.equal(raw.pkmsvvBoxSchema,undefined);
});
test('legacy Gacha cannot spend anything if recovery snapshot storage fails',()=>{
 const h=setup(),raw=mk(),old=JSON.stringify(raw),priorLocal=global.localStorage;
 const stored=new Map([['ps.session','"poketrainer"']]);
 global.localStorage={getItem:k=>stored.get(k)??null,setItem(){throw Error('QuotaExceededError')}};
 G.DB.save=raw;G.PKMSVVSaveUI={backup:()=>JSON.stringify({format:'PKMSVV_SAVE',save:raw})};
 G.Gacha={pull(draft){draft.tickets.t1--;return [roll(6)]}};
 try{
  stage2.wrappedPull(G.Gacha,G.DB);
  assert.throws(()=>G.Gacha.pull(raw,1),/QuotaExceededError/);
  assert.equal(JSON.stringify(raw),old);
  assert.equal(h.writes,0);
 }finally{global.localStorage=priorLocal;}
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
test('Rank costs increase 1,2,3,4,5 copies per separate step, including shards',()=>{
 const h=setup(),lead='b1-6-n',copies=Array.from({length:15},()=>add(h.s,6));
 const [a,...others]=copies;
 stage2.toFragments(a.id,h.s);
 assert.equal(stage2.shards(h.s,6),1);
 let offset=0;
 assert.deepEqual(stage2.rankUp(lead,[others[offset++].id],0,h.s),
  {id:lead,from:0,to:1,consumed:1,fragments:0});
 assert.equal(stage2.get(h.s,lead).rank,1);
 assert.throws(()=>stage2.rankUp(lead,[others[offset].id],0,h.s),/exactly 2/);
 const second=stage2.rankUp(lead,[others[offset++].id],1,h.s);
 assert.equal(second.to,2);assert.equal(stage2.shards(h.s,6),0);
 for(let cost=3;cost<=5;cost++){
  const batch=others.slice(offset,offset+cost).map(x=>x.id);offset+=cost;
  assert.equal(batch.length,cost);
  const receipt=stage2.rankUp(lead,batch,0,h.s);
  assert.equal(receipt.to,cost);
 }
 assert.equal(stage2.speciesProgress(h.s,6).rank,5);
 assert.throws(()=>stage2.rankUp(lead,[],0,h.s),/Rank 5/);
 assert.equal(h.s.pupg[6].atk,5,'permanent existing upgrades are preserved');
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


test('Normal and Shiny share earned species Rank/branch without altering save originals or consuming skins',()=>{
 const h=setup(),s=h.s;
 const normal=stage2.get(s,'b1-6-n'),shiny=stage2.get(s,'b1-6-s');
 normal.rank=2;normal.rankBranch='fire';normal.natureId='jolly';normal.abilitySlot=1;
 shiny.rank=0;shiny.natureId='hardy';shiny.abilitySlot=0;
 const saved=JSON.stringify(s);
 s.pkmsvvSelectedInstanceId=shiny.id;s.partnerShiny=true;
 const skin=stage2.selected(s);
 assert.equal(skin.id,shiny.id);
 assert.equal(skin.shiny,true);
 assert.equal(skin.rank,2);
 assert.equal(skin.rankBranch,'fire');
 assert.equal(skin.natureId,'jolly');
 assert.equal(skin.abilitySlot,1);
 assert.equal(shiny.rank,0,'legacy Shiny rank field remains intact until user ranks up');
 assert.equal(shiny.natureId,'hardy','legacy Shiny traits stay in save for rollback');
 assert.equal(stage2.speciesProgress(s,6).rank,2);
 s.pkmsvvSelectedInstanceId=normal.id;s.partnerShiny=false;
 assert.equal(stage2.selected(s).rank,2);
 assert.equal(JSON.parse(saved).pkmsvvBox.length,s.pkmsvvBox.length);
 const a=add(s,6),b=add(s,6),c=add(s,6);
 const receipt=stage2.rankUp(shiny.id,[a.id,b.id,c.id],0,s);
 assert.equal(receipt.from,2);assert.equal(receipt.to,3);
 assert.equal(stage2.speciesProgress(s,6).rank,3);
 assert.equal(stage2.selected(s).rank,3,'Normal benefits when Shiny earns Rank');
 assert.equal(stage2.get(s,shiny.id).rank,3,'Shiny retains explicit earned progress');
 assert.equal(stage2.get(s,normal.id).rank,2,'older Normal save record remains unchanged');
 assert.equal(s.pkmsvvBox.filter(x=>x.dex===6&&x.shiny).length,1);
 assert.equal(stage2.get(s,b.id),null);assert.equal(stage2.get(s,c.id),null);
});


test('Normal + Shiny is NOT x2; Shiny can neither be credited nor consumed as Rank material',()=>{
 const h=setup(),s=h.s,normal='b1-6-n',shiny='b1-6-s';
 assert.equal(stage2.candidateList(s,normal).length,0);
 assert.equal(stage2.claimableList(s,normal).length,0,'the shiny is not a free material');
 assert.equal(stage2.rankMaterials(s,normal).available,0);
 assert.equal(stage2.rankMaterials(s,shiny).available,0);
 const before=JSON.stringify(s);
 assert.throws(()=>stage2.rankUp(normal,[],0,s,[shiny]),/Shiny|protected|credit unavailable/);
 assert.equal(JSON.stringify(s),before,'failed attempt must leave all save data unchanged');
 const copy=add(s,6);
 assert.equal(stage2.rankMaterials(s,normal).available,1,'one new ordinary Gacha clone counts');
 assert.equal(stage2.rankUpAuto(normal,s).to,1);
 assert.equal(stage2.get(s,copy.id),null);
 assert.ok(stage2.get(s,shiny));
 assert.equal(s.pkmsvvRankClaimedCopies?.['6']?.length||0,0,'Shiny is never marked as spent material');
});


test('real ordinary clone Rank rolls back on failed save commit; Shiny remains protected',()=>{
 const h=setup(),s=h.s,copy=add(s,6),before=JSON.stringify(s);
 h.fail=true;
 assert.throws(()=>stage2.rankUpAuto('b1-6-n',s),/Persistence failed/);
 assert.equal(JSON.stringify(s),before);
 assert.equal(h.writes,0);
 assert.ok(stage2.get(s,'b1-6-s')?.shiny);
 assert.ok(stage2.get(s,copy.id),'failed rank must preserve Gacha clone');
});


test('#191 Sunkern: old Normal+Shiny alone cannot Rank; a new ordinary clone can, without switching fighter',()=>{
 const h=setup(),save=h.s;
 G.DEX_BY[191]={dex:191,name:'Sunkern',types:['grass'],rarity:1};
 save.owned[191]={at:30};save.shiny[191]={at:31};
 const original={dex:191,natureId:'hardy',abilitySlot:0,rank:0,locked:false,favorite:false};
 save.pkmsvvBox.push({...original,id:'b1-191-n',shiny:false});
 save.pkmsvvBox.push({...original,id:'b1-191-s',shiny:true});
 const active=save.pkmsvvSelectedInstanceId;
 assert.equal(stage2.rankMaterials(save,'b1-191-n').available,0);
 assert.equal(stage2.rankMaterials(save,'b1-191-s').available,0);
 const newClone=add(save,191);
 assert.equal(stage2.rankMaterials(save,'b1-191-n').available,1);
 const result=stage2.rankUpAuto('b1-191-n',save);
 assert.equal(result.to,1);
 assert.equal(stage2.speciesProgress(save,191).rank,1);
 assert.equal(save.pkmsvvSelectedInstanceId,active);
 assert.equal(stage2.get(save,'b1-191-s').shiny,true);
 assert.equal(stage2.get(save,newClone.id),null);
});

test('new duplicate Gacha pull is instantly eligible for one-click Rank without making shards',()=>{
 const h=setup(),save=h.s,original='b1-25-n';
 assert.equal(stage2.rankMaterials(save,original).available,0,'only the original exists initially');
 const duplicate=add(save,25);
 const before=stage2.rankMaterials(save,original);
 assert.equal(before.cost,1);
 assert.deepEqual(before.copies.map(x=>x.id),[duplicate.id]);
 assert.equal(before.available,1,'fresh clone is rank material immediately');
 assert.equal(stage2.shards(save,25),0,'no conversion into Rank shard is needed');
 const receipt=stage2.rankUpAuto(duplicate.id,save);
 assert.equal(receipt.to,1);
 assert.equal(receipt.consumed,1);
 assert.equal(stage2.get(save,duplicate.id),null,'the extra ordinary Gacha copy is consumed on confirmation');
 assert.ok(stage2.get(save,original),'original survives the upgrade');
 assert.equal(stage2.shards(save,25),0);
 assert.equal(stage2.speciesProgress(save,25).rank,1);
 const extra1=add(save,25),extra2=add(save,25);
 assert.equal(stage2.rankMaterials(save,original).cost,2,'second Rank requires two additional clones');
 const second=stage2.rankUpAuto(original,save);
 assert.equal(second.to,2);
 assert.equal(second.consumed,2);
 assert.equal(stage2.get(save,extra1.id),null);
 assert.equal(stage2.get(save,extra2.id),null);
 assert.equal(stage2.speciesProgress(save,25).rank,2);
});

test('first ordinary in Shiny-only collection is protected; second ordinary can Rank without Shiny credit',()=>{
 const h=setup(),s=h.s;
 // Another species owned solely in Shiny form.
 s.owned[191]={at:30};s.shiny[191]={at:31};
 s.pkmsvvBox.push({id:'b1-191-s',dex:191,shiny:true,rank:0,locked:false,favorite:false});
 const first=add(s,191);
 assert.equal(stage2.rankMaterials(s,first.id).available,0,'one Normal plus one Shiny not x2');
 const second=add(s,191);
 assert.equal(stage2.rankMaterials(s,first.id).available,1);
 assert.deepEqual(stage2.candidateList(s,first.id).map(x=>x.id),[second.id]);
 assert.equal(stage2.rankUpAuto(first.id,s).to,1);
 assert.ok(stage2.get(s,first.id),'first ordinary carrier must survive');
 assert.equal(stage2.get(s,second.id),null,'second ordinary may be used as material');
 assert.ok(stage2.get(s,'b1-191-s'),'Shiny is always preserved');
});

test('automatic Rank is atomic: failed disk write preserves duplicates, saved rank and old currencies',()=>{
 const h=setup(),s=h.s;
 const clone=add(s,25),before=JSON.stringify(s);
 h.fail=true;
 assert.throws(()=>stage2.rankUpAuto(clone.id,s),/Persistence failed/);
 assert.equal(JSON.stringify(s),before);
 assert.equal(stage2.get(s,clone.id)?.dex,25);
 assert.equal(stage2.speciesProgress(s,25).rank,0);
});


test('protected additional ordinary favorite can count once, but neither the original nor Shiny is a material',()=>{
 const h=setup(),s=h.s,ordinary=add(s,6);
 assert.equal(stage2.rankMaterials(s,'b1-6-n').copies.length,1);
 assert.equal(stage2.rankMaterials(s,'b1-6-n').credits.length,0,'normal+shiny does not grant a bonus');
 const receipt=stage2.rankUpAuto('b1-6-n',s);
 assert.equal(receipt.to,1);
 assert.equal(receipt.consumed,1);
 assert.equal(stage2.get(s,ordinary.id),null);
 assert.ok(stage2.get(s,'b1-6-s')?.shiny);
 assert.equal(s.pkmsvvRankClaimedCopies?.['6']?.length||0,0);
 const protectedCopy=add(s,6);protectedCopy.favorite=true;
 assert.equal(stage2.rankMaterials(s,'b1-6-n').credits.length,1);
 assert.equal(stage2.rankMaterials(s,'b1-6-n').cost,2);
 const normalCopy=add(s,6);
 assert.equal(stage2.rankUpAuto('b1-6-n',s).to,2);
 assert.ok(stage2.get(s,protectedCopy.id)?.favorite,'favorite remains, credited once');
 assert.equal(stage2.get(s,normalCopy.id),null);
 assert.equal(stage2.rankMaterials(s,'b1-6-n').credits.length,0);
});
