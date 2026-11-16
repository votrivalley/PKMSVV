'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const P=require('../src/pkmsvv-pippi.js');
function save(xp=0){return {coins:711,globalUpgrades:{power:2,revive:1},
 globalSpent:{power:900,revive:50000},pkmsvvPippi:{xp}};}
function game(s=save(54)){
 const player={x:100,y:120,hp:0,maxHp:100,dead:false,invuln:0,
  atkMul:1,extraRevives:1,revive(f){this.hp=this.maxHp*f;this.dead=false;}};
 const G={DB:{save:s,commit(){return true;}},Game:{state:'playing',player,st:{time:100}},
  PKMSVVQuickRegion:{active:true},Coop:{active:false},Royale:{active:false},
  EggRush:{active:false},Social:{room:{mode:'explore'}},EnemyMgr:{all:()=>[]}};
 return {G,player};
}
test('Bond 1–10 is persistent, monotonic and capped',()=>{
 assert.equal(P.rank(0),1);assert.equal(P.rank(2),2);
 assert.equal(P.rank(44),9);assert.equal(P.rank(54),10);assert.equal(P.rank(99999),10);
 const s={};assert.equal(P.data(s).bond,1);
 assert.deepEqual(P.earn(s,2),{level:2,leveled:true,xp:2});
 assert.equal(P.earn(s,0).leveled,false);
 assert.equal(P.earn(s,999).level,10);
});
test('revive refund is exactly paid 50,000 once, never other upgrades',()=>{
 const s=save();const money=s.coins;
 assert.equal(P.refund(s),50000);
 assert.equal(s.coins,money+50000);
 assert.deepEqual(s.globalUpgrades,{power:2});
 assert.deepEqual(s.globalSpent,{power:900});
 assert.equal(s.pkmsvvPippi.refundReviveV1,true);
 assert.equal(P.refund(s),0);assert.equal(s.coins,money+50000);
});
test('pre-ledger old saves get 50k, nonowners get zero; arbitrary ledger values cannot mint money',()=>{
 const old={coins:8,globalUpgrades:{revive:1}};
 assert.equal(P.refund(old),50000);assert.equal(old.coins,50008);
 const unknown={coins:8,globalUpgrades:{},globalSpent:{revive:50000}};
 assert.equal(P.refund(unknown),0);assert.equal(unknown.coins,8);
 const capped={coins:3,globalUpgrades:{revive:1},globalSpent:{revive:99999999}};
 assert.equal(P.refund(capped),50000);
});
test('Pippi never plays in Co-op, Arena, Royale, Egg Rush or normal nonregion runs',()=>{
 const {G}=game();assert.equal(P.eligible(G),true);
 G.Coop.active=true;assert.equal(P.eligible(G),false);G.Coop.active=false;
 G.PKMSVVArenaSolo={active:true};assert.equal(P.eligible(G),false);delete G.PKMSVVArenaSolo;
 G.Royale.active=true;assert.equal(P.eligible(G),false);G.Royale.active=false;
 G.EggRush.active=true;assert.equal(P.eligible(G),false);G.EggRush.active=false;
 G.PKMSVVQuickRegion.active=false;assert.equal(P.eligible(G),false);
});
test('AI heal respects HP cap and danger threshold',()=>{
 const p={hp:20,maxHp:100};
 assert.equal(P.heal(p,1),true);assert.ok(p.hp>20&&p.hp<45);
 p.hp=90;assert.equal(P.heal(p,10),false);assert.equal(p.hp,90);
 p.hp=60;assert.equal(P.heal(p,10),true);assert.ok(p.hp<=100);
});
test('temporary attack buff and enemy slow restore exactly on expiry or exit',()=>{
 const {G,player}=game();const run=P.newRun(player);
 assert.equal(P.buff(player,run,10,5),true);
 assert.equal(P.buff(player,run,11,5),false);
 assert.ok(player.atkMul>1);
 P.endEffects(run,19);assert.ok(Math.abs(player.atkMul-1)<1e-12);
 const enemy={x:102,y:121,spd:100,dead:false};
 G.EnemyMgr.all=()=>[enemy];
 assert.equal(P.slow(G,run,20,4),true);assert.equal(enemy.spd,65);
 P.finish(run);assert.equal(enemy.spd,100);
});
test('Moon Miracle triggers only at Bond 10 once per Explore run, then Pippi sleeps',()=>{
 const {G,player}=game(save(54)),run=P.newRun(player,90);
 assert.equal(P.tryRevive(G,run,player,100),true);
 assert.equal(player.hp,40);assert.equal(player.invuln,3);
 assert.equal(run.revived,true);assert.equal(run.sleepUntil,175);assert.equal(player.extraRevives,0);
 player.hp=0;assert.equal(P.tryRevive(G,run,player,110),false);
 const lower=game(save(44));assert.equal(P.tryRevive(lower.G,P.newRun(lower.player),lower.player,10),false);
 const coop=game(save(54));coop.G.Coop.active=true;
 assert.equal(P.tryRevive(coop.G,P.newRun(coop.player),coop.player,10),false);
});
test('production Android overlays Pippi and swaps the obsolete compiled GlobalPower hook',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
 const prod=read('scripts/patch-v20-android-production.cjs');
 const compiled=read('scripts/patch-qa-compiled-modules.cjs');
 const build=read('scripts/prepare-game.cjs');
 const power=read('src/pkmsvv-global-power.js');
 const ui=read('src/pkmsvv-global-power-ui.js');
 assert.ok(prod.includes("'pkmsvv-pippi.js'"));
 assert.ok(prod.includes("'pkmsvv-pippi.css'"));
 assert.ok(compiled.includes("['GlobalPower','src/pkmsvv-global-power.js']"));
 assert.ok(build.includes('js/ui/pkmsvv-pippi.js'));
 assert.match(power,/retired:true/);
 assert.match(power,/return !!G\.PKMSVVPippi\?\.tryRevive/);
 assert.match(ui,/filter\(u=>!u\.retired\)/);
});


test('Pippi has real independent world position and does not snap to player',()=>{
 const player={x:100,y:120},run=P.newRun(player,0);
 let follower=P.advanceFollower(run,player,0);
 assert.ok(follower&&follower.x!==player.x,'Pippi should spawn next to player, not on top');
 player.x+=15;
 follower=P.advanceFollower(run,player,.2);
 assert.notEqual(follower.x,player.x,'Pippi has independent coordinates');
 assert.ok(follower.x>25,'Pippi begins following the recorded route');
 assert.ok(Math.hypot(follower.x-player.x,follower.y-player.y)>=56,'Pippi never overlaps the player');
 player.x+=30;
 follower=P.advanceFollower(run,player,.4);
 assert.ok(follower.speed>0,'Follower uses measured player speed');
 assert.equal(typeof follower.direction,'number');
 assert.ok(follower.direction>=0&&follower.direction<8);
});
test('Pippi uses a support formation with an idle dead zone and a catch-up leash',()=>{
 const player={x:300,y:300},run=P.newRun(player,0);
 let p=P.advanceFollower(run,player,0);
 const start={x:p.x,y:p.y};
 for(let i=1;i<=12;i++)p=P.advanceFollower(run,player,i*.25);
 assert.equal(p.moving,false,'standing player should not force perpetual companion motion');
 assert.ok(Math.hypot(p.x-start.x,p.y-start.y)<=16,
  'do not glue Pippi directly to the player every tick');
 for(let i=13;i<=24;i++){
  player.x+=25;
  p=P.advanceFollower(run,player,i*.25);
  assert.ok(Math.hypot(p.x-player.x,p.y-player.y)<220,
   'support catch-up stays near the player during normal running');
 }
 // Once the player stops, the support may make a brief playful sidestep
 // around the fifth idle second. Give that one animation time to settle.
 for(let i=25;i<=53;i++)p=P.advanceFollower(run,player,i*.25);
 assert.equal(p.moving,false,'support becomes idle after the deliberate sidestep');
 assert.ok(Math.hypot(p.x-player.x,p.y-player.y)>=56,
  'idle support cannot overlap the lead Pokemon');
});

test('Pippi ground sprite is enlarged and all floating/over-UI effects are disabled',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-pippi.css'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-pippi.js'),'utf8');
 assert.match(css,/scale\(1\.395\)/,'idle and walk share new 10%-smaller grounded scale');
 assert.match(js,/Math\.max\(\.8,base\)\*1\.008/,'native world actor must shrink by 10%');
 assert.doesNotMatch(css,/scale\(2\.22\)|scale\(1\.68\)/,'never change size on state transition');
 assert.doesNotMatch(css,/@keyframes pippi-follow-bob/);
 assert.match(css,/@keyframes pippi-walk-frames/);
 assert.match(css,/steps\(8,end\)/,'walk anim runs all eight frames independently');
 assert.match(css,/transition:left \.24s linear,top \.24s linear/);
 assert.match(css,/#pkmsvv-pippi-follower\[hidden\]/);
 assert.match(js,/part\.style\.backgroundPositionY/,'only the eight-direction row is selected by AI');
 assert.match(js,/visualModalOpen\(\)/);
 assert.match(js,/concealVisuals\(\)/);
});

test('Playful Pippi waits and sidesteps on her own while staying near the lead',()=>{
 const player={x:300,y:300},run=P.newRun(player,0);
 let p=P.advanceFollower(run,player,0);
 for(let i=1;i<20;i++)p=P.advanceFollower(run,player,i*.25);
 const before=p.quirkCount;
 for(let i=20;i<=26;i++)p=P.advanceFollower(run,player,i*.25);
 assert.ok(p.quirkCount>before,'idle companion periodically chooses her own side');
 assert.ok(['prance','peek'].includes(p.mood));
 assert.ok(Math.hypot(p.x-player.x,p.y-player.y)>=55.9,'independent AI must preserve clearance');
 assert.ok(Math.hypot(p.x-player.x,p.y-player.y)<190,'Pippi may play but never abandon her support role');
});

test('Healing and attack support paint clear native FX on player and on Pippi',()=>{
 const events=[],FX={
  ring(...a){events.push(['ring',...a])},
  burst(...a){events.push(['burst',...a])},
  dmgText(...a){events.push(['text',...a])}
 };
 const pl={x:120,y:180};
 const run={motion:{x:91,y:169}};
 assert.equal(P.showSupportFX({FX},run,pl,'heal',35),true);
 assert.ok(events.some(x=>x[0]==='text'&&String(x[3]).includes('+35 HP')));
 assert.ok(events.filter(x=>x[0]==='ring').length>=2);
 events.length=0;
 assert.equal(P.showSupportFX({FX},run,pl,'buff'),true);
 assert.ok(events.some(x=>x[0]==='text'&&String(x[3]).includes('TĂNG CÔNG')));
 assert.equal(P.showSupportFX({},run,pl,'heal',35),false,'missing FX has no gameplay side effects');
});

test('Pippi slow visibly marks only real enemies affected (up to six)',()=>{
 const foes=Array.from({length:8},(_,i)=>({
  x:108+i*3,y:125,spd:100,dead:false
 }));
 const logs=[],fx={
  ring(...a){logs.push(['ring',...a]);},
  burst(...a){logs.push(['burst',...a]);},
  dmgText(...a){logs.push(['text',...a]);}
 };
 const {G,player}=game(save(54));player.x=100;player.y=120;
 G.Game.st.time=20;G.EnemyMgr.all=()=>foes;G.FX=fx;
 const run=P.newRun(player,20);run.motion={x:80,y:100};
 assert.equal(P.slow(G,run,20,5),true);
 assert.equal(run.lastSlowTargets.length,6);
 assert.equal(P.showSupportFX(G,run,player,'slow'),true);
 const slowed=logs.filter(x=>x[0]==='text'&&x[3]==='CHẬM!');
 assert.equal(slowed.length,6,'a slowdown label is drawn at each affected enemy');
 assert.ok(slowed.every(x=>x[1]!==player.x||x[2]!==player.y-26),
  'never incorrectly draw slowdown on the player');
 assert.ok(run.castCue&&run.castCue.targets.length===6);
 P.finish(run);assert.ok(foes.every(x=>x.spd===100),'status restore is unchanged');
});

test('Pippi shield, revive, buff and cousin each have distinct bounded support cues',()=>{
 const logs=[],fx={
  ring(...a){logs.push(['ring',...a]);},
  burst(...a){logs.push(['burst',...a]);},
  dmgText(...a){logs.push(['text',...a]);}
 };
 const {G,player}=game(save(54));G.FX=fx;
 const run=P.newRun(player,12);run.motion={x:80,y:100};
 for(const event of ['heal','buff','shield','revive','cousin']){
  logs.length=0;
  const old=player.atkMul;
  assert.equal(P.showSupportFX(G,run,player,event,35),true);
  assert.equal(run.castCue.event,event);
  assert.ok(logs.filter(x=>x[0]==='ring').length>=2);
  assert.ok(logs.filter(x=>x[0]==='burst').length>=2);
  assert.ok(logs.length<=9,'effects are event-limited and do not spawn loops');
  assert.equal(player.atkMul,old,'cosmetic effects must not affect combat stats');
 }
 const s={pkmsvvPippi:{xp:14,training:{cousin:3}}};
 G.DB.save=s;G.Game.st.time=20;player.hp=100;player.maxHp=100;
 const foe={x:125,y:125,dead:false,applyStun(v){this.stun=v;}};
 G.EnemyMgr.all=()=>[foe];logs.length=0;
 assert.equal(P.rollCousinOnHit(G,run,player,100,85,()=>0).triggered,true);
 assert.equal(run.castCue.event,'cousin');
 assert.deepEqual(run.castCue.targets,[{x:125,y:125}]);
 assert.ok(logs.some(x=>x[0]==='text'&&x[3]==='TÊ LIỆT!'));
 assert.ok(logs.some(x=>x[0]==='text'&&x[3]==='PIKA!'));
});

test('Pippi reacts to low HP and mischievous sidesteps with bounded dialogue',()=>{
 const pl={x:120,y:110,hp:24,maxHp:100};
 const run=P.newRun(pl,0);
 assert.equal(P.personalityReaction(run,pl,15),'danger');
 assert.equal(P.personalityReaction(run,pl,16),null,'no repeated warning every tick');
 pl.hp=100;run.motion={quirkCount:2};
 assert.equal(P.personalityReaction(run,pl,40),'tease');
 assert.equal(P.personalityReaction(run,pl,41),null,'no sidestep commentary spam');
 run.sleepUntil=110;
 assert.equal(P.personalityReaction(run,pl,90),null,'sleeping Pippi never heckles');
});

test('Battle dialogue contains a safe nonblank Pippi face without PNG decoding',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const js=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-pippi.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-pippi.css'),'utf8');
 assert.match(js,/class="pippi-portrait-art"/);
 assert.match(js,/fallbackArt\.innerHTML=faceSVG\(face,face==='mega'\)/);
 assert.match(css,/#pkmsvv-pippi \.pippi-portrait-art/);
 assert.equal((P.faceSVG('wink').match(/<svg/g)||[]).length,1);
});

test('Pippi uses real Pokémon world renderer with one depth-sorted actor',()=>{
 const {G,player}=game(save(0));
 player.hp=100;G.Game.st.time=0;
 let draws=0;
 const world={drawables(){return [{y:-1,draw(){}}];}};
 G.PKMSVVEggs=world;
 G.Sprites={
  Animator:class{
   loop(){this.mode='Idle';}update(){}
   draw(){draws++;}
  },
  dirFromAngle(){return 0;},
  sheet(){},preload(){},playerScale(){return 1;}
 };
 G.Camera={sees(){return true;}};
 const host={G,document:{body:null,querySelector(){return null;}},
  setInterval(){return 1;},console:{warn(){}},performance:{now(){return 1000;}}};
 const api=P.install(host);api.tick();
 const scene=world.drawables(G.Camera);
 assert.equal(api.visual.renderMode,'native-world');
 assert.equal(scene.filter(x=>x.pkmsvvPippi).length,1);
 const ctx={
  save(){},restore(){},beginPath(){},ellipse(){},fill(){},
  strokeText(){},fillText(){}
 };
 scene.find(x=>x.pkmsvvPippi).draw(ctx);
 assert.equal(draws,1,'original Pokémon sprite Animator draws Pippi in world coordinates');
 assert.equal(api.visual.worldAnimatorReady,true);
 assert.equal(api.visual.followerConnected,false,'old fixed overlay is not used');
 G.Game.state='ui';
 assert.equal(world.drawables(G.Camera).some(x=>x.pkmsvvPippi),false,
  'Pippi is absent from the game renderer outside Explore');
});

test('Original manga Pippi has nonrepeating lines and every real native item/orb event gives feedback',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-pippi.js'),'utf8');
 for(const event of ['intro','chest','item','healItem','magnetItem','bombItem','orbItem',
  'heal','buff','slow','shield','revive','cousin','danger','tease']){
  assert.match(source,new RegExp('(?:^|\\n)\\s*'+event+':\\[','m'),'missing reaction '+event);
 }
 assert.match(source,/lastLineByEvent/,'successive reactions must not repeat a line');
 assert.match(source,/run\.pendingReaction=event/,'batch pickups must coalesce portrait text');
 assert.match(source,/\['item','chest'\]/,'actual chest/item pickup method must trigger Pippi');
 assert.match(source,/\['orb','orb'\]/,'actual Orb pickup must trigger Pippi');
 assert.match(source,/run\.pickupCount%2===1/,'small visual effect is capped in dense drops');
});
test('Pippi wraps Game.item and Game.orb exactly once with no change to original reward',()=>{
 const {G,player}=game(save(0));player.hp=100;G.Game.st.time=0;
 const seen=[];G.Game.item=id=>{seen.push(['item',id]);return 'item:'+id};
 G.Game.orb=id=>{seen.push(['orb',id]);return 'orb:'+id};
 const host={G,document:{body:null,querySelector(){return null;}},
  setInterval(){return 1;},console:{warn(){}},performance:{now(){return 1000;}}};
 const api=P.install(host);
 api.tick();
 assert.ok(api.run,'companion active in Explore');
 const before=G.Game.item;
 assert.equal(G.Game.item('heal'),'item:heal');
 assert.equal(api.run.pendingReaction,'healItem');
 assert.equal(G.Game.orb('luminous'),'orb:luminous');
 assert.equal(api.run.pendingReaction,'orbItem');
 assert.deepEqual(seen,[['item','heal'],['orb','luminous']]);
 api.tick();assert.equal(G.Game.item,before,'event hooks are not stacked each tick');
 G.Game.state='ui';api.tick();
 assert.equal(G.Game.item('bomb'),'item:bomb');
 assert.deepEqual(seen.at(-1),['item','bomb'],'menu never changes item reward');
});
test('Ground pickups trigger Pippi only when actually collected, not on spawn or XP',()=>{
 const {G,player}=game(save(0));player.hp=100;G.Game.st.time=10;
 G.Pickups={update(_dt,_players,got){for(const p of this.queue.splice(0)){
   got(p,player);
  }return 'updated';},queue:[]};
 let awards=0;
 G.Game.item=()=>{awards++;return true;};
 const host={G,document:{body:null,querySelector(){return null;}},
  setInterval(){return 1;},console:{warn(){}},performance:{now(){return 1000;}}};
 const api=P.install(host);api.tick();
 assert.ok(api.run);
 const onCollected=(pickup)=>{if(pickup.kind==='item')G.Game.item(pickup.value);};
 const pickups=[{kind:'xp',value:5},{kind:'heal',value:0},
  {kind:'coin',value:10},{kind:'item',value:'rare-stone'},
  {kind:'ticket',value:1},{kind:'orb',value:'luminous'}];
 for(const p of pickups){
  G.Pickups.queue.push(p);
  assert.equal(G.Pickups.update(.016,[player],onCollected),'updated');
 }
 assert.equal(api.run.pickupCount,5,'one actual pickup gesture per non-XP reward');
 assert.equal(api.run.pendingReaction,'orbItem');
 assert.equal(awards,1,'nested Game.item must be executed exactly once');
 const before=G.Pickups.update;api.tick();
 assert.equal(G.Pickups.update,before,'native update wrapper must not stack per tick');
});

test('Pippi PC repair exists and one authentic portrait atlas replaces 16 battle PNG swaps',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const root=path.join(__dirname,'..');
 const core=fs.readFileSync(path.join(root,'src/pkmsvv-pippi.js'),'utf8');
 const prepare=fs.readFileSync(path.join(root,'scripts/prepare-pippi-web-preview.cjs'),'utf8');
 const atlas=fs.readFileSync(path.join(root,'scripts/build-pippi-portrait-atlas.cjs'),'utf8');
 assert.match(core,/function ensurePcCompanion\(\)/);
 assert.match(core,/grid\.dataset\.pippiQaRepair='1'/);
 assert.match(core,/installNativeWorld\(\)/);
 assert.match(core,/portraitAtlasIndex/);
 assert.match(core,/fallbackArt\.style\.backgroundPosition/);
 assert.match(prepare,/portrait\/atlas\.png/);
 assert.match(atlas,/Object\.keys\(PORTRAITS\)/);
});

test('Pippi inherits slow-water movement by observing player actual displacement',()=>{
 const player={x:100,y:100},run=P.newRun(player,0);
 P.advanceFollower(run,player,0);
 player.x+=6;
 let f=P.advanceFollower(run,player,.2);
 const slow=f.speed;
 assert.ok(slow>0&&slow<70);
 player.x+=20;
 f=P.advanceFollower(run,player,.4);
 assert.ok(f.speed>slow,'Real measured player speed increases on faster terrain');
 const lastX=f.x;
 player.x+=600;
 f=P.advanceFollower(run,player,.6);
 assert.ok(Math.abs(Math.hypot(player.x-f.x,player.y-f.y)-Math.hypot(78,78*.24))<1,
  'Portal catch-up keeps a close but non-overlapping support formation');
});
test('Ragnarok-like expression indicators use original SVG pixel paths, not emoji text',()=>{
 for(const kind of ['heart','angry','alarm','question','sleep','sparkle']){
  const xml=P.emoteSVG(kind);
  assert.match(xml,/<svg /);
  assert.match(xml,/shape-rendering='crispEdges'/);
  assert.doesNotMatch(xml,/[🌀-🫿]/u);
 }
 const css=require('node:fs').readFileSync(require('node:path').join(__dirname,'../src/pkmsvv-pippi.css'),'utf8');
 assert.match(css,/#pkmsvv-pippi-follower \.pippi-world-emote/);
 assert.match(css,/top:30%!important/);
 assert.match(css,/right:max\(10px,env\(safe-area-inset-right\)\)!important/);
});
test('Android menu uses one original icon and one stacked text column',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const menu=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-pc-menu-clean-qa.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-v20-ui-qa.css'),'utf8');
 assert.match(menu,/button\.dataset\.pkmMenuRow='true'/);
 assert.match(menu,/if\(node===art\|\|node===copy\)continue/);
 assert.match(css,/Android launcher 2\.0\.2/);
 assert.match(css,/grid-template-columns:42px minmax\(0,1fr\)!important/);
 assert.match(css,/white-space:nowrap!important/);
});


test('Pippi remains separate after player stops and on tight reversals',()=>{
 const player={x:300,y:300},run=P.newRun(player,0);
 let p=P.advanceFollower(run,player,0);
 assert.ok(Math.hypot(p.x-player.x,p.y-player.y)>68);
 for(let i=1;i<=12;i++){
  player.x+=9;
  p=P.advanceFollower(run,player,i*.2);
  assert.ok(Math.hypot(p.x-player.x,p.y-player.y)>=55.9,
   'Pippi must not merge into the hero while moving');
 }
 for(let i=13;i<=20;i++){
  p=P.advanceFollower(run,player,i*.2);
  assert.ok(Math.hypot(p.x-player.x,p.y-player.y)>=55.9,
   'Pippi must wait behind the stopped player');
 }
 for(let i=21;i<=30;i++){
  player.x-=10;
  p=P.advanceFollower(run,player,i*.2);
  assert.ok(Math.hypot(p.x-player.x,p.y-player.y)>=55.9,
   'Pippi cannot overlap when the player reverses direction');
 }
});
test('Co-op keeps only authored WebP and prevents late injected online handshake',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const read=pathName=>fs.readFileSync(path.join(__dirname,'..',pathName),'utf8');
 const menu=read('src/pkmsvv-pc-menu-clean-qa.js');
 const shell=read('src/shared/local-shell.js');
 const css=read('src/pkmsvv-pc-menu-clean-qa.css');
 assert.match(menu,/if\(art\.hasChildNodes\(\)\)art\.replaceChildren\(\)/);
 assert.match(menu,/iconObserver\.observe\(nav,\{childList:true,subtree:true\}\)/);
 assert.match(shell,/icons\.find\(n=>n\.classList\?\.contains\('pkmsvv-menu-icon-coop'\)\)/);
 assert.doesNotMatch(shell,/G\.Icons\?\.html\?\.\('online',28\)/);
 assert.match(css,/COOP_SINGLE_PIXEL_ICON_R3/);
 assert.match(css,/\.mi-ico\.pkmsvv-menu-icon-coop::before/);
});


test('High-DPI canvas gives Pippi a larger world gap but the same on-screen clearance',()=>{
 const player={x:500,y:400},run=P.newRun(player,0);
 let p=P.advanceFollower(run,player,0,188);
 assert.ok(Math.hypot(p.x-player.x,p.y-player.y)>120,
   'High-DPI companion starts outside the player footprint without excessive distance');
 for(let i=1;i<=10;i++){
  player.y+=5;
  p=P.advanceFollower(run,player,i*.2,188);
  assert.ok(Math.hypot(p.x-player.x,p.y-player.y)>=100,
   'High-DPI follow must preserve clearance but stay within support range');
 }
});


test('Pippi friendship training awards only earned points and persists skill trees',()=>{
 const save={coins:321,pkmsvvPippi:{xp:54}};
 const p=P.data(save);
 assert.equal(p.bond,10);
 assert.equal(P.trainingPoints(save),9);
 assert.deepEqual(p.training,{heal:0,buff:0,slow:0,shield:0,cousin:0});
 const result=P.train(save,'heal',()=>true);
 assert.deepEqual(result,{ok:true,level:1,points:8});
 assert.equal(save.coins,321,'No PokéCoins deducted for companion training');
 assert.equal(P.train(save,'shield',()=>true).ok,true);
 assert.equal(P.train(save,'buff',()=>true).ok,true);
 assert.equal(P.train(save,'slow',()=>true).ok,true);
 assert.equal(P.trainingPoints(save),5);
 assert.equal(P.bondProgress(save).to,null,'Bond 10 has max progress');
 assert.equal(P.bondProgress(save).bond,10);
});
test('Pippi training enforces Bond unlocks, max rank and transactional save rollback',()=>{
 const save={coins:50,pkmsvvPippi:{xp:2}};
 assert.equal(P.train(save,'buff',()=>true).ok,true,'Bond 2 unlocks Cheer');
 assert.equal(P.train(save,'shield',()=>true).reason,'locked');
 assert.equal(P.train(save,'heal',()=>true).reason,'points');
 P.earn(save,52);
 assert.equal(P.trainingPoints(save),8);
 const before={...P.data(save).training};
 assert.equal(P.train(save,'heal',()=>false).reason,'save');
 assert.deepEqual(P.data(save).training,before);
 assert.equal(P.train(save,'wrong',()=>true).reason,'invalid');
 assert.equal(P.train(save,'heal',()=>{throw Error('offline');}).reason,'save');
 assert.deepEqual(P.data(save).training,before);
 assert.equal(P.train(save,'heal',()=>true).ok,true);
 assert.equal(P.train(save,'heal',()=>true).ok,true);
 assert.equal(P.train(save,'heal',()=>true).ok,true);
 assert.equal(P.train(save,'heal',()=>true).reason,'max');
});
test('Training Reset Candy consumes exactly one Bag item; save failure restores the training tree',()=>{
 const s={coins:4242,bag:{pippiReset:2,mint:1},pkmsvvPippi:{xp:54}};
 for(const key of ['heal','buff','cousin'])assert.equal(P.train(s,key,()=>true).ok,true);
 const old={...P.data(s).training};
 assert.equal(P.resetTraining(s,()=>false).reason,'save');
 assert.deepEqual(P.data(s).training,old);
 assert.equal(s.bag.pippiReset,2);
 assert.equal(P.resetTraining(s,()=>{throw Error('offline')}).reason,'save');
 assert.deepEqual(P.data(s).training,old);
 assert.deepEqual(P.resetTraining(s,()=>true),{ok:true,refundedPoints:3,points:9,remaining:1});
 assert.equal(s.bag.pippiReset,1);assert.equal(s.bag.mint,1);
 assert.equal(s.coins,4242);assert.equal(P.data(s).bond,10);
 assert.equal(s.pkmsvvPippi.xp,54);
 assert.equal(P.resetTraining(s,()=>true).reason,'nothing');
 assert.equal(s.bag.pippiReset,1);
 const absent={bag:{},pkmsvvPippi:{xp:54}};
 P.train(absent,'heal',()=>true);
 assert.equal(P.resetTraining(absent,()=>true).reason,'item');
});
test('Exactly three first-per-run cooperation awards earn friendship, never unbounded pickup XP',()=>{
 const s={pkmsvvPippi:{xp:0}},run=P.newRun({});
 assert.equal(P.awardMoment(run,s,'chest',()=>false).reason,'save');
 assert.equal(P.data(s).xp,0);
 for(const event of ['chest','heal','assist']){
  assert.equal(P.awardMoment(run,s,event,()=>true).ok,true);
  assert.equal(P.awardMoment(run,s,event,()=>true).reason,'already');
 }
 assert.equal(P.data(s).xp,3);
 assert.equal(run.bondBonus,3);
 assert.deepEqual([...run.bondAwards].sort(),['assist','chest','heal']);
 assert.equal(P.awardMoment(run,s,'chest',()=>true).reason,'already');
 const another=P.newRun({});
 assert.equal(P.awardMoment(another,s,'chest',()=>true).ok,true,'new run re-enables one chest bonus');
});
test('Untrained Pippi heals immediately; Cheer, Slow, Shield and revive unlock at friendship milestones',()=>{
 const player={hp:20,maxHp:100};assert.equal(P.heal(player,1,0),true);
 assert.ok(player.hp>20);
 const source=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-pippi.js'),'utf8');
 assert.match(source,/if\(lv>=2&&now>=run\.buffAt\)/);
 assert.match(source,/if\(lv>=3&&now>=run\.slowAt\)/);
 assert.match(source,/if\(lv>=7&&now>=run\.guardAt/);
 assert.match(source,/bondLine\.hidden=event!=='bond'/);
});
test('Kecleon sells Pippi Candy and both Bag and PC have guarded reset actions',()=>{
 const shopSource=fs.readFileSync(path.join(__dirname,'../src/kecleon/upstream/data/shop.js'),'utf8');
 const ui=fs.readFileSync(path.join(__dirname,'../src/kecleon/pkmsvv-kecleon-ui.js'),'utf8');
 const wiki=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-wiki.js'),'utf8');
 const preview=fs.readFileSync(path.join(__dirname,'../scripts/prepare-pippi-web-preview.cjs'),'utf8');
 const G={DB:{save:{coins:3500,bag:{}},commit(){return true}},TM_MOVES:{},TM_PRICE:{}};
 vm.runInNewContext(shopSource,{G});
 assert.ok(G.Shop.ORDER.includes('pippiReset'));
 assert.equal(G.Shop.ITEMS.pippiReset.price,3000);
 assert.equal(G.Shop.DROP_RATE.pippiReset,undefined,'Candy is not an enemy drop');
 assert.equal(G.Shop.buy('pippiReset').ok,true);
 assert.equal(G.DB.save.coins,500);assert.equal(G.Shop.count('pippiReset'),1);
 assert.match(ui,/data-pkmk-pippi-reset/);
 assert.match(wiki,/dataset\.pippiReset/);
 assert.match(wiki,/P\.resetTraining\(save/);
 assert.match(preview,/\['Shop','src\/kecleon\/upstream\/data\/shop\.js'\]/);
 assert.match(preview,/\['KecleonUI','src\/kecleon\/pkmsvv-kecleon-ui\.js'\]/);
});
test('Pippi training improves Explore abilities without changing baseline skills',()=>{
 const base={hp:20,maxHp:100},improved={hp:20,maxHp:100};
 assert.equal(P.heal(base,5),true);assert.equal(P.heal(improved,5,2),true);
 assert.ok(improved.hp>base.hp);
 const pl={atkMul:1},run=P.newRun(pl);
 assert.equal(P.buff(pl,run,10,5,2),true);
 assert.ok(pl.atkMul>1.15);
 P.finish(run);assert.equal(pl.atkMul,1);
 const enemy={x:0,y:0,spd:100};
 const G={EnemyMgr:{all:()=>[enemy]}};
 const player={x:0,y:0},run2=P.newRun(player);
 assert.equal(P.slow(G,run2,0,5,2),true);
 assert.ok(enemy.spd<100);
 P.finish(run2);assert.equal(enemy.spd,100);
});
test('PC uses native fourth Góc Pippi card and event-synchronized portrait source',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const wiki=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-wiki.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-pippi.css'),'utf8');
 const core=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-pippi.js'),'utf8');
 assert.match(wiki,/function pippiCorner\(\)/);
 assert.match(wiki,/dex:35/);
 assert.match(wiki,/onClick:pippiCorner/);
 assert.match(wiki,/data-pippi-train/);
 assert.match(wiki,/P\.train\(save,key,\(\)=>G\.DB\.commit\(true\)\)/);
 assert.match(core,/const filename=PORTRAIT_FILES\[face\]\|\|'Normal'/);
 assert.match(core,/portrait\.dataset\.emotion=face/);
 assert.match(core,/el\.dataset\.event=event/);
 assert.match(css,/PIPPI_CHAT_EXPRESSION_V1/);
});


test('Em họ Pikachu: 3%, 4.5%, 6% on real damage, never before learning',()=>{
 assert.equal(P.cousinChance(0),0);assert.equal(P.cousinChance(1),.03);
 assert.equal(P.cousinChance(2),.045);assert.equal(P.cousinChance(3),.06);
 assert.equal(P.cousinChance(999),.06);
 const s={coins:500,pkmsvvPippi:{xp:14}}; // Bond 5
 for(let i=1;i<=3;i++)assert.equal(P.train(s,'cousin',()=>true).ok,true);
 assert.equal(P.train(s,'cousin',()=>true).reason,'max');
 assert.equal(P.trainingPoints(s),1);assert.equal(s.coins,500);
});
test('Pikachu stuns only on actual HP loss in Explore, not on dodges or Co-op',()=>{
 const s={pkmsvvPippi:{xp:14,training:{cousin:1}}};
 const enemy={x:124,y:100,dead:false,applyStun(t){this.stun=t;}};
 const pl={x:100,y:100,hp:100,maxHp:100,dead:false};
 const G={DB:{save:s},Game:{state:'playing',player:pl,st:{time:20}},
  PKMSVVQuickRegion:{active:true},EnemyMgr:{all:()=>[enemy]}};
 const run=P.newRun(pl,20);
 assert.equal(P.rollCousinOnHit(G,run,pl,100,100,()=>0).triggered,false);
 assert.equal(P.rollCousinOnHit(G,run,pl,100,90,()=>.03).triggered,false);
 assert.equal(P.rollCousinOnHit(G,run,pl,100,90,()=>.0299).triggered,true);
 assert.equal(enemy.stun,1.1);assert.ok(run.cousinUntil>20);
 G.Coop={active:true};G.Game.st.time=22;
 assert.equal(P.rollCousinOnHit(G,run,pl,90,80,()=>0).triggered,false);
});
test('Pikachu native hurt hook fires once per damaging hit and is restored',()=>{
 const pl={hp:100,hurt(n){this.hp-=n;return 'native';}};
 const old=pl.hurt,run=P.newRun(pl,1);let hits=0;
 assert.equal(P.installDamageHook(run,pl,()=>{hits++;}),true);
 assert.equal(P.installDamageHook(run,pl,()=>{hits+=50;}),true);
 assert.equal(pl.hurt(0),'native');assert.equal(hits,0);
 assert.equal(pl.hurt(12),'native');assert.equal(hits,1);
 P.finish(run);assert.strictEqual(pl.hurt,old);
 pl.hurt(12);assert.equal(hits,1);
});
test('Pikachu genuine paralysis affects max 4 targets, bosses shorter, no stun lock',()=>{
 const pl={x:10,y:10};
 const foes=Array.from({length:8},(_,i)=>({
  x:30+i*3,y:30,boss:i===0,dead:false,applyStun(t){this.stun=t;}
 }));
 const G={EnemyMgr:{all:()=>foes},FX:{ring(){},burst(){},dmgText(){}}};
 assert.equal(P.cousinLightning(G,pl,10).affected,4);
 assert.equal(foes[0].stun,.35);assert.equal(foes[1].stun,1.1);
 assert.equal(P.cousinLightning(G,pl,11).affected,4);
 assert.equal(P.cousinLightning(G,pl,12).affected,0);
});

test('Browser Pippi uses one 250ms timer instead of a perpetual rendering RAF',()=>{
 let scheduled=null,rafCalls=0,timerCalls=0;
 const G={Game:{state:'ui'}};
 const host={G,document:{body:null},requestAnimationFrame(){rafCalls++;},
  setInterval(fn,ms){timerCalls++;scheduled={fn,ms};return 1;},console:{warn(){}}};
 const api=P.install(host);
 assert.equal(timerCalls,1,'install exactly one companion timer');
 assert.equal(scheduled.ms,250,'4Hz update period');
 assert.equal(rafCalls,0,'do not add a 60Hz RAF to native combat');
 scheduled.fn();
 assert.equal(api.run,null,'no companion run while outside Explore');
});

test('failed Pippi migration never retries save four times per second in combat',()=>{
 const s=save(54);const originalMoney=s.coins;
 let commits=0,callbacks=0;
 const G={DB:{save:s,commit(){commits++;return false}},Game:{state:'ui'}};
 const host={G,document:{},console:{warn(){}},requestAnimationFrame(){callbacks++;}};
 const api=P.install(host);
 assert.equal(callbacks,1,'Pippi must schedule one animation loop');
 for(let i=0;i<60;i++)api.tick();
 assert.equal(commits,1,'failed save should be retried after a backoff, not on every 250ms update');
 assert.equal(s.coins,originalMoney,'failed refund cannot mint PokéCoins');
 assert.equal(s.globalUpgrades.revive,1,'failed refund preserves original upgrade');
 assert.equal(s.pkmsvvPippi.refundReviveV1,undefined,'failed refund is not recorded as paid');
});

test('Pippi predecodes its emotion portraits in home UI, never fetching them in combat',()=>{
 const h=game(save(0));h.G.Game.state='ui';h.G.PKMSVVQuickRegion.active=false;
 const urls=[];
 class FakeImage{
  set src(value){urls.push(value);}
  decode(){return Promise.resolve();}
 }
 const w={G:h.G,Image:FakeImage,document:{body:null},
  __pkmsvvPippiAllowCombatPortrait:true,
  requestAnimationFrame(){},console:{warn(){}}};
 const api=P.install(w);api.tick();
 assert.ok(urls.length>=14,'preload every expression while at home');
 assert.ok(urls.every(x=>x.startsWith('images/pippi/portrait/')));
 const loaded=urls.length;
 h.G.Game.state='playing';h.G.PKMSVVQuickRegion.active=true;
 api.tick();api.tick();
 assert.equal(urls.length,loaded,'no new portrait fetch during combat ticks');
});

test('Pippi defers save refund commits during real combat and applies on home UI',()=>{
 const h=game(save(0));let commits=0;
 h.player.hp=h.player.maxHp;
 h.G.DB.commit=()=>{commits++;return true;};
 const w={G:h.G,document:{body:null},requestAnimationFrame(){},console:{warn(){}}};
 const api=P.install(w),coins=h.G.DB.save.coins;
 api.tick();
 assert.equal(commits,0,'combat tick must not commit migration');
 assert.equal(h.G.DB.save.coins,coins,'refund must wait until home menu');
 h.G.Game.state='ui';h.G.PKMSVVQuickRegion.active=false;
 api.tick();
 assert.equal(commits,1,'only one safe migration commit on home UI');
 assert.equal(h.G.DB.save.coins,coins+50000);
});

test('Pippi retains one session and native damage hook across level-up, then cleans on real quit',()=>{
 const pl={x:10,y:20,hp:100,maxHp:100,atkMul:1,dead:false,hurt(d){this.hp-=d;}};
 const native=pl.hurt;
 const G={DB:{save:{coins:0,pkmsvvPippi:{xp:0}},commit(){return true}},
  Game:{state:'playing',player:pl,st:{time:5}},PKMSVVQuickRegion:{active:true}};
 const w={G,document:{body:null},requestAnimationFrame(){},console:{warn(){}}};
 const api=P.install(w);
 api.tick();
 const run=api.run,hook=pl.hurt;
 assert.ok(run,'Explore must initialize Pippi');
 assert.notStrictEqual(hook,native,'Damage hook installed exactly once');
 G.Game.state='levelup';api.tick();api.tick();
 assert.strictEqual(api.run,run,'Native level-up is not a new Explore run');
 assert.strictEqual(pl.hurt,hook,'Damage wrapper stays installed while choosing');
 G.Game.state='playing';G.Game.st.time=5.3;api.tick();
 assert.strictEqual(api.run,run,'Picking skill 1/2/3 must reuse same Pippi');
 assert.strictEqual(pl.hurt,hook,'No nested or duplicate hurt wrappers');
 G.Game.state='ui';G.PKMSVVQuickRegion.active=false;api.tick();
 assert.equal(api.run,null,'Actual exit ends Pippi run');
 assert.strictEqual(pl.hurt,native,'Native damage method restored on exit');
});
