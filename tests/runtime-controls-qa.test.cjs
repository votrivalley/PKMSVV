'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../src/pkmsvv-runtime-controls-qa.js'),'utf8');
function fixture(){
 const handlers={},timers=new Map(),vals=new Map(),speeds=[],casts=[],toasts=[];
 let seq=0,started=0,raf;
 const pl={x:0,y:0,dead:false,moves:Array.from({length:8},(_,i)=>({id:i}))};
 const G={
  I18n:{lang:'vi'},
  Game:{state:'playing',player:pl,debugSpeed(v){speeds.push(v)},startRun(){started++;return true;}},
  Settings:{get(k){return vals.get(k)},set(k,v){vals.set(k,v)}},
  UI:{toast(v){toasts.push(v)}},
  EnemyMgr:{all(){return [{x:50,y:0,dead:false},{x:800,y:800,dead:false}]}},
  Combat:{manualDash(p){casts.push({...p.lanBotAxis});return true;}}
 };
 const elements={};
 const document={
  body:{append(el){elements[el.id]=el}},
  getElementById(id){return elements[id]||null},
  createElement(tag){
   return {tagName:tag.toUpperCase(),isConnected:true,className:'',hidden:false,
    children:[],attributes:{},classList:{contains(){return false}},
    append(...nodes){this.children.push(...nodes)},
    before(){},setAttribute(k,v){this.attributes[k]=v},
    addEventListener(k,fn){this['on'+k]=fn}};
  },
  querySelectorAll(){return []},
  addEventListener(k,fn){handlers[k]=fn}
 };
 const win={addEventListener(k,fn){handlers['window:'+k]=fn}};
 vm.runInNewContext(source,{G,document,window:win,console,
  setTimeout(fn,ms){const id=++seq;timers.set(id,{fn,ms});return id},
  clearTimeout(id){timers.delete(id)},
  requestAnimationFrame(fn){raf=fn}});
 return {G,document,handlers,timers,vals,speeds,casts,toasts,pl,elements,
  api:G.PKMSVVRuntimeControlsQA,get started(){return started},
  runTimer(ms){for(const [id,t] of [...timers])if(t.ms===ms){timers.delete(id);t.fn();}},
  frame(ts){raf(ts)}};
}
test('Speed control uses real Game.debugSpeed 1×/1.5× and resets for a new run',()=>{
 const f=fixture();
 assert.equal(f.api.setSpeed(true),true);
 assert.equal(f.speeds.at(-1),1.5);
 assert.equal(f.api.setSpeed(false),true);
 assert.equal(f.speeds.at(-1),1);
 f.api.setSpeed(true);
 f.G.Game.startRun();
 assert.equal(f.speeds.at(-1),1,'next run must not inherit accelerated simulation');
 assert.equal(f.started,1);
});
test('Auto active skill aims toward nearest hostile without changing controller axis',()=>{
 const f=fixture();const original={x:-1,y:0};f.pl.lanBotAxis=original;
 assert.equal(f.api.toggleDash(),true);
 assert.equal(f.api.castTowardsNearest(),true);
 assert.equal(f.casts.length,1);
 assert.equal(f.casts[0].x,1);
 assert.equal(f.casts[0].y,0);
 assert.equal(f.pl.lanBotAxis,original,'manual input must be restored');
 f.G.Game.state='ui';
 assert.equal(f.api.castTowardsNearest(),false,'never cast in menus');
});
test('Holding active-skill F for 2s toggles AUTO; quick tap does not',()=>{
 const f=fixture();
 const key=(type)=>f.handlers[type]({repeat:false,code:'KeyF',altKey:false,ctrlKey:false,metaKey:false});
 key('keydown');key('keyup');f.runTimer(2000);
 assert.equal(f.api.castTowardsNearest(),false,'quick F does not change AUTO');
 key('keydown');f.runTimer(2000);key('keyup');
 assert.equal(f.api.castTowardsNearest(),true,'2s F enables auto');
 key('keydown');f.runTimer(2000);key('keyup');
 assert.equal(f.api.castTowardsNearest(),false,'another 2s F disables auto');
 assert.equal(f.toasts.length,2,'both state transitions give feedback');
});
test('After eight skills, auto-pick is opt-in and chooses one of three real cards',()=>{
 const f=fixture(),picked=[];const cards={children:[],before(el){f.elements[el.id]=el}};
 cards.children=[0,1,2].map(i=>({disabled:false,hidden:false,isConnected:true,getAttribute(){return null},click(){picked.push(i)}}));
 f.elements.cards=cards;
 f.elements['scr-levelup']={hidden:false,classList:{contains(){return false}}};
 f.api.ensureLevelup();f.runTimer(180);
 assert.equal(picked.length,0,'no automatic selection until enabled');
 assert.ok(f.elements['pkmsvv-maxskill-autopick'],'in-run button must exist');
 f.api.setEnabled(true);
 f.api.ensureLevelup();f.runTimer(180);
 assert.equal(picked.length,1);
 assert.ok([0,1,2].includes(picked[0]),'must click an existing native upgrade card');
 f.pl.moves.pop();
 assert.equal(f.api.full(),false,'never auto-pick before all eight moves are learned');
});
test('Auto-pick setting is persistent and available in Settings, not written to save',()=>{
 const f=fixture();
 const body={rows:[],querySelector(){return null},append(row){this.rows.push(row);for(const x of row.children)if(x.id)f.elements[x.id]=x}};
 f.elements['scr-settings']={classList:{contains(){return false}}};
 f.elements['set-body']=body;
 f.api.ensureSettings();
 assert.equal(body.rows.length,1);
 assert.match(body.rows[0].children[0].textContent,/Tự chọn 1\/3/);
 f.api.setEnabled(true);
 assert.equal(f.vals.get('pkmsvvAutoPickMaxSkill'),true);
 assert.equal(f.api.enabled(),true);
 assert.equal(f.G.DB,undefined,'Settings must not mutate a player save');
});
test('Every isolated QA builder copies the same runtime controls and CSS',()=>{
 for(const builder of ['scripts/build-pokebox-stage1-qa.cjs','scripts/build-pokebox-stage1-pc-qa.cjs','scripts/patch-pokebox-stage4-apk-qa.cjs']){
  const s=fs.readFileSync(path.resolve(__dirname,'..',builder),'utf8');
  for(const x of ['pkmsvv-runtime-controls-qa.js','pkmsvv-runtime-controls-qa.css'])
   assert.ok(s.includes(x),builder+' missing '+x);
 }
 const nav=fs.readFileSync(path.resolve(__dirname,'../src/pkmsvv-modal-navigation-qa.js'),'utf8');
 assert.ok(nav.includes('#pkmsvv-forget-skill'),'Forget Skill needs controller access');
});

test('speed toggle is absent in every Arena mode including AI tournaments',()=>{
 const f=fixture();
 for(const key of ['PKMSVVArenaSolo','PKMSVVChampionArena','PKMSVVArenaPvp','ArenaPvp']){
  f.G[key]={active:true};
  assert.equal(f.api.canSpeed(),false,key);
  assert.equal(f.api.setSpeed(true),false,key+' must never accelerate');
  f.api.ensureSpeed();
  assert.equal(f.elements['pkmsvv-speed-button'].hidden,true,key+' hides button');
  delete f.G[key];
 }
});
test('Co-op and sessions with even one human peer cannot accelerate',()=>{
 const f=fixture();
 f.G.Coop={active:true};
 f.G.Social={uid:'host',room:{isHost:true,mode:'coop',members:[{uid:'host',bot:false},{uid:'ai',bot:true}]}};
 assert.equal(f.api.canSpeed(),false,'Co-op mode is always blocked even with AI partners');
 assert.equal(f.api.setSpeed(true),false);
 f.G.Social.room.mode='royale';f.G.Royale={active:true};
 assert.equal(f.api.canSpeed(),true,'host Royale with bots only may speed up');
 assert.equal(f.api.setSpeed(true),true);
 f.G.Social.room.members.push({uid:'guest',bot:false});
 assert.equal(f.api.canSpeed(),false,'joining human must block speed');
 f.api.ensureSpeed();
 assert.equal(f.speeds.at(-1),1,'speed resets immediately after humans join');
 assert.equal(f.elements['pkmsvv-speed-button'].hidden,true);
 f.G.Social.room.members.pop();f.G.Social.room.isHost=false;
 assert.equal(f.api.canSpeed(),false,'remote client may never change host simulation time');
});
test('solo Explore and verified AI-only Egg Rush have bottom-left speed control',()=>{
 const f=fixture();
 f.G.PKMSVVQuickRegion={active:true};
 assert.equal(f.api.canSpeed(),true,'solo exploration');
 f.api.ensureSpeed();
 assert.equal(f.elements['pkmsvv-speed-button'].hidden,false);
 f.G.Coop={active:true};
 f.G.Social={uid:'solo',room:{mode:'eggrush',isHost:true,
  members:[{uid:'solo',bot:false},{uid:'bot1',bot:true},{uid:'bot2',lanBot:true}]}};
 f.G.EggRush={active:true};
 assert.equal(f.api.canSpeed(),true,'AI-only Egg Rush hosted locally');
 f.G.Social.room.members[1].bot=false;
 assert.equal(f.api.canSpeed(),false,'AI slot turning human immediately removes speed');
 const css=fs.readFileSync(path.resolve(__dirname,'../src/pkmsvv-runtime-controls-qa.css'),'utf8');
 assert.match(css,/#pkmsvv-speed-button\.pkmsvv-speed-button\{[^}]*bottom:/s);
 assert.match(css,/#pkmsvv-speed-button\.pkmsvv-speed-button\{[^}]*left:/s);
 assert.doesNotMatch(css,/#pkmsvv-speed-button\.pkmsvv-speed-button\{[^}]*top:max/s);
});
test('real-time evolution polling only activates for Arena/Egg Rush (not duplicate Royale draw)',()=>{
 const f=fixture(),calls=[];
 f.G.PKMSVVEvo={tryLiveCompetitive(...args){calls.push(args);return true}};
 f.G.Game.st={time:61};
 f.G.EggRush={active:true};f.frame(1000);
 assert.equal(calls.length,1);
 assert.equal(calls[0][0],f.pl);
 assert.equal(calls[0][1],61);
 f.G.Royale={active:true};f.frame(1500);
 assert.equal(calls.length,1,'Royale has its own evolution hook');
 f.G.Royale.active=false;f.G.EggRush.active=false;
 f.G.PKMSVVArenaSolo={active:true};f.frame(2000);
 assert.equal(calls.length,2,'Arena Solo evolution is checked without pausing');
});
