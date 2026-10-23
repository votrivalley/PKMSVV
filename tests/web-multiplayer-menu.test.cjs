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
 assert.match(key,/G.Settings.set\\('keys'/);
 assert.match(key,/stopImmediatePropagation/);
 assert.match(key,/virtualPressed/);
 assert.match(key,/Pokémon<\\/span><span>Sống Sót/);
 assert.match(read('src/web/index.html'),/pkmsvv-fixed-logo/);
 assert.doesNotMatch(key,/G.DB.commit/);
});
