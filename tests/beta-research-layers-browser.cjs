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
  // Real approved V3 art is the default in this isolated QA build.
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await wait();await open();
  const verifyV3=async(selector)=>{
   await page.waitForFunction(s=>{const e=document.querySelector(s);return e?.dataset.researchArtMode==='approved-v3'&&e.querySelectorAll('.pkmsvv-lab-v3-layer').length===6&&[...e.querySelectorAll('.pkmsvv-lab-v3-layer')].every(i=>i.complete&&i.naturalWidth>0);},selector,{timeout:20000});
   const v=await page.locator(selector).evaluate(e=>({layers:[...e.querySelectorAll('.pkmsvv-lab-v3-layer')].map(i=>i.dataset.labLayer).sort(),oldProps:e.querySelectorAll('.pkmsvv-lab-station-prop').length,background:getComputedStyle(e).backgroundImage,ratio:e.clientWidth/e.clientHeight}));
   assert.deepEqual(v.layers,['berry','companion','crest','fossil','mega','support']);
   assert.equal(v.oldProps,0);assert.match(v.background,/research-v3\/backdrop\.png/);assert.ok(Math.abs(v.ratio-1500/1049)<.04);
   return v;
  };
  const v3=await verifyV3('.pkmsvv-research-room');
  const labels=await page.locator('.pkmsvv-research-room [data-research-hotspot]').evaluateAll(es=>es.map(b=>({id:b.dataset.researchHotspot,label:b.querySelector('.pkmsvv-research-hotspot-tag')?.textContent,oldIcon:[...b.querySelectorAll('.pkmsvv-research-scene-object')].some(x=>getComputedStyle(x).display!=='none')})));
  assert.equal(labels.length,5);assert.ok(labels.every(x=>x.label&&!x.oldIcon));
  await page.locator('.pkmsvv-research-room').screenshot({path:path.join(out,'research-v3-desktop.png')});
  const v3Save=await page.evaluate(()=>JSON.stringify(G.DB.save.pkmsvvCoopLab??null));
  await page.evaluate(()=>document.querySelector('[data-research-build]').click());
  await verifyV3('.pkmsvv-build-stage');
  assert.ok(await page.locator('.pkmsvv-build-stage').count());
  assert.equal(await page.locator('[data-build-equip]:not(:disabled)').count(),0);
  assert.equal(await page.evaluate(()=>JSON.stringify(G.DB.save.pkmsvvCoopLab??null)),v3Save);
  await page.locator('.pkmsvv-build-stage').screenshot({path:path.join(out,'research-v3-construction.png')});
  assert.equal(await page.locator('[data-build-slot]').count(),5);
  const skinSelections=[];
  for(const [slot,station] of [['center','fossil'],['shelf_left','support'],['shelf_right','mega'],['garden','berry'],['trophy','companion']]){
   await page.locator('[data-build-slot="'+slot+'"]').click();
   await page.locator('[data-build-preview="copper"]').click();
   await page.waitForFunction(id=>document.querySelector('.pkmsvv-build-stage [data-lab-layer="'+id+'"]')?.dataset.labSkin==='copper',station);
   skinSelections.push(station);
   const actual=await page.locator('.pkmsvv-build-stage [data-lab-skin="copper"]').evaluateAll(es=>es.map(x=>x.dataset.labLayer).sort());
   assert.deepEqual(actual,[...skinSelections].sort());
   assert.equal(await page.evaluate(()=>JSON.stringify(G.DB.save.pkmsvvCoopLab??null)),v3Save);
  }
  await page.locator('.pkmsvv-build-stage').screenshot({path:path.join(out,'research-v3-copper-preview.png')});
  await page.locator('[data-build-preview-reset]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.pkmsvv-build-stage [data-lab-skin="default"]').length===6);
  assert.equal(await page.evaluate(()=>JSON.stringify(G.DB.save.pkmsvvCoopLab??null)),v3Save);
  await page.locator('.pkmsvv-build-panel [data-back]').click();await verifyV3('.pkmsvv-research-room');
  assert.equal(await page.locator('.pkmsvv-research-room [data-lab-skin="copper"]').count(),0);
  await page.locator('[data-research-build]').click();await verifyV3('.pkmsvv-build-stage');
  assert.equal(await page.locator('.pkmsvv-build-stage [data-lab-skin="copper"]').count(),0);
  const landscape=[];
  for(const [width,height] of [[844,390],[667,375],[640,360]]){
   await page.setViewportSize({width,height});await open();await verifyV3('.pkmsvv-research-room');
   const geometry=await page.locator('.pkmsvv-research-room').evaluate(e=>{
    const r=e.getBoundingClientRect(),panel=e.closest('.pkmsvv-research-panel'),p=panel.getBoundingClientRect(),header=panel.querySelector('.pkmsvv-pc-header').getBoundingClientRect();
    const bound=b=>({left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height});
    const hotspots=[...e.querySelectorAll('[data-research-hotspot]')].map(b=>{
     const t=b.getBoundingClientRect(),label=b.querySelector('.pkmsvv-research-hotspot-tag').getBoundingClientRect();
     const at=document.elementFromPoint(t.left+t.width/2,t.top+t.height/2);
     return {id:b.dataset.researchHotspot,rect:bound(t),label:bound(label),hit:at?.closest('[data-research-hotspot]')===b};
    });
    return {room:bound(r),panel:bound(p),header:bound(header),scrollTop:panel.scrollTop,hotspots};
   });
   assert.equal(geometry.scrollTop,0,'Research must open at the top');
   assert.ok(geometry.room.top>=geometry.header.bottom-1,'Header covers room');
   assert.ok(geometry.room.left>=0&&geometry.room.right<=width+1&&geometry.room.bottom<=Math.min(height,geometry.panel.bottom)+1,'Room outside first viewport '+JSON.stringify(geometry));
   assert.equal(geometry.hotspots.length,5);
   for(const h of geometry.hotspots){
    assert.ok(h.hit&&h.rect.width>=44&&h.rect.height>=44,'Station not tappable '+JSON.stringify(h));
    assert.ok(h.label.top>=geometry.room.top&&h.label.bottom<=geometry.room.bottom+1&&h.label.left>=geometry.room.left-1&&h.label.right<=geometry.room.right+1,'Station label clipped '+JSON.stringify(h));
   }
   landscape.push({width,height,...geometry});
   await page.screenshot({path:path.join(out,width===844?'research-v3-mobile.png':'research-v3-mobile-'+width+'.png')});
  }
  await page.setViewportSize({width:1280,height:920});
  // Keep the earlier nine-layer prototype available for explicit comparison.
  await page.goto(url+'?pkmsvvLabLayers=1',{waitUntil:'domcontentloaded',timeout:45000});await wait();await open();
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
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'PASS',v3,labels,landscape,room,errors},null,2));
  console.log('PKMSVV_RESEARCH_LAYERS_BROWSER_PASS',JSON.stringify(room));
 }catch(e){
  const state=await page.evaluate(()=>({economy:!!window.G?.PKMSVVCoopEconomy,artRegistry:!!window.PKMSVV_RESEARCH_ART_QA,mode:document.querySelector('.pkmsvv-research-room,.pkmsvv-build-stage')?.dataset.researchArtMode,images:[...document.querySelectorAll('.pkmsvv-lab-source-layer,.pkmsvv-lab-station-prop')].map(i=>({src:i.src,complete:i.complete,width:i.naturalWidth}))})).catch(()=>null);
  fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:String(e),state,errors,failedAssets},null,2));
  await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});
  throw e;
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
