'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const build = fs.readFileSync(path.join(root, 'scripts', 'prepare-web.cjs'), 'utf8');
const landing = fs.readFileSync(path.join(root, 'src', 'web', 'index.html'), 'utf8');
const entry = fs.readFileSync(path.join(root, 'src', 'web', 'entry.js'), 'utf8');
test('web builder requires private project-specific cloud configuration', () => {
  assert.match(build, /PKMSVV_FIREBASE_CONFIG_JSON/);
  assert.match(build, /PKMSVV_WEB_PREVIEW/);
  assert.match(build, /Never connect Votri Valley to the original author Firebase project/);
  assert.match(build, /databaseURL/);
});
test('offline and cloud save modes are explicit and do not migrate without consent', () => {
  assert.match(entry, /saveMode/);
  assert.match(entry, /start\('local'\)/);
  assert.match(entry, /start\('cloud'\)/);
  assert.match(landing, /Không tự ghi đè/);
  assert.match(landing, /id="local"/);
  assert.match(landing, /id="fullscreen"/);
  assert.match(build, /localReason = 'user'/);
});
test('the web build restores cloud login and unhides multiplayer navigation', () => {
  assert.match(build, /G\.LoginUI\.open\(\)/);
  assert.match(build, /G\.DB\.mode === 'local'/);
  assert.match(build, /customStyle/);
  assert.match(build, /#scr-menu/);
});
test('cloud is disabled without setup', () => {
  assert.match(landing, /data-cloud-enabled="false"/);
  assert.match(entry, /cloud\.disabled = !enabled/);
});
test('static HTML contains no remote scripts', () => {
  assert.doesNotMatch(landing, /<script[^>]*src="https?:/);
  assert.match(landing, /noindex,nofollow/);
});
test('bad copied Firebase API key is rejected before packaging any online game', () => {
  const { spawnSync } = require('node:child_process');
  const bad = JSON.stringify({
    apiKey: 'GIÁ_TRỊ_APIKEY_TRONG_FIREBASE',
    authDomain: 'pkmsvv-b84d2.firebaseapp.com',
    projectId: 'pkmsvv-b84d2',
    appId: '1:123:web:abc',
    databaseURL: 'https://pkmsvv-b84d2-default-rtdb.asia-southeast1.firebasedatabase.app'
  });
  const r = spawnSync(process.execPath, [path.join(root, 'scripts', 'prepare-web.cjs')], {
    env: { ...process.env, PKMSVV_FIREBASE_CONFIG_JSON: bad, PKMSVV_WEB_PREVIEW: '0' },
    encoding: 'utf8'
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Sai Firebase apiKey/);
  assert.doesNotMatch(r.stderr, /apiKey.*AIza[A-Za-z0-9_-]{35}/);
});
test('online build does not silently degrade into an offline profile', () => {
  assert.match(build, /wantsCloud && G.DB.mode !== 'cloud'/);
  assert.match(build, /Không thể kết nối Firebase Online/);
  assert.match(build, /auth\/api-key-not-valid/);
});

test('installed home-screen icon launches mode picker and can enter offline/fullscreen before login',()=>{
 assert.match(build,/manifest\.start_url='\.\/'/);
 assert.match(build,/manifest\.scope='\.\/'/);
 assert.match(build,/manifest\.icons=/);
 assert.ok(build.includes('href="../manifest.webmanifest"'));
 assert.match(build,/patch-web-entry-ui\.cjs/);
 const patch=fs.readFileSync(path.join(root,'scripts/patch-web-entry-ui.cjs'),'utf8');
 assert.match(patch,/pkmsvv-login-offline/);
 assert.match(patch,/pkmsvv\.web\.saveMode/);
 assert.match(patch,/pkmsvv-login-fullscreen/);
 assert.match(patch,/requestFullscreen/);
 assert.match(entry,/serviceWorker\.register/);
 const sw=fs.readFileSync(path.join(root,'src/web/sw.js'),'utf8');
 assert.match(sw,/pkmsvv-launch-v1/);
 assert.doesNotMatch(sw,/caches\.delete\(.*localStorage/);
});
