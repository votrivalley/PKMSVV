'use strict';
// Fixed-step native subsystem benchmark, NOT human win-rate or device FPS.
// Each case creates a fresh offline Solo run, advances only preparation, and
// executes actual Player/Enemy/Combat/Projectiles/Hazards at 30 Hz for up to
// 75 simulation seconds. No forced damage/death, invulnerability cheats,
// synthetic damage formulas or player stat changes after the duel starts.
// Real Game.st.time is not advanced in this isolated loop; now is supplied
// to time-aware combat APIs. Results are diagnostic, not balance thresholds.
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const builds=[
 {id:'melee',moves:['tackle','karate-chop','wing-attack','rapid-spin'],level:3,hp:300,atk:1.8,cd:.85,spd:1.10,def:.08,regen:0,radius:70,seed:0},
 {id:'ranged',moves:['thunder-shock','ice-beam','hydro-pump','rock-slide'],level:3,hp:280,atk:1.9,cd:.85,spd:1.05,def:.05,regen:0,radius:190,seed:.17},
 {id:'tank',moves:['tackle','metal-claw','harden','rapid-spin'],level:3,hp:420,atk:1.35,cd:.90,spd:.95,def:.45,regen:0,radius:65,seed:.31},
 {id:'sustain',moves:['aqua-ring','draining-kiss','thunder-shock','ice-beam'],level:3,hp:340,atk:1.6,cd:.80,spd:1.02,def:.10,regen:4,radius:165,seed:.44},
 {id:'eight-max',moves:['surf','thunder-shock','whirlpool','flame-wheel','ice-beam','rock-slide','bug-buzz','rapid-spin'],level:5,hp:500,atk:3,cd:.65,spd:1.15,def:.15,regen:2,radius:105,seed:.58}
];
(async()=>{
 const server=await startServer({root:path.resolve('dist/lan'),host:'127.0.0.1',port:0}),out=path.resolve('dist/big-update-progression-qa');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.PKMSVV_BROWSER||'/usr/bin/google-chrome'});
 const report=[];
 try{
  for(const build of builds)for(const policy of ['still','tactical']){
   const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   try{
    await page.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;});
    await page.goto('http://127.0.0.1:'+server.port+'/game/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!G.DB?.save&&!!G.PKMSVVCombatTacticsQA&&!!G.PKMSVVArenaSolo,null,{timeout:40000});
    await page.evaluate(({seed})=>{
     const s=G.DB.save;Object.assign(s,{partner:25,partnerShiny:false,pkmsvvStorySeen:true,pkmsvvNameChosen:true,pkmsvvChapter6Seen:true,pkmsvvChapter7Seen:true,pkmsvvChapter8IntroSeen:true});
     s.owned={...s.owned,25:{at:1}};s.arenas={...s.arenas,pkmChampion:{seals:{Kanto:true}}};
     G.Flow.goMenu();let rolls=[seed,0,1/3];
     if(!G.PKMSVVArenaSolo.start(()=>rolls.shift()??0))throw Error('Solo start rejected');
     window.__balanceKeep=setInterval(()=>{
      [...document.querySelectorAll('.pkmsvv-berry-overlay button')].find(x=>/Không dùng Berry|No Berry/.test(x.textContent))?.click();
      if(G.Game?.state==='levelup'&&G.UI?.isOpen?.('scr-levelup'))G.RunUI.pick(0);
      if(G.UI?.isOpen?.('scr-bond'))G.RunUI.pickBond(0);
      if(G.UI?.isOpen?.('scr-item'))(document.querySelector('#item-cards .pkmsvv-held-action.is-old')||document.querySelector('#item-cards .card'))?.click();
      document.querySelector('.pkmsvv-evo:not([hidden]) .pkmsvv-evo-skip')?.click();
     },60);
    },build);
    await page.waitForFunction(()=>G.Game.state==='playing'&&G.PKMSVVArenaSolo.stage==='prep',null,{timeout:28000});
    const result=await page.evaluate(({build,policy})=>{
     clearInterval(window.__balanceKeep);
     const solo=G.PKMSVVArenaSolo,api=G.PKMSVVCombatTacticsQA,p0=G.Game.player;
     const originalRandom=Math.random;
     let rng=123456789;Math.random=()=>((rng=(Math.imul(rng,1664525)+1013904223)>>>0)/4294967296);
     try{
      p0.moves=build.moves.map(id=>{const def=G.Moves.BY_ID[id];if(!def)throw Error('Missing real move '+id);return G.Moves.instance(id,Math.min(build.level,def.maxLvl));});
      p0.slots=p0.moves.map(m=>[m]);p0.active=0;
      Object.assign(p0,{maxHp:build.hp,hp:build.hp,atkMul:build.atk,cdMul:build.cd,spdMul:build.spd,dmgReduce:build.def,regenFlat:build.regen});
      solo.update(solo.prepTotal-30);solo.update(20);solo.update(10);solo.update(3);
      const p=G.Game.player,e=G.EnemyMgr.all().find(x=>x.pkmsvvArenaSolo&&!x.dead);
      if(solo.stage!=='fight'||!e)throw Error('Duel missing');
      let spot;for(let y=-120;y<=120&&!spot;y+=30)for(let x=-120;x<=120;x+=30)if(G.World.isFree(x,y,70,true)&&G.World.isFree(x+90,y,20,true)&&!G.World.isLiquid(x,y)&&!G.World.isLiquid(x+90,y)){spot={x,y};break;}
      if(!spot)throw Error('No legal fixture spot');
      G.Projectiles.clear();G.Hazards.clear();G.Combat.clearFields();G.Pickups.clear();
      p.x=spot.x;p.y=spot.y;e.x=p.x+90;e.y=p.y;
      const initial={playerHp:p.maxHp,rivalHp:e.maxHp,rivalDmg:e.dmg,rivalSpd:e.spd,rivalDex:e.dex,build:e.pkmsvvArenaBuild,kit:api.arenaKit(e)?.moves,power:api.arenaPowerInfo(e)?.id};
      const totals={playerDamage:0,rivalDamage:0,playerHits:0,rivalHits:0,evades:0,moved:0,maxProjectiles:0,maxFields:0,maxHazards:0,far:0,close:0};
      function observe(actor,damageKey,hitKey){
       const orig=actor.hurt;actor.hurt=function(...args){const hp=this.hp,max=this.maxHp;const out=orig.apply(this,args);const amount=max===this.maxHp?Math.max(0,hp-Math.max(0,this.hp)):0;if(amount>0){totals[damageKey]+=amount;totals[hitKey]++;}return out;};
      }
      observe(p,'playerDamage','playerHits');observe(e,'rivalDamage','rivalHits');
      const dt=1/30,baseTime=G.Game.st.time,limit=75,history=[];let t=0;
      const segment=(actor,a,b)=>{
       const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/12));
       for(let i=1;i<=n;i++){const k=i/n,x=a.x+(b.x-a.x)*k,y=a.y+(b.y-a.y)*k;if(!G.World.isFree(x,y,(actor.r||10)+2,true)||G.World.isLiquid(x,y))return false;}return true;
      };
      function axis(){
       if(policy==='still')return [0,0];
       let dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1,ax=dx/d,ay=dy/d;
       if(d<build.radius*.65){ax=-ax;ay=-ay;}
       else if(d<build.radius*1.15){const old=ax;ax=-ay;ay=old;}
       if(!segment(p,p,{x:p.x+ax*35,y:p.y+ay*35})){const old=ax;ax=ay;ay=-old;if(!segment(p,p,{x:p.x+ax*35,y:p.y+ay*35}))ax=ay=0;}
       const dodge=api.evade(p,[ax,ay],e,G.Hazards.all,segment,(_a,x,y)=>G.World.isLiquid(x,y)?1:0);
       if(dodge){totals.evades++;return dodge;}
       return [ax,ay];
      }
      for(let n=0;n<limit/dt;n++){
       if(!solo.active||solo.stage!=='fight'||p.dead||e.dead)break;
       t=(n+1)*dt;const now=baseTime+t;
       const oldX=p.x,oldY=p.y;p.lanBotAxis=axis();
       p.update(dt);totals.moved+=Math.hypot(p.x-oldX,p.y-oldY);
       G.Camera.follow(p.x,p.y,dt);G.World.update(dt,G.Camera);G.Path.update(dt,[p]);
       G.EnemyMgr.update(dt,[p]);if(!solo.active||p.dead||e.dead)break;
       G.EnemyMgr.rebuildGrid();G.Combat.tick(dt,p,now);G.Projectiles.update(dt,p,G.EnemyMgr.all());
       G.Combat.resolve(dt,p,now);G.Combat.updateFields(dt);G.Hazards.update(dt);G.Weather.update(dt,now,p);G.FX.update(dt);
       if(e.ai?.mode==='far')totals.far+=dt;else if(e.ai?.mode==='close')totals.close+=dt;
       totals.maxProjectiles=Math.max(totals.maxProjectiles,G.Projectiles.all().length);totals.maxFields=Math.max(totals.maxFields,G.Combat.fieldCount);totals.maxHazards=Math.max(totals.maxHazards,G.Hazards.all.length);
       if(n%150===149||p.dead||e.dead)history.push({time:t,player:Math.max(0,p.hp)/p.maxHp,rival:Math.max(0,e.hp)/e.maxHp,casts:api.arenaKit(e)?.casts||0,power:api.arenaPowerInfo(e)});
       if(![p.x,p.y,p.hp,p.maxHp,e.x,e.y,e.hp,e.maxHp].every(Number.isFinite))throw Error('Nonfinite combat state '+build.id+' '+policy);
      }
      p.lanBotAxis=null;
      const kit=api.arenaKit(e),power=api.arenaPowerInfo(e);
      return {id:build.id,policy,initial,elapsed:t,outcome:e.dead?'rival-defeated':p.dead?'player-defeated':!solo.active?'ended':'time-sample',playerHp:Math.max(0,p.hp),playerMaxHp:p.maxHp,rivalHp:Math.max(0,e.hp),rivalMaxHp:e.maxHp,casts:kit?.casts||0,moveHistory:kit?.history||[],power,totals,history,clock:'fixed-step native subsystems'};
     }finally{Math.random=originalRandom;}
    },{build,policy});
    assert.deepEqual(errors,[]);
    assert.ok(result.elapsed>0&&result.elapsed<=75.001);
    assert.ok(result.initial.kit?.length>=3,'native rival kit absent');
    assert.ok(result.casts>0||result.outcome==='rival-defeated','rival must attack or be defeated before first cast');
    assert.ok(result.totals.playerDamage+result.totals.rivalDamage>0,'no combat damage observed');
    report.push(result);
    fs.writeFileSync(path.join(out,'arena-balance-matrix.json'),JSON.stringify({method:'fixed-step 30Hz; native combat; no human input; fresh test runs',cases:report},null,2));
    console.log('ARENA_BALANCE_CASE='+JSON.stringify({...result,history:undefined,initial:{...result.initial,kit:result.initial.kit.map(m=>m.id),build:{style:result.initial.build.style,pressure:result.initial.build.pressure}}}));
   }finally{await page.close();}
  }
  assert.equal(report.length,10);
  assert.ok(report.filter(r=>r.policy==='tactical').some(r=>r.totals.moved>100));
  console.log('NATIVE_ARENA_BALANCE_MATRIX_PASS='+JSON.stringify(report.map(r=>({id:r.id,policy:r.policy,elapsed:r.elapsed,outcome:r.outcome,rivalDex:r.initial.rivalDex,playerHp:r.playerHp,playerMaxHp:r.playerMaxHp,rivalHp:r.rivalHp,rivalMaxHp:r.rivalMaxHp,casts:r.casts,playerDamage:r.totals.playerDamage,rivalDamage:r.totals.rivalDamage,evades:r.totals.evades,far:r.totals.far,close:r.totals.close}))));
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
