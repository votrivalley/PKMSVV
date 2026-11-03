'use strict';
/* Reproduce the reported Web MOBILE bug with actual CDP finger gestures.
 * Testing only element.scrollTop (as the old fake DOM tests did) cannot find
 * a touch-action/viewport scroll reset on Chrome Android.
 */
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const {startServer}=require('../lan-server/server.cjs');
const nap=ms=>new Promise(done=>setTimeout(done,ms));

async function swipe(page,cdp){
 const bounds=await page.locator('#pkmsvv-mega-phase1 .pkmsvv-mega-phase1-dialog').boundingBox();
 assert.ok(bounds&&bounds.height>190,'Mega scroll panel must be visible');
 const x=Math.round(bounds.x+bounds.width*.77);
 const start=Math.round(bounds.y+bounds.height*.82);
 const end=Math.round(bounds.y+bounds.height*.22);
 const point=y=>[{x,y}];
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:point(start)});
 for(let i=1;i<=12;i++){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:point(Math.round(start+(end-start)*i/12))});
  await nap(18);
 }
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await nap(220);
}
const state=page=>page.evaluate(()=>{
 const root=document.querySelector('#pkmsvv-mega-phase1');
 const p=root?.querySelector('.pkmsvv-mega-phase1-dialog');
 const computed=p?getComputedStyle(p):null;
 return {url:location.pathname,visible:!!root&&!root.hidden,scroll:p?.scrollTop,
  scrollHeight:p?.scrollHeight,clientHeight:p?.clientHeight,
  overflow:computed?.overflowY,touchAction:computed?.touchAction,
  rootTouchAction:root?getComputedStyle(root).touchAction:null,
  height:Math.round(root?.getBoundingClientRect().height||0),
  bodyScroll:document.scrollingElement?.scrollTop||0,active:document.activeElement?.id};
});
async function run(browser,server,dim){
 const context=await browser.newContext({viewport:dim,isMobile:true,hasTouch:true,
  deviceScaleFactor:2});
 const page=await context.newPage(),errors=[];
 page.setDefaultTimeout(23000);
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:'+server.port+'/game/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.G?.DB?.save&&!!G.PKMSVVMegaEntry?.open);
  const opened=await page.evaluate(()=>{
   // Disposable CI account only: never alter a player's save.
   G.DB.save.partner=25;
   G.DB.save.pkmsvvStorySeen=true;
   G.DB.save.pkmsvvNameChosen=true;
   G.MenuUI?.open?.();
   return G.PKMSVVMegaEntry.open();
  });
  assert.equal(opened,true,'Mega encyclopedia opens on mobile Web');
  await page.locator('#pkmsvv-mega-phase1 .pkmsvv-mega-phase1-dialog').waitFor({state:'visible'});
  const before=await state(page);
  assert.ok(before.scrollHeight>before.clientHeight+90,
   'Mobile Mega must have genuinely scrollable cards: '+JSON.stringify(before));
  assert.equal(before.overflow,'auto','Mega dialog owns the only vertical scroll');
  assert.equal(before.touchAction,'pan-y','native vertical finger swipe must be enabled');
  assert.equal(before.rootTouchAction,'pan-y','overlay must not cancel native touch scrolling');
  const cdp=await context.newCDPSession(page);
  for(let attempt=0;attempt<3;attempt++)await swipe(page,cdp);
  const scrolled=await state(page);
  assert.ok(scrolled.scroll>75,
   'Real finger swipes must advance the Mega list, not rubber-band to top: '+JSON.stringify(scrolled));
  await nap(3500); // catch periodic focus, game refresh and viewport reflow
  const after=await state(page);
  assert.ok(after.visible,'Mega dialog must remain open');
  assert.ok(after.scroll>=scrolled.scroll-55,
   'Mega scrolled BACK UP without user gesture: '+JSON.stringify({before,scrolled,after}));
  assert.equal(after.bodyScroll,before.bodyScroll,
   'The underlying Web page must not scroll while Mega is open');
  assert.deepEqual(errors,[],'No browser JS exceptions during Mega touch interaction');
  console.log('PASS Mobile Web Mega native swipe '+dim.width+'x'+dim.height+
   ': '+JSON.stringify({scroll:after.scroll,root:after.height,touch:after.touchAction}));
 }finally{await context.close();}
}
(async()=>{
 const server=await startServer({root:path.resolve(__dirname,'../dist/cloudflare'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?
  {executablePath:process.env.PKMSVV_BROWSER}:{})});
 try{
  await run(browser,server,{width:390,height:844}); // Android portrait
  await run(browser,server,{width:844,height:390}); // Android landscape
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
