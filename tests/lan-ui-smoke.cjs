'use strict';
// Run after prepare:lan. Two independent browser contexts use real HTTP/WS.
const {chromium}=require('playwright');
const {startServer}=require('../lan-server/server.cjs');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
async function ready(page,url){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);
 await page.waitForFunction(()=>window.G?.DB?.save,{timeout:30000});
 assert.equal(await page.evaluate(()=>window.PKMSVV_LOCAL_UI_MODE),'lan','compiled build must retain the LAN marker');
 await page.evaluate(()=>{
  Object.assign(G.DB.save,{partner:25,starter:25,pkmsvvStorySeen:true,pkmsvvNameChosen:true,
   pkmsvvChapter1Pending:false,pkmsvvChapter2Pending:false,pkmsvvChapter3Pending:false});
  G.DB.commit();G.MenuUI.open();
 });
 return errors;
}
async function run(){
 const server=await startServer({root:path.resolve('dist/lan'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 const base='http://127.0.0.1:'+server.port;
 const output=path.resolve('dist/qa');fs.mkdirSync(output,{recursive:true});
 try{
  for(const mode of ['coop','royale','eggrush']){
   const hostContext=await browser.newContext({viewport:{width:1280,height:800}});
   const guestContext=await browser.newContext({viewport:{width:1280,height:800}});
   const host=await hostContext.newPage(),guest=await guestContext.newPage();
   const extraContexts=[];
   try{
    const [hostErrors,guestErrors]=await Promise.all([ready(host,base+'/game/'),ready(guest,base+'/game/')]);
    await host.click('#scr-menu [data-go="multiplayer"]');
    await host.click('[data-mode="'+mode+'"]');
    await host.waitForFunction(()=>[...document.querySelectorAll('#pkmsvv-coop-modes canvas')].every(cv=>{
     const p=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
     let n=0;for(let i=3;i<p.length;i+=4)if(p[i])n++;return n>500;
    }));
    if(mode==='coop'){
     const fps=await host.evaluate(async()=>{
      const tick=G.UI.tick;let frames=0;
      G.UI.tick=function(...args){frames++;return tick.apply(this,args);};
      await new Promise(r=>setTimeout(r,1200));G.UI.tick=tick;return frames/1.2;
     });
     assert.ok(fps>5&&fps<=35,'idle menu render rate: '+fps);
     console.log('PASS idle menu bounded at '+fps.toFixed(1)+' frames/s');
     await host.screenshot({path:path.join(output,'coop-pc.png')});
     await host.setViewportSize({width:390,height:844});await host.screenshot({path:path.join(output,'coop-phone.png')});
     assert.equal(await host.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
     await host.setViewportSize({width:844,height:390});await host.screenshot({path:path.join(output,'coop-landscape.png')});
     await host.setViewportSize({width:1280,height:800});
    }
    await host.click('[data-role="host"]');
    await host.waitForFunction(()=>G.Social.room?.isHost&&G.UI.isOpen('scr-lobby'));
    await guest.click('#scr-menu [data-go="multiplayer"]');await guest.click('[data-mode="'+mode+'"]');
    await guest.click('[data-role="join"]');
    await guest.locator('#pkmsvv-coop-detail button').filter({hasText:'người · Tham gia'}).click();
    await Promise.all([host.waitForFunction(()=>G.Social.room?.members.length===2),guest.waitForFunction(()=>G.UI.isOpen('scr-lobby'))]);
    const extraPages=[];
    if(mode==='eggrush'){
     const room=await host.evaluate(()=>G.Social.room.id);
     for(let i=0;i<2;i++){
      const context=await browser.newContext();extraContexts.push(context);
      const page=await context.newPage();extraPages.push(page);await ready(page,base+'/game/');
      const result=await page.evaluate(async id=>{const result=await G.Social.joinRoom(id);if(result.ok)G.LobbyUI.open();return result;},room);
      assert.equal(result.ok,true);
     }
     await host.waitForFunction(()=>G.Social.room?.members.length===4);
    }
    await host.click('#lobby-start');
    await Promise.all([host,guest,...extraPages].map(page=>page.waitForFunction(()=>G.Coop.active&&G.Game.state==='playing')));
    await host.waitForTimeout(1500);
    for(const page of [host,guest,...extraPages]){
     const state=await page.evaluate(()=>({mode:G.Social.room?.mode,connected:G.LanBus.connected,
      room:G.Social.room?.members.length,recv:G.Net.stats.recv,state:G.Game.state}));
     assert.equal(state.mode,mode);assert.equal(state.connected,true);assert.equal(state.room,mode==='eggrush'?4:2);assert.ok(state.recv>0);
    }
    assert.deepEqual(hostErrors,[]);assert.deepEqual(guestErrors,[]);
    console.log('PASS '+(mode==='eggrush'?4:2)+' real clients create, join, start and exchange frames: '+mode);
   }finally{for(const context of extraContexts)await context.close();await hostContext.close();await guestContext.close();}
  }
 }finally{await browser.close();await server.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
