'use strict';
/* Browser-level smoke test for /ai/: no Playwright install, uses Chrome DevTools
 * Protocol directly via ws (already a project dependency).
 */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn,spawnSync}=require('node:child_process'),{WebSocket}=require('ws');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist/cloudflare');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png',
 '.webp':'image/webp','.svg':'image/svg+xml','.ogg':'audio/ogg','.ico':'image/x-icon','.woff2':'font/woff2'};
const sleep=t=>new Promise(r=>setTimeout(r,t));
async function waitFor(fn,timeout=22000,label='state'){
 const end=Date.now()+timeout;let last;
 while(Date.now()<end){try{const v=await fn();if(v)return v;last=v;}catch(e){last=e;}await sleep(250);}
 throw Error('Timed out waiting for '+label+': '+String(last));
}
const server=http.createServer((req,res)=>{
 let target;try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=pathname.endsWith('/')?pathname+'index.html':pathname;target=path.resolve(root,'.'+file);
  if(!target.startsWith(root+path.sep))throw Error('path');
 }catch(e){res.writeHead(403).end();return;}
 fs.stat(target,(err,stat)=>{
  if(err||!stat.isFile()){res.writeHead(404).end();return;}
  res.writeHead(200,{'content-type':MIME[path.extname(target)]||'application/octet-stream'});
  fs.createReadStream(target).pipe(res);
 });
});
const getJSON=url=>new Promise((resolve,reject)=>{
 http.get(url,r=>{let text='';r.on('data',b=>text+=b);r.on('end',()=>{try{resolve(JSON.parse(text));}catch(e){reject(e);}});}).on('error',reject);
});
function browserName(){
 for(const bin of [process.env.PKMSVV_BROWSER,'google-chrome','chromium','chromium-browser'].filter(Boolean)){
  if(bin.startsWith('/')){if(fs.existsSync(bin))return bin;continue;}
  if(spawnSync('which',[bin],{encoding:'utf8'}).status===0)return bin;
 }
 throw Error('No Chrome/Chromium found for browser AI smoke test');
}
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port,dir=fs.mkdtempSync(path.join(os.tmpdir(),'pkmsvv-chrome-ai-'));
 const chrome=spawn(browserName(),['--headless=new','--disable-gpu','--disable-dev-shm-usage','--no-sandbox',
  '--no-first-run','--no-default-browser-check','--remote-allow-origins=*','--remote-debugging-port=0',
  '--user-data-dir='+dir,'about:blank'],{stdio:'ignore'});
 let ws;
 try{
  const file=path.join(dir,'DevToolsActivePort');
  await waitFor(()=>fs.existsSync(file),12000,'Chrome debugging port');
  const debugPort=Number(fs.readFileSync(file,'utf8').split('\n')[0]);
  const targets=await getJSON('http://127.0.0.1:'+debugPort+'/json/list');
  const page=targets.find(t=>t.type==='page');
  assert.ok(page?.webSocketDebuggerUrl,'Chrome page target');
  ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
  let next=0;const pending=new Map(),exceptions=[];
  ws.on('message',raw=>{
   let m;try{m=JSON.parse(String(raw));}catch(_){return;}
   if(m.method==='Runtime.exceptionThrown'){const e=m.params.exceptionDetails||{};exceptions.push(e.exception?.description||e.text||'Browser exception');}
   const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}
  });
  const cmd=(method,params={})=>new Promise((resolve,reject)=>{
   const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression=>{
   const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
   if(r.exceptionDetails)throw Error(r.exceptionDetails.text);
   return r.result.value;
  };
  await cmd('Runtime.enable');await cmd('Page.enable');
  for(const mode of ['coop','royale','eggrush']){
   await cmd('Page.navigate',{url:'http://127.0.0.1:'+port+'/ai/?mode='+mode});
   const roster=await waitFor(()=>evaluate(`(()=>{const r=window.G?.Social?.room;return r?.mode==='${mode}'&&r?.members?.some(m=>m.bot)?{mode:r.mode,count:r.members.length,bots:r.members.filter(m=>m.bot).length}:null;})()`),30000,'AI lobby '+mode);
   assert.equal(roster.mode,mode);assert.ok(roster.bots>=1);
   // Regression: previously /ai/game/ inherited upstream's five-second
   // version.json reload loop, even after a Co-op match had finished.
   // All three standalone AI modes must use the inert offline updater.
   const updater=await evaluate(`(async()=>({
    policy:G.Updater?.policy,
    pending:G.Updater?.pending,
    checked:await G.Updater?.check()
   }))()`);
   assert.equal(updater.policy,'manual-on-next-open',
    'AI mode '+mode+' must never auto-reload when /game/version.json differs');
   assert.equal(updater.pending,false);
   assert.equal(updater.checked,false);
   const status=await evaluate(`(()=>{const b=document.querySelector('#lobby-start');return {exists:!!b,disabled:b?.disabled};})()`);
   assert.equal(status.exists,true,'Start button exists for '+mode);
   const before=await evaluate(`(()=>({game:G.Game.state,room:G.Social.room?.mode,disabled:document.querySelector('#lobby-start')?.disabled,netOpen:G.Net.open_,peers:G.Net.peers(),startText:document.querySelector('#lobby-start')?.textContent}))()`);
   console.log('Pre-start '+mode+' '+JSON.stringify(before));
   await evaluate(`document.querySelector('#lobby-start').click()`);
   try{await waitFor(()=>evaluate(`window.G?.Game?.state==='playing'`),20000,'AI gameplay '+mode);}
   catch(e){
    const after=await evaluate(`(()=>({game:G.Game.state,room:G.Social.room?.mode,disabled:document.querySelector('#lobby-start')?.disabled,coop:G.Coop.active,menu:document.querySelector('#scr-lobby')?.className,toast:document.querySelector('#toast')?.textContent}))()`);
    console.error('AI gameplay failure diagnostics '+mode,JSON.stringify({before,after,exceptions}));
    throw e;
   }
   const state=await evaluate(`(()=>({mode:window.G.Social.room.mode,players:window.G.Coop.players().length,botPlayers:window.G.Coop.players().filter(p=>p.lanBot).length}))()`);
   assert.equal(state.mode,mode);assert.ok(state.botPlayers>=1,'AI actor joined gameplay');
   if(mode==='eggrush'){
    await evaluate('window.G.Game.debugTime(180)');
    await sleep(250);
    assert.equal(await evaluate('window.G.Rift.drawable()===null'),true,'No Rift in Egg Rush');
   }
   console.log('PASS HTML5 browser AI '+mode+': '+JSON.stringify(state));
  }
  assert.equal(exceptions.length,0,'No browser JS exceptions: '+exceptions.join(' | '));
 }finally{
  try{ws?.close();}catch(_){}
  chrome.kill('SIGKILL');server.close();
  // Chrome sub-processes may still be writing profile files; cleanup must never
  // hide the underlying browser/assertion error.
  try{fs.rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:250});}
  catch(e){console.warn('Chromium temp cleanup:',e.message);}
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
