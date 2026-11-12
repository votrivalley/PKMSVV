'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../src/pkmsvv-modal-navigation-qa.js'),'utf8');
function fixture(){
 let presented=[],picked=[],rewards=[],native=0;
 const pad={connected:true,buttons:Array.from({length:17},()=>({pressed:false,value:0})),axes:[0,0]};
 const body={nodeType:1,isConnected:true,hidden:false,parentElement:null,
  classList:{contains:()=>false},getAttribute:()=>null};
 const grid={attrs:{},setAttribute(k,v){this.attrs[k]=v}};
 const cards=Array.from({length:3},()=>({nodeType:1,isConnected:true,hidden:false,parentElement:body,
  getAttribute:()=>null,classList:{contains:()=>false},
  getClientRects:()=>[{}],click(){picked.push('click')}}));
 const attrs={};
 const level={id:'scr-levelup',nodeType:1,isConnected:true,hidden:false,parentElement:body,
  classList:{contains:()=>false},attrs,setAttribute(k,v){attrs[k]=v;},
  getAttribute(k){return attrs[k]||null},removeAttribute(k){delete attrs[k]},
  getClientRects:()=>[{}],querySelectorAll(q){return q==='#cards .card'?cards:[];},
  querySelector(q){return q==='#cards'?grid:null},contains:()=>false};
 const handlers={};
 const document={body,readyState:'complete',activeElement:body,
  querySelectorAll:()=>[level],querySelector:()=>null,getElementById:()=>level,
  addEventListener(n,fn){handlers[n]=fn}};
 const G={Pad:{poll(){native++}},RunUI:{
  showLevelUp(n,offers,complete){presented.push([...offers]);this.current={offers,complete};},
  pick(index){const card=this.current.offers[index];if(card){picked.push(card.id);this.current.complete(card);}}}};
 vm.runInNewContext(source,{G,document,window:{addEventListener(n,fn){handlers['window:'+n]=fn}},
  navigator:{getGamepads:()=>[pad]},MutationObserver:class{observe(){}},
  getComputedStyle:()=>({display:'block',visibility:'visible',zIndex:'20'}),
  requestAnimationFrame(){},performance:{now:()=>1000},Node:{DOCUMENT_POSITION_FOLLOWING:4}});
 const api=G.PKMSVVModalNavQA;
 api.active(); // cache the visible popup, as in real gameplay
 function press(index,on){pad.buttons[index].pressed=on;pad.buttons[index].value=on?1:0;api.pollModal();}
 return {G,api,pad,presented,picked,rewards,press,handlers,get native(){return native},grid,attrs};
}
test('X/Y/B directly pick slots 1/2/3; controller navigation never picks',()=>{
 const f=fixture();f.G.RunUI.showLevelUp(4,[{id:'one'},{id:'two'},{id:'three'}],x=>f.rewards.push(x.id));
 f.pad.axes=[-.9,1];f.press(14,true);f.press(12,true);
 assert.equal(f.picked.length,0,'D-pad and axes never pick or move the skill cursor');
 f.press(2,true);
 assert.deepEqual(f.picked,['one']);assert.deepEqual(f.rewards,['one']);
 f.press(2,true);assert.equal(f.picked.length,1,'held buttons must not double pick');
});
test('R+A cycles 3-card pages without granting rewards; Y selects on second page',()=>{
 const f=fixture();const offers=Array.from({length:5},(_,i)=>({id:'skill'+(i+1)}));
 f.G.RunUI.showLevelUp(9,offers,x=>f.rewards.push(x.id));
 assert.deepEqual(f.presented[0].map(x=>x.id),['skill1','skill2','skill3']);
 f.press(0,true);
 assert.equal(f.presented.length,1,'A alone must not turn a page');
 f.press(0,false);f.press(5,true);f.press(0,true);
 assert.deepEqual(f.presented[1].map(x=>x.id),['skill4','skill5']);
 assert.equal(f.rewards.length,0,'page change cannot apply a skill');
 assert.equal(f.grid.attrs['data-pkmsvv-page-label'],'2 / 2');
 f.press(0,false);f.press(5,true);f.press(1,true);
 assert.equal(f.rewards.length,0,'third slot on a 2-skill page is inactive');
 f.press(1,false);f.press(5,false);f.press(3,true);
 assert.deepEqual(f.picked,['skill5']);assert.deepEqual(f.rewards,['skill5']);
});
test('Arrow keys stay free for movement, 1/2/3 remain native keyboard shortcuts',()=>{
 const f=fixture(),call=f.handlers['window:keydown'];
 for(const key of ['ArrowLeft','ArrowUp','w','a','s','d','1','2','3']){
  let prevented=0;call({key,code:'',preventDefault(){prevented++},stopImmediatePropagation(){}});
  assert.equal(prevented,0,'level-up must not steal keyboard '+key);
 }
});
test('R cannot change speed in the live level-up control layer',()=>{
 const runtime=fs.readFileSync(path.resolve(__dirname,'../src/pkmsvv-runtime-controls-qa.js'),'utf8');
 assert.match(runtime,/const editing=open\|\|isEditing\(\)\|\|levelShown/);
 assert.match(source,/shoulderR/);
 assert.match(source,/pressed\(2\),pressed\(3\),pressed\(1\),pressed\(0\)/);
});
