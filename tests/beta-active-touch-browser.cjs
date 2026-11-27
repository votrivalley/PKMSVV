'use strict';
// Real Chromium touch input via CDP; no synthetic call to toggleDash or manualDash.
// Disposable Giratina profile, protected HP, controlled target placement.
// Shadow Force still uses native leap and the Giratina species restriction.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs');
const out=path.resolve(__dirname,'../dist/active-touch-browser-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const server=await startServer({root:path.resolve(__dirname,'../dist/lan'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1,hasTouch:true,isMobile:true});
 const cdp=await page.context().newCDPSession(page);
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;});
  await page.goto('http://127.0.0.1:'+server.port+'/game/',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>!!G.DB?.save&&!!G.PKMSVVQuickRegion?.choose&&!!G.PKMSVVRuntimeControlsQA?.installTouchAuto,null,{timeout:40000});
  await page.evaluate(()=>{
   Object.assign(G.DB.save,{partner:487,partnerShiny:false,pkmsvvStorySeen:true,pkmsvvNameChosen:true});
   G.MenuUI.open();G.PKMSVVQuickRegion.choose(0);
   window.__qaKeep=setInterval(()=>{
    [...document.querySelectorAll('.pkmsvv-berry-overlay button')].find(x=>/Không dùng Berry|No Berry/.test(x.textContent))?.click();
    const p=G.Game?.player;if(p&&!p.dead){p.hp=p.maxHp;p.invuln=Math.max(p.invuln||0,2000);}
    if(G.Game?.state==='levelup'&&G.UI?.isOpen?.('scr-levelup'))G.RunUI.pick(0);
   },100);
  });
  await page.waitForFunction(()=>G.Game?.state==='playing',null,{timeout:23000});
  await page.evaluate(()=>{
   const p=G.Game.player;if(Number(p.mon?.dex)!==487)throw Error('Expected native Giratina');
   window.__qaCasts=[];
   const native=G.Combat.manualDash;
   G.Combat.manualDash=function(pl,angle){
    const result=native.apply(this,arguments);
    if(result&&pl===G.Game.player)window.__qaCasts.push({id:pl.moves[0]?.id,angle:Number.isFinite(angle)?angle:null,at:performance.now()});
    return result;
   };
   const api=G.PKMSVVRuntimeControlsQA;
   if(!api.installTouchAuto())throw Error('Native touch hook missing');
   const add=G.Touch.addButton;
   function observe(x,y,w,h,callback,pad){
    if(pad===4&&typeof callback==='function')window.__qaTouchBox={x,y,w,h,stamp:performance.now()};
    return add.apply(this,arguments);
   }
   observe._pkmsvvLongPressAuto=true;G.Touch.addButton=observe;
  });
  const seed=async id=>page.evaluate(id=>{
   const p=G.Game.player;
   G.EnemyMgr.clear();G.Projectiles.clear();G.Combat.clearFields();G.Hazards.clear();
   let spot;
   for(let y=-600;y<600&&!spot;y+=48)for(let x=-600;x<600;x+=48)if(G.World.isFree(x,y,120)){spot={x,y};break;}
   if(!spot)throw Error('No free QA area');
   p.x=spot.x;p.y=spot.y;p.moveAngle=0;p.aim=0;
   const m=G.Moves.instance(id);m.t=0;p.moves=[m];p.slots=[[m]];p.active=0;
   const enemy=G.EnemyMgr.add(new G.Enemy({dex:19,hp:100000,spd:0,dmg:1,xp:1,behavior:'chase'},p.x-65,p.y,{hp:1,spd:1,dmg:1}));
   G.EnemyMgr.rebuildGrid();p.target=enemy;
   window.__qaCasts.length=0;window.__qaOrigin={x:p.x,y:p.y};window.__qaEnemy=enemy;
  },id);
  async function point(){
   await page.waitForFunction(()=>window.__qaTouchBox&&performance.now()-window.__qaTouchBox.stamp<500,null,{timeout:7000});
   return page.evaluate(()=>{
    const b=window.__qaTouchBox,c=document.getElementById('game'),r=c.getBoundingClientRect();
    const x=r.left+(b.x+b.w/2)*r.width/c.width,y=r.top+(b.y+b.h/2)*r.height/c.height;
    if(!G.PKMSVVRuntimeControlsQA.nativeDashHit({clientX:x,clientY:y}))throw Error('Actual canvas button not hittable');
    return{x,y};
   });
  }
  const start=async()=>{const pt=await point();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...pt,id:1}]});return pt;};
  const end=()=>cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const hold=async()=>{await start();await page.waitForTimeout(2250);await end();};
  const casts=()=>page.evaluate(()=>window.__qaCasts.slice());
  const auto=()=>page.evaluate(()=>{const e=document.getElementById('pkmsvv-active-auto');return !!e&&!e.hidden;});
  await seed('quick-attack');await page.waitForTimeout(500);
  assert.equal((await casts()).length,0);assert.equal(await auto(),false);
  await start();await page.waitForTimeout(90);await end();
  await page.waitForFunction(()=>window.__qaCasts.length>0,null,{timeout:5000});
  await page.waitForFunction(()=>Math.hypot(G.Game.player.x-window.__qaOrigin.x,G.Game.player.y-window.__qaOrigin.y)>20,null,{timeout:3000});
  await page.waitForTimeout(800);await seed('quick-attack');
  await hold();
  await page.waitForFunction(()=>!document.getElementById('pkmsvv-active-auto')?.hidden&&window.__qaCasts.some(c=>c.angle!==null),null,{timeout:6500});
  assert.equal(await auto(),true);
  await page.waitForFunction(()=>!document.getElementById('pkmsvv-auto-skill-highlight')?.hidden&&!!document.getElementById('pkmsvv-auto-skill-highlight'),null,{timeout:3000});
  await page.screenshot({path:path.join(out,'touch-auto-on.png')});
  const before=(await casts()).length;
  await page.waitForFunction(n=>window.__qaCasts.length>n&&window.__qaCasts.at(-1).angle!==null,before,{timeout:6500});
  await hold();await page.waitForFunction(()=>document.getElementById('pkmsvv-active-auto')?.hidden===true,null,{timeout:3000});
  await page.waitForTimeout(1500);
  const stopped=(await casts()).length;await page.waitForTimeout(1000);assert.equal((await casts()).length,stopped);
  await seed('shadow-force');
  await page.waitForTimeout(1000);assert.equal((await casts()).length,0,'Shadow Force defaults to manual');
  await start();await page.waitForTimeout(90);await end();
  await page.waitForFunction(()=>window.__qaCasts.some(c=>c.id==='shadow-force'),null,{timeout:5000});
  await page.waitForFunction(()=>Math.hypot(G.Game.player.x-window.__qaOrigin.x,G.Game.player.y-window.__qaOrigin.y)>20,null,{timeout:3000});
  assert.equal(await auto(),false);
  assert.deepEqual(errors,[]);
  const report={status:'PASS',touchTap:true,touchHoldOn:true,repeatsAfterRelease:true,touchHoldOff:true,actualShadowForceMovement:true,species:487,device:'Chromium mobile emulation, CDP touch',fixture:'controlled positions and protected HP'};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('BETA_TOUCH_SHADOW_FORCE_PASS='+JSON.stringify(report));
 }catch(e){
  fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:String(e),errors,state:await page.evaluate(()=>({game:G.Game?.state,dex:G.Game?.player?.mon?.dex,box:window.__qaTouchBox,casts:window.__qaCasts,body:document.body.innerText.slice(-800)})).catch(()=>null)},null,2));
  await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw e;
 }finally{
  await page.evaluate(()=>clearInterval(window.__qaKeep)).catch(()=>{});
  await browser.close();await server.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
