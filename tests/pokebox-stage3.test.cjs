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
test('item metadata: rotating daily shop and rare Solo drops are separate',()=>{
 assert.equal(prism.ITEM,'reforge-prism');
 assert.equal(prism.PRICE,6500);
 assert.equal(prism.SHOP_RATE,.12);
 assert.equal(prism.PITY,0,'2.0 uses actual drop odds, not guaranteed pity at 180');
 assert.equal(prism.MAX_DROPS_PER_RUN,999,'2.0 allows more than one rare drop per run');
 assert.deepEqual({...prism.RATES},{normal:.004,elite:.008,legend:.016});
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
 assert.throws(()=>prism.buy(s,day),/already purchased|unavailable/);
 assert.equal(s.coins,before-6500);
});
test('Prism is a regular rotating shop item with a stable daily chance',()=>{
 const {s}=setup();
 let out,stock;
 for(let i=1;i<1000;i++){
  const d='stock-test-'+i;
  if(prism.slotRoll(d)>=prism.SHOP_RATE&&!out)out=d;
  if(prism.slotRoll(d)<prism.SHOP_RATE&&!stock)stock=d;
 }
 assert.ok(out&&stock);
 assert.equal(prism.shopOffer(out,s).available,false);
 assert.equal(prism.shopOffer(out,s).canBuy,false);
 assert.throws(()=>prism.buy(s,out),/unavailable/);
 assert.equal(prism.shopOffer(stock,s).available,true);
 assert.equal(prism.shopOffer(stock,s).canBuy,true);
 assert.equal(prism.buy(s,stock).count,1);
 assert.equal(prism.shopOffer(stock,s).canBuy,false);
 const source=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-stage3.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-stage3.css'),'utf8');
 assert.match(source,/list\.querySelector\('\.pkmk-cards'\)/);
 assert.match(source,/pkmbx-prism-glass/, 'Prism must have an original magnifying-glass item icon');
 assert.match(source,/if\(empty\)empty\.remove\(\)/,'Prism-only Bag cannot report empty');
 assert.match(css,/#pkmbx-prism-store\.pkmk-card\{/, 'Prism uses an ordinary item card');
 assert.match(css,/border:3px solid #0b1422/, 'black rim belongs to the item artwork');
 assert.match(css,/\.pkmbx-prism-glass:|\.pkmbx-prism-glass\{/, 'magnifier artwork has its own responsive sizing');
});
test('Reforge Prism uses ordinary compact item card and a Rank Use action',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-stage3.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-stage3.css'),'utf8');
 assert.match(code,/Đổi nhánh Rank, giữ nguyên cấp\./);
 assert.match(code,/Change Rank branch; keep Rank level\./);
 assert.match(code,/pkmbx-prism-use/);
 assert.match(code,/openBox\('rank'\)/,'Use goes straight to Rank without consuming the Prism');
 assert.doesNotMatch(code,/Đã có trong Túi đồ\. Dùng tại PokéBox/,'remove duplicated long tutorial');
 assert.doesNotMatch(code,/Mua Lăng Kính ·/,'buy button uses standard native shop price');
 assert.match(css,/background:linear-gradient\(155deg,#1e365f,#162b53\)/,'same dark palette as normal Kecleon items');
 assert.match(css,/flex-wrap:nowrap/,'the Prism must not form a standalone detail banner');
});
test('a legacy save may buy one Prism before PokéBox migration without altering owned, nature or progress',()=>{
 setup();
 const legacy={owned:{6:{at:1}},shiny:{6:{at:2}},partner:6,partnerShiny:true,
  pnat:{6:['bold',100]},pabil:{6:[0,100]},coins:19000,tickets:{t1:20},
  pkmsvvBerry:{bag:{oran:2}}};
 const old=JSON.parse(JSON.stringify(legacy));
 G.DB.save=legacy;
 assert.equal(prism.count(legacy),0);
 let legacyDay;
 for(let i=1;i<1000;i++){const d='legacy-day-'+i;if(prism.slotRoll(d)<prism.SHOP_RATE){legacyDay=d;break}}
 assert.ok(legacyDay);
 assert.equal(prism.shopOffer(legacyDay,legacy).canBuy,true);
 assert.equal(prism.buy(legacy,legacyDay).count,1);
 assert.equal(legacy.pkmsvvBoxSchema,undefined);
 assert.deepEqual(legacy.owned,old.owned);
 assert.deepEqual(legacy.shiny,old.shiny);
 assert.deepEqual(legacy.pnat,old.pnat);
 assert.deepEqual(legacy.pabil,old.pabil);
 assert.equal(legacy.coins,12500);
 assert.equal(prism.count(legacy),1);
 assert.equal(prism.shopOffer(legacyDay,legacy).canBuy,false);
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
test('2.0 Prism uses 0.4% / elite 0.8% / legend 1.6%, irrespective of attacker species',()=>{
 const {s}=setup();
 assert.equal(prism.enemyInfo(foe(6),s).rate,.004);
 assert.equal(prism.enemyInfo(foe(6,{boss:true}),s).rate,.016);
 assert.equal(prism.enemyInfo(foe(150),s).rate,.016,'legendary species gets ×4');
 assert.equal(prism.enemyInfo(foe(25,{types:['electric','fire']}),s).rate,.004);
 assert.equal(prism.enemyInfo(foe(25,{types:['electric','fire'],elite:true}),s).rate,.008);
 assert.equal(prism.enemyInfo(foe(7),s).rate,.004,'no species/type gating remains');
 assert.equal(prism.enemyInfo(foe(25,{remote:true,types:['fire']}),s),null);
 assert.equal(prism.enemyInfo(foe(150,{arceus:true,boss:true,types:['fire']}),s),null);
 assert.equal(prism.enemyInfo(foe(6,{pkmsvvBossGuard:true,boss:false}),s),null);
});
test('2.0 Prism does not silently guarantee a drop on the 180th kill',()=>{
 const {s}=setup();s.pkmsvvReforgePity=175;
 for(let i=0;i<8;i++){
  const result=prism.defeated(foe(6),()=>1,s);
  assert.equal(result.eligible,true);
  assert.equal(result.dropped,false);
 }
 assert.equal(prism.count(s),0);
 assert.equal(prism.pity(s),183);
 const receipt=prism.defeated(foe(6),()=>0,s);
 assert.equal(receipt.dropped,true);assert.equal(receipt.pity,0);
 assert.equal(prism.count(s),1);
 const next=prism.defeated(foe(7),()=>0,s);
 assert.equal(next.eligible,true,'a second Prism can drop in the same run');
 assert.equal(prism.count(s),2);
 prism.resetRun();assert.equal(prism.runDrops(),0);
});
test('Prism sells for half its purchase price without touching Rank or purchased day',()=>{
 const {s}=setup();s.pkmsvvReforgePrisms=2;
 const priorCoins=s.coins,priorDay=s.pkmsvvReforgeBoughtDay;
 const a=prism.sell(s);
 assert.equal(a.ok,true);
 assert.equal(a.refund,3250);
 assert.equal(prism.count(s),1);
 assert.equal(s.coins,priorCoins+3250);
 assert.equal(s.pkmsvvReforgeBoughtDay,priorDay);
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
