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
 assert.match(splash,/<span>Pokémon<\/span><span>Chuyển Sinh<\/span>/);
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
test('Save guardian is loaded before game and Rescue is available for cross-domain JSON export',()=>{
 const html=read('game/index.html'),root=read('save-rescue.html'),guard=read('save-guardian.js');
 assert.match(html,/\.\.\/save-guardian\.js/);
 assert.match(root,/save-rescue\.js/);
 assert.match(guard,/ps\.save\./);
 assert.match(guard,/pkmsvv\.safe\.v1/);
 assert.doesNotMatch(guard,/localStorage\.clear\(/);
 assert.match(read('sw.js'),/save-guardian\.js/);
});
test('Web Co-op is replaced with a LAN-only overlay, never old Firebase gate',()=>{
 const shell=read('game/js/ui/pkmsvv-local-shell.js');
 assert.match(shell,/G\.MultiplayerUI\.open=isPages\?openLanDialog/);
 assert.match(shell,/pkmsvv-lan-connect-modal/);
 assert.match(shell,/window\.location\.assign\('http:\/\/'/);
});
test('Cloudflare Free plan file count and per-file limit pass',()=>{
 const report=JSON.parse(read('build-info.json'));
 assert.ok(report.files>1000&&report.files<=20000);
 assert.ok(report.totalMiB>15&&report.largestMiB<=25);
 assert.ok(fs.statSync(path.join(dist,'game','assets')).isDirectory());
});

test('PWA multiplayer source entrypoint never calls old Online nickname gate',()=>{
 const app=read('game/js/app.min.js');
 assert.doesNotMatch(app,/pkmsvv-online-only-sentinel/);
 const ui=read('game/js/ui/pkmsvv-local-shell.js');
 assert.match(ui,/PKMSVVOpenLanDialog=openLanDialog/);
 assert.match(ui,/icon\.textContent='🤝'/);
});
