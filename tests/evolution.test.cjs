'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'evolution-rules.json'), 'utf8'));
const m = n => ({dex:n, name:'#'+n, hp:100+(n%10), spd:90+(n%7), atk:1+(n%5)/10});
const dex = {};const sprite = {};
for(const r of data.rules){dex[r.from]=m(r.from);dex[r.to]=m(r.to);sprite[r.from]={};sprite[r.to]={};}
const sandbox = {
 G:{
  PKMSVV_EVOLUTION_DATA:data,DEX_BY:dex,SPRITE_META:sprite,
  Sprites:{hasShiny:()=>true,playerScale:()=>1,playerRadius:()=>16,bodyHeight:()=>32,Animator:class{constructor(){this.dir=0;}},preload:()=>{}},
  Moves:{BY_ID:{}},
  DB:{save:{coins:2000},commit(){}},
  World:{biome:0},
  Weather:{current:null},
  FX:{ring(){},burst(){}},Audio:{sfx(){}},Spawner:{say(){}}
 },
 document:{},console
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'src','pkmsvv-evolution.js'),'utf8').replace('__PKMSVV_HP_FACTOR__','1.15'),sandbox);
const evo = sandbox.G.PKMSVVEvo;
function pl(dexNo,level){const mon=dex[dexNo];const p={mon,dex:dexNo,level,hp:100,maxHp:100,baseAtk:mon.atk,baseSpd:mon.spd,
 x:0,y:0,scale:1,r:16,bodyH:32,anim:{dir:0},shiny:false,moves:[],bosses:0,remote:false,
 hasMove:()=>false};evo.reset(p);return p;}
const rule=(from,to)=>data.rules.find(r=>r.from===from&&r.to===to);
test('966-species source, evolution links and notable Pokédex levels',()=>{
 assert.ok(data.rules.length>=440);
 assert.equal(rule(4,5).level,16);assert.equal(rule(5,6).level,36);
 assert.equal(rule(1,2).level,16);assert.equal(rule(2,3).level,32);
 assert.equal(rule(129,130).level,20);
});
test('Charmander evolves exactly at level 16 while retaining combat progression',()=>{
 const p=pl(4,15);p.hp=60;p.moves=[{id:'ember',type:'fire'}];
 assert.equal(evo.eligible(p,10,rule(4,5)),false);
 p.level=16;assert.equal(evo.eligible(p,10,rule(4,5)),true);
 assert.equal(evo.evolve(p,rule(4,5)),true);
 assert.equal(p.dex,5);assert.equal(p.moves[0].id,'ember');
 assert.ok(p.hp/p.maxHp>0.59&&p.hp/p.maxHp<0.61);
 p.level=35;assert.equal(evo.eligible(p,100,rule(5,6)),false);
 p.level=36;assert.equal(evo.eligible(p,100,rule(5,6)),true);
});
test('Evolution stones require boss-earned shards and consume one',()=>{
 const p=pl(25,20),r=rule(25,26);
 assert.equal(r.item,'thunder-stone');
 assert.equal(evo.eligible(p,100,r),false);
 p.bosses=1;evo.tick(p,180);
 assert.equal(p.pkmEvoShards,1);
 assert.equal(evo.eligible(p,180,r),true);
 assert.equal(evo.evolve(p,r),true);
 assert.equal(p.pkmEvoShards,0);
});
test('Eevee branches use weather-independent stones or friendship + time',()=>{
 const p=pl(133,10);
 assert.equal(rule(133,134).item,'water-stone');
 assert.equal(evo.eligible(p,0,rule(133,196)),false);
 p.level=25;
 assert.equal(evo.eligible(p,0,rule(133,197)),false);
 assert.equal(evo.eligible(p,240,rule(133,197)),true);
 assert.equal(evo.eligible(p,960,rule(133,196)),true);
});
test('Inkay requires level 30 and Haunter trade requires a link shard',()=>{
 const ink=pl(686,29);
 assert.equal(evo.eligible(ink,100,rule(686,687)),false);
 ink.level=30;assert.equal(evo.eligible(ink,100,rule(686,687)),true);
 const g=pl(93,45);
 assert.equal(evo.eligible(g,100,rule(93,94)),false);
 g.pkmEvoShards=1;
 assert.equal(evo.eligible(g,100,rule(93,94)),true);
});
test('Finizen solo replacement requires level 38 and boss',()=>{
 const p=pl(963,37),r=rule(963,964);
 assert.ok(r);
 assert.equal(evo.eligible(p,100,r),false);
 p.level=38;p.bosses=1;
 assert.equal(evo.eligible(p,100,r),true);
});
test('Shedinja is not a replacement evolution for Nincada',()=>{
 const p=pl(290,20);p.bosses=2;
 assert.equal(evo.eligible(p,180,rule(290,292)),false);
});

test('Gimmighoul consumes 999 coins, Meltan needs four bosses',()=>{
 const p=pl(999,40),r=rule(999,1000);
 assert.ok(r);
 sandbox.G.DB.save.coins=998;
 assert.equal(evo.eligible(p,100,r),false);
 sandbox.G.DB.save.coins=1000;
 assert.equal(evo.eligible(p,100,r),true);
 assert.equal(evo.evolve(p,r),true);
 assert.equal(sandbox.G.DB.save.coins,1);
 const m=pl(808,20);m.bosses=3;
 assert.equal(evo.eligible(m,100,rule(808,809)),false);
 m.bosses=4;assert.equal(evo.eligible(m,100,rule(808,809)),true);
});
test('Bisharp requires three bosses',()=>{
 const p=pl(625,45);p.bosses=1;
 assert.equal(evo.eligible(p,100,rule(625,983)),false);
 p.bosses=3;assert.equal(evo.eligible(p,100,rule(625,983)),true);
});

test('Sylveon fallback unlocks when Fairy moves are unavailable in source',()=>{
 const p=pl(133,25),r=rule(133,700);
 p.pkmEvoCasts=29;
 assert.equal(evo.eligible(p,960,r),false);
 p.pkmEvoCasts=30;
 assert.equal(evo.eligible(p,960,r),true);
});

test('Eevee evolution menu exposes all eight routes, but locks unmet forms',()=>{
 const p=pl(133,8);p.pkmEvoShards=1;
 const options=evo.choiceRoutes(p,30);
 assert.equal(options.length,8,'Five stone-based and three friendship-based forms must remain visible');
 assert.equal(options.filter(x=>x.unlocked).length,5);
 for(const to of [134,135,136,470,471]) assert.equal(options.find(x=>x.rule.to===to).unlocked,true);
 for(const to of [196,197,700]) {
   const locked=options.find(x=>x.rule.to===to);
   assert.equal(locked.unlocked,false);
   assert.match(evo.pendingReason(p,30,locked.rule),/Thân thiết/);
 }
 p.level=25;
 assert.equal(evo.choiceRoutes(p,30).find(x=>x.rule.to===196).unlocked,true);
 assert.equal(evo.choiceRoutes(p,30).find(x=>x.rule.to===197).unlocked,false);
 assert.equal(evo.choiceRoutes(p,260).find(x=>x.rule.to===197).unlocked,true);
 p.pkmEvoCasts=30;
 assert.equal(evo.choiceRoutes(p,260).find(x=>x.rule.to===700).unlocked,true);
});
test('Eevee can optionally convert highest-upgraded non-evolved Normal attack without losing slots',()=>{
 const defs={
   'water-gun':{id:'water-gun',type:'water',maxLvl:7,cd:5},
   'thunder-shock':{id:'thunder-shock',type:'electric',maxLvl:6,cd:4},
   'ember':{id:'ember',type:'fire',maxLvl:7,cd:6}
 };
 const original=sandbox.G.Moves;
 sandbox.G.Moves={...original,BY_ID:defs,
   instance:(id,lvl)=>({id,kind:'projectile',type:defs[id].type,cd:defs[id].cd,def:defs[id],lvl,t:0})};
 try{
   const p=pl(133,22);
   const upgraded={id:'tackle',type:'normal',kind:'melee',lvl:5,cd:10,t:5,since:8};
   const other={id:'quick-attack',type:'normal',kind:'dash',lvl:3,evolved:true};
   const buff={id:'swords-dance',type:'normal',kind:'buff',lvl:4};
   p.moves=[upgraded,other,buff];p.slots=[[upgraded],[other],[buff]];p.bind={tackle:0};
   p.pkmEvoShards=1;
   assert.equal(evo.evolve(p,rule(133,134),{convertNormal:true}),true);
   assert.equal(p.dex,134);
   assert.equal(p.moves[0].id,'water-gun');
   assert.equal(p.moves[0].lvl,5);
   assert.equal(p.moves[0].t,2.5);
   assert.equal(p.moves[0].since,8);
   assert.equal(p.slots[0][0],p.moves[0]);
   assert.equal(p.moves[1],other);
   assert.equal(p.moves[2],buff);
   assert.equal(p.slots.length,3);
   assert.equal(p.bind['water-gun'],0);
   const keep=pl(133,22),old={id:'tackle',type:'normal',kind:'melee',lvl:6};
   keep.moves=[old];keep.slots=[[old]];keep.pkmEvoShards=1;
   assert.equal(evo.evolve(keep,rule(133,136),{convertNormal:false}),true);
   assert.equal(keep.moves[0],old,'Opting out must keep full invested Normal move');
   assert.equal(keep.moves[0].lvl,6);
 }finally {sandbox.G.Moves=original;}
});
