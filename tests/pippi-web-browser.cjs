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
    buildButton:!!document.querySelector('#pkmsvv-wiki-overlay [data-research-build]'),
    oldCardsHidden:document.querySelector('#pkmsvv-wiki-overlay .pkmsvv-pc-grid')?.hidden===true};
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
  assert.equal(pc.buildButton,true,'Build mode button must be visible');
  assert.equal(pc.oldCardsHidden,true,'old PC card interface must NOT be shown on entry');
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
  const companion=await js(`(()=>{
    document.querySelector('#pkmsvv-wiki-overlay [data-research-hotspot="companion"]')?.click();
    return {visible:!!document.querySelector('.pkmsvv-pippi-corner'),
     training:[...document.querySelectorAll('[data-pippi-train]')].map(x=>x.dataset.pippiTrain)};
  })()`);
  console.log('PIPPI_WEB_COMPANION='+JSON.stringify(companion));
  assert.equal(companion.visible,true,'PC companion training dialog must open');
  assert.ok(companion.training.includes('cousin'),'Learnable Pikachu cousin skill missing from PC');
  // Keep one Chromium page alive across a real native quit + new Explore.
  // Reloading the page masks the second-run leaks reported by Web players.
  for(let session=1;session<=2;session++){
   if(session===2){
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
   await js("(()=>{const p=G.Game.player;if(p){p.invuln=360;p.hp=p.maxHp;}return true})()");
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
      companion:!document.querySelector('#pkmsvv-pippi-follower')?.hidden,
      popup:!!G.UI?.isOpen?.('scr-levelup'),
      fps:G.PKMSVVHordePerformance?.stats?.fps,
      heap:performance.memory?.usedJSHeapSize
    }))()`);
    if(after.state==='levelup'&&after.popup){
     // Dismiss native skill choices with the real keyboard input. Do NOT
     // auto-select via internal player methods or bypass gameplay logic.
     await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'1',code:'Digit1',
      windowsVirtualKeyCode:49,nativeVirtualKeyCode:49,text:'1'});
     await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'1',code:'Digit1',
      windowsVirtualKeyCode:49,nativeVirtualKeyCode:49});
     await pause(350);
     after=await js("(()=>({t:G.Game?.st?.time,state:G.Game?.state,run:!!G.PKMSVVPippi.run}))()");
    }
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
