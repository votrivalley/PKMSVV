'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function harness(){
 const records=[];function el(tag){
  const n={tagName:tag,children:[],className:'',textContent:'',innerHTML:'',attrs:{},type:'',
   classList:{add(v){n.className+=' '+v},contains(v){return n.className.split(/\s+/).includes(v)}},
   setAttribute(k,v){this.attrs[k]=v},
   append(...v){this.children.push(...v)},replaceChildren(...v){this.children=[...v]},
   onclick:null};records.push(n);return n;
 }
 const box=el('section'),scr=el('section');scr.hidden=false;
 const actions=[],hits=[],listeners={};
 const document={createElement:el,
  getElementById:id=>id==='item-cards'?box:id==='scr-item'?scr:null,
  querySelectorAll:selector=>selector.includes('#scr-item')?(box.children[2]?.children||[]):[],
  addEventListener:(name,fn)=>{listeners[name]=fn;},activeElement:null};
 const save={coins:888,bag:{mint:2},tickets:{t10:3}},before=JSON.stringify(save);
 const G={I18n:{lang:'vi'},Items:{BY:Object.fromEntries(
  ['leftovers','choiceband','quickclaw','focussash','shellbell','amuletcoin','luckyegg','lifeorb','choicescarf','rockyhelmet','assaultvest']
   .map(id=>[id,{id,name:id,desc:'upstream '+id}]))},
  Icons:{html:id=>'<i>'+id+'</i>'},RunUI:{showItemChoice(){throw Error('unexpected fallback')}},
  UI:{hide:id=>hits.push('hide:'+id),show:id=>hits.push('show:'+id)},
  Pad:{focusFirst(){hits.push('focus')}},DB:{save}};
 vm.runInNewContext(read('src/pkmsvv-held-item-ui.js'),{G,document});
 const api=G.PKMSVVHeldItems;
 return {G,api,box,scr,records,hits,before,actions,listeners};
}
test('All 11 original held items get honest bilingual descriptions and conditional effects',()=>{
 const h=harness(),items=Object.keys(h.G.Items.BY);
 assert.equal(items.length,11);
 for(const id of items){const i=h.api.info(id);assert.equal(i.id,id);assert.ok(i.text);assert.ok(i.badge);}
 assert.match(h.api.info('focussash').text,/60 giây/);
 assert.match(h.api.info('lifeorb').text,/tốn HP/);
 h.G.I18n.lang='en';assert.match(h.api.info('choicescarf').text,/\+35%/);
});
test('Keep / Replace / Skip are clear; callbacks fire exactly once and never spend saved currency',()=>{
 const h=harness();let selected=[];
 h.G.RunUI.showItemChoice('leftovers','quickclaw',id=>selected.push(id));
 assert.equal(h.box.children.length,3);
 const columns=h.box.children[1],actions=h.box.children[2].children;
 assert.equal(columns.children.length,2);
 assert.equal(actions.length,3);
 assert.match(h.box.children[0].textContent,/1 trang bị/);
 assert.match(actions[0].textContent,/Giữ/);
 assert.match(actions[1].textContent,/Đổi/);
 assert.match(actions[2].textContent,/Bỏ qua/);
 actions[1].onclick();actions[0].onclick();actions[2].onclick();
 assert.deepEqual(selected,['quickclaw']);
 assert.deepEqual(Array.from(h.api.skipped()),[]);
 assert.equal(JSON.stringify(h.G.DB.save),h.before);
 h.G.RunUI.showItemChoice('leftovers','lifeorb',id=>selected.push(id));
 h.box.children[2].children[2].onclick();
 assert.deepEqual(selected,['quickclaw','leftovers'],'skip keeps original held item');
 assert.deepEqual(Array.from(h.api.skipped()),['lifeorb']);
 h.api.reset();assert.deepEqual(Array.from(h.api.skipped()),[],'discard only lasts the run');
});
test('Stale old modal callbacks cannot modify a new run after reset',()=>{
 const h=harness(),picked=[];
 h.G.RunUI.showItemChoice('leftovers','lifeorb',id=>picked.push(id));
 const old=h.box.children[2].children[1];
 h.api.reset();old.onclick();assert.equal(picked.length,0);
 h.G.RunUI.showItemChoice('leftovers','quickclaw',id=>picked.push(id));
 h.box.children[2].children[0].onclick();
 assert.deepEqual(picked,['leftovers']);
});
test('Installer preserves original single held slot and respects source patch order',()=>{
 const prep=read('scripts/prepare-game.cjs'),patch=read('scripts/patch-held-item-ui.cjs');
 assert.match(prep,/patch-held-item-ui\.cjs/);
 assert.match(patch,/js\/ui\/run-ui\.js/);
 assert.match(read('scripts/patch-double-items.cjs'),/G\.PKMSVVHeldItems\?\.reset/);
 assert.doesNotMatch(read('src/pkmsvv-held-item-ui.js'),/G\.DB\.commit/);
 assert.match(read('src/kecleon/pkmsvv-kecleon-ui.js'),/pkmk-held-help/);
 assert.match(read('src/kecleon/pkmsvv-kecleon-ui.js'),/if\(btn\.disabled\)return/);
});
test('Digit3 and Numpad3 really skip a new item once without changing save or duplicating rewards',()=>{
 const h=harness(),picked=[];
 h.G.RunUI.showItemChoice('leftovers','lifeorb',id=>picked.push(id));
 assert.equal(typeof h.listeners.keydown,'function');
 const evt=(code,key='3')=>({key,code,repeat:false,defaultPrevented:false,
  preventDefault(){this.defaultPrevented=true},
  stopImmediatePropagation(){this.stopped=true}});
 const event=evt('Digit3');h.listeners.keydown(event);
 assert.equal(event.defaultPrevented,true);
 assert.equal(event.stopped,true);
 assert.deepEqual(picked,['leftovers'],'the third choice keeps current equipment');
 assert.deepEqual(Array.from(h.api.skipped()),['lifeorb']);
 h.listeners.keydown(evt('Digit3'));
 assert.deepEqual(picked,['leftovers'],'a stale keypress cannot select twice');
 h.G.RunUI.showItemChoice('leftovers','quickclaw',id=>picked.push(id));
 h.listeners.keydown(evt('Numpad3'));
 assert.deepEqual(picked,['leftovers','leftovers']);
 assert.deepEqual(Array.from(h.api.skipped()),['lifeorb','quickclaw']);
 assert.equal(JSON.stringify(h.G.DB.save),h.before,'input cannot mutate long-term save');
});
