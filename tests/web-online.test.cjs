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