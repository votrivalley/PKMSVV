'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/pkmsvv-pippi-guide.js'),'utf8');
function fixture(){
 const buttons=[],timers=[],listeners={},writes=[];
 let guideRoot=null;
 const elements={};
 for(const name of ['face','speaker','line','count','next'])
  elements[name]={style:{},textContent:'',onclick:null,focus(){},
   setAttribute(k,v){this[k]=v}};
 const dom={
  body:{append(n){guideRoot=n;}},
  addEventListener(k,fn){listeners[k]=fn;},
  createElement(tag){
   return {tagName:tag.toUpperCase(),style:{},innerHTML:'',setAttribute(){},id:'',
    querySelector(sel){
     if(sel.includes('-face'))return elements.face;
     if(sel.includes('-speaker'))return elements.speaker;
     if(sel.includes('-line'))return elements.line;
     if(sel.includes('-count'))return elements.count;
     if(sel.includes('-next'))return elements.next;
     return null;
    },remove(){this.removed=true;guideRoot=null;}};
  }
 };
 const player={hp:100,maxHp:100},save={partner:25,starter:25};
 const G={
  I18n:{lang:'vi'},DB:{save,commit(v){writes.push(v)}},
  PKMSVVQuickRegion:{active:false},Game:{
   state:'ui',player:null,
   startRun(){this.player=player;this.state='playing';return true;}
  },
  PKMSVVStory:{reveal(dex,done){done();return dex;}}
 };
 vm.runInNewContext(source,{G,document:dom,window:{},setTimeout(fn,ms){timers.push({fn,ms});return timers.length;},clearTimeout(){},
  console});
 return {G,save,player,writes,elements,listeners,timers,guide:G.PKMSVVPippiGuide,
  advanceTimer(){const t=timers.shift();assert.ok(t);t.fn();},
  get panel(){return guideRoot;}};
}
test('Pippi tutorial only advances on Next and stores completion, not an auto timer',()=>{
 const f=fixture();
 f.G.PKMSVVStory.reveal(25,()=>{});
 assert.equal(f.guide.isOpen,false);
 f.advanceTimer();
 assert.equal(f.guide.isOpen,true);
 assert.equal(f.guide.current.kind,'starter');
 assert.match(f.elements.line.textContent,/Pippi/);
 assert.equal(f.elements.count.textContent,'1 / 4');
 assert.equal(f.save.pkmsvvPippiGuide.starter,undefined,'save not marked until final Next');
 for(let step=1;step<4;step++){
  f.elements.next.onclick();assert.equal(f.guide.isOpen,true);
  assert.equal(f.elements.count.textContent,(step+1)+' / 4');
 }
 f.elements.next.onclick();assert.equal(f.guide.isOpen,false);
 assert.equal(f.save.pkmsvvPippiGuide.starter,true);
 assert.equal(f.writes.length,1);
 assert.equal(f.guide.open('starter'),false,'completed intro never opens again');
});
test('Pippi Research Lab tour has four deliberate pages and never autoplays',()=>{
 const f=fixture();
 assert.equal(f.guide.open('laboratory'),true);
 assert.equal(f.guide.current.kind,'laboratory');
 assert.equal(f.guide.current.total,4);
 assert.match(f.elements.line.textContent,/Phòng nghiên cứu/);
 for(let n=0;n<4;n++)f.guide.next();
 assert.equal(f.save.pkmsvvPippiGuide.laboratory,true);
 assert.equal(f.guide.open('laboratory'),false);
});
test('Explore dialogue freezes a writable native game state then resumes only after final Next',()=>{
 const f=fixture();
 f.G.PKMSVVQuickRegion.active=true;
 f.G.Game.startRun();
 f.advanceTimer();
 assert.equal(f.guide.isOpen,true);
 assert.equal(f.guide.current.kind,'explore');
 assert.equal(f.guide.current.total,5);
 assert.equal(f.G.Game.state,'pause');
 assert.match(f.elements.line.textContent,/Khám phá/);
 for(let step=0;step<4;step++){
  f.guide.next();assert.equal(f.G.Game.state,'pause');
 }
 assert.equal(f.save.pkmsvvPippiGuide.explore,undefined);
 assert.equal(f.guide.next(),true);
 assert.equal(f.G.Game.state,'playing');
 assert.equal(f.save.pkmsvvPippiGuide.explore,true);
 assert.equal(f.guide.isOpen,false);
});
test('First chest guidance queues behind item choice and needs two explicit Next clicks',()=>{
 const f=fixture();let rewardOpen=true;
 f.G.PKMSVVQuickRegion.active=true;f.G.Game.state='playing';
 f.G.UI={isOpen(id){return id==='scr-item'&&rewardOpen;}};
 assert.equal(f.guide.queue('chest'),true);
 assert.equal(f.guide.flush(),false,'never cover real item selection');
 assert.equal(f.guide.isOpen,false);
 rewardOpen=false;
 assert.equal(f.guide.flush(),true);
 assert.equal(f.guide.current.kind,'chest');
 assert.equal(f.guide.current.total,2);
 assert.equal(f.G.Game.state,'pause');
 f.guide.next();assert.equal(f.guide.isOpen,true);
 assert.equal(f.save.pkmsvvPippiGuide.chest,undefined);
 f.guide.next();assert.equal(f.guide.isOpen,false);
 assert.equal(f.save.pkmsvvPippiGuide.chest,true);
 assert.equal(f.G.Game.state,'playing');
 assert.equal(f.guide.queue('chest'),false,'repeat drops must not repeat first chest guide');
 assert.equal(f.guide.queue('pickup'),true);
 assert.equal(f.guide.flush(),true);
 assert.equal(f.guide.current.kind,'pickup');
});
test('Pippi guide excludes Co-op, Arena and nonplaying sessions and never consumes Escape to skip',()=>{
 const f=fixture();
 f.G.Game.state='ui';
 assert.equal(f.guide.open('explore'),false);
 f.G.Game.state='playing';f.G.Coop={active:true};
 f.G.PKMSVVQuickRegion.active=true;
 assert.equal(f.guide.open('explore'),false);
 f.G.Coop.active=false;
 assert.equal(f.guide.open('explore'),true);
 const key={key:'Escape',code:'Escape',preventDefault(){this.prevented=true},
  stopPropagation(){},stopImmediatePropagation(){}};
 f.listeners.keydown(key);
 assert.equal(key.prevented,true);
 assert.equal(f.guide.current.index,0);
 const enter={key:'Enter',code:'Enter',preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}};
 f.listeners.keydown(enter);
 assert.equal(f.guide.current.index,1,'Enter advances same as Next button');
});
test('The guide portrait uses one original 16-face atlas and both game URLs stage the new files',()=>{
 const css=fs.readFileSync(path.join(root,'src/pkmsvv-pippi-guide.css'),'utf8');
 const prepare=fs.readFileSync(path.join(root,'scripts/prepare-pippi-web-preview.cjs'),'utf8');
 assert.match(css,/portrait\/atlas\.png/);
 assert.match(css,/background-size:400% 400%/);
 assert.match(css,/pkmsvv-pippi-guide-next/);
 assert.match(prepare,/pkmsvv-pippi-guide\.js/);
 assert.match(prepare,/pkmsvv-pippi-guide\.css/);
 assert.match(source,/pkmsvvPippiGuide/);
 assert.doesNotMatch(source,/setInterval\(/,'dialogue must never auto-progress');
});
