'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const file=name=>fs.readFileSync(path.join(root,name),'utf8');
const built=()=>fs.existsSync(path.join(root,'vendor/pokesurvivor/index.html'));

test('Android starts in immersive mode to prevent OS status bar intercepting toolbar taps',()=>{
 const setup=file('scripts/configure-android.cjs');
 const java=setup.match(/const nativeSource=("(?:\\.|[^"\\])*");/s);
 assert.ok(java,'Native Capacitor fullscreen source is generated');
 const source=JSON.parse(java[1]);
 assert.match(source,/private static volatile boolean immersive = true/);
 assert.match(source,/WindowInsetsController/);
 assert.match(source,/bars\.hide\(WindowInsets\.Type\.statusBars\(\)\|WindowInsets\.Type\.navigationBars\(\)\)/);
 assert.match(source,/public void state\(PluginCall call\)/);
 assert.match(setup,/PKMSVVScreen\.reapply\(this\)/);
});
test('Mobile toolbar has two independent rows and all active controls stay inside action row',()=>{
 if(!built())return;
 const html=file('vendor/pokesurvivor/index.html');
 assert.match(html,/id="topbar"/);
 // Minified HTML may consolidate whitespace; the relative order is invariant.
 const start=html.indexOf('class="pkmsvv-top-meta"'),action=html.indexOf('class="pkmsvv-top-actions"');
 const close=html.indexOf('id="sound-panel"');
 assert.ok(start>0&&action>start&&close>action,'Both toolbar rows present');
 for(const id of ['btn-news','btn-sound','btn-backup','btn-full','btn-settings']){
   const index=html.indexOf('id="'+id+'"');
   assert.ok(index>action&&index<close,id+' must remain in the tappable controls row');
 }
});
test('Mobile toolbar CSS avoids Android system bars and creates 40px touch targets',()=>{
 if(!built())return;
 const css=file('vendor/pokesurvivor/css/style.css');
 assert.match(css,/\.pkmsvv-top-meta,\.pkmsvv-top-actions/);
 assert.match(css,/top:calc\(34px \+ env\(safe-area-inset-top,0px\)\)/);
 assert.match(css,/html\.pkmsvv-native-immersive \.topbar/);
 assert.match(css,/min-width:40px;min-height:40px/);
 assert.match(css,/z-index:55;pointer-events:none/);
 assert.match(css,/\.topbar \.pill,\.topbar button\{pointer-events:auto/);
});
test('Backup News settings fullscreen and sound handlers are still wired in compiled UI',()=>{
 if(!built())return;
 const ui=file('vendor/pokesurvivor/js/ui/ui.js');
 const setting=file('vendor/pokesurvivor/js/ui/settings-ui.js');
 const news=file('vendor/pokesurvivor/js/ui/news-ui.js');
 const backup=file('vendor/pokesurvivor/js/ui/pkmsvv-save-ui.js');
 assert.match(ui,/btn-sound/);
 assert.match(ui,/pkmsvv-native-android/);
 assert.match(setting,/btn-full/);
 assert.match(setting,/android\(\)\.state\(\)/);
 assert.match(setting,/pkmsvv-native-immersive/);
 assert.match(news,/btn-news/);
 assert.match(backup,/btn-backup/);
 assert.match(file('vendor/pokesurvivor/index.html'),/pkmsvv-top-actions/);
});
test('Approved v1.1 What’s New text remains unchanged by mobile patch',()=>{
 const s=file('src/pkmsvv-changelog-v11.js');
 assert.match(s,/15 Nâng cấp Toàn Đội/);
 assert.match(s,/15 Team Powerups/);
 if(built()) { const release=file('vendor/pokesurvivor/js/data/changelog.js'); assert.ok(release.startsWith(s)); assert.match(release,/G\.CHANGELOG\.unshift\(/); }
});

test('mobile landscape toolbar is a single row with accessible buttons',()=>{
 const patch=file('scripts/patch-mobile-header.cjs');
 assert.match(patch,/flex-direction:row!important/);
 assert.match(patch,/flex-wrap:nowrap!important/);
 assert.match(patch,/overflow-x:auto/);
 assert.match(patch,/min-height:40px/);
 assert.match(patch,/\.topbar:not\(\.hidden\)/);
});
