'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function bus(){
 const sockets=[];
 class Socket{
  static OPEN=1;
  constructor(){this.readyState=0;sockets.push(this);}
  close(){this.readyState=3;}
  send(){}
 }
 const context={G:{},WebSocket:Socket,location:{protocol:'http:',host:'127.0.0.1:37816'},setTimeout,clearTimeout,console};
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/lan/lan-bus.js'),'utf8'),context);
 return{bus:context.G.LanBus,sockets};
}
test('Close before welcome rejects immediately; the next attempt can connect',async()=>{
 const t=bus(),first=t.bus.connect();t.sockets[0].onclose();
 await assert.rejects(first,/đóng kết nối/);
 const retry=t.bus.connect(),ws=t.sockets[1];ws.readyState=1;ws.onmessage({data:JSON.stringify({t:'welcome',uid:'lan-new'})});
 assert.equal(await retry,'lan-new');ws.onclose();
});
test('Late close from a failed socket cannot wipe out a successfully retried connection',async()=>{
 const t=bus(),first=t.bus.connect(),old=t.sockets[0];old.onerror();
 await assert.rejects(first,/Không kết nối/);
 const retry=t.bus.connect(),ws=t.sockets[1];ws.readyState=1;ws.onmessage({data:JSON.stringify({t:'welcome',uid:'lan-new'})});
 await retry;old.onclose();assert.equal(t.bus.uid,'lan-new');assert.equal(t.bus.connected,true);ws.onclose();
});
