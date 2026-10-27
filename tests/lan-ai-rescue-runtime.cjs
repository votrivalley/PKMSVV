'use strict';
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs');
const path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const s=await startServer({root:path.resolve('dist/lan'),host:'127.0.0.1',port:0});
 const b=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 try{
  const p=await b.newPage();await p.goto('http://127.0.0.1:'+s.port+'/game/');await p.waitForFunction(()=>G.DB?.save);
  await p.evaluate(async()=>{G.DB.save.partner=251;G.MenuUI.open();await G.Social.createRoom('coop','private');await G.LanBus.request('addBot',{dex:25});G.LobbyUI.open();});
  await p.click('#lobby-start');await p.waitForFunction(()=>G.Game.state==='playing');
  await p.evaluate(()=>{
   const bot=G.Coop.puppets()[0],host=G.Game.player;G.EnemyMgr.clear();G.Projectiles.clear();G.Hazards.clear();
   let spot;
   for(let y=-300;y<=300&&!spot;y+=32)for(let x=-300;x<=300;x+=32)
    if(G.World.isFree(x,y,24)&&!G.World.isLiquid(x,y)){spot={x,y};break;}
   if(!spot)throw Error('No safe rescue test area');
   bot.x=spot.x;bot.y=spot.y;host.x=spot.x+200;host.y=spot.y;
   bot.dead=true;bot.hp=0;bot.reviveT=0;host.invuln=20;
  });
  await p.waitForTimeout(1000);assert.equal(await p.evaluate(()=>G.Coop.puppets()[0].dead),true,'does not auto-revive without a helper');
  await p.evaluate(()=>{const bot=G.Coop.puppets()[0];G.Game.player.x=bot.x;G.Game.player.y=bot.y;});
  await p.waitForFunction(()=>!G.Coop.puppets()[0].dead,null,{timeout:7000});
  const r=await p.evaluate(()=>{const bot=G.Coop.puppets()[0];return {hp:bot.hp,maxHp:bot.maxHp,requiredSeconds:G.Player.REVIVE_TIME};});
  assert.ok(r.hp>0&&r.hp<=r.maxHp);console.log('PASS human rescues fallen Co-op AI by staying within 56 px: '+JSON.stringify(r));
 }finally{await b.close();await s.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
