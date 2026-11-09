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

test('2.0 Pokédex types use species-specific colors and Kecleon defaults to Vietnamese',()=>{
 const hub=read('src/pkmsvv-box-hub-ui.js');
 assert.match(hub,/PKMSVVMenuCleanQA\?\.syncHome\?\.\(\)/,'leaving Pokémon must restore localized home labels');
 const css=read('src/pkmsvv-v20-ui-qa.css');
 const ui=read('src/kecleon/pkmsvv-kecleon-ui.js');
 assert.match(hub,/TYPE_FRAME_COLORS\[String\(t\)\.toLowerCase\(\)\]/,
  'Pokédex must read each actual Pokémon type palette');
 assert.match(hub,/class="pkmbx-type-pill" style="--pkmbx-pill:/,
  'Pokédex must render type-specific pills, not uniform rarity badges');
 assert.ok(css.includes('#pkmbx-dex-details .pkmbx-dex-type-pills .pkmbx-type-pill'),
  'Pokédex must use the very same dark type pills as PokéBox');
 assert.match(ui,/const L=\(vi,en\)=>G\.I18n\?\.lang==='en'\?en:vi/,
  'during menu transitions undefined locale must keep Vietnamese rather than English');
});

test('2.0 hotfix: damage shows precise multiplier, not rounded integer, with a real multiplier bar',()=>{
 const ui=read('src/pkmsvv-box-hub-ui.js');
 assert.ok(ui.includes("number('atk')||0"),'legacy attack multiplier fallback');
 assert.ok(ui.includes("attack.toFixed(2)"),'preserve ×1.52 instead of displaying 2 or 1');
 assert.ok(!ui.includes("Math.round(attack)"),'never round a multiplier to an integer');
 assert.ok(ui.includes('attack/2.4*100'),'meter must use ×2.4, not raw 255 attack points');
 assert.ok(ui.includes("key==='damage'?2.4:255"),'correct accessibility progressbar maximum');
 assert.equal('×'+Math.max(1.36,1.52).toFixed(2),'×1.52',
  'Reshiram example from the actual combat multiplier schema');
});
test('2.0 hotfix: single Ability disables selection, recruitment rule stays inside Gen panel',()=>{
 const hub=read('src/pkmsvv-box-hub-ui.js');
 const engine=read('src/pkmsvv-box-hub.js');
 const polish=read('src/pkmsvv-v20-ui-qa.js');
 const recruit=read('src/pkmsvv-recruitment-qa.js');
 const css=read('src/pkmsvv-v20-ui-qa.css');
 assert.ok(hub.includes('oneAbility||id===currentAbility'),
  'current or only Ability cannot be selected in the Bag');
 assert.ok(engine.includes('distinct.length<2'),'engine blocks one-Ability consumption');
 assert.ok(engine.includes('speciesBase(draft,item(draft,id))'),
  'Shiny skin should change the visible base Ability');
 assert.ok(polish.includes('guardAbilityButtons'),'older details UI is protected too');
 assert.ok(polish.includes('event.stopImmediatePropagation()'),
  'one-Ability click cannot open an old confirmation dialog');
 assert.ok(recruit.includes("tabRow.insertAdjacentElement('afterend',note)"),
  'rule must be a child of the Gen tabs container, not the shell flex row');
 assert.ok(!recruit.includes("screen.insertBefore(note,screen.firstChild)"),
  'never add a flex sibling beside the whole Gacha overlay');
 assert.ok(css.includes('position:static!important'),'note must not float over the HOME menu');
});

test('Recruitment note stays in the real Gen panel even with concatenated ALL GEN subtitle',()=>{
 const panel={children:[]},gen={parentElement:panel},card={parentElement:panel};
 panel.children=[gen,card];
 gen.insertAdjacentElement=(pos,node)=>{
  assert.equal(pos,'afterend');
  node.parentElement=panel;node.previousElementSibling=gen;
  panel.children.splice(1,0,node);
 };
 const allGen={textContent:'ALL GENTất cả',parentElement:gen,closest:()=>gen};
 const screen={
  querySelectorAll:s=>s.includes('button')?[allGen]:[],
  querySelector:s=>s==='#pkmsvv-recruitment-rule'?
   panel.children.find(n=>n.id==='pkmsvv-recruitment-rule')||null:null
 };
 const listeners={},document={
  readyState:'loading',querySelector:()=>null,
  getElementById:id=>id==='scr-gacha'?screen:null,
  createTreeWalker:()=>({nextNode:()=>null}),
  createElement:tag=>({tag,setAttribute(key,val){this[key]=val},textContent:''}),
  addEventListener:(type,fn)=>{listeners[type]=fn}
 };
 const G={I18n:{lang:'vi'}};
 vm.runInNewContext(read('src/pkmsvv-recruitment-qa.js'),{G,document,NodeFilter:{SHOW_TEXT:4}});
 listeners.DOMContentLoaded();
 const note=panel.children[1];
 assert.equal(note.id,'pkmsvv-recruitment-rule');
 assert.equal(note.parentElement,panel,'note must never be a sibling of entire dialog');
 assert.equal(note.previousElementSibling,gen,'notice belongs after Gen tabs');
 assert.match(note.textContent,/Pokédex/);
});
test('One-Ability details button is disabled before spending and restored for species with alternatives',()=>{
 const button={
  textContent:'⚙ Đổi đặc tính',disabled:false,dataset:{},
  hasAttribute(name){return name==='data-pkmsvv-ability-original-disabled'&&
   Object.hasOwn(this.dataset,'pkmsvvAbilityOriginalDisabled');},
  removeAttribute(name){if(name==='data-pkmsvv-ability-original-disabled')
   delete this.dataset.pkmsvvAbilityOriginalDisabled;}
 };
 const profile={querySelectorAll:()=>[button]},document={
  readyState:'loading',addEventListener(){},
  querySelector:s=>s==='#pkmsvv-pokebox-overlay #pkmbx-profile'?profile:null
 };
 const G={I18n:{lang:'vi'},DB:{save:{partner:643}},
  DEX_ABIL:{643:[55]},PKMSVVBox:{focusedId:()=> 'b1-643-n'},
  PKMSVVBoxHub:{item:()=>({dex:643})}};
 vm.runInNewContext(read('src/pkmsvv-v20-ui-qa.js'),{G,document});
 G.PKMSVV20UIPolish.guardAbilityButtons();
 assert.equal(button.disabled,true);
 assert.match(button.title,/chỉ có 1 Đặc tính/);
 G.DEX_ABIL[643]=[55,56];
 G.PKMSVV20UIPolish.guardAbilityButtons();
 assert.equal(button.disabled,false,'species with alternate Ability should be actionable again');
});
