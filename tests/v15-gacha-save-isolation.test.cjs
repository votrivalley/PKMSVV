'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('local backup reminder appears on native menu without touching save',()=>{
 const native=read('scripts/patch-v15-offline-save-notice.cjs');
 const landing=read('src/web/index.html');
 const prepare=read('scripts/prepare-game.cjs');
 assert.match(landing,/Save offline tách biệt hoàn toàn với Online\/Google/);
 assert.match(landing,/id="local"/);
 assert.match(native,/G\.DB\?\.mode!=='local'/);
 assert.match(native,/Nhớ sao lưu game thường xuyên/);
 assert.match(native,/pkmsvv-offline-save-note/);
 assert.doesNotMatch(native,/localStorage\.(?:removeItem|clear|setItem)/);
 assert.doesNotMatch(native,/G\.DB\.(?:commit|flush|logout|register)/);
 assert.match(prepare,/patch-v15-offline-save-notice\.cjs/);
});

test('Gacha late collection soft bonus stays small: Arcanine can drop, duplicates remain',t=>{
 const source='vendor/pokesurvivor';
 if(!fs.existsSync(path.join(root,source,'js/systems/gacha.js'))){
  t.skip('Build-time vendor checkout not present');return;
 }
 const G={U:{pick:list=>list[0]},Sprites:{hasShiny:()=>false}};
 const sandbox={G,Date,Math:Object.create(Math)};
 let rolls=[];
 sandbox.Math.random=()=>rolls.length?rolls.shift():.5;
 vm.runInNewContext(read(source+'/js/data/pokedex.js'),sandbox);
 vm.runInNewContext(read(source+'/js/data/sprites-meta.js'),sandbox);
 vm.runInNewContext(read(source+'/js/systems/gacha.js'),sandbox);
 const arcanine=G.DEX.find(p=>p.dex===59);
 assert.ok(arcanine,'Arcanine must be in Dex');
 assert.equal(arcanine.gen,1);assert.equal(arcanine.rarity,4);
 assert.ok(G.SPRITE_META[59],'Arcanine sprite metadata must be present');
 const fourStar=G.Gacha.pool(4,1);
 assert.ok(fourStar.some(p=>p.dex===59),'Arcanine must be in the Kanto 4-star Gacha pool');
 assert.notEqual(fourStar[0].dex,59,'First default pick should differ from Arcanine');
 const allKanto=G.DEX.filter(p=>p.gen===1&&G.SPRITE_META[p.dex]);
 const owned=Object.fromEntries(allKanto.filter(p=>p.dex!==59).map(p=>[p.dex,{at:1}]));
 const makeSave=()=>({owned:{...owned},shiny:{},stats:{},tickets:{t1:1,t10:0},pity:{},coins:0});
 const boosted=makeSave();
 rolls=[.94,.05]; // 4-star; within 15%-catch-up band
 const got=G.Gacha.pull(boosted,1,1,'t1');
 assert.equal(got[0].dex,59,'Soft bonus can award last missing 4-star Arcanine');
 assert.ok(boosted.owned[59],'Arcanine must persist in owned');
 assert.equal(boosted.tickets.t1,0);
 const duplicate=makeSave();
 rolls=[.94,.95]; // 4-star; misses 15%-catch-up band
 const again=G.Gacha.pull(duplicate,1,1,'t1');
 assert.equal(again[0].dex,fourStar[0].dex,'Duplicates must remain possible');
 assert.equal(again[0].isNew,false);
 assert.ok(!duplicate.owned[59],'No guaranteed Arcanine');
 const fresh=makeSave();
 fresh.owned={}; // Below 80% completion; never activate catch-up
 rolls=[.94,.01];
 const early=G.Gacha.pull(fresh,1,1,'t1');
 assert.equal(early[0].dex,fourStar[0].dex,'Early-game collection is unchanged');
 assert.deepEqual(Array.from(G.Gacha.RATES,x=>[x[0],x[1]]),[[1,45.5],[2,30],[3,17],[4,6.5],[5,1]]);
 assert.equal(G.Gacha.PITY_5,100);
 const patch=read('scripts/patch-v15-gacha-completion.cjs');
 assert.match(patch,/ownedInRegion \/ region.length >= 0.8/);
 assert.match(patch,/Math.random\(\) < 0.15/);
});

test('whole ×100 Gacha summary discloses ALL newly obtained Pokémon, not only top 20',()=>{
 const src=read('scripts/patch-v15-gacha-completion.cjs');
 assert.match(src,/res\.filter\(r=>r\.isNew\)/);
 assert.match(src,/Đã nhận mới \(đủ 100 lượt\)/);
 assert.match(src,/out\.appendChild\(sum\)/);
 assert.match(read('scripts/prepare-game.cjs'),/patch-v15-gacha-completion\.cjs/);
});
