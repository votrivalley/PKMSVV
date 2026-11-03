'use strict';
/* Browser regression for screenshot report: real landscape touch scrolling,
 * one compact Pokédex filter dropdown, and correct VI/EN labels and branding.
 */
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
const {startServer}=require('../lan-server/server.cjs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browserRoot=()=>path.resolve(__dirname,
  process.env.PKMSVV_PLATFORM==='android'?'../mobile/www':'../dist/cloudflare');
async function swipe(page){
 const cdp=await page.context().newCDPSession(page);
 const r=await page.locator('#pkmsvv-support-catalog .pkmsvv-support-modal').boundingBox();
 assert.ok(r&&r.height>160,'Support needs a visible, bounded scroll container');
 const x=Math.round(r.x+r.width*.55),start=Math.round(r.y+r.height*.84),end=Math.round(r.y+r.height*.17);
 const point=y=>[{x,y}];
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:point(start)});
 for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',
  {type:'touchMove',touchPoints:point(Math.round(start+(end-start)*i/12))});await sleep(19);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await sleep(230);
}
const scroll=page=>page.evaluate(()=>{
 const p=document.querySelector('#pkmsvv-support-catalog .pkmsvv-support-modal');
 const grid=document.getElementById('pkmsvv-support-entries');
 return {top:p?.scrollTop,max:(p?.scrollHeight||0)-(p?.clientHeight||0),
  overflow:p&&getComputedStyle(p).overflowY,touch:p&&getComputedStyle(p).touchAction,
  nested:grid&&getComputedStyle(grid).overflowY,hidden:document.getElementById('pkmsvv-support-catalog')?.hidden};
});
async function boot(browser,server,language,viewport,mobile=true){
 const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
 await context.addInitScript(lang=>localStorage.setItem('ps.lang',lang),language);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.setDefaultTimeout(26000);
 await page.goto('http://127.0.0.1:'+server.port+'/game/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.G?.DB?.save&&!!window.G?.PKMSVVSupportCatalog?.open);
 await page.evaluate(()=>{
  Object.assign(G.DB.save,{partner:25,starter:25,pkmsvvStorySeen:true,pkmsvvNameChosen:true,
   pkmsvvChapter1Seen:true,pkmsvvChapter2Seen:true});
  G.MenuUI.open();
 });
 return {page,context,errors};
}
async function main(){
 const server=await startServer({root:browserRoot(),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?
   {executablePath:process.env.PKMSVV_BROWSER}:{})});
 try{
  for(const viewport of [{width:844,height:390},{width:390,height:844}]){
   const {page,context,errors}=await boot(browser,server,'vi',viewport);
   try{
    const home=await page.evaluate(()=>({
     language:G.I18n.lang,title:document.querySelector('#scr-menu .menu-left .logo .t1')?.textContent?.trim(),
     tagline:document.querySelector('#scr-menu .pkmsvv-awakening-tagline')?.textContent?.trim(),
     credit:document.querySelector('#scr-menu .pkmsvv-credit')?.textContent?.trim(),
     pcSub:[...document.querySelectorAll('#scr-menu .menu-right .menu-list button.menu-item')]
      .find(b=>b.querySelector('.pkmsvv-menu-label')?.textContent?.trim()==='PC')?.querySelector('small')?.textContent?.trim(),
     stats:document.getElementById('menu-stats')?.textContent
    }));
    assert.equal(home.language,'vi');
    assert.equal(home.title,'Pokémon Chuyển Sinh');
    assert.equal(home.credit,'Việt hóa và Mod điều chỉnh bởi Votri Valley');
    assert.equal(home.pcSub,'Pokémon hỗ trợ · Mega · Berry');
    assert.match(home.tagline,/Tỉnh giấc tôi thấy mình hóa Pokémon/i);
    assert.match(home.stats,/Lượt chơi/);
    assert.match(home.stats,/Kỷ lục sống sót/);
    assert.doesNotMatch(home.stats,/\bRuns\b|\bBest time\b/);
    await page.evaluate(()=>G.PKMSVVSupportCatalog.open());
    const intro=await page.evaluate(()=>({
     name:document.getElementById('pkmsvv-support-heading')?.textContent,
     info:document.getElementById('pkmsvv-support-description')?.textContent,
     close:document.querySelector('.pkmsvv-support-modal-head button')?.textContent
    }));
    assert.match(intro.name,/Pokémon hỗ trợ/);
    assert.match(intro.info,/Khám phá Pokémon hỗ trợ/);
    assert.equal(intro.close,'Đóng');
    const start=await scroll(page);
    assert.equal(start.overflow,'auto');assert.equal(start.touch,'pan-y');
    assert.notEqual(start.nested,'auto','inner list must not steal finger scrolling');
    if(start.max>100){
     await swipe(page);const afterSwipe=await scroll(page);
     assert.ok(afterSwipe.top>55,'Support actual mobile swipe must scroll: '+JSON.stringify({viewport,start,afterSwipe}));
     await page.evaluate(()=>{
      const el=document.querySelector('#pkmsvv-support-entries .pkmsvv-support-cell:last-child');
      el?.click();
     });
     const afterSelection=await scroll(page);
     assert.ok(afterSelection.top>=afterSwipe.top-50,
      'Selecting Support Pokémon must not reset scroll: '+JSON.stringify({afterSwipe,afterSelection}));
     await sleep(400);
     assert.ok((await scroll(page)).top>=afterSelection.top-45,'Support modal must not auto-scroll upward');
    }
    await page.evaluate(()=>{G.PKMSVVSupportCatalog.close();G.MenuUI.open();});
    // The shipping game deliberately blocks portrait navigation with its
    // rotate-device notice. Disable only that gate in this browser QA to
    // inspect the underlying responsive menu; landscape remains untouched.
    if(viewport.height>viewport.width)await page.addStyleTag({content:'#rotate{display:none!important}'});
    await page.locator('#scr-menu [data-go="dex"]').first().click();
    const dex=await page.evaluate(()=>({
     q:!!document.getElementById('dex-q'),
     fav:!!document.getElementById('pkmsvv-dex-fav'),
     sort:document.getElementById('pkmsvv-dex-sort-toggle')?.textContent,
     popHidden:document.getElementById('pkmsvv-dex-sort-menu')?.hidden,
     gensInside:document.getElementById('pkmsvv-dex-sort-menu')?.contains(document.getElementById('dex-gens')),
     genCount:document.querySelectorAll('#dex-gens .gen-tab').length,
     externalType:!!document.querySelector('.pkmsvv-dex-tools #dex-type')
    }));
    assert.equal(dex.q,true);assert.equal(dex.fav,true);
    assert.match(dex.sort,/Sắp xếp/);
    assert.equal(dex.popHidden,true);assert.equal(dex.gensInside,true);
    assert.equal(dex.genCount,10);assert.equal(dex.externalType,false);
    await page.locator('#pkmsvv-dex-sort-toggle').click();
    assert.equal(await page.locator('#pkmsvv-dex-sort-menu').isVisible(),true);
    assert.match(await page.locator('#pkmsvv-dex-status-label').textContent(),/Theo loại Pokémon/);
    await page.locator('#pkmsvv-dex-sort-close').click();
    assert.equal(await page.locator('#pkmsvv-dex-sort-menu').isVisible(),false,'Sort sheet must close without tapping through its own overlay');
    await page.evaluate(()=>{G.MenuUI.open();window.PKMSVVCoop?.open('berry');});
    await page.locator('#pkmsvv-unified-coop').waitFor({state:'visible'});
    assert.match(await page.locator('#pkmsvv-unified-coop').innerText(),/Chọn chế độ/);
    assert.doesNotMatch(await page.locator('#pkmsvv-unified-coop').innerText(),/Choose mode|Survival Royale/);
    assert.deepEqual(errors,[],'No uncaught browser errors: '+JSON.stringify({viewport,errors}));
    console.log('PASS VI mobile '+viewport.width+'x'+viewport.height+' Support, Dex and Co-op');
   }finally{await context.close();}
  }
  // The PC desktop modal used to have a second 58vh scrollbar on the card
  // grid, cutting cards and trapping the mouse wheel. Test an ordinary mouse
  // viewport, not only emulated touch devices.
  {
   const viewport={width:1280,height:620};
   const {page,context,errors}=await boot(browser,server,'vi',viewport,false);
   try{
    await page.evaluate(()=>G.PKMSVVSupportCatalog.open());
    const start=await scroll(page);
    assert.equal(start.overflow,'auto','PC modal must be the only scroll container');
    assert.equal(start.nested,'visible','PC grid must not scroll or clip independently');
    assert.ok(start.max>30,'PC modal should scroll in 1280x620: '+JSON.stringify(start));
    const cards=page.locator('#pkmsvv-support-entries .pkmsvv-support-cell');
    assert.ok(await cards.count()>=6,'PC support cards must be populated');
    const grid=await page.locator('#pkmsvv-support-entries').boundingBox();
    await page.mouse.move(grid.x+Math.min(80,grid.width*.3),grid.y+Math.min(60,grid.height*.2));
    await page.mouse.wheel(0,500);await sleep(230);
    const wheel=await scroll(page);
    assert.ok(wheel.top>30,'PC wheel must move the outer modal: '+JSON.stringify({start,wheel}));
    await page.evaluate(()=>document.querySelector('#pkmsvv-support-entries .pkmsvv-support-cell:last-child')?.click());
    const chosen=await scroll(page);
    assert.ok(chosen.top>=wheel.top-3,'PC choosing a Support Pokémon must preserve wheel position');
    await page.evaluate(()=>{const p=document.querySelector('.pkmsvv-support-modal');p.scrollTop=p.scrollHeight;});
    const fullyVisible=await page.evaluate(()=>{
     const p=document.querySelector('.pkmsvv-support-modal'),card=document.querySelector('#pkmsvv-support-entries .pkmsvv-support-cell:last-child');
     const a=p.getBoundingClientRect(),b=card.getBoundingClientRect();
     return b.bottom<=a.bottom+3&&b.top>=a.top-3;
    });
    assert.equal(fullyVisible,true,'Last PC Support card must not be cut off');
    assert.deepEqual(errors,[],'PC browser errors: '+JSON.stringify(errors));
    console.log('PASS PC 1280x620 one-scroll Support modal, mouse wheel, card selection');
   }finally{await context.close();}
  }
  const {page,context,errors}=await boot(browser,server,'en',{width:844,height:390});
  try{
   const home=await page.evaluate(()=>({
    language:G.I18n.lang,title:document.querySelector('#scr-menu .menu-left .logo .t1')?.textContent?.trim(),
    tagline:document.querySelector('#scr-menu .pkmsvv-awakening-tagline')?.textContent?.trim(),
    credit:document.querySelector('#scr-menu .pkmsvv-credit')?.textContent?.trim(),
     pcSub:[...document.querySelectorAll('#scr-menu .menu-right .menu-list button.menu-item')]
      .find(b=>b.querySelector('.pkmsvv-menu-label')?.textContent?.trim()==='PC')?.querySelector('small')?.textContent?.trim(),
     stats:document.getElementById('menu-stats')?.textContent
   }));
   assert.equal(home.language,'en');
   assert.equal(home.title,'Pokémon Chuyển Sinh','English must NOT rename the game');
   assert.equal(home.credit,'Localized and modified by Votri Valley');
   assert.equal(home.pcSub,'Support Pokémon · Mega · Berries');
   assert.equal(home.tagline,'I woke up as a Pokémon');
   assert.match(home.stats,/Runs/);
   await page.evaluate(()=>G.PKMSVVSupportCatalog.open());
   assert.equal(await page.locator('#pkmsvv-support-description').textContent(),
    'Discover companions by hatching eggs. Undiscovered Pokémon stay silhouetted; Normal / Shiny is available only after discovering a Shiny.');
   assert.deepEqual(errors,[]);
   console.log('PASS EN preserves Vietnamese game identity, English subtitles and Support labels');
  }finally{await context.close();}
 }finally{await browser.close();await server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
