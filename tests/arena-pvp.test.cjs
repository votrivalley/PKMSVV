'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const SOURCE=read('src/lan/arena-pvp.js');
function instance(myUid,opts={}){
 const elements=new Map(),listeners=[],peers=[];
 function node(tag='div'){
  const n={tag,id:'',textContent:'',hidden:false,style:{},children:[],className:'',
   setAttribute(){},remove(){elements.delete(this.id);},
   append(...nodes){this.children.push(...nodes);for(const c of nodes)if(c.id)elements.set(c.id,c);},
   replaceChildren(...nodes){this.children=[...nodes];},
   querySelector(){return node('button');},
   addEventListener(){},classList:{toggle(){}}
  };return n;
 }
 const document={createElement:node,body:{append(e){if(e.id)elements.set(e.id,e);}},getElementById(id){return elements.get(id)||null}};
 const members=[{uid:'host',name:'Host',dex:25},{uid:'guest',name:'Guest',dex:6}];
 if(opts.ai)members[1].bot=true;
 if(opts.members)members.splice(0,members.length,...opts.members);
 const me={x:0,y:0,hp:200,maxHp:200,aim:0,invuln:0,dead:false,
  activeGroup(){return [{kind:'projectile',id:'ember',lvl:1}]}
 };
 Object.defineProperty(me,'regen',{get(){return 0;}}); // Real G.Player getter has no setter.
 const other={x:135,y:0,hp:200,maxHp:200,remote:true,net:{x:135,y:0,hp:200,maxHp:200,dead:0}};
 let started=false,isHost=myUid==='host';
 const mate=id=>id===myUid?null:{pl:other};
 let seed=1234,network=[],origCast=0,spawns=0,damage=0,gameQuit=0;
 const G={
  I18n:{lang:'vi'},Social:{uid:myUid,room:{id:'test',host:'host',mode:opts.mode||'arena',members}},
  Game:{player:me,state:'playing',quit(){gameQuit++;}},
  Flow:{goMenu(){}},Moves:{BY_ID:{ember:{id:'ember',kind:'projectile',type:'fire',dmg:25,cd:.5,speed:300,life:1.5},
    tackle:{id:'tackle',kind:'melee',type:'normal',dmg:18,cd:1,radius:75}},
   instance(id,lvl){return {...this.BY_ID[id],id,lvl}}},
  DEX_BY:{25:{types:['electric']},6:{types:['fire']}},
  Types:{mult(){return 1}},
  Coop:{get active(){return started},get isHost(){return started&&isHost},
   begin(){started=true},end(){started=false},leave(){started=false},
   cast(){origCast++},mate,local:me},
  Net:{on(cb){listeners.push(cb)},onPeer(cb){peers.push(cb)},broadcast(msg){network.push(msg)}},
  World:{arena:null,setArena(a){this.arena=a}},
  EnemyMgr:{update(){},clear(){}},Spawner:{update(){spawns++}},
  Rift:{update(){}},Judgment:{update(){}},
  Combat:{tick(){},clearFields(){}},Projectiles:{clear(){}},Pickups:{clear(){}},Hazards:{clear(){}},
  FX:{burst(){damage++}}
 };
 let now=10000;
 vm.runInNewContext(SOURCE,{G,document,performance:{now(){return now}}});
 const api=G.PKMSVVArenaPvp;
 const cfg={mode:'arena',seed,host:'host',members};
 function start(){G.Coop.begin(cfg,me,{});}
 function emit(from,msg){for(const cb of listeners)cb(from,msg);}
 function frame(dt){
  // The original engine clamps each animation tick; advance with 30 FPS frames.
  for(let remain=dt;remain>0;remain-=Math.min(remain,1/30))
   G.EnemyMgr.update(Math.min(remain,1/30),[]);
 }
 return {G,api,me,other,document,elements,network,emit,frame,start,cfg,advance(t){now+=t},get damage(){return damage},
  get spawns(){return spawns},get gameQuit(){return gameQuit}};
}
test('Real Arena rooms use human identities and reject AI/no-second-player modes',()=>{
 const host=instance('host');host.start();
 assert.equal(host.api.active,true);
 assert.equal(host.api.host,true);
 assert.equal(host.api.stage,'countdown');
 assert.equal(host.me.maxHp,320);
 assert.equal(host.G.World.arena.r,18);
 const fake=instance('host',{ai:true});fake.start();assert.equal(fake.api.active,false);
 const other=instance('host',{mode:'coop'});other.start();assert.equal(other.api.active,false);
 const solo=instance('host',{members:[{uid:'host',name:'Host',dex:25}]});
 solo.start();assert.equal(solo.api.active,false);
});
test('Host 3-2-1 is authoritative, spawns no enemies and enters Fight together',()=>{
 const host=instance('host'),guest=instance('guest');host.start();guest.start();
 const relay=()=>{
  for(const packet of host.network.splice(0))guest.emit('host',packet);
 };
 host.frame(1);relay();assert.equal(guest.api.stage,'countdown');
 host.frame(1);relay();assert.equal(guest.api.stage,'countdown');
 host.frame(1.05);relay();
 assert.equal(host.api.stage,'fight');
 assert.equal(guest.api.stage,'fight');
 host.G.Spawner.update(1,[],0);assert.equal(host.spawns,0,'never spawn a fake player as an Enemy');
 assert.equal(host.document.getElementById('pkmsvv-arena-pvp-count').textContent,'⚔ BẮT ĐẦU!');
});
test('Guest cast reaches host and both players see same authentic damage result',()=>{
 const host=instance('host'),guest=instance('guest');host.start();guest.start();
 host.frame(3.01);
 const before=host.api.health.host;
 host.emit('guest',{k:'f',ev:[['c','ember',1,Math.PI]]});
 assert.ok(host.api.health.host<before,'real guest cast damages host');
 assert.equal(host.api.health.guest,320);
 const packets=host.network.splice(0);
 for(const packet of packets)guest.emit('host',packet);
 assert.equal(guest.api.health.host,host.api.health.host);
 assert.equal(guest.api.health.guest,host.api.health.guest);
 assert.equal(guest.me.hp,320);
 assert.ok(host.damage>0,'hit VFX appears on the victim');
});
test('Host rejects forged sender, implausible levels and too-fast casts',()=>{
 const host=instance('host');host.start();host.frame(3.01);
 const before=host.api.health.host;
 host.emit('attacker',{k:'f',ev:[['c','ember',90,Math.PI]]});
 assert.equal(host.api.health.host,before,'unauthorized uid cannot attack');
 host.emit('guest',{k:'f',ev:[['c','unknown-move',1,Math.PI]]});
 assert.equal(host.api.health.host,before,'unknown skill cannot attack');
 host.emit('guest',{k:'f',ev:[['c','ember',99,Math.PI]]});
 const once=host.api.health.host;
 host.emit('guest',{k:'f',ev:[['c','ember',99,Math.PI]]});
 assert.equal(host.api.health.host,once,'server rate limiting prevents duplicate attacks');
 host.advance(4000);
 host.emit('guest',{k:'f',ev:[['c','ember',1,0]]});
 assert.equal(host.api.health.host,once,'cast facing away must not damage rival');
});
test('Victory and rematch reset do not leak previous session health or UI',()=>{
 const host=instance('host');host.start();host.frame(3.01);
 for(let i=0;i<20&&host.api.stage!=='result';i++){
  host.advance(600);
  host.emit('guest',{k:'f',ev:[['c','ember',5,Math.PI]]});
 }
 assert.equal(host.api.stage,'result');
 assert.equal(host.api.winner,'guest');
 assert.ok(host.document.getElementById('pkmsvv-arena-pvp-overlay'));
 host.G.Coop.end();
 assert.equal(host.api.active,false);
 assert.equal(host.document.getElementById('pkmsvv-arena-pvp-count'),null);
 assert.equal(host.G.World.arena,null);
 host.start();assert.equal(host.api.stage,'countdown');
 assert.equal(host.api.health.host,320);
});
test('Arena 1v1 is accessible from Arena menu, shared Co-op selector and all builds',()=>{
 const arena=read('src/pkmsvv-champion-arena.js');
 const menu=read('src/shared/coop-unified.js');
 const patch=read('scripts/patch-arena-pvp.cjs');
 const prep=read('scripts/prepare-game.cjs');
 assert.match(arena,/pkmsvv-arena-mode-pvp/);
 assert.match(arena,/PKMSVVCoop\.open\('arena'\)/);
 assert.match(menu,/\['arena','Arena 1v1'/);
 assert.match(menu,/role==='ai'/);
 assert.match(patch,/js\/net\/pkmsvv-arena-pvp\.js/);
 assert.match(prep,/patch-arena-pvp\.cjs/);
 for(const p of ['lan-server/server.cjs','src/lan/wifi-bus.js','src/lan/social-lan.js']){
  assert.match(read(p),/arena/);
 }
});

test('Leaving after real PvP is not a Survival endRun and also clears the guest',()=>{
 const host=instance('host'),guest=instance('guest');
 host.start();guest.start();host.frame(3.01);
 host.api.exit();
 assert.equal(host.api.active,false);
 assert.equal(host.gameQuit,0,'Arena must not call Game.quit/endRun and award Survival coins');
 assert.equal(host.G.World.arena,null);
 assert.equal(host.document.getElementById('pkmsvv-arena-pvp-count'),null);
 const notice=host.network.find(m=>m.k==='apvp-exit');
 assert.ok(notice);
 guest.emit('host',notice);
 assert.equal(guest.api.active,false,'Guest receives actual host exit');
 assert.equal(guest.gameQuit,0);
});
test('Equal PvP skill loadouts are level one and enemy IDs cannot replace a human',()=>{
 const host=instance('host');host.start();
 assert.equal(host.me.moves?.length,2,'fixture has only two legal source skills');
 assert.ok(host.me.moves.every(m=>m.lvl===1));
 assert.equal(host.api.health.host,320);
 assert.equal(host.api.health.guest,320);
 assert.equal(host.G.World.arena.r,18);
});
