'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
function shop(){
 const s={created:100,partner:25,owned:{25:{at:1}},coins:50000,
  bag:{},tms:{},pabil:{},pnat:{}};
 let writes=0,fail=false;
 const G={
  DB:{save:s,guest:false,commit(){writes++;return !fail}},
  Game:{state:'playing'},Coop:{active:false},
  DEX_BY:{25:{rarity:2},150:{rarity:5}},
  Moves:{BY_ID:{surf:{id:'surf'}}},
  TM_PRICE:{surf:400},TM_MOVES:{surf:[25]},
  I18n:{lang:'vi'},Mons:{learnable(){return ['surf']},canLearn(){return true}}
 };
 vm.runInNewContext(read('src/kecleon/upstream/data/shop.js'),{G,Date,Math,Intl,Number,JSON,Object,String,Set});
 return {G,s,get writes(){return writes},fail(v){fail=v}};
}
test('approved Chuyển Sinh 2.0 log replaces no 1.0 history and remains idempotent',()=>{
 const old={d:'2026-11-03',title:['Pokémon Chuyển Sinh','Pokémon Chuyển Sinh']};
 const G={CHANGELOG:[old]};vm.runInNewContext(read('src/pkmsvv-changelog-v20-qa.js'),{G});
 assert.equal(G.CHANGELOG[0].title[0],'Pokémon Chuyển Sinh 2.0');
 assert.equal(G.CHANGELOG[0].d,'2026-11-09');
 assert.equal(G.CHANGELOG.length,2);
 assert.equal(G.CHANGELOG[1],old);
 const rows=[...G.CHANGELOG[0].new,...G.CHANGELOG[0].chg,...G.CHANGELOG[0].fix];
 assert.ok(rows.every(x=>Array.isArray(x)&&x.length===2&&x.every(Boolean)));
 assert.ok(rows.some(x=>/Pokédex/.test(x[0])&&/Khám phá/.test(x[0])));
 assert.ok(rows.some(x=>/bán vật phẩm/.test(x[0])));
 assert.ok(rows.some(x=>/Pokémon hỗ trợ/.test(x[0])));
 G.PKMSVVChangelog20.install();
 assert.equal(G.CHANGELOG.length,2,'reloading app cannot duplicate 2.0 log');
});
test('Hidden Capsules cannot be bought; their value doubles and sells for 50%',()=>{
 const h=shop(),{G,s}=h;
 assert.equal(G.Shop.ITEMS.caph.price,10000);
 assert.equal(G.Shop.ITEMS.caph.unavailableInShop,true);
 assert.equal(G.Shop.buy('caph').ok,false);
 assert.equal(s.bag.caph,undefined);
 s.bag.caph=1;
 const before=s.coins;
 assert.deepEqual({...G.Shop.sell('caph')},{ok:true,key:'caph',refund:5000,coins:before+5000});
 assert.equal(s.bag.caph,undefined);
 assert.equal(s.coins,before+5000);
});
test('Mint/Ability/TM sales consume exactly one copy and refund half',()=>{
 const h=shop(),{G,s}=h;
 assert.equal(G.Shop.buy('mint').ok,true);
 assert.equal(G.Shop.buy('cap').ok,true);
 assert.equal(G.Shop.sell('mint').refund,750);
 assert.equal(G.Shop.sell('cap').refund,750);
 assert.equal(G.Shop.count('mint'),0);
 assert.equal(G.Shop.count('cap'),0);
 assert.equal(G.Shop.sell('cap').ok,false,'already sold item cannot be sold twice');
 s.tms.surf=2;
 const receipt=G.Shop.sell('tm:surf');
 assert.equal(receipt.refund,200);
 assert.equal(s.tms.surf,1);
 h.fail(true);const snapshot=JSON.stringify(s);
 assert.equal(G.Shop.sell('tm:surf').ok,false);
 assert.equal(JSON.stringify(s),snapshot,'save failure refunds both item and coins');
});
test('2.0 item drops: normal 0.8%, elite 1.6%, legend 3.2%, hidden 0.2%',()=>{
 const {G,s}=shop();
 assert.equal(G.Shop.DROP_RATE.mint,.008);
 assert.equal(G.Shop.DROP_RATE.cap,.008);
 assert.equal(G.Shop.DROP_RATE.caph,.002,'Hidden Capsules are harder to find');
 assert.equal(G.Shop.enemyMultiplier({rarity:1}),1);
 assert.equal(G.Shop.enemyMultiplier({elite:true}),2);
 assert.equal(G.Shop.enemyMultiplier({dex:150}),4);
 const normal={dex:25};assert.deepEqual(Array.from(G.Shop.dropFromEnemy(normal,()=>.01)),[]);
 assert.deepEqual(Array.from(G.Shop.dropFromEnemy({dex:25,elite:true},()=>.01)),['mint','cap']);
 assert.deepEqual(Array.from(G.Shop.dropFromEnemy({dex:150},()=>.007)),['mint','cap','caph']);
 assert.equal(s.bag.mint,2);assert.equal(s.bag.cap,2);assert.equal(s.bag.caph,1);
 const same={dex:25};G.Shop.dropFromEnemy(same,()=>0);
 assert.equal(G.Shop.dropFromEnemy(same,()=>0).length,0,'one kill counted once');
 G.PKMSVVArenaSolo={active:true};
 assert.equal(G.Shop.dropFromEnemy({dex:150},()=>0).length,0,'Arena cannot farm these drops');
});
test('2.0 Bag uses random effects, no chosen Nature/Ability list, and has Sell buttons',()=>{
 const source=read('src/kecleon/pkmsvv-kecleon-ui.js');
 assert.match(source,/Math\.random\(\)\*choices\.length/);
 assert.doesNotMatch(source,/data-pkmk-nature=/);
 assert.doesNotMatch(source,/data-pkmk-ability=/);
 assert.match(source,/G\.Shop\.sell\(btn\.dataset\.pkmkSell\)/);
 assert.match(source,/sellBtn\('tm:'\+id/);
 assert.match(source,/if\(it\.unavailableInShop\)continue/);
});
test('2.0 uniform UI is present in each QA packager and keeps old live buttons',()=>{
 const css=read('src/pkmsvv-v20-ui-qa.css'),ui=read('src/pkmsvv-v20-ui-qa.js');
 assert.match(css,/--pkmsvv-pokemon-height/);
 assert.match(css,/pkmbx-dex-overlay\.pkmbx-dex-inside-pc/);
 assert.match(css,/pkmbx-upgrade-overlay\.pkmbx-upgrades-inside-pokemon/);
 assert.match(css,/pkmsvv-v20-gacha-card/);
 assert.match(ui,/classList\.add\('pkmsvv-v20-gacha-card'\)/);
 for(const file of ['scripts/build-pokebox-stage1-qa.cjs',
  'scripts/build-pokebox-stage1-pc-qa.cjs',
  'scripts/patch-pokebox-stage4-apk-qa.cjs']){
  const src=read(file);
  assert.match(src,/pkmsvv-changelog-v20-qa\.js/);
  assert.match(src,/pkmsvv-v20-ui-qa\.css/);
  assert.match(src,/pkmsvv-v20-ui-qa\.js/);
 }
});
