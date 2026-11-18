'use strict';
// Beta QA regression: never re-open old native Pokémon chooser after menu icon adjustments.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('menu icon outline is limited to three pixel-art sprites, without moving the column',()=>{
 const css=read('src/pkmsvv-pc-menu-clean-qa.css');
 const part=css.split('/* MENU_ICON_STROKE_255')[1];
 assert.ok(part,'the three-icon outline must exist');
 assert.match(part,/pkmsvv-research-menu-image/);
 assert.match(part,/pkmsvv-menu-icon-coop::after/);
 assert.match(part,/pkmsvv-menu-icon-arena::after/);
 assert.match(part,/drop-shadow\(1px 0 0/);
 assert.match(css,/width:35\.2px!important;height:35\.2px!important/);
 assert.match(css,/width:47\.6px!important;height:47\.6px!important/);
 assert.match(css,/grid-template-columns:var\(--pkmsvv-nav-icon-track\)/);
});

test('Pokémon starts in new PokéBox with independent Dex and Upgrade tabs',()=>{
 const ui=read('src/pkmsvv-box-hub-ui.js');
 for(const token of ['pkmbx-hub-team-title','pkmbx-team-six','pkmbx-pc-tabs',
  'tab(\'box\'','tab(\'dex\'','tab(\'upgrade\'','pkmbx-upgrade-options','G.PKMSVVBoxHubUI'])
  assert.ok(ui.includes(token),'missing '+token);
 assert.match(ui,/\[data-go="dex"\]/);
 assert.match(read('src/pkmsvv-pc-menu-clean-qa.js'),/PKMSVV_POKEMON_HUB_GUARD_255/);
});

test('both Cloudflare routes pin the complete ordered PokéBox set and bypass stale UI caches',()=>{
 const build=read('scripts/prepare-pippi-web-preview.cjs');
 assert.match(build,/POKEMON_HUB_REVISION_255/);
 assert.match(build,/previousModuleOffset/);
 assert.match(build,/source\(path\.relative\(root,path\.join\(dest,'js\/ui\/pkmsvv-box-hub-ui\.js'\)\)\)/);
 assert.match(build,/html=html\.replace\(tag,'src="js\/ui\/'\+name\+'\?v='/);
 assert.match(build,/urls\.push\(route\+'\/js\/ui\/'\+name\)/);
 assert.match(build,/\['\/game','\/ai\/game'\]/);
});

test('LAN Beta itself injects the real three-tab PokéBox UI and preserves production',()=>{
 const prep=read('scripts/prepare-lan.cjs');
 assert.match(prep,/PKMSVV_UNIFIED_BETA_POKEMON_255/);
 assert.match(prep,/process\.env\.PKMSVV_FOSSIL_NATIVE_QA==='1'/);
 for(const mod of ['pkmsvv-box-stage1.js','pkmsvv-box-stage2.js',
  'pkmsvv-box-stage3.js','pkmsvv-box-stage4.js','pkmsvv-box-hub.js',
  'pkmsvv-box-hub-ui.js','pkmsvv-dex-defeats-qa.js'])
  assert.ok(prep.includes(mod),'native Beta not packaging '+mod);
 assert.match(prep,/const folder=path\.join\(to,route\)/);
 assert.match(prep,/html=html\.replace\('<\/body>',injectScript\.join/);
});
