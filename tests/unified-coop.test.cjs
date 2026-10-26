'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('PC Android and HTML5 compile the identical Co-op UI source',()=>{
 const js=read('src/shared/coop-unified.js');
 for(const [id,title] of [['coop','Sống Sót'],['royale','Sống Còn'],['eggrush','Tranh Trứng']]){
  assert.ok(js.includes("'"+id+"'"),id);assert.ok(js.includes(title),title);
 }
 for(const name of ['Tạo phòng','Tham gia','Chơi với AI'])assert.ok(js.includes(name));
 for(const p of ['scripts/patch-lan.cjs','scripts/prepare-ios.cjs','scripts/prepare-full-lan-android.cjs'])
  assert.match(read(p),/coop-unified\.js/);
 assert.match(read('scripts/patch-lan.cjs'),/coop-unified\.css/);
 assert.match(read('scripts/prepare-ios.cjs'),/coop-unified\.css/);
 assert.match(read('scripts/prepare-full-lan-android.cjs'),/coop-unified\.css/);
});
test('The LAN AI action creates a real private room and adds a bot only in supported mode',()=>{
 const js=read('src/shared/coop-unified.js');
 assert.match(js,/G\.Social\.createRoom\(mode,role==='ai'\?'private':'public'\)/);
 assert.match(js,/G\.LanBus\.request\('addBot'/);
 assert.match(js,/const opponents=mode==='coop'\?1:3/);
});
test('Native mobile bridge passes role and mode into the common browser UI',()=>{
 const js=read('scripts/configure-android-full-lan.cjs');
 for(const p of ['getString','room_role','room_mode','pkmsvvRole','pkmsvvMode'])
  assert.ok(js.includes(p),p);
 assert.doesNotMatch(js,/__ROLE_SCRIPT__/);
});
test('Two companions are not locked behind Chapter 3',()=>{
 const code=read('src/v15/eggs.js');
 assert.match(code,/function limit\(\)\{return 2;\}/);
 assert.doesNotMatch(code,/function hasSecondSlot/);
 assert.match(code,/function unlocked\(\)\{return !!G\.DB\?\.save;\}/);
});

test('LAN bots can participate in all 3 modes and pursue real Egg Rush nests',()=>{
 const server=read('lan-server/server.cjs'),bot=read('src/lan/lan-ai.js'),egg=read('src/web/pkmsvv-egg-rush.js');
 assert.match(server,/const max=r.mode==='royale'\?10:4/);
 assert.match(bot,/\['coop','royale','eggrush'\]/);
 assert.match(bot,/G\.EggRush\?\.nests/);
 assert.match(egg,/get nests\(\)\{return nests;\}/);
});
