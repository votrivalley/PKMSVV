'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src','kecleon','pkmsvv-kecleon-ui.js'),'utf8');
const web=fs.readFileSync(path.join(root,'scripts','prepare-web.cjs'),'utf8');
test('Kecleon shop no longer accesses the bag-only Pokémon picker',()=>{
 assert.match(source,/const pokemonPicker=\$\('pkmk-mon'\)/);
 assert.match(source,/if\(pokemonPicker\)pokemonPicker\.onchange/);
 assert.doesNotMatch(source,/\$\('pkmk-mon'\)\.onchange/);
});
test('cloud notices show Vietnamese and English text without outdated reset/ten-minute claims',()=>{
 assert.match(web,/Quan trọng: Hãy lưu tiến trình/);
 assert.match(web,/Save Your Progress/);
 assert.match(web,/Đã hiểu/);
 assert.match(web,/pkmsvv\.web\.cloud-save\.vi\.v2/);
 assert.doesNotMatch(web,/Los rankings se han reiniciado/);
 assert.doesNotMatch(web,/automatically every 10 minutes/);
});
