'use strict';
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
async function main(){
 const server=await startServer({root:path.resolve('dist/lan'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());});
  await page.goto('http://127.0.0.1:'+server.port+'/game/');await page.waitForFunction(()=>G.DB?.save);
  await page.evaluate(async()=>{
   Object.assign(G.DB.save,{partner:150,starter:150,pkmsvvStorySeen:true,pkmsvvNameChosen:true});
   G.MenuUI.open();await G.Social.createRoom('royale','private');
   for(const dex of [1,4,7])await G.LanBus.request('addBot',{dex});G.LobbyUI.open();
  });
  const kicked=await page.evaluate(()=>G.Social.room.members.find(m=>m.bot).uid);
  await page.locator('.lob-card').filter({has:page.locator('.conn[data-u="'+kicked+'"]')}).locator('.pkmsvv-kick').click();
  await page.waitForFunction(uid=>!G.Social.room.members.some(m=>m.uid===uid),kicked);
  await page.fill('#pkmsvv-lan-ai-species','Pikachu #25');await page.click('#pkmsvv-lan-ai-add');
  await page.waitForFunction(()=>G.Social.room.members.some(m=>m.bot&&m.dex===25));
  console.log('PASS Host kicks a specific AI and adds the desired Pokemon through the lobby UI');
  await page.click('#lobby-start');await page.waitForFunction(()=>G.Game.state==='playing');
  await page.waitForTimeout(1600);
  const spread=await page.evaluate(()=>{
   const players=G.Coop.players();return players.every((p,i)=>players.slice(i+1).every(q=>Math.hypot(p.x-q.x,p.y-q.y)>200));
  });assert.equal(spread,true,'Survival actors start apart and AI do not follow Host');
  console.log('PASS Survival AI remain separated instead of clustering on Host');
  for(let minute=1;minute<=3;minute++){
   await page.evaluate(t=>G.Game.debugTime(t),minute*60);
   await page.waitForFunction(n=>G.EggRush.nests.length===n,minute);
   if(minute<=2){
    await page.evaluate(()=>{const n=G.EggRush.nests.at(-1);G.Game.player.x=n.x;G.Game.player.y=n.y;});
    await page.waitForFunction(n=>G.EggRush.pets.filter(p=>p.uid===G.Game.player.uid).length===n,minute);
   }
  }
  await page.evaluate(()=>{const n=G.EggRush.nests.at(-1);G.Game.player.x=n.x;G.Game.player.y=n.y;});
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>G.EggRush.pets.filter(p=>p.uid===G.Game.player.uid).length),2);
  await page.evaluate(()=>G.EggRush.update(46,181,G.Coop.players(),()=>{}));
  assert.equal(await page.evaluate(()=>G.EggRush.pets.filter(p=>p.uid===G.Game.player.uid).every(p=>p.hatch)),true);
  console.log('PASS Survival supports collect, incubate, hatch and cap at two per trainer');
  await page.evaluate(()=>{G.Game.quit();G.MenuUI.open();});
  await page.evaluate(async()=>{await G.Social.leaveRoom();await G.Social.createRoom('eggrush','private');for(let i=0;i<3;i++)await G.LanBus.request('addBot');G.Game.toUI();G.LobbyUI.open();});
  await page.click('#lobby-start');await page.waitForFunction(()=>G.Game.state==='playing');
  for(let minute=1;minute<=6;minute++){
   await page.evaluate(t=>G.Game.debugTime(t),minute*60);
   await page.waitForFunction(n=>G.EggRush.nests.length===n,minute);
  }
  assert.equal(await page.evaluate(()=>G.Game.state),'playing');
  assert.ok(await page.evaluate(()=>G.EggRush.objective(G.Game.player)));
  fs.mkdirSync('dist/qa',{recursive:true});await page.screenshot({path:'dist/qa/egg-guide-1.5.20.png'});
  for(let i=0;i<4;i++){
   const revived=await page.evaluate(()=>{
    const players=G.Coop.players();for(const p of players){p.dead=true;p.hp=0;}
    G.EggRush.update(7.9,361,players,()=>{throw Error('premature end');});
    if(!players.every(p=>p.dead))throw Error('respawned before 8s');
    G.EggRush.update(.11,361,players,()=>{});return players.every(p=>!p.dead);
   });assert.equal(revived,true);
  }
  console.log('PASS six minute-spawns, shared arrow objective and unlimited 8-second respawns for human and AI');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
