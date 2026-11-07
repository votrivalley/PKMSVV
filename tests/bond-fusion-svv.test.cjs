'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const IDs=['ember-quick','water-tackle','grass-spin','spark-quick','mind-tackle',
 'fire-gust','bubble-ice','leaf-rock','shadow-mind','thunder-claw'];
function setup(){
 const blasts=[],rings=[],toasts=[],enemies=[],saved={coins:250,owned:{25:{at:1}}};
 class Enemy{
  constructor(x=70,y=8,hp=1200){
   this.x=x;this.y=y;this.hp=hp;this.maxHp=hp;this.dead=false;
   this.hits=[];this.slowed=[];this.stunned=[];this.r=10;
  }
  hurt(amount){this.hp-=amount;this.hits.push(amount);if(this.hp<=0)this.dead=true;}
  applySlow(a,t){this.slowed.push({a,t});}
  applyStun(t){this.stunned.push(t);}
 }
 class Player{
  constructor(){
   this.x=0;this.y=0;this.level=25;this.baseAtk=1;this.atkMul=1;
   this.moves=[];this.slots=[];this.active=0;this.bind={};this.bonds=2;
   this.dead=false;this.remote=false;this.lanBot=false;this.baseCasts=0;
  }
  cast(){this.baseCasts++;}
  bondOptions(){return {mode:'pair',loose:this.slots.flat(),group:null};}
  fuse(){this.bonds--;return [];}
 }
 const G={
  I18n:{lang:'vi'},DB:{save:saved},Moves:{
   ALL:Array.from({length:103},(_,i)=>({id:'skill-'+i})),
   BY_ID:Object.fromEntries(['ember','quick-attack','water-gun','tackle',
    'vine-whip','rapid-spin','thunder-shock','confusion','flamethrower','gust',
    'bubble-beam','ice-shard','razor-leaf','rock-tomb','shadow-ball','psychic',
    'thunderbolt','metal-claw'].map(id=>[id,{id,name:id,kind:'projectile',maxLvl:3}])),
   levelUp(m){m.lvl=Math.min(m.def?.maxLvl||3,m.lvl+1);}
  },
  Player,Enemy,
  EnemyMgr:{all:()=>enemies},
  FX:{ring(...args){rings.push(args)},burst(...args){blasts.push(args)}},
  Audio:{sfx(){}},U:{dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2},
  World:{isFree:()=>true},
  Game:{state:'playing',st:{time:90},player:null,togglePause(){this.state='playing'}},
  Combat:{tick(dt,pl){this.ticks=(this.ticks||0)+1}},
  UI:{toast:s=>toasts.push(s),isOpen:()=>false,hide(){}},
  LevelUp:{offer(){return []}},
  Icons:{html:key=>'<svg>'+key+'</svg>',draw(){return 'native'}},
  Coop:{active:false},Royale:{active:false},EggRush:{active:false},
  PKMSVVArenaSolo:{active:false},PKMSVVChampionArena:{active:false}
 };
 const document={getElementById(){return null},querySelector(){return null},
  addEventListener(){},body:null};
 const sandbox={G,document,Image:class{
  constructor(){this.complete=true;this.naturalWidth=256;}
  set src(value){this._src=value;}
 },console,setInterval(){}};
 vm.createContext(sandbox);
 vm.runInContext(read('src/pkmsvv-bond-fusion.js'),sandbox);
 vm.runInContext(read('src/pkmsvv-fusion-evolved.js'),sandbox);
 const m=(id,lvl=3)=>({id,name:id,type:'normal',lvl,
  kind:'projectile',cd:2.2,t:0,def:{id,name:id,kind:'projectile',maxLvl:3,cd:2.2}});
 const pl=new Player();G.Game.player=pl;
 const stock=(...skills)=>{
  pl.moves=skills.map(([id,lvl])=>m(id,lvl??3));
  pl.slots=pl.moves.map(x=>[x]);
  return pl.moves;
 };
 return {G,api:G.PKMSVVFusionPilot,fx:G.PKMSVVFusionEvolved,pl,m,
  stock,enemies,blasts,rings,toasts,saved,Enemy};
}
test('all ten original Fusion WebP files exist, unique and match exact recipes',()=>{
 const h=setup();
 assert.equal(h.api.RECIPES.length,10);
 assert.deepEqual(Array.from(h.api.RECIPES,r=>r.id),IDs);
 assert.equal(h.fx.EFFECTS.length,10);
 assert.equal(new Set(Object.values(h.fx.CONFIG).map(x=>x.kind)).size,10,
  'every evolved skill must use a distinct effect behavior');
 for(const r of h.api.RECIPES){
  assert.equal(r.ids.length,2);
  assert.notEqual(r.ids[0],r.ids[1]);
  const filename=path.join(root,'assets/fusion-icons',r.id+'.webp');
  assert.ok(fs.existsSync(filename),'missing '+filename);
  assert.ok(fs.statSync(filename).size>1000);
  assert.match(h.fx.assets[r.id],new RegExp(r.id+'\\.webp$'));
 }
});
test('MAX+MAX is mandatory; one below MAX blocks Fusion, even with real Rift Bonds',()=>{
 const h=setup();
 h.stock(['ember',3],['quick-attack',2]);
 assert.equal(h.fx.maxed(h.pl.moves[0]),true);
 assert.equal(h.fx.maxed(h.pl.moves[1]),false);
 assert.equal(h.api.options(h.pl),null);
 assert.equal(h.fx.evolve(h.pl,'ember-quick'),null);
 assert.equal(h.pl.moves.length,2);
 assert.equal(h.pl.bonds,2,'earned Rift Bonds stay independent');
 h.G.Moves.levelUp(h.pl.moves[1]);
 assert.equal(h.api.progress(h.pl)[0].maxed,2);
 assert.deepEqual(Array.from(h.fx.choices(h.pl),r=>r.id),['ember-quick']);
 assert.equal(h.api.options(h.pl).mode,'evolved');
});
test('successful MAX+MAX Fusion replaces TWO source moves with ONE maxed new skill, frees a slot',()=>{
 const h=setup();
 const [ember,quick,other]=h.stock(['ember',3],['quick-attack',3],['tackle',3]);
 const saveBefore=JSON.stringify(h.saved),originalBonds=h.pl.bonds;
 const upgraded=h.fx.evolve(h.pl,'ember-quick');
 assert.ok(upgraded);
 assert.equal(upgraded.id,'pkmsvv-fusion:ember-quick');
 assert.equal(upgraded.pkmsvvFusionId,'ember-quick');
 assert.equal(upgraded.kind,'projectile');
 assert.equal(upgraded.lvl,1);
 assert.equal(upgraded.def.maxLvl,1,'evolved Fusion is a MAX skill');
 assert.equal(h.pl.moves.length,2,'two MAX skills become exactly one');
 assert.equal(h.pl.slots.length,2,'an extra learning slot is freed');
 assert.equal(h.pl.moves.filter(m=>m===upgraded).length,1);
 assert.equal(h.pl.moves.includes(ember),false);
 assert.equal(h.pl.moves.includes(quick),false);
 assert.equal(h.pl.moves.includes(other),true,'unrelated skill survives');
 assert.equal(h.pl._pkmsvvFusionUsed,1);
 assert.equal(h.api.options(h.pl),null);
 assert.equal(h.fx.evolve(h.pl,'water-tackle'),null,'only one evolved Fusion per run');
 assert.equal(JSON.stringify(h.saved),saveBefore,'Fusion must not alter account JSON');
 assert.equal(h.pl.bonds,originalBonds,'existing Rift Bonds must not be spent');
});
test('all ten recipes perform actual enemy damage and custom combat effects',()=>{
 for(const r of setup().api.RECIPES){
  const h=setup();
  h.stock([r.ids[0],3],[r.ids[1],3],['tackle',3]);
  const actor=new h.Enemy(70,6,3000),other=new h.Enemy(80,23,3000);
  h.enemies.push(actor,other);
  const upgraded=h.fx.evolve(h.pl,r.id);
  assert.ok(upgraded,'could not evolve '+r.id);
  const pre=actor.hp;
  h.pl.cast(upgraded);
  for(let i=0;i<11;i++)h.G.Combat.tick(.35,h.pl,0);
  assert.ok(actor.hp<pre,'no actual enemy.hurt damage for '+r.id);
  assert.ok(h.rings.length>0&&h.blasts.length>0,'no visual Fusion FX '+r.id);
  assert.equal(h.pl.baseCasts,0,'Fusion must not recast the consumed base skill');
 }
});
test('Water wave knocks back and slows, Lightning Chain hits multiple targets and stuns',()=>{
 let h=setup();h.stock(['water-gun',3],['tackle',3]);
 const e=new h.Enemy(70,0);h.enemies.push(e);
 const fused=h.fx.evolve(h.pl,'water-tackle');h.pl.cast(fused);
 assert.ok(e.x!==70,'water-wave push changes real NPC position');
 assert.ok(e.slowed.length>0);
 h=setup();h.stock(['thunder-shock',3],['quick-attack',3]);
 h.enemies.push(new h.Enemy(70,0),new h.Enemy(100,10),new h.Enemy(160,40));
 h.pl.cast(h.fx.evolve(h.pl,'spark-quick'));
 assert.ok(h.enemies.every(x=>x.hp<1200),'chain lightning must hit multiple targets');
 assert.ok(h.enemies.some(x=>x.stunned.length),'lightning stun must be real');
});
test('Ice stacks freeze after two hits; Thunder Claw armor break increases later ordinary damage',()=>{
 let h=setup();h.stock(['bubble-beam',3],['ice-shard',3]);
 const e=new h.Enemy(70,0);h.enemies.push(e);
 const icy=h.fx.evolve(h.pl,'bubble-ice');
 h.pl.cast(icy);h.pl.cast(icy);
 assert.ok(e.stunned.length>=1,'ice shards freeze after stacked hits');
 h=setup();h.stock(['thunderbolt',3],['metal-claw',3]);
 const metal=h.fx.evolve(h.pl,'thunder-claw'),foe=new h.Enemy(70,0);
 h.enemies.push(foe);h.pl.cast(metal);
 assert.ok(foe.pkmsvvFusionShredUntil>h.G.Game.st.time);
 const before=foe.hp;foe.hurt(100);
 assert.ok(foe.hp<=before-116+1e-6,'armor break must amplify ordinary attacks too');
});
test('Shadows mark and detonate after delay; fire vortex has repeating damage ticks',()=>{
 let h=setup();h.stock(['shadow-ball',3],['psychic',3]);
 const e=new h.Enemy(70,0);h.enemies.push(e);
 h.pl.cast(h.fx.evolve(h.pl,'shadow-mind'));
 const first=e.hp;
 for(let i=0;i<10;i++)h.G.Combat.tick(.3,h.pl,0);
 assert.ok(e.hp<first,'dark orb must detonate, not only draw purple FX');
 assert.equal(h.fx.activeZones,0);
 h=setup();h.stock(['flamethrower',3],['gust',3]);
 const e2=new h.Enemy(70,0);h.enemies.push(e2);
 h.pl.cast(h.fx.evolve(h.pl,'fire-gust'));
 const initial=e2.hp;
 for(let i=0;i<9;i++)h.G.Combat.tick(.34,h.pl,0);
 assert.ok(e2.hp<initial,'flame tornado must burn repeatedly');
});
test('Fusion icons render in HTML and Canvas skill HUD, not fallback plain sprites',()=>{
 const h=setup(),r=h.api.RECIPES[0];
 h.stock([r.ids[0],3],[r.ids[1],3]);
 const m=h.fx.evolve(h.pl,r.id);
 const img=h.G.Icons.html('move:'+m.id,32);
 assert.match(img,/ember-quick\.webp/);
 assert.match(img,/<img class="pkmsvv-fusion-skill-icon"/);
 let drawn=0;
 h.G.Icons.draw({drawImage(){drawn++;}},'move:'+m.id,0,0,48);
 assert.equal(drawn,1);
});
test('Rift Bonds are separate: original Bond system not replaced or awarded as extra evolved Fusion',()=>{
 const src=read('src/pkmsvv-bond-fusion.js');
 const patch=read('scripts/patch-bond-fusion.cjs');
 assert.doesNotMatch(patch,/patch\('js\/game\.js'/);
 assert.doesNotMatch(src,/\.fuse\(picked,opt\.group\)/);
 assert.match(src,/Rift Bonds remain/);
 assert.match(src,/maxPerRun=1/);
 assert.match(src,/pkmsvv-fusion-guide/);
 assert.doesNotMatch(src,/FUSION TỰ DO/);
 assert.match(read('src/pkmsvv-wiki.js'),/Cả hai chiêu/);
 assert.match(read('src/pkmsvv-story.js'),/luyện cả hai chiêu/);
});
test('skill card hints never incorrectly claim ready at low level; MAX upgrades notify once',()=>{
 const h=setup();h.stock(['ember',2],['quick-attack',2]);
 const hint=h.api.offerHint(h.pl,'quick-attack');
 assert.equal(hint.recipe.id,'ember-quick');
 assert.equal(h.api.notifyLearned(h.pl),false,'two learned but non-MAX cannot notify');
 h.G.Moves.levelUp(h.pl.moves[0]);
 assert.equal(h.toasts.length,0);
 h.G.Moves.levelUp(h.pl.moves[1]);
 assert.equal(h.toasts.length,1);
 assert.match(h.toasts[0],/Hai kỹ năng đã MAX/);
 h.G.Moves.levelUp(h.pl.moves[1]);
 assert.equal(h.toasts.length,1,'only once per match');
});
test('visual assets and evolved module are packaged in isolated Web, Windows, Android QA',()=>{
 const web=read('scripts/build-pokebox-stage1-qa.cjs');
 const pc=read('scripts/build-pokebox-stage1-pc-qa.cjs');
 const android=read('scripts/patch-pokebox-stage4-apk-qa.cjs');
 const compiled=read('scripts/patch-qa-compiled-modules.cjs');
 const copy=read('scripts/copy-fusion-icons.cjs');
 for(const src of [web,pc,android]){
  assert.match(src,/copyFusionIcons\(/);
  assert.match(src,/pkmsvv-fusion-evolved\.js/);
  assert.match(src,/pkmsvv-fusion-evolved\.css/);
 }
 assert.match(compiled,/PKMSVVFusionPilot/);
 for(const id of IDs)assert.ok(copy.includes(id),'QA copy manifest missing '+id);
});
test('controller/pad and keyboard can enter and exit all Fusion choices',()=>{
 const ui=read('src/pkmsvv-bond-fusion.js');
 const nav=read('src/pkmsvv-modal-navigation-qa.js');
 assert.match(nav,/#pkmsvv-fusion-guide/);
 assert.match(ui,/ArrowUp/);
 assert.match(ui,/ArrowDown/);
 assert.match(ui,/e\.key==='Escape'/);
 assert.match(ui,/button\.disabled=!ready/);
 assert.match(ui,/\.focus\?\.\(\)/);
});
