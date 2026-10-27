'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const web=path.join(root,'mobile','www');
test('FULL Android game included, rather than tiny LAN launcher',()=>{
 for(const p of ['index.html','assets','js','css','js/ui/pkmsvv-full-lan-ui.js','LICENSE-NONCOMMERCIAL.md'])
  assert.ok(fs.existsSync(path.join(web,p)),'Missing '+p);
 const html=fs.readFileSync(path.join(web,'index.html'),'utf8');
 assert.match(html,/app\.min\.js/);assert.match(html,/pkmsvv-full-lan-ui\.js/);
 assert.doesNotMatch(html,/Chơi LAN: nhập IP Host/);
});
test('New app installs alongside old APK; save stays out of bridge',()=>{
 const config=JSON.parse(read('capacitor.config.json'));
 assert.equal(config.appId,'com.votrivalley.pkmsvv.fulllan');
 assert.equal(config.server.androidScheme,'https');
 const src=read('src/android/full-lan-ui.js');
 assert.match(src,/PKMSVVLAN/);
 assert.doesNotMatch(src,/localStorage|indexedDB|PKMSVV_SAVE/);
});
test('native LAN plugin uses explicit private IPv4 and returnable Activity',()=>{
 const native=read('scripts/configure-android-full-lan.cjs');
 for(const token of ['validPrivateIP','usesCleartextTraffic','LANRoomActivity','BridgeActivity','shouldOverrideUrlLoading'])
  assert.ok(native.includes(token),'Expected '+token);
 assert.doesNotMatch(native,/Firebase|google-services/);
});
test('Full Android reuses one Co-op row and calls native LAN instead of Online',()=>{
 const js=read('src/android/full-lan-ui.js');
 assert.match(js,/const existing=list\.querySelector\('\[data-go="multiplayer"\],\[data-go="online"\]'\)/);
 assert.match(js,/PKMSVVOpenAndroidLan=openNative/);
 assert.match(js,/duplicate\.remove\(\)/);
 assert.match(js,/icon\.textContent='🤝'/);
});

test('Android landscape uses scoped compact mobile layout and native Wi-Fi discovery',()=>{
 const css=read('src/android/compact-landscape.css');
 assert.match(css,/max-height:700px/);
 assert.match(css,/overflow-y:auto!important/);
 assert.ok(css.replace(/\s+/g,'').includes('#scr-menu.pkmsvv-v15-menu.hidden{display:none!important;pointer-events:none!important}'),
  'Android hidden menu must not cover starter selection or consume taps');
 assert.match(read('scripts/prepare-full-lan-android.cjs'),/compact-landscape\.css/);
 const src=read('scripts/configure-android-full-lan.cjs');
 assert.match(src,/PKMSVV_DISCOVER_V1/);
 assert.match(src,/chooseNearby/);
 assert.match(src,/37820/);
 assert.match(src,/getString\(\\"role\\",\\"join\\"\)/);
 assert.match(src,/room_mode/);
 assert.match(src,/room_role/);
});
