'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function harness(){
 let picker=null,toast=0,clicked=0;
 function node(tag='div'){
  const el={tagName:tag.toUpperCase(),nodeType:1,isConnected:true,hidden:false,
   children:[],attrs:{},className:'',style:{},parentElement:null,
   append(...parts){for(const p of parts){p.parentElement=this;this.children.push(p)}},
   setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]||null},
   remove(){this.isConnected=false;this.removed=true},focus(){},
   addEventListener(){},querySelector(){return null},classList:{contains:()=>false},
   click(){clicked++;this.onclick?.()},getClientRects:()=>[{}]};
  return el;
 }
 const document={body:{append(x){picker=x}},getElementById(){return picker?.isConnected?picker:null},createElement:node};
 const G={UI:{toast(){toast++}},DB:{upgradesOf:()=>({forget:1})},LevelUp:{offer:()=>[{key:'one'}]},
  Game:{player:null},T:x=>x,Icons:{html:()=>''}};
 const actor={dex:25,maxMoves:8,slots:[],moves:[],active:0,dead:false};
 for(let i=0;i<8;i++){const m={id:'skill-'+i,name:'Skill '+i,lvl:2};actor.moves.push(m);actor.slots.push([m])}
 G.Game.player=actor;
 vm.runInNewContext(read('src/pkmsvv-forget-skill.js'),{G,document,Math});
 return {G,actor,document,lib:G.PKMSVVForgetSkill,get toast(){return toast},get clicked(){return clicked}};
}
test('Eight forgettable skills show 3/3/2 and preserve the original skill ordering',()=>{
 const f=harness();assert.equal(f.lib.open(f.actor),true);
 const p=f.lib.current();assert.ok(p);assert.equal(p.buttons.length,8);
 assert.deepEqual(Array.from(p.buttons,x=>x.hidden),[false,false,false,true,true,true,true,true]);
 assert.equal(p.pageLabel.textContent,'1 / 3');
 assert.equal(f.lib.nextPage(),true);
 assert.deepEqual(Array.from(p.buttons,x=>x.hidden),[true,true,true,false,false,false,true,true]);
 assert.equal(p.pageLabel.textContent,'2 / 3');
 assert.equal(f.lib.nextPage(),true);
 assert.deepEqual(Array.from(p.buttons,x=>x.hidden),[true,true,true,true,true,true,false,false]);
 assert.equal(p.pageLabel.textContent,'3 / 3');
 assert.equal(f.lib.nextPage(),true);assert.equal(p.pageLabel.textContent,'1 / 3');
 assert.equal(f.actor.moves.length,8,'pagination must never remove skills');
 assert.equal(f.toast,0,'no toast or reward until a skill is picked');
});
test('Only a visible indexed slot can remove one skill and closes picker exactly once',()=>{
 const f=harness();f.lib.open(f.actor);
 f.lib.nextPage();f.lib.nextPage();
 assert.equal(f.lib.selectSlot(2),false,'the last page has only two cards');
 assert.equal(f.actor.moves.length,8);
 assert.equal(f.lib.selectSlot(1),true,'page three second slot maps to eighth skill');
 assert.equal(f.actor.moves.length,7);
 assert.ok(!f.actor.moves.some(x=>x.id==='skill-7'));
 assert.equal(f.toast,1);
 assert.equal(f.lib.selectSlot(0),false,'cannot remove twice after picker closes');
});
test('Controller mappings are identical to live level-up and never use D-pad for forgetting',()=>{
 const source=read('src/pkmsvv-modal-navigation-qa.js');
 assert.match(source,/level\?\.id==='pkmsvv-forget-skill'/);
 assert.match(source,/pressed\(2\),pressed\(3\),pressed\(1\),pressed\(0\)/);
 assert.match(source,/if\(edges\[3\]\)G\.PKMSVVForgetSkill\?\.nextPage\?\.\(\)/);
 assert.match(source,/G\.PKMSVVForgetSkill\?\.selectSlot\?\.\(index\)/);
 assert.match(source,/root\.id==='pkmsvv-forget-skill'&&root\.classList\?\.contains\('pkmsvv-forget-competitive'\)/);
 assert.match(read('src/pkmsvv-modal-navigation-qa.css'),/pkmsvv-forget-choice\[hidden\]\{display:none!important\}/);
});
test('Web Windows and Android promotions embed modified skill-forget module',()=>{
 for(const file of ['scripts/promote-web-v20.cjs','scripts/build-pokebox-stage1-pc-qa.cjs','scripts/patch-pokebox-stage4-apk-qa.cjs'])
  assert.match(read(file),/pkmsvv-forget-skill\.js/,file);
});
