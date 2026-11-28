'use strict';
// Isolated native movement fixture. It advances preparation, not a full live duel.
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const server=await startServer({root:path.resolve('dist/lan'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,executablePath:process.env.PKMSVV_BROWSER||'/usr/bin/google-chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;});
  await page.goto('http://127.0.0.1:'+server.port+'/game/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!G.DB?.save&&!!G.PKMSVVCombatTacticsQA&&!!G.PKMSVVArenaSolo,null,{timeout:40000});
  const report=await page.evaluate(()=>{
   const s=G.DB.save;Object.assign(s,{partner:25,partnerShiny:false,pkmsvvStorySeen:true,pkmsvvNameChosen:true,pkmsvvChapter6Seen:true,pkmsvvChapter7Seen:true,pkmsvvChapter8IntroSeen:true});
   s.owned={...s.owned,25:{at:1}};s.arenas={...s.arenas,pkmChampion:{seals:{Kanto:true}}};
   G.Flow.goMenu();
   const solo=G.PKMSVVArenaSolo;
   if(!solo.start(()=>0))throw Error('Native Solo start rejected: '+JSON.stringify(G.PKMSVVBoxHub.arenaReady(s)));
   solo.update(570);solo.update(20);solo.update(10);solo.update(3);
   if(solo.stage!=='fight')throw Error('Native Solo stage '+solo.stage);
   const p=G.Game.player,e=G.EnemyMgr.all().find(a=>a.pkmsvvArenaSolo&&!a.dead);
   if(!e)throw Error('Native Solo rival absent');
   G.Projectiles.clear();G.Hazards.clear();G.Combat.clearFields();
   let spot;
   for(let y=-100;y<=100&&!spot;y+=20)for(let x=-100;x<=100;x+=20)if(G.World.isFree(x,y,80,false)){spot={x,y};break;}
   if(!spot)throw Error('No clear native arena test position');
   e.x=spot.x;e.y=spot.y;p.x=spot.x-140;p.y=spot.y;
   e.bossInit();e.ai.mode='close';e.ai.modeT=5;e.ai.cd=2;e.ai.cast=null;
   e.kx=e.ky=0;e.stunT=e.sleepT=0;e.slow=0;
   const before={x:e.x,y:e.y,hp:e.hp,maxHp:e.maxHp,spd:e.spd,dmg:e.dmg,cd:e.ai.cd};
   G.Projectiles.spawn({x:e.x-85,y:e.y,vx:210,vy:0,r:5,life:1.4,dmg:10,friendly:true,owner:p});
   e.update(1/60,p);
   const after={x:e.x,y:e.y,hp:e.hp,maxHp:e.maxHp,spd:e.spd,dmg:e.dmg,cd:e.ai.cd};
   e.stunT=.5;const locked={x:e.x,y:e.y};e.update(1/60,p);
   return {before,after,locked,afterStun:{x:e.x,y:e.y},stage:solo.stage};
  });
  assert.equal(report.stage,'fight');assert.ok(Math.abs(report.after.y-report.before.y)>.2,'native Enemy.update takes a lateral step');
  for(const key of ['hp','maxHp','spd','dmg'])assert.equal(report.after[key],report.before[key]);
  assert.ok(report.after.cd<report.before.cd,'native cast timer still advances');
  assert.deepEqual(report.locked,report.afterStun,'native stun still prevents movement');
  assert.deepEqual(errors,[]);
  const out=path.resolve('dist/big-update-progression-qa');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'arena-footwork.json'),JSON.stringify(report,null,2));
  console.log('NATIVE_ARENA_FOOTWORK_PASS='+JSON.stringify(report));
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
