'use strict';
/* Experimental LAN/AI Fossil Expedition gameplay smoke: NEVER production. */
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
const {startServer}=require('../lan-server/server.cjs');
(async()=>{
 const root=path.resolve(__dirname,'../dist/lan');
 const server=await startServer({root,host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.goto('http://127.0.0.1:'+server.port+'/game/');
  await page.waitForFunction(()=>G.DB?.save&&G.PKMSVVFossilExpedition?.nativeReady===true,{timeout:35000});
  await page.evaluate(()=>{
   G.DB.save.partner=25;G.DB.save.partnerShiny=false;G.DB.save.pkmsvvStorySeen=true;
   G.DB.save.pkmsvvNameChosen=true;G.DB.commit?.();G.MenuUI.open();
  });
  await page.click('#scr-menu [data-go="multiplayer"]');
  await page.locator('#pkmsvv-coop-modes [data-mode="fossil_lab"]').waitFor();
  assert.match(await page.locator('#pkmsvv-coop-modes [data-mode="fossil_lab"]').innerText(),/2–4/);
  await page.click('#pkmsvv-coop-modes [data-mode="fossil_lab"]');
  await page.click('#pkmsvv-coop-actions [data-role="ai"]');
  await page.waitForFunction(()=>G.Social?.room?.mode==='fossil_lab'&&G.Social.room.members.length>=2,{timeout:20000});
  const party=await page.evaluate(()=>G.Social.room.members.map(m=>({uid:m.uid,bot:!!m.bot})));
  assert.ok(party.length>=2&&party.length<=4);
  assert.ok(party.some(m=>m.bot),'a human starting solo must receive a genuine native AI teammate');
  await page.click('#lobby-start');
  await page.waitForFunction(()=>G.Game?.state==='playing'&&G.PKMSVVFossilExpedition?.active===true,{timeout:30000});
  const state=await page.evaluate(()=>({
   mode:G.Social.room.mode,host:G.Coop.isHost,sites:G.PKMSVVFossilExpedition.session?.sites?.length,
   hp:G.PKMSVVFossilExpedition.session?.machine.hp,
   team:G.PKMSVVFossilExpedition.session?.team.length,
   coins:G.DB.save.pkmsvvCoopLab?.coopCoins||0
  }));
  assert.deepEqual({mode:state.mode,host:state.host,sites:state.sites,hp:state.hp,team:state.team},
    {mode:'fossil_lab',host:true,sites:3,hp:360,team:party.length});
  const mined=await page.evaluate(()=>{
   const s=G.PKMSVVFossilExpedition.session,stone=s.sites[0];
   G.Game.player.x=stone.x;G.Game.player.y=stone.y;
   return G.PKMSVVFossilExpedition.perform();
  });
  assert.equal(mined.ok,true,'in-world mining requires player proximity and Host ownership');
  await page.waitForTimeout(1100);
  assert.equal(await page.evaluate(()=>G.Game.state),'playing','native Game loop must not crash after excavation');
  assert.equal(await page.evaluate(()=>G.DB.save.pkmsvvCoopLab?.coopCoins||0),state.coins,
   'mining must not grant unvalidated Co-op Coins');
  assert.deepEqual(errors,[],'real browser engine exceptions');
  console.log('PASS EXPEDITION_NATIVE_QA real Co-op room, 2–4 party, AI companion, 3 world rocks, real in-world mining, native loop');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
