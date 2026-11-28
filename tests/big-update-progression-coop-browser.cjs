'use strict';
// Native two independent Chromium profiles, real LAN/WebRTC transport,
// native battle time and result. No forged terminal messages or kill counts.
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const OUT=path.resolve('dist/big-update-progression-qa');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const sites=await Promise.all([0,1].map(()=>startServer({root:path.resolve('dist/lan'),host:'127.0.0.1',port:0})));
 const browser=await chromium.launch({headless:true,executablePath:process.env.PKMSVV_BROWSER||'/usr/bin/google-chrome'});
 const contexts=[],errors=[];
 try{
  for(let i=0;i<2;i++)contexts.push(await browser.newContext({viewport:i===0?{width:1280,height:800}:{width:844,height:390}}));
  const pages=await Promise.all(contexts.map(c=>c.newPage()));
  for(let i=0;i<2;i++){
   const p=pages[i];p.on('pageerror',e=>errors.push(String(e)));
   await p.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;window.WebSocket=function(){throw Error('No external room server allowed');};});
   await p.goto('http://127.0.0.1:'+sites[i].port+'/game/?pkmsvvWifi=1',{waitUntil:'domcontentloaded',timeout:45000});
   await p.waitForFunction(()=>!!G.DB?.save&&!!G.PKMSVVBigUpdateQA?.beginCoop,null,{timeout:40000});
   await p.evaluate(()=>{
    const s=G.DB.save;Object.assign(s,{partner:25,partnerShiny:false,pkmsvvStorySeen:true,pkmsvvNameChosen:true,pkmsvvChapter1Seen:true,pkmsvvChapter2Seen:true,pkmsvvChapter3Seen:true});
    s.owned={...s.owned,25:{at:1}};delete s.owned[19];
    s.pkmsvvMastery={};s.pkmsvvCoopProgress={};
    s.pkmsvvDefeatedDex={...s.pkmsvvDefeatedDex,19:true};
    s.pkmsvvIncubator={level:3,serial:2,active:'egg-1',extra:['egg-2'],eggs:{'egg-1':{dex:19,kills:499,region:0,from:'region-boss'},'egg-2':{dex:175,kills:999,goal:1000,region:9,from:'mission-baby'}},hatched:{}};
    if(G.DB.commit(true)!==true)throw Error('fixture save');G.MenuUI.open();
    window.__coopKeeper=setInterval(()=>{
     [...document.querySelectorAll('.pkmsvv-berry-overlay button')].find(x=>/Không dùng Berry|No Berry/.test(x.textContent))?.click();
     const p=G.Game?.player;if(p&&!p.dead)p.invuln=Math.max(p.invuln||0,2000);
     if(G.UI?.isOpen?.('scr-levelup'))try{G.RunUI.pick(0);}catch(_){}
    },150);
   });
  }
  const [host,guest]=pages;
  const id=await host.evaluate(async()=>{await G.Social.createRoom('coop','private');G.LobbyUI.open();return G.Social.room.id;});
  const offer=await host.evaluate(()=>G.LanBus.invitation()),answer=await guest.evaluate(s=>G.LanBus.answer(s),offer);
  await host.evaluate(s=>G.LanBus.accept(s),answer);
  await guest.evaluate(async id=>{const r=await G.Social.joinRoom(id);if(!r.ok)throw Error(r.error);G.LobbyUI.open();},id);
  await host.evaluate(async()=>{await G.LanBus.request('addBot');await G.LanBus.request('addBot');G.LobbyUI.open();});
  await host.click('#lobby-start');await Promise.all(pages.map(p=>p.waitForFunction(()=>G.Game.state==='playing'&&G.Coop.active,null,{timeout:30000})));
  await host.evaluate(()=>{
   // Spawn a real native enemy close to the player; actual damage/death
   // updates team kills. No direct mutation of kill counters.
   const p=G.Game.player,e=new G.Enemy({dex:19,hp:1,spd:0,dmg:1,xp:1,behavior:'chase'},p.x+30,p.y,{hp:1,spd:1,dmg:1});
   G.EnemyMgr.add(e);G.EnemyMgr.rebuildGrid();e.hurt(10,'#fff');if(!e.dead)throw Error('native enemy did not die');
  });
  await Promise.all(pages.map(p=>p.waitForFunction(()=>G.Game.player.kills>=1,null,{timeout:20000})));
  await host.waitForFunction(()=>G.Game.st.time>=61,null,{timeout:125000});
  const before=await Promise.all(pages.map(p=>p.evaluate(()=>({t:G.Game.st.time,kills:G.Game.player.kills,serial:G.Social.room.matchSerial,host:G.Coop.isHost}))));
  await host.screenshot({path:path.join(OUT,'coop-host-playing.png')});await guest.screenshot({path:path.join(OUT,'coop-client-playing.png')});
  await host.evaluate(()=>G.Game.quit());
  await Promise.all(pages.map(p=>p.waitForFunction(()=>G.DB.save.pkmsvvMastery?.[25]>0&&G.DB.save.pkmsvvIncubator?.eggs?.['egg-1']?.kills===500,null,{timeout:18000})));
  const result=await Promise.all(pages.map(p=>p.evaluate(id=>({mastery:G.DB.save.pkmsvvMastery[25],egg:G.DB.save.pkmsvvIncubator.eggs['egg-1'].kills,rare:G.DB.save.pkmsvvIncubator.eggs['egg-2'].kills,receipt:G.DB.save.pkmsvvCoopProgress[id],state:G.Game.state}),id)));
  assert.equal(result[0].mastery,result[1].mastery);for(const r of result){assert.equal(r.egg,500);assert.equal(r.rare,1000);assert.equal(r.receipt.serial,1);}
  await Promise.all(pages.map(p=>p.evaluate(()=>clearInterval(window.__coopKeeper))));
  // Real mission UI transaction using a completed test mission, not claiming
  // live account rewards. Verify weekly claim + stored egg + no repeat.
  const mission=await host.evaluate(()=>{
   G.MenuUI.open();G.GoalsUI.open('missions');
   const s=G.DB.save;G.Progress.ensure(s);const m=s.missions.weekly[0];m.prog=m.goal;
   const before=s.pkmsvvIncubator.serial,ok=G.Progress.claim(m,true);
   return {ok,claimed:m.claimed,source:s.pkmsvvIncubator.eggs['egg-'+(before+1)]?.from,again:G.Progress.claim(m,true)};
  });
  assert.deepEqual(mission,{ok:true,claimed:true,source:'mission-baby',again:false});
  for(const p of pages)await p.reload({waitUntil:'domcontentloaded'});
  for(const p of pages)await p.waitForFunction(()=>!!G.DB?.save,null,{timeout:40000});
  const reloaded=await Promise.all(pages.map(p=>p.evaluate(id=>({mastery:G.DB.save.pkmsvvMastery[25],egg:G.DB.save.pkmsvvIncubator.eggs['egg-1'].kills,rare:G.DB.save.pkmsvvIncubator.eggs['egg-2'].kills,serial:G.DB.save.pkmsvvCoopProgress[id].serial}),id)));
  for(let i=0;i<2;i++)assert.deepEqual(reloaded[i],{mastery:result[i].mastery,egg:500,rare:1000,serial:1});
  assert.deepEqual(errors,[]);
  const report={before,result,mission,reloaded,transport:'two independent origins, direct WebRTC, 2 humans + 2 bots'};
  fs.writeFileSync(path.join(OUT,'coop-progression.json'),JSON.stringify(report,null,2));console.log('COOP_PROGRESSION_NATIVE_PASS='+JSON.stringify(report));
 }finally{await browser.close();for(const site of sites)await site.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
