'use strict';
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const site=await startServer({root:path.resolve('dist/lan'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,executablePath:process.env.PKMSVV_BROWSER||'/usr/bin/google-chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;});
  await page.goto('http://127.0.0.1:'+site.port+'/game/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!G.DB?.save&&!!G.EggRush?.setLocalReward,null,{timeout:40000});
  const room=await page.evaluate(async()=>{
   const s=G.DB.save;Object.assign(s,{partner:25,pkmsvvStorySeen:true,pkmsvvNameChosen:true,pkmsvvChapter7Seen:true,pkmsvvIncubator:{serial:5,active:null,eggs:{'egg-1':{dex:19,kills:500,region:0,from:'region-boss'},'egg-2':{dex:172,kills:0,region:9,from:'baby-egg'},'egg-3':{dex:173,kills:0,region:9,from:'baby-egg'},'egg-4':{dex:174,kills:0,region:9,from:'baby-egg'},'egg-5':{dex:298,kills:0,region:9,from:'baby-egg'}},hatched:{}},pkmsvvSupportBond:{},pkmsvvCoopProgress:{}});
   s.owned={...s.owned,25:{at:1}};delete s.owned[19];s.pkmsvvDefeatedDex={...s.pkmsvvDefeatedDex,19:true};
   s.pkmsvvCoopLab={...s.pkmsvvCoopLab,machineUnlocked:true,coopCoins:1200};
   if(!G.DB.commit(true))throw Error('fixture save');
   G.MenuUI.open();await G.Social.createRoom('eggrush','private');
   for(const dex of [1,7,4])await G.LanBus.request('addBot',{dex});G.LobbyUI.open();
   window.__keep=setInterval(()=>{[...document.querySelectorAll('.pkmsvv-berry-overlay button')].find(x=>/Không dùng Berry|No Berry/.test(x.textContent))?.click();if(G.Game?.player)G.Game.player.invuln=2000;if(G.UI?.isOpen?.('scr-levelup'))G.RunUI.pick(0);},100);
   return G.Social.room.id;
  });
  await page.click('#lobby-start');await page.waitForFunction(()=>G.Game.state==='playing'&&G.EggRush.active,null,{timeout:30000});
  await page.waitForFunction(()=>G.Game.st.time>=61,null,{timeout:100000});
  // Accelerate only objective placement. Do not forge points, rankings,
  // receipt or result. Real claim logic uses the actual owner and native loop.
  await page.evaluate(()=>{
   const pl=G.Game.player,all=G.Coop.players(),api=G.EggRush;
   let spot;for(let y=-500;y<=500&&!spot;y+=35)for(let x=-500;x<=500;x+=35)
    if(G.World.isFree(x,y,24)&&(!G.Arena?.active||G.Arena.validSpawn(x,y,0))){spot={x,y};break;}
   if(!spot)throw Error('No valid objective spot');
   for(const n of api.nests.slice())if(!n.taken)api.onEvent(['er','despawn',n.id]);
   pl.x=spot.x;pl.y=spot.y;
   for(const b of all.filter(p=>p!==pl)){b.x=spot.x+240;b.y=spot.y+240;}
   const remaining=10-api.collected;
   for(let i=0;i<remaining;i++){
    const id=90000+i,ev=['er','spawn',id,spot.x,spot.y];api.onEvent(ev);G.Coop.broadcast(ev);
   }
  });
  await page.waitForFunction(()=>G.Game.state==='over'&&!!G.EggRush.localReward,null,{timeout:20000});
  const result=await page.evaluate(room=>({rank:G.EggRush.localReward.rank,reward:G.EggRush.localReward.awarded,pending:G.EggRush.localReward.pending,bond:G.EggRush.localReward.friendship,eggs:Object.values(G.DB.save.pkmsvvIncubator.eggs),receipt:G.DB.save.pkmsvvCoopProgress[room],outcome:G.EggRush.outcome}),room);
  assert.equal(result.rank,1);assert.equal(result.reward,1);assert.equal(result.pending,1);assert.equal(result.eggs.length,6);assert.equal(result.eggs.filter(e=>e.from==='egg-rush-baby').length,1);assert.equal(result.receipt.serial,1);
  await page.waitForSelector('.pkmsvv-egg-scoring-done',{timeout:12000});
  const labels=await page.locator('.pkmsvv-egg-hatched-label').allTextContents();
  assert.ok(labels.length>0&&labels.every(t=>/^(✨ )?\+(5|10|20|40) (điểm|pts)$/.test(t)),JSON.stringify(labels));
  const out=path.resolve('dist/big-update-progression-qa');fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'egg-rush-prizes.png')});
  // Leave the real result screen and claim without needing a page reload.
  await page.evaluate(async()=>{
   clearInterval(window.__keep);G.Flow.afterRun();
   if(G.Social.room)await G.Social.leaveRoom();G.Flow.goMenu();G.PKMSVVWiki.open();
  });
  await page.locator('[data-research-hotspot="support"]').click();
  await page.locator('[data-support-station-tab="incubator"]').click();
  const panel=page.locator('[data-recruit-egg-panel]'),claim=panel.locator('[data-recruit-prizes]');
  assert.equal(await claim.isDisabled(),true);
  await panel.locator('[data-recruit-egg="egg-1"]').click();
  await page.waitForFunction(()=>G.DB.save.pkmsvvIncubator.hatched['egg-1']===19,null,{timeout:7000});
  assert.equal(await claim.isEnabled(),true);await claim.click();
  await page.waitForFunction(()=>G.PKMSVVBigUpdateQA.prizeCount(G.DB.save.pkmsvvIncubator)===0,null,{timeout:7000});
  assert.equal(await panel.locator('[data-recruit-prizes]').count(),0);
  assert.equal(await page.evaluate(()=>Object.values(G.DB.save.pkmsvvIncubator.eggs).filter(x=>x.from==='egg-rush-baby').length),2);
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-recruit-egg-panel] img')].every(x=>x.complete&&x.naturalWidth>0));
  await page.screenshot({path:path.join(out,'incubator-prize-redeemed.png')});
  await page.locator('#pkmsvv-support-catalog .pkmsvv-support-modal-head button').click();
  await page.locator('[data-research-build]').click();
  await page.locator('[data-build-slot="shelf_left"]').click();
  for(const level of [1,2]){
   const button=page.locator('[data-incubator-level="'+level+'"]');assert.equal(await button.isEnabled(),true);
   await button.click();await page.waitForFunction(level=>G.DB.save.pkmsvvIncubator.level===level+1,level);
  }
  const upgraded=await page.evaluate(()=>({level:G.DB.save.pkmsvvIncubator.level,coins:G.DB.save.pkmsvvCoopLab.coopCoins}));
  assert.deepEqual(upgraded,{level:3,coins:840});
  await page.screenshot({path:path.join(out,'incubator-upgrade-construction.png')});
  await page.locator('#pkmsvv-wiki-overlay .pkmsvv-pc-header button[data-back]').click();
  await page.locator('[data-research-hotspot="support"]').click();
  await page.locator('[data-support-station-tab="incubator"]').click();
  await panel.locator('[data-recruit-egg="egg-2"]').click();await panel.locator('[data-recruit-egg="egg-3"]').click();
  const selected=await page.evaluate(()=>G.PKMSVVBigUpdateQA.activeIds(G.DB.save.pkmsvvIncubator));
  assert.deepEqual(selected,['egg-2','egg-3']);
  await page.setViewportSize({width:844,height:390});await page.screenshot({path:path.join(out,'incubator-upgraded-landscape.png')});
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!G.DB?.save,null,{timeout:40000});
  assert.equal(await page.evaluate(room=>G.DB.save.pkmsvvCoopProgress[room].serial,room),1);
  const persisted=await page.evaluate(()=>({level:G.DB.save.pkmsvvIncubator.level,coins:G.DB.save.pkmsvvCoopLab.coopCoins,pending:G.PKMSVVBigUpdateQA.prizeCount(G.DB.save.pkmsvvIncubator),eggs:Object.keys(G.DB.save.pkmsvvIncubator.eggs).length,active:G.PKMSVVBigUpdateQA.activeIds(G.DB.save.pkmsvvIncubator)}));
  assert.deepEqual(persisted,{level:3,coins:840,pending:0,eggs:6,active:['egg-2','egg-3']});
  fs.writeFileSync(path.join(out,'egg-rush-rank-prizes.json'),JSON.stringify({result,labels,persisted},null,2));console.log('NATIVE_EGG_RUSH_PRIZES_PASS='+JSON.stringify({rank:result.rank,reward:result.reward,pending:result.pending,bond:result.bond,labels,persisted}));
 }finally{await browser.close();await site.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
