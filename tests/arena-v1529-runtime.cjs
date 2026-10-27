'use strict';
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
async function prepare(page,url){await page.goto(url);await page.waitForFunction(()=>G.DB?.save);await page.evaluate(()=>{
 Object.assign(G.DB.save,{partner:251,pkmsvvStorySeen:true,pkmsvvNameChosen:true,pkmsvvChapter1Seen:true,pkmsvvChapter2Seen:true,pkmsvvChapter3Seen:true});G.MenuUI.open();
});}
(async()=>{
 const server=await startServer({root:path.resolve('dist/lan'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 const url='http://127.0.0.1:'+server.port+'/game/',errors=[];
 try{
  for(const count of [2,4,10]){
   const context=await browser.newContext(),host=await context.newPage(),guest=await context.newPage();
   for(const p of [host,guest])p.on('pageerror',e=>errors.push(e.message));
   await prepare(host,url);await prepare(guest,url);
   const id=await host.evaluate(async()=>{await G.Social.createRoom('royale','private');return G.Social.room.id;});
   await guest.evaluate(async id=>{const r=await G.Social.joinRoom(id);if(!r.ok)throw Error(r.error);G.LobbyUI.open();},id);
   await host.evaluate(async n=>{for(let i=2;i<n;i++)await G.LanBus.request('addBot');G.LobbyUI.open();},count);
   await host.click('#lobby-start');for(const p of [host,guest])await p.waitForFunction(()=>G.Game.state==='playing');
   for(const p of [host,guest])await p.evaluate(()=>G.Game.player.invuln=1000);
   const hostUid=await host.evaluate(()=>G.Game.player.uid),guestUid=await guest.evaluate(()=>G.Game.player.uid);
   await guest.evaluate(uid=>G.Net.toHost({k:'f',ev:[['az',G.Arena.snapshot().epoch,uid,0,true,999],['er','spawn',99999,0,0]]}),hostUid);
   await host.waitForTimeout(300);assert.equal(await host.evaluate(()=>G.Game.player.dead),false);
   assert.equal(await host.evaluate(()=>G.EggRush.nests.some(n=>n.id===99999)),false);
   await host.evaluate(()=>{
    window.spawnWitness=[];const broadcast=G.Coop.broadcast;
    G.Coop.broadcast=function(ev){
     // Visibility is a spawn-time rule; AI is allowed to approach eggs afterwards.
     if(ev[0]==='er'&&ev[1]==='spawn')spawnWitness.push({id:ev[2],valid:G.Arena.validSpawn(ev[3],ev[4]),visible:G.Arena.visible(ev[3],ev[4],G.Coop.players(),70)});
     return broadcast.call(this,ev);
    };G.Game.debugTime(30);
   });await host.waitForFunction(()=>G.EggRush.nests.filter(n=>!n.taken).length===Math.min(5,G.Coop.players().length*2),null,{timeout:10000});
   const nests=await host.evaluate(()=>G.EggRush.nests.filter(n=>!n.taken).map(n=>n.id));
   await guest.waitForFunction(ids=>ids.every(id=>G.EggRush.nests.some(n=>n.id===id)),nests);
   const witness=await host.evaluate(()=>spawnWitness);assert.equal(witness.length,Math.min(5,count*2));assert.ok(witness.every(n=>n.valid&&!n.visible));
   await guest.evaluate(()=>{G.Game.player.x=1800;G.Game.player.y=0;});
   await host.waitForFunction(uid=>G.Coop.mate(uid).pl.x>1700,guestUid);
   const hp=await guest.evaluate(()=>G.Game.player.hp);
   await host.evaluate(()=>G.Arena.update(11,G.Game.st.time,G.Coop.players()));
   await guest.waitForFunction(before=>G.Game.player.hp<before-.5,hp);
   await guest.evaluate(()=>{G.Game.player.x=1000;G.Game.player.y=0;});
   await host.evaluate(()=>G.Game.debugTime(211));await host.waitForFunction(ids=>ids.every(id=>!G.EggRush.nests.some(n=>n.id===id&&!n.taken)),nests);
   await guest.waitForFunction(ids=>ids.every(id=>!G.EggRush.nests.some(n=>n.id===id&&!n.taken)),nests);
   await host.evaluate(()=>G.Game.debugTime(480));await guest.waitForFunction(()=>G.Arena.snapshot().time>=480&&Math.abs(G.Arena.radius-1200)<3);
   if(count===10){await host.setViewportSize({width:844,height:390});await host.evaluate(()=>{G.Game.player.x=1180;G.Game.player.y=0;});await host.waitForTimeout(400);fs.mkdirSync('dist/qa',{recursive:true});await host.screenshot({path:'dist/qa/v1529-zone-mobile.png'});}
   console.log('PASS P0 real Host + guest + '+(count-2)+' AI: zone authority, shared nests, TTL, shrink, mobile HUD');
   await context.close();
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
