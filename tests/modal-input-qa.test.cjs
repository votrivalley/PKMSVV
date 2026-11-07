'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Controller/keyboard access is a repository-wide shipping rule',()=>{
 const agents=read('AGENTS.md');
 for(const term of ['EVERY interactive screen','Digit3','Numpad 3','D-pad','Android','Windows','Web','release-blocking QA gate'])
  assert.ok(agents.includes(term),'AGENTS.md missing: '+term);
});
test('Shared modal navigation compiles and covers picker, Region, PokéBox and PC',()=>{
 const js=read('src/pkmsvv-modal-navigation-qa.js'),css=read('src/pkmsvv-modal-navigation-qa.css');
 new Function(js);
 for(const id of ['#pkmsvv-quick-region','#pkmsvv-pokebox-overlay','#pkmsvv-wiki-overlay',
  '#scr-item','#scr-levelup','#pkmbx-rank-overlay','.pkmsvv-berry-overlay'])
  assert.ok(js.includes(id),'unhandled modal '+id);
 assert.match(js,/G\.Pad/,'controller poll is intercepted only for open overlays');
 assert.match(js,/getGamepads/);
 assert.match(js,/Arrow|arrowleft|arrowright|arrowup|arrowdown/);
 assert.match(js,/keyboardSkip|itemSkip/);
 assert.match(js,/Numpad1/);
 assert.match(js,/Numpad2/);
 assert.match(js,/\.pkmsvv-evo/);
 assert.match(js,/#pkmbx-rank-close/,'controller B closes Rank panel without leaving the PokéBox');
 assert.match(js,/#pkmsvv-champion-entry-pick/);
 assert.match(js,/#pkmsvv-arena-pvp-pick/);
 assert.match(js,/#pkmsvv-champion-entry-cancel/);
 assert.match(js,/#pkmsvv-arena-pvp-pick-exit/);
 assert.match(js,/return original\.apply\(this,args\)/,'native gameplay control stays intact when no overlay is open');
 assert.match(js,/releaseGate/,'button-release protection prevents accidental gameplay actions');
 assert.match(css,/outline:3px solid/,'focus must be visible on dark and light cards');
});
test('All isolated QA bundles include the same input implementation',()=>{
 for(const name of ['scripts/build-pokebox-stage1-qa.cjs','scripts/build-pokebox-stage1-pc-qa.cjs',
  'scripts/patch-pokebox-stage4-apk-qa.cjs','scripts/build-pokebox-stage4-android-qa.cjs']){
  const file=read(name);for(const suffix of ['.js','.css'])
   assert.ok(file.includes('pkmsvv-modal-navigation-qa'+suffix),name+' does not include shared input '+suffix);
 }
});
test('Two-item picker and Team Six use real handlers and accessible contrast',()=>{
 const source=read('src/pkmsvv-held-item-ui.js'),styles=read('src/pkmsvv-box-hub.css');
 assert.match(source,/Digit1/);
 assert.match(source,/Numpad2/);
 assert.match(source,/panels\[0\]\.onclick/);
 assert.match(source,/panels\[1\]\.onclick/);
 assert.match(styles,/background:#f7faf6!important/);
 assert.match(styles,/color:#15384a!important/);
 assert.match(styles,/border:2px solid #e4b545!important/);
});
