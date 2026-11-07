'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-quick-region.js'),'utf8');
function harness(options={}){
 const calls=[],nodes={},records=[],alive=[];
 let deferredStart=null;
 function node(tag='div'){
  const o={tagName:tag,hidden:false,disabled:false,isConnected:true,children:[],dataset:{},
   append(...items){this.children.push(...items);},appendChild(item){this.children.push(item);return item;},replaceChildren(...items){this.children=items.slice();},
   setAttribute(name,v){this[name]=v;},addEventListener(){},querySelector(q){
    return q==='#pkmsvv-quick-region-close'?nodes.close:q==='#pkmsvv-quick-region-grid'?nodes.grid:null;
   }};
  return o;
 }
 nodes.close=node('button');nodes.grid=node('div');
 let handler=null,started=0;
 const play=node('button');
 play.click=()=>{if(handler)handler({target:{closest:()=>play},defaultPrevented:false,preventDefault(){this.defaultPrevented=true},stopImmediatePropagation(){}});started++;G.Game.startRun(null);};
 const document={body:{append(el){nodes.overlay=el}},readyState:'complete',
  createElement:node,addEventListener(type,fn,capture){if(type==='click'&&capture)handler=fn;},
  querySelector(q){return q==='#scr-menu [data-go="play"]'?play:null;}};
 const save={partner:12,owned:{12:true},arenas:{pkmChampion:{seals:{Kanto:true}}}};
 const G={
  I18n:{lang:'vi'},DB:{save,commit(){if(options.failCommit)return false;return true}},
  Tiles:{arenaBiome(t){return ['fire','steel','water','ground','rock','dark','bug','fighting','ice','dragon'].indexOf(t)+1}},
  World:{biome:17,setBiome(n){this.biome=n;calls.push(n)}},
  Coop:{active:false},
  DEX_BY:{12:{dex:12,name:'Butterfree',types:['bug'],gen:1}},
  Game:{state:'ui',st:{time:0},startRun(){
   if(options.deferred){
    deferredStart=()=>{this.state='playing';G.World.setBiome(0);};return;
   }
   this.state='playing';G.World.setBiome(0);
  },toUI(){this.state='ui'},quit(){this.state='ui'}},
  Flow:{goMenu(){this.wasMenu=true}},
  MenuUI:{open(){this.wasOpen=true}},
  EnemyMgr:{add(enemy){alive.push(enemy);return enemy;},all(){return alive;},
   update(){this.updated=(this.updated||0)+1;}},
  Enemy:class Enemy {
   constructor(def,x,y,scaling,boss){this.def=def;this.dex=def.dex;this.x=x;this.y=y;this.boss=!!boss;}
  },
  Enemies:{bagAt(){return [{dex:999},{dex:25}]}},
  Spawner:{update(){const out=G.Enemies.bagAt();records.push(out);return out}},
  PKMSVVChampionArena:{active:false,
   regionizeBag(bag,index){return bag.map(def=>({...def,dex:index===0?12:150+index}))}}
 };
 vm.runInNewContext(source,{G,document,console,Math});
 return {G,document,save,play,nodes,calls,records,alive,
  completeStart(){deferredStart?.();},
  get started(){return started}};
}
test('Normal Chơi ngay is intercepted into a Region chooser and does not start until region is selected',()=>{
 const h=harness(),x=h.G.PKMSVVQuickRegion;
 const before=JSON.stringify(h.save);
 let stopped=false;
 const event={target:{closest:()=>h.play},defaultPrevented:false,
  preventDefault(){this.defaultPrevented=true},stopImmediatePropagation(){stopped=true}};
 // document capture function was registered with a once-per-native-click bypass.
 assert.equal(x.open(),true);
 assert.equal(h.started,0);
 assert.equal(h.nodes.overlay.hidden,false);
 assert.equal(h.nodes.grid.children.length,10);
 assert.equal(h.nodes.grid.children[0].disabled,false);
 assert.equal(h.nodes.grid.children[2].disabled,true,'Johto completion is still required for Hoenn');
 assert.equal(JSON.stringify(h.save),before,'opening chooser never writes save');
});
test('Choose Kanto starts original native play exactly once and keeps biome plus native spawn roster scoped',()=>{
 const h=harness(),x=h.G.PKMSVVQuickRegion,before=JSON.stringify(h.save);
 assert.equal(x.choose(0),true);
 assert.equal(h.started,1);
 assert.equal(x.active,true);
 assert.equal(x.selectedRegion,0);
 assert.equal(h.G.World.biome,0);
 h.G.World.setBiome(777);
 assert.equal(h.G.World.biome,0,'world rotation cannot replace chosen Region');
 const bag=h.G.Spawner.update();
 assert.equal(bag.length,2);assert.ok(bag.every(y=>y.dex===12));
 assert.equal(h.G.Enemies.bagAt()[0].dex,12,'Gen restriction stays active between spawn ticks');
 h.G.Game.toUI();
 assert.equal(x.active,false);
 assert.equal(h.G.World.biome,17,'free world state restored');
 h.G.World.setBiome(777);
 assert.equal(h.G.World.biome,777,'post-game free world can rotate again');
 assert.equal(JSON.stringify(h.save),before,'no region progress or Seal minted');
});
test('Unlocks use existing Crown Seal keys; all ten regions visible, Sky requires first nine',()=>{
 const h=harness(),x=h.G.PKMSVVQuickRegion;
 assert.equal(x.unlocked(0),true);assert.equal(x.unlocked(1),true);
 assert.equal(x.unlocked(2),false);assert.equal(x.unlocked(9),false);
 assert.equal(x.choose(2),false);
 for(const name of ['Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea'])
  h.save.arenas.pkmChampion.seals[name]=true;
 assert.equal(x.unlocked(9),true);
 assert.equal(x.entries().length,10);
 assert.equal(x.entries()[9].name,'Tháp Thiên Không');
 assert.equal(x.choose(9),true);
 assert.equal(h.G.World.biome,10);
 h.G.Flow.goMenu();assert.equal(x.active,false);
});
test('Other match types and direct native game starts remain unaffected',()=>{
 const h=harness(),x=h.G.PKMSVVQuickRegion;
 h.G.Coop.active=true;
 assert.equal(x.open(),false);assert.equal(x.choose(0),false);
 h.G.Coop.active=false;
 h.G.Game.startRun(null);
 assert.equal(x.active,false);
 assert.equal(h.G.World.biome,0,'unselected native game keeps original biome logic');
 h.G.Game.quit();
 assert.equal(x.active,false);
});
test('QA packages include chooser but production prepare script does not',()=>{
 const root=path.resolve(__dirname,'..');
 for(const file of ['scripts/build-pokebox-stage1-qa.cjs','scripts/build-pokebox-stage1-pc-qa.cjs',
  'scripts/build-pokebox-stage4-android-qa.cjs','scripts/patch-pokebox-stage4-apk-qa.cjs']){
  const s=fs.readFileSync(path.join(root,file),'utf8');
  assert.match(s,/pkmsvv-quick-region\.js/);
  assert.match(s,/pkmsvv-quick-region\.css/);
 }
 assert.doesNotMatch(fs.readFileSync(path.join(root,'scripts/prepare-game.cjs'),'utf8'),/pkmsvv-quick-region/);
});


test('Gen 1–9 wild waves never cross their generation even if upstream bags contain another Gen',()=>{
 const h=harness(),quick=h.G.PKMSVVQuickRegion;
 h.G.DEX_BY={12:{name:'Butterfree'},25:{name:'Pikachu'},152:{name:'Chikorita'},
  252:{name:'Treecko'},387:{name:'Turtwig'}};
 const input=[{dex:25},{dex:152},{dex:387},{dex:1025}];
 const preserved=JSON.stringify(input);
 for(let i=0;i<9;i++){
  const out=quick.enforceGeneration(input,i);
  const boundaries=[[1,151],[152,251],[252,386],[387,493],[494,649],
   [650,721],[722,809],[810,905],[906,1025]];
  const [low,high]=boundaries[i];
  const eligible=Object.keys(h.G.DEX_BY).map(Number).filter(n=>n>=low&&n<=high);
  if(eligible.length)assert.ok(out.every(x=>x.dex>=low&&x.dex<=high),'mixed generation in Region '+(i+1));
 }
 assert.equal(JSON.stringify(input),preserved,'region filter must not mutate enemy source data');
 assert.ok(quick.enforceGeneration(input,9).every(x=>x&&Number.isInteger(+x.dex)),
  'Sky Tower mixes Generations while still using tier-appropriate local Gacha species');
});

test('The entire active Region uses a Gen-only bag, including between Spawner ticks',()=>{
 const h=harness(),x=h.G.PKMSVVQuickRegion;
 x.choose(0);
 const enemies=h.G.Enemies;
 const bag=enemies.bagAt();
 assert.ok(bag.every(mon=>Number(mon.dex)>=1&&Number(mon.dex)<=151));
 h.G.Game.toUI();
 assert.deepEqual(Array.from(enemies.bagAt(),mon=>mon.dex),[999,25],'other modes retain native enemies');
 const script=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-quick-region.js'),'utf8');
 assert.match(script,/wrap\(G\.Enemies,'bagAt'/);
 assert.doesNotMatch(script,/wrap\(G\.Spawner,'update'/);
});

test('Direct scripted Enemy spawns use Region Gen without touching original templates or other modes',()=>{
 const h=harness(),quick=h.G.PKMSVVQuickRegion;
 h.G.DEX_BY={1:{name:'Bulbasaur',types:['grass']},12:{name:'Butterfree',types:['bug']},
  152:{name:'Chikorita',types:['grass']},777:{name:'Togedemaru',types:['electric']}};
 const original={dex:777,name:'Togedemaru',types:['electric'],hp:300};
 const before=JSON.stringify(original);
 const outside=new h.G.Enemy(original,10,20,{hp:2},false);
 assert.equal(outside.dex,777,'free play with no selected Region stays native');
 assert.equal(quick.choose(0),true);
 const direct=new h.G.Enemy(original,10,20,{hp:2},false);
 assert.ok(direct.dex===1||direct.dex===12,'scripted spawn must be Gen 1');
 assert.equal(direct.def.hp,300,'encounter tier/HP stays intact');
 assert.deepEqual(Array.from(direct.def.types),Array.from(h.G.DEX_BY[direct.dex].types),'types follow actual species');
 const boss=new h.G.Enemy(original,30,40,{hp:5},true);
 assert.ok(boss.dex===1||boss.dex===12,'normal Region bosses must respect Gen as well');
 assert.equal(boss.boss,true,'boss status is retained');
 assert.equal(JSON.stringify(original),before,'native source must not be modified');
 const special=new h.G.Enemy({...original,pkmsvvStoryBoss:true},0,0,{hp:1},true);
 assert.ok([1,12].includes(special.dex),'even scripted bosses in normal Kanto free play must be Gen 1');
 h.G.Game.toUI();
 assert.equal(new h.G.Enemy(original,0,0).dex,777,'mode restriction must end with battle');
 assert.equal(JSON.stringify(h.save).includes('pkmsvv'),false,'generation fix must not mutate save');
});

test('Kanto wild bag, miniboss and custom spawns use the SAME Gacha gen pool, not only numeric Dex bounds',()=>{
 const h=harness(),q=h.G.PKMSVVQuickRegion;
 h.G.DEX_BY={12:{name:'Butterfree'},25:{name:'Pikachu',types:['electric']},152:{name:'Chikorita',types:['grass']}};
 h.G.DEX=[{dex:25,gen:1},{dex:152,gen:2}];
 h.G.SPRITE_META={25:{a:{Idle:true}},152:{a:{Idle:true}}};
 assert.equal(q.choose(0),true);
 const wave=h.G.Enemies.bagAt();
 assert.ok(wave.every(x=>x.dex===25),'only catalogued Gacha Kanto species may spawn');
 const mini=h.G.EnemyMgr.add({dex:152,def:{dex:152,name:'Johto'},hp:90,spds:2});
 assert.equal(mini.dex,25,'manager-boundary miniboss cannot leak a Johto species');
 assert.equal(mini.hp,90,'boss HP tier is retained');
 assert.equal(mini.def.dex,25,'boss definition and sprite registry follow actual region');
 const boss=new h.G.Enemy({dex:152,hp:400,behavior:'boss'},0,0,{hp:1},true);
 assert.equal(boss.dex,25,'Boss constructor uses current region roster');
 h.G.Game.toUI();
 assert.equal(new h.G.Enemy({dex:152},0,0).dex,152,'outside Region play the registry is untouched');
});

test('Kanto must stay selected across deferred Berry pre-match and intermediate UI opens',()=>{
 const h=harness({deferred:true}),region=h.G.PKMSVVQuickRegion;
 h.G.DEX_BY={25:{name:'Pikachu'},152:{name:'Chikorita'}};
 h.G.DEX=[{dex:25,gen:1},{dex:152,gen:2}];
 h.G.SPRITE_META={25:{},152:{}};
 assert.equal(region.choose(0),true,'clicking Kanto arms the Region');
 assert.equal(h.G.Game.state,'ui','native start is correctly postponed by Berry');
 assert.equal(region.active,true,'region is activated before deferred startRun');
 assert.equal(region.starting,true,'Region knows Berry is still selecting');
 h.G.MenuUI.open();
 assert.equal(region.active,true,'incidental menu render cannot erase Kanto');
 assert.equal(region.selectedRegion,0);
 h.completeStart();
 assert.equal(h.G.Game.state,'playing');
 assert.equal(h.G.World.biome,0,'selected Kanto biome stays pinned through actual native start');
 assert.ok(h.G.Enemies.bagAt().every(x=>x.dex===25),'late waves remain 100% Kanto');
 assert.equal(region.starting,false,'pending flag clears once gameplay begins');
 h.G.Game.toUI();
 assert.equal(region.active,false,'explicit exit restores free world');
});
test('Kanto corrects mixed-gen enemies that bypass both constructor proxy and EnemyMgr.add',()=>{
 const h=harness(),region=h.G.PKMSVVQuickRegion;
 h.G.DEX_BY={25:{name:'Pikachu',types:['electric']},152:{name:'Chikorita',types:['grass']}};
 h.G.DEX=[{dex:25,gen:1},{dex:152,gen:2}];
 h.G.SPRITE_META={25:{},152:{}};
 assert.equal(region.choose(0),true);
 const e={dex:152,def:{dex:152,name:'Chikorita',types:['grass']},hp:785,maxHp:785,
  spd:100,boss:true};
 h.alive.push(e); // a scripted rift bypasses wrapped EnemyMgr.add
 for(let i=0;i<10;i++)h.G.EnemyMgr.update(0.016);
 assert.equal(e.dex,25,'already-living Pokémon corrected to selected Kanto generation');
 assert.equal(e.def.dex,25,'visual definition also corrected');
 assert.deepEqual(Array.from(e.def.types),['electric']);
 assert.equal(e.hp,785,'correcting species must not change boss difficulty');
 assert.equal(e.boss,true,'boss still retains boss mechanics');
 assert.equal(region.correctedSpawns,1);
 h.G.Game.toUI();
 const e2={dex:152,def:{dex:152},hp:100};
 h.alive.push(e2);
 for(let i=0;i<10;i++)h.G.EnemyMgr.update(0.016);
 assert.equal(e2.dex,152,'end of Region does not alter other modes');
});

test('live manager correction supports non-array registries such as Sets and Maps',()=>{
 const h=harness(),api=h.G.PKMSVVQuickRegion;
 h.G.DEX_BY={25:{dex:25,name:'Pikachu'},235:{dex:235,name:'Smeargle'}};
 h.G.DEX=[{dex:25,gen:1},{dex:235,gen:2}];
 h.G.SPRITE_META={25:{},235:{}};
 api.choose(0);
 const foreign={dex:235,def:{dex:235},hp:10},other={dex:235,def:{dex:235},hp:11};
 h.alive.push(foreign,other);
 h.G.EnemyMgr.all=()=>new Set([foreign,other]);
 for(let i=0;i<10;i++)h.G.EnemyMgr.update(0.016);
 assert.equal(foreign.dex,25);assert.equal(other.dex,25);
 assert.equal(api.correctedSpawns,2);
 const third={dex:235,def:{dex:235},hp:12};
 h.G.EnemyMgr.all=()=>new Map([['enemy3',third]]);
 for(let i=0;i<10;i++)h.G.EnemyMgr.update(0.016);
 assert.equal(third.dex,25,'Map-backed live enemy registries must also be filtered');
});
test('National Pokédex official boundaries map every single species to its INTRODUCTION generation',()=>{
 const h=harness(),api=h.G.PKMSVVQuickRegion;
 const boundaries=[
  [1,151],[152,251],[252,386],[387,493],[494,649],
  [650,721],[722,809],[810,905],[906,1025]
 ];
 let last=0;
 for(let i=0;i<boundaries.length;i++){
  const [low,high]=boundaries[i];
  assert.equal(low,last+1,'National Dex generations must have no gap');
  assert.equal(api.nationalGen(low),i+1);
  assert.equal(api.nationalGen(high),i+1);
  assert.equal(api.nationalGen(high+1),i===8?0:i+2);
  for(let dex=low;dex<=high;dex++){
   assert.equal(api.nationalGen(dex),i+1,'wrong Gen for National Dex '+dex);
   for(let candidate=0;candidate<9;candidate++)
    if(candidate!==i)assert.equal(api.isAllowed(dex,candidate),false,
     'foreign national species #'+dex+' must not be allowed in Gen '+(candidate+1));
  }
  last=high;
 }
 assert.equal(last,1025);
 assert.equal(api.nationalGen(0),0);
 assert.equal(api.nationalGen(1026),0);
 assert.equal(api.nationalGen('Mewtwo'),0);
});
test('incorrect in-game Gen tags cannot override official National Pokédex species Gen',()=>{
 const h=harness(),api=h.G.PKMSVVQuickRegion;
 h.G.DEX_BY={
  25:{dex:25,name:'Pikachu',types:['electric']},
  235:{dex:235,name:'Smeargle',types:['normal']},
  152:{dex:152,name:'Chikorita',types:['grass']}
 };
 // An incorrectly tagged Gen-2 Smeargle (Gen 1) cannot leak to Kanto.
 h.G.DEX=[
  {dex:25,gen:2},{dex:235,gen:1},{dex:152,gen:2}
 ];
 h.G.SPRITE_META={25:{},235:{},152:{}};
 const kanto=api.speciesFor(0),johto=api.speciesFor(1);
 assert.deepEqual(Array.from(kanto),[25]);
 assert.deepEqual(Array.from(johto),[235,152]);
 assert.equal(api.isAllowed(235,0),false,'Gen tag is wrong: national 235 is Johto');
 api.choose(0);
 const bag=h.G.Enemies.bagAt();
 assert.ok(bag.every(x=>x.dex===25),'Kanto never offers a mis-tagged Johto spawn');
 const boss=new h.G.Enemy({dex:235,pkmsvvStoryBoss:true,hp:777},0,0,{hp:1},true);
 assert.equal(boss.dex,25,'Kanto applies even to a scripted foreign boss');
 assert.equal(boss.def.hp,777);
});
test('no Gacha-eligible Pokémon fails closed rather than keeping a mixed-Gen wave',()=>{
 const h=harness(),api=h.G.PKMSVVQuickRegion;
 h.G.DEX=[{dex:152,gen:2}];
 h.G.DEX_BY={152:{dex:152,name:'Chikorita'}};
 h.G.SPRITE_META={152:{}};
 assert.equal(api.speciesFor(0).length,0);
 assert.equal(api.enforceGeneration([{dex:152},{dex:235}],0).length,0,
  'never leave Johto monsters on Kanto because a pool is missing');
});

test('Kanto persists when a Berry wrapper is installed OUTSIDE Region after script load',()=>{
 const h=harness(),region=h.G.PKMSVVQuickRegion;
 h.G.DEX_BY={25:{name:'Pikachu'},152:{name:'Chikorita'}};
 h.G.DEX=[{dex:25,gen:1},{dex:152,gen:2}];
 h.G.SPRITE_META={25:{},152:{}};
 // Reproduce the production ordering failure: Berry wraps G.Game.startRun
 // AFTER QuickRegion; native click only schedules underlying start.
 const start=h.G.Game.startRun;let deferred;
 h.G.Game.startRun=function(...args){
  const that=this;deferred=()=>start.apply(that,args);
 };
 assert.equal(region.choose(0),true);
 assert.equal(h.G.Game.state,'ui','native start still awaits Berry confirmation');
 assert.equal(region.active,true,'Kanto must already be armed before Berry completes');
 assert.equal(region.selectedRegion,0);
 assert.equal(region.starting,true);
 assert.equal(h.G.World.biome,0);
 assert.ok(h.G.Enemies.bagAt().every(x=>x.dex===25),
  'all pending/early spawn bags must be Gen 1 even before Berry finishes');
 h.G.MenuUI.open();
 assert.equal(region.active,true,'intermediate menu render does not lose Region');
 assert.equal(typeof deferred,'function');
 deferred();
 assert.equal(h.G.Game.state,'playing');
 assert.equal(region.active,true);
 assert.equal(region.starting,false);
 assert.equal(h.G.World.biome,0);
 assert.ok(h.G.Enemies.bagAt().every(x=>x.dex===25),
  'Kanto must still be Gen 1 after the delayed engine start');
 h.G.Game.toUI();
 assert.equal(region.active,false);
 assert.equal(h.G.World.biome,17);
});
test('Kanto cancelled during Berry wait does not leak into another mode',()=>{
 const h=harness(),region=h.G.PKMSVVQuickRegion;
 const orig=h.G.Game.startRun;
 h.G.Game.startRun=()=>{};
 assert.equal(region.choose(0),true);
 assert.equal(region.active,true);
 h.G.Game.quit();
 assert.equal(region.active,false);
 h.G.Game.startRun=orig;
 h.G.Coop.active=true;
 h.G.Game.startRun();
 assert.equal(region.active,false,'Co-op never inherits abandoned Kanto');
});

test('Wild Pokémon get progressively stronger across every Region and mixed-Gen Sky',()=>{
 const h=harness(),q=h.G.PKMSVVQuickRegion;
 const starters=[1,152,252,387,494,650,722,810,906];
 const strong=[130,249,384,445,643,716,791,889,1007];
 const stats=(dex,power,legendary=false)=>({
  dex,name:'Species '+dex,hp:power,pa:power,df:power,
  sa:power,sd:power,spd:power,rarity:legendary?5:1
 });
 h.G.DEX_BY={};
 h.G.DEX=[];h.G.SPRITE_META={};
 for(let i=0;i<9;i++){
  h.G.DEX_BY[starters[i]]=stats(starters[i],40);
  h.G.DEX_BY[strong[i]]=stats(strong[i],95,true);
  h.G.DEX.push({dex:starters[i],gen:i+1},{dex:strong[i],gen:i+1});
  h.G.SPRITE_META[starters[i]]={};h.G.SPRITE_META[strong[i]]={};
 }
 for(let region=0;region<10;region++){
  h.G.Game.st.time=0;
  const begin=q.enforceGeneration([{dex:strong[Math.min(region,8)],hp:12}],region);
  assert.equal(begin.length,1);
  assert.ok(starters.includes(begin[0].dex),
   'minute zero must use weak, unevolved starters in Region '+region);
  if(region<9)assert.equal(q.nationalGen(begin[0].dex),region+1);
  h.G.Game.st.time=780;
  const later=q.enforceGeneration([{dex:strong[Math.min(region,8)],hp:12}],region);
  assert.equal(later.length,1);
  assert.ok(strong.includes(later[0].dex),'late game must permit powerful species in Region '+region);
 }
});
test('Kanto does not start with Gyarados, Kangaskhan or fully evolved starters',()=>{
 const h=harness(),q=h.G.PKMSVVQuickRegion;
 const specs=[
  [10,45,30,35,20,20,45,1],[4,39,52,43,60,50,65,1],
  [5,58,64,58,80,65,80,2],[6,78,84,78,109,85,100,3],
  [115,105,95,80,40,80,90,3],[129,20,10,55,15,20,80,1],
  [130,95,125,79,60,100,81,3],[150,106,110,90,154,90,130,5]
 ];
 h.G.DEX_BY={};h.G.DEX=[];h.G.SPRITE_META={};
 for(const [dex,hp,pa,df,sa,sd,spd,rarity] of specs){
  h.G.DEX_BY[dex]={dex,name:'Mon #'+dex,hp,pa,df,sa,sd,spd,rarity};
  h.G.DEX.push({dex,gen:1});h.G.SPRITE_META[dex]={};
 }
 h.G.PKMSVV_EVOLUTION_DATA={rules:[{from:4,to:5},{from:5,to:6},{from:129,to:130}]};
 q.choose(0);
 for(const time of [0,73,119]){
  h.G.Game.st.time=time;
  const early=q.enforceGeneration([{dex:130},{dex:115},{dex:6},{dex:150}],0);
  assert.ok(early.every(x=>[4,10,129].includes(x.dex)),
   'minute '+time+' leaked advanced/legendary: '+early.map(x=>x.dex));
 }
 assert.equal(q.eligibleByTime(115,0,0),false);
 assert.equal(q.eligibleByTime(130,0,0),false);
 assert.equal(q.eligibleByTime(6,0,0),false);
 assert.equal(q.eligibleByTime(130,0,610),true,'late Gyarados becomes possible');
 assert.equal(q.eligibleByTime(6,0,610),true,'late Charizard becomes possible');
 assert.equal(q.eligibleByTime(115,0,610),true,'late Kangaskhan becomes possible');
 assert.equal(q.eligibleByTime(150,0,610),false,'legendary delayed further');
 assert.equal(q.eligibleByTime(150,0,780),true,'late legend unlock');
 const boss={dex:130,def:{dex:130},hp:600,boss:true};
 h.G.Game.st.time=30;
 h.G.EnemyMgr.add(boss);
 assert.ok([4,10,129].includes(boss.dex),'early miniboss must not leak Gyarados');
 assert.equal(boss.hp,600,'keep boss HP/difficulty multipliers');
 h.G.Game.toUI();
});

test('Explore Gen 1–9 covers use the nine requested mascot National Dex IDs; Sky art is unchanged',()=>{
 const h=harness(),q=h.G.PKMSVVQuickRegion;
 const expected=[150,249,385,488,646,718,800,890,1024,384];
 assert.deepEqual(Array.from(q.mascots),expected);
 const drawn=[];
 h.G.UI={sprite:(canvas,dex,opts)=>{drawn.push(dex);assert.equal(opts.shiny,false);}};
 for(const dex of expected)h.G.DEX_BY[dex]={dex,name:'Mascot #'+dex};
 assert.equal(q.open(),true);
 assert.deepEqual(drawn,expected,'every generation must use its mascot in the actual canvas, not just in metadata');
 assert.equal(h.nodes.grid.children.length,10);
 for(let i=0;i<10;i++){
  const art=h.nodes.grid.children[i].children[0];
  const sprite=art.children.find(c=>c.className==='region-sprite');
  assert.ok(sprite,'missing legendary cover canvas for Gen '+(i+1));
  assert.equal(sprite.width,76);
 }
 assert.equal(h.nodes.grid.children[1].disabled,false,'existing Johto unlock stays unchanged');
 assert.equal(h.nodes.grid.children[2].disabled,true,'existing Hoenn lock stays unchanged');
});


test('Explore Kanto grants its own Seal only after 15 complete minutes alive, without Champion',()=>{
 const h=harness(),q=h.G.PKMSVVQuickRegion;
 h.save.arenas.pkmChampion.seals={}; // First-time solo player.
 assert.equal(q.unlocked(1),false,'Johto must start locked for a new player');
 assert.equal(q.choose(0),true);
 assert.equal(h.G.World.biome,0,'Kanto is the native beginner map, not fire');
 h.G.Game.st.time=899;
 h.G.EnemyMgr.update(0.016);
 assert.equal(q.unlocked(1),false,'899 seconds must not unlock Johto');
 assert.equal(h.save.pkmsvvExploreSeals,undefined);
 h.G.Game.st.time=900;
 h.G.EnemyMgr.update(0.016);
 assert.equal(h.save.pkmsvvExploreSeals.Kanto,true);
 assert.equal(q.unlocked(1),true,'Johto unlocks from Kanto exploration alone');
 assert.equal(h.save.arenas.pkmChampion.seals.Kanto,undefined,'Champion crowns remain unchanged');
 const after=JSON.stringify(h.save);
 h.G.EnemyMgr.update(0.016);h.G.Game.toUI();
 assert.equal(JSON.stringify(h.save),after,'no duplicate Seal writes or rewards');
 assert.equal(q.choose(1),true,'unlocked Johto starts normal gameplay');
 assert.equal(h.G.World.biome,4,'Johto uses a gentler ground landscape');
});
test('Failed Explore Seal commit restores save and does not unlock next region',()=>{
 const h=harness({failCommit:true}),q=h.G.PKMSVVQuickRegion;
 h.save.arenas.pkmChampion.seals={};
 const before=JSON.stringify(h.save);
 assert.equal(q.choose(0),true);
 h.G.Game.st.time=900;
 h.G.EnemyMgr.update(0.016);
 assert.equal(q.unlocked(1),false);
 assert.equal(JSON.stringify(h.save),before,'failed commit must be rolled back');
});
test('Paldea receives the late fire battlefield while old Champion Seals remain compatible',()=>{
 const h=harness(),q=h.G.PKMSVVQuickRegion;
 const all=['Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar'];
 for(const name of all)h.save.arenas.pkmChampion.seals[name]=true;
 assert.equal(q.choose(8),true);
 assert.equal(h.G.World.biome,1,'fire now belongs to late-gen Paldea');
 h.G.Game.toUI();
 assert.equal(q.unlocked(9),false,'Sky needs all nine Seals');
 h.save.pkmsvvExploreSeals={Paldea:true};
 assert.equal(q.unlocked(9),true,'Seals earned in Explore combine with legacy Arena progress');
});


test('Kanto mini-boss never remains a low-power Rattata when stronger safe basics exist',()=>{
 const h=harness(),q=h.G.PKMSVVQuickRegion;
 h.G.DEX_BY={
  16:{dex:16,name:'Pidgey',hp:40,pa:45,df:40,sa:35,sd:35,spd:56,rarity:1},
  19:{dex:19,name:'Rattata',hp:30,pa:56,df:35,sa:25,sd:35,spd:72,rarity:1},
  1:{dex:1,name:'Bulbasaur',hp:45,pa:49,df:49,sa:65,sd:65,spd:45,rarity:1},
  25:{dex:25,name:'Pikachu',hp:35,pa:55,df:40,sa:50,sd:50,spd:90,rarity:1},
  43:{dex:43,name:'Oddish',hp:45,pa:50,df:55,sa:75,sd:65,spd:30,rarity:1}
 };
 h.G.DEX=Object.keys(h.G.DEX_BY).map(id=>({dex:Number(id),gen:1}));
 h.G.SPRITE_META=Object.fromEntries(Object.keys(h.G.DEX_BY).map(id=>[id,{}]));
 assert.equal(q.choose(0),true);
 const wild=new h.G.Enemy({dex:19,name:'Rattata',hp:100},0,0,{},false);
 assert.equal(wild.dex,19,'Rattata remains valid ordinary early wildlife');
 const mini=new h.G.Enemy({dex:19,name:'Rattata',hp:700,boss:true},0,0,{},true);
 assert.notEqual(mini.dex,19,'mini-boss prefers a safe stronger species');
 assert.ok([1,25,43].includes(mini.dex),'boss stays in strong half of safe Gen1 basics');
 assert.equal(mini.def.hp,700,'mini-boss actual HP and damage modifiers preserved');
});
test('Canonical Egg-support boss guards keep their sprite/dex even on Kanto maps',()=>{
 const h=harness(),q=h.G.PKMSVVQuickRegion;
 h.G.DEX_BY={25:{dex:25,name:'Pikachu',types:['electric']}};
 h.G.DEX=[{dex:25,gen:1}];h.G.SPRITE_META={25:{}};
 assert.equal(q.choose(0),true);
 for(const dex of [172,447,173,360,174]){
  const def={dex,name:'Original support',xp:1,behavior:'chase',hp:90};
  const guardian=new h.G.Enemy(def,0,0,{hp:1},false);
  guardian.pkmsvvBossGuard=true;guardian.pkmsvvGuardianOf=123;
  h.G.EnemyMgr.add(guardian);
  assert.equal(guardian.dex,dex,'constructor and manager retain canonical Boss Guardian #'+dex);
 }
 for(let i=0;i<10;i++)h.G.EnemyMgr.update(0.016);
 assert.deepEqual(Array.from(h.alive,e=>e.dex),[172,447,173,360,174],
  'live correction must not substitute any boss support with Zubat/other wild Pokémon');
 h.G.Game.toUI();
});


test('Nine Gen maps have nine different ACTIVE terrain IDs and nine different illustrated covers',()=>{
 const h=harness(),q=h.G.PKMSVVQuickRegion;
 const expected=[0,4,3,9,2,5,7,8,1,10]; // Kanto beginner; Paldea late Fire; Sky Dragon.
 const biomes=Array.from({length:10},(_,i)=>q.targetBiome(i));
 assert.deepEqual(biomes,expected,'nine region battlefields plus Sky use specific native biomes');
 assert.equal(q.distinctMapBiomes(),true);
 assert.equal(new Set(biomes.slice(0,9)).size,9,'all Gen 1-9 maps must have different terrain IDs');
 assert.equal(new Set(q.THEMES.slice(1)).size,9,'each themed terrain is distinct');
 assert.equal(q.SEAL_SECONDS,900);
 assert.match(source,/Sống sót đủ 15 phút trong từng vùng/);
 assert.match(source,/15 min → earn Seal/);
 // These are actual separate battle maps: inspect the biome selected when
 // replaying each normal native run, not merely the illustrated home cards.
 for(const region of ['Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea'])
  h.save.arenas.pkmChampion.seals[region]=true;
 for(let i=0;i<10;i++){
  assert.equal(q.choose(i),true,'cannot start region '+i);
  assert.equal(h.G.World.biome,expected[i],'duplicate in-game terrain for region '+i);
  h.G.Game.toUI();
  assert.equal(h.G.World.biome,17,'must restore original free-play map');
 }
 const crypto=require('node:crypto');
 const covers=['01-kanto','02-johto','03-hoenn','04-sinnoh','05-unova',
  '06-kalos','07-alola','08-galar','09-paldea'];
 const hashes=covers.map(name=>{
  const file=path.join(__dirname,'../assets/region-covers',name+'.webp');
  assert.ok(fs.existsSync(file),'missing cover for '+name);
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 });
 assert.equal(new Set(hashes).size,9,'no two Region cover artworks should be copied/identical');
});
test('Duplicate or missing native biomes block the selection instead of silently repeating a map',()=>{
 const h=harness(),q=h.G.PKMSVVQuickRegion;
 const saved=JSON.stringify(h.save);
 h.G.Tiles.arenaBiome=()=>4; // a broken upstream mapping collapses all nine
 assert.equal(q.distinctMapBiomes(),false);
 assert.equal(q.choose(0),false);
 assert.equal(h.started,0);
 assert.equal(JSON.stringify(h.save),saved,'broken terrain must not corrupt or advance player progress');
});
test('Delayed Berry entry does not count pre-match wait or leftover previous-run clock',()=>{
 const h=harness({deferred:true}),q=h.G.PKMSVVQuickRegion;
 h.save.arenas.pkmChampion.seals={};
 h.G.Game.st.time=700; // Stale clock until native startRun callback completes
 assert.equal(q.choose(0),true);
 h.G.Game.st.time=900;
 assert.equal(q.tryEarnSeal(),false,'Berry chooser does not award Seal');
 assert.equal(h.save.pkmsvvExploreSeals,undefined);
 h.completeStart();
 assert.equal(q.tryEarnSeal(),false,'start time must be captured at actual gameplay');
 h.G.Game.st.time=1799;
 assert.equal(q.tryEarnSeal(),false,'14:59 minutes elapsed remains locked');
 h.G.Game.st.time=1800;
 assert.equal(q.tryEarnSeal(),true);
 assert.equal(h.save.pkmsvvExploreSeals.Kanto,true);
});
