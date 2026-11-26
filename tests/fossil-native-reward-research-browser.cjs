'use strict';
/* Native 480-second objective and actual wallet/Guardian settlement QA.
   Controlled positioning, boss damage and protected health are explicit test fixtures.
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
  await page.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;});
  await page.evaluate(async()=>{
   Object.assign(G.DB.save,{partner:25,pkmsvvStorySeen:true,pkmsvvNameChosen:true});
   if(G.DB.guest)throw Error('Expected disposable offline profile');
   const initial=G.DB.save.pkmsvvCoopLab;
   if(initial?.machineUnlocked||initial?.coopCoins||initial?.lastSettledSeq)throw Error('Expected fresh wallet');
   window.__qaInitial={coins:initial?.coopCoins||0,seq:initial?.lastSettledSeq||0};
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
  assert.equal(await page.evaluate(()=>G.PKMSVVFossilExpedition.rewardEligible),true);
  // Protect disposable QA actors without bypassing skill-level or simulation.
  await page.evaluate(()=>{
   window.__fossilSoakKeeper=setInterval(()=>{
    const p=G.Game?.player;
    if(p&&!p.dead){p.hp=p.maxHp;p.invuln=Math.max(p.invuln||0,2000);}
    // This soak test measures AI movement, gameplay clock, particles and
    // freezing over 155s, NOT player skill in an eight-minute defense.
    // A live machine may legitimately lose all 360 HP in under 155s from
    // accumulated nearby enemies and end the room (activeBots then becomes 0).
    // Protect only this disposable QA machine as we already protect QA actors.
    // Pure core tests separately verify machine damage and failure.
    const mission=G.PKMSVVFossilExpedition?.session;
    // Fixture positions the host next to each objective; the actual E action,
    // rock cooldown, boss-death handling and Rotom escort remain native.
    if(p&&!p.dead&&G.Game.state==='playing'&&mission){
     const api=G.PKMSVVFossilExpedition;
     const moveNear=(point,range)=>{
      for(let r=32;r<=range;r+=16)for(let a=0;a<8;a++){
       const x=point.x+Math.cos(a*Math.PI/4)*r,y=point.y+Math.sin(a*Math.PI/4)*r;
       if(G.World.isFree(x,y,p.r||12,true)){p.x=x;p.y=y;return true;}
      }
      return false;
     };
     if(mission.phase==='excavate'){
      const site=mission.sites.find(x=>!x.done);
      if(site&&moveNear(site,80))api.perform();
     }else if(mission.phase==='rescue'){
      const boss=G.EnemyMgr.all().find(e=>e.pkmsvvFossilRotomBoss&&!e.dead);
      // Controlled damage through native Enemy.hurt, not setting boss flags.
      if(boss)boss.hurt(Math.max(1,boss.hp)*2,'#ffffff',0,0,0);
      if(moveNear(mission.rotom,112))api.perform();
     }else if(mission.phase==='escort'){
      if(!window.__qaEscortPlaced)window.__qaEscortPlaced=moveNear(mission.machine,96);
     }
    }
    if(mission?.phase==='defend'&&mission.machine?.online){
     mission.machine.hp=mission.machine.maxHp;
    }
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
  let final=null;
  for(let i=0;i<140;i++){
   await page.waitForTimeout(5000);
   const state=await page.evaluate(()=>({
    time:G.Game?.st?.time||0,
    state:G.Game?.state,
    enemies:G.EnemyMgr?.all?.().length||0,
    boostedEnemies:G.EnemyMgr?.all?.().filter(e=>!e.dead&&e._pkmsvvFossilSpeedFactor>1.12).length||0,
    bots:G.LanAI.activeBots().length,
    positions:G.Coop.puppets().filter(p=>p.lanBot).map(p=>({x:Math.round(p.x),y:Math.round(p.y),dead:p.dead})),
    fossil:G.PKMSVVFossilExpedition?.active,
    machineHp:G.PKMSVVFossilExpedition?.session?.machine?.hp,
    sprite:G.PKMSVVFossilExpedition?.spriteReady,
    phase:G.PKMSVVFossilExpedition?.session?.phase,
    finish:G.PKMSVVFossilExpedition?.lastFinish,reward:G.PKMSVVFossilExpedition?.lastReward
   }));
   stages.push({s:i+1,...state});
   if(state.finish){final=state;break;}
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
  assert.ok(final,'Native mission did not finish within 700 real seconds');
  assert.equal(final.finish.cleared,true,JSON.stringify(final));
  assert.ok(final.finish.elapsed>=480);
  assert.equal(final.reward?.ok,true,JSON.stringify(final.reward));
  assert.equal(final.reward.firstClear,true);
  assert.equal(final.reward.reward,200+20*final.finish.optionalObjectives);
  const earned=final.reward.reward;
  const saved=await page.evaluate(()=>{
   clearInterval(window.__fossilSoakKeeper);
   const primary=JSON.parse(localStorage.getItem('ps.save.pkmsvv_offline')||'null');
   const latest=JSON.parse(localStorage.getItem('pkmsvv.safe.v1.pkmsvv_offline.latest')||'null');
   return {primary,latest,initial:window.__qaInitial};
  });
  assert.equal(saved.primary.pkmsvvCoopLab.coopCoins,saved.initial.coins+earned);
  assert.equal(saved.primary.pkmsvvCoopLab.lastSettledSeq,saved.initial.seq+1);
  assert.equal(saved.primary.pkmsvvCoopLab.machineUnlocked,true);
  assert.ok(saved.primary.owned[140]);
  assert.equal(saved.latest.pkmsvvCoopLab.coopCoins,earned);
  const denied=await page.evaluate(()=>G.PKMSVVFossilExpedition.reward({success:true,receipt:{verified:true,cleared:true,seq:2}}));
  assert.equal(denied,false);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(n=>G.DB?.save?.pkmsvvCoopLab?.coopCoins===n&&!!window.PKMSVVResearchMachines,earned,{timeout:45000});
  await page.evaluate(()=>{G.MenuUI.open();document.querySelector('#pkmsvv-menu-wiki').click();});
  await page.waitForFunction(()=>document.querySelector('.pkmsvv-research-room')?.dataset.researchArtMode==='approved-v3');
  await page.locator('[data-research-build]').click();
  await page.waitForFunction(()=>document.querySelector('.pkmsvv-build-stage')?.dataset.researchArtMode==='approved-v3');
  await page.locator('[data-build-slot="shelf_right"]').click();
  const b=page.locator('[data-research-upgrade="power"]');
  assert.match(await b.textContent(),/80/);await b.click();
  await page.waitForFunction(n=>G.DB.save.pkmsvvResearchRanks?.power===1&&G.DB.save.pkmsvvCoopLab.coopCoins===n,earned-80);
  await page.waitForFunction(()=>document.querySelector('.pkmsvv-build-stage [data-lab-layer="mega"]')?.dataset.labSkin==='mega_advanced');
  const after=await page.evaluate(()=>({coins:G.DB.save.pkmsvvCoopLab.coopCoins,rank:G.DB.save.pkmsvvResearchRanks.power,atk:G.GlobalPower.combine({},G.GlobalPower.effectiveLevels(G.DB.save)).atkMul,latest:JSON.parse(localStorage.getItem('pkmsvv.safe.v1.pkmsvv_offline.latest'))}));
  assert.equal(after.latest.pkmsvvCoopLab.coopCoins,earned-80);assert.equal(after.latest.pkmsvvResearchRanks.power,1);
  assert.ok(Math.abs(after.atk-1.12)<1e-9);assert.deepEqual(errors,[]);
  console.log('FOSSIL_NATIVE_REWARD_RESEARCH_PASS='+JSON.stringify({duration:final.finish.elapsed,earned,remaining:after.coins,rank:after.rank,atk:after.atk,fixture:'protected health, controlled host position and boss damage; native clock, objectives, wallet and UI'}));
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
