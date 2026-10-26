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
test('Boot loader displays Vietnamese text and retains developer credit',()=>{
 const page=read('game/index.html');
 const splash=page.slice(page.indexOf('<div id="boot" class="boot">'),page.indexOf('<script src="js/boot.js">'));
 assert.match(splash,/Pokémon Chuyển Sinh/);
 assert.match(splash,/Đang tải trò chơi/);
 assert.match(splash,/pkmsvv-boot-credit/);
 assert.doesNotMatch(splash,/Cargando|Juego de supervivencia/);
 const boot=read('game/js/boot.js');
 assert.ok(boot.includes("vi: ['Game sinh tồn Pokémon"));
 assert.ok(boot.includes("#boot .boot-ld"));
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
