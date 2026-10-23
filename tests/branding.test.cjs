'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(base,p),'utf8');
test('Vietnamese game name shown on Windows, Android and entry pages',()=>{
 const pkg=JSON.parse(read('package.json'));
 const cap=JSON.parse(read('capacitor.config.json'));
 assert.equal(pkg.build.productName,'Pokémon Sống Sót');
 assert.equal(cap.appName,'Pokémon Sống Sót');
 assert.match(read('src/web/index.html'),/Pokémon Sống Sót/);
 assert.match(read('desktop/main.cjs'),/title: 'Pokémon Sống Sót — Votri Valley'/);
 assert.match(read('scripts/prepare-game.cjs'),/Pokémon Sống Sót/);
});
test('legacy app identity and existing offline saves remain intact',()=>{
 const pkg=JSON.parse(read('package.json'));
 const cap=JSON.parse(read('capacitor.config.json'));
 assert.equal(pkg.build.appId,'com.ronvotri.pkmsvv');
 assert.equal(cap.appId,'com.ronvotri.pkmsvv');
 assert.match(read('desktop/main.cjs'),/PKMSVV-Offline/);
});
test('single shared icon source has no old text and generates web/Windows/Android assets',()=>{
 const svg=read('assets/icon-survivor.svg');
 assert.match(svg,/>SỐNG SÓT<\/text>/);
 assert.doesNotMatch(svg,/>Survivor<\/text>/);
 assert.match(read('scripts/prepare-web.cjs'),/generate-icons.cjs/);
 assert.match(read('scripts/prepare-android.cjs'),/data.name='Pokémon Sống Sót/);
});
test('compiled native display keeps original upstream attribution',()=>{
 const p=read('scripts/prepare-game.cjs');
 assert.match(p,/SpriteCollab/);
 assert.match(p,/Việt hóa và Mod điều chỉnh bởi Votri Valley/);
});
