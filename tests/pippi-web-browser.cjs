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
  const pc=await js(`(()=>{
   G.MenuUI.open();
   const launcher=document.querySelector('#pkmsvv-menu-wiki');
   if(!launcher)return {missingLauncher:true};
   launcher.click();
   const area=document.querySelector('#pkmsvv-wiki-overlay .pkmsvv-pc-grid');
   return {count:area?.children.length||0,labels:[...(area?.children||[])].map(e=>e.textContent?.trim().slice(0,80)),
    companionButton:!![...(area?.children||[])].find(e=>/Bạn đồng hành|Companions/.test(e.textContent||''))};
  })()`);
  console.log('PIPPI_WEB_PC='+JSON.stringify(pc));
  assert.equal(pc.missingLauncher,undefined,'PC launcher missing from menu');
  assert.equal(pc.count,4,'PC must contain all four tiles');
  assert.equal(pc.companionButton,true,'Fourth Bạn đồng hành tile must be visible');
  const companion=await js(`(()=>{
    const item=[...document.querySelectorAll('#pkmsvv-wiki-overlay .pkmsvv-pc-card')]
     .find(e=>/Bạn đồng hành|Companions/.test(e.textContent||''));
    item?.click();
    return {visible:!!document.querySelector('.pkmsvv-pippi-corner'),
     training:[...document.querySelectorAll('[data-pippi-train]')].map(x=>x.dataset.pippiTrain)};
  })()`);
  console.log('PIPPI_WEB_COMPANION='+JSON.stringify(companion));
  assert.equal(companion.visible,true,'PC companion training dialog must open');
  assert.ok(companion.training.includes('cousin'),'Learnable Pikachu cousin skill missing from PC');
  for(let session=1;session<=2;session++){
   if(session===2){
    await cmd('Page.reload',{ignoreCache:true});
    await until(()=>js('!!window.G?.PKMSVVWiki&&!!window.G?.PKMSVVPippi&&!!window.G?.PKMSVVQuickRegion'),35000);
   }
   await js(`(()=>{
    G.PKMSVVWiki?.close?.();
    G.DB.save.partner=25;
    G.DB.save.pkmsvvStorySeen=true;
    G.DB.save.pkmsvvNameChosen=true;
    G.MenuUI.open();
    return G.PKMSVVQuickRegion.choose(0);
   })()`).then(x=>assert.equal(x,true,'Explore must launch'));
   await until(async()=>{
    await js(`(()=>{
      const btn=[...document.querySelectorAll('.pkmsvv-berry-overlay button')]
       .find(x=>/Không dùng Berry|No Berry/.test(x.textContent));
      btn?.click();
      return true;
    })()`);
    return js("G.Game?.state==='playing'");
   },30000);
   await js("(()=>{const p=G.Game.player;if(p){p.invuln=120;p.hp=p.maxHp;}return true})()");
   const before=await js("(()=>({t:G.Game?.st?.time,enemy:G.EnemyMgr?.count,pc:!!G.PKMSVVWiki,pippi:!!G.PKMSVVPippi,run:!!G.PKMSVVPippi.run}))()");
   await pause(8500);
   const after=await js("(()=>({t:G.Game?.st?.time,enemy:G.EnemyMgr?.count,state:G.Game?.state,pc:!!G.PKMSVVWiki,pippi:!!G.PKMSVVPippi,run:!!G.PKMSVVPippi.run,vis:!!document.querySelector('#pkmsvv-pippi-follower')}))()");
   console.log('PIPPI_WEB_SESSION_'+session+'='+JSON.stringify({before,after,exceptions:exceptions.slice(-4),warnings:warnings.slice(-6)}));
   assert.equal(after.state,'playing','Explore crashed in session '+session);
   assert.ok(after.t-before.t>=3,'Combat timer stopped or main thread overloaded in session '+session);
   assert.equal(after.run,true,'Pippi companion loop did not initialize');
   assert.equal(exceptions.length,0,'Unhandled browser exception: '+JSON.stringify(exceptions.slice(-4)));
   assert.ok(warnings.filter(x=>/\[Pippi\] frame guarded|\[Game\]/.test(x)).length<3,
    'Repeated guarded engine failures: '+JSON.stringify(warnings.slice(-6)));
  }
  console.log('PASS PIPPI_WEB_PC_4_TILES_AND_TWO_EXPLORE_SESSIONS');
 }finally{
  try{socket?.close()}catch(_){}
  child.kill('SIGKILL');server.close();
  try{fs.rmSync(folder,{recursive:true,force:true,maxRetries:4,retryDelay:150})}catch(_){}
 }
}
main().catch(err=>{console.error(err);process.exitCode=1});
