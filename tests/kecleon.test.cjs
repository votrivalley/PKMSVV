'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const built=()=>fs.existsSync(path.join(root,'vendor/pokesurvivor/index.html'));
function game(){
 const pokemon={dex:25,name:'Pikachu',pa:1.1,sa:1.5,df:95,sd:110,spd:90,atk:1.5,types:['electric']};
 const G={DB:{save:{created:100,updated:100,partner:25,owned:{25:{}},coins:15000,bag:{},tms:{},ptm:{},pnat:{},pabil:{}},commit:()=>true},
    DEX_BY:{25:pokemon},DEX_ABIL:{25:['static','lightning-rod','surge-surfer']},I18n:{lang:'vi',locale:'vi-VN'},
    Moves:{BY_ID:{'thunder-shock':{id:'thunder-shock',type:'electric'},
      'surf':{id:'surf',type:'water'}},poolFor:()=>['thunder-shock']},
    TM_MOVES:{surf:[25]},TM_PRICE:{surf:440},TM_OF:d=>d===25?['surf']:[],Gacha:{}};
 const ctx={G,Date,JSON,Intl,Number,String,Math,Set,Array,Object,Map};
 for(const file of ['data/natures.js','data/abilities.js','systems/mons.js','data/shop.js']){
  vm.runInNewContext(read('src/kecleon/upstream/'+file),ctx,{timeout:4000});
 }
 return G;
}
test('New Nature applies +10/-10 to run clone and keeps Pokédex base intact',()=>{
 const G=game(),before={...G.DEX_BY[25]};
 G.Mons.setNature(25,'modest');
 const mon=G.Mons.monFor(25);
 assert.equal(mon.sa,before.sa*1.1);
 assert.equal(mon.pa,before.pa*0.9);
 assert.equal(G.DEX_BY[25].sa,before.sa);
 assert.deepEqual(Array.from(Object.keys(G.DB.save.pnat)),['25']);
});
test('Kecleon store purchases Mint and Capsule with PokéCoins into Bag',()=>{
 const G=game(),s=G.DB.save;
 assert.equal(G.Shop.buy('mint').ok,true);
 assert.equal(s.coins,13500);
 assert.equal(s.bag.mint,1);
 assert.equal(G.Shop.buy('cap').ok,true);
 assert.equal(s.bag.cap,1);
 assert.equal(G.Shop.take('mint'),true);
 assert.equal(G.Shop.count('mint'),0);
 s.coins=0;
 assert.equal(G.Shop.buy('caph').ok,false);
 assert.equal(s.bag.caph||0,0);
});
test('TM taught to compatible Pokémon is consumed once, permanent and never duplicated',()=>{
 const G=game(),s=G.DB.save;
 s.tms.surf=1;
 assert.equal(G.Mons.canLearn(25,'surf'),true);
 assert.equal(G.Mons.teach(25,'surf'),true);
 assert.equal(s.tms.surf||0,0);
 assert.ok(G.Mons.taught(25).includes('surf'));
 assert.equal(G.Mons.canLearn(25,'surf'),false);
 assert.equal(G.Mons.teach(25,'surf'),false);
});
test('Ability Capsule stores chosen Ability and rejects unowned hidden slots',()=>{
 const G=game();
 // Synthetic two-standard-slot fixture: the upstream Pokédex ability catalog overwrites mocks.
 G.DEX_ABIL[25]=['static','lightning-rod','surge-surfer'];
 const options=G.Mons.abilityChoices(25,false);
 assert.ok(options.length);
 G.Mons.setAbility(25,options[0]);
 assert.equal(G.Mons.abilityOf(25).slot,options[0]);
 assert.equal(G.Mons.abilityChoices(25,false).includes(2),false);
});
test('Compiled game includes new Kecleon screens and Nature/Ability hooks',()=>{
 if(!built())return;
 const base='vendor/pokesurvivor/';
 const html=read(base+'index.html');
 for(const k of ['scr-kecleon','pkmk-tab-shop','pkmk-tab-bag','data-go="shop"','data-go="bag"'])assert.match(html,new RegExp(k));
 for(const file of ['js/data/natures.js','js/data/abilities.js','js/data/tms.js','js/data/shop.js','js/data/ability-fx.js','js/systems/mons.js','js/ui/pkmsvv-kecleon-ui.js'])
  assert.ok(fs.existsSync(path.join(root,base,file)),file);
 const moves=read(base+'js/data/moves.js');
 const pl=read(base+'js/entities/player.js');
 const game=read(base+'js/game.js');
 assert.match(moves,/G\.Mons\.taught/);
 assert.match(game,/G\.Mons\.monFor/);
 assert.match(game,/pl\.setAbility/);
 assert.match(pl,/G\.AbilityFX\.of/);
 assert.match(read(base+'js/app.min.js'),/pkmk-balance/);
});
test('Owner-approved changelog is not modified by this integration',()=>{
 const doc=read('src/pkmsvv-changelog-v11.js');
 assert.match(doc,/15 Nâng cấp Toàn Đội/);
 assert.doesNotMatch(doc,/Kecleon Shop|Túi đồ|Cửa hàng Kecleon/);
 if(built()) { const release=read('vendor/pokesurvivor/js/data/changelog.js'); assert.ok(release.startsWith(doc)); assert.match(release,/G\.CHANGELOG\.unshift\(/); }
});

test('Kecleon Pokédex pane escapes apostrophes and refreshes after item changes',()=>{
 const G=game(),s=G.DB.save;
 G.AbilityFX={of:()=>({generic:true})};G.T=v=>v;
 vm.runInNewContext(read('src/kecleon/pkmsvv-ability-text.js'),{G});
 G.Moves.BY_ID.surf.name="Trainer's Wave";
 s.ptm={25:['surf']};
 const host={
  panel:null,
  querySelector(sel){return sel==='#pkmk-dex-stats'?this.panel:null;},
  appendChild(el){this.panel=el;}
 };
 const document={createElement(){return {
  id:'',className:'',innerHTML:'',
  remove(){if(host.panel===this)host.panel=null;},
  querySelector(){return {onclick:null};}
 };}};
 vm.runInNewContext(read('src/kecleon/pkmsvv-kecleon-ui.js'),{G,document,Date,Number,String,Intl,Math});
 G.KecleonUI.attachDex(25,host);
 const original=host.panel;
 assert.match(original.innerHTML,/Trainer&#39;s Wave/);
 assert.doesNotMatch(original.innerHTML,/Trainerundefineds/);
 s.ptm[25]=[];
 G.KecleonUI.attachDex(25,host);
 assert.notEqual(host.panel,original);
 assert.match(host.panel.innerHTML,/Chưa có/);
});

test('Pokédex Ability details explain real gameplay effects in Vietnamese/English',()=>{
 const G=game();
 vm.runInNewContext(read('src/kecleon/pkmsvv-ability-text.js'),{G});
 const v=G.PKMSVVAbilityText;
 assert.equal(v.summary('natural-cure',G.DEX_BY[25],{plus:true},false),
  'Hồi 0,3% HP mỗi giây · +8% ST hệ chính');
 assert.equal(v.summary('natural-cure',G.DEX_BY[25],{plus:true},true),
  'Regenerate 0.3% HP each second · +8% primary-type damage');
 assert.match(v.summary('levitate',G.DEX_BY[25],{},false),/dung nham/);
 assert.match(v.summary('sturdy',G.DEX_BY[25],{},false),/90 giây/);
 assert.match(v.summary('static',G.DEX_BY[25],{generic:true},false),/Điện/);
 assert.equal(v.summary('huge-power',G.DEX_BY[25],{},true),'+50% physical damage');
 // All explicitly-implemented Abilities in the original engine must be described.
 const engine=read('src/kecleon/upstream/data/ability-fx.js');
 const keys=[...engine.matchAll(/^\s*'([^']+)': \{ d:/gm)].map(m=>m[1]);
 for(const id of keys)assert.ok(v.BY[id],'Missing real-effect translation for '+id);
 for(const id of ['libero','pure-power'])assert.ok(v.BY[id]);
 assert.match(read('src/kecleon/pkmsvv-kecleon-ui.js'),/pkmk-ability-benefit/);
 assert.doesNotMatch(read('src/kecleon/pkmsvv-kecleon-ui.js'),/Hiệu ứng Đặc tính được áp dụng trong trận/);
});
test('Older save merge cannot resurrect consumed Mint, Capsule or TMs',()=>{
 if(!built())return;
 const G={DEX_BY:{25:{}},Shop:{ITEMS:{mint:{},cap:{},caph:{}}},Moves:{BY_ID:{surf:{id:'surf'}}},NATURE_BY:{hardy:{}},GlobalPower:{LIST:[],merge:(newer,older)=>newer||older||{},legacyLedger:()=>({}),cleanLedger:()=>({})}};
 const localStorage={getItem:()=>null,setItem(){},removeItem(){},length:0};
 vm.runInNewContext(read('vendor/pokesurvivor/js/core/db.js'),{G,localStorage,Math,Date,JSON,Number,String,Object,Set,Map,Intl}, {timeout:5000});
 const snap=(updated,bag,tms)=>({
  created:100,updated,coins:1000,tickets:{t1:0,t10:0},
  owned:{25:{at:100,from:'starter'}},shiny:{},partner:25,
  upgrades:{},pupg:{},dfav:{},pused:{},pstart:{},
  legends:{},arenas:{},itemsFound:{},evoMoves:{},ach:{},
  missions:{},stats:{},bag,tms,ptm:{},pnat:{},pabil:{}
 });
 const old=snap(100,{mint:2,cap:1},{surf:1});
 const latest=snap(200,{},{}); // Player spent those items after the old snapshot.
 const merged=G.DB.merge(latest,old);
 assert.deepEqual(Object.keys(merged.bag),[]);
 assert.deepEqual(Object.keys(merged.tms),[]);
 const latestPurchase=snap(300,{mint:3},{surf:2});
 const result=G.DB.merge(latestPurchase,old);
 assert.equal(result.bag.mint,3);
 assert.equal(result.tms.surf,2);
});

test('Kecleon shop to bag to use to save to reload keeps balances and permanent TM',()=>{
 const G=game(),s=G.DB.save;
 G.DEX_ABIL[25]=['static','lightning-rod','surge-surfer'];
 assert.equal(G.Shop.buy('mint').ok,true);
 assert.equal(G.Shop.buy('cap').ok,true);
 assert.equal(G.Shop.buy('tm:surf').ok,true);
 assert.equal(G.Shop.count('mint'),1);
 assert.equal(G.Shop.count('cap'),1);
 assert.equal(G.Shop.tmCount('surf'),1);
 assert.equal(G.Shop.take('mint'),true);
 G.Mons.setNature(25,'modest');
 const choices=G.Mons.abilityChoices(25,false);
 assert.ok(choices.length);
 assert.equal(G.Shop.take('cap'),true);
 G.Mons.setAbility(25,choices[0]);
 assert.equal(G.Mons.teach(25,'surf'),true);
 G.DB.commit(true);
 // Round-trip through the JSON representation that the local save stores.
 const saved=JSON.stringify(s);
 const H=game();H.DEX_ABIL[25]=['static','lightning-rod','surge-surfer'];
 H.DB.save=JSON.parse(saved);
 assert.equal(H.DB.save.coins,11560);
 assert.equal(H.Shop.count('mint'),0);
 assert.equal(H.Shop.count('cap'),0);
 assert.equal(H.Shop.tmCount('surf'),0);
 assert.equal(H.Mons.natureOf(25).id,'modest');
 assert.equal(H.Mons.abilityOf(25).slot,choices[0]);
 assert.deepEqual(Array.from(H.Mons.taught(25)),['surf']);
 assert.equal(H.Mons.canLearn(25,'surf'),false);
});

test('Original Kecleon stall loads authentic scene and bag empties with shop action',()=>{
 const scene=read('src/kecleon/pkmsvv-kecleon-scene.js');
 const ui=read('src/kecleon/pkmsvv-kecleon-ui.js');
 const theme=read('src/kecleon/pkmsvv-kecleon-theme.css');
 const patcher=read('scripts/patch-kecleon.cjs');
 const art=read('src/kecleon/pkmsvv-kecleon-icon-defs.txt');
 assert.match(scene,/G\.Sprites\.Animator\(KECLEON/);
 assert.match(scene,/const KECLEON = 352/);
 assert.match(scene,/pkmk-bubble/);
 assert.match(scene,/hueSwap\(kcx, kc, PURPLE\)/);
 assert.match(ui,/Scene\(\)\.start/);
 assert.match(ui,/pkmk-cards/);
 assert.match(ui,/data-pkmk-goshop/);
 assert.match(ui,/G\.Shop\.buy\(what\)/);
 assert.match(theme,/pkmk-stall/);
 assert.match(theme,/pkmk-empty/);
 for(const icon of ['mint','capsule','capsuleh','shop','bag'])
  assert.match(art,new RegExp(icon+':'));
 assert.match(patcher,/pkmk-scene/);
 assert.match(patcher,/pkmsvv-kecleon-scene\.js/);
 if(!built())return;
 const base='vendor/pokesurvivor/';
 const html=read(base+'index.html');
 for(const sel of ['pkmk-scene','pkmk-stall','pkmk-sign','pkmk-bubble'])
  assert.match(html,new RegExp('id="'+sel+'"'));
 const compiled=read(base+'js/ui/pkmsvv-kecleon-scene.js');
 assert.match(compiled,/G\.PKMSVVKecleonScene/);
 assert.match(read(base+'css/style.css'),/pkmk-cards/);
 const icons=read(base+'js/ui/icons.js');
 assert.match(icons,/capsuleh:/);
});

test('Pokédex shows nature-adjusted real stats and green/red +10%/-10% hints',()=>{
 const src=read('scripts/patch-nature-buff.cjs');
 assert.match(src,/G\.Mons\.monFor\(dex\)/);
 assert.match(src,/G\.Mons\.natureOf\(dex\)/);
 for(const field of ['pa','sa','df','sd','spd'])assert.ok(src.includes(", '"+field+"')"),field);
 assert.match(src,/pkmsvv-nature-up/);
 assert.match(src,/pkmsvv-nature-down/);
 const G=game();G.Mons.setNature(25,'jolly');
 const m=G.Mons.monFor(25);
 assert.ok(Math.abs(m.spd-99)<1e-9,'+10% speed must be visible');
 assert.ok(Math.abs(m.sa-1.35)<1e-9,'-10% special attack must be visible');
 assert.equal(G.DEX_BY[25].spd,90);
});
