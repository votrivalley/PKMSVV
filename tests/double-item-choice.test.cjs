'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const s=fs.readFileSync(path.join(__dirname,'../vendor/pokesurvivor/js/game.js'),'utf8').replace(/\r\n/g,'\n');
const start=s.indexOf('  let openItem = null;'),end=s.indexOf('  /** @param who',start);
if(start<0||end<start)throw Error('Item choice source not found');
function setup(){
 const modal={item:false,bond:false,levelup:false},choices=[],events=[];
 const G={
  Items:{BY:{a:{name:'A'},b:{name:'B'},c:{name:'C'}}},
  UI:{isOpen:id=>!!modal[id.replace('scr-','')]},
  RunUI:{showItemChoice(cur,next,cb){choices.push({cur,next,cb});modal.item=true;}},
  Coop:{active:false}, Judgment:{cinematic:false},PKMSVVBerry:{choosing:false},
  Spawner:{say(){}}, Progress:{event:(name,payload)=>events.push([name,payload])}
 };
 const ctx={G,state:'playing',holdBy:[],pkmsvvCompetitive:()=>false,
  pl:{item:'a',equip(k){this.item=k;}}};
 vm.runInNewContext(s.slice(start,end)+'\nthis.h={offerItem,afterLevelUp,pending:()=>laterItems.slice(),active:()=>openItem,\n   invalidate:()=>{++pkmsvvItemEpoch;openItem=null;laterItems.length=0;}};',ctx);
 return {...ctx,modal,choices,events,choose(i,id){modal.item=false;choices[i].cb(id);}};
}
test('two simultaneous reward choices are queued and neither is lost',()=>{
 const x=setup();x.h.offerItem('b');x.h.offerItem('c');
 assert.equal(x.choices.length,1);assert.equal(x.h.pending().length,1);
 x.choose(0,'b');
 assert.equal(x.choices.length,2);assert.equal(x.choices[1].cur,'b');
 x.choose(1,'c');
 assert.equal(x.pl.item,'c');assert.equal(x.state,'playing');assert.equal(x.h.pending().length,0);assert.equal(x.events.length,2);
});
test('double click is ignored and does not lose or duplicate rewards',()=>{
 const x=setup();x.h.offerItem('b');x.h.offerItem('c');x.choose(0,'b');
 x.choices[0].cb('b');assert.equal(x.events.length,1);assert.equal(x.choices.length,2);
 x.choose(1,'c');assert.equal(x.events.length,2);
});
test('reward collected during levelup or bond waits its turn',()=>{
 for(const state of ['levelup','bond']){
  const x=setup();x.state=state==='bond'?'choice':'levelup';x.modal[state]=true;
  x.h.offerItem('b');assert.equal(x.choices.length,0);assert.equal(x.h.pending().length,1);
  x.state='playing';x.modal[state]=false;x.h.afterLevelUp();
  assert.equal(x.choices.length,1);x.choose(0,'b');assert.equal(x.state,'playing');
 }
});
test('fresh runs clear stale rewards and modal references',()=>{
 assert.match(s,/openItem = null; laterItems\.length = 0;/);
 assert.match(s,/selected\|\|epoch!==pkmsvvItemEpoch/);
});

test('item during Berry chooser or Judgment cinematic waits until the overlay is gone',()=>{
 for(const blocker of ['berry','judgment']){
  const x=setup();
  if(blocker==='berry')x.G.PKMSVVBerry.choosing=true;
  else x.G.Judgment.cinematic=true;
  x.h.offerItem('b');x.h.afterLevelUp();
  assert.equal(x.choices.length,0,'must not replace an active Berry or cinematic screen');
  assert.equal(x.h.pending().length,1);
  x.G.PKMSVVBerry.choosing=false;x.G.Judgment.cinematic=false;x.h.afterLevelUp();
  assert.equal(x.choices.length,1,'pending reward reopens once it is safe');
  x.choose(0,'b');assert.equal(x.events.length,1);
 }
});
test('stale item callback after a new run cannot award or replace held item',()=>{
 const x=setup();x.h.offerItem('b');const old=x.choices[0].cb;
 x.h.invalidate();
 old('b');assert.equal(x.pl.item,'a');assert.equal(x.events.length,0);
 x.h.offerItem('c');x.choose(1,'c');
 assert.equal(x.events.length,1);assert.equal(x.pl.item,'c');
});
test('choice queue patches retry once per safe game tick and do not alter shared competitive hold behavior',()=>{
 const patch=fs.readFileSync(path.join(__dirname,'../scripts/patch-double-items.cjs'),'utf8');
 assert.match(patch,/if\(laterItems.length\)afterLevelUp\(\)/);
 assert.match(patch,/G\.PKMSVVBerry\?\.choosing/);
 assert.match(patch,/G\.Judgment\?\.cinematic/);
 assert.match(patch,/pkmsvvItemEpoch/);
 const competition=fs.readFileSync(path.join(__dirname,'../scripts/patch-competitive-levelup.cjs'),'utf8');
 assert.match(competition,/!pkmsvvCompetitive\(\)/,'competitive modes must not pause room for item selection');
});
