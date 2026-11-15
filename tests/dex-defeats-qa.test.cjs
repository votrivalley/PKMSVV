'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-dex-defeats-qa.js'),'utf8');
function fixture(){
 const mons=[{dex:1,rarity:1},{dex:4,rarity:1},{dex:25,rarity:2},{dex:19,rarity:1}];
 const s={owned:{1:{at:1}},shiny:{},partner:1,stats:{runs:0},tickets:{t1:2}};
 let commits=0,failure=false;
 class Enemy{
  constructor(dex){this.dex=dex;this.def={dex};this.dead=false;this.remote=false;}
  die(){this.dead=true;if(this.endRunOnDeath)G.Game.state='ui';}
 }
 const G={DEX:mons,DEX_BY:Object.fromEntries(mons.map(m=>[m.dex,m])),
  DB:{save:s,get guest(){return false},commit(){if(failure)return false;commits++;return true}},
  Enemy,Game:{state:'playing',player:{x:0,y:0}},
  PKMSVVQuickRegion:{active:true,selectedRegion:0},
  Coop:{active:false},PKMSVVChampionArena:{active:false},PKMSVVArenaSolo:{active:false},
  PKMSVVArenaPvp:{active:false},Royale:{active:false},EggRush:{active:false},
  Camera:{sees(x,y){return Math.abs(x)<=450&&Math.abs(y)<=300;}},
  EnemyMgr:{_list:[],add(e){this._list.push(e);return e;},
   all(){return this._list;},update(){}},
  Gacha:{
   pool(rarity){return G.DEX.filter(m=>m.rarity===rarity)},
   pull(save,n,gen){const pool=G.DEX.filter(m=>m.rarity===1);if(!pool.length)return null;
    if(save.tickets.t1<n)return null;
    save.tickets.t1-=n;return Array.from({length:n},()=>({dex:pool[0].dex,shiny:false}));}
  },I18n:{lang:'vi'},UI:{toast(){}}};
 vm.runInNewContext(source,{G,console});
 return {G,s,api:G.PKMSVVDexDefeats,Enemy,get commits(){return commits},set failure(x){failure=x}};
}
test('Explore-only: actually defeating a species reveals its Pokédex entry once',()=>{
 const f=fixture();
 assert.equal(f.api.unlocked(f.s,1),false,'Starter ownership does not invent a kill');
 const enemy=new f.Enemy(25);f.G.EnemyMgr.add(enemy);
 assert.equal(f.api.unlocked(f.s,25),false);
 enemy.die();assert.equal(f.api.unlocked(f.s,25),true);
 assert.equal(f.api.unlocked(f.s,4),false);assert.equal(f.commits,1);
 enemy.die();new f.Enemy(25).die();assert.equal(f.commits,1,'same species is saved only once');
});
test('Previously owned historical collection is grandfathered, without inventing kills',()=>{
 const f=fixture();
 for(let i=2;i<=9;i++)f.s.owned[i]={at:i};
 assert.equal(f.api.unlocked(f.s,1),true);
 new f.Enemy(25).die();
 for(let i=1;i<=9;i++)assert.equal(f.api.unlocked(f.s,i),true);
 assert.equal(f.api.unlocked(f.s,25),true);
 assert.equal(f.s.pkmsvvDefeatedDex[25],true);
});
test('Failed save commit rolls back new Explore defeat, never damages previous save',()=>{
 const f=fixture(),before=JSON.stringify(f.s);f.failure=true;
 new f.Enemy(4).die();assert.equal(JSON.stringify(f.s),before);
 assert.equal(f.api.unlocked(f.s,4),false);
 f.failure=false;new f.Enemy(4).die();
 assert.equal(f.api.unlocked(f.s,4),true);
});
test('Recruitment includes only defeated Explore species, restores pool and protects tickets',()=>{
 const f=fixture(),beforeDex=f.G.DEX;
 assert.equal(f.G.Gacha.pull(f.s,1,1),null);
 assert.equal(f.s.tickets.t1,2);
 new f.Enemy(4).die();
 assert.deepEqual(f.G.Gacha.pool(1,1).map(x=>x.dex),[4]);
 const got=f.G.Gacha.pull(f.s,1,1);
 assert.equal(got[0].dex,4);assert.equal(f.s.tickets.t1,1);
 assert.equal(f.G.DEX,beforeDex);
});
test('Merely seeing or spawning a Pokémon NEVER reveals it, even in Explore',()=>{
 const f=fixture(),beforeAdd=f.G.EnemyMgr.add,beforeUpdate=f.G.EnemyMgr.update;
 const enemy=new f.Enemy(25);enemy.x=25;enemy.y=20;
 f.G.EnemyMgr.add(enemy);
 for(let i=0;i<120;i++)f.G.EnemyMgr.update(.016);
 assert.equal(f.api.unlocked(f.s,25),false);
 assert.equal(f.s.pkmsvvSeenDex,undefined,'new system must never create sighting progress');
 assert.equal(f.commits,0);
 assert.equal(f.G.EnemyMgr.add,beforeAdd,'do not inject a spawn-based auto-unlock');
 assert.equal(f.G.EnemyMgr.update,beforeUpdate,'do not inject a visibility-based auto-unlock');
 enemy.die();assert.equal(f.api.unlocked(f.s,25),true);
 assert.equal(f.commits,1);
});
test('Co-op, Solo Arena, Champion, Arena PvP, Royale and Egg Rush kills do NOT count',()=>{
 for(const [name,mutate] of [
  ['Co-op',g=>g.Coop.active=true],
  ['Arena Champion',g=>g.PKMSVVChampionArena.active=true],
  ['Arena Solo',g=>g.PKMSVVArenaSolo.active=true],
  ['Arena PvP',g=>g.PKMSVVArenaPvp.active=true],
  ['Sống Còn',g=>g.Royale.active=true],
  ['Tranh Trứng',g=>g.EggRush.active=true],
  ['outside Explore',g=>g.PKMSVVQuickRegion.active=false],
  ['in UI',g=>g.Game.state='ui']
 ]){
  const f=fixture(),original=JSON.stringify(f.s);
  mutate(f.G);
  new f.Enemy(25).die();
  assert.equal(f.api.unlocked(f.s,25),false,name+' cannot unlock Pokédex');
  assert.equal(f.commits,0,name+' cannot save unlocks');
  assert.equal(JSON.stringify(f.s),original,name+' cannot change save');
  assert.equal(f.api.markDefeated(f.s,25),false,name+' cannot bypass via direct API');
 }
});
test('Protected guardians, remote opponents, friendly and support actor deaths never count',()=>{
 const f=fixture();
 for(const key of ['pkmsvvBossGuard','remote','friendly','pkmsvvFriendly','isSupport','isPlayer']){
  const e=new f.Enemy(19);e[key]=true;e.die();
 }
 const owner=new f.Enemy(25);owner.pkmsvvGuardianOf=999;owner.die();
 assert.equal(f.commits,0);assert.equal(f.api.unlocked(f.s,19),false);
 assert.equal(f.api.unlocked(f.s,25),false);
});
test('Final Explore boss defeat is recorded even when die() ends the match synchronously',()=>{
 const f=fixture();const boss=new f.Enemy(25);
 boss.endRunOnDeath=true;
 boss.die();
 assert.equal(f.G.Game.state,'ui','game may transition on boss death');
 assert.equal(f.api.unlocked(f.s,25),true);
 assert.equal(f.commits,1);
});
test('Historical seen-only flags are preserved in JSON but no longer grant new unlocks',()=>{
 const f=fixture();f.s.pkmsvvSeenDex={25:true};
 assert.equal(f.api.unlocked(f.s,25),false);
 assert.equal(f.G.Gacha.pool(2).length,0,'old seen-only flag cannot enter Recruitment');
 assert.equal(f.api.markDefeated(f.s,25),true,'actual Explore kill can promote to defeated ledger');
 assert.equal(f.s.pkmsvvSeenDex[25],true,'never delete old save fields');
 assert.equal(f.s.pkmsvvDefeatedDex[25],true);
});
test('Pokédex clearly explains Explore-only defeats and shows silhouettes until then',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub-ui.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub.css'),'utf8');
 assert.match(ui,/PKMSVVDexDefeats\?\.unlocked/);
 assert.match(ui,/pkmbx-dex-undefeated/);
 assert.match(ui,/Chưa hạ Pokémon này trong Khám phá/);
 assert.match(ui,/Chỉ hạ Pokémon trong Khám phá mới mở Pokédex và Chiêu mộ/);
 assert.match(ui,/Co-op, Arena và các chế độ khác không tính/);
 assert.match(ui,/Only Pokémon defeated in Explore/,'English language rule');
 assert.match(css,/#pkmbx-dex-rule/);
 assert.match(css,/pkmbx-dex-card\.is-undefeated/);
 for(const filename of ['scripts/build-pokebox-stage1-qa.cjs','scripts/build-pokebox-stage1-pc-qa.cjs','scripts/patch-pokebox-stage4-apk-qa.cjs']){
  const body=fs.readFileSync(path.join(__dirname,'..',filename),'utf8');
  assert.match(body,/pkmsvv-dex-defeats-qa\.js/);
 }
});

test('Recruitment blocks empty generations without consuming tickets and uses National Dex boundaries',()=>{
 const f=fixture();
 const {G,s,api,Enemy}=f;
 const limits=[[1,1],[151,1],[152,2],[251,2],[252,3],[386,3],[387,4],[493,4],
  [494,5],[649,5],[650,6],[721,6],[722,7],[809,7],[810,8],[905,8],[906,9],[1025,9]];
 for(const [dex,gen] of limits)assert.equal(api.generationOf(dex),gen);
 assert.equal(api.generationOf(1026),0);
 const johto={dex:152,rarity:1,gen:1}; // deliberately incorrect metadata
 G.DEX.push(johto);G.DEX_BY[152]=johto;
 const ticketsBefore=s.tickets.t1;
 assert.equal(G.Gacha.pull(s,1,2),null,'no defeated Johto species');
 assert.equal(s.tickets.t1,ticketsBefore,'empty Johto must not cost a ticket');
 new Enemy(152).die();
 assert.deepEqual(api.eligibleInGen(s,2).map(x=>x.dex),[152],
  'National Dex generation wins over incorrect Gacha metadata');
 assert.equal(G.Gacha.pull(s,1,1),null,'Kanto remains empty');
 assert.equal(s.tickets.t1,ticketsBefore,'empty Kanto must not cost a ticket');
 const reward=G.Gacha.pull(s,1,2);
 assert.equal(reward?.[0]?.dex,152);
 assert.equal(s.tickets.t1,ticketsBefore-1,'only successful Johto pull costs a ticket');
});
