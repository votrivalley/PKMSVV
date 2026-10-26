'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {WebSocket}=require('ws');
const {startServer,privateAddress}=require('../lan-server/server.cjs');
test('LAN allowlist accepts RFC1918/private and localhost, rejects public internet',()=>{
 for(const ip of ['::1','127.0.0.1','::ffff:192.168.1.44','10.0.0.7','172.16.3.4','172.31.250.1'])assert.equal(privateAddress(ip),true);
 for(const ip of ['8.8.8.8','172.32.1.1','1.1.1.1','2001:db8::12'])assert.equal(privateAddress(ip),false);
});
test('LAN HTTP & same-origin WS support room life cycle and host-only frame routing',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pkmsvv-lan-'));
 fs.writeFileSync(path.join(root,'index.html'),'LAN TEST');
 const server=await startServer({root,port:0,host:'127.0.0.1'});
 const base='http://127.0.0.1:'+server.port;
 const clients=[];
 const open=()=>new Promise((resolve,reject)=>{
  const ws=new WebSocket('ws://127.0.0.1:'+server.port+'/lan/ws',{headers:{Origin:base}});
  clients.push(ws);
  const queue=[],waiters=[];
  const dispatch=m=>{const index=waiters.findIndex(x=>x.filter(m));if(index>=0){const w=waiters.splice(index,1)[0];w.resolve(m);}else queue.push(m);};
  const next=(filter=()=>true,ms=1500)=>new Promise((res,rej)=>{
   const found=queue.findIndex(filter);if(found>=0){res(queue.splice(found,1)[0]);return;}
   const timer=setTimeout(()=>rej(Error('Timed out waiting for message')),ms);
   waiters.push({filter,resolve:m=>{clearTimeout(timer);res(m);}});
  });
  ws.on('message',b=>dispatch(JSON.parse(String(b))));
  ws.once('error',reject);ws.once('open',()=>resolve({ws,next,req:async(action,extra={})=>{
   const rid=Math.floor(Math.random()*1e7);
   ws.send(JSON.stringify({t:'req',rid,action,...extra}));
   return next(m=>m.t==='response'&&m.rid===rid);
  }}));
 });
 try{
  let response=await fetch(base+'/');assert.equal(await response.text(),'LAN TEST');
  response=await fetch(base+'/missing.js');assert.equal(response.status,404);
  const [host,guest,stranger]=await Promise.all([open(),open(),open()]);
  for(const p of [host,guest,stranger])assert.ok((await p.next(m=>m.t==='welcome')).uid.startsWith('lan-'));
  assert.equal((await host.req('hello',{name:'Host'})).ok,true);
  await guest.req('hello',{name:'Guest'});
  const created=await host.req('create',{mode:'eggrush',visibility:'private',dex:25});
  assert.equal(created.ok,true);const room=created.result;
  assert.equal(room.members.length,1);assert.match(room.id,/^[\w-]{12,45}$/);
  assert.equal((await stranger.req('list')).result.length,0,'Private room is not publicly discovered');
  assert.equal((await guest.req('join',{id:room.id,dex:172,shiny:true})).ok,true);
  const members=(await host.next(m=>m.t==='room'&&m.room.members.length===2)).room.members;
  assert.equal(members[1].dex,172);
  assert.equal((await guest.req('open',{open:false})).ok,false,'Guest cannot close room');
  host.ws.send(JSON.stringify({t:'data',to:members[1].uid,data:{k:'f',p:[7,11]}}));
  const forwarded=await guest.next(m=>m.t==='data'&&m.data?.k==='f');
  assert.deepEqual(forwarded.data.p,[7,11]);
  assert.equal((await stranger.req('join',{id:room.id})).ok,true,'Unrelated player may join with room code');
  assert.equal((await host.req('open',{open:false})).ok,true);
  assert.equal((await guest.req('leave')).ok,true);
 }finally{
  for(const ws of clients)ws.terminate();
  await server.close();fs.rmSync(root,{recursive:true,force:true});
 }
});
test('LAN source shares neither Google login nor Firestore and keeps distinct save messaging',()=>{
 const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
 for(const p of ['src/lan/social-lan.js','src/lan/net-lan.js','src/lan/lan-bus.js'])
  assert.doesNotMatch(read(p),/firebase\.firestore|firebase\.database|auth\.signIn|firestore\.collection/i);
 assert.match(read('src/lan/index.html'),/không đồng bộ với save EXE Offline/);
 assert.match(read('src/lan/index.html'),/Android/);
 assert.match(read('scripts/prepare-web.cjs'),/PKMSVV_LAN_BUILD/);
});
