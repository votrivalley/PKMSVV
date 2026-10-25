'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('public matchmaking uses a distinct screen, never a friend requirement',()=>{
 const p=read('scripts/patch-multiplayer-hub.cjs');
 assert.match(p,/scr-multiplayer/);
 assert.match(p,/pkmsvv-quick-coop/);
 assert.match(p,/pkmsvv-quick-royale/);
 assert.match(p,/pkmsvv-room-code/);
 assert.match(p,/listPublicRooms/);
 assert.match(p,/data-go="multiplayer"/);
 assert.match(p,/#scr-friends #pkmsvv-create-modes/);
});
test('public room index permissions are owned by the host',()=>{
 const r=JSON.parse(read('firebase/database.rules.json')).rules;
 assert.equal(r.publicRooms['.read'],'auth != null');
 assert.match(r.publicRooms['$room']['.write'],/auth.uid/);
 assert.match(r.publicRooms['$room']['.validate'],/size/);
 assert.equal(r.rooms['$room'].mode['.read'],'auth != null');
});
test('custom keyboard bindings are persisted device-locally and title fixed to exactly two lines',()=>{
 const key=read('scripts/patch-keybind-title.cjs');
 for(const k of ['up','down','left','right','dash','pause','card1','card2','card3'])assert.match(key,new RegExp(k));
 assert.ok(key.includes("G.Settings.set('keys'"));
 assert.match(key,/stopImmediatePropagation/);
 assert.match(key,/virtualPressed/);
 assert.ok(key.includes('Pokémon</span><span>Sống Sót'));
 assert.match(read('src/web/index.html'),/pkmsvv-fixed-logo/);
 assert.doesNotMatch(key,/G.DB.commit/);
});

test('Vietnamese online modes use Sống Sót for coop and Sống Còn for royale across UI',()=>{
 const hub=read('scripts/patch-multiplayer-hub.cjs');
 const social=read('scripts/patch-web-multiplayer.cjs');
 const ui=read('src/web/pkmsvv-multiplayer-ui.js');
 const royale=read('src/web/pkmsvv-royale.js');
 for(const name of ['Sống Sót','Sống Còn']){
  for(const source of [hub,social,ui])assert.ok(source.includes(name),name+' missing from a multiplayer UI source');
 }
 assert.match(royale,/BẢNG XẾP HẠNG SỐNG CÒN/);
 assert.match(ui,/Quick Co-op/);
 assert.match(ui,/Quick Survival/);
 assert.match(social,/🤝 Co-op · 2–4/);
 assert.match(social,/mode==='royale'/);
 assert.match(ui,/create\('coop'/);
 assert.match(ui,/create\('royale'/);
 assert.doesNotMatch(hub,/Ghép Co-op|Ghép Sinh tồn/);
});

test('v1.5 Egg Rush online creates 4-seat rooms and is permitted by Firebase rules',()=>{
 const r=JSON.parse(read('firebase/database.rules.json')).rules;
 const validator=r.publicRooms['$room']['.validate'];
 assert.match(validator,/eggrush/);
 assert.match(validator,/\? 4 : 10/);
 const src=read('scripts/patch-v15-egg-rush-web.cjs');
 const ui=read('src/web/pkmsvv-multiplayer-ui.js');
 const game=read('src/web/pkmsvv-egg-rush.js');
 assert.match(src,/room.mode==='eggrush'\?4:2/);
 assert.match(src,/pkmsvv-quick-eggrush/);
 assert.match(ui,/create\('eggrush'/);
 assert.match(ui,/quick\('eggrush'/);
 assert.match(game,/MAX=10,MAX_TIME=720/);
 assert.match(game,/wave<5/);
 assert.match(game,/G\.Coop\.broadcast/);
});
