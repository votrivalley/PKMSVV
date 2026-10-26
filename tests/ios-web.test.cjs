'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('iOS HTML5 route is local-only with App Store-free Home Screen instructions',()=>{
 const html=read('src/ios/index.html'),entry=read('src/ios/entry.js');
 assert.match(html,/Sao lưu game/);
 assert.match(html,/Thêm vào Màn hình chính/);
 assert.doesNotMatch(html,/Đăng nhập Google|Chơi Online/);
 assert.match(entry,/pkmsvv.web.saveMode','local/);
 assert.match(html,/id="lan-ip"/);
 assert.match(html,/id="lan-connect"/);
 assert.match(entry,/:37816\//);
 assert.match(read('scripts/prepare-ios.cjs'),/#pkmsvv-menu-google/);
 assert.doesNotMatch(read('scripts/prepare-ios.cjs'),/'#scr-menu \\[data-go="multiplayer"\\],#pkmsvv-menu-google/);
 assert.match(read('scripts/prepare-ios.cjs'),/pkmsvv-local-shell\.js/);
});
test('LAN says Co-op; native backup is on main menu and old warning replaced',()=>{
 const lan=read('scripts/patch-lan.cjs'),menu=read('scripts/patch-v15-menu-qa.cjs'),notice=read('scripts/patch-v15-offline-save-notice.cjs');
 assert.match(lan,/Co-op · LAN/);
 assert.match(menu,/pkmsvv-main-save/);
 assert.match(menu,/PKMSVVSaveUI.openQuick/);
 assert.match(notice,/Nhớ sao lưu game thường xuyên/);
 assert.doesNotMatch(notice,/Tiến trình trên thiết bị này tách biệt với Online/);
});