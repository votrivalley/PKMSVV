'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('online multiplayer checks the live Web build before joining, hosting and quick match',()=>{
 const s=read('src/web/pkmsvv-multiplayer-ui.js');
 assert.match(s,/const el=document\.querySelector\('script\[src\*="app\.min\.js"\]'\)/);
 assert.match(s,/new URL\(el\.getAttribute\('src'\),location\.href\)\.searchParams\.get\('v'\)/);
 assert.match(s,/fetch\('\/game\/version\.json\?t='\+Date\.now\(\),\{cache:'no-store'\}\)/);
 assert.match(s,/versionOkay=\(local===remote\.v\)/);
 assert.match(s,/if\(!\(await checkVersion\(\)\)\)return;/);
 assert.match(s,/btn\.textContent=vi\(\)\?'↻ Tải bản Web mới'/);
 assert.match(s,/location\.replace\('\/game\/\?update='/);
 assert.match(s,/checkVersion\(\); \/\/ show update prompt/);
});

test('compiled assets are cache-busted; root service worker is network first and preserves saves',()=>{
 const sw=read('src/web/sw.js'),script=read('scripts/prepare-web.cjs');
 assert.match(sw,/event\.request\.mode!=='navigate'/);
 assert.match(sw,/fetch\(event\.request\)/);
 assert.doesNotMatch(sw,/localStorage\.clear|indexedDB\.deleteDatabase/);
 assert.match(script,/version\.json/);
 assert.match(script,/sw\.js/);
});

test('version incompatibility is not misrepresented as a WebRTC or TURN fix',()=>{
 const s=read('src/web/pkmsvv-multiplayer-ui.js');
 assert.doesNotMatch(s,/ALLOW_RELAY = true/);
 assert.doesNotMatch(s,/rooms\/.*\.remove\(\)/);
 assert.doesNotMatch(s,/localStorage\.clear/);
});
