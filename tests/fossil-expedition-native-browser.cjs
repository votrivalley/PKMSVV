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
     const pseudoStyle=icon&&getComputedStyle(icon,'::after');
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
      pseudoW:parseFloat(pseudoStyle?.width||0),pseudoH:parseFloat(pseudoStyle?.height||0),
      pseudoBG:pseudoStyle?.backgroundImage||'none',
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
    if(x.featureSprite){
     assert.ok(Math.abs(x.pseudoW-47.6)<0.2&&Math.abs(x.pseudoH-47.6)<0.2,
      'Co-op/Arena artwork must be exactly 40% larger: '+JSON.stringify(x));
     assert.ok(x.pseudoBG.includes('pkmsvv-menu-icons.webp'),
      'Co-op/Arena still use the original asset, not an emoji: '+JSON.stringify(x));
    }
    if(x.text.startsWith('Phòng nghiên cứu')||x.text.startsWith('Research Lab'))
     assert.ok(Math.abs(x.artW-35.2)<0.3,'Research icon must be exactly 10% larger: '+JSON.stringify(x));
    assert.ok(Math.abs(x.textX-x.expectedTextX)<1.5,'label must begin at shared grid column: '+JSON.stringify(x));
   }
   const iconOrigins=aligned.map(x=>x.iconX),textOrigins=aligned.map(x=>x.textX);
   assert.ok(Math.max(...iconOrigins)-Math.min(...iconOrigins)<1.5,'icons must align in one vertical column: '+JSON.stringify(aligned));
   assert.ok(Math.max(...textOrigins)-Math.min(...textOrigins)<1.5,'titles must align in one text column: '+JSON.stringify(aligned));
  }
  await page.setViewportSize({width:1280,height:800});
  // Regression: the newer unified Beta MUST actually load the preexisting
  // max-8-skill AUTO selection module and its CSS (not just retain source).
  await page.waitForFunction(()=>!!G.PKMSVVRuntimeControlsQA?.installAutoPick,{timeout:12000});
  const autoSkillQA=await page.evaluate(()=>{
   const a=G.PKMSVVRuntimeControlsQA,was=a.enabled();
   const result={loaded:!!a,wrapped:G.RunUI?.showLevelUp?._pkmsvvMaxAutoPick===true,
    settingType:typeof a.setEnabled,available:typeof a.full};
   a.setEnabled(true);result.persisted=a.enabled()===true;
   a.setEnabled(was);return result;
  });
  assert.deepEqual(autoSkillQA,{loaded:true,wrapped:true,settingType:'function',
   available:'function',persisted:true},
   'Max-skill AUTO was missing from actual Beta despite existing in older QA builds');
  // Validate the real item modal CSS from the actual compiled game rather than
  // mere selectors in the source tree; do not change a player save here.
  const heldLayout=await page.evaluate(()=>{
   const ui=G.RunUI,items=G.Items?.BY||{};
   if(!items.leftovers||!items.assaultvest)return {error:'Native item catalogue unavailable'};
   ui.showItemChoice('leftovers','assaultvest',()=>{});
   const box=document.getElementById('item-cards');
   const cards=[...document.querySelectorAll('#scr-item .pkmsvv-held-columns > button')];
   const gr=box.getBoundingClientRect();
   const bounds=cards.map(card=>{const r=card.getBoundingClientRect(),css=getComputedStyle(card);
    return {x:r.x,width:r.width,height:r.height,display:css.display,
     cols:css.gridTemplateColumns,label:getComputedStyle(card.querySelector('.pkmsvv-held-label')).whiteSpace,
     nameWidth:card.querySelector('strong').getBoundingClientRect().width};
   });
   G.UI.hide('scr-item');document.getElementById('scr-item')?.classList?.remove('pkmsvv-held-open');
   return {count:cards.length,boxWidth:gr.width,bounds,
    autoCss:[...document.querySelectorAll('link[rel=stylesheet]')]
     .some(l=>l.href.includes('pkmsvv-runtime-controls-qa.css'))};
  });
  assert.equal(heldLayout.count,2,'Two held item choices');
  assert.ok(heldLayout.autoCss,'Max skill AUTO CSS must load in Beta');
  assert.ok(heldLayout.boxWidth>=490&&heldLayout.boxWidth<=725,'Item modal must be centred and compact');
  assert.ok(heldLayout.bounds.every(c=>c.display==='grid'&&c.width>=180&&c.nameWidth>130&&c.label==='nowrap'),
   'No flex-squeezed vertical labels or narrow title cards: '+JSON.stringify(heldLayout));
  console.log('BETA_MAX_SKILL_AUTO_AND_HELD_ITEM_LAYOUT='+JSON.stringify({autoSkillQA,heldLayout}));
  const megaCatalog=await page.evaluate(()=>{
   const api=G.PKMSVVMegaEntry,forms=G.PKMSVV_MEGA_CATALOG||[];
   return {fullFlag:window.PKMSVV_MEGA_FULL_CATALOG_QA===true,
    cousinFlag:window.PKMSVV_PIPPI_COUSIN_QA_100===true,
    all:forms.length,visible:api?.available?.().length,
    actualSpriteCount:api?.available?.().filter(x=>api.hasSprite(x)).length};
  });
  assert.equal(megaCatalog.fullFlag,true,'CSP-safe Beta Mega flag must be ENABLED');
  assert.equal(megaCatalog.cousinFlag,true,'CSP-safe Pippi Pikachu 100% Beta flag must be ENABLED');
  assert.deepEqual([megaCatalog.all,megaCatalog.visible],[96,96],
   'Beta must display all 96 Mega entries instead of only 3 sprite-equipped forms');
  assert.ok(megaCatalog.actualSpriteCount>=3&&megaCatalog.actualSpriteCount<96,
   'Missing sprite art stays missing rather than being invented');
  console.log('BETA_MEGA_ROSTER_96_RESTORED: '+JSON.stringify(megaCatalog));
  // The item-choice probe above temporarily hid the real native home screen.
  // Restore the menu before testing a user click, otherwise the test itself
  // introduces an artificial hidden-menu timeout unrelated to real gameplay.
  await page.evaluate(()=>G.MenuUI.open());
  await page.locator('#scr-menu [data-go="play"]').waitFor({state:'visible',timeout:12000});
  // Regression: clicking the real Explore menu MUST open a Gen chooser, not
  // immediately launch the generic mixed-gen native match.
  await page.click('#scr-menu [data-go="play"]');
  await page.waitForSelector('#pkmsvv-quick-region:not([hidden])',{timeout:12000});
  const actualExplore=await page.evaluate(()=>{
   const s=G.DB.save,ui=G.PKMSVVQuickRegion;
   const names=['Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea'];
   s.pkmsvvExploreSeals={...s.pkmsvvExploreSeals,...Object.fromEntries(names.map(n=>[n,true]))};
   // Rebuild the live modal from this QA save WITHOUT mutating disk.
   ui.open();
   return {open:!document.querySelector('#pkmsvv-quick-region')?.hidden,
    count:document.querySelectorAll('#pkmsvv-quick-region-grid .pkmsvv-quick-region-card').length,
    sky:ui.entries()[9].name,skyOpen:ui.entries()[9].unlocked,
    chosen:ui.selectedRegion,gameState:G.Game?.state,
    covers:[...document.querySelectorAll('link[rel=stylesheet]')]
     .some(link=>link.href.includes('pkmsvv-quick-region.css'))};
  });
  assert.deepEqual(actualExplore,{open:true,count:10,sky:'Tháp Thiên Không',
   skyOpen:true,chosen:-1,gameState:'ui',covers:true},
   'Native Explore must show 10 Gen maps and unlock Sky on the QA 9-badge save');
  await page.evaluate(()=>{
   const guide=G.PKMSVVPippiGuide;
   let n=0;while(guide?.current?.kind==='mode_explore'&&n++<8)guide.next();
   G.PKMSVVQuickRegion.close();
  });
  assert.equal(await page.locator('#pkmsvv-quick-region:not([hidden])').count(),0);
  console.log('BETA_EXPLORE_GEN_CHOOSER_RESTORED: 10 cards and 9 badges unlock Sky, no automatic combat');
  // The 10th thumbnail always existed, but actual Sky fights previously used
  // the original dark Dragon Sanctuary. Test genuine 16px world pixels.
  const skyTerrainQA=await page.evaluate(()=>{
   const api=G.PKMSVVSkyTowerMapQA,q=G.PKMSVVQuickRegion;
   if(!api||!api.installed)return {loaded:false};
   if(!q.beginRun(9))return {loaded:true,started:false};
   try{
    const bi=q.targetBiome(9);
    const c=G.Tiles.paintChunk(0,0,16,()=> 'floor',()=>.4,bi,3);
    const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let bright=0,gold=0,blue=0;
    for(let i=0;i<data.length;i+=4){
     const [r,g,b]=[data[i],data[i+1],data[i+2]];
     if(r>215&&g>210&&b>180)bright++;
     if(r>180&&g>125&&b<155)gold++;
     if(b>r+12&&b>g)blue++;
    }
    return {loaded:true,started:true,biome:bi,width:c.width,height:c.height,
     bright,gold,blue,biomeName:G.World.biomeName()};
   }finally{q.endRun();}
  });
  assert.equal(skyTerrainQA.loaded,true,'Beta must load executable Sky map, not only cover image');
  assert.equal(skyTerrainQA.started,true,'Sky QA session must arm with nine badges');
  assert.deepEqual([skyTerrainQA.width,skyTerrainQA.height],[256,256]);
  assert.ok(skyTerrainQA.bright>5000&&skyTerrainQA.gold>300,
   'Sky must have WHITE MARBLE / GOLD pixels, not the old purple Dragon biome: '+
   JSON.stringify(skyTerrainQA));
  assert.equal(skyTerrainQA.biomeName,'Tháp Thiên Không');
  console.log('BETA_SKY_TOWER_ACTUAL_WORLD='+JSON.stringify(skyTerrainQA));
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
  // Actual stage geometry: Rotom and all mining sites must clear scenery.
  const worldGeometry=await page.evaluate(()=>{
   const expedition=G.PKMSVVFossilExpedition,s=expedition.session;
   return {safe:expedition.objectivePositionsSafe,
    machineSolid:!G.World.isFree(s.machine.x,s.machine.y-45,12),
    collisionActive:expedition.machineCollisionActive,
    machineAwayFromSpawn:Math.hypot(s.machine.x,s.machine.y)>=290};
  });
  assert.deepEqual(worldGeometry,{
   safe:true,machineSolid:true,collisionActive:true,machineAwayFromSpawn:true
  },'Restorer and mining/Rotom positions need native collision and clearance');
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
  const approvedAtlas=await page.evaluate(async()=>{
   const img=new Image();img.src='images/coop-lab/approved-fossil-source-atlas.png';await img.decode();
   return {width:img.naturalWidth,height:img.naturalHeight};
  });
  assert.deepEqual([approvedAtlas.width,approvedAtlas.height],[384,192],
   'Game must load approved concept sprites, not old SVG/painted machine');
  const v3Atlas=await page.evaluate(async()=>{
   const img=new Image();img.src='images/coop-lab/approved-fossil-v3-atlas.png';await img.decode();
   return {width:img.naturalWidth,height:img.naturalHeight};
  });
  assert.deepEqual(v3Atlas,{width:464,height:144},
   'The APPROVED V3 PNG must load in native gameplay');
  const completeMachine=await page.evaluate(async()=>{
   const img=new Image();img.src='images/coop-lab/approved-fossil-machine-full-v4.png';await img.decode();
   return {width:img.naturalWidth,height:img.naturalHeight};
  });
  assert.deepEqual(completeMachine,{width:256,height:128},
   'Restorer full original art must load, not old clipped machine sprite');
  // Exercise the actual 2D Canvas drawables with native object coordinates.
  // A screenshot alone did not catch 96px atlas cells stretched to 90/92px.
  const actualSpriteRects=await page.evaluate(()=>{
   const api=G.PKMSVVFossilExpedition;
   const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
   const ctx=canvas.getContext('2d'),records=[];
   ctx.drawImage=function(...args){
    if(/approved-fossil-(source-atlas|v3-atlas|machine-full-v4)\.png/.test(args[0]?.src||''))
     records.push({asset:args[0].src.includes('machine-full-v4')?'machineV4':
      args[0].src.includes('-v3-')?'V3':'original',
      sx:args[1],sy:args[2],sw:args[3],sh:args[4],
      dx:args[5],dy:args[6],dw:args[7],dh:args[8]});
   };
   for(const item of api.drawables())item.draw(ctx);
   return records;
  });
  const expectedRects=[
   {asset:'machineV4',sx:0,sy:0,sw:128,sh:128,dx:-64,dy:-116,dw:128,dh:128},
   {asset:'original',sx:192,sy:0,sw:96,sh:96,dx:-48,dy:-61,dw:96,dh:96},
   {asset:'original',sx:288,sy:0,sw:96,sh:96,dx:-48,dy:-61,dw:96,dh:96},
   {asset:'V3',sx:0,sy:0,sw:176,sh:144,dx:-44,dy:-51,dw:88,dh:72}
  ];
  const sortRects=xs=>xs.sort((a,b)=>a.asset.localeCompare(b.asset)||a.sy-b.sy||a.sx-b.sx);
  assert.deepEqual(sortRects(actualSpriteRects),sortRects(expectedRects),
   'Canvas must draw approved V3 amber and the three other objects at exact 2:1 or 1:1');
  console.log('FOSSIL_APPROVED_V3_RECTS='+JSON.stringify(actualSpriteRects));
  const mergedPaint=await page.evaluate(()=>{
   const api=G.PKMSVVFossilExpedition,s=api.session;
   const before={phase:s.phase,merged:s.rotom.merged,online:s.machine.online,collected:s.collected};
   try{
    s.phase='defend';s.rotom.merged=true;s.machine.online=true;s.collected=3;
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),rects=[];
    ctx.drawImage=function(...args){
     if(args[0]?.src?.includes('approved-fossil-machine-full-v4.png'))
      rects.push([args[1],args[2],args[3],args[4],args[5],args[6],args[7],args[8]]);
    };
    const draw=api.drawables();draw.forEach(x=>x.draw(ctx));
    return {rects,drawables:draw.length};
   }finally{
    s.phase=before.phase;s.rotom.merged=before.merged;
    s.machine.online=before.online;s.collected=before.collected;
   }
  });
  assert.deepEqual(mergedPaint.rects,[[128,0,128,128,-64,-116,128,128]],
   'Merged Rotom must show complete ON frame exactly once');
  assert.equal(mergedPaint.drawables,4,'NO separate Rotom/marker sprite during defend');
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
