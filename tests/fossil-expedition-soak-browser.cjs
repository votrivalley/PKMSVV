'use strict';
/* 155 real-time seconds of native Fossil Co-op in Chromium.
   Regression: AI remained frozen because fossil_lab was absent from activeBots.
   Regression: users report game freeze 60-90 seconds into a wave.
   The disposable QA player is protected so this observes the engine, not
   ordinary deaths. Actual EXP/skill menus are selected through native UI. */
const {chromium}=require('playwright');
const {startServer}=require('../lan-server/server.cjs');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'../dist/lan');
 const server=await startServer({root,host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 const page=await browser.newPage({viewport:{width:1080,height:680}});
 page.setDefaultTimeout(12000);
 const errors=[],consoleErrors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|favicon|404/.test(m.text()))consoleErrors.push(m.text());});
 try{
  await page.goto('http://127.0.0.1:'+server.port+'/game/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>G.DB?.save&&G.PKMSVVFossilExpedition?.nativeReady===true,null,{timeout:45000});
  await page.evaluate(async()=>{
   Object.assign(G.DB.save,{partner:25,pkmsvvStorySeen:true,pkmsvvNameChosen:true});
   G.MenuUI.open();
   await G.Social.createRoom('fossil_lab','private');
   for(let i=0;i<3;i++)await G.LanBus.request('addBot',{dex:[1,7,25][i]});
   G.LobbyUI.open();
  });
  await page.locator('#lobby-start').click();
  await page.waitForFunction(()=>G.Game?.state==='playing'&&G.PKMSVVFossilExpedition?.active,null,{timeout:25000});
  // The 10-second Berry choice deliberately freezes the native clock.
  // Confirm it first so the soak measures 155 seconds of ACTUAL gameplay.
  await page.evaluate(()=>{
   const skip=[...document.querySelectorAll('.pkmsvv-berry-overlay button')]
    .find(x=>/Không dùng Berry|No Berry/.test(x.textContent));
   skip?.click();
  });
  await page.waitForFunction(()=>!G.PKMSVVBerry?.choosing,null,{timeout:17000});
  await page.waitForFunction(()=>G.LanAI?.activeBots?.().length===3,null,{timeout:7000});
  // Protect disposable QA actors without bypassing skill-level or simulation.
  await page.evaluate(()=>{
   window.__fossilSoakKeeper=setInterval(()=>{
    const p=G.Game?.player;
    if(p&&!p.dead){p.hp=p.maxHp;p.invuln=Math.max(p.invuln||0,2000);}
    for(const bot of G.Coop?.puppets?.()||[]){
     if(bot?.lanBot){
      if(bot.dead)bot.revive?.(1);
      bot.hp=bot.maxHp;bot.invuln=Math.max(bot.invuln||0,2000);
     }
    }
    if(G.Game?.state==='levelup'&&G.UI?.isOpen?.('scr-levelup'))
     try{G.RunUI.pick(0)}catch(e){console.warn('[Fossil soak] unable to pick native skill',e);}
   },120);
  });
  let previous=-1,stalls=0,maxStalls=0;
  const stages=[];
  for(let i=0;i<31;i++){
   await page.waitForTimeout(5000);
   const state=await page.evaluate(()=>({
    time:G.Game?.st?.time||0,
    state:G.Game?.state,
    enemies:G.EnemyMgr?.all?.().length||0,
    boostedEnemies:G.EnemyMgr?.all?.().filter(e=>!e.dead&&e._pkmsvvFossilSpeedFactor>1.12).length||0,
    bots:G.LanAI.activeBots().length,
    positions:G.Coop.puppets().filter(p=>p.lanBot).map(p=>({x:Math.round(p.x),y:Math.round(p.y),dead:p.dead})),
    fossil:G.PKMSVVFossilExpedition?.active,
    sprite:G.PKMSVVFossilExpedition?.spriteReady,
    phase:G.PKMSVVFossilExpedition?.session?.phase
   }));
   stages.push({s:i+1,...state});
   if(state.time<=previous+.15)stalls++;else stalls=0;
   maxStalls=Math.max(maxStalls,stalls);
   previous=state.time;
   if(i===0||i===9||i===15||i===23||i===30)
    console.log('FOSSIL_SOAK_CHECKPOINT='+JSON.stringify(stages.at(-1)));
   assert.equal(state.bots,3,'all 3 native Co-op AI must remain active');
   if(state.time>=125&&state.enemies>5)
    assert.ok(state.boostedEnemies>0,
     'after 2:00 the real native enemies must receive Berry-style speed boost');
   assert.equal(state.sprite,true,'artwork should remain loaded under long-run stress');
   assert.equal(state.fossil,true,'fossil mission must remain running during 155s validation');
   assert.ok(stalls<3,'real game clock stuck for 15 seconds: '+JSON.stringify(stages.slice(-4)));
   assert.equal(errors.length,0,'uncaught browser error: '+JSON.stringify(errors.slice(-3)));
   const serious=consoleErrors.filter(x=>/\[Game\]|TypeError|RangeError|maximum call stack|AI update|frame guarded/i.test(x));
   assert.ok(serious.length<3,'gameplay exceptions: '+JSON.stringify(serious.slice(-3)));
  }
  const traveled=stages.some((x,i)=>i>0&&x.positions.some((p,j)=>{
   const prev=stages[i-1].positions[j];
   return prev&&Math.hypot(p.x-prev.x,p.y-prev.y)>10;
  }));
  assert.equal(traveled,true,'AI should move during a continuous battle');
  console.log('PASS FOSSIL_SOAK_155S='+JSON.stringify({gameSeconds:previous,stages:stages.length,
   maxStalls,aiMoved:traveled,errors:errors.length,consoleErrors:consoleErrors.length}));
 }finally{
  try{await page.evaluate(()=>{clearInterval(window.__fossilSoakKeeper);G.Game?.quit?.()});}catch(_){}
  await browser.close();await server.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
