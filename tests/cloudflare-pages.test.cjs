'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dist=path.join(__dirname,'..','dist','cloudflare'),read=f=>fs.readFileSync(path.join(dist,f),'utf8');
test('Launch full offline game directly without Google sign-in',()=>{
 const index=read('index.html');
 assert.match(index,/location\.replace\('\/game\/'\)/);
 assert.match(index,/pkmsvv\.web\.saveMode','local/);
 for(const file of ['game/index.html','game/js/app.min.js','game/js/ui/pkmsvv-local-shell.js',
  'game/assets/icons/icon-180.png'])assert.ok(fs.existsSync(path.join(dist,file)),file);
});
test('Local save UI remains and PWA uses HTTPS root scope',()=>{
 const manifest=JSON.parse(read('manifest.webmanifest'));
 for(const field of ['id','start_url','scope'])assert.equal(manifest[field],'/');
 assert.equal(manifest.display,'standalone');
 assert.match(read('game/js/ui/pkmsvv-local-shell.js'),/PKMSVVSaveUI/);
 assert.match(read('sw.js'),/\/game\/js\/app\.min\.js/);
 assert.match(read('sw.js'),/cache\.put/);
 assert.doesNotMatch(read('game/js/app.min.js'),/AIza[A-Za-z0-9_-]{35}|pkmsvv-b84d2-default-rtdb/);
});
test('Cloudflare Free plan file count and per-file limit pass',()=>{
 const report=JSON.parse(read('build-info.json'));
 assert.ok(report.files>1000&&report.files<=20000);
 assert.ok(report.totalMiB>15&&report.largestMiB<=25);
 assert.ok(fs.statSync(path.join(dist,'game','assets')).isDirectory());
});
