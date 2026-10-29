'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('The Home mint background is transparent and does not cover animated game Pokémon',()=>{
 const css=read('src/pkmsvv-phase1-pastel.css');
 assert.match(css,/background:linear-gradient\(180deg,rgba\(237,250,246,\.06\)/);
 assert.match(css,/background-color:transparent!important/);
 assert.match(css,/backdrop-filter:none!important/);
 assert.match(css,/pkmsvv-credit\{color:#153b4e!important/);
 assert.match(css,/\.pkmsvv-offline-save-note\{color:#23485a!important/);
});
test('Solo support capture is 2 seconds and incubation is two thirds of former 45 seconds',()=>{
 const G={};vm.runInNewContext(read('src/v15/eggs.js'),{G,Math});
 assert.equal(G.PKMSVVEggs.COLLECT_TIME,2);
 assert.equal(G.PKMSVVEggs.HATCH_BASE,30);
 assert.ok(Math.abs(G.PKMSVVEggs.HATCH_MIN-40/3)<.0001);
 assert.equal(G.PKMSVVEggs.SHINY_CAST_RATIO,2/3);
 assert.equal(G.PKMSVVEggs.SHINY_SKILL_POWER,1.5);
});
test('Solo Shiny Pichu casts at 2/3 cooldown, stuns 1.5x longer (not >4 targets)',()=>{
 function trial(shiny){
  const events=[],pl={x:0,y:0,dead:false,kills:0,level:1,maxHp:120,hp:120};
  const enemy={x:80,y:0,dead:false,remote:false,applyStun(v){events.push(v)}};
  const G={DB:{save:{stats:{}}},U:{dist2:(a,b,c,d)=>(a-c)**2+(b-d)**2},
   Coop:{active:false},EnemyMgr:{all:()=>[enemy]},World:{isFree:()=>true,isLiquid:()=>false},
   FX:{ring(){},burst(){},dmgText(){}},Spawner:{say(){}},Sprites:{preload(){}}};
  vm.runInNewContext(read('src/v15/eggs.js'),{G,Math});
  G.PKMSVVEggs.begin(pl,false);
  const pet={id:1,dex:172,hatched:true,active:true,shiny,statScale:1,x:0,y:0,
   hp:120,maxHp:120,spd:100,cooldown:0,shield:0,hitCooldown:0};
  G.PKMSVVEggs.followers.push(pet);
  G.PKMSVVEggs.update(.1,pl,100,false);
  return {pet,events};
 }
 const n=trial(false),s=trial(true);
 assert.equal(n.pet.cooldown,10);
 assert.ok(Math.abs(s.pet.cooldown-20/3)<1e-8);
 assert.equal(n.events[0],1.1);
 assert.ok(Math.abs(s.events[0]-1.65)<1e-8);
});
test('True Shiny support improves buffs and Ditto damage but preserves shields cap',()=>{
 const s=read('src/v15/eggs.js'),p=read('scripts/patch-v15-eggs.cjs');
 assert.match(s,/ally\.maxHp\*spec\.power\*it\.statScale\*\(it\.affinityBoost\|\|1\)\*\(it\.shiny\?SHINY_SKILL_POWER:1\)/);
 assert.match(s,/Math\.min\(ally\.maxHp\*\.25/);
 assert.match(p,/it\.shiny\?1\.5:1/);
});
test('Co-op/Survival support has 30s hatch, Shiny host roll and faster/stronger skills',()=>{
 const c=read('src/web/pkmsvv-egg-rush.js');
 assert.match(c,/SUPPORT_HATCH=30,SUPPORT_MIN_HATCH=40\/3/);
 assert.match(c,/supportShiny=supportMode&&Math\.random\(\)<eggShinyChance/);
 assert.match(c,/pet\.age>=SUPPORT_MIN_HATCH&&pet\.age\+\(pet\.boost\|\|0\)>=SUPPORT_HATCH/);
 assert.match(c,/SHINY_CAST_RATIO=2\/3,SHINY_SKILL_POWER=1\.5/);
 assert.match(c,/if\(active\)return; \/\/ Egg Rush: sealed eggs NEVER hatch mid-match/);
 assert.match(read('src/pkmsvv-support-catalog.js'),/Shiny: Chỉ số vượt trội · Kỹ năng vượt trội/);
});

test('Initial shiny support cooldown is accelerated immediately and full movement stat is retained in Co-op',()=>{
 assert.match(read('src/v15/eggs.js'),/if\(it\.shiny\)it\.cooldown=Math\.max\(0,it\.cooldown\|\|0\)\*SHINY_CAST_RATIO/);
 assert.match(read('src/web/pkmsvv-egg-rush.js'),/baseSpeed\*\(pet\.shiny\?1:\.85\)/);
});
