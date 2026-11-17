'use strict';
/* End-to-end Pippi Web QA. Tests the actual HTML load order, PC menu link,
 * the fourth tile, and two Explore sessions (not just source strings).
 * No real user save and no production host access.
 */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),
 os=require('node:os'),assert=require('node:assert/strict');
const {spawn,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..',process.env.PKMSVV_BROWSER_ROOT||'dist/cloudflare-v20-release');
const pause=n=>new Promise(r=>setTimeout(r,n));
async function until(fn,ms=25000){
 const deadline=Date.now()+ms;
 while(Date.now()<deadline){try{const v=await fn();if(v)return v}catch(_){ }await pause(250)}
 throw Error('Browser check timed out');
}
const server=http.createServer((req,res)=>{
 let file;
 try{
  const name=new URL(req.url,'http://localhost').pathname;
  file=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));
  if(!file.startsWith(root+path.sep))throw Error('Outside QA directory');
 }catch(_){res.writeHead(403).end();return}
 fs.stat(file,(err,st)=>{
  if(err||!st?.isFile()){res.writeHead(404).end();return}
  const ext=path.extname(file);
  const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css',
   '.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
  res.writeHead(200,{'content-type':mime[ext]||'application/octet-stream',
   'cache-control':'no-store'});fs.createReadStream(file).pipe(res);
 });
});
async function main(){
 const chrome=process.env.PKMSVV_BROWSER||'google-chrome';
 assert.equal(spawnSync('which',[chrome]).status,0,'Chrome/Chromium required');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'pkmsvv-pippi-web-'));
 const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu',
  '--disable-dev-shm-usage','--no-first-run','--remote-allow-origins=*',
  '--remote-debugging-port=0','--user-data-dir='+folder,'about:blank'],{stdio:'ignore'});
 let socket=null;
 try{
  const portFile=path.join(folder,'DevToolsActivePort');
  await until(()=>fs.existsSync(portFile),20000);
  const port=Number(fs.readFileSync(portFile,'utf8').split('\n')[0]);
  const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true})});
  let id=0;const requests=new Map(),exceptions=[],warnings=[];
  socket.addEventListener('message',ev=>{
   let m;try{m=JSON.parse(String(ev.data))}catch(_){return}
   if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params?.exceptionDetails?.exception?.description||'unknown JS exception');
   if(m.method==='Runtime.consoleAPICalled'&&['warning','error'].includes(m.params?.type)){
    const msg=(m.params.args||[]).map(x=>x.value??x.description??'').join(' ').slice(0,1100);
    if(/Pippi|Game|PC menu|Uncaught|TypeError|Error:|RangeError/i.test(msg))warnings.push(msg);
   }
   const task=requests.get(m.id);
   if(task){requests.delete(m.id);m.error?task.reject(Error(m.error.message)):task.resolve(m.result)}
  });
  function cmd(method,params={}){
   return new Promise((resolve,reject)=>{
    const key=++id,t=setTimeout(()=>{requests.delete(key);reject(Error('CDP timeout '+method))},20000);
    requests.set(key,{resolve:v=>{clearTimeout(t);resolve(v)},reject:e=>{clearTimeout(t);reject(e)}});
    socket.send(JSON.stringify({id:key,method,params}));
   });
  }
  async function js(expression){
   const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
   if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
   return r.result.value;
  }
  await cmd('Runtime.enable');await cmd('Page.enable');
  await cmd('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/ai/game/'});
  await until(()=>js('!!window.G?.MenuUI&&!!window.G?.PKMSVVWiki&&!!window.G?.PKMSVVPippi&&!!window.G?.PKMSVVBox3'),35000);
  const installed=await js(`(()=>({wiki:!!G.PKMSVVWiki,pippi:!!G.PKMSVVPippi,
   companion:typeof G.PKMSVVWiki?.pippiCorner,game:G.Game?.state,
   menu:!!document.querySelector('#pkmsvv-menu-wiki'),
   scripts:[...document.scripts].filter(s=>/pkmsvv-wiki|pkmsvv-pippi/.test(s.src)).map(s=>s.src)}))()`);
  console.log('PIPPI_WEB_MODULES='+JSON.stringify(installed));
  assert.equal(installed.companion,'function','Companion PC handler absent from executing browser runtime');
  const seed=async()=>js(`(()=>{
   // The preview opens at the welcome UI, before any profile is selected.
   // Build a disposable valid local profile, not an actual user save.
   // Preserve all native save defaults. Replacing the whole default object
   // with a partial Gacha fixture breaks native MenuUI.open() and falsely
   // reports a Pippi combat crash (e.g. undefined.toLocaleString).
   const native=G.DB?.save;
   if(!native||typeof native!=='object')
    throw Error('Native DB save must be initialized before Pippi QA fixture');
   const raw={...native,owned:{...native.owned,25:{at:1,from:'starter'}},
    shiny:{...native.shiny},partner:25,starter:25,partnerShiny:false,
    name:'Pippi Browser QA',coins:5000,
    stats:{...native.stats,runs:1,bestTime:100,bestLevel:1,kills:0},
    pkmsvvStorySeen:true,pkmsvvNameChosen:true};
   const fixture=G.PKMSVVBox?.migrate?.(raw)?.save||raw;
   Object.defineProperty(G.DB,'save',{value:fixture,configurable:true,writable:true});
   G.DB.commit=()=>true;
   return {partner:G.DB.save.partner,valid:!!G.DEX_BY?.[G.DB.save.partner],nativeKeys:Object.keys(native),fixtureKeys:Object.keys(fixture)};
  })()`);
  assert.equal((await seed()).valid,true,'Browser fixture must have real in-game Pokémon');
  const pc=await js(`(()=>{
   // Initial native UI already has the PC launcher. A disposable save need
   // not re-render every account/profile statistic in the main menu.
   const launcher=document.querySelector('#pkmsvv-menu-wiki');
   if(!launcher)return {missingLauncher:true};
   launcher.click();
   const area=document.querySelector('#pkmsvv-wiki-overlay .pkmsvv-pc-grid');
   return {count:area?.children.length||0,labels:[...(area?.children||[])].map(e=>e.textContent?.trim().slice(0,80)),
    companionButton:!![...(area?.children||[])].find(e=>/Bạn đồng hành|Companions/.test(e.textContent||'')),
    labVisible:!!document.querySelector('#pkmsvv-wiki-overlay [data-pkmsvv-research-hub]'),
    pippiTalk:!!document.querySelector('#pkmsvv-wiki-overlay [data-research-pippi-talk]'),
    roomVersion:document.querySelector('#pkmsvv-wiki-overlay [data-pkmsvv-research-hub]')?.dataset.pkmsvvResearchHub,
    hotspots:[...document.querySelectorAll('#pkmsvv-wiki-overlay [data-research-hotspot]')].map(b=>b.dataset.researchHotspot),
    sceneProps:[...document.querySelectorAll('#pkmsvv-wiki-overlay [data-research-object]')].map(p=>p.dataset.researchObject),
    companionEgg:!!document.querySelector('#pkmsvv-wiki-overlay [data-research-hotspot="companion"] [data-research-object="companion"] svg'),
    floatingBadgeIcons:document.querySelectorAll('#pkmsvv-wiki-overlay .pkmsvv-research-hotspot-tag .pkmsvv-research-glyph').length,
    buildButton:!!document.querySelector('#pkmsvv-wiki-overlay [data-research-build]'),
    oldCardsHidden:document.querySelector('#pkmsvv-wiki-overlay .pkmsvv-pc-grid')?.hidden===true,
    roomArtMode:document.querySelector('#pkmsvv-wiki-overlay .pkmsvv-research-room')?.dataset.researchArtMode,
    furniture:[...document.querySelectorAll('#pkmsvv-wiki-overlay .pkmsvv-lab-furniture')].map(x=>x.dataset.furniture)};
  })()`);
  console.log('PIPPI_WEB_PC='+JSON.stringify(pc));
  assert.equal(pc.missingLauncher,undefined,'PC launcher missing from menu');
  assert.equal(pc.count,5,'Research Lab retains five previous PC sections');
  assert.ok(pc.labels.some(x=>/Hồi sinh hóa thạch|Fossil Restoration/.test(x)),'fifth fossil lab tile missing');
  assert.equal(pc.companionButton,true,'Fourth Bạn đồng hành tile must be visible');
  assert.equal(pc.labVisible,true,'research room art visible directly in the hub');
  assert.equal(pc.pippiTalk,true,'Pippi research director dialogue must be available');
  assert.equal(pc.roomVersion,'2','research room must be the default full interactive scene');
  assert.deepEqual(pc.hotspots,['support','mega','berry','companion','fossil'],'five clickable research machines');
  assert.deepEqual(pc.sceneProps,['support','mega','berry','companion'],'four distinct furnishings must be in the actual room image layer');
  assert.equal(pc.companionEgg,true,'large egg in lower room must be the tappable companion station');
  assert.equal(pc.floatingBadgeIcons,0,'floating labels must be text, not oversized sprite icons');
  assert.equal(pc.buildButton,true,'Build mode button must be visible');
  assert.equal(pc.oldCardsHidden,true,'old PC card interface must NOT be shown on entry');
  assert.equal(pc.roomArtMode,'classic','Research Lab must restore its detailed original hand-painted artwork');
  assert.ok(pc.furniture.includes('machine_old'),'furniture registry remains available for later extraction');
  const classicArt=await js(`getComputedStyle(document.querySelector('#pkmsvv-wiki-overlay .pkmsvv-research-room')).backgroundImage`);
  assert.match(classicArt,/room_art_qa_v2\\.webp/,'original detailed room art must actually be visible');
  const tourOnEnter=await js(`(()=>{
   const intro=G.PKMSVVPippiGuide?.current;
   const wasOpen=G.PKMSVVPippiGuide?.isOpen;
   if(intro?.kind==='laboratory'){
    for(let i=0;i<intro.total;i++)G.PKMSVVPippiGuide.next();
   }
   return {kind:intro?.kind,pages:intro?.total,wasOpen,
    completed:G.DB.save.pkmsvvPippiGuide?.laboratory===true,
    closed:!G.PKMSVVPippiGuide?.isOpen};
  })()`);
  console.log('PIPPI_LAB_TOUR_ON_ENTRY='+JSON.stringify(tourOnEnter));
  assert.equal(tourOnEnter.wasOpen,true,'first Research Lab entry should show Pippi immediately');
  assert.equal(tourOnEnter.kind,'laboratory');
  assert.equal(tourOnEnter.pages,4);
  assert.equal(tourOnEnter.completed,true);
  assert.equal(tourOnEnter.closed,true);
  const nativeMenuFix=await js(`(()=>{
   const button=document.querySelector('#pkmsvv-menu-wiki');
   const old=button.onclick;let oldHandlerFired=false;
   G.PKMSVVWiki.close();
   try{
    button.onclick=()=>{oldHandlerFired=true;};
    button.click();
    const title=document.querySelector('#pkmsvv-wiki-overlay h2')?.textContent;
    const lab=document.querySelector('#pkmsvv-wiki-overlay [data-pkmsvv-research-hub]')?.dataset.pkmsvvResearchHub;
    const img=button.querySelector('.pkmsvv-research-menu-image');
    return {oldHandlerFired,title,lab,square:img?.width===42&&img?.height===42,
      image:!!img,iconStyle:img?getComputedStyle(img).objectFit:null,
      windowCapture:!!window.__pkmsvvResearchEntryCapture};
   }finally{button.onclick=old;}
  })()`);
  console.log('RESEARCH_LAB_STALE_HANDLER_PROTECTION='+JSON.stringify(nativeMenuFix));
  assert.equal(nativeMenuFix.oldHandlerFired,false,'legacy PC onclick must never hijack Research Lab');
  assert.equal(nativeMenuFix.lab,'2','menu launcher must open the actual illustrated room');
  assert.match(nativeMenuFix.title,/PHÒNG NGHIÊN CỨU|RESEARCH LAB/);
  assert.equal(nativeMenuFix.image,true,'menu icon must be a real square image');
  assert.equal(nativeMenuFix.square,true,'research icon must preserve its native 42x42 size');
  assert.equal(nativeMenuFix.iconStyle,'contain','research icon must not stretch or squash');
  assert.equal(nativeMenuFix.windowCapture,true);
  const megaFlow=await js(`(()=>{
   G.PKMSVVWiki.open();
   document.querySelector('#pkmsvv-wiki-overlay [data-research-hotspot="mega"]')?.click();
   const box=document.querySelector('#pkmsvv-mega-phase1');
   const opened=!!box&&!box.hidden,button=box?.querySelector('[data-mega-close]');
   const text=button?.textContent||'';
   if(opened)button.click();
   return {opened,backText:text,returned:!!document.querySelector('#pkmsvv-wiki-overlay [data-pkmsvv-research-hub]')};
  })()`);
  console.log('RESEARCH_LAB_MEGA_RETURN='+JSON.stringify(megaFlow));
  assert.equal(megaFlow.opened,true,'Mega station MUST open; do not silently skip return test');
  if(megaFlow.opened){
   assert.match(megaFlow.backText,/Phòng nghiên cứu|Research Lab/);
   assert.equal(megaFlow.returned,true,'Mega close must return to Research Lab when opened from room');
  }
  const supportFlow=await js(`(()=>{
   G.PKMSVVWiki.open();
   document.querySelector('#pkmsvv-wiki-overlay [data-research-hotspot="support"]')?.click();
   const box=document.querySelector('#pkmsvv-support-catalog');
   const opened=!!box&&!box.hidden,button=box?.querySelector('.pkmsvv-support-modal-head button');
   const text=button?.textContent||'';
   if(opened)button.click();
   return {opened,backText:text,returned:!!document.querySelector('#pkmsvv-wiki-overlay [data-pkmsvv-research-hub]')};
  })()`);
  console.log('RESEARCH_LAB_SUPPORT_RETURN='+JSON.stringify(supportFlow));
  assert.equal(supportFlow.opened,true,'Support station MUST open; do not silently skip return test');
  if(supportFlow.opened){
   assert.match(supportFlow.backText,/Phòng nghiên cứu|Research Lab/);
   assert.equal(supportFlow.returned,true,'Support close must return to Research Lab when opened from room');
  }
  const buildMode=await js(`(()=>{
   const previous=JSON.stringify(G.DB.save);
   document.querySelector('#pkmsvv-wiki-overlay [data-research-build]')?.click();
   const panel=document.querySelector('#pkmsvv-wiki-overlay .pkmsvv-build-panel');
   const spots=[...document.querySelectorAll('#pkmsvv-wiki-overlay [data-build-slot]')].map(b=>b.dataset.buildSlot);
   document.querySelector('#pkmsvv-wiki-overlay [data-build-slot="trophy"]')?.click();
   const item=[...document.querySelectorAll('#pkmsvv-wiki-overlay [data-build-equip]')];
   const allDisabled=item.every(b=>b.disabled);
   const unchanged=previous===JSON.stringify(G.DB.save);
   document.querySelector('#pkmsvv-wiki-overlay [data-back]')?.click();
   return {visible:!!panel,spots,allDisabled,unchanged,
    returned:!!document.querySelector('#pkmsvv-wiki-overlay [data-pkmsvv-research-hub]')};
  })()`);
  console.log('PIPPI_WEB_LAB_BUILD='+JSON.stringify(buildMode));
  assert.equal(buildMode.visible,true,'Build mode opens separately from room');
  assert.equal(buildMode.spots.length,8,'all eight fixed decoration slots exist');
  assert.equal(buildMode.allDisabled,true,'unfinished furniture cannot be bought or equipped');
  assert.equal(buildMode.unchanged,true,'preview building must not touch game save');
  assert.equal(buildMode.returned,true,'Build back button returns directly to room');
  const store=await js(`(()=>{
    G.PKMSVVWiki.coopShop();
    const text=document.querySelector('#pkmsvv-wiki-overlay .pkmsvv-coop-shop-panel')?.textContent||'';
    const exchange=document.querySelector('#pkmsvv-wiki-overlay [data-coop-exchange]');
    const items=[...document.querySelectorAll('#pkmsvv-wiki-overlay [data-coop-shop-item]')];
    const wallet=G.PKMSVVCoopEconomy?.normal?.(G.DB.save);
    const noFakeSettlement=G.PKMSVVCoopEconomy?.settle===undefined;
    const lockedItems=items.length>0&&items.every(b=>b.disabled);
    document.querySelector('#pkmsvv-wiki-overlay [data-back]')?.click();
    return {opened:!!text,exchangeDisabled:!!exchange?.disabled,lockedItems,
      walletCoins:wallet?.coopCoins,noFakeSettlement,returned:!!document.querySelector('#pkmsvv-wiki-overlay [data-pkmsvv-research-hub]')};
  })()`);
  console.log('PIPPI_WEB_COOP_SHOP='+JSON.stringify(store));
  assert.equal(store.opened,true,'Co-op store panel missing');
  assert.equal(store.noFakeSettlement,true,'Client must never expose reward settlement to fake completed missions');
  assert.equal(store.lockedItems,true,'Unused tools and missing costumes must remain non-purchasable');
  assert.equal(store.returned,true,'Shop back must return to research room');
  const fossils=await js(`(()=>{
    G.PKMSVVWiki.fossilRestoration();
    const rows=[...document.querySelectorAll('#pkmsvv-wiki-overlay .pkmsvv-fossil-row')];
    const unknown=rows.filter(row=>row.dataset.fossilState==='unknown');
    const stones=unknown.filter(row=>row.querySelector('.pkmsvv-fossil-stone.undiscovered'));
    const pokemonLeaks=unknown.filter(row=>row.querySelector('canvas'));
    const progress=document.querySelector('#pkmsvv-wiki-overlay [data-fossil-achievement]')?.textContent;
    document.querySelector('#pkmsvv-wiki-overlay [data-back]')?.click();
    return {rows:rows.length,unknown:unknown.length,blackStones:stones.length,
      pokemonLeaks:pokemonLeaks.length,progress,returned:!!document.querySelector('#pkmsvv-wiki-overlay [data-pkmsvv-research-hub]')};
  })()`);
  console.log('PIPPI_WEB_FOSSIL_STONES='+JSON.stringify(fossils));
  assert.equal(fossils.rows,15,'all 15 fossil recipes must render');
  assert.ok(fossils.blackStones>0,'undiscovered fossil art must be black');
  assert.equal(fossils.pokemonLeaks,0,'never expose species art before restoring the fossil');
  assert.match(fossils.progress,/Nhà khảo cổ vĩ đại|Great Archaeologist/);
  assert.equal(fossils.returned,true);
  const companion=await js(`(()=>{
    document.querySelector('#pkmsvv-wiki-overlay [data-research-hotspot="companion"]')?.click();
    return {visible:!!document.querySelector('.pkmsvv-pippi-corner'),
     training:[...document.querySelectorAll('[data-pippi-train]')].map(x=>x.dataset.pippiTrain)};
  })()`);
  console.log('PIPPI_WEB_COMPANION='+JSON.stringify(companion));
  assert.equal(companion.visible,true,'PC companion training dialog must open');
  assert.ok(companion.training.includes('cousin'),'Learnable Pikachu cousin skill missing from PC');
  const fossilMission=await js(`(()=>{
    const api=G.PKMSVVFossilMissionQA;
    const installed=api?.install?.()===true||
     !!document.getElementById('pkmsvv-quick-fossil-lab');
    const card=document.getElementById('pkmsvv-quick-fossil-lab');
    const title=card?.querySelector('.pkmsvv-mode-title')?.textContent||'';
    const mode=card?.dataset.coopMission;
    const before=JSON.stringify(G.DB?.save);
    card?.click();
    const overlay=document.getElementById('pkmsvv-coop-fossil-info');
    const text=overlay?.textContent||'';
    overlay?.querySelector('button')?.click();
    return {installed,title,mode,modal:!!overlay,
      explainedLocked:/Chưa thể bắt đầu|Not playable/.test(text),
      noSaveMutation:before===JSON.stringify(G.DB?.save),
      playable:api?.playable};
   })()`);
  console.log('PIPPI_WEB_FOSSIL_COOP_MISSION='+JSON.stringify(fossilMission));
  assert.equal(fossilMission.installed,true,'Co-op Fossil Expedition must be a visible fifth mode tile');
  assert.match(fossilMission.title,/Khai quật hóa thạch|Fossil Expedition/);
  assert.equal(fossilMission.mode,'fossil_lab');
  assert.equal(fossilMission.modal,true,'Fossil Expedition must explain objectives');
  assert.equal(fossilMission.explainedLocked,true,'Do not pretend unreleased Co-op mission is playable');
  assert.equal(fossilMission.noSaveMutation,true,'Co-op mission preview must not award coins or edit a save');
  assert.equal(fossilMission.playable,false);
  if(process.env.PKMSVV_PIPPI_UI_ONLY==='1'){
   console.log('PASS PIPPI_RESEARCH_UI_2_2_COOP_FOSSIL_MODULAR_PREVIEW');
   return;
  }
  // Keep one Chromium page alive across a real native quit + new Explore.
  // Reloading the page masks the second-run leaks reported by Web players.
  for(let session=1;session<=2;session++){
   if(session===2){
    await js("(()=>{if(window.__pkmsvvQaSurvivor){clearInterval(window.__pkmsvvQaSurvivor);window.__pkmsvvQaSurvivor=null;}return true})()");
    const exit=await js("(()=>{G.Game.quit();G.MenuUI.open();return {state:G.Game?.state,region:G.PKMSVVQuickRegion?.active}})()");
    console.log('PIPPI_WEB_NATIVE_QUIT='+JSON.stringify(exit));
    await until(()=>js("G.Game?.state!=='playing'&&G.PKMSVVPippi?.run===null"),10000);
    assert.equal(await js("!!G.PKMSVVQuickRegion?.active"),false,
     'First Explore still owns Region after native quit');
   }
   const kickoff=await js(`(()=>{
    G.PKMSVVWiki?.close?.();
    G.DB.save.partner=25;
    G.DB.save.pkmsvvStorySeen=true;
    G.DB.save.pkmsvvNameChosen=true;
    // This is the verified native menu setup used by Stage-4 Chromium QA.
    // A synthetic save has no account-entry action to re-render the menu.
    G.MenuUI.open();
    return {started:G.PKMSVVQuickRegion.choose(0),
     state:G.Game?.state,berry:G.PKMSVVBerry?.choosing};
   })()`);
   console.log('PIPPI_WEB_KICKOFF_'+session+'='+JSON.stringify(kickoff));
   assert.equal(kickoff.started,true,'Explore must launch in session '+session);
   await until(async()=>{
    await js(`(()=>{
      const btn=[...document.querySelectorAll('.pkmsvv-berry-overlay button')]
       .find(x=>/Không dùng Berry|No Berry/.test(x.textContent));
      btn?.click();
      return true;
    })()`);
    return js("G.Game?.state==='playing'");
   },30000);
   // This tests companion lifecycle/crashes, not whether a stationary
   // disposable Pikachu can survive the crowd. Native damage/respawn can
   // overwrite a one-shot invuln=360 during a long randomized session.
   // Keep HP safe without bypassing Pippi combat, skill selection or spawns.
   await js("(()=>{if(window.__pkmsvvQaSurvivor)clearInterval(window.__pkmsvvQaSurvivor);window.__pkmsvvQaSurvivor=setInterval(()=>{const p=G.Game?.player;if(p&&G.Game?.state==='playing'&&!p.dead){p.hp=p.maxHp;p.invuln=Math.max(Number(p.invuln)||0,100000);}},100);const p=G.Game.player;if(p){p.invuln=100000;p.hp=p.maxHp;}return true})()");
   const before=await js("(()=>({t:G.Game?.st?.time,pc:!!G.PKMSVVWiki,pippi:!!G.PKMSVVPippi,run:!!G.PKMSVVPippi.run}))()");
   const interval=5000,rounds=session===1?
    (Number(process.env.PKMSVV_PIPPI_FIRST_ROUNDS)||30):
    (Number(process.env.PKMSVV_PIPPI_SECOND_ROUNDS)||9);
   let after=before;
   for(let i=0;i<rounds;i++){
    await pause(interval);
    after=await js(`(()=>({
      t:G.Game?.st?.time,state:G.Game?.state,
      enemies:G.EnemyMgr?.count,run:!!G.PKMSVVPippi.run,
      hp:G.Game?.player?.hp,dead:!!G.Game?.player?.dead,
      region:!!G.PKMSVVQuickRegion?.active,
      companion:!document.querySelector('#pkmsvv-pippi-follower')?.hidden,
      popup:!!G.UI?.isOpen?.('scr-levelup'),
      fps:G.PKMSVVHordePerformance?.stats?.fps,
      heap:performance.memory?.usedJSHeapSize
    }))()`);
    // Native EXP can queue multiple legitimate level-up choices within
    // one 5-second sample. Drain each with the REAL keyboard handler.
    // Do not falsely label back-to-back level-ups as a crash, but continue
    // to fail on a stuck popup, missing Pippi or an actual engine error.
    let selectedSkills=0;
    while(after.state==='levelup'&&after.popup&&selectedSkills<12){
     await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'1',code:'Digit1',
      windowsVirtualKeyCode:49,nativeVirtualKeyCode:49,text:'1'});
     await pause(140);
     await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'1',code:'Digit1',
      windowsVirtualKeyCode:49,nativeVirtualKeyCode:49});
     await pause(350);
     selectedSkills++;
     after=await js("(()=>({t:G.Game?.st?.time,state:G.Game?.state,run:!!G.PKMSVVPippi.run,popup:!!G.UI?.isOpen?.('scr-levelup')}))()");
    }
    if(selectedSkills)console.log('PIPPI_WEB_QUEUED_LEVELUPS_'+session+'_'+(i+1)+'='+JSON.stringify({selectedSkills,after}));
    assert.ok(selectedSkills<12||after.state==='playing',
     'Native level-up stuck after 12 legitimate selections: '+JSON.stringify(after));
    if(i<2||i%6===5||i===rounds-1)
     console.log('PIPPI_WEB_SESSION_'+session+'_CHECK_'+(i+1)+'='+JSON.stringify(after));
    assert.equal(after.state,'playing','Explore stopped in session '+session+' at checkpoint '+(i+1));
    assert.equal(after.run,true,'Pippi detached while Explore was playing');
    assert.equal(exceptions.length,0,'Unhandled Chromium exception: '+JSON.stringify(exceptions.slice(-4)));
    const guarded=warnings.filter(x=>/\[Pippi\] frame guarded|\[Game\]/.test(x));
    assert.ok(guarded.length<3,'Repeated caught frame errors: '+JSON.stringify(guarded.slice(-4)));
   }
   console.log('PIPPI_WEB_SESSION_'+session+'='+JSON.stringify({before,after,
    errors:exceptions.slice(-4),warnings:warnings.slice(-6)}));
   assert.ok(Number(after.t)-Number(before.t)>=(session===1?Math.max(8,rounds*3.5):Math.max(8,rounds*3.5)),
    'Combat simulation slowed or froze in session '+session);
   assert.equal(after.run,true,'Pippi companion failed to initialize in session '+session);
  }
  console.log('PASS PIPPI_WEB_PC_4_TILES_AND_TWO_EXPLORE_SESSIONS');
 }finally{
  try{socket?.close()}catch(_){}
  child.kill('SIGKILL');server.close();
  try{fs.rmSync(folder,{recursive:true,force:true,maxRetries:4,retryDelay:150})}catch(_){}
 }
}
main().catch(err=>{console.error(err);process.exitCode=1});
