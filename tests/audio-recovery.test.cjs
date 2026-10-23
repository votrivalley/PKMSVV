'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const base=path.join(root,'vendor','pokesurvivor');
test('audio engine retries suspended music, does not restart when muted intentionally',()=>{
 if(!fs.existsSync(path.join(base,'index.html')))return;
 const s=fs.readFileSync(path.join(base,'js/core/audio.js'),'utf8');
 assert.match(s,/function ensureMusic\(\)/);
 assert.match(s,/if \(!wanted\) return;/);
 assert.match(s,/ctx\.resume\(\)\.then\(\(\) => ensureMusic\(\)\)/);
 assert.match(s,/if \(wanted === name\) \{ if \(name\) ensureMusic\(\); return; \}/);
 assert.match(s,/visibilitychange/);
 assert.match(s,/addEventListener\('focus', ensureMusic\)/);
 assert.match(s,/addEventListener\('pageshow', ensureMusic\)/);
 assert.match(s,/if \(c\.next < ctx\.currentTime - 0\.4\) c\.next = ctx\.currentTime \+ 0\.05/);
 assert.match(s,/el\.paused/);
 assert.match(fs.readFileSync(path.join(base,'js/core/gamepad.js'),'utf8'),/G\.Audio\.unlock\(\)/);
});
test('compiled offline bundle includes v0.9.2 audio and immediate-start controller',()=>{
 if(!fs.existsSync(path.join(base,'index.html')))return;
 const js=fs.readFileSync(path.join(base,'js/app.min.js'),'utf8');
 assert.match(js,/visibilitychange/);
 assert.match(js,/updateVariant|PKMSVVPadFlow/);
});

test('approved custom village OGG and browser autoplay recovery',()=>{
 const src=fs.readFileSync(path.join(root,'scripts/prepare-game.cjs'),'utf8');
 const patch=fs.readFileSync(path.join(root,'scripts/patch-music.cjs'),'utf8');
 const ogg=path.join(root,'custom-music','village.ogg');
 assert.ok(fs.existsSync(ogg),'Please commit village.ogg to the custom-music folder');
 assert.equal(fs.readFileSync(ogg).subarray(0,4).toString(),'OggS');
 assert.match(src,/PKMSVV custom music bundled/);
 assert.match(src,/err\.name === 'NotAllowedError'/);
 assert.match(patch,/if \(!customAudio\) startCustomMusic\(wanted\)/);
 assert.match(patch,/Autoplay denied: keep custom OGG pending/);
});
