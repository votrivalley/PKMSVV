'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const core=require('../src/pkmsvv-fossil-expedition-core.cjs');
function fixture(){
 const root=[];
 const node=(tag)=>({
  tag,children:[],style:{},id:'',className:'',textContent:'',isConnected:false,
  setAttribute(){},append(...children){for(const c of children){c.isConnected=true;this.children.push(c);}},
  remove(){this.isConnected=false;const i=root.indexOf(this);if(i>=0)root.splice(i,1);},
  querySelector(query){const cls=query.replace(/^\\./,'');return this.children.find(c=>c.className===cls)||
   this.children.flatMap(c=>c.children||[]).find(c=>c.className===cls)||null;}
 });
 const document={
  body:{append(c){c.isConnected=true;root.push(c);}},
  createElement:node,
  getElementById(id){return root.find(c=>c.id===id)||null;},
  addEventListener(){}
 };
 const player={uid:'host',x:0,y:0,dead:false},room={id:'R1',host:'host',mode:'fossil_lab',
  members:[{uid:'host',bot:false},{uid:'ai',bot:true}]};
 const G={
  I18n:{lang:'vi'},Social:{uid:'host',room},
  Game:{state:'playing',player},Coop:{isHost:true,puppets(){return [];},broadcast(){}},
  World:{isFree(){return true;},isLiquid(){return false;}},
  Spawner:{say(){}},PKMSVVFossilExpeditionCore:core,
  EnemyMgr:{all(){return [];}}
 };
 const Image=class{constructor(){this.complete=true;this.naturalWidth=384;}};
 const code=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-fossil-expedition-native.js'),'utf8');
 vm.runInNewContext(code,{G,document,Image,console,Math,Number,Map,Set});
 const canvasText=[];
 const ctx={save(){},restore(){},translate(){},rotate(){},beginPath(){},arc(){},fill(){},
  stroke(){},moveTo(){},lineTo(){},closePath(){},fillRect(){},
  fillText(text){canvasText.push(String(text));},strokeText(){}};
 return {api:G.PKMSVVFossilExpedition,player,document,root,ctx,canvasText};
}
test('every unmined excavation has a world-edge direction arrow',()=>{
 const f=fixture();assert.equal(f.api.begin({mode:'fossil_lab'}),true);
 f.api.hud(f.ctx,1280,800);
 for(const id of ['1','2','3'])assert.ok(f.canvasText.includes(id),'missing dig-site arrow '+id);
 assert.ok(f.canvasText.some(t=>t.endsWith('px')),'arrows need distance readout');
 f.api.end();
});
test('ninth valid mining hit opens Rotom portrait SOS and replaces arrows',()=>{
 const f=fixture();assert.equal(f.api.begin({mode:'fossil_lab'}),true);
 const s=f.api.session;
 for(const site of s.sites)for(let i=0;i<3;i++){
  f.player.x=site.x;f.player.y=site.y;
  assert.equal(f.api.perform().ok,true,'each hit needs a genuine nearby player');
  s.clock+=1;s.elapsed+=1;
 }
 assert.equal(s.phase,'rescue');
 const box=f.document.getElementById('pkmsvv-rotom-distress');
 assert.ok(box,'Rotom SOS must be a visible chat card after collecting all nine fragments');
 assert.equal(box.style.display,'flex');
 assert.match(box.querySelector('.pkmsvv-rotom-message').textContent,/Cứu tôi với!/);
 f.canvasText.length=0;f.api.hud(f.ctx,1280,800);
 assert.ok(f.canvasText.includes('SOS'),'guidance should now point to Rotom rather than old sites');
 f.api.end();
 assert.equal(f.document.getElementById('pkmsvv-rotom-distress'),null,'clear SOS after leaving the mode');
});
