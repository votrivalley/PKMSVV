'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Mode cards explain play objective and winner in Vietnamese without internal rules',()=>{
 const ui=read('src/shared/coop-unified.js');
 for(const description of [
  'Cùng đồng đội đánh quái, cứu nhau khi gặp nguy hiểm và cố gắng sống sót lâu nhất có thể!',
  'Chiến đấu với quái vật trong vòng an toàn ngày càng thu nhỏ. Người sống sót cuối cùng sẽ chiến thắng!',
  'Tranh nhau thu thập 10 quả trứng! Cuối trận trứng mới nở để tính điểm. Ai nhiều điểm nhất sẽ thắng!'
 ])assert.ok(ui.includes(description),'Missing newcomer-friendly description: '+description);
 const cards=ui.slice(ui.indexOf('const modes='),ui.indexOf('let mode=',ui.indexOf('const modes=')));
 assert.doesNotMatch(cards,/30s|Mew 20|Ditto 10|Shiny|kỹ năng riêng|kỹ năng chung/i,
  'Technical combat and reward rules must not crowd the mode cards');
});

test('PC Android and HTML5 compile the identical Co-op UI source',()=>{
 const js=read('src/shared/coop-unified.js');
 for(const [id,title] of [['coop','Sống Sót'],['royale','Sống Còn'],['eggrush','Tranh Trứng']]){
  assert.ok(js.includes("'"+id+"'"),id);assert.ok(js.includes(title),title);
 }
 for(const name of ['Tạo phòng','Tham gia','Chơi với AI'])assert.ok(js.includes(name));
 for(const p of ['scripts/patch-lan.cjs','scripts/prepare-ios.cjs'])
  assert.match(read(p),/coop-unified\.js/);
 assert.match(read('scripts/patch-lan.cjs'),/coop-unified\.css/);
 assert.match(read('scripts/prepare-ios.cjs'),/coop-unified\.css/);
 assert.match(read('scripts/prepare-full-lan-android.cjs'),/compile-standalone-ai\.cjs/);
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
 assert.match(bot,/\['coop','royale','eggrush','berry','berryeasy'\]/);
 assert.match(bot,/G\.EggRush\?\.nests/);
 assert.match(egg,/get nests\(\)\{return nests;\}/);
});

test('A copied LAN invitation contains the actual room code and automatically joins',()=>{
 const serverPatch=read('scripts/patch-lan.cjs');
 const ui=read('src/shared/coop-unified.js');
 for(const token of ['pkmsvv-lan-copy-invite','pkmsvvRole','pkmsvvMode','pkmsvvCode','Sao chép lời mời'])
  assert.ok(serverPatch.includes(token),'Host invite: '+token);
 assert.match(ui,/const invitedCode=u\.searchParams\.get\('pkmsvvCode'\)/);
 assert.match(ui,/u\.searchParams\.set\('pkmsvvCode',invitedCode\)/);
 assert.match(ui,/G\.Social\.joinRoom\(inviteCode\)/);
 assert.doesNotMatch(serverPatch,/Địa chỉ LAN: '\+location\.origin/,'Do not show loopback as a friend invite');
});
test('Tranh Trứng never starts a Rift; other modes keep Rift update',()=>{
 const script=read('scripts/patch-v15-egg-rush-web.cjs');
 assert.match(script,/coop && G\.Social\?\.room\?\.mode==='eggrush'/);
 assert.match(script,/G\.Rift\.update\(dt, pl, time\)/);
});
