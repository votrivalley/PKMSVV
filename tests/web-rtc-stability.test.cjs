'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const patch=fs.readFileSync(path.join(root,'scripts/patch-web-rtc-stability.cjs'),'utf8');
const build=fs.readFileSync(path.join(root,'scripts/prepare-web.cjs'),'utf8');

test('Web build installs safe WebRTC fix after pinned upstream sources',()=>{
 assert.match(build,/patch-web-rtc-stability\.cjs/);
 assert.match(patch,/pendingIce\.get\(from\)/);
 assert.match(patch,/pendingIce\.delete\(from\)/);
 assert.match(patch,/pendingIce\.clear\(\)/);
 assert.match(patch,/8000/);
 assert.match(patch,/ALLOW_RELAY \? 'relay' : 'failed'/);
 assert.doesNotMatch(patch,/ALLOW_RELAY = true/);
});

// This behavioral check only runs after the workflow has fetched the pinned
// upstream game; the early, dependency-free npm test pass checks patch anchors.
test('ICE arriving before answer is added to host after SDP answer',async t=>{
 const file=path.join(root,'vendor/pokesurvivor/js/net/net.js');
 if(!fs.existsSync(file)){t.skip('Pinned upstream not fetched yet');return;}
 const source=fs.readFileSync(file,'utf8');
 assert.match(source,/for \(const c of pendingIce\.get\(from\) \|\| \[\]\)/);
 let lastPc=null;
 class Peer {
  constructor(){lastPc=this;this.connectionState='new';this.signalingState='stable';this.remoteDescription=null;this.candidates=[];}
  createDataChannel(){return {readyState:'connecting',send(){},close(){}};}
  async createOffer(){return {type:'offer',sdp:'test'};}
  async setLocalDescription(desc){this.localDescription=desc;this.signalingState='have-local-offer';}
  async setRemoteDescription(desc){this.remoteDescription=desc;this.signalingState='stable';}
  async addIceCandidate(c){this.candidates.push(c);}
  close(){this.connectionState='closed';}
 }
 let receiveHost;
 const db={ref(name){return {
  on(type,callback){if(name==='rooms/room1/q/host'&&type==='child_added')receiveHost=callback;},
  off(){},
  push(){return Promise.resolve()},
 };}};
 const ctx={G:{DB:{fb:{rtdb:db,uid:'host'}},NetCodec:{version:1,size:s=>s.length}},
   RTCPeerConnection:Peer,setTimeout:()=>1,clearTimeout:()=>{},console};
 vm.runInNewContext(source,ctx);
 ctx.G.Net.open('room1',true,'host');
 ctx.G.Net.syncMembers(['host','guest']);
 await new Promise(setImmediate); // allow createOffer/setLocalDescription to finish
 assert.ok(lastPc);
 assert.equal(lastPc.signalingState,'have-local-offer');
 const receive=sig=>receiveHost({val:()=>JSON.stringify({f:'guest',sig}),ref:{remove:()=>Promise.resolve()}});
 receive({c:{candidate:'early'}}); // before answer/remoteDescription
 await Promise.resolve();
 assert.equal(lastPc.candidates.length,0);
 receive({sdp:{type:'answer',sdp:'test'}});
 await new Promise(setImmediate); // allow answer and queued ICE awaits to finish
 assert.equal(lastPc.candidates.length,1);
 assert.equal(lastPc.candidates[0].candidate,'early');
});
