'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const SOURCE=fs.readFileSync(path.join(__dirname,'../src/lan/match-recovery.js'),'utf8');
function participant(name,seed=9172,opts={}){
 const packets=[],listeners=[],roomListeners=[],events={},intervals=new Map();
 let intervalIndex=0,finishCount=0,endCount=0,toUiCount=0,awardCount=0,lobbyCount=0,finishPending=null;
 let now=Date.now();
 const room={id:'room-0001',host:'host',mode:'coop',open:false,
  members:[{uid:'host'},{uid:'guest'}]};
 const G={Social:{uid:name,room,
  on(fn){roomListeners.push(fn)},
  setPlaying(value){this.playing=!!value},
  finishMatch(){finishCount++;
   if(opts.deferFinish)return new Promise(resolve=>{finishPending=()=>{this.room.open=true;resolve(this.room)}});
   this.room.open=true;return Promise.resolve(this.room)}},
  DB:{commit(){awardCount++}},Game:{toUI(){toUiCount++}},
  LobbyUI:{open(){lobbyCount++}},Flow:{goMenu(){lobbyCount++}},
  Coop:{begin(){},end(){endCount++}},LanBus:{on(fn){listeners.push(fn)},
    send(to,data){packets.push({from:name,to,data})}}};
 const document={hidden:false,addEventListener(name,fn){events[name]=fn}};
 const window={addEventListener(name,fn){events[name]=fn}};
 const DateFake={now(){return now}};
 vm.runInNewContext(SOURCE,{G,document,window,Date:DateFake,
  setInterval(fn){const id=++intervalIndex;intervals.set(id,fn);return id},
  clearInterval(id){intervals.delete(id)},console});
 const api=G.PKMSVVMatchRecovery;
 function start(){G.Coop.begin({mode:'coop',host:'host',seed});G.Social.setPlaying(true)}
 function emit(from,data){for(const cb of listeners)cb({t:'data',from,data})}
 function disconnect(){for(const cb of listeners)cb({t:'disconnected'})}
 function pub(open){room.open=open;for(const cb of roomListeners)cb('room')}
 function tick(){for(const fn of [...intervals.values()])fn()}
 return {G,api,packets,events,room,start,emit,pub,disconnect,tick,
  resolveFinish(){finishPending?.()},advance(ms){now+=ms},
  get finishCount(){return finishCount},get endCount(){return endCount},
  get toUiCount(){return toUiCount},get awardCount(){return awardCount},get lobbyCount(){return lobbyCount}};
}
test('lost Host terminal packet is replayed; Client recovers once with no duplicated game rewards',async()=>{
 const host=participant('host'),guest=participant('guest');host.start();guest.start();
 await host.G.Social.finishMatch();
 assert.equal(host.finishCount,1);
 assert.equal(host.api.terminal.finished,true);
 host.packets.length=0; // simulate lost final-state packet
 host.tick();const replay=host.packets.at(-1);
 assert.equal(replay.to,'guest');
 guest.emit('attacker',replay.data);
 assert.equal(guest.api.session.finished,false,'forged sender rejected');
 guest.emit('host',{...replay.data,seed:'a different match'});
 assert.equal(guest.api.session.finished,false,'stale match rejected');
 guest.emit('host',replay.data);
 assert.equal(guest.api.session.finished,true);
 assert.equal(guest.endCount,1);
 assert.equal(guest.toUiCount,1);
 assert.equal(guest.lobbyCount,1);
 assert.equal(guest.awardCount,0,'Client never awards a win or inventory');
 guest.emit('host',replay.data);guest.pub(true);
 assert.equal(guest.endCount,1,'duplicate terminal never exits twice');
 await host.G.Social.finishMatch();
 assert.equal(host.api.terminal.finished,true);
 assert.equal(host.awardCount,0,'Host recovery only broadcasts status, not rewards');
});
test('Android app resume requests an authoritative terminal snapshot and wrong room or peer cannot replay it',async()=>{
 const host=participant('host'),guest=participant('guest');host.start();guest.start();
 await host.G.Social.finishMatch();
 host.packets.length=0;
 guest.events.visibilitychange();
 const request=guest.packets.at(-1);assert.equal(request.data.k,'pkmsvv-match-sync-request-v1');
 host.emit('attacker',request.data);
 assert.equal(host.packets.length,0,'unknown player cannot request status');
 host.emit('guest',{...request.data,room:'other'});
 assert.equal(host.packets.length,0,'wrong room cannot request status');
 host.emit('guest',request.data);
 assert.equal(host.packets.length,1);
 guest.emit('host',host.packets.at(-1).data);
 assert.equal(guest.api.session.finished,true);
 assert.equal(guest.endCount,1);
 assert.equal(guest.awardCount,0);
});
test('normal open lobby does not pretend a match ended; a new match rejects old terminal seed',async()=>{
 const guest=participant('guest');
 guest.room.open=true;guest.start();guest.pub(true);
 assert.equal(guest.api.session.finished,false,'open lobby is not a result');
 const host=participant('host');host.start();await host.G.Social.finishMatch();
 const packet=host.packets.at(-1).data;
 guest.room.open=false;
 guest.G.Coop.begin({mode:'coop',host:'host',seed:4456});
 guest.emit('host',packet);
 assert.equal(guest.api.session.finished,false,'previous match terminal cannot end new match');
 assert.equal(guest.toUiCount,0);
});
test('Host replay timer is finite and no unconfirmed final message can be created',async()=>{
 const h=participant('host');h.start();
 await h.G.Social.finishMatch(); // No fake terminal before Host's actual finish.
 h.packets.length=0;
 for(let i=0;i<15;i++)h.tick();
 assert.ok(h.packets.length<=8,'bounded replay, no network storm');
 const first=h.packets.length;
 h.tick();assert.equal(h.packets.length,first);
});

test('lost Wi-Fi connection never remains trapped in Co-op battle or mints progress twice',()=>{
 const guest=participant('guest');guest.start();
 guest.disconnect();
 assert.equal(guest.api.session.finished,true);
 assert.equal(guest.endCount,1);
 assert.equal(guest.toUiCount,1);
 assert.equal(guest.lobbyCount,1);
 assert.equal(guest.awardCount,0);
 guest.disconnect();
 assert.equal(guest.endCount,1,'duplicate disconnect is ignored');
});
test('late Host finish response for an old match cannot finish a newly started match',async()=>{
 const host=participant('host',9172,{deferFinish:true});
 host.start();
 const older=host.G.Social.finishMatch(); // Host request is pending on the network
 host.G.Coop.begin({mode:'coop',host:'host',seed:987654});
 assert.equal(host.api.session.seed,'987654');
 host.resolveFinish();
 await older;
 assert.equal(host.api.terminal,null,'old finish must not publish a terminal for the new seed');
 assert.equal(host.awardCount,0);
});
