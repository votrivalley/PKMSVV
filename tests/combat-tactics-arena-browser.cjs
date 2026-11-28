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
  await page.evaluate(()=>{
   const s=G.DB.save;Object.assign(s,{partner:25,partnerShiny:false,pkmsvvStorySeen:true,pkmsvvNameChosen:true,pkmsvvChapter6Seen:true,pkmsvvChapter7Seen:true,pkmsvvChapter8IntroSeen:true});
   s.owned={...s.owned,25:{at:1}};s.arenas={...s.arenas,pkmChampion:{seals:{Kanto:true}}};
   G.Flow.goMenu();
   const solo=G.PKMSVVArenaSolo;
   if(!solo.start(()=>0))throw Error('Native Solo start rejected: '+JSON.stringify(G.PKMSVVBoxHub.arenaReady(s)));
   window.__arenaKeep=setInterval(()=>{
    [...document.querySelectorAll('.pkmsvv-berry-overlay button')].find(x=>/Không dùng Berry|No Berry/.test(x.textContent))?.click();
    if(G.Game?.state==='levelup'&&G.UI?.isOpen?.('scr-levelup'))G.RunUI.pick(0);
    if(G.UI?.isOpen?.('scr-bond'))G.RunUI.pickBond(0);
    if(G.UI?.isOpen?.('scr-item'))(document.querySelector('#item-cards .pkmsvv-held-action.is-old')||document.querySelector('#item-cards .card'))?.click();
    document.querySelector('.pkmsvv-evo:not([hidden]) .pkmsvv-evo-skip')?.click();
   },60);
  });
  await page.waitForFunction(()=>G.Game.state==='playing'&&G.PKMSVVArenaSolo.stage==='prep',null,{timeout:28000}).catch(async err=>{
   throw Error('Native Solo entry blocked: '+JSON.stringify(await page.evaluate(()=>({state:G.Game.state,stage:G.PKMSVVArenaSolo.stage,overlays:[...document.querySelectorAll('.pkmsvv-berry-overlay,[id^="scr-"]:not(.hidden)')].map(x=>({id:x.id,cls:x.className,text:x.textContent.slice(0,140)}))})))+' '+err.message);
  });
  const report=await page.evaluate(()=>{
   clearInterval(window.__arenaKeep);
   const solo=G.PKMSVVArenaSolo,p0=G.Game.player;
   const ids=['surf','thunder-shock','whirlpool','flame-wheel','ice-beam','rock-slide','bug-buzz','rapid-spin'];
   p0.moves=ids.map(id=>G.Moves.instance(id,G.Moves.BY_ID[id].maxLvl));p0.slots=p0.moves.map(m=>[m]);p0.active=0;
   p0.maxHp=500;p0.hp=500;p0.atkMul=3;p0.cdMul=.65;
   const trained={hp:p0.maxHp,atkMul:p0.atkMul,cdMul:p0.cdMul,skills:p0.moves.length};
   solo.update(solo.prepTotal-30);solo.update(20);solo.update(10);solo.update(3);
   if(solo.stage!=='fight')throw Error('Native Solo stage '+solo.stage+' game '+G.Game.state);
   const p=G.Game.player,e=G.EnemyMgr.all().find(a=>a.pkmsvvArenaSolo&&!a.dead);
   if(!e)throw Error('Native Solo rival absent');
   G.Projectiles.clear();G.Hazards.clear();G.Combat.clearFields();
   let spot;
   for(let y=-100;y<=100&&!spot;y+=20)for(let x=-100;x<=100;x+=20)if(G.World.isFree(x,y,80,false)){spot={x,y};break;}
   if(!spot)throw Error('No clear native arena test position');
   e.x=spot.x;e.y=spot.y;p.x=spot.x-140;p.y=spot.y;
   e.bossInit();e.ai.mode='close';e.ai.modeT=5;e.ai.cd=2;e.ai.cast=null;
   // Independently exercise the Stage3 dodge fixture, not the adaptive tactical mode.
   const build=e.pkmsvvArenaBuild;e.pkmsvvArenaBuild={...build,style:'mixed'};
   e.kx=e.ky=0;e.stunT=e.sleepT=0;e.slow=0;
   const before={x:e.x,y:e.y,hp:e.hp,maxHp:e.maxHp,spd:e.spd,dmg:e.dmg,cd:e.ai.cd};
   G.Projectiles.spawn({x:e.x-85,y:e.y,vx:210,vy:0,r:5,life:1.4,dmg:10,friendly:true,owner:p});
   e.update(1/60,p);
   const after={x:e.x,y:e.y,hp:e.hp,maxHp:e.maxHp,spd:e.spd,dmg:e.dmg,cd:e.ai.cd};
   e.applyStun(10);const stun=e.stunT,locked={x:e.x,y:e.y};e.update(1/60,p);
   const afterStun={x:e.x,y:e.y};
   e.stunT=0;e.ai.cast=null;G.Hazards.clear();e.bossStart('beam',p);
   const hazards=G.Hazards.all.filter(h=>h.kind==='beam').map(h=>h.dmg);
   return {before,after,locked,afterStun,stage:solo.stage,trained,actual:{hp:p.maxHp,atkMul:p.atkMul,cdMul:p.cdMul,skills:p.moves.length},build,stun,shotDmg:e.shotDmg(),hazards};
  });
  assert.equal(report.stage,'fight');assert.ok(Math.abs(report.after.y-report.before.y)>.2,'native Enemy.update takes a lateral step');
  for(const key of ['hp','maxHp','spd','dmg'])assert.equal(report.after[key],report.before[key]);
  assert.ok(report.after.cd<report.before.cd,'native cast timer still advances');
  assert.deepEqual(report.locked,report.afterStun,'native stun still prevents movement');
  assert.ok(report.stun>0&&report.stun<=1.1);assert.deepEqual(report.trained,report.actual);
  assert.equal(report.build.attacks,8);assert.ok(report.before.maxHp>report.actual.hp*2);
  assert.equal(report.shotDmg,report.before.dmg);assert.ok(report.hazards.length>0&&report.hazards.every(d=>Math.abs(d-report.shotDmg*1.2)<1e-7));
  assert.deepEqual(errors,[]);
  const out=path.resolve('dist/big-update-progression-qa');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'arena-footwork.json'),JSON.stringify(report,null,2));
  console.log('NATIVE_ARENA_FOOTWORK_PASS='+JSON.stringify(report));
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
