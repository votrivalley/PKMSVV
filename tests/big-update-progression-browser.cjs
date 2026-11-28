'use strict';
// Native game result, no fabricated kill or mastery points. Near-ready egg is
// seeded in a fresh QA save; the real run must contribute at least one kill.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs');
const OUT=path.resolve('dist/big-update-progression-qa');fs.mkdirSync(OUT,{recursive:true});
(async()=>{const server=await startServer({root:path.resolve(__dirname,'../dist/lan'),host:'127.0.0.1',port:0});let browser,page;const errors=[];
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.PKMSVV_BROWSER||'/usr/bin/google-chrome'});
  page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;});
  const url='http://127.0.0.1:'+server.port+'/game/';
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>!!window.G?.DB?.save&&!!G.PKMSVVQuickRegion?.choose&&!!G.PKMSVVBigUpdateQA,null,{timeout:40000});
  const inventory=await page.evaluate(()=>{
   const dex=new Set((G.DEX||[]).map(x=>Number(x.dex))),species=Array.from({length:1025},(_,i)=>i+1);
   const playable=species.filter(d=>dex.has(d)&&G.SPRITE_META?.[d]?.a?.Idle&&G.SPRITE_META?.[d]?.a?.Walk);
   return {species:species.length,defined:species.filter(d=>dex.has(d)).length,playable:playable.length,missing:species.filter(d=>!playable.includes(d)),extraDex:[...dex].filter(d=>d>1025),moveIds:Object.keys(G.Moves?.BY_ID||{}).sort(),spriteMetadataCount:Object.keys(G.SPRITE_META||{}).length};
  });
  fs.writeFileSync(path.join(OUT,'compiled-inventory.json'),JSON.stringify(inventory,null,2));
  await page.evaluate(()=>{
   const s=G.DB.save;Object.assign(s,{partner:25,partnerShiny:false,pkmsvvStorySeen:true,pkmsvvNameChosen:true,pkmsvvChapter7Seen:true});
   s.owned={...s.owned,25:{at:1}};delete s.owned[19];s.pkmsvvDefeatedDex={...s.pkmsvvDefeatedDex,19:true};s.pkmsvvMastery={};
   s.pkmsvvIncubator={serial:1,active:'egg-1',eggs:{'egg-1':{dex:19,kills:499,region:0,from:'region-boss'}},hatched:{}};
   G.MenuUI.open();if(!G.PKMSVVQuickRegion.choose(0))throw Error('Cannot enter Explore');
   window.__progressKeep=setInterval(()=>{[...document.querySelectorAll('.pkmsvv-berry-overlay button')].find(x=>/Không dùng Berry|No Berry/.test(x.textContent))?.click();
    const p=G.Game?.player;if(p&&!p.dead)p.invuln=Math.max(p.invuln||0,2000);
    if(G.Game?.state==='levelup'&&G.UI?.isOpen?.('scr-levelup'))G.RunUI.pick(0);},100);
  });
  await page.waitForFunction(()=>G.Game?.state==='playing',null,{timeout:23000});
  await page.evaluate(()=>{
   G.EnemyMgr.clear();G.Projectiles.clear();G.Combat.clearFields();G.Hazards.clear();
   const p=G.Game.player;let spot;for(let y=-600;y<600&&!spot;y+=48)for(let x=-600;x<600&&!spot;x+=48)if(G.World.isFree(x,y,120)&&G.World.isFree(x+35,y,24)){spot={x,y};break;}
   if(!spot)throw Error('No test location');p.x=spot.x;p.y=spot.y;p.aim=0;p.moveAngle=0;
   const m=G.Moves.instance('tackle');m.t=0;p.moves=[m];p.slots=[[m]];p.active=0;
   const e=G.EnemyMgr.add(new G.Enemy({dex:19,hp:1,spd:0,dmg:1,xp:1,behavior:'chase'},p.x+35,p.y,{hp:1,spd:1,dmg:1}));
   G.EnemyMgr.rebuildGrid();p.target=e;window.__progressTarget={e,kills:p.kills};
  });
  await page.waitForFunction(()=>window.__progressTarget.e.dead&&G.Game.player.kills>window.__progressTarget.kills,null,{timeout:12000});
  await page.waitForFunction(()=>Number(G.Game.st?.time)>=61,null,{timeout:100000});
  await page.evaluate(()=>{clearInterval(window.__progressKeep);G.Game.quit();});
  await page.waitForFunction(()=>G.DB.save.pkmsvvMastery?.[25]>0&&G.DB.save.pkmsvvIncubator?.eggs?.['egg-1']?.kills===500,null,{timeout:12000});
  const progress=await page.evaluate(()=>({mastery:G.DB.save.pkmsvvMastery[25],egg:G.DB.save.pkmsvvIncubator.eggs['egg-1'].kills,state:G.Game.state}));
  // The real PokéBox must keep Mastery separate from Rank and Details.
  await page.evaluate(()=>{G.MenuUI.open();G.PKMSVVBoxHubUI.openBox();});
  const profile=page.locator('#pkmbx-profile');
  assert.equal(await profile.locator('[data-box-tab="mastery"]').count(),1);
  assert.equal(await profile.locator('.pkmsvv-mastery-qa').count(),0);
  await profile.locator('[data-box-tab="mastery"]').click();
  assert.equal(await profile.locator('[data-box-tab="mastery"]').getAttribute('aria-pressed'),'true');
  assert.equal(await profile.locator('.pkmsvv-mastery-qa progress').getAttribute('value'),String(progress.mastery));
  assert.equal(await profile.locator('[data-mastery-reward]').count(),5);
  assert.equal(await profile.locator('[data-pkmbx-action="mint"]').count(),0);
  await page.screenshot({path:path.join(OUT,'mastery-desktop.png')});
  await profile.locator('[data-box-tab="rank"]').click();
  assert.equal(await profile.locator('.pkmsvv-mastery-qa').count(),0);
  await profile.locator('[data-box-tab="info"]').click();
  assert.equal(await profile.locator('[data-pkmbx-action="mint"]').count(),1);
  assert.equal(await page.evaluate(()=>G.DB.save.pkmsvvMastery[25]),progress.mastery);
  await page.evaluate(()=>{G.PKMSVVBoxHubUI.closeBox();G.PKMSVVSupportCatalog.open();});
  const catalog=page.locator('#pkmsvv-support-catalog');
  const station=catalog.locator('[data-support-station-tab="incubator"]');
  const eggs=catalog.locator('[data-recruit-egg-panel]');
  assert.equal(await station.isVisible(),false,'non-lab support entry must not expose incubator');
  await page.evaluate(()=>{G.PKMSVVSupportCatalog.close();G.PKMSVVWiki.open();});
  await page.locator('[data-research-hotspot="support"]').click();
  assert.equal(await station.isVisible(),true);
  assert.equal(await eggs.count(),0);
  await station.click();
  assert.equal(await catalog.locator('.pkmsvv-support-layout').isVisible(),false);
  assert.equal(await eggs.isVisible(),true);
  assert.equal(await eggs.locator('progress').getAttribute('value'),'500');
  await page.screenshot({path:path.join(OUT,'incubator-ready-desktop.png')});
  await catalog.locator('[data-support-station-tab="support"]').click();
  assert.equal(await eggs.count(),0);
  assert.equal(await catalog.locator('.pkmsvv-support-layout').isVisible(),true);
  await station.click();
  await page.setViewportSize({width:844,height:390});
  await page.screenshot({path:path.join(OUT,'incubator-ready-landscape.png')});
  assert.equal(await eggs.isVisible(),true);
  await eggs.locator('[data-recruit-egg="egg-1"]').click();
  await page.waitForFunction(()=>!!G.DB.save.owned[19]&&G.DB.save.pkmsvvIncubator.hatched['egg-1']===19,null,{timeout:6000});
  const after=await page.evaluate(()=>({mastery:G.DB.save.pkmsvvMastery[25],hatch:G.DB.save.owned[19],eggs:G.DB.save.pkmsvvIncubator}));
  assert.equal(after.hatch.from,'incubator');assert.equal(after.eggs.active,null);assert.equal(after.eggs.eggs['egg-1'],undefined);assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(OUT,'incubator-after.png')});
  await catalog.locator('.pkmsvv-support-modal-head button').click();
  assert.equal(await page.locator('#pkmsvv-wiki-overlay').isVisible(),true);
  await page.locator('[data-research-hotspot="support"]').click();
  assert.equal(await eggs.count(),0,'reopen defaults to support, not stale incubator');
  assert.equal(await catalog.locator('.pkmsvv-support-layout').isVisible(),true);
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({progress,after,inventory:{defined:inventory.defined,playable:inventory.playable,moveCount:inventory.moveIds.length}},null,2));
  console.log('BIG_UPDATE_NATIVE_PASS='+JSON.stringify({progress,after,defined:inventory.defined,playable:inventory.playable,moves:inventory.moveIds.length}));
 }catch(e){fs.writeFileSync(path.join(OUT,'failure.json'),JSON.stringify({error:String(e),errors},null,2));if(page)await page.screenshot({path:path.join(OUT,'failure.png'),timeout:5000}).catch(()=>{});throw e;}
 finally{try{if(browser)await browser.close();}finally{await server.close();}}
})().catch(e=>{console.error(e);process.exitCode=1;});
