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
 assert.match(src,/stopImmediatePropagation/);
 assert.match(src,/location\.assign\('http:\/\/'\+ip\+':37816\/'\)/);
 assert.match(src,/window\.prompt\('Co-op dùng PC LAN Host/);
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
 assert.match(main,/EADDRINUSE/);
});
