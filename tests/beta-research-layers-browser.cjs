'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {startServer}=require('../lan-server/server.cjs');
(async()=>{
 const root=path.resolve(__dirname,'../dist/lan'),out=path.resolve(__dirname,'../dist/research-browser-qa');
 fs.mkdirSync(out,{recursive:true});
 const server=await startServer({root,host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 const page=await browser.newPage({viewport:{width:1280,height:920}});
 const errors=[],failedAssets=[];page.on('pageerror',e=>errors.push(String(e)));
 page.on('response',r=>{if(r.status()>=400&&r.url().includes('/coop-lab/'))failedAssets.push({url:r.url(),status:r.status()});});
 const url='http://127.0.0.1:'+server.port+'/game/';
 const wait=async()=>page.waitForFunction(()=>!!window.G?.DB?.save&&!!G.MenuUI?.open);
 const open=async()=>page.evaluate(()=>{
  G.DB.save.partner=25;G.DB.save.pkmsvvStorySeen=true;G.DB.save.pkmsvvNameChosen=true;
  G.MenuUI.open();document.querySelector('#pkmsvv-menu-wiki').click();
 });
 const verify=async(selector)=>{
  const stage=page.locator(selector);
  await stage.waitFor();
  await page.waitForFunction(s=>{const e=document.querySelector(s);return e?.dataset.researchArtMode==='modular'&&[...e.querySelectorAll('.pkmsvv-lab-source-layer,.pkmsvv-lab-station-prop')].every(i=>i.complete&&i.naturalWidth>0);},selector,{timeout:15000});
  const data=await stage.evaluate(e=>({
   layers:e.querySelectorAll('.pkmsvv-lab-source-layer').length,
   props:[...e.querySelectorAll('.pkmsvv-lab-station-prop')].map(i=>({id:i.dataset.labProp,w:i.getBoundingClientRect().width,ratio:i.getBoundingClientRect().width/e.getBoundingClientRect().width,visible:getComputedStyle(i).display!=='none'})),
   background:getComputedStyle(e).backgroundImage
  }));
  assert.equal(data.layers,9);
  assert.deepEqual(data.props.map(p=>p.id),['support','mega','berry','companion','fossil']);
  assert.ok(data.props.every(p=>p.ratio>=.09&&p.visible));
  assert.match(data.background,/clean-backdrop\.png/);
  return data;
 };
 try{
  await page.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;});
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await wait();await open();
  const room=await verify('.pkmsvv-research-room');
  assert.equal(await page.locator('.pkmsvv-research-hotspot').count(),5);
  const save=()=>page.evaluate(()=>JSON.stringify(G.DB.save.pkmsvvCoopLab??null));
  const before=await save();
  await page.locator('.pkmsvv-research-room').screenshot({path:path.join(out,'research-room-desktop.png')});
  await page.evaluate(()=>document.querySelector('[data-research-build]').click());
  await verify('.pkmsvv-build-stage');
  await page.locator('.pkmsvv-build-stage').screenshot({path:path.join(out,'research-build-mode.png')});
  assert.equal(await save(),before,'Viewing construction modified economy save');
  await page.setViewportSize({width:844,height:390});await open();
  await verify('.pkmsvv-research-room');
  await page.locator('.pkmsvv-research-room').screenshot({path:path.join(out,'research-room-mobile.png')});
  await page.goto(url+'?pkmsvvLabLayers=0',{waitUntil:'domcontentloaded'});await wait();await open();
  assert.equal(await page.locator('.pkmsvv-research-room').getAttribute('data-research-art-mode'),'classic');
  assert.equal(await page.locator('.pkmsvv-lab-source-layer').count(),0);
  await page.locator('.pkmsvv-research-room').screenshot({path:path.join(out,'research-original-fallback.png')});
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'PASS',room,errors},null,2));
  console.log('PKMSVV_RESEARCH_LAYERS_BROWSER_PASS',JSON.stringify(room));
 }catch(e){
  const state=await page.evaluate(()=>({economy:!!window.G?.PKMSVVCoopEconomy,artRegistry:!!window.PKMSVV_RESEARCH_ART_QA,mode:document.querySelector('.pkmsvv-research-room,.pkmsvv-build-stage')?.dataset.researchArtMode,images:[...document.querySelectorAll('.pkmsvv-lab-source-layer,.pkmsvv-lab-station-prop')].map(i=>({src:i.src,complete:i.complete,width:i.naturalWidth}))})).catch(()=>null);
  fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:String(e),state,errors,failedAssets},null,2));
  await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});
  throw e;
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
