'use strict';
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const sites=await Promise.all([0,1].map(()=>startServer({root:path.resolve('dist/lan'),host:'127.0.0.1',port:0})));
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})}),reports=[];
 try{
  for(const [mode,count] of [['coop',4],['royale',10],['eggrush',4]]){
   const contexts=await Promise.all([0,1].map(i=>browser.newContext({viewport:i===0?{width:844,height:390}:{width:1280,height:800}})));
   try{
    const pages=await Promise.all(contexts.map(c=>c.newPage())),errors=[];
    for(let i=0;i<2;i++){
     await contexts[i].addInitScript(()=>{window.WebSocket=function(){throw Error('No room server allowed');};});
     const p=pages[i];p.on('pageerror',e=>errors.push(e.message));
     await p.goto('http://127.0.0.1:'+sites[i].port+'/game/?pkmsvvWifi=1');await p.waitForFunction(()=>G.DB?.save);
     await p.evaluate(()=>{Object.assign(G.DB.save,{partner:25,pkmsvvStorySeen:true,pkmsvvNameChosen:true,pkmsvvChapter1Seen:true,pkmsvvChapter2Seen:true,pkmsvvChapter3Seen:true});G.MenuUI.open();});
    }
    const [host,guest]=pages;
    const id=await host.evaluate(async mode=>{await G.Social.createRoom(mode,'private');G.LobbyUI.open();return G.Social.room.id;},mode);
    const offer=await host.evaluate(()=>G.LanBus.invitation()),answer=await guest.evaluate(s=>G.LanBus.answer(s),offer);
    await host.evaluate(s=>G.LanBus.accept(s),answer);
    await guest.evaluate(async id=>{const r=await G.Social.joinRoom(id);if(!r.ok)throw Error(r.error);G.LobbyUI.open();},id);
    await host.evaluate(async count=>{for(let i=2;i<count;i++)await G.LanBus.request('addBot');G.LobbyUI.open();},count);
    await host.click('#lobby-start');for(const p of pages)await p.waitForFunction(()=>G.Game.state==='playing');
    for(let n=0;n<20;n++){
     for(const p of pages)await p.evaluate(()=>{if(G.Game.state==='levelup')G.RunUI.pick(0);if(G.Game.player)G.Game.player.invuln=1000;});
     await host.waitForTimeout(250);
    }
    const human=await host.evaluate(()=>({uid:G.Game.player.uid,x:G.Game.player.x,y:G.Game.player.y}));
    await guest.waitForFunction(p=>{const m=G.Coop.mate(p.uid);return m&&Math.hypot(m.pl.x-p.x,m.pl.y-p.y)<10;},human);
    assert.equal(await host.evaluate(()=>G.Coop.players().length),count);
    assert.ok(await host.evaluate(()=>G.Game.st.time)>0);assert.ok(await guest.evaluate(()=>G.Game.st.time)>0);assert.deepEqual(errors,[]);
    reports.push({mode,participants:count,bots:count-2,transport:'local WebRTC, no WebSocket/STUN/TURN',hostViewport:'844x390',guestOriginIndependent:true,errors});
    console.log('PASS: actual offline Wi-Fi game '+mode+' with '+count+' trainers, two independent origins and '+(count-2)+' AI');
   }finally{for(const c of contexts)await c.close();}
  }
  fs.mkdirSync('dist/qa',{recursive:true});fs.writeFileSync('dist/qa/v1529-wifi-game.json',JSON.stringify(reports,null,2));
 }finally{await browser.close();for(const s of sites)await s.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
