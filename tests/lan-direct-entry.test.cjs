'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('LAN starts directly with game and keeps local save',()=>{
 const html=read('src/lan/index.html'),entry=read('src/lan/entry.js');
 assert.doesNotMatch(html,/id="start"|Vào game · Chơi qua LAN/);
 assert.match(entry,/location\.replace\('\/game\/'\)/);
 assert.match(entry,/pkmsvv\.web\.saveMode/);
});
test('LAN guide and PC IP live in Co-op',()=>{
 const code=read('src/lan/lan-compact-ui.js');
 assert.match(code,/pkmsvv-lan-help/);
 assert.match(code,/fetch\('\/lan\/info'/);
 assert.match(code,/iPhone\/iPad/);
 assert.match(code,/Sao lưu game/);
});