'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Finished 8/8 awakening becomes a collapsed Orb guide inside Upgrade chooser',()=>{
 const s=read('src/pkmsvv-upgrade-select.js');
 assert.match(s,/const full=guide\.count>=8/);
 assert.match(s,/title\.textContent=full\?t\('Hướng dẫn Mystery Orb'/);
 assert.match(s,/body\.hidden=true/);
 assert.match(s,/toggle\.setAttribute\('aria-controls'/);
 assert.match(s,/toggle\.onclick=\(\)=>\{body\.hidden=!body\.hidden/);
 assert.match(s,/guide\.lines/);
 assert.match(s,/G\.Orbs\.LIST/);
});
test('Controller can focus elements inside scrollable panels, including Refresh Rooms',()=>{
 const s=read('scripts/patch-v14-controller-scroll.cjs');
 assert.match(s,/scrollableParent/);
 assert.match(s,/canScroll/);
 assert.match(s,/pkmsvv-public-refresh\.pad-focus/);
 assert.match(s,/pkmsvv-upgrade-guide-toggle\.pad-focus/);
 assert.match(read('scripts/prepare-game.cjs'),/patch-v14-controller-scroll\.cjs/);
 const p='vendor/pokesurvivor/js/core/gamepad.js';
 if(fs.existsSync(path.join(root,p))){
  const patched=read(p);
  assert.match(patched,/const canScroll=scrollableParent\(el,sc\)/);
  assert.match(patched,/if\(offscreen&&!canScroll\)continue/);
 }
});
test('Online friends use live RTDB presence instead of friendship status',()=>{
 const s=read('src/web/pkmsvv-online-counter.js');
 assert.match(s,/isOnline\(other\)/);
 assert.match(s,/pkmsvv-presence-change/);
 const p=read('scripts/patch-web-coop-repair.cjs');
 assert.match(p,/G\.PKMSVVOnline\.isOnline\(f\.uid\)/);
 assert.match(p,/pkmsvv-coop-repair\.js/);
 assert.match(read('scripts/prepare-web.cjs'),/patch-web-coop-repair\.cjs/);
});
test('Co-op retry is host-only, transparent about STUN limits and does not enable Firebase combat relay',()=>{
 const s=read('src/web/pkmsvv-coop-repair.js');
 assert.match(s,/room\.isHost/);
 assert.match(s,/G\.Net\.retry\(m\.uid\)/);
 assert.match(s,/Không thể kết nối/);
 assert.match(s,/TURN/);
 const p=read('scripts/patch-web-coop-repair.cjs');
 assert.match(p,/retry\(u\)/);
 assert.match(p,/pendingIce\.delete\(u\)/);
 assert.doesNotMatch(p,/ALLOW_RELAY\s*=\s*true/);
});
