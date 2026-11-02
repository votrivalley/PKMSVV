'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('Standalone PC/Android AI transport preserves BOTH Berry difficulties',async()=>{
 const G={DEX_BY:{25:{name:'Pikachu'},420:{name:'Cherubi'}}};
 const updates=[];
 vm.runInNewContext(read('src/lan/solo-ai-bus.js'),{G,Math,Set,Promise,Number,Error,console});
 G.LanBus.on(e=>updates.push(e));
 await G.LanBus.request('hello',{name:'Tester'});
 for(const mode of ['coop','royale','eggrush','berry','berryeasy']){
  const room=await G.LanBus.request('create',{mode,dex:25});
  assert.equal(room.mode,mode,'Standalone AI must not silently replace '+mode+' with coop');
  assert.equal(updates.at(-1).room.mode,mode,'The UI must receive the exact room mode');
  for(let i=0;i<3;i++)await G.LanBus.request('addBot',{dex:420});
  assert.equal(updates.at(-1).room.mode,mode);
  assert.equal(updates.at(-1).room.members.length,4);
  await G.LanBus.request('leave');
 }
 const script=read('src/lan/solo-ai-bus.js');
 assert.match(script,/\['coop','royale','eggrush','berry','berryeasy','arena'\]/);
 assert.match(read('scripts/patch-berry-coop.cjs'),/PKMSVVBerryRescue\.begin\(\{mode:G\.Social\?\.room\?\.mode\}\)/);
});

test('Story skip and Memories X/back reliably restore actual home menu',()=>{
 const code=read('src/pkmsvv-story.js');
 assert.match(code,/G\.UI\.hide\('scr-pkmsvv-story'\);\s*\/\/ Story G\.UI\.show\(\) hides/);
 assert.match(code,/G\.Flow\.goMenu\(\);memories\(\);return;/);
 assert.match(code,/const closeChooser=\(restoreMenu=true\)=>/);
 assert.match(code,/if\(restoreMenu\)\{/);
 assert.match(code,/if\(restoreMenu\)\{[\s\S]*?G\.Flow\.goMenu\(\);/);
 assert.match(code,/G\.Flow\.goMenu\(\);/);
 assert.match(code,/closeChooser\(false\);memoryReplayActive=true/);
 assert.match(code,/choices\.querySelectorAll\('\[data-close\]'\)/);
});


test('Berry and Berry Easy labels are based on the actual room mode in every lobby',()=>{
 const lobby=read('scripts/patch-web-multiplayer.cjs');
 for(const label of ['Giải Cứu Berry · Nườm Nượp','Giải Cứu Berry · Nhẹ Nhàng',
                     'Berry Rescue · Normal','Berry Rescue · Easy','Tranh Trứng','Sống Sót']){
  assert.ok(lobby.includes(label),'Missing room label: '+label);
 }
 assert.match(lobby,/\[room\.mode\]/,'lobby must read actual room mode, not infer Survival');
 assert.match(lobby,/mode: room\.mode\|\|'coop'/,'start packet must include the room mode');
 const coop=read('src/shared/coop-unified.js');
 assert.match(coop,/const requestedMode=mode/);
 assert.match(coop,/createRoom\(requestedMode,role==='ai'\?'private':'public'\)/);
 assert.match(coop,/G\.Social\.room\?\.mode!==requestedMode/);
 assert.match(coop,/const opponents=requestedMode==='coop'\?1:3/);
});

test('LAN Social and standalone AI preserve chosen Berry difficulty end-to-end',async()=>{
 const G={
  DEX_BY:{25:{name:'Pikachu'},420:{name:'Cherubi'}},
  DB:{save:{name:'Tester',partner:420},user:'Tester',ownsShiny(){return false}},
  UI:{toast(){}}
 };
 vm.runInNewContext(read('src/lan/solo-ai-bus.js'),{G,Math,Set,Promise,Number,Error,console});
 vm.runInNewContext(read('src/lan/social-lan.js'),{G,Math,Set,Promise,Number,Error,console});
 for(const mode of ['berry','berryeasy']){
  const room=await G.Social.createRoom(mode,'private');
  assert.equal(room.mode,mode);
  assert.equal(G.Social.room.mode,mode);
  assert.equal(G.Social.room.isHost,true);
  await G.LanBus.request('addBot',{dex:25});
  assert.equal(G.Social.room.mode,mode);
  await G.Social.leaveRoom();
 }
});
