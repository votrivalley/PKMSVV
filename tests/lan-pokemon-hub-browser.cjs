'use strict';
/* Real LAN Beta gameplay HTML/browser smoke, isolated disposable browser profile. */
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const {startServer}=require('../lan-server/server.cjs');
(async()=>{
 const root=path.resolve(__dirname,'../dist/lan');
 const server=await startServer({root,host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const exceptions=[];page.on('pageerror',e=>exceptions.push(String(e)));
 try{
  await page.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;});
  await page.goto('http://127.0.0.1:'+server.port+'/game/',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>!!window.G?.PKMSVVBoxHubUI&&!!G.DB?.save&&!!G.MenuUI?.open,{timeout:40000});
  // Exclude volatile daily missions / timestamps which the native game updates
  // independently of PokéBox. Still fail on any collection/economy mutation.
  const snapshotSave=()=>page.evaluate(()=>{
   const s=G.DB.save,keys=[
    'coins','owned','shiny','partner','partnerShiny','pkmsvvBoxSchema',
    'pkmsvvBox','pkmsvvTeam6','pkmsvvSelectedInstanceId',
    'pkmsvvRankFragments','pkmsvvRankClaimedCopies','pkmsvvReforgePrisms',
    'pupg','globalUpgrades','tms','bag','pkmsvvFossils'
   ];
   return Object.fromEntries(keys.map(key=>[key,JSON.stringify(s?.[key]??null)]));
  });
  await page.evaluate(()=>{
   G.DB.save.partner=25;G.DB.save.partnerShiny=false;
   G.DB.save.pkmsvvStorySeen=true;G.DB.save.pkmsvvNameChosen=true;
   G.MenuUI.open();
  });
  const before=await snapshotSave();
  const modules=await page.evaluate(()=>({
   box:!!G.PKMSVVBox,stage2:!!G.PKMSVVBox2,stage3:!!G.PKMSVVBox3,
   stage4:!!G.PKMSVVBox4,hub:!!G.PKMSVVBoxHub,ui:!!G.PKMSVVBoxHubUI,
   launcher:!!document.querySelector('#scr-menu [data-go="dex"]')
  }));
  assert.ok(Object.values(modules).every(Boolean),'Native Beta lacks PokéBox dependency: '+JSON.stringify(modules));
  await page.evaluate(()=>document.querySelector('#scr-menu [data-go="dex"]').click());
  await page.waitForFunction(()=>!!document.querySelector('#pkmsvv-pokebox-overlay .pkmbx-pc-tabs'),{timeout:12000});
  let result=await page.evaluate(()=>({
   tab:G.PKMSVVBoxHubUI.currentTab(),
   ready6:document.querySelectorAll('#pkmsvv-pokebox-overlay .pkmbx-team-slot').length,
   legacyVisible:(()=>{const el=document.querySelector('#scr-dex');return !!(el&&getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().width>0);})()
  }));
  assert.equal(result.tab,'box','Native menu opened OLD Pokémon screen instead of PokéBox');
  assert.equal(result.ready6,6,'Missing approved six-slot team strip');
  assert.equal(result.legacyVisible,false,'Legacy Dex panel must not be open');
  await page.evaluate(()=>document.querySelector('[data-pc-tab="dex"]').click());
  assert.equal(await page.evaluate(()=>G.PKMSVVBoxHubUI.currentTab()),'dex');
  await page.evaluate(()=>document.querySelector('[data-pc-tab="upgrade"]').click());
  assert.equal(await page.evaluate(()=>G.PKMSVVBoxHubUI.currentTab()),'upgrade');
  const after=await snapshotSave();
  assert.deepEqual(after,before,'Opening/switching Pokémon tabs unexpectedly modified collection or economy save');
  assert.deepEqual(exceptions,[],'Unexpected JS errors in native PokéBox UI');
  console.log('BETA_POKEMON_HUB_BROWSER_PASS='+JSON.stringify(result));
 }finally{
  await browser.close();await server.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
