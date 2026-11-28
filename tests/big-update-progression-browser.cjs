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
   s.owned={...s.owned,25:{at:1}};delete s.owned[19];delete s.owned[16];s.pkmsvvDefeatedDex={...s.pkmsvvDefeatedDex,19:true,16:true};s.pkmsvvMastery={};
   s.pkmsvvIncubator={serial:1,active:'egg-1',eggs:{'egg-1':{dex:19,kills:499,region:0,from:'region-boss'}},hatched:{}};
   G.MenuUI.open();if(!G.PKMSVVQuickRegion.choose(0))throw Error('Cannot enter Explore');
   window.__progressKeep=setInterval(()=>{[...document.querySelectorAll('.pkmsvv-berry-overlay button')].find(x=>/Không dùng Berry|No Berry/.test(x.textContent))?.click();
    const p=G.Game?.player;if(p&&!p.dead)p.invuln=Math.max(p.invuln||0,2000);
    if(G.Game?.state==='levelup'&&G.UI?.isOpen?.('scr-levelup'))G.RunUI.pick(0);
    if(G.UI?.isOpen?.('scr-bond'))G.RunUI.pickBond(0);
    if(G.UI?.isOpen?.('scr-item'))(document.querySelector('#item-cards .pkmsvv-held-action.is-old')||document.querySelector('#item-cards .card'))?.click();
    if(document.querySelector('#pkmsvv-forget-skill'))G.PKMSVVForgetSkill?.selectSlot?.(0);
    document.querySelector('.pkmsvv-evo:not([hidden]) .pkmsvv-evo-skip')?.click();
   },100);
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
  await page.waitForFunction(()=>Number(G.Game.st?.time)>=61&&G.Game.state==='playing',null,{timeout:100000});
  // Enter a REAL native Dragon Rift in Kanto: every dragon legendary is
  // outside Kanto, so the region sanitizer must not replace the actor.
  const rift=await page.evaluate(()=>{
   G.Rift.debugArena('dragon');const a=G.Rift.arena,b=G.EnemyMgr.get(a.bossId);
   if(!b||b.dex!==a.dex||!b.legend||b.dex<=151)throw Error('Native Rift identity changed '+JSON.stringify({arena:a?.dex,boss:b?.dex}));
   const result={dex:b.dex,arena:a.dex,hp:b.maxHp,type:a.type};
   b.hurt(b.hp+10,'#fff',0,0,0);if(!b.dead||b.hp>0)throw Error('Native Rift boss not defeated');
   return result;
  });
  await page.waitForFunction(()=>G.Rift.arena?.phase==='won',null,{timeout:12000});
  await page.waitForFunction(()=>!G.Rift.inArena,null,{timeout:25000}).catch(async err=>{
   const detail=await page.evaluate(()=>({state:G.Game.state,time:G.Game.st.time,rift:G.Rift.arena&&{phase:G.Rift.arena.phase,endT:G.Rift.arena.endT},screens:[...document.querySelectorAll('[id^="scr-"]:not(.hidden)')].map(x=>x.id),overlays:[...document.querySelectorAll('#pkmsvv-forget-skill,.pkmsvv-evo,.pkmsvv-berry-overlay')].map(x=>({id:x.id,cls:x.className,text:x.textContent.slice(0,180)}))}));
   throw Error('Rift victory exit blocked: '+JSON.stringify(detail)+' errors='+JSON.stringify(errors)+' '+err.message);
  });
  // Rift exit legitimately offers a Bond fusion and can pause in 'choice'.
  // Resolve the native cards through the existing input path, not by
  // forging Game.state or bypassing the reward hook.
  await page.waitForFunction(()=>G.Game.state==='playing',null,{timeout:20000}).catch(async err=>{
   const detail=await page.evaluate(()=>({state:G.Game.state,rift:G.Rift.inArena,bond:G.UI.isOpen('scr-bond'),level:G.UI.isOpen('scr-levelup'),item:G.UI.isOpen('scr-item')}));
   throw Error('Rift exit input blocked: '+JSON.stringify(detail)+' '+err.message);
  });
  await page.evaluate(()=>{clearInterval(window.__progressKeep);G.Game.quit();});
  await page.waitForFunction(()=>G.DB.save.pkmsvvMastery?.[25]>0&&G.DB.save.pkmsvvIncubator?.eggs?.['egg-1']?.kills===500,null,{timeout:12000});
  const progress=await page.evaluate(()=>({mastery:G.DB.save.pkmsvvMastery[25],egg:G.DB.save.pkmsvvIncubator.eggs['egg-1'].kills,state:G.Game.state,rift:Object.values(G.DB.save.pkmsvvIncubator.eggs).find(e=>['rift','rift-baby'].includes(e.from))}));
  assert.ok(progress.rift,'native Rift kill must grant an egg in the result');
  assert.equal(rift.dex,rift.arena);console.log('NATIVE_RIFT_EGG_PASS='+JSON.stringify({rift,reward:progress.rift}));
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
  assert.equal(await eggs.locator('progress').first().getAttribute('value'),'500');
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
  const berryPage=await browser.newPage({viewport:{width:1280,height:800}});
  berryPage.on('pageerror',e=>errors.push(String(e)));
  await berryPage.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;});
  await berryPage.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  await berryPage.waitForFunction(()=>!!G.DB?.save&&!!G.PKMSVVBerryRescue?.BOSS_SPECS,null,{timeout:40000});
  await berryPage.evaluate(async()=>{
   Object.assign(G.DB.save,{partner:25,pkmsvvStorySeen:true,pkmsvvNameChosen:true});
   G.MenuUI.open();await G.Social.createRoom('berry','private');
   for(const dex of [1,7,25])await G.LanBus.request('addBot',{dex});
   G.LobbyUI.open();
  });
  await berryPage.locator('#lobby-start').click();
  await berryPage.waitForFunction(()=>G.Game?.state==='playing'&&G.PKMSVVBerryRescue.active,null,{timeout:25000});
  await berryPage.evaluate(()=>{[...document.querySelectorAll('.pkmsvv-berry-overlay button')].find(x=>/Không dùng Berry|No Berry/.test(x.textContent))?.click();});
  // Accelerated objective boundary fixture: not a full eight-minute soak.
  // Native LAN host, native constructor, real sprite/hitbox and Enemy.hurt.
  const berry=await berryPage.evaluate(()=>{
   const api=G.PKMSVVBerryRescue;
   for(const dex of [446,143])if(!G.DEX_BY[dex]||!G.SPRITE_META[dex]?.a?.Idle||!G.SPRITE_META[dex]?.a?.Walk)throw Error('Missing Berry boss sprite '+dex);
   G.EnemyMgr.clear();
   api.tick(.01,240,[],()=>{});
   const m=G.EnemyMgr.all().find(x=>x._pkmsvvBerryBoss===1);
   if(!m||m.dex!==446)throw Error('Wrong first Berry boss');
   const initial=m.hp;m.hurt(200,'#ffffff',0,0,0);
   const damaged=m.hp<initial;
   api.tick(.01,480,[],()=>{});
   const n=G.EnemyMgr.all().find(x=>x._pkmsvvBerryBoss===2);
   if(!n||n.dex!==143)throw Error('Wrong final Berry boss');
   const remote=G.EnemyMgr.addRemote({id:987654,dex:143,x:240,y:0,boss:true,shiny:false,hp:n.maxHp,dmg:n.dmg,beh:'chase'});
   return {munchlax:{dex:m.dex,hp:m.maxHp,base:m._pkmsvvBerryBaseHp,mult:m._pkmsvvBerryHpMultiplier,spd:m.spd,baseSpd:m._pkmsvvBerryBaseSpeed,damage:damaged},snorlax:{dex:n.dex,hp:n.maxHp,base:n._pkmsvvBerryBaseHp,mult:n._pkmsvvBerryHpMultiplier,scale:n.scale,r:n.r,bodyH:n.bodyH,remoteScale:remote.scale,remoteR:remote.r,remoteHp:remote.maxHp}};
  });
  assert.ok(berry.munchlax.mult>=2&&berry.munchlax.mult<=4);
  assert.equal(berry.munchlax.hp,berry.munchlax.base*berry.munchlax.mult);
  assert.ok(berry.munchlax.damage);
  assert.ok(berry.snorlax.mult>=5&&berry.snorlax.mult<=8);
  assert.equal(berry.snorlax.hp,berry.snorlax.base*berry.snorlax.mult);
  assert.equal(berry.snorlax.scale,3);
  assert.equal(berry.snorlax.remoteScale,3);
  assert.equal(berry.snorlax.remoteR,berry.snorlax.r);
  assert.equal(berry.snorlax.remoteHp,berry.snorlax.hp);
  await berryPage.screenshot({path:path.join(OUT,'berry-native-bosses.png')});
  await berryPage.close();
  console.log('BERRY_BOSSES_NATIVE_PASS='+JSON.stringify(berry));
  fs.writeFileSync(path.join(OUT,'berry-bosses.json'),JSON.stringify(berry,null,2));
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({progress,after,inventory:{defined:inventory.defined,playable:inventory.playable,moveCount:inventory.moveIds.length}},null,2));
  console.log('BIG_UPDATE_NATIVE_PASS='+JSON.stringify({progress,after,defined:inventory.defined,playable:inventory.playable,moves:inventory.moveIds.length}));
 }catch(e){fs.writeFileSync(path.join(OUT,'failure.json'),JSON.stringify({error:String(e),errors},null,2));if(page)await page.screenshot({path:path.join(OUT,'failure.png'),timeout:5000}).catch(()=>{});throw e;}
 finally{try{if(browser)await browser.close();}finally{await server.close();}}
})().catch(e=>{console.error(e);process.exitCode=1;});
