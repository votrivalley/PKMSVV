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
 assert.equal(h.G.Enemies.bagAt()[0].dex,999,'native bag restored after spawn tick');
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
