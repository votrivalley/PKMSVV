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
test('Successful local evolution notifies Pokédex with real from/to after history commit',()=>{
 const p=pl(4,16),events=[];
 sandbox.G.Game={player:p};
 sandbox.G.PKMSVVDexDefeats={markEvolved(...args){events.push(args)}};
 try{
  assert.equal(evo.evolve(p,rule(4,5)),true);
  assert.equal(events.length,1);
  assert.equal(events[0][1],4);
  assert.equal(events[0][2],5);
  assert.equal(events[0][3],p);
 }finally{delete sandbox.G.Game;delete sandbox.G.PKMSVVDexDefeats;}
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

test('Evolving any Pokémon can exchange one owned skill for one new species move at an equivalent upgrade level',()=>{
 const oldMoves=sandbox.G.Moves;
 sandbox.G.Moves={BY_ID:{
  'ember':{id:'ember',type:'fire',maxLvl:7},
  'fire-spin':{id:'fire-spin',type:'fire',maxLvl:6}
 },poolFor:()=>['ember','fire-spin'],instance:(id,lvl)=>({id,kind:'projectile',lvl,cd:4,t:0})};
 try{
  const p=pl(4,16),old={id:'ember',type:'fire',kind:'projectile',lvl:5,cd:10,t:5,since:3};
  p.moves=[old];p.slots=[[old]];p.bind={ember:1};
  assert.equal(evo.evolve(p,rule(4,5),{convertNormal:false}),true);
  assert.deepEqual(Array.from(evo.skillSwapOptions(p)),['fire-spin']);
  const swapped=evo.swapSkill(p,'ember','fire-spin');
  assert.equal(swapped.lvl,5);
  assert.equal(p.moves.length,1);
  assert.equal(p.moves[0].id,'fire-spin');
  assert.equal(p.moves[0].lvl,5);
  assert.equal(p.moves[0].t,2);
  assert.equal(p.moves[0].since,3);
  assert.equal(p.slots[0][0],p.moves[0]);
  assert.equal(p.bind['fire-spin'],1);
  assert.equal(evo.swapSkill(p,'fire-spin','ember'),false,'do not offer an unavailable or already learned species move');
 }finally{sandbox.G.Moves=oldMoves;}
});

test('evolution offers exactly three random species moves, prioritizing evolved-exclusive moves',()=>{
 const original=sandbox.G.Moves;
 const defs=Object.fromEntries(['ember','tackle','quick-attack','flame-wheel','fire-spin','heat-wave','smokescreen','flare-blitz']
  .map(id=>[id,{id,type:id.includes('fire')||id.includes('flame')?'fire':'normal',maxLvl:7}]));
 const before=['ember','tackle','quick-attack'];
 const after=[...before,'flame-wheel','fire-spin','heat-wave','smokescreen','flare-blitz'];
 sandbox.G.Moves={BY_ID:defs,poolFor:mon=>mon?.dex===4?before:after,
  instance:(id,lvl)=>({id,lvl,cd:4,t:0})};
 try{
  const p=pl(4,16),old={id:'ember',lvl:5,cd:10,t:5,type:'fire'};
  p.moves=[old];p.slots=[[old]];p.bind={ember:1};
  assert.equal(evo.evolve(p,rule(4,5),{convertNormal:false}),true);
  const chosen=Array.from(evo.skillSwapChoices(p,()=>.7));
  assert.equal(chosen.length,3);
  assert.equal(new Set(chosen).size,3);
  assert.ok(chosen.every(id=>!before.includes(id)),'prioritize moves unavailable to Charmander');
  assert.deepEqual(Array.from(evo.skillSwapChoices(p,()=>0)),chosen,'offer does not reroll when viewing a different old move');
  const unoffered=after.find(id=>!before.includes(id)&&!chosen.includes(id));
  assert.equal(evo.swapSkill(p,'ember',unoffered),false,'cannot silently choose an unoffered fourth skill');
  const got=evo.swapSkill(p,'ember',chosen[0]);
  assert.equal(got.to,chosen[0]);assert.equal(got.lvl,5);
  assert.equal(p.moves[0].lvl,5);assert.equal(p.slots[0][0],p.moves[0]);
  assert.equal(p.pkmEvoSwapAvailable,false);
  assert.equal(evo.swapSkill(p,chosen[0],chosen[1]),false,'only one swap per evolution');
 }finally{sandbox.G.Moves=original;}
});
test('when only two moves are newly evolved, third offer comes from the natural shared pool',()=>{
 const previous=sandbox.G.Moves;
 sandbox.G.Moves={BY_ID:Object.fromEntries(['old','shared1','shared2','new1','new2'].map(id=>[id,{id,maxLvl:4,type:'normal'}])),
  poolFor:mon=>mon?.dex===4?['old','shared1','shared2']:['old','shared1','shared2','new1','new2'],
  instance:(id,lvl)=>({id,lvl,cd:3,t:0})};
 try{
  const p=pl(4,16),old={id:'old',lvl:2,cd:3,t:0};p.moves=[old];p.slots=[[old]];
  evo.evolve(p,rule(4,5),{convertNormal:false});
  const offers=Array.from(evo.skillSwapChoices(p,()=>.2));
  assert.equal(offers.length,3);
  assert.ok(offers.includes('new1')&&offers.includes('new2'));
  assert.ok(offers.some(id=>id.startsWith('shared')));
 }finally{sandbox.G.Moves=previous;}
});
test('competitive evolution is presented as live corner HUD, without pausing gameplay',()=>{
 const previousMoves=sandbox.G.Moves,previousDoc=sandbox.document;
 const state=sandbox.G.Game={state:'playing',st:{time:90},player:null};
 sandbox.G.Royale={active:true};
 sandbox.G.Moves={BY_ID:{
  'ember':{id:'ember',type:'fire',name:'Ember',maxLvl:7},
  'flame-wheel':{id:'flame-wheel',type:'fire',name:'Flame Wheel',maxLvl:7},
  'fire-spin':{id:'fire-spin',type:'fire',name:'Fire Spin',maxLvl:7},
  'heat-wave':{id:'heat-wave',type:'fire',name:'Heat Wave',maxLvl:7}},
  poolFor:mon=>mon?.dex===4?['ember']:['ember','flame-wheel','fire-spin','heat-wave'],
  instance:(id,lvl)=>({id,lvl,cd:4,t:0})};
 function node(tag){
  return {tagName:tag.toUpperCase(),children:[],attrs:{},className:'',textContent:'',
   dataset:{},append(...items){this.children.push(...items);items.forEach(x=>{x.parent=this})},
   appendChild(el){this.append(el);return el},
   replaceChildren(){this.children=[]},
   setAttribute(k,v){this.attrs[k]=v},
   querySelector(selector){return selector==='button'?this.children.find(x=>x.tagName==='BUTTON'):null},
   focus(){},remove(){this.removed=true;this.parent?.children?.splice(this.parent.children.indexOf(this),1)}};
 }
 const body=node('body');body.appendChild=function(el){this.append(el)};
 sandbox.document={body,createElement:node};
 try{
  const p=pl(4,16);p.moves=[{id:'ember',lvl:4,cd:5,t:3}];p.slots=[[p.moves[0]]];
  state.player=p;
  evo.evolve(p,rule(4,5),{convertNormal:false});
  let done=0;evo.showSkillSwap(p,()=>done++);
  const modal=body.children.at(-1);
  assert.match(modal.className,/pkmsvv-evo-live/);
  assert.equal(modal.attrs['aria-modal'],undefined,'unpaused overlay must not be a blocking dialog');
  const cards=modal.children[0].children.find(x=>x.className==='pkmsvv-evo-live-cards');
  assert.equal(cards.dataset.stage,'current');
  cards.children[0].onclick();
  assert.equal(cards.dataset.stage,'replacement');
  assert.equal(cards.children.length,3);
  assert.equal(state.state,'playing','no pause or state transition');
  cards.children[1].onclick();
  assert.equal(done,1);
  assert.equal(p.moves.length,1);
  assert.equal(modal.removed,true);
  assert.equal(state.state,'playing');
 }finally{sandbox.G.Moves=previousMoves;sandbox.document=previousDoc;delete sandbox.G.Royale;delete sandbox.G.Game;}
});

test('an evolved Arena fighter retains every permanently awakened slot up to eight',()=>{
 const before=sandbox.G.PKMSVVSkillTrack,oldDb=sandbox.G.DB;
 try{
  sandbox.G.PKMSVVSkillTrack={progress(){return {count:8}}};
  sandbox.G.DB={save:{pkmsvvSkillMarks:{k50:true,k100:true,k200:true,u10:true,u20:true}},commit(){}};
  const p=pl(4,20);p.moves=[{id:'ember',type:'fire',lvl:3}];p.maxMoves=3;
  assert.equal(evo.evolve(p,rule(4,5),{convertNormal:false}),true);
  assert.equal(p.maxMoves,8,'already unlocked eight Skill Awakening slots remain usable');
  assert.equal(p.moves.length,1,'slots unlock capacity but do not mint free skills');
  assert.equal(p.moves[0].lvl,3,'existing learned move rank stays intact');
 }finally{sandbox.G.PKMSVVSkillTrack=before;sandbox.G.DB=oldDb;}
});
test('native Arena evolution never sets choice/paused state or stalls pending skill level-ups',()=>{
 const original={Game:sandbox.G.Game,Champion:sandbox.G.PKMSVVChampionArena,
  UI:sandbox.G.UI,Moves:sandbox.G.Moves,document:sandbox.document};
 const plr=pl(4,20),known={id:'ember',lvl:3,type:'fire',cd:5,t:1};
 plr.moves=[known];plr.slots=[[known]];plr.maxMoves=8;
 sandbox.G.Game={state:'playing',player:plr,st:{time:96,pendingLevels:2}};
 sandbox.G.PKMSVVChampionArena={active:true};
 sandbox.G.UI={isOpen(){return false}};
 sandbox.G.Moves={BY_ID:{ember:{id:'ember',maxLvl:7}},
  poolFor(){return []},instance(id,lvl){return {id,lvl}}};
 const body={children:[],appendChild(el){this.children.push(el);el.parent=this}};
 function el(tag){
  return {tagName:tag.toUpperCase(),children:[],className:'',disabled:false,
   addEventListener(_name,fn){this.onclick=fn},
   setAttribute(){},appendChild(item){this.children.push(item);item.parent=this},
   append(...items){for(const item of items)this.appendChild(item)},
   remove(){this.removed=true;const i=this.parent?.children.indexOf(this);if(i>=0)this.parent.children.splice(i,1)}};
 }
 sandbox.document={body,createElement:el,querySelector(){return null}};
 try{
  assert.equal(evo.tryOpen(plr,96,()=>{sandbox.G.Game.state='choice'}),false,
   'legacy native hook must not enter blocking choice state in Arena');
  assert.equal(sandbox.G.Game.state,'playing');
  assert.equal(evo.tryLiveCompetitive(plr,96),true,
   'live picker still opens independently of the native hook');
  assert.equal(sandbox.G.Game.state,'playing');
  assert.equal(body.children.length,1);
  const modal=body.children[0],panel=modal.children[0];
  assert.match(modal.className,/pkmsvv-evo-live/);
  const selection=panel.children.find(x=>x.tagName==='BUTTON'&&!x.disabled);
  assert.ok(selection);
  selection.onclick();
  assert.equal(plr.dex,5);
  assert.equal(plr.level,20);
  assert.equal(plr.moves[0],known,'evolution does not wipe the learned move');
  assert.equal(plr.slots[0][0],known,'evolution retains move slots');
  assert.equal(plr.maxMoves,8,'evolution never reduces maximum skills to three');
  assert.equal(sandbox.G.Game.st.pendingLevels,2,'queued level-up rewards must not be erased');
  assert.equal(sandbox.G.Game.state,'playing','battle time keeps moving during evolution');
  assert.equal(evo.tryLiveCompetitive(plr,96),false,'evolution does not reopen endlessly');
 }finally{
  sandbox.G.Game=original.Game;sandbox.G.PKMSVVChampionArena=original.Champion;
  sandbox.G.UI=original.UI;sandbox.G.Moves=original.Moves;sandbox.document=original.document;
 }
});
