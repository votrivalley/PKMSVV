'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {patchItemsBundle}=require('../scripts/patch-v20-items-bundle.cjs');
test('Web rebuild replaces compiled Shop and Kecleon UI exactly once',()=>{
 const old='const G={};G.Shop=(()=>{return {oldShop:true}})();G.KecleonUI=(()=>{return {oldUI:true}})();const after=42;';
 const next=patchItemsBundle(old);
 assert.doesNotMatch(next,/oldShop|oldUI/);
 assert.match(next,/const ORDER = \['mint', 'cap'\]/);
 assert.match(next,/G.Mons.abilityChoices\(dex,false\)/);
 assert.match(next,/const after=42/);
 assert.equal(next.split('G.Shop=').length-1,1);
 assert.equal(next.split('G.KecleonUI=').length-1,1);
 assert.doesNotThrow(()=>new vm.Script(next));
 assert.throws(()=>patchItemsBundle('const G={};'),/Expected one/);
});
test('all platforms ship random-only rerolls with save-compatible legacy item retention',()=>{
 const hub=read('src/pkmsvv-box-hub.js'),ui=read('src/pkmsvv-box-hub-ui.js'),shop=read('src/kecleon/upstream/data/shop.js');
 assert.match(hub,/function useMint\(id,s=save\(\),random=Math.random\)/);
 assert.match(hub,/function useCapsule\(id,s=save\(\),random=Math.random\)/);
 assert.doesNotMatch(ui,/pkmbx-mint-select|data-hub-ability/);
 assert.match(shop,/const DROP_RATE=Object.freeze\(\{mint:\.008,cap:\.008\}\)/);
 assert.match(shop,/const ORDER = \['mint', 'cap', 'caph'\]/);
 assert.match(hub,/HIDDEN_RATE=0\.05/);
 for(const builder of ['scripts/promote-web-v20.cjs','scripts/patch-pokebox-stage4-apk-qa.cjs','scripts/build-pokebox-stage1-pc-qa.cjs'])
  assert.match(read(builder),/pkmsvv-box-hub\.js/,'stale Hub in '+builder);
 assert.match(read('scripts/promote-web-v20.cjs'),/patchItemsFile/);
 assert.match(ui,/data-pkmbx-action="mint"/);
 assert.match(ui,/data-pkmbx-action="ability"/);
 assert.match(ui,/data-pkmbx-action="tm"/);
 assert.match(ui,/pkmbx-action-dialog/);
 assert.doesNotMatch(ui,/data-box-tab="items"/);
});

test('Recruitment checks selected Gen ledger BEFORE paid roll',()=>{
 const src=read('src/pkmsvv-dex-defeats-qa.js');
 assert.match(src,/const available=selectedGen\?allowed\.filter/);
 assert.match(src,/Bạn chưa có Pokémon nào thuộc/);
 assert.match(src,/names\[selectedGen\]/);
});
