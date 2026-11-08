'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../src/pkmsvv-runtime-controls-qa.js'),'utf8');
function fixture(){
 const handlers={},timers=new Map(),vals=new Map(),speeds=[],casts=[],toasts=[];
 let seq=0,started=0,raf;
 const pl={x:0,y:0,dead:false,moves:Array.from({length:8},(_,i)=>({id:'move-'+i,lvl:5,def:{maxLvl:5}}))};
 const G={
  I18n:{lang:'vi'},PKMSVVQuickRegion:{active:true},
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
test('Auto-pick is offered only when ALL eight moves MAX; after opting in it never opens a card UI',()=>{
 const f=fixture(),picked=[],opened=[];
 f.G.RunUI={showLevelUp(level,offers,complete){opened.push(level);return 'opened'}};
 f.api.installAutoPick();
 const cards=[{id:'one',apply(){picked.push('one')}},{id:'two',apply(){picked.push('two')}},
  {id:'three',apply(){picked.push('three')}}];
 const onPick=c=>c.apply(f.pl);
 assert.equal(f.api.full(),true);
 f.G.RunUI.showLevelUp(35,cards,onPick,false);
 assert.equal(opened.length,1,'opt-in never happens automatically');
 f.api.setEnabled(true);
 f.G.RunUI.showLevelUp(36,cards,onPick,false);
 assert.equal(opened.length,1,'auto mode must skip card rendering completely');
 f.runTimer(0);
 assert.equal(picked.length,1,'complete the original callback and apply one card');
 f.pl.moves[0].lvl=4;
 assert.equal(f.api.full(),false,'one sub-MAX move disables auto mode');
 f.G.RunUI.showLevelUp(37,cards,onPick,false);
 assert.equal(opened.length,2,'normal choice still opens before all eight MAX');
 f.pl.moves[0].lvl=5;f.pl.moves.pop();
 assert.equal(f.api.full(),false,'seven maxed moves are still below the requirement');
});
test('1.5x speed remains selected during temporary levelup/choice and is restored on return',()=>{
 const f=fixture();
 f.api.setSpeed(true);f.frame(500);
 f.G.Game.state='levelup';f.frame(1000);
 assert.equal(f.api.canSpeed(),true,'levelup is a temporary screen, not a new run');
 assert.equal(f.speeds.at(-1),1.5,'no forced reset during levelup');
 f.G.Game.state='choice';f.frame(1500);
 assert.equal(f.speeds.at(-1),1.5,'item/evolution selection also keeps speed');
 f.G.Game.state='playing';f.frame(2000);
 assert.equal(f.speeds.at(-1),1.5,'restore multiplier after returning from popups');
 assert.equal(f.api.setSpeed(false),true);
 assert.equal(f.speeds.at(-1),1);
});
test('Auto-pick setting is persistent and available in Settings, not written to save',()=>{
 const f=fixture();
 const body={rows:[],querySelector(){return null},append(row){this.rows.push(row);for(const x of row.children)if(x.id)f.elements[x.id]=x}};
 f.elements['scr-settings']={classList:{contains(){return false}}};
 f.elements['set-body']=body;
 f.api.ensureSettings();
 assert.equal(body.rows.length,1);
 assert.match(body.rows[0].children[0].textContent,/8 kỹ năng đã MAX/);
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
test('AI-only Sống Sót and both Giải cứu Berry difficulties may accelerate',()=>{
 for(const mode of ['coop','berry','berryeasy']){
  const f=fixture();
  f.G.Coop={active:true};
  f.G.PKMSVVQuickRegion.active=false;
  f.G.Social={uid:'host',room:{isHost:true,mode,members:[
   {uid:'host',bot:false},{uid:'ai1',bot:true},{uid:'ai2',lanBot:true}]}};
  assert.equal(f.api.canSpeed(),true,mode+' must allow AI-only local host');
  assert.equal(f.api.setSpeed(true),true,mode+' may toggle 1.5x');
  assert.equal(f.speeds.at(-1),1.5,mode);
  f.api.ensureSpeed();
  assert.equal(f.elements['pkmsvv-speed-button'].hidden,false,mode+' shows speed button');
  f.G.Social.room.members.push({uid:'guest',bot:false});
  assert.equal(f.api.canSpeed(),false,mode+' cannot speed with a second human');
  f.api.ensureSpeed();
  assert.equal(f.speeds.at(-1),1,mode+' immediately resets to 1x');
  assert.equal(f.elements['pkmsvv-speed-button'].hidden,true,mode+' hides button');
  assert.equal(f.api.setSpeed(true),false,mode+' must reject bypass attempts');
 }
});
test('Sống Còn and Tranh Trứng always disable speed, even with bots only',()=>{
 for(const [mode,flag] of [['royale','Royale'],['eggrush','EggRush']]){
  const f=fixture();
  f.G.Coop={active:true};f.G[flag]={active:true};
  f.G.Social={uid:'host',room:{isHost:true,mode,members:[
   {uid:'host',bot:false},{uid:'bot1',bot:true},{uid:'bot2',bot:true}]}};
  assert.equal(f.api.canSpeed(),false,mode+' is a competitive mode');
  assert.equal(f.api.setSpeed(true),false,mode+' speed API must refuse');
  f.api.ensureSpeed();
  assert.equal(f.elements['pkmsvv-speed-button'].hidden,true,mode+' speed button stays hidden');
  // Initial room mode is already enough to block acceleration, even when
  // competitive runtime flags are not initialized yet.
  f.G[flag].active=false;
  assert.equal(f.api.canSpeed(),false,mode+' is blocked before round starts');
  assert.equal(f.api.setSpeed(true),false,mode+' cannot bypass early in countdown');
 }
});
test('solo Explore has bottom-left speed; ordinary non-Explore solo has none',()=>{
 const f=fixture();
 assert.equal(f.api.canSpeed(),true,'solo exploration');
 f.api.ensureSpeed();
 assert.equal(f.elements['pkmsvv-speed-button'].hidden,false);
 f.G.PKMSVVQuickRegion.active=false;
 assert.equal(f.api.canSpeed(),false,'ordinary campaign solo is not Explore');
 assert.equal(f.api.setSpeed(true),false,'no speed when Explore is inactive');
 const css=fs.readFileSync(path.resolve(__dirname,'../src/pkmsvv-runtime-controls-qa.css'),'utf8');
 assert.match(css,/#pkmsvv-speed-button\.pkmsvv-speed-button\{[^}]*bottom:/s);
 assert.match(css,/#pkmsvv-speed-button\.pkmsvv-speed-button\{[^}]*left:/s);
 assert.doesNotMatch(css,/#pkmsvv-speed-button\.pkmsvv-speed-button\{[^}]*top:max/s);
});
test('AI rooms fail closed on unverified peers or if user is not the host',()=>{
 const f=fixture();
 f.G.Coop={active:true};
 f.G.Social={uid:'host',room:{mode:'coop',isHost:true,members:[
  {uid:'host',bot:false},{uid:'bot1',bot:true}]}};
 assert.equal(f.api.canSpeed(),true);
 f.G.Social.room.isHost=false;
 assert.equal(f.api.canSpeed(),false,'remote LAN client must not change speed');
 f.G.Social.room.isHost=true;
 f.G.Social.room.members.push({uid:'unknown'});
 assert.equal(f.api.canSpeed(),false,'unspecified human-or-AI membership blocks speed');
 f.G.Social.room.members.pop();
 f.G.Social.uid='guest';
 assert.equal(f.api.canSpeed(),false,'unknown local human identity blocks speed');
 f.G.Social.uid='host';f.G.Social.room.members=[{uid:'host',bot:false}];
 assert.equal(f.api.canSpeed(),false,'an AI-only match needs at least one actual bot');
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
