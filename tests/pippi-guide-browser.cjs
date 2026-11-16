'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
const {startServer}=require('../lan-server/server.cjs');
async function main(){
 const root=path.resolve('dist/cloudflare-v20-release');
 const server=await startServer({root,host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,
  ...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1120,height:750}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:'+server.port+'/ai/game/');
   await page.waitForFunction(()=>!!window.G?.PKMSVVPippiGuide&&!!G.DB?.save,{timeout:45000});
   const balance=await page.evaluate(()=>({
    legend:G.Gacha?.RATES?.find(x=>x[0]===5)?.[1],
    pity:G.Gacha?.PITY_5,shiny:G.Gacha?.SHINY_RATE,
    wild:G.Spawner?.SHINY_RATE??null,
    supportShiny:G.PKMSVVEggs?.SHINY_CHANCE
   }));
   assert.equal(balance.legend,.5,'pinned Web Gacha must have 0.5% Legend');
   assert.equal(balance.pity,150,'pinned Web Gacha hard pity must increase to 150');
   assert.ok(Math.abs(balance.shiny-.0045)<1e-12,'pinned Web Gacha Shiny must be 0.45%');
   assert.equal(balance.supportShiny,.015,'Shiny support eggs must be 1.5%');
   console.log('PIPPI_RARITY_QA='+JSON.stringify(balance));
   const opened=await page.evaluate(()=>{
    const s=G.DB.save;
    s.partner=s.partner||25;s.starter=s.starter||25;
    delete s.pkmsvvPippiGuide;
    G.Game.state='ui';
    return G.PKMSVVPippiGuide.open('starter');
   });
   assert.equal(opened,true);
   const modal=page.locator('#pkmsvv-pippi-guide');
   await modal.waitFor({state:'visible'});
   assert.equal(await modal.locator('.pkmsvv-pippi-guide-count').textContent(),'1 / 4');
   const face=await modal.locator('.pkmsvv-pippi-guide-face').evaluate(el=>({
    image:getComputedStyle(el).backgroundImage,render:getComputedStyle(el).imageRendering
   }));
   assert.match(face.image,/atlas\.png/);
   assert.equal(face.render,'pixelated');
   await page.waitForTimeout(1500);
   assert.equal(await modal.count(),1,'guide must never disappear on a timer');
   for(let i=1;i<=3;i++){
    await modal.locator('.pkmsvv-pippi-guide-next').click();
    assert.equal(await modal.locator('.pkmsvv-pippi-guide-count').textContent(),(i+1)+' / 4');
   }
   assert.equal(await page.evaluate(()=>G.DB.save.pkmsvvPippiGuide?.starter),undefined);
   await modal.locator('.pkmsvv-pippi-guide-next').click();
   await modal.waitFor({state:'detached'});
   assert.equal(await page.evaluate(()=>G.DB.save.pkmsvvPippiGuide?.starter),true);
   assert.deepEqual(errors,[],'no script errors while guiding the new trainer');
   console.log('PIPPI_RPG_GUIDE_BROWSER_PASS: original atlas, 4 explicit Next clicks, saved only after last page');
  }finally{await context.close();}
 }finally{await browser.close();await server.close();}
}
if(require.main===module)main().catch(err=>{console.error(err);process.exitCode=1;});
module.exports={main};
