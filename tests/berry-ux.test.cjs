'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function harness(lang='vi'){
 const all=[],byId=new Map(),timers=new Map();let seq=0,started=0,menuOpens=0,commits=0;
 function node(tag){
  const el={tagName:tag,children:[],textContent:'',className:'',style:{},hidden:false,removed:false,
   setAttribute(k,v){this[k]=v},append(...items){this.children.push(...items)},
   replaceChildren(...items){this.children=[...items]},
   remove(){this.removed=true},onclick:null,
   classList:{add(name){el.className+=' '+name;},remove(name){el.className=el.className.replace(name,'')}}};
  Object.defineProperty(el,'id',{get(){return this._id},set(id){this._id=id;byId.set(id,this)}});
  all.push(el);return el;
 }
 const body=node('body'),document={body,readyState:'complete',getElementById:id=>byId.get(id)||null,createElement:node};
 const save={coins:1500,pkmsvvChapter5Seen:true};
 const G={I18n:{lang},DB:{save,commit(){commits++}},
  UI:{toast(){},refreshCoins(){}},
  Game:{state:'ui',player:null,startRun(){started++;this.state='playing';
   this.player={hp:100,maxHp:100,atkMul:1,spdMul:1,cdMul:1,invuln:0};}},
  MenuUI:{open(){menuOpens++;}},
  PKMSVVStory:{syncChapterPurpleRewards(){}}};
 vm.runInNewContext(read('src/pkmsvv-berry.js'),
  {G,document,setInterval:fn=>{const n=++seq;timers.set(n,fn);return n;},
   clearInterval:id=>timers.delete(id),Math,Number,Array,Set,Object,console});
 return {G,save,body,all,byId,timers,berry:G.PKMSVVBerry,
  get started(){return started},get menuOpens(){return menuOpens},get commits(){return commits},
  pulse(){for(const fn of [...timers.values()])fn()}};
}
test('Berry descriptions explain trigger, real buff duration, PvP Enigma chance and all ten types',()=>{
 const h=harness();
 assert.equal(h.berry.TYPES.length,10);
 const details=h.berry.TYPES.map(t=>h.berry.berryDetails(t.id));
 assert.ok(details.every(x=>x.trigger&&x.duration&&x.limit));
 assert.match(h.berry.berryDetails('enigma').text,/8%/);
 assert.match(h.berry.berryDetails('enigma').text,/7s PvE \/ 3s PvP/);
 assert.match(h.berry.berryDetails('liechi').text,/90 giây/);
 assert.match(h.berry.berryDetails('lum').text,/3 giây/);
 assert.match(h.berry.kecleonHtml(),/pkmsvv-berry-details/);
 const en=harness('en');assert.match(en.berry.berryDetails('enigma').text,/8% chance/);
});
test('Two-Berry HUD renders waiting/active/spent without modifying stats or save',()=>{
 const h=harness(),p={hp:100,maxHp:100,atkMul:1,spdMul:1,cdMul:1};
 h.G.Game.state='playing';h.G.Game.player=p;
 h.berry.apply(p,['oran','liechi'],'pve');
 const hud=h.byId.get('pkmsvv-berry-active-hud');
 assert.ok(hud&&!hud.hidden);
 assert.equal(hud.children.length,3,'one title and exactly two Berry statuses');
 assert.equal(h.berry.effectState(p,'oran').state,'waiting');
 assert.equal(h.berry.effectState(p,'liechi').state,'active');
 p._pkmsvvBerry.once.oran=1;p._pkmsvvBerry.elapsed=90;
 h.berry.renderHud(p,true);
 assert.equal(h.berry.effectState(p,'oran').state,'spent');
 assert.equal(h.berry.effectState(p,'liechi').state,'spent');
 assert.equal(hud.children.length,3);
 assert.equal(h.commits,0,'display-only HUD does not write save');
 assert.equal(p.atkMul,1,'display-only HUD does not apply gameplay buffs');
 h.G.Game.state='ui';h.berry.renderHud(p,true);assert.equal(hud.hidden,true);
});
test('Berry four-second menu remains cancellable, never consumes stock on cancelled run',()=>{
 const h=harness();h.berry.grant('oran',2);
 h.G.Game.startRun(null);
 const option=h.all.find(n=>n.tagName==='button'&&n.textContent.includes('Oran ×2'));
 assert.ok(option);assert.match(option.title,/HP dưới 30%/);
 option.onclick();h.pulse();
 h.G.MenuUI.open();for(let i=0;i<6;i++)h.pulse();
 assert.equal(h.started,0);assert.equal(h.berry.choosing,false);
 assert.equal(h.berry.count('oran'),2);
 assert.equal(h.berry.chapterProgress(),0);
 assert.equal(h.menuOpens,1);
});
test('Berry four-second selection consumes at most two unique Berry items and cannot duplicate callbacks',()=>{
 const h=harness();for(const id of ['oran','liechi','sitrus'])h.berry.grant(id,1);
 h.G.Game.startRun(null);
 for(const id of ['Oran','Liechi','Sitrus']){
  const b=h.all.find(n=>n.tagName==='button'&&n.textContent.includes(id+' ×1'));
  assert.ok(b);b.onclick();
 }
 assert.equal(h.berry.choosing,true);
 for(let i=0;i<4;i++)h.pulse();
 assert.equal(h.started,1);assert.equal(h.berry.data().last.length,2);
 assert.equal(h.berry.count('sitrus'),1,'third choice is ignored');
 assert.equal(h.berry.chapterProgress(),2);
 for(let i=0;i<4;i++)h.pulse();
 assert.equal(h.started,1,'late timer cannot spawn a second run');
});
test('Berry HUD styles stay within Android safe areas, do not block joystick or screen taps',()=>{
 const css=read('src/pkmsvv-berry.css');
 assert.match(css,/\.pkmsvv-berry-active-hud/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/safe-area-inset-left/);
 assert.match(css,/\.pkmsvv-berry-active-hud\[hidden\]/);
 assert.match(css,/\.pkmsvv-berry-option-detail/);
});
