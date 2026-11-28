'use strict';
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const site=await startServer({root:path.resolve('dist/lan'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,executablePath:process.env.PKMSVV_BROWSER||'/usr/bin/google-chrome'});
 const out=path.resolve('dist/big-update-progression-qa');fs.mkdirSync(out,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;});
  await page.goto('http://127.0.0.1:'+site.port+'/game/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!G.DB?.save&&!!G.PKMSVVCombatBalanceQA,null,{timeout:40000});
  await page.evaluate(()=>{
   const s=G.DB.save;Object.assign(s,{partner:25,partnerShiny:false,pkmsvvStorySeen:true,pkmsvvNameChosen:true,pkmsvvChapter7Seen:true});
   s.owned={...s.owned,25:{at:1}};G.Flow.goMenu();if(!G.PKMSVVQuickRegion.choose(0))throw Error('Cannot enter Explore');
   window.__keep=setInterval(()=>{[...document.querySelectorAll('.pkmsvv-berry-overlay button')].find(x=>/Không dùng Berry|No Berry/.test(x.textContent))?.click();if(G.Game.player)G.Game.player.invuln=2000;},100);
  });
  await page.waitForFunction(()=>G.Game.state==='playing',null,{timeout:28000});
  const report=await page.evaluate(()=>{
   const api=G.PKMSVVCombatBalanceQA,p=G.Game.player;if(!api.enabled())throw Error('Wrong combat mode');
   const audit=api.audit(),power=G.LevelUp.STATS.find(x=>x.id==='atk');
   const old=p.atkMul,stats=p.statsTaken,powers=[];
   p.statsTaken={...stats,atk:0};
   for(let i=0;i<40;i++){power.apply(p);p.statsTaken.atk++;if([10,20,40].includes(i+1))powers.push({n:i+1,mul:p.atkMul/old});}
   p.atkMul=old;p.statsTaken=stats;
   // Actual native actors, actual status methods and update timers.
   const mk=boss=>new G.Enemy({dex:19,hp:20000,spd:0,dmg:1,xp:1,behavior:'chase'},p.x+50,p.y,{hp:1,spd:1,dmg:1},boss);
   const b=mk(true);b.pkmsvvPressureBoss=true;const e=mk(false);e.pkmsvvPressureElite=true;
   const control=[];
   for(const target of [b,e]){
    const tier=api.tier(target);target.applyStun(10);const first=target.stunT;
    const sleep=typeof target.applySleep==='function';const repeat=()=>sleep?target.applySleep(10):target.applyStun(10);
    for(let n=0;n<10;n++)repeat();
    const during={stun:target.stunT,sleep:target.sleepT||0};
    for(let n=0;n<10;n++)target.update(.1,p);
    repeat();const recovery={stun:target.stunT,sleep:target.sleepT||0};
    for(let n=0;n<30;n++)target.update(.1,p);
    repeat();const after={stun:target.stunT,sleep:target.sleepT||0};
    target.applySlow(.99,10);
    control.push({tier,first,during,recovery,after,slow:target.slow,slowT:target.slowT,policy:api.POLICY[tier]});
   }
   return {audit,powers,control};
  });
  assert.equal(report.audit.length,176);assert.equal(new Set(report.audit.map(x=>x.id)).size,176);
  for(const r of report.audit){assert.equal(r.max.lvl,r.maxLvl);assert.ok(r.first.cd>0&&r.max.hasted>0);}
  const surf=report.audit.find(x=>x.id==='surf');assert.ok(surf.max.hasted>=1.5);
  for(const r of report.audit.filter(x=>x.kind==='vortex'))assert.ok(r.max.hasted>=1.8);
  assert.ok(Math.abs(report.powers[0].mul-1.1**10)<1e-8);assert.ok(report.powers[2].mul>8&&report.powers[2].mul<9);
  for(const c of report.control){assert.ok(c.first>0&&c.first<=c.policy.hard);assert.equal(c.during.stun,c.first);assert.equal(c.during.sleep,0);assert.ok(c.recovery.stun<=0&&c.recovery.sleep<=0);assert.ok(c.after.stun>0||c.after.sleep>0);assert.ok(c.slow<=c.policy.slow&&c.slowT<=c.policy.slowTime);}
  assert.deepEqual(errors,[]);
  await page.evaluate(()=>clearInterval(window.__keep));
  fs.writeFileSync(path.join(out,'combat-balance-176.json'),JSON.stringify(report,null,2));
  const summary={count:report.audit.length,native:report.audit.filter(x=>x.native).length,powers:report.powers,surf,vortex:report.audit.filter(x=>x.kind==='vortex').map(x=>({id:x.id,cd:x.max.cd,hasted:x.max.hasted})),control:report.control};
  console.log('NATIVE_COMBAT_BALANCE_PASS='+JSON.stringify(summary));
 }finally{await browser.close();await site.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
