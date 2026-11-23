'use strict';
// Reproduce user report 2026-11-24: Mewtwo Explore ends with "game error" at 1:08;
// clicking Host/Join in Co-op sends browser to a blank /ai/game/ URL.
// Run against immutable BEFORE and AFTER skill bundles, no external saves/deploy.
const {chromium}=require('playwright');
const {startServer}=require('../lan-server/server.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=path.resolve(process.env.PKMSVV_INCIDENT_DIST||path.join(__dirname,'../dist/lan'));
 const mode=process.env.PKMSVV_INCIDENT_CASE||'skill-integration';
 const remote=String(process.env.PKMSVV_INCIDENT_REMOTE_URL||'').replace(/\/$/,'');
 const server=remote?null:await startServer({root,host:'127.0.0.1',port:0});
 const base=remote||('http://127.0.0.1:'+server.port);
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[],consoleErrors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
 try{
  const aiPath=path.join(root,'ai/game/index.html');
  const hasAi=remote?true:fs.existsSync(aiPath);
  const hostResponse=await page.request.get(base+'/ai/game/?pkmsvvWifi=1&pkmsvvRole=host&pkmsvvMode=coop');
  const joinResponse=await page.request.get(base+'/ai/game/?pkmsvvWifi=1&pkmsvvRole=join&pkmsvvMode=coop');
  const routing={mode,hasAi,hostStatus:hostResponse.status(),joinStatus:joinResponse.status()};
  console.log('PKMSVV_INCIDENT_COOP_ROUTING='+JSON.stringify(routing));
  if(mode==='fixed-176'){
   assert.equal(hasAi,true,'Co-op Host/Join entry must be physically packaged');
   assert.equal(hostResponse.status(),200,'Host must serve native UI, not blank or 404');
   assert.equal(joinResponse.status(),200,'Join must serve native UI, not blank or 404');
  }else if(!hasAi)assert.equal(hostResponse.status(),404,'Missing /ai/game/ route incorrectly returns success');
  await page.addInitScript(()=>{window.__pkmsvvPippiGuideQABypass=true;});
  await page.goto(base+'/game/',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>!!window.G?.DB?.save&&!!G.PKMSVVQuickRegion?.choose&&!!G.Game?.startRun,null,{timeout:40000});
  const launched=await page.evaluate(()=>{
   Object.assign(G.DB.save,{partner:150,partnerShiny:false,pkmsvvStorySeen:true,pkmsvvNameChosen:true});
   G.MenuUI.open();
   const state=G.Game.state;
   const selected=G.PKMSVVQuickRegion.choose(0);
   return {selected,state,after:G.Game.state,partner:G.DB.save.partner};
  });
  console.log('PKMSVV_INCIDENT_EXPLORE_LAUNCH='+JSON.stringify(launched));
  assert.equal(launched.selected,true,'Explore Kanto region chooser refused a valid start');
  await page.evaluate(()=>{
   window.__pkmsvvIncidentKeeper=setInterval(()=>{
    try{
     const skip=[...document.querySelectorAll('.pkmsvv-berry-overlay button')]
      .find(x=>/Không dùng Berry|No Berry/.test(x.textContent));
     skip?.click();
     const p=G.Game?.player;
     if(p&&!p.dead){p.hp=p.maxHp;p.invuln=Math.max(p.invuln||0,2000);}
     if(G.Game?.state==='levelup'&&G.UI?.isOpen?.('scr-levelup'))
      try{G.RunUI.pick(0)}catch(e){console.warn('Incident levelup failed',e);}
    }catch(e){console.error('INCIDENT_TEST_KEEPER',e)}
   },100);
  });
  await page.waitForFunction(()=>G.Game?.state==='playing',null,{timeout:23000});
  const checkpoints=[];
  for(let i=0;i<20;i++){
   await page.waitForTimeout(5000);
   const st=await page.evaluate(()=>({
    state:G.Game?.state,clock:G.Game?.st?.time??null,
    hp:G.Game?.player?.hp,lv:G.Game?.player?.level,
    skills:G.Game?.player?.moves?.map(m=>m.id),mewtwo:G.Game?.player?.mon?.dex,
    uiToast:[...document.querySelectorAll('[role=status],.toast')].map(e=>e.textContent||'').filter(x=>/lỗi|error/i.test(x)).slice(-3),
    errorOverlay:document.body.innerText.includes('Trò chơi gặp lỗi nhưng tiến trình')
   }));
   checkpoints.push(st);
   if(i===0||i===11||i===14||i===19)console.log('PKMSVV_INCIDENT_EXPLORE_PROGRESS='+JSON.stringify({sec:5*(i+1),...st}));
   const serious=consoleErrors.filter(x=>/\[Game\]|TypeError|ReferenceError|RangeError|Uncaught|game error|error.*update/i.test(x));
   if(st.state==='over'||st.errorOverlay||errors.length||serious.length) {
    console.error('PKMSVV_EXPLORE_CRASH_REPRO='+JSON.stringify({mode,sec:5*(i+1),state:st,errors,serious}));
    throw Error('Explorer runtime crash while Mewtwo alive');
   }
  }
  assert.equal(checkpoints.at(-1).state,'playing');
  console.log('PKMSVV_EXPLORE_100S_PASS='+JSON.stringify({mode,gameTime:checkpoints.at(-1).clock,errors,consoleErrors:consoleErrors.length,coopRouting:routing}));
 }finally{
  await page.evaluate(()=>{clearInterval(window.__pkmsvvIncidentKeeper);G.Game?.quit?.()}).catch(()=>{});
  await browser.close();await server?.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
