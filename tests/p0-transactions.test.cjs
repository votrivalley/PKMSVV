'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function fixture(){
 const s={coins:12000,bag:{mint:1,cap:2},tms:{surf:1},pnat:{25:['hardy',1]},pabil:{25:[0,1]},ptm:{25:[]},owned:{25:{at:1}},partner:25,pkmsvvChapter7Seen:true,arenaGacha:{points:400,pity:29,pulls:0},megaStones:{},updated:1,led:{base:{coins:[12000,0]}}};
 let fail=false,commits=0,attempts=0,inside=null,persisted=JSON.stringify(s),notifications=0;
 const G={DB:{save:s,guest:false,commit(){attempts++;s.updated+=1;s.led={changed:true};inside?.();if(fail==='throw')throw Error('Quota');if(fail)return false;commits++;persisted=JSON.stringify(s);return true;}},Game:{state:'ui'},TM_MOVES:{surf:1},TM_PRICE:{surf:400},Moves:{BY_ID:{surf:{}}},Mons:{canLearn:()=>true,learnable:()=>['surf']},PKMSVV_MEGA_CATALOG:[{key:'luc',name:'Lucario',stoneKey:'lucarionite',stone:'Lucarionite',storyLocked:false},{key:'mew',name:'Mewtwo',stoneKey:'mewtwonitex',stone:'Mewtwonite X',storyLocked:true}],PKMSVVStory:{onMegaUnlocked(){notifications++;}}};
 const cx={G,console,document:{readyState:'loading',addEventListener(){}}};
 vm.runInNewContext(read('src/kecleon/upstream/data/shop.js'),cx);vm.runInNewContext(read('src/pkmsvv-mega-gacha.js'),cx);
 return {s,G,shop:G.Shop,mega:G.PKMSVVMegaGacha,set fail(v){fail=v},set inside(v){inside=v},get persisted(){return persisted},get commits(){return commits},get attempts(){return attempts},get notifications(){return notifications}};
}
test('Shop purchase persists price and exactly one item; full stacks and bad input never charge',()=>{
 const f=fixture(),s=f.s;
 assert.equal(f.shop.buy('mint').ok,true);assert.equal(s.coins,10500);assert.equal(s.bag.mint,2);
 assert.equal(f.shop.buy('tm:surf').ok,true);assert.equal(s.coins,10100);assert.equal(s.tms.surf,2);
 assert.equal(JSON.parse(f.persisted).tms.surf,2);
 s.tms.surf=999;s.bag.cap=999;const before=JSON.stringify(s);
 for(const k of ['tm:surf','cap','caph','__proto__',null])assert.equal(f.shop.buy(k).ok,false);
 assert.equal(JSON.stringify(s),before);assert.equal(f.attempts,2);
});
test('purchase/sell/legacy Bag mutation rollback includes metadata and no false success',()=>{
 for(const fault of [true,'throw']){
  const f=fixture(),before=JSON.stringify(f.s);f.fail=fault;
  assert.equal(f.shop.buy('mint').ok,false);assert.equal(JSON.stringify(f.s),before);
  assert.equal(f.shop.buy('tm:surf').ok,false);assert.equal(JSON.stringify(f.s),before);
  assert.equal(f.shop.sell('mint').ok,false);assert.equal(JSON.stringify(f.s),before);
  assert.equal(f.shop.transaction('legacy-nature',s=>{f.shop.take('mint');s.pnat[25]=['bold',2];return true;}),null);
  assert.equal(JSON.stringify(f.s),before);
  assert.equal(f.shop.transaction('legacy-ability',s=>{f.shop.take('cap');s.pabil[25]=[1,2];return true;}),null);
  assert.equal(JSON.stringify(f.s),before);
  assert.equal(f.shop.transaction('legacy-tm',s=>{f.shop.takeTm('surf');s.ptm[25].push('surf');return true;}),null);
  assert.equal(JSON.stringify(f.s),before);assert.equal(f.persisted,before);assert.equal(f.commits,0);
  f.fail=false;assert.equal(f.shop.buy('mint').ok,true);assert.equal(f.s.bag.mint,2);
 }
});
test('guest, stale profile and reentrant callbacks cannot spend; legitimate sequential orders still work',()=>{
 const f=fixture();f.G.DB.guest=true;assert.equal(f.shop.buy('mint').ok,false);assert.equal(f.mega.pull(),null);
 f.G.DB.guest=false;assert.equal(f.shop.transaction('other',()=>true,{}),null);
 f.inside=()=>{assert.equal(f.shop.buy('mint').ok,false);};
 assert.equal(f.shop.buy('mint').ok,true);assert.equal(f.s.bag.mint,2);
 f.inside=null;assert.equal(f.shop.buy('mint').ok,true);assert.equal(f.s.bag.mint,3);assert.equal(f.commits,2);
});
test('Mega rollback preserves cost, pity, prize, metadata and legacy backfill on both write failure modes',()=>{
 for(const fault of [true,'throw']){
  const f=fixture();f.fail=fault;const before=JSON.stringify(f.s);
  assert.equal(f.mega.pull(f.s,()=>.5),null);assert.equal(JSON.stringify(f.s),before);assert.equal(f.notifications,0);
  f.s.arenas={pkmChampion:{trophies:{Kanto:true},seals:{Kanto:true}}};const old=JSON.stringify(f.s);
  assert.equal(f.mega.syncLegacyArena(),0);assert.equal(JSON.stringify(f.s),old);
  f.fail=false;assert.equal(f.mega.syncLegacyArena(),140);assert.equal(f.mega.syncLegacyArena(),0);
  f.inside=()=>assert.equal(f.mega.pull(f.s,()=>.5),null);
  const r=f.mega.pull(f.s,()=>.5);assert.equal(r.legendary,true);assert.equal(r.stoneKey,'mewtwonitex');assert.equal(f.s.arenaGacha.pity,0);
  assert.equal(f.s.arenaGacha.pulls,1);assert.equal(f.s.arenaGacha.points,440);assert.equal(f.notifications,1);
  assert.equal(JSON.parse(f.persisted).megaStones.mewtwonitex,1);
 }
});
test('invalid random value and declined mutation never write; failed item drop can retry',()=>{
 const f=fixture();f.s.arenaGacha.pity=0;const before=JSON.stringify(f.s);
 assert.equal(f.mega.pull(f.s,()=>NaN),null);assert.equal(JSON.stringify(f.s),before);
 assert.equal(f.shop.transaction('declined',s=>{s.coins=1;return false;}),null);assert.equal(JSON.stringify(f.s),before);
 f.G.Game.state='playing';const e={dex:19};f.fail=true;
 assert.equal(f.shop.dropFromEnemy(e,()=>0).length,0);assert.equal(JSON.stringify(f.s),before);
 f.fail=false;assert.equal(f.shop.dropFromEnemy(e,()=>0).length,2);assert.equal(f.shop.dropFromEnemy(e,()=>0).length,0);
});
