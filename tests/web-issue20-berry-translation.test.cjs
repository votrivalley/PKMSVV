'use strict';
/* Issue #20: Berry dialogs are already bilingual; the upstream Vietnamese
 * DOM translator must not repeatedly rewrite dynamic options with Berry stock.
 * Synthetic test data only; do not commit actual player saves.
 */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const SOURCE=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-berry.js'),'utf8');
function boot(lang='vi'){
 const elements=[],intervals=new Map();let id=0,launches=0;
 const node=tag=>{
  const el={tagName:tag,children:[],className:'',style:{},hidden:false,attributes:{},
   setAttribute(k,v){this.attributes[k]=v;},
   append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},
   remove(){this.removed=true;},classList:{add(){},remove(){}}};
  elements.push(el);return el;
 };
 const body=node('body'),document={body,readyState:'complete',createElement:node,getElementById(){return null;}};
 const save={coins:10000,partner:150,owned:{150:{at:1}},pkmsvvBerry:{bag:{oran:1,liechi:1},used:{},last:[],rescueWins:0}};
 const G={I18n:{lang},DB:{save,commit(){}},UI:{toast(){},refreshCoins(){}},MenuUI:{open(){}},
  Game:{state:'ui',player:null,startRun(){launches++;this.state='playing';this.player={hp:100,maxHp:100,atkMul:1,spdMul:1,cdMul:1,invuln:0};}},
  PKMSVVStory:{syncChapterPurpleRewards(){}}};
 vm.runInNewContext(SOURCE,{G,document,Math,Number,Array,Object,Set,console,
  setInterval(fn){const k=++id;intervals.set(k,fn);return k;},clearInterval(k){intervals.delete(k);}});
 return {G,save,elements,intervals,get launches(){return launches},tick(){for(const cb of [...intervals.values()])cb()}};
}
for(const lang of ['vi','en'])test('Issue 20: '+lang+' Berry overlay remains translated and Solo starts',()=>{
 const ctx=boot(lang);
 ctx.G.Game.startRun(null);
 const overlay=ctx.elements.find(e=>e.className==='pkmsvv-berry-overlay');
 assert.ok(overlay,'non-empty stock shows the ten-second picker');
 assert.equal(overlay.attributes.translate,'no',
  'Berry dialog already uses tr(vi,en); skip global DOM MutationObserver');
 assert.equal(overlay.attributes.role,'dialog');
 assert.equal(ctx.G.Game.state,'ui');
 assert.equal(ctx.launches,0);
 for(let i=0;i<10;i++)ctx.tick();
 assert.equal(ctx.G.Game.state,'playing');
 assert.equal(ctx.launches,1);
 assert.equal(ctx.save.pkmsvvBerry.bag.oran,1,'unused Berry cannot disappear');
 assert.equal(ctx.save.pkmsvvBerry.bag.liechi,1,'unused Berry cannot disappear');
 assert.equal(ctx.G.PKMSVVBerry.choosing,false);
});

for(const lang of ['vi','en'])test('Issue 20: '+lang+' selected Berry HUD is already localized',()=>{
 const ctx=boot(lang);
 ctx.G.Game.startRun(null);
 const option=ctx.elements.find(e=>e.tagName==='button'&&String(e.textContent).includes('Oran ×1'));
 assert.ok(option);
 option.onclick();
 for(let i=0;i<10;i++)ctx.tick();
 assert.equal(ctx.G.Game.state,'playing');
 assert.equal(ctx.launches,1);
 assert.equal(ctx.save.pkmsvvBerry.bag.oran,0);
 assert.equal(ctx.save.pkmsvvBerry.bag.liechi,1);
 assert.equal(ctx.save.pkmsvvBerry.used.oran,true);
 const hud=ctx.elements.find(e=>e.id==='pkmsvv-berry-active-hud');
 assert.ok(hud);
 assert.equal(hud.attributes.translate,'no');
});
