'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('all three builds reuse one handshake in icon node, no handshake in text label',()=>{
 const ui=read('src/shared/local-shell.js'),android=read('src/android/full-lan-ui.js');
 assert.match(ui,/icon\.textContent='🤝'/);
 assert.match(ui,/label\.textContent=' Co-op'/);
 assert.doesNotMatch(ui,/label\.textContent='🤝 Co-op'/);
 assert.match(android,/icon\.textContent='🤝'/);
 assert.match(android,/duplicate\.remove\(\)/);
});
test('old PWA online hub patched at compilation rather than event-only interception',()=>{
 const web=read('scripts/prepare-web.cjs'),ios=read('scripts/prepare-ios.cjs');
 assert.match(ios,/PKMSVV_LOCAL_PWA:'1'/);
 assert.match(web,/if\(process\.env\.PKMSVV_LOCAL_PWA==='1'\)/);
 assert.match(web,/window\.PKMSVVOpenLanDialog/);
 assert.match(web,/window\.dispatchEvent/);
});

test('Hosted PWA menu has a single handshake anchor with no multiplayer data-go',()=>{
 const src=read('scripts/prepare-web.cjs');
 assert.match(src,/id="pkmsvv-coop-lan-entry"/);
 assert.match(src,/href="\/lan-connect\.html"/);
 assert.match(src,/span class="mi-ico" aria-hidden="true">🤝/);
 assert.match(src,/data-go="multiplayer"/);
});
