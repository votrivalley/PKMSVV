'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const sw=fs.readFileSync('src/cloudflare/sw.js','utf8');
 const server=http.createServer((req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/sw.js'){res.setHeader('Content-Type','text/javascript');res.end(sw);}
  else if(path.endsWith('.js')){res.setHeader('Content-Type','text/javascript');res.end('window.cachedEngineScript=true;');}
  else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><body data-engine="'+(path.startsWith('/ai/')?'ai':'solo')+'"><script src="/ai/game/js/app.min.js?v=not-previously-requested"></script></body>');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 try{
  const context=await browser.newContext(),page=await context.newPage(),origin='http://127.0.0.1:'+server.address().port;
  await page.goto(origin);await page.evaluate(async()=>{
   localStorage.setItem('qa.player-save','preserve');await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
   if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));
  });
  await context.setOffline(true);
  await page.goto(origin+'/ai/game/?pkmsvvWifi=1&pkmsvvRole=host');
  assert.equal(await page.locator('body').getAttribute('data-engine'),'ai');
  assert.equal(await page.evaluate(()=>window.cachedEngineScript),true,'version-query script must resolve from pre-cached plain URL');
  assert.equal(await page.evaluate(()=>localStorage.getItem('qa.player-save')),'preserve');
  assert.equal(new URL(page.url()).searchParams.get('pkmsvvWifi'),'1');
  console.log('PASS: actual PWA service worker routes offline Wi-Fi query to AI engine, cached versioned script works, local save preserved');
  await context.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
