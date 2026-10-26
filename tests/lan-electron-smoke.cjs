'use strict';
// Hidden native PC window; disposable save directory. Requires prepare:lan.
const {_electron}=require('playwright');
const assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path');
const {startServer}=require('../lan-server/server.cjs');
async function run(){
 const host=await startServer({root:path.resolve('dist/lan'),host:'127.0.0.1',port:0});
 const stalledSockets=new Set(),stalled=http.createServer(()=>{});
 stalled.on('connection',s=>{stalledSockets.add(s);s.on('close',()=>stalledSockets.delete(s));});
 await new Promise(r=>stalled.listen(0,'127.0.0.1',r));
 let app;
 try{
  const packaged=process.env.PKMSVV_PC_EXE;
  app=await _electron.launch({executablePath:packaged||require('electron'),
   args:packaged?['--smoke-test']:[path.resolve('desktop/lan-main.cjs'),'--smoke-test']});
  const page=await app.firstWindow();
  await page.waitForFunction(()=>window.G?.DB?.save&&window.PKMSVVLANDesktop?.connect,{timeout:30000});
  assert.equal(await page.evaluate(()=>window.PKMSVV_LOCAL_UI_MODE),'lan');
  const initial=page.url(),start=Date.now();
  const failed=await page.evaluate(address=>window.PKMSVVLANDesktop.connect({address}), '127.0.0.1:'+stalled.address().port);
  assert.equal(failed.ok,false);assert.match(failed.error,/không phản hồi/);assert.equal(page.url(),initial);
  assert.ok(Date.now()-start<6500);
  // Verify the renderer remains responsive and the same window can retry.
  assert.equal(await page.evaluate(()=>2+2),4);
  const target='http://127.0.0.1:'+host.port+'/game/';
  await Promise.all([
   page.waitForURL(url=>url.origin==='http://127.0.0.1:'+host.port&&url.pathname==='/game/'),
   page.evaluate(address=>{void window.PKMSVVLANDesktop.connect({address,role:'join',mode:'eggrush'});},target)
  ]);
  await page.waitForFunction(()=>window.G?.LanBus&&window.PKMSVVCoop?.mode==='eggrush');
  assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().filter(w=>!w.isDestroyed()).length),1);
  console.log('PASS native PC: stalled IP times out, same window retries and loads another Host, mode preserved');
 }finally{
  await app?.close();for(const s of stalledSockets)s.destroy();await new Promise(r=>stalled.close(r));await host.close();
 }
}
run().catch(e=>{console.error(e);process.exitCode=1;});
