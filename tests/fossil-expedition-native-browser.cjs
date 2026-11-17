'use strict';
/* Experimental LAN/AI Fossil Expedition gameplay smoke: NEVER production. */
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
const {startServer}=require('../lan-server/server.cjs');
(async()=>{
 const remote=process.env.PKMSVV_NATIVE_BROWSER_URL||'';
 const root=path.resolve(__dirname,'../dist/lan');
 const server=remote?null:await startServer({root,host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[],consoleErrors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
 try{
  await page.goto(remote||'http://127.0.0.1:'+server.port+'/game/',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>G.DB?.save&&G.PKMSVVFossilExpedition?.nativeReady===true,{timeout:35000});
  const browserOnly=await page.evaluate(()=>({
   standalone:window.PKMSVV_STANDALONE_AI===true,
   offlineBus:G.LanBus?.offlineAI===true,
   gameJsPresent:!!G.PKMSVVFossilExpedition,
  }));
  assert.deepEqual(browserOnly,{standalone:true,offlineBus:true,gameJsPresent:true},
   'Cloudflare static preview must use browser-only AI without LAN server/WebSocket');
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
  await page.waitForFunction(()=>G.PKMSVVFossilExpedition.spriteReady===true,null,{timeout:12000});
  const aiBefore=await page.evaluate(()=>({
   count:G.LanAI.activeBots().length,
   bots:G.Coop.puppets().filter(p=>p.lanBot).map(p=>({x:p.x,y:p.y,moves:p.moves.length,dead:p.dead}))
  }));
  assert.ok(aiBefore.count>=1,'Fossil expedition MUST activate real AI controller (not just spawn idle allies)');
  assert.ok(aiBefore.bots.some(b=>b.moves>0),'allied AI must learn and cast native moves');
  await page.evaluate(()=>{
   const p=G.Game.player;
   p.invuln=10000;p.hp=p.maxHp;
   // Keep host in a clear location away from the fossil so the bot should
   // follow instead of standing still.
   p.x=350;p.y=0;
  });
  // A native Co-op Berry picker can block the first seconds. Confirm the
  // real pre-match choice rather than mistaking that deliberate hold for a
  // gameplay freeze (also exercises the user-facing skip button).
  await page.evaluate(()=>{
   const skip=[...document.querySelectorAll('.pkmsvv-berry-overlay button')]
    .find(x=>/Không dùng Berry|No Berry/.test(x.textContent));
   skip?.click();
  });
  await page.waitForTimeout(11000);
  const aiAfter=await page.evaluate(()=>({
   bots:G.Coop.puppets().filter(p=>p.lanBot).map(p=>({x:p.x,y:p.y,dead:p.dead})),
   state:G.Game.state,
   clock:G.Game.st?.time,
   art:G.PKMSVVFossilExpedition.spriteReady,
   berryChoosing:!!G.PKMSVVBerry?.choosing,
   cinematic:!!G.Judgment?.cinematic,
   visibility:document.visibilityState,
   popup:!!G.UI?.isOpen?.('scr-levelup'),
   timeNative:G.Game.st?.time,
   frames:G.Game?.state==='playing' ? 'expected' : 'paused'
  }));
  const distance=Math.hypot(aiAfter.bots[0].x-aiBefore.bots[0].x,
    aiAfter.bots[0].y-aiBefore.bots[0].y);
  console.log('FOSSIL_AI_DIAGNOSTIC='+JSON.stringify({
    aiBefore,aiAfter,distance,errors:errors.slice(0,6),consoleErrors:consoleErrors.slice(0,10)
  }));
  assert.ok(aiAfter.clock>.15,'native Game clock never advanced: '+JSON.stringify({aiAfter,consoleErrors:consoleErrors.slice(0,8),errors:errors.slice(0,4)}));
  assert.ok(distance>5,'Fossil AI must MOVE; idle AI regression: '+JSON.stringify({aiBefore,aiAfter,distance}));
  assert.equal(aiAfter.art,true,'Research machine and fossil rock textures must load');
  console.log('FOSSIL_AI_SPRITE_SMOKE='+JSON.stringify({aiBefore,aiAfter,distance}));
  assert.equal(await page.evaluate(()=>G.Game.state),'playing','native Game loop must not crash after excavation');
  assert.equal(await page.evaluate(()=>G.DB.save.pkmsvvCoopLab?.coopCoins||0),state.coins,
   'mining must not grant unvalidated Co-op Coins');
  assert.deepEqual(errors,[],'real browser engine exceptions');
  console.log('PASS EXPEDITION_NATIVE_QA real Co-op room, 2–4 party, AI companion, 3 world rocks, real in-world mining, native loop');
 }finally{await browser.close();if(server)await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
