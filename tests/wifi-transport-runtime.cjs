'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const source=fs.readFileSync('src/lan/wifi-bus.js','utf8'),qr=require('../scripts/bundle-wifi-qr.cjs')();
 const site=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><script>window.G={DEX_BY:{25:{name:"Pikachu"},1:{name:"Bulbasaur"}}};window.messages=[];'+source+qr+';G.LanBus.on(m=>messages.push(m));</script>');});
 await new Promise(r=>site.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})}),contexts=[];
 try{
  const pages=[];
  for(let i=0;i<10;i++){
   const c=await browser.newContext();contexts.push(c);await c.addInitScript(()=>{window.WebSocket=function(){throw Error('Central server forbidden in offline Wi-Fi test');};});
   const p=await c.newPage();pages.push(p);await p.goto('http://127.0.0.1:'+site.address().port+'/?pkmsvvWifi=1');
   await p.route('**/*',route=>route.abort()); // No HTTP service available after loading the local game.
   await p.evaluate(i=>G.LanBus.request('hello',{name:'Trainer '+i}),i);
  }
  const host=pages[0],room=await host.evaluate(()=>G.LanBus.request('create',{mode:'royale',dex:25}));
  for(const p of pages.slice(1)){
   const offer=await host.evaluate(()=>G.LanBus.invitation());assert.ok(offer.length<2953,'compressed offer must fit a QR');
   const answer=await p.evaluate(text=>G.LanBus.answer(text),offer);
   assert.ok(answer.length<2953,'compressed answer must fit a QR');
   await host.evaluate(text=>G.LanBus.accept(text),answer);
   await p.evaluate(async id=>{await G.LanBus.connect();await G.LanBus.request('hello',{name:'Guest'});await G.LanBus.request('join',{id,dex:1});},room.id);
   await assert.rejects(host.evaluate(text=>G.LanBus.accept(text),answer),/khớp/,'an answer cannot be replayed');
  }
  const peer=await pages[1].evaluate(()=>G.LanBus.uid);
  await host.evaluate(to=>{for(let n=0;n<40;n++)G.LanBus.send(to,{n});},peer);
  await pages[1].waitForFunction(()=>messages.filter(m=>m.t==='data').length===40);
  assert.deepEqual(await pages[1].evaluate(()=>messages.filter(m=>m.t==='data').map(m=>m.data.n)),Array.from({length:40},(_,i)=>i));
  assert.equal(await pages[1].evaluate(uid=>messages.filter(m=>m.t==='data').every(m=>m.from===uid),room.host),true);
  await assert.rejects(pages[1].evaluate(()=>G.LanBus.request('addBot')),/Host/);
  await assert.rejects(host.evaluate(()=>G.LanBus.request('addBot')),/đủ/);
  await host.evaluate(uid=>G.LanBus.request('kick',{uid}),peer);
  await pages[1].waitForFunction(()=>messages.some(m=>m.t==='room-closed'&&m.reason==='kicked'));
  await pages[2].evaluate(()=>G.LanBus.request('leave'));
  const state=await host.evaluate(()=>G.LanBus.request('addBot'));assert.equal(state.members.length,9);
  await host.evaluate(()=>G.LanBus.request('addBot'));await assert.rejects(host.evaluate(()=>G.LanBus.request('addBot')),/đủ/);
  const qrOK=await host.evaluate(()=>{const q=PKMSVVQR.create('PKMWIFI1.TEST');return q.modules.size>0;});assert.equal(qrOK,true);
  await host.evaluate(()=>G.LanBus.request('leave'));await pages[3].waitForFunction(()=>messages.some(m=>m.t==='room-closed'));
  console.log('PASS: ten independent offline WebRTC clients, QR-sized two-way pairing, ordered data, cap, Host authority, replay rejection, leave and kick; no WebSocket/HTTP after load');
 }finally{for(const c of contexts)await c.close();await browser.close();await new Promise(r=>site.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
