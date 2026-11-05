'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),assert=require('node:assert/strict');
const {spawn,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../dist/pokebox-stage2-qa');
const sleep=t=>new Promise(r=>setTimeout(r,t));
async function until(fn,ms=30000){
 const deadline=Date.now()+ms;
 while(Date.now()<deadline){try{const x=await fn();if(x)return x}catch(_){}await sleep(250)}
 throw Error('Timed out loading Stage 2 browser modules');
}
const srv=http.createServer((req,res)=>{
 let file;
 try{const name=new URL(req.url,'http://local').pathname;
  file=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name));
  if(!file.startsWith(root+path.sep))throw Error('Unsafe path');
 }catch(_){res.writeHead(403).end();return}
 fs.stat(file,(err,stat)=>{
  if(err||!stat?.isFile()){res.writeHead(404).end();return}
  const ext=path.extname(file),mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
  res.writeHead(200,{'content-type':mime[ext]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
 });
});
async function main(){
 assert.ok(fs.existsSync(path.join(root,'ai/game/index.html')));
 const chrome=process.env.PKMSVV_BROWSER||'google-chrome';
 assert.equal(spawnSync('which',[chrome]).status,0,'Chromium required');
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'pkmbx-stage2-cdp-'));
 const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--no-first-run','--remote-allow-origins=*','--remote-debugging-port=0','--user-data-dir='+data,'about:blank'],{stdio:'ignore'});
 let ws;
 try{
  const portfile=path.join(data,'DevToolsActivePort');
  await until(()=>fs.existsSync(portfile),12000);
  const port=Number(fs.readFileSync(portfile,'utf8').split('\n')[0]);
  const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const page=targets.find(x=>x.type==='page');assert.ok(page?.webSocketDebuggerUrl);
  ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{
   ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});
  });
  let seq=0;const waiting=new Map(),errors=[];
  ws.addEventListener('message',evt=>{
   let m;try{m=JSON.parse(String(evt.data))}catch(_){return}
   if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails?.exception?.description||'Browser JS exception');
   const task=waiting.get(m.id);
   if(task){waiting.delete(m.id);m.error?task.reject(Error(m.error.message)):task.resolve(m.result)}
  });
  function cmd(method,params={}){
   return new Promise((resolve,reject)=>{const id=++seq;waiting.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
  }
  const evaluate=async expression=>{
   const data=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
   if(data.exceptionDetails)throw Error(data.exceptionDetails.exception?.description||data.exceptionDetails.text);
   return data.result.value;
  };
  await cmd('Runtime.enable');await cmd('Page.enable');
  await cmd('Page.navigate',{url:'http://127.0.0.1:'+srv.address().port+'/ai/game/'});
  const query="(()=>({stage1:!!window.G?.PKMSVVBox,stage2:!!window.G?.PKMSVVBox2,hooked:!!window.G?.Gacha?._pkmbxStage2Wrapped,traits:!!window.G?.Mons?._pkmbxStage2Traits,rankUi:!!window.G?.PKMSVVBox?._pkmbxRankUiWrapped,title:document.title}))()";
  const state=await until(()=>evaluate(query).then(x=>x?.stage1&&x.stage2&&x.hooked&&x.traits&&x.rankUi?x:null),35000);
  const five=await evaluate('G.PKMSVVBox2.formatRank(5).hp');
  assert.equal(five,30);
  console.log('PASS Stage 2 real browser QA:',JSON.stringify({...state,rank5Hp:five,otherExceptions:errors.length}));
 }finally{
  try{ws?.close()}catch(_){}
  child.kill('SIGKILL');srv.close();
  try{fs.rmSync(data,{recursive:true,force:true,maxRetries:5,retryDelay:250})}catch(_){}
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
