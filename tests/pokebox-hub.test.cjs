'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const stage1=require('../src/pkmsvv-box-stage1.js');
const stage2=require('../src/pkmsvv-box-stage2.js');
const hub=require('../src/pkmsvv-box-hub.js');
function setup(){
 const raw={owned:{6:{at:1},25:{at:2}},shiny:{6:{at:3}},partner:6,partnerShiny:false,
  bag:{mint:3,cap:2,caph:1},tms:{'shadow-ball':2},ptm:{6:['flamethrower']},
  pnat:{6:['bold',100]},pabil:{6:[0,100]},coins:1000,pkmsvvBerry:{bag:{oran:2}},megaStones:{6:1}};
 const s=stage1.migrate(raw,{natureOf:()=>({id:'bold'}),abilityOf:()=>({slot:0})}).save;
 const mon={dex:6,name:'Charizard',pa:100,sa:100,df:80,sd:80,spd:85,
  hp:100,atk:100,types:['fire','flying'],rarity:3};
 const natures=[{id:'bold',up:'df',down:'pa',n:['Bold','Bold']},
  {id:'jolly',up:'spd',down:'sa',n:['Jolly','Jolly']},
  {id:'hardy',n:['Hardy','Hardy']}];
 let writes=0,fail=false;
 global.G={DB:{save:s,commit(){if(fail)return false;writes++;return true}},
  PKMSVVBox:stage1,PKMSVVBox2:stage2,DEX_BY:{6:mon,25:{dex:25,types:['electric'],rarity:2}},
  NATURES:natures,NATURE_BY:Object.fromEntries(natures.map(n=>[n.id,n])),
  DEX_ABIL:{6:[11,12,13]},ABIL:{11:['a','Blaze'],12:['a','Solar Power'],13:['a','Flame Body']},
  Moves:{BY_ID:{'shadow-ball':{name:['Bola sombra','Shadow Ball']},
   flamethrower:{name:['Lanzallamas','Flamethrower']}}},
  TM_OF:dex=>dex===6?['shadow-ball']:[],
  Mons:{
   natural:(dex,move)=>move==='flamethrower',
   natureOf:()=>natures[0],
   abilityOf:()=>({slot:0,id:11}),
   monFor:()=>({dex:6,pa:90,sa:100,df:88,sd:80,spd:85,atk:100,nature:'bold'}),
   taught:()=>['flamethrower']
  }};
 return {s,get writes(){return writes},set fail(v){fail=v},mon};
}
function add(s,dex=6){
 return stage2.makeOne(s,{dex,shiny:false},{random:()=>0,natures:[{id:'hardy'}],abilities:{[dex]:[11,12,13]}});
}
test('Team 6 defaults to current Pokémon, contains six unique instance IDs and survives reopen',()=>{
 const h=setup();assert.deepEqual(hub.team(h.s),['b1-6-n']);
 const copies=Array.from({length:6},()=>add(h.s));
 for(const m of copies.slice(0,5))hub.toggleTeam(m.id,h.s);
 assert.equal(hub.team(h.s).length,6);
 assert.equal(hub.team(h.s)[0],'b1-6-n');
 assert.ok(copies[0].id!=='b1-6-n');
 assert.equal(hub.item(h.s,copies[0].id).favorite,false,'Ready Team must not auto-favorite');
 assert.throws(()=>hub.toggleTeam(copies[5].id,h.s),/full/);
 const kept=hub.team(h.s);
 assert.deepEqual(hub.team(JSON.parse(JSON.stringify(h.s))),kept);
 assert.equal(hub.reorderTeam(kept.slice().reverse(),h.s)[0],kept.at(-1));
 assert.equal(hub.team(h.s)[0],kept.at(-1));
 assert.equal(hub.toggleTeam(copies[0].id,h.s).added,false);
 assert.equal(hub.team(h.s).length,5);
});
test('Ready Team and Favorites are independent; either protects Rank fodder',()=>{
 const h=setup(),m=add(h.s);
 assert.equal(hub.item(h.s,m.id).favorite,false);
 hub.toggleTeam(m.id,h.s);
 assert.equal(hub.item(h.s,m.id).favorite,false,'adding to Ready Team does not star the Pokémon');
 assert.equal(stage2.eligible(h.s,hub.item(h.s,m.id)),false,'team membership protects fodder');
 hub.toggleTeam(m.id,h.s);
 assert.equal(stage2.eligible(h.s,hub.item(h.s,m.id)),true,'removing from team does not change favorite');
 hub.toggleFavorite(m.id,h.s);
 assert.equal(hub.item(h.s,m.id).favorite,true);
 assert.equal(stage2.eligible(h.s,hub.item(h.s,m.id)),false,'a favorite is protected independently');
});
test('Mint changes only one specific individual and consumes exactly one Mint',()=>{
 const h=setup(),first=hub.item(h.s,'b1-6-n'),duplicate=add(h.s);
 assert.equal(first.natureId,'bold');
 hub.useMint(duplicate.id,'jolly',h.s);
 assert.equal(hub.item(h.s,duplicate.id).natureId,'jolly');
 assert.equal(hub.item(h.s,'b1-6-n').natureId,'bold');
 assert.equal(h.s.bag.mint,2);
 assert.equal(h.s.pnat[6][0],'bold');
 assert.throws(()=>hub.useMint(duplicate.id,'jolly',h.s),/different Nature/);
});
test('Ability Capsule and hidden capsule use correct inventory per individual',()=>{
 const h=setup(),duplicate=add(h.s);
 hub.useCapsule(duplicate.id,1,false,h.s);
 assert.equal(hub.item(h.s,duplicate.id).abilitySlot,1);
 assert.equal(h.s.bag.cap,1);
 assert.throws(()=>hub.useCapsule(duplicate.id,2,false,h.s),/unavailable/);
 hub.useCapsule(duplicate.id,2,true,h.s);
 assert.equal(hub.item(h.s,duplicate.id).abilitySlot,2);
 assert.equal(h.s.bag.caph,undefined);
 assert.equal(hub.item(h.s,'b1-6-n').abilitySlot,0);
});
test('TM is consumed only for the selected individual, preserving old species TM and other duplicates',()=>{
 const h=setup(),dupe1=add(h.s),dupe2=add(h.s);
 assert.equal(hub.canTeach(h.s,hub.item(h.s,dupe1.id),'shadow-ball'),true);
 hub.teach(dupe1.id,'shadow-ball',h.s);
 assert.deepEqual(hub.learned(h.s,hub.item(h.s,dupe1.id)),['shadow-ball']);
 assert.deepEqual(hub.learned(h.s,hub.item(h.s,dupe2.id)),[]);
 assert.deepEqual(hub.learned(h.s,hub.item(h.s,'b1-6-n')),['flamethrower']);
 assert.equal(h.s.tms['shadow-ball'],1);
 assert.deepEqual(h.s.ptm[6],['flamethrower']);
 assert.equal(hub.canTeach(h.s,hub.item(h.s,dupe1.id),'shadow-ball'),false);
 assert.throws(()=>hub.teach(dupe1.id,'flamethrower',h.s),/unavailable/);
});
test('failed save commit atomically restores team, items, inventory and TM',()=>{
 const h=setup(),duplicate=add(h.s),before=JSON.stringify(h.s);
 h.fail=true;
 assert.throws(()=>hub.toggleTeam(duplicate.id,h.s),/Could not save/);
 assert.equal(JSON.stringify(h.s),before);
 assert.throws(()=>hub.useMint(duplicate.id,'jolly',h.s),/Could not save/);
 assert.equal(JSON.stringify(h.s),before);
 assert.throws(()=>hub.teach(duplicate.id,'shadow-ball',h.s),/Could not save/);
 assert.equal(JSON.stringify(h.s),before);
});
test('selected instance affects Nature, Ability and learned TM in combat, without changing another instance',()=>{
 const h=setup(),duplicate=add(h.s);
 hub.useMint(duplicate.id,'jolly',h.s);
 hub.useCapsule(duplicate.id,1,false,h.s);
 hub.teach(duplicate.id,'shadow-ball',h.s);
 assert.equal(hub.installMons(G.Mons),true);
 assert.equal(hub.installMons(G.Mons),false);
 assert.equal(G.Mons.natureOf(6).id,'bold');
 assert.equal(G.Mons.abilityOf(6).id,11);
 assert.deepEqual(G.Mons.taught(6),['flamethrower']);
 h.s.pkmsvvSelectedInstanceId=duplicate.id;
 assert.equal(G.Mons.natureOf(6).id,'jolly');
 assert.equal(G.Mons.abilityOf(6).id,12);
 assert.deepEqual(G.Mons.taught(6),['shadow-ball']);
 const mon=G.Mons.monFor(6);
 assert.ok(Math.abs(mon.pa-100)<.0001,'removes old -10% physical attack effect');
 assert.ok(Math.abs(mon.sa-90)<.0001,'adds Jolly -10% special attack');
 assert.ok(mon.spd>85);
});
test('isolated QA packagers include Hub UI and never modify production prepare script',()=>{
 const root=path.join(__dirname,'..');
 for(const script of ['scripts/build-pokebox-stage1-qa.cjs','scripts/build-pokebox-stage1-pc-qa.cjs','scripts/patch-pokebox-stage4-apk-qa.cjs']){
  const src=fs.readFileSync(path.join(root,script),'utf8');
  for(const f of ['pkmsvv-box-hub.js','pkmsvv-box-hub-ui.js','pkmsvv-box-hub.css'])assert.match(src,new RegExp(f.replace('.','\\.')));
 }
 const prod=fs.readFileSync(path.join(root,'scripts/prepare-game.cjs'),'utf8');
 assert.doesNotMatch(prod,/pkmsvv-box-hub/);
 const ui=fs.readFileSync(path.join(root,'src/pkmsvv-box-hub-ui.js'),'utf8');
 assert.match(ui,/pok(e|é)dex/i);
 assert.match(ui,/data-go="dex"/);
 assert.match(ui,/data-hub-tm/);
});

test('Pokédex QA UI restores all old filters, Gen 1 SVG icon and correct menu priority',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub-ui.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub.css'),'utf8');
 for(const key of ['pkmbx-dex-search','pkmbx-dex-gen','pkmbx-dex-rarity','pkmbx-dex-status',
  'pkmbx-dex-type','pkmbx-dex-order','pkmbx-dex-fav','pkmbx-dex-sort-close']){
  assert.ok(ui.includes(key),'missing '+key);
 }
 assert.match(ui,/function pokedexIcon\(\)/);
 assert.match(ui,/function pcTabs\(selected\)/);
 assert.match(ui,/tab\('dex',pokedexIcon\(\)/);
 assert.match(ui,/tab\('box','📦 PokéBox'\)/);
 assert.match(ui,/function showPC\(which\)/);
 assert.match(ui,/function openPC\(target='dex'/);
 assert.match(ui,/boxPane.appendChild\(dexPane\)/);
 assert.match(ui,/\$\('pkmsvv-pokebox-button'\)\?\.remove\(\)/);
 assert.match(ui,/function legacySelect\(it\)/);
 assert.match(ui,/function legacyFavorite\(it\)/);
 assert.match(ui,/pkmbx-use/);
 assert.match(ui,/pkmbx-star/);
 assert.match(ui,/Tăng 10%/);
 assert.match(ui,/Đặc tính/);
 assert.match(css,/pkmbx-hub-stats/);
 assert.match(css,/pkmbx-gen1-icon/);
});

test('legacy saves can persist Ready Team 6 without migration or modifying Favorites',()=>{
 const h=setup();
 const legacy={owned:{6:{at:1},25:{at:2}},shiny:{6:{at:3}},
  partner:6,partnerShiny:false,coins:300,
  pnat:{6:['bold',100]},pabil:{6:[0,100]},pkmsvvLegacyFavoriteOverrides:{6:true}};
 G.DB.save=legacy;
 const original=JSON.stringify(legacy);
 assert.deepEqual(hub.team(legacy),['b1-6-n']);
 assert.equal(hub.toggleTeam('b1-25-n',legacy).added,true);
 assert.deepEqual(hub.team(legacy),['b1-6-n','b1-25-n']);
 assert.equal(legacy.pkmsvvBoxSchema,undefined);
 assert.deepEqual(legacy.pkmsvvLegacyFavoriteOverrides,{6:true});
 assert.deepEqual(legacy.pnat,{6:['bold',100]});
 assert.equal(hub.toggleTeam('b1-6-n',legacy).added,false);
 assert.deepEqual(hub.team(legacy),['b1-25-n']);
 assert.throws(()=>hub.toggleTeam('b1-999-n',legacy),/not owned/);
 assert.equal(legacy.pkmsvvBoxSchema,undefined);
 const migrated=stage1.migrate(legacy).save;
 assert.deepEqual(migrated.pkmsvvTeam6,['b1-25-n']);
 assert.equal(migrated.pkmsvvBox.find(x=>x.id==='b1-6-n').favorite,true);
 assert.deepEqual(legacy.pkmsvvLegacyFavoriteOverrides,{6:true});
 // Failure must roll back the full save without touching the old team.
 const snapshot=JSON.stringify(legacy);
 h.fail=true;
 assert.throws(()=>hub.toggleTeam('b1-6-s',legacy),/Could not save ready team/);
 assert.equal(JSON.stringify(legacy),snapshot);
 h.fail=false;
 assert.notEqual(JSON.stringify(legacy),original,'only explicit ready-team edits were saved');
});
test('clean PokéBox UI keeps six visible slots and relocates migration to Save Manager',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub-ui.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub.css'),'utf8');
 assert.match(ui,/Đội hình 6 Pokémon sẵn sàng/);
 assert.doesNotMatch(ui,/Đội hình 6 yêu thích|Favorite Team 6/);
 assert.doesNotMatch(ui,/id="pkmbx-status"|id="pkmbx-warning"|id="pkmbx-export"|id="pkmbx-migrate"/);
 assert.match(ui,/function attachMigrationToSaveManager/);
 assert.match(ui,/pkmsvv.prepokebox/);
 assert.match(ui,/renderTeam\(boxPane,s,items\)/);
 assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
 assert.match(css,/height:70px/);
});

test('Original PC remains, and Pokémon entry has Box, Dex and preserved upgrade actions',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub-ui.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub.css'),'utf8');
 const clean=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-pc-menu-clean-qa.js'),'utf8');
 assert.match(src,/if\(original&&extra\)/);
 assert.match(src,/extra\.setAttribute\('aria-label','Pokémon'\)/);
 assert.match(src,/pkmsvv-menu-wiki/);
 assert.doesNotMatch(clean,/pkmsvv-pc-dex/,'Pokémon tabs must not be duplicated inside the PC utilities');
 assert.doesNotMatch(clean,/pkmsvv-pc-box/,'Pokémon tabs must not be duplicated inside the PC utilities');
 assert.doesNotMatch(clean,/pkmsvv-pc-upgrades/,'Pokémon tabs must not be duplicated inside the PC utilities');
 assert.match(clean,/pkmsvv-v15-event/);
 assert.match(clean,/pkmsvv-save-banner/);
 assert.match(clean,/restorePartner/);
 assert.match(clean,/reorderMainMenu\(menu\)/,'home menu must reorder launchers');
 assert.match(clean,/const order=\[pokemon,pc,coop,arena\]/);
 assert.match(clean,/PokéBox · Pokédex · Nâng cấp/,'Pokémon submenu summary must be correct');
 assert.match(clean,/Pokémon hỗ trợ · Mega · Berry/,'PC submenu keeps its utility summary');
 assert.match(clean,/banner\.setAttribute\('translate','no'\)/,'backup warning must opt out of auto translation');
 assert.match(clean,/Nhớ sao lưu thường xuyên để tránh mất dữ liệu/);
 assert.match(src,/openDex\(\)/);
 assert.match(src,/function showPC\(which\)/);
 assert.match(src,/bindPcTabs\(dexPane\)/);
 assert.match(src,/showPC\(target\)/);
 assert.doesNotMatch(src,/insertBefore\(ref,dex\)/);
 assert.match(css,/pkmbx-dex-inside-pc\[hidden\]/);
 assert.match(css,/\.pkmbx-pc-tabs/);
 assert.match(src,/tab\('upgrade'/);
 assert.ok(src.indexOf("tab('box'") < src.indexOf("tab('dex'"),'PokéBox before Pokédex');
 assert.ok(src.indexOf("tab('dex'") < src.indexOf("tab('upgrade'"),'Pokédex before Nâng cấp');
 assert.match(src,/G\.MenuUI\.openUpgrades\(\)/,'original single upgrade route');
 assert.match(src,/G\.GlobalPowerUI\.open\(\)/,'original global upgrade route');
 assert.doesNotMatch(clean,/grid\.prepend\(box,dex,upgrade\)/,'PC must not duplicate Pokémon-only tabs');
 assert.doesNotMatch(clean,/menu\.querySelector\('\[data-go="dex"\]'\)\?\.remove\(\)/);
 assert.match(css,/pkmbx-upgrade-overlay\[hidden\]/);
 assert.match(css,/pkmbx-dex-details/);

});


test('Rank overview uses only Stage 2 eligible copies/shards and never mutates save',()=>{
 const h=setup(),target=hub.item(h.s,'b1-6-n');
 const plain=add(h.s),fav=add(h.s),inTeam=add(h.s),locked=add(h.s);
 hub.toggleFavorite(fav.id,h.s);
 hub.toggleTeam(inTeam.id,h.s);
 hub.item(h.s,locked.id).locked=true;
 const saved=JSON.stringify(h.s);
 const initial=hub.rankOverview(h.s,hub.item(h.s,target.id));
 assert.deepEqual({rank:initial.rank,cost:initial.cost,copies:initial.copies,fragments:initial.fragments,
  available:initial.available,canRank:initial.canRank},{rank:0,cost:1,copies:1,fragments:0,
  available:1,canRank:true});
 assert.equal(JSON.stringify(h.s),saved,'render data must never consume copies or write to save');
 hub.item(h.s,plain.id).locked=true;
 const noMaterial=hub.rankOverview(h.s,hub.item(h.s,target.id));
 assert.equal(noMaterial.canRank,false);
 assert.equal(noMaterial.missing,1);
 h.s.pkmsvvRankFragments={6:2};
 hub.item(h.s,target.id).rank=1;
 const shards=hub.rankOverview(h.s,hub.item(h.s,target.id));
 assert.equal(shards.rank,1);
 assert.equal(shards.cost,2);
 assert.equal(shards.available,2);
 assert.equal(shards.canRank,true);
 assert.equal(shards.fragments,2);
 hub.item(h.s,target.id).rank=5;
 const capped=hub.rankOverview(h.s,hub.item(h.s,target.id));
 assert.equal(capped.cost,0);
 assert.equal(capped.canRank,false);
 assert.equal(capped.rank,5);
 const unknown=hub.rankOverview({...h.s,pkmsvvBoxSchema:100},target);
 assert.equal(unknown.enabled,false,'unknown save schema must never offer Rank');
 assert.equal(unknown.canRank,false);
});

test('PokéBox V2 QA UI provides visible five-star rank, material bar and sorting without live deploy',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub-ui.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub.css'),'utf8');
 for(const key of ['pkmbx-rank-stars','pkmbx-rank-overview','pkmbx-rank-progress',
  'pkmbx-rank-materials','pkmbx-rank-shortcut','pkmbx-stack','pkmbx-ready',
  'pkmbx-sort','pkmbx-found-count']){
  assert.ok(src.includes(key),'missing PokéBox V2 widget '+key);
  assert.ok(css.includes(key),'missing PokéBox V2 style '+key);
 }
 assert.match(src,/Hub\.rankOverview\(s,x\)/);
 assert.match(src,/rank===3\?' · '/);
 assert.match(src,/shown\.sort\(/);
 assert.match(src,/rankStars\(progress\?\.rank\?\?it\.rank\)/);
 assert.match(src,/const counts=new Map\(\),groups=new Map\(\)/);
 assert.match(src,/data-box-variant="normal"/);
 assert.match(src,/data-box-variant="shiny"/);
 assert.match(src,/G\.DEX_ABIL\?\.\[infoDex\]/);
 assert.doesNotMatch(src,/Possible Natures|Các tính cách có thể xuất hiện/);
 assert.match(src,/pkmbx-dex-ability-row/);
 assert.match(src,/abilityBenefit\(id\)/);
 assert.match(src,/const possibleAbilities=/);
 assert.match(src,/pkmbx-hub-main"><div class="pkmbx-hub-left/);
 assert.doesNotMatch(src,/Save cũ đang xem trước/);
 assert.match(css,/grid-template-columns:minmax\(0,1\.75fr\) minmax\(330px,1fr\)/);
 assert.match(css,/\.pkmbx-hub-slot\.rank-ready/);
 const prod=fs.readFileSync(path.join(__dirname,'../scripts/prepare-game.cjs'),'utf8');
 assert.doesNotMatch(prod,/pkmsvv-box-hub-ui/,'V2 must remain isolated from production');
});
