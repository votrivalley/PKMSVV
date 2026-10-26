'use strict';
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs');
const assert=require('node:assert/strict'),path=require('node:path');
async function main(){
 const server=await startServer({root:path.resolve('dist/lan'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 try{
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());});
  await page.goto('http://127.0.0.1:'+server.port+'/game/');await page.waitForFunction(()=>window.G?.DB?.save);
  await page.evaluate(()=>{
   Object.assign(G.DB.save,{partner:150,starter:150,pkmsvvStorySeen:true,pkmsvvNameChosen:true,
    pkmsvvChapter1Seen:true,pkmsvvChapter2Seen:true,pkmsvvChapter3Seen:true,
    pkmsvvChapter1Pending:false,pkmsvvChapter2Pending:false,pkmsvvChapter3Pending:false});
   G.DB.commit();G.MenuUI.open();
  });
  let lastRoom=null;
  for(const mode of ['eggrush','coop','royale','eggrush','eggrush']){
   await page.evaluate(()=>G.MenuUI.open());await page.click('#scr-menu [data-go="multiplayer"]');
   await page.click('#pkmsvv-unified-coop button[data-mode="'+mode+'"]');await page.click('[data-role="ai"]');
   await page.waitForFunction(mode=>G.UI.isOpen('scr-lobby')&&G.Social.room?.mode===mode&&G.Social.room.members.length===(mode==='coop'?2:4),mode);
   const room=await page.evaluate(()=>({id:G.Social.room.id,mode:G.Social.room.mode,members:G.Social.room.members}));
   if(lastRoom&&lastRoom.mode!==mode)assert.notEqual(room.id,lastRoom.id,'changing mode leaves the old room');
   assert.equal(new Set(room.members.map(m=>m.dex)).size,room.members.length,'random bots do not mirror trainer or each other');
   lastRoom=room;
   await page.click('#lobby-start');await page.waitForFunction(()=>G.Game.state==='playing');
   assert.equal(await page.evaluate(()=>G.Coop.players().every(p=>p.level===1)),true,'all species begin a new match at run level one');
   if(mode==='eggrush'){
    const safe=await page.evaluate(()=>{
     const players=G.Coop.players();const before=players.map(p=>p.hp);
     for(const pl of players){
      G.EggRush.cast(pl,pl.moves[0]);G.EggRush.orb(pl,'blowback');
      G.EggRush.onEvent(['er','hit',pl.uid,90,5]);
     }
     return players.every((p,i)=>p.hp===before[i]&&!p.pkmsvvPvpSlow);
    });assert.equal(safe,true,'human and AI damage events cannot hurt other trainers');
    // A death with lives remaining must revive instead of ending the round.
    await page.evaluate(()=>{for(const p of G.Coop.players()){p.dead=true;p.hp=0;p.lanEggRevives=0;}
     G.EggRush.update(5.1,1,G.Coop.players(),()=>{throw Error('premature finish');});});
    assert.equal(await page.evaluate(()=>G.Coop.players().every(p=>!p.dead)),true);
   }
   await page.evaluate(()=>{for(const pl of G.Coop.players()){pl.dead=true;pl.hp=0;pl.lanEggRevives=2;}});
   await page.waitForFunction(()=>G.Game.state==='over',null,{timeout:6000});
   await page.waitForFunction(()=>G.Social.room.open&&G.Social.room.members.every(p=>!p.bot));
   assert.equal(await page.evaluate(()=>G.Coop.active),false);
   if(mode==='eggrush')assert.equal(await page.evaluate(()=>G.EggRush.outcome.reason),'all-eliminated');
   await page.click('#btn-again');await page.waitForFunction(()=>G.UI.isOpen('scr-lobby'));
   assert.equal(await page.evaluate(()=>G.Social.room.members.length),1);
   console.log('PASS round '+mode+': finish, remove old AI, return to lobby and replay/switch mode');
  }
  const guest=await browser.newPage();
  await guest.goto('http://127.0.0.1:'+server.port+'/game/');await guest.waitForFunction(()=>window.G?.DB?.save);
  const id=await page.evaluate(()=>G.Social.room.id);
  await guest.evaluate(async id=>{
   Object.assign(G.DB.save,{partner:25,starter:25,pkmsvvStorySeen:true,pkmsvvNameChosen:true});
   G.MenuUI.open();const result=await G.Social.joinRoom(id);if(!result.ok)throw Error(result.error);G.LobbyUI.open();
  },id);
  await page.evaluate(async()=>{for(let i=0;i<2;i++)await G.LanBus.request('addBot');});
  await page.waitForFunction(()=>G.Social.room.members.length===4);
  await page.click('#lobby-start');await guest.waitForFunction(()=>G.Game.state==='playing');
  await page.evaluate(()=>{for(const p of G.Coop.players())if(p===G.Game.player||p.lanBot){p.dead=true;p.hp=0;p.lanEggRevives=2;}});
  await guest.evaluate(()=>{G.Game.player.dead=true;G.Game.player.hp=0;G.Game.player.lanEggRevives=0;});
  await page.waitForTimeout(900);
  assert.notEqual(await page.evaluate(()=>G.Game.state),'over','remote trainer with revives remaining must not prematurely end Egg Rush');
  await guest.evaluate(()=>{G.Game.player.lanEggRevives=2;});
  await page.waitForFunction(()=>G.Game.state==='over',null,{timeout:6000});
  await guest.waitForFunction(()=>G.Game.state==='over',null,{timeout:6000});
  console.log('PASS remote human: remaining lives synchronize; all exhausted ends match on both devices');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
