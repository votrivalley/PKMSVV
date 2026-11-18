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
  // Diagnose loaded CSS to catch stale assets or CSS unexpectedly
  // truncated by build instead of assuming a selector mistake.
  const cssDebug=await page.evaluate(async()=>{
   const el=document.getElementById('scr-menu');
   const sources=[...document.querySelectorAll('link[rel="stylesheet"]')].map(x=>x.href);
   const loaded=await Promise.all(sources.filter(x=>x.includes('/css/')).map(async url=>{
    try{const response=await fetch(url,{cache:'no-store'});
     const css=await response.text();
     return {url:url.split('/').slice(-2).join('/'),status:response.status,
      marker:css.includes('PKMSVV_HOME_MENU_FIXED_ICON_COLUMN_V1'),
      matchCount:(css.match(/--pkmsvv-nav-icon-track/g)||[]).length,
      bytes:css.length};
    }catch(e){return {url,error:String(e)};}
   }));
   const row=el?.querySelector('.menu-right .menu-list>.menu-item');
   return {menuClass:el?.className,navClass:el?.querySelector('.menu-right')?.className,
    rowClass:row?.className,bodyClass:document.body.className,
    links:loaded,stylesheets:document.styleSheets.length};
  });
  console.log('PKMSVV_MENU_CSS_PROBE='+JSON.stringify(cssDebug));
  // Real desktop and portrait mobile UI regression: every launcher icon is
  // visually the same size, on a single vertical axis, with fixed label X.
  for(const [viewport,width,height] of [['desktop',1280,800],['mobile',390,844]]){
   await page.setViewportSize({width,height});
   const aligned=await page.evaluate(()=>{
    const buttons=[...document.querySelectorAll(
     '#scr-menu .menu-right .menu-list>.menu-item, #scr-menu .menu-right .menu-list>.pkmsvv-icon-unified'
    )].filter(b=>b.getBoundingClientRect().width>0&&b.getBoundingClientRect().height>0);
    return buttons.map(btn=>{
     const icon=btn.querySelector(':scope > .mi-ico');
     const label=btn.querySelector(':scope > .pkmsvv-menu-copy');
     const ir=icon?.getBoundingClientRect(),br=btn.getBoundingClientRect(),
      lr=label?.getBoundingClientRect();
     const visibleArt=icon?.querySelector('img,svg,canvas');
     const artRect=visibleArt?.getBoundingClientRect();
     const style=getComputedStyle(btn),iconStyle=icon&&getComputedStyle(icon);
     const showcase=btn.id==='pkmsvv-menu-wiki'||
      /pkmsvv-menu-icon-(coop|arena)/.test(icon?.className||'');
     const featureSprite=/pkmsvv-menu-icon-(coop|arena)/.test(icon?.className||'');
     const left=br.x+parseFloat(style.borderLeftWidth)+parseFloat(style.paddingLeft)+
      parseFloat(style.gridTemplateColumns.split(' ')[0])+parseFloat(style.columnGap);
     // Measure the actual first visible text glyph, even when native menu.js
     // uses a bare text node instead of the later copy-wrapper.
     const raw=[...btn.childNodes].find(n=>n.nodeType===3&&n.nodeValue.trim());
     let rawTextX=null;
     if(raw){
      const r=document.createRange(),index=raw.nodeValue.search(/\S/);
      r.setStart(raw,index);r.setEnd(raw,raw.nodeValue.length);
      rawTextX=r.getBoundingClientRect().x;
     }
     return {text:btn.textContent.trim().slice(0,25),iconX:ir?.x,iconW:ir?.width,iconH:ir?.height,
      iconFont:iconStyle?.fontSize,artW:artRect?.width,artH:artRect?.height,
      showcase,featureSprite,bgH:parseFloat(iconStyle?.backgroundSize?.split(' ')[1]||0),
      textX:lr?.x??rawTextX??left,expectedTextX:left,
      grid:style.gridTemplateColumns,hidden:br.width===0};
    });
   });
   console.log('PKMSVV_MENU_ICON_ALIGN_'+viewport+'='+JSON.stringify(aligned));
   assert.ok(aligned.length>=9,'at least nine visible native home menu actions');
   for(const x of aligned){
    assert.ok(Math.abs(x.iconW-36)<.75&&Math.abs(x.iconH-36)<.75,'icon must have 36px fixed frame: '+JSON.stringify(x));
    if(x.artW!==undefined)
     assert.ok(x.showcase?(x.artW>=30&&x.artH>=30):(x.artW<=26.5&&x.artH<=26.5),
      'optically balance original PC art without enlarging normal icons: '+JSON.stringify(x));
    if(x.featureSprite)assert.ok(x.bgH>=33,'Co-op/Arena should use optically enlarged 34px artwork: '+JSON.stringify(x));
    assert.ok(Math.abs(x.textX-x.expectedTextX)<1.5,'label must begin at shared grid column: '+JSON.stringify(x));
   }
   const iconOrigins=aligned.map(x=>x.iconX),textOrigins=aligned.map(x=>x.textX);
   assert.ok(Math.max(...iconOrigins)-Math.min(...iconOrigins)<1.5,'icons must align in one vertical column: '+JSON.stringify(aligned));
   assert.ok(Math.max(...textOrigins)-Math.min(...textOrigins)<1.5,'titles must align in one text column: '+JSON.stringify(aligned));
  }
  await page.setViewportSize({width:1280,height:800});
  await page.click('#scr-menu [data-go="multiplayer"]');
  await page.locator('#pkmsvv-coop-modes [data-mode="fossil_lab"]').waitFor();
  assert.match(await page.locator('#pkmsvv-coop-modes [data-mode="fossil_lab"]').innerText(),/2–4/);
  await page.click('#pkmsvv-coop-modes [data-mode="fossil_lab"]');
  // Pippi must explain rules on first entry BEFORE starting matchmaking.
  const pippiMode=await page.evaluate(()=>{
   const guide=G.PKMSVVPippiGuide;
   const first=guide?.current?.kind||'';
   let pages=0;
   while(guide?.current?.kind==='mode_fossil_lab'&&pages<8){guide.next();pages++;}
   return {first,pages,completed:G.DB.save.pkmsvvPippiGuide?.mode_fossil_lab===true};
  });
  assert.ok(pippiMode.first==='mode_fossil_lab'||pippiMode.completed,
   'Pippi must introduce Fossil Expedition before first matchmaking');
  assert.equal(pippiMode.completed,true);
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
  const positions=await page.evaluate(()=>{
   const s=G.PKMSVVFossilExpedition.session;
   return {
    distances:s.sites.map(p=>Math.hypot(p.x-s.machine.x,p.y-s.machine.y)),
    sites:s.sites.map(p=>({x:p.x,y:p.y,hits:p.hits})),
    rescueDeadline:G.PKMSVVFossilExpeditionCore.ROTOM_DEADLINE,
    victory:G.PKMSVVFossilExpeditionCore.DEFEND_END,
    boss:G.PKMSVVFossilExpeditionCore.BOSS_DEX
   };
  });
  assert.ok(positions.distances.every(d=>d>=1500),'all three sites must be well beyond the first screen');
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)
   assert.ok(Math.hypot(positions.sites[i].x-positions.sites[j].x,positions.sites[i].y-positions.sites[j].y)>2500);
  assert.deepEqual([positions.rescueDeadline,positions.victory,positions.boss],[240,480,623]);
  const guidance=await page.evaluate(()=>{
   const s=G.PKMSVVFossilExpedition.session;
   return {initialPhase:s.phase,origin:s.machine,siteCount:s.sites.length,
    hudCode:typeof G.PKMSVVFossilExpedition.hud==='function'};
  });
  assert.equal(guidance.siteCount,3);
  assert.equal(guidance.initialPhase,'excavate');
  assert.equal(guidance.hudCode,true);
  // The repaired Restorer must behave like a Berry tree: native enemy AI
  // targets one stable machine actor, but only during Rotom-fused defense.
  const machineTargetQA=await page.evaluate(()=>{
   const api=G.PKMSVVFossilExpedition,s=api.session;
   const pre=api.targetFor({id:1,x:100,y:100,dead:false})===null;
   const originalPhase=s.phase,originalOnline=s.machine.online;
   s.phase='defend';s.machine.online=true;
   const directed=api.targetFor({id:1,x:100,y:100,dead:false});
   const pressure=api.targetFor({id:5,x:100,y:100,dead:false});
   const remote=api.targetFor({id:1,x:100,y:100,dead:false,remote:true});
   s.phase=originalPhase;s.machine.online=originalOnline;
   const post=api.targetFor({id:1,x:100,y:100,dead:false})===null;
   return {pre,post,directed:directed?._pkmsvvFossilMachine===true,
    x:directed?.x,y:directed?.y,machineX:s.machine.x,machineY:s.machine.y,
    pressure:pressure===null,remote:remote===null};
  });
  assert.equal(machineTargetQA.pre,true,'before Rotom fusion, enemies must still attack the trainers');
  assert.equal(machineTargetQA.post,true,'QA must leave live mission state unchanged');
  assert.equal(machineTargetQA.directed,true,'native enemy AI must prioritize an actual Restorer target actor');
  assert.equal(machineTargetQA.pressure,true,'one in five Pokémon must continue pressuring trainers');
  assert.equal(machineTargetQA.remote,true,'guest-side remote snapshots must not retarget native enemies');
  assert.deepEqual([machineTargetQA.x,machineTargetQA.y],
    [machineTargetQA.machineX,machineTargetQA.machineY]);
  console.log('FOSSIL_MACHINE_TARGET_QA='+JSON.stringify(machineTargetQA));
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
