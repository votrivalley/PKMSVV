'use strict';
// Isolated native gameplay: genuine Combat.manualDash and engine frames.
// Synthetic save, deterministic arena/enemy setup and simulated standard
// gamepad are QA fixtures; no changes to real player saves or game code.
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs');
(async()=>{
 const server=await startServer({root:path.resolve(__dirname,'../dist/lan'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.addInitScript(()=>{
   window.__pkmsvvPippiGuideQABypass=true;
   window.__qaPad={id:'QA standard controller',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0,touched:false}))};
   Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__qaPad]});
  });
  await page.goto('http://127.0.0.1:'+server.port+'/game/',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>!!window.G?.DB?.save&&!!G.PKMSVVQuickRegion?.choose&&!!G.PKMSVVRuntimeControlsQA?.castTowardsNearest,null,{timeout:40000});
  await page.evaluate(()=>{
   Object.assign(G.DB.save,{partner:150,partnerShiny:false,pkmsvvStorySeen:true,pkmsvvNameChosen:true});
   G.Settings.set('keys',{...G.Settings.get('keys'),dash:'keyf'});
   G.Settings.set('pkmsvvPadMap',{...G.PKMSVVPadOrb.DEFAULT});
   G.MenuUI.open();G.PKMSVVQuickRegion.choose(0);
   window.__qaKeep=setInterval(()=>{
    [...document.querySelectorAll('.pkmsvv-berry-overlay button')].find(x=>/Không dùng Berry|No Berry/.test(x.textContent))?.click();
    const p=G.Game?.player;if(p&&!p.dead){p.hp=p.maxHp;p.invuln=Math.max(p.invuln||0,2000);}
    if(G.Game?.state==='levelup'&&G.UI?.isOpen?.('scr-levelup'))G.RunUI.pick(0);
   },100);
  });
  await page.waitForFunction(()=>G.Game?.state==='playing',null,{timeout:23000});
  await page.evaluate(()=>{
   window.__qaCasts=[];
   const native=G.Combat.manualDash;
   G.Combat.manualDash=function(p,angle){
    const before={x:p.x,y:p.y},result=native.apply(this,arguments);
    if(result&&p===G.Game.player)window.__qaCasts.push({id:p.moves[0]?.id,angle:Number.isFinite(angle)?angle:null,...before,at:performance.now()});
    return result;
   };
  });
  async function seed(id){
   await page.evaluate(id=>{
    const p=G.Game.player;
    G.EnemyMgr.clear();G.Projectiles.clear();G.Combat.clearFields();G.Hazards.clear();
    let spot;
    for(let y=-600;y<600&&!spot;y+=48)for(let x=-600;x<600;x+=48)
     if(G.World.isFree(x,y,120)){spot={x,y};break;}
    if(!spot)throw Error('No free dash QA area');
    p.x=spot.x;p.y=spot.y;p.moveAngle=0;p.aim=0;
    const m=G.Moves.instance(id);m.t=0;p.moves=[m];p.slots=[[m]];p.active=0;
    const enemy=G.EnemyMgr.add(new G.Enemy({dex:19,hp:100000,spd:0,dmg:1,xp:1,behavior:'chase'},p.x-65,p.y,{hp:1,spd:1,dmg:1}));
    G.EnemyMgr.rebuildGrid();p.target=enemy;window.__qaCasts.length=0;
    window.__qaOrigin={x:p.x,y:p.y};window.__qaEnemy=enemy;
   },id);
  }
  const casts=()=>page.evaluate(()=>window.__qaCasts.slice());
  const position=()=>page.evaluate(()=>({x:G.Game.player.x,y:G.Game.player.y,origin:window.__qaOrigin}));
  const waitCast=()=>page.waitForFunction(()=>window.__qaCasts.length>0,null,{timeout:5000});
  const waitAuto=()=>page.waitForFunction(()=>window.__qaCasts.some(c=>c.angle!==null),null,{timeout:6500});
  const holdKey=async()=>{await page.keyboard.down('f');await page.waitForTimeout(2250);await page.keyboard.up('f');};
  const pad=async value=>page.evaluate(v=>{window.__qaPad.buttons[2]={pressed:v,value:v?1:0,touched:v};},value);
  const report=[];
  await seed('quick-attack');
  await page.waitForTimeout(900);
  assert.equal((await casts()).length,0,'manual default must not cast');
  let pos=await position();assert.ok(Math.hypot(pos.x-pos.origin.x,pos.y-pos.origin.y)<5,'manual default must not move');
  await page.keyboard.press('f');await waitCast();await page.waitForTimeout(250);
  pos=await position();assert.ok(pos.x>pos.origin.x+30,'manual Quick Attack must actually travel right');
  await page.waitForTimeout(850);
  await seed('quick-attack');
  await holdKey();await waitAuto();
  const afterHold=await casts();
  assert.ok(afterHold.some(c=>c.angle!==null),'AUTO must call actual combat with target angle');
  // Prove a new success AFTER the physical key is released, not just the
  // first short-press activation or the 2s hold transition.
  const before=afterHold.length;
  await page.waitForFunction(n=>window.__qaCasts.length>n&&window.__qaCasts.at(-1).angle!==null,before,{timeout:6500});
  assert.ok((await casts()).some(c=>c.angle!==null&&Math.cos(c.angle)<-.5),'AUTO aims toward the hostile to the left');
  await pad(true);await page.waitForTimeout(2250);await pad(false);
  await page.waitForTimeout(250);
  const stopped=(await casts()).length;
  await page.waitForTimeout(1500);assert.equal((await casts()).length,stopped,'2s controller hold must turn AUTO off');
  report.push({id:'quick-attack',keyboardTap:true,keyboardHold:true,repeatAfterRelease:true,padHoldOff:true});
  for(const id of ['extreme-speed','acrobatics']){
   await seed(id);await page.waitForTimeout(1000);
   assert.equal((await casts()).length,0,id+' must default manual');
   await page.keyboard.press('f');await waitCast();
   await page.waitForFunction(()=>Math.hypot(G.Game.player.x-window.__qaOrigin.x,G.Game.player.y-window.__qaOrigin.y)>15,null,{timeout:3000});
   report.push({id,keyboardTap:true,actualMovement:true});
   await page.waitForTimeout(900);
  }
  assert.deepEqual(errors,[]);
  console.log('BETA_ACTIVE_MOVEMENT_REAL_INPUT_PASS='+JSON.stringify(report));
 }finally{
  await page.evaluate(()=>clearInterval(window.__qaKeep)).catch(()=>{});
  await browser.close();await server.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
