'use strict';
// Real compiled Solo Explore; seed only isolated test save and charge.
// Actual input, native cast and enemy HP; no synthetic attack or Enemy.hurt call.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs');
const OUT=path.resolve('dist/mega-recovery-combat-qa');fs.mkdirSync(OUT,{recursive:true});
const CASES=['slowbromega','sharpedomega','scraftymega','hawluchamega'].flatMap(key=>[[key,false],[key,true]]);
(async()=>{const server=await startServer({root:path.resolve(__dirname,'../dist/lan'),host:'127.0.0.1',port:0});let browser;const reports=[];
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.PKMSVV_BROWSER||'/usr/bin/google-chrome'});
  for(const [key,shiny] of CASES){
   const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   try{
    await page.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;});
    await page.goto('http://127.0.0.1:'+server.port+'/game/',{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(()=>!!window.G?.DB?.save&&!!G.PKMSVVQuickRegion?.choose&&!!G.PKMSVVMegaPhase3?.recoveryBattle&&G.PKMSVV_MEGA_RECOVERY_BATTLE_QA===true,null,{timeout:40000});
    const form=await page.evaluate(({key,shiny})=>{
     const f=G.PKMSVV_MEGA_CATALOG.find(x=>x.key===key),s=G.DB.save;if(!f||f.artReady)throw Error('Not a recovered preview');
     Object.assign(s,{partner:f.dex,partnerShiny:shiny,pkmsvvStorySeen:true,pkmsvvNameChosen:true,pkmsvvChapter3Seen:true,pkmsvvChapter7Seen:true});
     s.owned={...s.owned,[f.dex]:{at:1}};if(shiny)s.shiny={...s.shiny,[f.dex]:{at:1}};
     s.megaStones={...s.megaStones,[f.stoneKey]:1};s.pkmsvvPowerLoadout={...s.pkmsvvPowerLoadout,[f.dex]:'mega'};
     G.MenuUI.open();if(!G.PKMSVVQuickRegion.choose(0))throw Error('Cannot start solo');
     window.__recoveryKeep=setInterval(()=>{[...document.querySelectorAll('.pkmsvv-berry-overlay button')].find(x=>/Không dùng Berry|No Berry/.test(x.textContent))?.click();const p=G.Game?.player;if(p&&!p.dead)p.invuln=Math.max(p.invuln||0,2000);if(G.Game?.state==='levelup'&&G.UI?.isOpen?.('scr-levelup'))G.RunUI.pick(0);},100);
     return {dex:f.dex,id:f.spriteId,key:f.key};
    },{key,shiny});
    await page.waitForFunction(()=>G.Game?.state==='playing',null,{timeout:23000});
    const original=await page.evaluate(async ({form,shiny})=>{
     const p=G.Game.player,api=G.PKMSVVMegaPhase3;
     if(p.dex!==form.dex||!!p.shiny!==shiny)throw Error('Wrong test species or variant');
     G.EnemyMgr.clear();G.Projectiles.clear();G.Combat.clearFields();G.Hazards.clear();
     p._megaEnergy=100;p._megaCooldownRemaining=0;
     if(!api.eligible()||api.formFor(p)?.key!==form.key)throw Error('Recovery gate denied exact form');
     await G.Sprites.preload([form.id],3500,shiny);
     return {dex:p.dex,atk:p.baseAtk,spd:p.baseSpd,cd:p.cdMul,save:JSON.stringify({megaStones:G.DB.save.megaStones,megaForms:G.DB.save.megaForms,megaStoryCleared:G.DB.save.megaStoryCleared,pkmsvvPowerLoadout:G.DB.save.pkmsvvPowerLoadout})};
    },{form,shiny});
    await page.keyboard.press('5',{delay:100});
    await page.waitForFunction(id=>G.Game.player?._megaActive===true&&G.Game.player?._megaFormSprite===id,form.id,{timeout:7000});
    const active=await page.evaluate(()=>{
     const p=G.Game.player;G.EnemyMgr.clear();G.Projectiles.clear();G.Combat.clearFields();G.Hazards.clear();
     let spot;for(let y=-600;y<600&&!spot;y+=48)for(let x=-600;x<600&&!spot;x+=48)if(G.World.isFree(x,y,120)&&G.World.isFree(x+35,y,24)){spot={x,y};break;}
     if(!spot)throw Error('No free combat area');p.x=spot.x;p.y=spot.y;p.aim=0;p.moveAngle=0;
     const m=G.Moves.instance('tackle');m.t=0;p.moves=[m];p.slots=[[m]];p.active=0;
     const e=G.EnemyMgr.add(new G.Enemy({dex:19,hp:10000000,spd:0,dmg:1,xp:1,behavior:'chase'},p.x+35,p.y,{hp:1,spd:1,dmg:1}));G.EnemyMgr.rebuildGrid();p.target=e;
     window.__megaRecoveryTarget={e,hp:e.hp,dmg:p.dmgDealt};
     return {dex:p.dex,anim:p.anim.dex,shiny:!!p.shiny,atk:p.baseAtk,cd:p.cdMul,remaining:p._megaRemaining};
    });
    assert.equal(active.anim,form.id);assert.equal(active.dex,form.dex);assert.equal(active.shiny,shiny);assert.ok(Math.abs(active.cd-original.cd*.7)<1e-8);assert.ok(active.atk>0&&active.atk<10,'scaled attack must remain finite and bounded');
    await page.waitForFunction(()=>{const q=window.__megaRecoveryTarget,p=G.Game.player;return p._megaActive&&q.e.hp<q.hp&&p.dmgDealt>q.dmg;},null,{timeout:12000});
    await page.screenshot({path:path.join(OUT,key+(shiny?'-shiny':'-normal')+'-active.png')});
    const natural=key==='slowbromega'&&!shiny;
    let lifecycle=null;
    if(natural){
     // Keep original combat HP evidence; isolate the remaining timer from
     // unrelated enemy spawns/level-ups. No fake timer or debug speed.
     const before=await page.evaluate(()=>{const p=G.Game.player;G.EnemyMgr.clear();G.Projectiles.clear();G.Combat.clearFields();G.Hazards.clear();p.moves=[];p.slots=[];window.__megaTimerKeep=setInterval(()=>{G.EnemyMgr.clear();G.Projectiles.clear();G.Pickups?.clear?.();},100);G.Game.togglePause();return {remaining:p._megaRemaining,state:G.Game.state,time:G.Game.st?.time};});
     assert.equal(before.state,'paused');
     await page.waitForTimeout(1250);
     const frozen=await page.evaluate(()=>({remaining:G.Game.player._megaRemaining,active:G.Game.player._megaActive,state:G.Game.state}));
     assert.equal(frozen.state,'paused');assert.equal(frozen.active,true);assert.equal(frozen.remaining,before.remaining);
     await page.evaluate(()=>G.Game.togglePause());
     await page.waitForFunction(rem=>G.Game.state==='playing'&&G.Game.player._megaRemaining<rem,before.remaining,{timeout:5000});
     const started=Date.now();
     await page.waitForFunction(()=>G.Game.player._megaActive===false&&G.Game.player._megaCooldownRemaining>0,null,{timeout:55000});
     lifecycle={pausedRemaining:before.remaining,resumed:true,wallMs:Date.now()-started,naturalExpiry:true};
     await page.evaluate(()=>clearInterval(window.__megaTimerKeep));
    }
    const ended=await page.evaluate(natural=>{const p=G.Game.player,q=window.__megaRecoveryTarget,delta=q.hp-q.e.hp,api=G.PKMSVVMegaPhase3;if(!natural)api.stop(p);return {delta,dex:p.dex,anim:p.anim.dex,atk:p.baseAtk,spd:p.baseSpd,cd:p.cdMul,cooldown:p._megaCooldownRemaining,active:!!p._megaActive,save:JSON.stringify({megaStones:G.DB.save.megaStones,megaForms:G.DB.save.megaForms,megaStoryCleared:G.DB.save.megaStoryCleared,pkmsvvPowerLoadout:G.DB.save.pkmsvvPowerLoadout})};},natural);
    assert.ok(ended.delta>0);assert.equal(ended.anim,form.dex);assert.equal(ended.active,false);assert.equal(ended.atk,original.atk);assert.equal(ended.spd,original.spd);assert.ok(Math.abs(ended.cd-original.cd)<1e-8);if(natural)assert.ok(ended.cooldown>=198&&ended.cooldown<=200,'natural expiry starts 200s cooldown');else assert.equal(ended.cooldown,200);assert.deepEqual(errors,[]);
    assert.equal(ended.save,original.save,'Mega and special-power ownership must stay unchanged');delete original.save;delete ended.save;
    reports.push({key,shiny,original,active,ended,lifecycle});fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(reports,null,2));
    console.log('MEGA_RECOVERY_NATIVE_COMBAT='+JSON.stringify(reports.at(-1)));
   }catch(e){const snapshot=await page.evaluate(()=>({state:window.G?.Game?.state,player:window.G?.Game?.player?{dex:G.Game.player.dex,shiny:G.Game.player.shiny,energy:G.Game.player._megaEnergy,mega:G.Game.player._megaActive,anim:G.Game.player.anim?.dex}:null})).catch(()=>null);fs.writeFileSync(path.join(OUT,key+(shiny?'-shiny':'-normal')+'-failure.json'),JSON.stringify({error:String(e),errors,snapshot},null,2));await page.screenshot({path:path.join(OUT,key+(shiny?'-shiny':'-normal')+'-failure.png'),timeout:5000}).catch(()=>{});throw e;}
   finally{await page.close();}
  }
 }finally{try{if(browser)await browser.close();}finally{await server.close();}}})().catch(e=>{console.error(e);process.exitCode=1;});
