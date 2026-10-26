'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {hostURL,allowedNavigation,probeHost}=require('../desktop/lan-connection.cjs');
const {startServer}=require('../lan-server/server.cjs');

test('PC accepts a literal LAN IP or invite link and preserves all three modes',()=>{
 for(const mode of ['coop','royale','eggrush']){
  const u=hostURL('192.168.1.20:37817',{mode});
  assert.equal(u.origin,'http://192.168.1.20:37817');assert.equal(u.pathname,'/game/');
  assert.equal(u.searchParams.get('pkmsvvMode'),mode);assert.equal(u.searchParams.get('pkmsvvRole'),'join');
 }
 assert.equal(hostURL('10.0.0.8').port,'37816');
 assert.equal(hostURL('http://172.16.0.3:37818/game/?old=1#x').origin,'http://172.16.0.3:37818');
 for(const bad of ['8.8.8.8','192.168.1.999','192.168.1.2:80','192.168.1.2:99999',
  'https://192.168.1.2','example.com','http://192.168.1.2@evil.test','0x7f000001','127.1'])
  assert.throws(()=>hostURL(bad),undefined,bad);
});
test('PC navigation permits the verified other Host and rejects lookalike URLs and redirects',()=>{
 const origins=new Set(['http://127.0.0.1:37816','http://192.168.1.20:37817']);
 assert.equal(allowedNavigation('http://192.168.1.20:37817/game/?pkmsvvRole=join',origins),true);
 for(const bad of ['http://192.168.1.21:37817/game/','http://192.168.1.20:37818/game/',
  'http://127.0.0.1:37816@evil.test/game/','file:///game/','http://192.168.1.20:37817/other'])
  assert.equal(allowedNavigation(bad,origins),false,bad);
});
test('Host probe verifies a real running LAN server and rejects the wrong HTTP service',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pkmsvv-probe-'));
 const server=await startServer({root,host:'127.0.0.1',port:0});
 const wrong=http.createServer((_q,r)=>r.end('<html>Other app</html>'));
 await new Promise(r=>wrong.listen(0,'127.0.0.1',r));
 try{
  assert.equal((await probeHost(new URL('http://127.0.0.1:'+server.port))).service,'pkmsvv-lan-v1');
  await assert.rejects(probeHost(new URL('http://127.0.0.1:'+wrong.address().port)),/Không tìm thấy/);
 }finally{await server.close();await new Promise(r=>wrong.close(r));fs.rmSync(root,{recursive:true,force:true});}
});
test('A Host that accepts TCP but never answers times out instead of trapping the PC UI',async()=>{
 const connections=new Set();
 const stalled=http.createServer(()=>{});stalled.on('connection',s=>{connections.add(s);s.on('close',()=>connections.delete(s));});
 await new Promise(r=>stalled.listen(0,'127.0.0.1',r));
 const start=Date.now();
 try{
  await assert.rejects(probeHost(new URL('http://127.0.0.1:'+stalled.address().port),{timeout:80}),/không phản hồi/);
  assert.ok(Date.now()-start<1500);
 }finally{for(const s of connections)s.destroy();await new Promise(r=>stalled.close(r));}
});
