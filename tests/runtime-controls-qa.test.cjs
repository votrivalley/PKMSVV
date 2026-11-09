'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../src/pkmsvv-runtime-controls-qa.js'),'utf8');
function fixture(){
 const handlers={},timers=new Map(),vals=new Map(),speeds=[],casts=[],toasts=[];
 let seq=0,started=0,raf,pads=[];
 const pl={x:0,y:0,dead:false,moves:Array.from({length:8},(_,i)=>({id:'move-'+i,lvl:5,def:{maxLvl:5}}))};
 const G={
  I18n:{lang:'vi'},PKMSVVQuickRegion:{active:true},
  Game:{state:'playing',player:pl,debugSpeed(v){speeds.push(v)},startRun(){started++;return true;}},
  Settings:{get(k){return vals.get(k)},set(k,v){vals.set(k,v)}},
  UI:{toast(v){toasts.push(v)}},
  EnemyMgr:{all(){return [{x:50,y:0,dead:false},{x:800,y:800,dead:false}]}},
  Input:{axis(){return [-1,0]}},
  Combat:{manualDash(p){
   // Mirror actual native Combat.manualDash dispatch:
   // G.PKMSVVDash.direction(pl,G.Input.axis()) — never lanBotAxis.
   const axis=G.Input.axis();
   casts.push(Array.isArray(axis)?[...axis]:axis);
   return true;
  }}
 };
 const elements={};
 const document={
  body:{append(el){elements[el.id]=el}},
  getElementById(id){return elements[id]||null},
  createElement(tag){
   return {tagName:tag.toUpperCase(),isConnected:true,className:'',hidden:false,
    children:[],attributes:{},classList:{contains(){return false}},
    append(...nodes){this.children.push(...nodes)},replaceChildren(...nodes){this.children=[...nodes]},
    before(){},setAttribute(k,v){this.attributes[k]=v},
    addEventListener(k,fn){this['on'+k]=fn}};
  },
  querySelectorAll(){return []},
  addEventListener(k,fn){handlers[k]=fn}
 };
 const win={addEventListener(k,fn){handlers['window:'+k]=fn}};
 vm.runInNewContext(source,{G,document,window:win,navigator:{getGamepads(){return pads}},console,
  setTimeout(fn,ms){const id=++seq;timers.set(id,{fn,ms});return id},
  clearTimeout(id){timers.delete(id)},
  requestAnimationFrame(fn){raf=fn}});
 return {G,document,handlers,timers,vals,speeds,casts,toasts,pl,elements,
  api:G.PKMSVVRuntimeControlsQA,setPads(v){pads=v},get started(){return started},
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
 assert.equal(f.casts[0][0],1,'AUTO must pass real x-axis input to native dash');
 assert.equal(f.casts[0][1],0,'AUTO must pass real y-axis input to native dash');
 assert.equal(f.pl.lanBotAxis,original,'LAN bot input must be restored');
 assert.deepEqual(Array.from(f.G.Input.axis()),[-1,0],
  'keyboard, controller and joystick direction must remain unchanged after AUTO');
 f.G.Game.state='ui';
 assert.equal(f.api.castTowardsNearest(),false,'never cast in menus');
});
test('AUTO casting passes enemy direction into the real native Input.axis() read and restores it even on failure',()=>{
 const f=fixture(),was=f.G.Input.axis,aimed=[];
 f.G.Combat.manualDash=function(pl){
  const axis=this===f.G.Combat?f.G.Input.axis():null;
  aimed.push({axis:[...axis],nativeAngle:Math.atan2(axis[1],axis[0])});
  return true;
 };
 f.G.EnemyMgr.all=()=>[{x:0,y:100,dead:false,remote:false}];
 f.api.toggleDash();
 assert.equal(f.api.castTowardsNearest(),true);
 assert.ok(Math.abs(aimed[0].nativeAngle-Math.PI/2)<.001,
  'native dash must aim DOWN at the nearby enemy, not use keyboard LEFT');
 assert.equal(f.G.Input.axis,was,'original function identity restored, not just its values');
 const other=fixture(),oldAxis=other.G.Input.axis,oldBot=other.pl.lanBotAxis;
 other.G.Combat.manualDash=()=>{
  assert.equal(other.G.Input.axis()[0],1,'native sees target while dispatch is executing');
  throw Error('native dash failed');
 };
 other.api.toggleDash();
 assert.throws(()=>other.api.castTowardsNearest(),/native dash failed/);
 assert.equal(other.G.Input.axis,oldAxis,'exception must restore keyboard axis');
 assert.equal(other.pl.lanBotAxis,oldBot,'exception must restore player axis');
});
test('AUTO remains active and automatically retries native dash on later frames after cooldown rejection',()=>{
 const f=fixture(),axes=[],original=f.G.Input.axis;
 let ready=false;
 f.G.Combat.manualDash=()=>{
  axes.push([...f.G.Input.axis()]);
  return ready;
 };
 f.api.toggleDash();
 f.frame(200);
 assert.equal(axes.length,1,'AUTO must try native combat without another F press');
 assert.deepEqual(axes[0],[1,0]);
 assert.equal(f.G.Input.axis,original);
 ready=true;
 f.frame(400);
 assert.equal(axes.length,2,'AUTO must retry when native combat becomes ready');
 assert.equal(f.G.Input.axis,original);
 f.api.toggleDash();
 f.frame(600);
 assert.equal(axes.length,2,'no casts after turning AUTO off');
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

test('holding the native mobile active-skill canvas button 2 seconds toggles AUTO without an extra dash',()=>{
 const f=fixture();let manual=0;
 const nativeCalls=[],events={},canvas={id:'game',width:780,height:437,
  addEventListener(type,fn){events[type]=fn},
  getBoundingClientRect(){return {left:0,top:0,width:780,height:437}}};
 f.elements.game=canvas;
 f.G.PKMSVVDash={preview(){return {ready:true,move:{id:'quick-attack'}}}};
 f.G.Touch={addButton(...args){nativeCalls.push(args)}};
 assert.equal(f.api.installTouchAuto(),true);
 f.G.Touch.addButton(100,100,64,64,()=>{manual++;return true},4);
 const btn=nativeCalls.at(-1)[4],event=(id,x,y)=>({pointerId:id,pointerType:'touch',clientX:x,clientY:y,
  preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}});
 events.pointerdown(event(1,125,125));
 f.runTimer(2000);
 f.handlers.pointerup(event(1,125,125));
 btn();
 assert.equal(manual,0,'long press must NOT fire a stray manual dash');
 assert.equal(f.api.castTowardsNearest(),true,'AUTO now triggers the real manualDash');
 const after=f.casts.length;
 // The second 2-second hold disables AUTO.
 f.G.Touch.addButton(100,100,64,64,()=>{manual++;return true},4);
 events.pointerdown(event(2,125,125));f.runTimer(2000);f.handlers.pointerup(event(2,125,125));
 assert.equal(f.api.castTowardsNearest(),false);
 assert.equal(f.casts.length,after);
 assert.equal(f.toasts.length,2);
});
test('short touch taps still use native dash, and dragging away never toggles AUTO',()=>{
 const f=fixture();let native=0,events={},canvas={width:780,height:437,
  addEventListener(type,fn){events[type]=fn},
  getBoundingClientRect(){return {left:0,top:0,width:780,height:437}}};
 f.elements.game=canvas;
 f.G.PKMSVVDash={preview(){return {ready:true}}};
 const calls=[];f.G.Touch={addButton(...args){calls.push(args)}};
 f.api.installTouchAuto();
 f.G.Touch.addButton(100,100,64,64,()=>{native++;return true},4);
 const mk=(id,x,y)=>({pointerId:id,pointerType:'touch',clientX:x,clientY:y});
 events.pointerdown(mk(1,125,125));f.handlers.pointerup(mk(1,125,125));
 calls.at(-1)[4]();
 assert.equal(native,1,'ordinary tap must use original Touch callback');
 f.G.Touch.addButton(100,100,64,64,()=>{native++;return true},4);
 events.pointerdown(mk(2,120,120));events.pointermove(mk(2,175,130));
 f.runTimer(2000);
 assert.equal(f.api.castTowardsNearest(),false,'dragged touch must not toggle');
 assert.equal(f.toasts.length,0);
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
test('Rift reset and transient Explore.active=false never turn off selected ×1.5',()=>{
 const f=fixture();f.G.Rift={inArena:false};
 f.api.setSpeed(true);
 f.frame(500);
 f.G.Rift.inArena=true;f.G.Game.state='ui';f.G.PKMSVVQuickRegion.active=false;
 f.frame(1000);
 assert.equal(f.speeds.at(-1),1.5,'transition UI must not cancel selected speed');
 f.G.Game.state='playing';f.G.Rift.inArena=false;
 f.G.Game.debugSpeed(1); // simulate native Rift exit resetting speed invisibly
 f.frame(1500);
 assert.equal(f.speeds.at(-1),1.5,'same battle must restore ×1.5 even without flag flip detected');
 f.api.ensureSpeed();
 assert.equal(f.elements['pkmsvv-speed-button'].hidden,false,'speed button stays visible on return');
 f.G.PKMSVVQuickRegion.active=true;
 f.frame(2500);
 assert.equal(f.speeds.at(-1),1.5);
 f.G.Game.startRun();
 assert.equal(f.speeds.at(-1),1,'new battle must reset speed');
});
test('Rift entry and exit retain 1.5× without accidentally enabling competitive speed',()=>{
 const f=fixture();f.G.Rift={inArena:false};
 f.api.setSpeed(true);f.frame(500);
 const before=f.speeds.length;
 f.G.Rift.inArena=true;f.G.Game.state='ui';f.frame(1000);
 assert.equal(f.speeds.length,before,'transition cannot reset speed to 1x');
 f.G.Game.state='playing';f.frame(1500);
 assert.equal(f.speeds.at(-1),1.5);
 const entering=f.speeds.length;
 f.G.Rift.inArena=false;f.frame(2000);
 assert.equal(f.speeds.length,entering+1,'speed re-applies after leaving Rift');
 assert.equal(f.speeds.at(-1),1.5);
 f.G.PKMSVVArenaSolo={active:true};f.frame(2500);
 assert.equal(f.speeds.at(-1),1,'Arena remains at native speed');
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

test('G/L keyboard and RB/R3 controller shortcuts toggle the real speed/Co-op ranking independently',()=>{
 const f=fixture();
 f.G.PKMSVVPadOrb={keyboardBindings(){return {speed:'keyg',leaderboard:'keyl'}},
  bindings(){return {speed:5,leaderboard:11}}};
 f.G.SettingsUI={isOpen:false};
 const press=code=>f.handlers.keydown({repeat:false,code,altKey:false,ctrlKey:false,metaKey:false,
  preventDefault(){}});
 press('KeyG');
 assert.equal(f.speeds.at(-1),1.5,'G enables speed in Explore');
 press('KeyG');
 assert.equal(f.speeds.at(-1),1,'G switches speed back off');
 const buttons=Array.from({length:12},()=>({pressed:false,value:0}));
 const pad={connected:true,buttons};
 f.setPads([pad]);
 buttons[5].pressed=true;f.api.pollPadShortcuts();
 assert.equal(f.speeds.at(-1),1.5,'RB toggles the same speed control');
 f.api.pollPadShortcuts();
 assert.equal(f.speeds.at(-1),1.5,'holding RB does not toggle repeatedly');
 buttons[5].pressed=false;f.api.pollPadShortcuts();
 f.G.Coop={active:true,players(){return [
  {uid:'host',kills:12,level:20},{uid:'friend',kills:35,level:14},
  {uid:'bot',kills:18,level:30}]}};
 f.G.Social={room:{mode:'coop',members:[
  {uid:'host',name:'Host'},{uid:'friend',name:'Friend'},{uid:'bot',name:'Bot'}]}};
 f.G.PKMSVVQuickRegion.active=false;
 assert.equal(f.api.canRanking(),true);
 f.api.ensureRanking();
 assert.equal(f.elements['pkmsvv-coop-ranking-toggle'].hidden,false);
 assert.deepEqual(f.api.rankingRows().map(x=>x.name),['Friend','Bot','Host']);
 press('KeyL');
 assert.equal(f.elements['pkmsvv-coop-ranking-list'].hidden,false);
 assert.match(f.elements['pkmsvv-coop-ranking-list'].children[1].textContent,/Friend/);
 buttons[11].pressed=true;f.api.pollPadShortcuts();
 assert.equal(f.elements['pkmsvv-coop-ranking-list'].hidden,true,'R3 hides TOP list');
 buttons[11].pressed=false;f.api.pollPadShortcuts();
 buttons[11].pressed=true;f.api.pollPadShortcuts();
 assert.equal(f.elements['pkmsvv-coop-ranking-list'].hidden,false,'R3 reopens TOP list');
 f.G.Coop.active=false;f.api.ensureRanking();
 assert.equal(f.elements['pkmsvv-coop-ranking-toggle'].hidden,true);
 assert.equal(f.elements['pkmsvv-coop-ranking-list'].hidden,true);
});
test('Arena Shiny hook rejects actual collection/grant and summary but retains normal Explore claims',()=>{
 const f=fixture(),awards=[],summaries=[];
 f.G.DB={grantShiny(dex){awards.push(dex);return true}};
 f.G.onShinyCaught=e=>f.G.DB.grantShiny(e.dex);
 f.G.RunUI={showOver(s){summaries.push(s);return true}};
 f.api.ensureArenaShinyGuard();
 f.G.PKMSVVChampionArena={active:true};
 assert.equal(f.G.onShinyCaught({dex:25}),false);
 assert.equal(f.G.DB.grantShiny(25),false);
 assert.equal(awards.length,0,'no Shiny persistence in Champion');
 f.G.RunUI.showOver({caught:[{dex:25}]});
 assert.equal(summaries.at(-1).caught.length,0,'Arena results never show claimed Shiny');
 f.G.PKMSVVChampionArena.active=false;
 assert.equal(f.G.onShinyCaught({dex:25}),true);
 assert.deepEqual(awards,[25],'normal Explore Shiny collection preserved');
 f.G.RunUI.showOver({caught:[{dex:25}]});
 assert.equal(summaries.at(-1).caught.length,1);
});
test('remapping screen describes all four new inputs and does not commandeer existing Orb/Mega buttons',()=>{
 const src=fs.readFileSync(path.resolve(__dirname,'../src/v14/pad-orb-map.js'),'utf8');
 assert.match(src,/speed:'keyg'/);
 assert.match(src,/leaderboard:'keyl'/);
 assert.match(src,/speed:5,leaderboard:11/);
 assert.match(src,/KB_IDS=.*speed.*leaderboard/);
 assert.match(src,/PAD_IDS=.*speed.*leaderboard/);
 const bundle=fs.readFileSync(path.resolve(__dirname,'../scripts/patch-qa-compiled-modules.cjs'),'utf8');
 assert.match(bundle,/'PKMSVVPadOrb','src\/v14\/pad-orb-map\.js'/);
});

test('Hovering Reshiram and Flying-type Pokémon ignore WATER slowdown without global speed buffs',()=>{
 const f=fixture();
 class Player{
  constructor(dex,types){this.dex=dex;this.mon={dex,types};this.inLiquid=true;this.baseSpd=100;}
  get spd(){return this.baseSpd*(this.inLiquid?.6:1);}
 }
 f.G.Player=Player;
 f.G.World={liquidEffect:()=>({slow:.6,dmg:0,slide:false})};
 assert.equal(f.api.installHoverWater(),true);
 assert.equal(new Player(643,['dragon','fire']).spd,100,'Reshiram hovers');
 assert.equal(new Player(6,['fire','flying']).spd,100,'Flying species hover');
 assert.equal(new Player(7,['water']).spd,60,'non-flying species keep native terrain behavior');
 const reshiram=new Player(643,['dragon','fire']);assert.equal(reshiram.spd,100);
 assert.equal(reshiram.inLiquid,true,'speed read must never change subsequent terrain/collision state');
 f.G.World.liquidEffect=()=>({slow:.6,dmg:.02,slide:false});
 assert.equal(reshiram.spd,60,'do not silently bypass damaging liquid terrain');
 assert.equal(f.api.installHoverWater(),true,'idempotent reinstallation');
});
test('Level-up controller exposes non-button cards and routes A to native pick',()=>{
 const source=require('node:fs').readFileSync(require('node:path').resolve(__dirname,'../src/pkmsvv-modal-navigation-qa.js'),'utf8');
 assert.match(source,/root\.id==='scr-levelup'/);
 assert.match(source,/#cards \.card/);
 assert.match(source,/G\.RunUI\.pick\(index\)/);
 assert.match(source,/card\.tabIndex=0/);
});
