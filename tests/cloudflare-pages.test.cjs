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
test('Web uses real LAN hyperlink instead of the retired Firebase Online menu callback',()=>{
 const html=read('game/index.html'),shell=read('game/js/ui/pkmsvv-local-shell.js');
 assert.match(html,/id="pkmsvv-coop-lan-entry" href="\/lan-connect\.html"/);
 const menu=html.slice(html.indexOf('<section id="scr-menu"'),html.indexOf('</section>',html.indexOf('<section id="scr-menu"')));
 assert.doesNotMatch(menu,/<button[^>]*data-go="multiplayer"/);
 assert.match(html,/class="mi-ico" aria-hidden="true">🤝<\/span>/);
 assert.match(shell,/window\.location\.assign\('\/lan-connect\.html'\)/);
 for(const file of ['lan-connect.html','lan-connect.js'])assert.ok(fs.existsSync(path.join(dist,file)));
 assert.match(read('lan-connect.html'),/id="lan-form"/);
 assert.match(read('lan-connect.js'),/location\.assign\('http:\/\/'/);
 assert.match(read('sw.js'),/\/lan-connect\.html/);
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

test('Self-hosted HTML5 AI mode has its own bundled game logic and no cloud dependency',()=>{
 const aiHTML=read('ai/game/index.html'),aiBundle=read('ai/game/js/app.min.js');
 const welcome=read('ai/index.html'),normal=read('game/index.html');
 assert.match(aiHTML,/<base href="\/game\/"/);
 assert.match(aiHTML,/\/ai\/game\/js\/app\.min\.js/);
 assert.match(welcome,/\/ai\/entry\.js/);
 assert.match(read('ai/entry.js'),/pkmsvvRole=ai&pkmsvvMode/);
 assert.match(aiBundle,/PKMSVV_STANDALONE_AI/);
 assert.doesNotMatch(aiBundle,/AIza[A-Za-z0-9_-]{35}|pkmsvv-b84d2-default-rtdb/);
 assert.match(normal,/pkmsvv-runtime-config\.js/);
 assert.match(read('game/js/ui/pkmsvv-runtime-config.js'),/PKMSVV_STANDALONE_AI_AVAILABLE=true/);
 assert.match(read('sw.js'),/\/ai\/game\/js\/app\.min\.js/);
 const coop=fs.readFileSync(path.join(__dirname,'..','src/shared/coop-unified.js'),'utf8');
 assert.match(coop,/window\.location\.assign\('\/ai\/\?mode='/);
 assert.match(coop,/pkmsvvCode/);
});


test('Offline PWA never auto-reloads from stale version.json (safe for local saves)',()=>{
 const buildScript=fs.readFileSync(path.join(__dirname,'..','scripts','prepare-web.cjs'),'utf8');
 const bundle=read('game/js/app.min.js');
 const worker=read('sw.js');
 const headers=read('_headers');
 assert.match(buildScript,/PKMSVV_LOCAL_PWA==='1'\|\|process\.env\.PKMSVV_LAN_BUILD==='1'/,
  'LAN and standalone AI must share the offline no-reload policy');
 assert.match(buildScript,/upstream\.includes\('function countdown\(\)'\)/);
 assert.match(buildScript,/policy:"manual-on-next-open"/);
 assert.match(bundle,/manual-on-next-open/,'compiled offline game must contain inert updater');
 const aiBundle=read('ai/game/js/app.min.js');
 assert.match(aiBundle,/manual-on-next-open/,
  'compiled standalone AI must not run the upstream 5-second update countdown');
 assert.ok(worker.includes("if(/\\/version\\.json$/i.test(url.pathname))return;"),'worker must bypass version.json fetch');
 assert.match(headers,/\/game\/version\.json\n\s+Cache-Control: no-store, max-age=0/);
 assert.doesNotMatch(worker,/localStorage\.clear|indexedDB\.deleteDatabase/);
});
