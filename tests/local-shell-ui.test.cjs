'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('existing save moved, no save keys touched',()=>{
 const script=read('src/shared/local-shell.js'),css=read('src/shared/local-shell.css');
 assert.match(script,/el\('btn-backup'\)/);assert.match(script,/PKMSVVSaveUI\?\.openQuick/);
 assert.match(script,/insertBefore\(backup,sound\)/);
 assert.doesNotMatch(script,/localStorage\.setItem|localStorage\.clear|ps\.save/);
 assert.match(css,/#topbar:not\(\.hidden\) #btn-backup/);
});
test('social/google hidden and Co-op labeled',()=>{
 const script=read('src/shared/local-shell.js'),css=read('src/shared/local-shell.css');
 assert.match(script,/Co-op/);assert.match(script,/mode==='pages'/);
 for(const s of ['data-go="friends"','data-go="rank"','pkmsvv-menu-google','pkmsvv-main-save'])
  assert.ok(css.includes(s));
});
