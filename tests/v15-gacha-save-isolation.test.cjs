'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('offline warning appears at mode selection and native/local main menu only',()=>{
 const native=read('scripts/patch-v15-offline-save-notice.cjs');
 const landing=read('src/web/index.html');
 const prepare=read('scripts/prepare-game.cjs');
 assert.match(landing,/Save offline tách biệt hoàn toàn với Online\/Google/);
 assert.match(landing,/id="local"/);
 assert.match(native,/G\.DB\?\.mode!=='local'/);
 assert.match(native,/không thể đồng bộ hoặc dùng chung save Online/);
 assert.match(native,/pkmsvv-offline-save-note/);
 assert.doesNotMatch(native,/localStorage\.(?:removeItem|clear|setItem)/);
 assert.doesNotMatch(native,/G\.DB\.(?:commit|flush|logout|register)/);
 assert.match(prepare,/patch-v15-offline-save-notice\.cjs/);
});

test('regional Gacha prioritizes missing same-rarity entries; Arcanine #59 becomes obtainable',t=>{
 const source='vendor/pokesurvivor';
 if(!fs.existsSync(path.join(root,source,'js/systems/gacha.js'))){
  t.skip('Build-time vendor checkout not present');return;
 }
 const G={U:{pick:list=>list[0]},Sprites:{hasShiny:()=>false}};
 const sandbox={G,Date,Math:Object.create(Math)};
 sandbox.Math.random=()=>.94; // selects 4-star without modifying the rarity distribution.
 vm.runInNewContext(read(source+'/js/data/pokedex.js'),sandbox);
 vm.runInNewContext(read(source+'/js/data/sprites-meta.js'),sandbox);
 vm.runInNewContext(read(source+'/js/systems/gacha.js'),sandbox);
 const arcanine=G.DEX.find(p=>p.dex===59);
 assert.ok(arcanine,'Arcanine must be in Dex');
 assert.equal(arcanine.gen,1);assert.equal(arcanine.rarity,4);
 assert.ok(G.SPRITE_META[59],'Arcanine sprite metadata must be present');
 const fourStar=G.Gacha.pool(4,1);
 assert.ok(fourStar.some(p=>p.dex===59),'Arcanine must be in the Kanto 4-star Gacha pool');
 const owned={};
 for(const pokemon of fourStar)if(pokemon.dex!==59)owned[pokemon.dex]={at:1};
 const save={owned,shiny:{},stats:{},tickets:{t1:1,t10:0},pity:{},coins:0};
 const result=G.Gacha.pull(save,1,1,'t1');
 assert.equal(result.length,1);
 assert.equal(result[0].dex,59,'next 4-star regional roll must fill last missing 4-star (Arcanine)');
 assert.equal(result[0].isNew,true);
 assert.ok(save.owned[59],'Arcanine must persist in owned for regional Shiny Charm');
 assert.equal(save.tickets.t1,0);
 assert.deepEqual(Array.from(G.Gacha.RATES,x=>[x[0],x[1]]),[[1,45.5],[2,30],[3,17],[4,6.5],[5,1]]);
 assert.equal(G.Gacha.PITY_5,100);
 assert.match(read('scripts/patch-v15-gacha-completion.cjs'),/newly obtained|Đã nhận mới|notOwnedInTier/);
});

test('whole ×100 Gacha summary discloses ALL newly obtained Pokémon, not only top 20',()=>{
 const src=read('scripts/patch-v15-gacha-completion.cjs');
 assert.match(src,/res\.filter\(r=>r\.isNew\)/);
 assert.match(src,/Đã nhận mới \(đủ 100 lượt\)/);
 assert.match(src,/out\.appendChild\(sum\)/);
 assert.match(read('scripts/prepare-game.cjs'),/patch-v15-gacha-completion\.cjs/);
});
