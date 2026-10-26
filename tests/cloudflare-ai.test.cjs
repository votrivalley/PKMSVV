'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/lan/solo-ai-bus.js'),'utf8');
function create(){
 const DEX_BY={25:{name:'Pikachu'},1:{name:'Bulbasaur'},6:{name:'Charizard'},175:{name:'Togepi'}};
 const G={DEX_BY},events=[];
 vm.runInNewContext(source,{G,Math,Set,console});
 G.LanBus.on(e=>events.push(e));
 return {G,events};
}
test('HTML5 AI rooms run without WebSocket, Firebase or LAN Host',async()=>{
 assert.doesNotMatch(source,/new WebSocket|fetch\(|firebase|LAN_SERVER/);
 const {G,events}=create();
 const bus=G.LanBus,uid=await bus.connect();
 assert.match(uid,/^lan-[a-f0-9]{20}$/);
 await bus.request('hello',{name:'Player'});
 let room=await bus.request('create',{mode:'eggrush',dex:25});
 assert.equal(room.members[0].name,'Player');
 assert.equal(room.mode,'eggrush');
 assert.equal(room.open,true);
 for(let i=0;i<3;i++)room=await bus.request('addBot',{dex:175});
 assert.equal(room.members.length,4);
 assert.equal(room.members.filter(m=>m.bot).length,3);
 for(const bot of room.members.slice(1))assert.match(bot.uid,/^ai-[a-f0-9]{16}$/);
 await assert.rejects(bus.request('addBot'),/đủ số/);
 await assert.rejects(bus.request('join',{id:'other-room'}),/ngoại tuyến/);
 await bus.request('open',{open:false});
 assert.equal((await bus.request('finish')).open,true);
 assert.equal(events.filter(e=>e.t==='room').length>=6,true);
 await bus.request('leave');
 assert.equal(events.at(-1).t,'room-closed');
});
test('HTML5 AI room supports ten players and clears finished bots before another round',async()=>{
 const {G}=create(),bus=G.LanBus;
 let room=await bus.request('create',{mode:'royale'});
 for(let i=0;i<9;i++)room=await bus.request('addBot');
 assert.equal(room.members.length,10);
 await bus.request('removeBot',{uid:room.members.at(-1).uid});
 assert.equal((await bus.request('finish')).members.length,1);
 assert.equal((await bus.request('addBot',{dex:6})).members.at(-1).dex,6);
});
