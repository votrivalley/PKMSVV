'use strict';
// Test the packaged entry UI and real AI engine, not just /ai/ direct links.
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs');
const path=require('node:path'),assert=require('node:assert/strict');
async function main(){
 const android=process.env.PKMSVV_PLATFORM==='android';
 const server=await startServer({root:path.resolve(android?'mobile/www':'dist/cloudflare'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 const origin='http://127.0.0.1:'+server.port,errors=[];
 try{
  const context=await browser.newContext({viewport:android?{width:844,height:390}:{width:1280,height:800}});
  if(android)await context.addInitScript(()=>{
   window.__nativeCalls=[];
   window.Capacitor={Plugins:{PKMSVVLAN:{open:async data=>{window.__nativeCalls.push(data);}}}};
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const mode of ['coop','royale','eggrush']){
   await page.goto(origin+(android?'/':'/game/'));
   await page.waitForFunction(()=>window.G?.DB?.save);
   await page.evaluate(()=>{
    Object.assign(G.DB.save,{partner:150,pkmsvvStorySeen:true,pkmsvvNameChosen:true,
     pkmsvvChapter1Seen:true,pkmsvvChapter2Seen:true,pkmsvvChapter3Seen:true,
     pkmsvvChapter1Pending:false,pkmsvvChapter2Pending:false,pkmsvvChapter3Pending:false});
    G.DB.commit();G.MenuUI.open();
   });
   const entry=page.locator('#scr-menu #pkmsvv-coop-lan-entry,#scr-menu #pkmsvv-full-lan-entry,#scr-menu [data-go="multiplayer"],#scr-menu [data-go="online"]');
   assert.equal(await entry.count(),1,'exactly one Co-op menu entry');
   await entry.click();await page.locator('#pkmsvv-unified-coop').waitFor();
   assert.equal(await page.locator('#pkmsvv-coop-modes [data-mode]').count(),4,'three original modes plus one Berry difficulty selector');
   for(const role of ['host','join','ai'])assert.equal(await page.locator('#pkmsvv-coop-actions [data-role="'+role+'"]').count(),1);
   await page.click('[data-mode="'+mode+'"]');
   // Human rooms now host locally on the packaged engine, without a PC bridge.
   await page.click('#pkmsvv-coop-actions [data-role="host"]');
   await page.waitForFunction(m=>window.PKMSVV_WIFI&&G.Social.room?.mode===m&&G.Social.room.isHost,mode);
   assert.equal(await page.evaluate(()=>G.DB.save.partner),150);
   if(android)assert.equal(await page.evaluate(()=>window.__nativeCalls.length),0);
   await page.click('#pkmsvv-lan-copy-invite');
   await page.locator('.pkmsvv-wifi-panel').waitFor();
   assert.match(await page.locator('.pkmsvv-wifi-panel').innerText(),/phản hồi/);
   await page.locator('.pkmsvv-wifi-panel button').filter({hasText:'Đóng'}).click();
   await page.evaluate(async()=>{await G.Social.leaveRoom();G.MenuUI.open();PKMSVVCoop.open();});
   await page.click('#pkmsvv-coop-actions [data-role="join"]');
   await page.locator('.pkmsvv-wifi-panel').waitFor();
   assert.equal(await page.locator('.pkmsvv-wifi-panel textarea').count(),1);
   await page.locator('.pkmsvv-wifi-panel button').filter({hasText:'Đóng'}).click();
   await page.evaluate(()=>{G.MenuUI.open();PKMSVVCoop.open();});
   await page.click('#pkmsvv-coop-actions [data-role="ai"]');
   if(android){
    await page.waitForFunction(m=>window.G?.Social?.room?.mode===m&&G.Social.room.members.some(p=>p.bot),mode);
    assert.equal(await page.evaluate(()=>window.PKMSVV_ANDROID_LOCAL_LAN),true);
    assert.ok(!page.url().includes('/ai/game/'),'Android must not navigate to second game');
   }else{
    try{await page.waitForURL('**/ai/game/**');}
    catch(e){console.error('AI navigation diagnostics',await page.evaluate(()=>({url:location.href,available:window.PKMSVV_STANDALONE_AI_AVAILABLE,mode:window.PKMSVV_LOCAL_UI_MODE,detail:document.querySelector('#pkmsvv-coop-detail')?.textContent})),errors);throw e;}
    await page.waitForFunction(m=>G.Social?.room?.mode===m&&G.Social.room.members.some(p=>p.bot),mode);
   }
   assert.equal(await page.evaluate(()=>G.DB.save.partner),150,'existing chosen Pokémon preserved');
   assert.equal(await page.evaluate(()=>G.LanBus.offlineAI),true);
   if(android)assert.equal(await page.evaluate(()=>window.__nativeCalls.length),0);
   await page.click('#lobby-start');await page.waitForFunction(()=>G.Game.state==='playing');
   // The requested four-second Berry selection freezes combat/time before a new match.
   await page.waitForFunction(()=>!G.PKMSVVBerry?.choosing,null,{timeout:10000});
   if(mode==='royale'||mode==='eggrush'){
    // Real packaged browser: the Host timer/AI keeps running while two
    // independent skill cards wait for the player to choose in order.
    const initial=await page.evaluate(()=>{
     const start=G.Game.st.time;
     G.Coop.levelStart(G.Game.player.level+1);
     G.Coop.levelStart(G.Game.player.level+2);
     return {start,state:G.Game.state,open:G.UI.isOpen('scr-levelup')};
    });
    assert.equal(initial.state,'playing','competitive card pick must not pause Host');
    assert.equal(initial.open,true);
    await page.waitForTimeout(800);
    assert.ok(await page.evaluate(x=>G.Game.state==='playing'&&G.Game.st.time>x+.25,initial.start),
     'match timer and AI continue while a participant selects a skill');
    await page.evaluate(()=>G.RunUI.pick(0));
    assert.equal(await page.evaluate(()=>G.UI.isOpen('scr-levelup')),true,'next skill choice queued');
    await page.waitForTimeout(760);
    await page.evaluate(()=>G.RunUI.pick(0));
    await page.waitForFunction(()=>!G.UI.isOpen('scr-levelup'));
    assert.equal(await page.evaluate(()=>G.Game.state),'playing');
   }

   await page.waitForTimeout(Number(process.env.PKMSVV_SOAK_MS||15000));
   assert.ok(await page.evaluate(()=>G.Coop.players().some(p=>p.lanBot)));
   // Controlled match-time checkpoints supplement the real-time segment.
   for(const t of [60,180,360,600]){
    await page.evaluate(t=>{
     for(const p of G.Coop.players()){p.dead=false;p.hp=p.maxHp;p.lanEliminated=false;}
     G.Game.debugTime(t);
    },t);
    await page.waitForTimeout(200);
    if(mode==='eggrush')assert.equal(await page.evaluate(()=>G.Rift.drawable()===null),true);
   }
   if(mode==='royale'){
    // The exact user regression: one eliminated trainer must not be stuck
    // choosing cards. Spectate another living human/AI without pausing.
    await page.evaluate(()=>{
     const players=G.Coop.players();
     for(const p of players){p.dead=false;p.hp=p.maxHp;}
     G.Coop.levelStart(G.Game.player.level+1);
     if(!G.UI.isOpen('scr-levelup'))throw Error('expected personal skill chooser');
     G.Game.player.dead=true;G.Game.player.hp=0;
    });
    await page.waitForFunction(()=>G.Game.player.dead&&!G.UI.isOpen('scr-levelup')&&
     document.querySelector('#pkmsvv-spectator:not([hidden])')&&G.PKMSVVSpectator.cameraTarget());
    const before=await page.evaluate(()=>({t:G.Game.st.time,target:G.PKMSVVSpectator.cameraTarget().uid,
     available:G.Coop.players().filter(p=>p.uid!==G.Game.player.uid&&!p.dead).length}));
    assert.ok(before.available>=2);
    await page.waitForTimeout(500);
    assert.ok(await page.evaluate(t=>G.Game.state==='playing'&&G.Game.st.time>t+.1,before.t),
     'Royale keeps ticking after local player eliminated');
    await page.locator('#pkmsvv-spectator button').nth(1).click();
    const after=await page.evaluate(()=>({
     target:G.PKMSVVSpectator.cameraTarget()?.uid,
     camera:{x:G.Camera.x,y:G.Camera.y},
     dead:G.Game.player.dead,
     levelOpen:G.UI.isOpen('scr-levelup'),
     anyHp:G.Coop.players().filter(p=>!p.dead).length
    }));
    assert.notEqual(after.target,before.target,'spectator next must switch to a different alive trainer');
    assert.equal(after.dead,true,'spectating does not revive the eliminated trainer');
    assert.equal(after.levelOpen,false,'dead user never gets another skill chooser');
    assert.ok(after.anyHp>=2,'other contestants continue living');
   }
   if(mode==='eggrush')await page.evaluate(()=>{
    // Inject two legal Host-owned hidden eggs to exercise real end-screen
    // hatch animation, including Mew and Ditto on Android/Web browsers.
    const uid=G.Game.player.uid,t=G.Game.st.time||600;
    for(const [i,dex] of [[0,151],[1,132]]){
     const id=800000+i;
     G.EggRush.onEvent(['er','spawn',id,5000+i*40,5000]);
     G.EggRush.onEvent(['er','take',id,uid,dex,i+1,t]);
    }
    if(G.EggRush.pets.filter(p=>p.uid===uid&&p.hatch).length)
     throw Error('competitive eggs hatched before final score');
   });
   await page.evaluate(()=>{for(const p of G.Coop.players()){p.dead=true;p.hp=0;}if(G.EggRush.active)G.Game.debugTime(720);});
   await page.waitForFunction(()=>G.Game.state==='over',null,{timeout:10000});
   if(mode==='royale'||mode==='eggrush'){
    const podium=await page.evaluate(()=>({
     count:document.querySelectorAll('#over-stats canvas[data-pkmsvv-result-dex]').length,
     rows:document.querySelectorAll('#over-stats .pkmsvv-result-row').length,
     expected:(G.Royale.active?G.Royale.outcome:G.EggRush.outcome)?.standings?.length,
     dex:[...document.querySelectorAll('#over-stats canvas[data-pkmsvv-result-dex]')].map(c=>Number(c.dataset.pkmsvvResultDex))
    }));
    assert.equal(podium.count,podium.expected,'every finisher must have a real Pokémon sprite canvas');
    assert.equal(podium.rows,podium.expected,'all ranks visible in the scrollable result list');
    assert.ok(podium.dex.every(n=>Number.isInteger(n)&&n>0));
    if(mode==='eggrush'){
     await page.waitForFunction(()=>document.querySelector('[data-pkmsvv-results="eggrush"]')?.classList.contains('pkmsvv-egg-scoring-done'),null,{timeout:12000});
     const reveal=await page.evaluate(()=>{
      const root=document.querySelector('[data-pkmsvv-results="eggrush"]');
      return {
       rows:root.querySelectorAll('.pkmsvv-egg-final-row').length,
       hatched:root.querySelectorAll('.pkmsvv-egg-revealed').length,
       m:!!root.querySelector('[data-pkmsvv-hatch-dex="151"]'),
       d:!!root.querySelector('[data-pkmsvv-hatch-dex="132"]'),
       ranks:[...root.querySelectorAll('.pkmsvv-result-rank')].map(e=>e.textContent),
       winner:root.querySelector('.pkmsvv-results-champion')?.textContent||''
      };
     });
     assert.equal(reveal.rows,4);
     assert.ok(reveal.hatched>=2,'Mew and Ditto eggs hatched on actual result UI');
     assert.ok(reveal.m&&reveal.d);
     assert.deepEqual(reveal.ranks,['#1','#2','#3','#4']);
     assert.match(reveal.winner,/Vô địch|Winner/);
    }
   }
   await page.waitForFunction(()=>G.Social.room.open&&G.Social.room.members.every(p=>!p.bot));
   await page.click('#btn-again');await page.waitForFunction(()=>G.UI.isOpen('scr-lobby'));
   // A finished match removes all bots. Refill the legally required lobby
   // capacity before the replay: Egg Rush needs four participants, not two.
   await page.evaluate(async()=>{
    const required=G.Social.room.mode==='eggrush'?4:2;
    while(G.Social.room.members.length<required)await G.LanBus.request('addBot',{dex:25});
   });
   await page.waitForFunction(()=>!document.getElementById('lobby-start')?.disabled);
   await page.click('#lobby-start');await page.waitForFunction(()=>G.Game.state==='playing');
   // The requested four-second Berry selection freezes combat/time before a new match.
   await page.waitForFunction(()=>!G.PKMSVVBerry?.choosing,null,{timeout:10000});
   assert.ok(await page.evaluate(()=>G.Coop.players().some(p=>p.lanBot)));
   console.log('PASS '+(android?'Android packaged UI':'Web')+' '+mode+': menu → AI → timed checkpoints → finish → second match');
  }
  assert.deepEqual(errors,[],'no uncaught game exceptions');
 }finally{await browser.close();await server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
