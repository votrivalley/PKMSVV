'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const stage1=require('../src/pkmsvv-box-stage1.js');
const stage2=require('../src/pkmsvv-box-stage2.js');
const prism=require('../src/pkmsvv-box-stage3.js');
function setup(){
 const old={owned:{6:{at:1},25:{at:2}},shiny:{6:{at:1}},
  partner:6,partnerShiny:false,pupg:{6:{atk:3}},megaStones:{6:1},
  coins:15000,tickets:{t1:100},pity:{0:40},pkmsvvBerry:{bag:{oran:2}}};
 const s=stage1.migrate(old).save;let writes=0,failed=false;
 global.G={PKMSVVBox:stage1,PKMSVVBox2:stage2,
  DB:{save:s,commit(){if(failed)return false;writes++;return true;}},
  Game:{state:'playing'},Coop:{active:false},Arena:{active:false},
  DEX_BY:{
   6:{dex:6,types:['fire','flying'],rarity:3,name:'Charizard'},
   25:{dex:25,types:['electric'],rarity:2,name:'Pikachu'},
   7:{dex:7,types:['water'],rarity:1,name:'Squirtle'},
   150:{dex:150,types:['psychic'],rarity:5,name:'Mewtwo'}
  },
  Shop:{today:()=> '20261105'},
  UI:{toast(){}},
  EnemyMgr:{clear(){}}
 };
 prism.resetRun();
 return {s,get writes(){return writes},set failed(v){failed=v}};
}
const foe=(dex,attrs={})=>({dex,dead:true,remote:false,...attrs});
test('item metadata remains fixed at accepted Stage 3 design',()=>{
 assert.equal(prism.ITEM,'reforge-prism');
 assert.equal(prism.PRICE,6500);
 assert.equal(prism.SHOP_RATE,.12);
 assert.equal(prism.PITY,180);
 assert.equal(prism.MAX_DROPS_PER_RUN,1);
 assert.deepEqual({...prism.RATES},{type:.0035,species:.015,elite:.03,boss:.08});
});
test('daily stock is deterministic and buying is limited to one per day',()=>{
 const {s}=setup();
 assert.equal(prism.slotRoll('20261105'),prism.slotRoll('20261105'));
 let day;
 for(let i=1;i<1000;i++){const d='test-day-'+i;if(prism.slotRoll(d)<.12){day=d;break}}
 assert.ok(day);
 const before=s.coins;
 assert.equal(prism.shopOffer(day,s).canBuy,true);
 assert.deepEqual(prism.buy(s,day),{item:'reforge-prism',price:6500,count:1,day});
 assert.equal(s.coins,before-6500);
 assert.equal(s.pkmsvvReforgePrisms,1);
 assert.equal(s.pkmsvvReforgeBoughtDay,day);
 assert.equal(prism.shopOffer(day,s).bought,true);
 assert.equal(prism.shopOffer(day,s).canBuy,false);
 assert.throws(()=>prism.buy(s,day),/sold out/);
 assert.equal(s.coins,before-6500);
});
test('shop never rerolls if opened repeatedly or item unavailable',()=>{
 const {s}=setup();
 let out;
 for(let i=1;i<200;i++){const d='no-sale-'+i;if(prism.slotRoll(d)>=.12){out=d;break}}
 assert.ok(out);assert.equal(prism.shopOffer(out,s).available,false);
 for(let i=0;i<100;i++)assert.equal(prism.shopOffer(out,s).available,false);
 assert.throws(()=>prism.buy(s,out),/sold out/);
});
test('Rank 3/5 respec consumes one Prism, preserves Rank, Nature, Ability, Shiny, Mega and shards',()=>{
 const {s}=setup();const x=stage2.get(s,'b1-6-n');
 x.rank=5;x.natureId='jolly';x.abilitySlot=2;x.rankBranch='fire';x.favorite=true;
 s.pkmsvvRankFragments={6:8};s.pkmsvvReforgePrisms=1;
 const keep=JSON.stringify({id:x.id,dex:x.dex,rank:x.rank,natureId:x.natureId,abilitySlot:x.abilitySlot,
  shiny:x.shiny,megaStones:s.megaStones,pupg:s.pupg,shards:s.pkmsvvRankFragments});
 const swapped=prism.resetBranch(x.id,'flying',s);
 assert.deepEqual(swapped,{id:x.id,from:'fire',to:'flying',remaining:0,rank:5});
 assert.equal(x.rankBranch,'fire','retired object must not be silently mutated');
 const y=stage2.get(s,x.id);
 assert.equal(y.rankBranch,'flying');
 assert.equal(JSON.stringify({id:y.id,dex:y.dex,rank:y.rank,natureId:y.natureId,abilitySlot:y.abilitySlot,
  shiny:y.shiny,megaStones:s.megaStones,pupg:s.pupg,shards:s.pkmsvvRankFragments}),keep);
 assert.equal(prism.count(s),0);
 assert.equal(s.pkmsvvBoxLog.at(-1).kind,'reforge');
});
test('no free or invalid respec: different branch required and Rank 3 gate',()=>{
 const {s}=setup(),x=stage2.get(s,'b1-6-n');
 assert.throws(()=>prism.resetBranch(x.id,'flying',s),/Rank 3/);
 x.rank=3;x.rankBranch='fire';
 assert.throws(()=>prism.resetBranch(x.id,'fire',s),/different/);
 assert.throws(()=>prism.resetBranch(x.id,'water',s),/different/);
 assert.throws(()=>prism.resetBranch(x.id,'flying',s),/required/);
 assert.equal(x.rankBranch,'fire');
});
test('eligible kills calculate highest single rate, not double for dual types',()=>{
 const {s}=setup();
 assert.equal(prism.enemyInfo(foe(6),s).rate,.015);
 assert.equal(prism.enemyInfo(foe(6,{boss:true}),s).rate,.08);
 assert.equal(prism.enemyInfo(foe(25,{types:['electric','fire']}),s).rate,.0035);
 assert.equal(prism.enemyInfo(foe(25,{types:['electric','fire'],elite:true}),s).rate,.03);
 assert.equal(prism.enemyInfo(foe(7),s),null);
 assert.equal(prism.enemyInfo(foe(25,{remote:true,types:['fire']}),s),null);
 assert.equal(prism.enemyInfo(foe(150,{arceus:true,boss:true,types:['fire']}),s),null);
 assert.equal(prism.enemyInfo(foe(6,{pkmsvvBossGuard:true,boss:false}),s),null,'boss escort must never count as wild kill');
});
test('pity counts eligible KOs only, guaranteed 180th, and max one drop per run',()=>{
 const {s}=setup();
 for(let i=1;i<180;i++){
  const r=prism.defeated(foe(6),()=>1,s);
  assert.equal(r.eligible,true);assert.equal(r.dropped,false);assert.equal(prism.pity(s),i);
 }
 const guaranteed=prism.defeated(foe(6),()=>1,s);
 assert.equal(guaranteed.dropped,true);assert.equal(guaranteed.pity,0);
 assert.equal(prism.count(s),1);assert.equal(prism.runDrops(),1);
 const blocked=prism.defeated(foe(6),()=>0,s);
 assert.equal(blocked.eligible,false);assert.equal(prism.count(s),1);
 prism.resetRun();
 assert.equal(prism.runDrops(),0);
 assert.equal(prism.defeated(foe(7),()=>0,s).eligible,false);
 assert.equal(prism.pity(s),0);
});
test('standard species 1.5% success resets pity, shop purchase does not',()=>{
 const {s}=setup();s.pkmsvvReforgePity=175;
 s.pkmsvvReforgePrisms=1;
 const res=prism.defeated(foe(6),()=>0,s);
 assert.equal(res.dropped,true);
 assert.equal(res.rate,.015);
 assert.equal(prism.pity(s),0);
 assert.equal(prism.count(s),2);
});
test('Co-op, Arena and idle state block drops, and enemy kill is never credited twice',()=>{
 const {s}=setup();
 G.Coop.active=true;
 assert.equal(prism.defeated(foe(6),()=>0,s).eligible,false);
 G.Coop.active=false;G.Arena.active=true;
 assert.equal(prism.defeated(foe(6),()=>0,s).eligible,false);
 G.Arena.active=false;G.Game.state='menu';
 assert.equal(prism.defeated(foe(6),()=>0,s).eligible,false);
 G.Game.state='playing';
 const enemy=foe(6);
 assert.equal(prism.defeated(enemy,()=>1,s).eligible,true);
 assert.equal(prism.defeated(enemy,()=>1,s).eligible,false);
 assert.equal(prism.pity(s),1);
});
test('atomic failure refunds shop coins and never consumes Prism or Rank branch',()=>{
 const h=setup(),{s}=h;
 let day;
 for(let i=0;i<1000;i++){const d='x'+i;if(prism.shopOffer(d,s).available){day=d;break}}
 const snapshot=JSON.stringify(s);h.failed=true;
 assert.throws(()=>prism.buy(s,day),/Save commit failed/);
 assert.equal(JSON.stringify(s),snapshot);
 h.failed=false;
 s.pkmsvvReforgePrisms=1;
 const x=stage2.get(s,'b1-6-n');x.rank=3;x.rankBranch='fire';
 const before=JSON.stringify(s);h.failed=true;
 assert.throws(()=>prism.resetBranch(x.id,'flying',s),/Save commit failed/);
 assert.equal(JSON.stringify(s),before);
 const candidate=foe(6);
 assert.throws(()=>prism.defeated(candidate,()=>0,s),/Save commit failed/);
 assert.equal(JSON.stringify(s),before);
 assert.equal(candidate._pkmsvvPrismCounted,false,'failed kill can retry without duplicate');
});
test('enemy hurt and run clear hook only credits genuine solo kill once',()=>{
 const {s}=setup();
 class Enemy{
  constructor(dex){this.dex=dex;this.dead=false;this.remote=false;this.hp=10}
  hurt(damage){this.hp-=damage;if(this.hp<=0)this.dead=true}
 }
 assert.equal(prism.enemyHook(Enemy,G.EnemyMgr,G.DB),true);
 assert.equal(prism.enemyHook(Enemy,G.EnemyMgr,G.DB),true);
 const e=new Enemy(6);
 // Defeat hooks use Math.random. Force a no-drop roll so this test always
 // checks a one-count pity, rather than failing randomly on a 1.5% drop.
 const oldRandom=Math.random;
 try{
  Math.random=()=>1;
  e.hurt(5);assert.equal(prism.pity(s),0);
  e.hurt(5);assert.equal(prism.pity(s),1);
  e.hurt(5);assert.equal(prism.pity(s),1);
  G.EnemyMgr.clear();assert.equal(prism.runDrops(),0);
 }finally{Math.random=oldRandom;}
});
test('stage3 only injected into isolated QA, not standard Web/PC/Android source',()=>{
 const root=path.join(__dirname,'..');
 const web=fs.readFileSync(path.join(root,'scripts/build-pokebox-stage1-qa.cjs'),'utf8');
 const pc=fs.readFileSync(path.join(root,'scripts/build-pokebox-stage1-pc-qa.cjs'),'utf8');
 const prod=fs.readFileSync(path.join(root,'scripts/prepare-game.cjs'),'utf8');
 for(const src of [web,pc]){assert.match(src,/pkmsvv-box-stage3\.js/);assert.match(src,/pkmsvv-box-stage3\.css/);}
 assert.doesNotMatch(prod,/pkmsvv-box-stage3/);
});
