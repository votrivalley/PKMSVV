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
   const build=e.pkmsvvArenaBuild,kit=G.PKMSVVCombatTacticsQA.arenaKit(e);e.pkmsvvArenaBuild={...build,style:'mixed'};
   e.kx=e.ky=0;e.stunT=e.sleepT=0;e.slow=0;
   const before={x:e.x,y:e.y,hp:e.hp,maxHp:e.maxHp,spd:e.spd,dmg:e.dmg,cd:e.ai.cd};
   G.Projectiles.spawn({x:e.x-85,y:e.y,vx:210,vy:0,r:5,life:1.4,dmg:10,friendly:true,owner:p});
   e.update(1/60,p);
   const after={x:e.x,y:e.y,hp:e.hp,maxHp:e.maxHp,spd:e.spd,dmg:e.dmg,cd:e.ai.cd};
   e.applyStun(10);const stun=e.stunT,locked={x:e.x,y:e.y};e.update(1/60,p);
   const afterStun={x:e.x,y:e.y};
   e.stunT=0;e.ai.cast=null;G.Hazards.clear();e.bossStart('beam',p);
   const hazards=G.Hazards.all.filter(h=>h.kind==='beam').map(h=>h.dmg);
   // Exercise actual trainer AI selection in Enemy.update, not a fabricated cast.
   G.Hazards.clear();G.Projectiles.clear();e.ai.cast=null;e.ai.cd=0;e.stunT=0;e.sleepT=0;e.x=spot.x;e.y=spot.y;p.x=e.x+65;p.y=e.y;
   const api=G.PKMSVVCombatTacticsQA;
   for(let n=0;n<8;n++)api.arenaSkillClock(e,p,.25);
   e.update(1/60,p);
   const cast=e.ai.cast;
   if(!cast?.arenaSkill)throw Error('Native trainer skill not selected '+JSON.stringify(kit));
   const moveId=cast.v.m.id,wind=cast.wind,kind=cast.v.family,markers=G.Hazards.all.filter(h=>h.pkmsvvArenaMove===moveId);
   const initialShots=G.Projectiles.all().filter(q=>q.pkmsvvArenaMove===moveId).length;
   // Real windup and real hostile projectile/telegraph. For telegraphs, stay
   // inside the marked area to prove native Player.hurt receives damage.
   if(markers.length){const h=markers[0];p.x=h.kind==='zone'?h.x:h.x+Math.cos(h.angle)*50;p.y=h.kind==='zone'?h.y:h.y+Math.sin(h.angle)*50;}
   p.invuln=0;const hpBefore=p.hp;
   for(let n=0;n<Math.ceil((wind+.33)/.05);n++){e.update(.05,p);G.Hazards.update(.05);}
   const hpAfter=p.hp,shots=G.Projectiles.all().filter(q=>q.pkmsvvArenaMove===moveId).map(q=>({friendly:q.friendly,type:q.mtype,dmg:q.dmg}));
   const nativeSkill={moveId,wind,kind,markers:markers.map(h=>({kind:h.kind,type:h.type,dmg:h.dmg})),initialShots,hpBefore,hpAfter,shots,history:api.arenaKit(e).history,castEnded:!e.ai.cast};
   const allowed=G.Moves.poolFor(e.mon);
   return {before,after,locked,afterStun,stage:solo.stage,trained,actual:{hp:p.maxHp,atkMul:p.atkMul,cdMul:p.cdMul,skills:p.moves.length},build,stun,shotDmg:e.shotDmg(),hazards,kit,nativeSkill,allowed,types:e.mon.types};
  });
  assert.equal(report.stage,'fight');assert.ok(Math.abs(report.after.y-report.before.y)>.2,'native Enemy.update takes a lateral step');
  for(const key of ['hp','maxHp','spd','dmg'])assert.equal(report.after[key],report.before[key]);
  assert.ok(report.after.cd<report.before.cd,'native cast timer still advances');
  assert.deepEqual(report.locked,report.afterStun,'native stun still prevents movement');
  assert.ok(report.stun>0&&report.stun<=1.1);assert.deepEqual(report.trained,report.actual);
  assert.equal(report.build.attacks,8);assert.ok(report.before.maxHp>report.actual.hp*2);
  assert.equal(report.shotDmg,report.before.dmg);assert.ok(report.hazards.length>0&&report.hazards.every(d=>Math.abs(d-report.shotDmg*1.2)<1e-7));
  assert.ok(report.kit.moves.length>=3&&report.kit.moves.length<=8);
  assert.ok(report.kit.moves.every(m=>report.allowed.includes(m.id)&&(report.types.includes(m.type)||m.type==='normal')));
  assert.equal(report.nativeSkill.initialShots,0);assert.ok(report.nativeSkill.wind>=.62);
  assert.ok(report.nativeSkill.history.includes(report.nativeSkill.moveId));assert.ok(report.nativeSkill.castEnded);
  if(report.nativeSkill.markers.length){assert.ok(report.nativeSkill.hpAfter<report.nativeSkill.hpBefore);}
  else if(report.nativeSkill.kind==='shot'||report.nativeSkill.kind==='nova'){assert.ok(report.nativeSkill.shots.length>0&&report.nativeSkill.shots.every(q=>!q.friendly));}
  else assert.equal(report.nativeSkill.kind,'buff');
  // A second native match exercises real Champion support actors, rather
  // than mocking Player.hurt or calling an isolated control function.
  await page.evaluate(()=>{
   G.PKMSVVArenaSolo.abort();G.Flow.goMenu();
   if(!G.PKMSVVChampionArena.start())throw Error('Native Champion start rejected');
   window.__champKeep=setInterval(()=>{[...document.querySelectorAll('.pkmsvv-berry-overlay button')].find(x=>/Không dùng Berry|No Berry/.test(x.textContent))?.click();},60);
  });
  await page.waitForFunction(()=>G.Game.state==='playing'&&G.PKMSVVChampionArena.stage==='prep',null,{timeout:25000});
  const team=await page.evaluate(()=>{
   clearInterval(window.__champKeep);
   const arena=G.PKMSVVChampionArena,api=G.PKMSVVCombatTacticsQA,p=G.Game.player;
   if(!arena.nextDuel(true))throw Error('Champion countdown rejected');
   arena.update(3.01);
   const c=G.EnemyMgr.all().find(e=>e.pkmsvvChampion&&!e.dead);
   if(!c||arena.stage!=='fight')throw Error('Native Champion fight missing');
   let seq=[.9,.2,.25];const actors=arena.spawnOpponentSupports(c,p,()=>seq.shift()??0);
   let spot;for(let y=-100;y<=100&&!spot;y+=20)for(let x=-100;x<=100;x+=20)if(G.World.isFree(x,y,80,false)){spot={x,y};break;}
   if(!spot)throw Error('No Champion test spot');
   c.x=spot.x;c.y=spot.y;p.x=c.x+65;p.y=c.y;for(const e of actors){e.x=c.x;e.y=c.y;}
   G.Hazards.clear();G.Projectiles.clear();arena.updateOpponentSupports(4);
   const h=G.Hazards.all.find(h=>h.pkmsvvArenaSupport);
   if(!h)throw Error('Native control telegraph missing');
   p.x=h.x;p.y=h.y;p.invuln=0;p.slowT=0;const before=p.hp;
   G.Hazards.update(h.delay+.01);
   const hit={before,after:p.hp,slow:p.slowT,delay:h.delay,roles:actors.map(e=>e.pkmsvvSupportRole),hazards:G.Hazards.all.filter(h=>h.pkmsvvArenaSupport).length};
   // Dead support must never detonate a previously placed control zone.
   G.Hazards.clear();arena.updateOpponentSupports(10);
   const next=G.Hazards.all.find(h=>h.pkmsvvArenaSupport);
   if(!next)throw Error('Native second control telegraph missing');
   next.pkmsvvArenaSupport.source.dead=true;p.x=next.x;p.y=next.y;p.invuln=0;p.slowT=0;const hp=p.hp;
   G.Hazards.update(next.delay+.01);
   return {hit,cancel:{before:hp,after:p.hp,slow:p.slowT,hazards:G.Hazards.all.filter(h=>h.pkmsvvArenaSupport).length}};
  });
  assert.ok(team.hit.after<team.hit.before&&team.hit.slow>0&&team.hit.slow<=1.4);
  assert.equal(team.hit.hazards,1);assert.equal(team.cancel.after,team.cancel.before);assert.equal(team.cancel.slow,0);assert.equal(team.cancel.hazards,0);
  report.championSupport=team;console.log('NATIVE_CHAMPION_SUPPORT_TACTICS_PASS='+JSON.stringify(team));
  assert.deepEqual(errors,[]);
  const out=path.resolve('dist/big-update-progression-qa');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'arena-footwork.json'),JSON.stringify(report,null,2));
  console.log('NATIVE_ARENA_FOOTWORK_PASS='+JSON.stringify(report));
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
