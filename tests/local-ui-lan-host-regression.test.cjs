'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Cloudflare old social UI hidden even with specific v1.5 menu flex CSS',()=>{
 const css=read('src/shared/local-shell.css'),js=read('src/shared/local-shell.js');
 for(const x of ['friends','rank'])assert.match(css,new RegExp('menu-item\\[data-go="'+x+'"\\]'));
 assert.match(js,/style\.setProperty\('display','none','important'\)/);
 assert.match(js,/PKMSVV_LOCAL_UI_MODE/);
});
test('Cloudflare Co-op click captured before old Firebase handlers, points only to LAN',()=>{
 const src=read('src/shared/local-shell.js');
 assert.match(src,/document\.addEventListener\('click',enterLan,true\)/);
 assert.match(src,/G\.MultiplayerUI\.open=isPages\?openLanDialog/);
 assert.match(src,/window\.location\.assign\('\/lan-connect\.html'\)/);
 assert.match(src,/stopImmediatePropagation/);
 assert.match(src,/pkmsvv-coop-lan-entry/);
 assert.match(read('src/ios/lan-connect.js'),/Number\.isInteger\(port\)/);
});
test('Backup action in top bar reuses existing Save UI without deleting any save key',()=>{
 const script=read('src/shared/local-shell.js');
 assert.match(script,/id='btn-backup'/);
 assert.match(script,/G\.PKMSVVSaveUI\.openQuick\(\)/);
 assert.doesNotMatch(script,/localStorage\.clear\(|localStorage\.removeItem\(/);
});
test('Preview warning protects users from separate save origins',()=>{
 const js=read('src/shared/local-shell.js');
 assert.match(js,/pkmsvv-preview-origin-warning/);
 assert.match(js,/save-rescue\.html/);
 assert.match(js,/pkmsvv-web\.pages\.dev/);
});
test('portable Windows Host includes LAN site as real resource folder',()=>{
 const pack=JSON.parse(read('lan-win.json')),main=read('desktop/lan-main.cjs');
 assert.deepEqual(pack.extraResources,[{from:'dist/lan',to:'lan-site',filter:['**/*']}]);
 assert.match(main,/process\.resourcesPath,'lan-site'/);
 assert.match(main,/lan-host-startup\.log/);
 assert.match(main,/dialog\.showErrorBox/);
 assert.match(main,/startOnAvailablePort/);
 assert.match(main,/launchUrl\(server\.port\)/);
 assert.match(main,/requestSingleInstanceLock/);
 assert.match(main,/lan-host-startup\.log/);
});

test('v1.5.30 left events and right navigation scroll independently without transforms',()=>{
 const js=read('scripts/patch-v15-menu-qa.cjs');
 const css=read('src/shared/local-shell.css');
 assert.doesNotMatch(js,/translateY\\(|transition:transform/);
 assert.match(js,/right\\.style\\.removeProperty\\('--pkmsvv-nav-bottom-gap'\\)/);
 assert.doesNotMatch(js,/bounds\\.bottom-lower\\.getBoundingClientRect/);
 assert.match(css,/#scr-menu\\.pkmsvv-v15-menu \\.menu-left\\{/);
 assert.match(css,/overflow-y:auto!important;overflow-x:hidden!important/);
 assert.match(css,/overscroll-behavior-y:contain/);
 assert.match(css,/\\.menu-right\\.pkmsvv-v15-nav[\\s\\S]*?overflow-y:auto!important/);
 assert.match(css,/transition:none!important/);
});
