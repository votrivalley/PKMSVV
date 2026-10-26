'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('backup topbar shortcut reuses existing export/import logic',()=>{
 const shell=read('src/shared/local-shell.js'),css=read('src/shared/local-shell.css');
 assert.match(shell,/el\('btn-backup'\)/);
 assert.match(shell,/G\.PKMSVVSaveUI\.openQuick\(\)/);
 assert.match(shell,/topbar\.insertBefore\(button,speaker\)/);
 assert.doesNotMatch(shell,/localStorage\.clear\(|localStorage\.removeItem\(|ps\.save/);
 assert.match(css,/#topbar:not\(\.hidden\) #btn-backup/);
});
test('no Friends, Ranking or Google Login shown on local-only home menus',()=>{
 const shell=read('src/shared/local-shell.js'),css=read('src/shared/local-shell.css');
 for(const name of ['friends','rank'])assert.ok(css.includes('data-go="'+name+'"'));
 assert.match(shell,/pkmsvv-menu-google/);
 assert.match(shell,/Co-op/);
 assert.match(shell,/isPages/);
 assert.match(shell,/stopImmediatePropagation/);
});
