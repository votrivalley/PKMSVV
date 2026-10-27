'use strict';
/* Regression for the Android first-run path:
 * Skip prologue -> enter name -> Skip -> ALWAYS choose starter.
 * Direct Skip quiz must also show starter grid; choosing persists the Pokémon.
 */
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const {startServer}=require('../lan-server/server.cjs');
async function main(){
 const platform=process.env.PKMSVV_PLATFORM||'lan';
 assert.ok(['lan','cloudflare','android'].includes(platform),'Unsupported platform for starter QA');
 const root=path.resolve(platform==='android'?'mobile/www':platform==='cloudflare'?'dist/cloudflare':'dist/lan');
 const server=await startServer({root,host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 try{
  for(const testcase of ['skip-story-after-name','skip-quiz','complete-quiz']){
   const context=await browser.newContext({viewport:platform==='android'?{width:844,height:390}:{width:1080,height:780}});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto('http://127.0.0.1:'+server.port+(platform==='android'?'/':'/game/'));
    await page.waitForFunction(()=>!!window.G?.DB?.save&&!!G.PKMSVVStory?.prologue&&!!G.TestUI?.start);
    await page.evaluate(tc=>{
     // Disposable CI browser profile: simulate a genuine first installation or
     // an old save with no starter. Do not touch an actual player save.
     G.DB.save.partner=null;G.DB.save.starter=null;
     G.DB.save.pkmsvvStorySeen=tc!=='skip-story-after-name';
     G.DB.save.pkmsvvNameChosen=tc!=='skip-story-after-name';
     G.DB.commit(true);G.Flow.afterLogin();
    },testcase);
    if(testcase==='skip-story-after-name'){
     await page.locator('#scr-pkmsvv-story').waitFor({state:'visible'});
     await page.locator('#pkmsvv-story-skip').click();
     await page.locator('#pkmsvv-story-name-form').waitFor({state:'visible'});
     await page.locator('#pkmsvv-story-name-input').fill('Trainer_24');
     await page.locator('#pkmsvv-story-name-save').click();
     await page.waitForFunction(()=>G.DB.save.pkmsvvNameChosen===true);
     await page.locator('#pkmsvv-story-skip').click();
     await page.waitForFunction(()=>G.UI.isOpen('scr-starters'));
     assert.equal(await page.evaluate(()=>G.DB.save.partner),null,'skipping cannot silently pick a starter');
    }else{
     await page.waitForFunction(()=>G.UI.isOpen('scr-test'));
     if(testcase==='skip-quiz'){
      await page.locator('#test-skip-starter').click();
      await page.waitForFunction(()=>G.UI.isOpen('scr-starters'));
      // Back must return to questionnaire, not a result screen.
      await page.locator('#starter-back').click();
      await page.waitForFunction(()=>G.UI.isOpen('scr-test'));
      await page.locator('#test-skip-starter').click();
     }else{
      // Complete all actual questions: preserve the existing personality path.
      const questions=await page.evaluate(()=>G.PERSONALITY_TEST.length);
      for(let i=0;i<questions;i++)await page.locator('#test-a .answer').first().click();
      await page.waitForFunction(()=>G.UI.isOpen('scr-result'));
      await page.locator('#res-other').click();
     }
    }
    await page.waitForFunction(()=>G.UI.isOpen('scr-starters'));
    // Shared regression: a hidden menu must never cover the mandatory starter grid.
    const menuIsNonBlocking=await page.evaluate(()=>{
     const menu=document.querySelector('#scr-menu');
     if(!menu)return false;
     const style=getComputedStyle(menu);
     return menu.classList.contains('hidden')&&(style.display==='none'||style.pointerEvents==='none');
    });
    assert.equal(menuIsNonBlocking,true,'hidden main menu must not intercept starter taps on '+platform);
    const total=await page.locator('#starter-grid .cell').count();
    assert.ok(total>=3,'starter grid must be populated: '+total);
    await page.locator('#starter-grid .cell').first().click();
    assert.equal(await page.locator('#starter-ok').isEnabled(),true);
    const chosen=await page.evaluate(()=>G.STARTERS[0].dex);
    await page.locator('#starter-ok').click();
    await page.waitForFunction(id=>G.DB.save.partner===id&&G.DB.save.starter===id,chosen);
    assert.equal(await page.evaluate(()=>G.DB.owns(G.DB.save.partner)),true,'starter added to collection');
    // Reveal can be skipped, but not starter selection.
    await page.waitForFunction(()=>G.UI.isOpen('scr-pkmsvv-story'));
    await page.locator('#pkmsvv-story-skip').click();
    await page.waitForFunction(()=>G.UI.isOpen('scr-menu'));
    // Regression on the real HOME profile, not just the Pokédex detail card:
    // one square sprite canvas, no second teal rounded wrapper around it.
    const portrait=await page.evaluate(()=>{
     const art=document.querySelector('#scr-menu .pkmsvv-v15-art');
     const canvas=art?.querySelector('#menu-partner');
     const info=art?.closest('.pkmsvv-v15-partner');
     if(!art||!canvas||!info)return null;
     const outer=getComputedStyle(art),inner=getComputedStyle(canvas);
     const box=canvas.getBoundingClientRect();
     return {width:canvas.width,height:canvas.height,ratio:box.width/box.height,
      outerBorder:outer.borderTopWidth,outerShadow:outer.boxShadow,
      outerBg:outer.backgroundImage,innerBorder:inner.borderTopWidth,
      innerRadius:inner.borderTopLeftRadius,infoBorder:getComputedStyle(info).borderTopWidth};
    });
    assert.ok(portrait,'home Pokémon portrait exists on '+platform);
    assert.equal(portrait.width,220);
    assert.equal(portrait.height,220);
    assert.ok(Math.abs(portrait.ratio-1)<0.02,'home Pokémon art must be square: '+JSON.stringify(portrait));
    assert.equal(portrait.outerBorder,'0px','home art outer outline must be removed');
    assert.equal(portrait.outerShadow,'none','home art must not cast a duplicate frame');
    assert.equal(portrait.outerBg,'none','home art wrapper must be transparent');
    assert.equal(portrait.innerBorder,'2px','one inner border remains on Pokémon canvas');
    assert.equal(portrait.innerRadius,'4px','inner frame has only subtle corners');
    assert.equal(portrait.infoBorder,'3px','the surrounding information card stays intact');
    assert.deepEqual(errors,[],'uncaught errors in '+testcase);
    console.log('PASS '+platform+' '+testcase+': starter #'+chosen+' chosen and saved');
   }finally{await context.close();}
  }
 }finally{await browser.close();await server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
