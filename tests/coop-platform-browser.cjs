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
   assert.equal(await page.locator('#pkmsvv-coop-modes [data-mode]').count(),3);
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
   try{await page.waitForURL('**/ai/game/**');}
   catch(e){console.error('AI navigation diagnostics',await page.evaluate(()=>({url:location.href,available:window.PKMSVV_STANDALONE_AI_AVAILABLE,mode:window.PKMSVV_LOCAL_UI_MODE,detail:document.querySelector('#pkmsvv-coop-detail')?.textContent})),errors);throw e;}
   await page.waitForFunction(m=>G.Social?.room?.mode===m&&G.Social.room.members.some(p=>p.bot),mode);
   assert.equal(await page.evaluate(()=>G.DB.save.partner),150,'existing chosen Pokémon preserved');
   assert.equal(await page.evaluate(()=>G.LanBus.offlineAI),true);
   if(android)assert.equal(await page.evaluate(()=>window.__nativeCalls.length),0);
   await page.click('#lobby-start');await page.waitForFunction(()=>G.Game.state==='playing');
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
   assert.ok(await page.evaluate(()=>G.Coop.players().some(p=>p.lanBot)));
   console.log('PASS '+(android?'Android packaged UI':'Web')+' '+mode+': menu → AI → timed checkpoints → finish → second match');
  }
  assert.deepEqual(errors,[],'no uncaught game exceptions');
 }finally{await browser.close();await server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
