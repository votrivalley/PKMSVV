'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('native entry securely opens owned Web through system browser',()=>{
 const pc=read('desktop/main.cjs'),bridge=read('desktop/preload.cjs'),android=read('scripts/configure-android.cjs');
 assert.match(pc,/shell\.openExternal\('https:\/\/pkmsvv-b84d2\.web\.app\/'\)/);
 assert.match(pc,/win!==mainWindow/);
 assert.match(pc,/pkmsvv:open-online/);
 assert.match(bridge,/openOnline:\(\)=>ipcRenderer\.invoke/);
 assert.match(android,/Intent\.ACTION_VIEW/);
 assert.match(android,/https:\/\/pkmsvv-b84d2\.web\.app\//);
 assert.doesNotMatch(bridge,/token|password|secret/i);
});
test('native mode choice keeps existing saves and Web edition stays separate',()=>{
 const src=read('src/pkmsvv-native-choice.js'),p=read('scripts/patch-native-online.cjs');
 const prep=read('scripts/prepare-game.cjs'),web=read('scripts/prepare-web.cjs');
 assert.match(p,/Chơi offline trên thiết bị/);
 assert.match(p,/Mở Web Online \(trình duyệt\)/);
 assert.match(p,/đăng nhập Google ngay trong ứng dụng chưa có/);
 assert.match(p,/save offline trong ứng dụng KHÔNG đồng bộ/);
 assert.match(src,/window\.confirm/);
 assert.match(p,/không tự đồng bộ với Google/);
 assert.match(src,/sessionStorage/);
 assert.doesNotMatch(src,/localStorage\.(?:setItem|removeItem|clear)/);
 assert.match(prep,/PKMSVV_BUILD_TARGET/);
 assert.match(prep,/patch-native-online\.cjs/);
 assert.match(web,/PKMSVV_BUILD_TARGET='web'/);
});
