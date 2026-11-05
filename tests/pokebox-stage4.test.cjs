'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const stage1=require('../src/pkmsvv-box-stage1.js'),stage2=require('../src/pkmsvv-box-stage2.js'),
 stage3=require('../src/pkmsvv-box-stage3.js'),stage4=require('../src/pkmsvv-box-stage4.js');
function setup(rank=5,branch='fire',types=['fire','flying']){
 const raw={owned:{6:{at:1}},shiny:{},partner:6,partnerShiny:false,
  coins:9000,tickets:{t1:300},pity:{0:10},megaStones:{6:1},
  pupg:{6:{atk:4}},pkmsvvBerry:{bag:{oran:3}}};
 const s=stage1.migrate(raw).save;
 const item=stage2.get(s,'b1-6-n');item.rank=rank;item.rankBranch=branch;
 let writes=0,failed=false,baseHits=0;
 const originalAbility={hit:()=>{baseHits++},out:()=>1.25,dodge:()=>.02,inMul:()=>.8};
 global.G={PKMSVVBox:stage1,PKMSVVBox2:stage2,PKMSVVBox3:stage3,
  DEX_BY:{6:{dex:6,types,rarity:3},25:{dex:25,types:['electric'],rarity:2}},
  DB:{save:s,commit(){if(failed)return false;writes++;return true}},
  Game:{state:'playing'},Coop:{active:false},Arena:{active:false},
  Royale:{active:false},Rift:{inArena:false},FX:{ring(){}},
  EnemyMgr:{queryCircle:()=>[],clear(){}},I18n:{lang:'vi'},UI:{toast(){}}};
 class Player{
  constructor(){this.mon={dex:6,types};this.cdMul=1.1;this.maxHp=100;this.hp=100;this.level=10;this.x=20;this.y=30;}
  setAbility(){this.abil=originalAbility;}
  heal(v){this.hp=Math.min(this.maxHp,this.hp+v);}
 }
 G.Player=Player;
 stage3.resetRun();
 return {s,item,Player,originalAbility,get writes(){return writes},
  get baseHits(){return baseHits},set failed(v){failed=v}};
}
function enemy(opts={}){
 const status={burn:0,poison:0,slow:0,hit:0};
 return {x:40,y:50,hp:120,dead:false,boss:false,remote:false,
  applyBurn(v){status.burn+=v},
  applyPoison(v){status.poison+=v},
  applySlow(){status.slow++},
  hurt(v){this.hp-=v;status.hit++},
  status,...opts};
}
test('Rank progression is unchanged and Rank 4 cooldown is 5%, not cumulative 5%/level',()=>{
 const h=setup(4,'fire');const pl=new h.Player();
 assert.equal(stage4.install(h.Player,G.DB),true);
 pl.setAbility(10);
 assert.ok(Math.abs(pl.cdMul-1.1*.95)<1e-9);
 assert.equal(pl._pkmbxRankId,'b1-6-n');
 assert.equal(stage2.formatRank(5).damage,30);
 assert.equal(stage2.formatRank(4).cooldown,5);
});
test('Rank 3 fire path applies burn on any attack type and keeps original Ability hit',()=>{
 const h=setup(3,'fire'),pl=new h.Player();
 stage4.install(h.Player,G.DB);pl.setAbility(10);
 const e=enemy();
 const result=stage4.procHit(pl,e,{type:'water'},pl._pkmbxRankTraits,()=>0,10000);
 assert.equal(result.proc,true);
 assert.equal(e.status.burn,1);
 const blocked=stage4.procHit(pl,e,{type:'normal'},pl._pkmbxRankTraits,()=>0,11000);
 assert.equal(blocked.proc,false);
 pl.abil.hit(pl,enemy(),{type:'water'});
 assert.equal(h.baseHits,1);
 assert.equal(pl.abil.out(pl,{},e),1.25);
 assert.equal(typeof h.originalAbility.hit,'function'); // legacy object remains unchanged
});
test('Rank 5 dual-type hybrid is limited to six targets and once per 12 seconds',()=>{
 const h=setup(5,'fire',['fire','flying']),pl=new h.Player();
 stage4.install(h.Player,G.DB);pl.setAbility(10);
 const main=enemy(),ten=Array.from({length:10},()=>enemy());
 G.EnemyMgr.queryCircle=()=>[main,...ten];
 const traits=pl._pkmbxRankTraits;
 assert.equal(traits.hybrid,true);
 const affected=stage4.hybridHit(pl,main,traits,10000);
 assert.equal(affected,6);
 assert.equal(ten.filter(x=>x.status.hit>0).length,6);
 assert.equal(stage4.hybridHit(pl,main,traits,10001),0);
 assert.equal(stage4.hybridHit(pl,main,traits,22010),6);
});
test('Rank 5 hybrid still triggers on fatal blows, but cannot apply burn to a dead Pokémon',()=>{
 const h=setup(5,'fire',['fire','flying']),pl=new h.Player();
 stage4.install(h.Player,G.DB);pl.setAbility(10);
 const finalTarget=enemy({dead:true});
 const targets=[enemy(),enemy()];
 G.EnemyMgr.queryCircle=()=>[finalTarget,...targets];
 const result=stage4.procHit(pl,finalTarget,{type:'fire'},pl._pkmbxRankTraits,()=>0,10000);
 assert.equal(result.proc,false);
 assert.equal(result.hybrid,2);
 assert.ok(targets.every(e=>e.status.hit===1));
 assert.equal(finalTarget.status.burn,0);
});
test('Rank stat boost also stays out of Champion and Royale, not merely Co-op',()=>{
 const h=setup(5,'fire');
 G.Mons={monFor:dex=>({dex,hp:100,pa:20,sa:30})};
 stage2.hookPveStats(G.Mons,G.DB);
 assert.equal(G.Mons.monFor(6).hp,130);
 G.PKMSVVChampionArena={active:true};
 assert.equal(G.Mons.monFor(6).hp,100);
 G.PKMSVVChampionArena.active=false;G.Royale.active=true;
 assert.equal(G.Mons.monFor(6).hp,100);
});
test('monotype branch receives a strengthened specialized Rank 5 effect',()=>{
 const h=setup(5,'offense',['electric']),pl=new h.Player();
 stage4.install(h.Player,G.DB);pl.setAbility(10);
 const e=enemy(),ten=[enemy(),enemy()];
 G.EnemyMgr.queryCircle=()=>[e,...ten];
 assert.equal(pl._pkmbxRankTraits.branch,'offense');
 assert.equal(stage4.procHit(pl,e,{type:'normal'},pl._pkmbxRankTraits,()=>0,10000).hybrid,2);
 assert.ok(ten.every(x=>x.status.hit>0));
});
test('flying evasion and steel defense augment, never replace, the existing Ability',()=>{
 let h=setup(3,'flying'),pl=new h.Player();
 stage4.install(h.Player,G.DB);pl.setAbility(10);
 assert.equal(pl.abil.dodge(pl),.08);
 assert.equal(pl.abil.inMul(pl),.8);
 assert.equal(pl.abil.out(pl,{}),1.25);
 h=setup(5,'steel',['steel','psychic']);pl=new h.Player();
 stage4.install(h.Player,G.DB);pl.setAbility(10);
 assert.ok(Math.abs(pl.abil.inMul(pl)-.8*.90)<1e-8);
 assert.equal(pl.abil.dodge(pl),.02);
});
test('Rank traits disabled for Co-op, Arena/Champion, Berry and Royale',()=>{
 const h=setup(5,'fire'),pl=new h.Player();
 G.Coop.active=true;stage4.install(h.Player,G.DB);pl.setAbility(10);
 assert.equal(pl._pkmbxRankId,undefined);
 G.Coop.active=false;G.PKMSVVChampionArena={active:true};
 const q=new h.Player();q.setAbility(10);
 assert.equal(q._pkmbxRankId,undefined);
 G.PKMSVVChampionArena.active=false;G.Royale.active=true;
 assert.equal(stage4.forPlayer(new h.Player(),G.DB),null);
 G.Royale.active=false;G.PKMSVVBerryRescue={active:true};
 assert.equal(stage4.forPlayer(new h.Player(),G.DB),null);
});
test('Rank mutation through a Prism keeps type, rank and item of the actual fighter',()=>{
 const h=setup(5,'fire'),pl=new h.Player();
 stage4.install(h.Player,G.DB);pl.setAbility(10);
 h.s.pkmsvvReforgePrisms=1;
 const before=JSON.stringify(h.s.owned);
 const p=stage3.resetBranch(h.item.id,'flying',h.s);
 assert.equal(p.rank,5);
 assert.equal(JSON.stringify(h.s.owned),before);
 const another=new h.Player();another.setAbility(10);
 assert.equal(another._pkmbxRankTraits.branch,'flying');
 assert.ok(stage3.count(h.s)===0);
});
test('matching rate and 180-kill pity do not force 180 save writes in a crowded run',()=>{
 const h=setup(5,'fire');h.s.pkmsvvReforgePity=0;
 for(let k=0;k<74;k++){
  const mob={dex:6,dead:true,remote:false};
  const result=stage3.defeated(mob,()=>1,h.s);
  assert.equal(result.dropped,false);
 }
 assert.equal(stage3.pity(h.s),74);
 assert.equal(h.writes,2,'flush at KO #25 and KO #50 only');
 assert.equal(stage3.flushPity(),true);
 assert.equal(h.writes,3);
 assert.equal(stage3.flushPity(),false);
 const guaranteedState=JSON.parse(JSON.stringify(h.s));
 assert.equal(guaranteedState.pkmsvvReforgePity,74);
});
test('no drop mutation if game is not playing and Prism cap resets at run boundary',()=>{
 const h=setup();
 G.Game.state='menu';
 assert.equal(stage3.defeated({dex:6,dead:true},()=>0,h.s).eligible,false);
 assert.equal(h.writes,0);
 G.Game.state='playing';
 assert.equal(stage3.defeated({dex:6,dead:true},()=>0,h.s).dropped,true);
 assert.equal(h.writes,1);
 const other=stage3.defeated({dex:6,dead:true},()=>0,h.s);
 assert.equal(other.eligible,false);
 // This mocked EnemyMgr is not wrapped in this test: simulate the new-run boundary explicitly.
 stage3.resetRun();
 assert.equal(stage3.runDrops(),0);
});
test('Stage 4 source remains in separate QA packagers, never in production scripts',()=>{
 const p=path.join(__dirname,'..');
 for(const src of ['scripts/build-pokebox-stage1-qa.cjs','scripts/build-pokebox-stage1-pc-qa.cjs']){
  const t=fs.readFileSync(path.join(p,src),'utf8');
  assert.match(t,/pkmsvv-box-stage4\.js/);
 }
 const prod=fs.readFileSync(path.join(p,'scripts/prepare-game.cjs'),'utf8');
 assert.doesNotMatch(prod,/pkmsvv-box-stage4/);
});
