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
   G.MenuUI.open();await G.Social.createRoom('coop','private');for(const dex of [25,1,7])await G.LanBus.request('addBot',{dex});G.LobbyUI.open();
  });
  await page.click('#lobby-start');await page.waitForFunction(()=>G.Game.state==='playing');
  await page.waitForTimeout(2000);
  const spaced=await page.evaluate(()=>{
   const host=G.Game.player;return G.Coop.puppets().filter(p=>Math.hypot(p.x-host.x,p.y-host.y)>45).length;
  });assert.ok(spaced>=2,'AI spread around the trainer instead of standing on the trainer');
  console.log('PASS Co-op AI use personal space near the trainer');
  for(let minute=1;minute<=8;minute++){
   const owned=await page.evaluate(minute=>{
    const players=G.Coop.players(),owner=players[(minute-1)%players.length];
    // Keep the party together; claim for a different owner on each minute.
    for(const p of players){p.x=0;p.y=0;p.dead=false;p.hp=p.maxHp;}
    G.EggRush.update(.01,minute*60,players,()=>{throw Error('Co-op must not finish like Egg Rush');});
    const nest=G.EggRush.nests.at(-1);if(!nest)throw Error('No cooperative nest');
    owner.x=nest.x;owner.y=nest.y;G.EggRush.update(.01,minute*60+.1,players,()=>{});
    return {count:G.EggRush.pets.filter(p=>p.uid===owner.uid).length,uid:owner.uid};
   },minute);
   assert.equal(owned.count,minute<=4?1:2);
  }
  const outcome=await page.evaluate(()=>{
   G.EggRush.update(46,481,G.Coop.players(),()=>{});
   return G.Coop.players().map(owner=>({uid:owner.uid,pets:G.EggRush.pets.filter(p=>p.uid===owner.uid).map(p=>({hatch:p.hatch})),objective:G.EggRush.objective(owner)}));
  });
  for(const p of outcome){assert.equal(p.pets.length,2);assert.equal(p.pets.every(q=>q.hatch),true);assert.equal(p.objective,null);}
  assert.equal(await page.evaluate(()=>G.Game.state),'playing');
  assert.equal(await page.evaluate(()=>G.EggRush.active),false);
  fs.mkdirSync('dist/qa',{recursive:true});await page.screenshot({path:'dist/qa/coop-support-1.5.21.png'});
  console.log('PASS human and all 3 AI independently collect, incubate and own 2 supports; no extra egg claims');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
