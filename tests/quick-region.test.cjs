'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-quick-region.js'),'utf8');
function harness(){
 const calls=[],nodes={},records=[];
 function node(tag='div'){
  const o={tagName:tag,hidden:false,disabled:false,isConnected:true,children:[],dataset:{},
   append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items.slice();},
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
  I18n:{lang:'vi'},DB:{save,commit(){throw Error('Quick region must not write save')}},
  Tiles:{arenaBiome(t){return ['fire','steel','water','ground','rock','dark','bug','fighting','ice','dragon'].indexOf(t)+1}},
  World:{biome:17,setBiome(n){this.biome=n;calls.push(n)}},
  Coop:{active:false},
  Game:{state:'ui',startRun(){this.state='playing';G.World.setBiome(0)},toUI(){this.state='ui'},quit(){this.state='ui'}},
  Flow:{goMenu(){this.wasMenu=true}},
  MenuUI:{open(){this.wasOpen=true}},
  EnemyMgr:{add(enemy){return enemy;}},
  Enemy:class Enemy {
   constructor(def,x,y,scaling,boss){this.def=def;this.dex=def.dex;this.x=x;this.y=y;this.boss=!!boss;}
  },
  Enemies:{bagAt(){return [{dex:999},{dex:25}]}},
  Spawner:{update(){const out=G.Enemies.bagAt();records.push(out);return out}},
  PKMSVVChampionArena:{active:false,
   regionizeBag(bag,index){return bag.map(def=>({...def,dex:index===0?12:150+index}))}}
 };
 vm.runInNewContext(source,{G,document,console,Math});
 return {G,document,save,play,nodes,calls,records,get started(){return started}};
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
 assert.equal(h.G.World.biome,1);
 h.G.World.setBiome(777);
 assert.equal(h.G.World.biome,1,'world rotation cannot replace chosen Region');
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
 assert.equal(quick.enforceGeneration(input,9),input,'Sky Tower is intentionally mixed-generation');
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
 assert.equal(special.dex,777,'named story bosses retain their narrative identity');
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
