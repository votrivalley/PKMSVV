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
test('Arena roster is precisely the six PokéBox Ready slots, never all owned or Favorites',()=>{
 const h=setup();const copy=add(h.s,6);
 assert.deepEqual(hub.arenaReady(h.s).map(x=>x.id),['b1-6-n']);
 hub.toggleFavorite(copy.id,h.s);
 assert.equal(hub.arenaReady(h.s).length,1,'favorite clone outside Team must not join Arena');
 hub.toggleTeam(copy.id,h.s);
 hub.toggleTeam('b1-6-s',h.s);
 const ready=hub.arenaReady(h.s);
 assert.deepEqual(ready.map(x=>x.id),hub.team(h.s));
 assert.deepEqual(ready.map(x=>x.dex),[6,6,6],'same-species copies remain independent slots');
 assert.equal(ready.filter(x=>x.shiny).length,1,'Shiny slot is independently eligible');
 assert.equal(ready.find(x=>x.id==='b1-6-s').shiny,true);
 assert.equal(hub.team(h.s).length,3,'reading Arena never mutates Ready Team');
 hub.toggleTeam(copy.id,h.s);
 assert.equal(hub.arenaReady(h.s).some(x=>x.id===copy.id),false,'removal takes effect immediately');
});
test('Arena roster supports old saves without migrating or rewriting their Box',()=>{
 setup();
 const old={owned:{6:{at:1},25:{at:2}},shiny:{6:{at:3}},partner:6,partnerShiny:false};
 const first=hub.legacyTeam(old);
 assert.equal(first.length,1);
 old.pkmsvvLegacyReady6=[first[0]];
 const ready=hub.arenaReady(old);
 assert.deepEqual(ready.map(x=>x.id),first);
 assert.equal(ready[0].dex,6);
 assert.equal(old.pkmsvvBox,undefined,'read-only roster must not migrate an old save');
});
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
test('Mint rerolls one individual randomly and excludes current Nature',()=>{
 const h=setup(),copy=add(h.s),before=h.s.bag.mint;
 const receipt=hub.useMint(copy.id,h.s,()=>.9);
 assert.equal(receipt.natureId,'jolly');
 assert.equal(hub.item(h.s,copy.id).natureId,'jolly');
 assert.equal(hub.item(h.s,'b1-6-n').natureId,'bold');
 assert.equal(h.s.bag.mint,before-1);
 assert.equal(h.s.pnat[6][0],'bold');
 assert.throws(()=>hub.useMint(copy.id,h.s,()=>-1),/Invalid random draw/);
 assert.equal(h.s.bag.mint,before-1);
});
test('Standard Capsule has 5% Hidden chance; event Capsule 15%, both atomic',()=>{
 const h=setup(),a=add(h.s),b=add(h.s),c=add(h.s);
 hub.item(h.s,a.id).abilitySlot=0;
 hub.item(h.s,b.id).abilitySlot=0;
 hub.item(h.s,c.id).abilitySlot=0;
 const ordinary=hub.useCapsule(a.id,'cap',h.s,()=>0);
 assert.equal(ordinary.slot,2,'standard Capsule can award Hidden');
 assert.equal(ordinary.chance,.05);
 assert.equal(h.s.bag.cap,1);
 const rare=hub.useCapsule(b.id,'caph',h.s,()=>.14);
 assert.equal(rare.slot,2,'rare Capsule grants Hidden under 15% roll');
 assert.equal(rare.chance,.15);
 assert.equal(h.s.bag.caph,undefined);
 const standard=hub.useCapsule(c.id,'cap',h.s,()=>.6);
 assert.equal(standard.slot,1);
 assert.equal(h.s.bag.cap,undefined);
 const before=JSON.stringify(h.s);
 assert.throws(()=>hub.useCapsule(c.id,'cap',h.s,()=>0),/No Capsule/);
 assert.equal(JSON.stringify(h.s),before);
});
test('Single-Ability Pokémon cannot waste Capsules and hidden-only outcomes refund failed rolls',()=>{
 const h=setup(),one=add(h.s),x=hub.item(h.s,one.id);x.abilitySlot=0;
 G.DEX_ABIL[6]=[11,0,0];
 const before=JSON.stringify(h.s);
 const blocked=hub.useCapsule(one.id,'cap',h.s,()=>.7);
 assert.equal(blocked.changed,false);
 assert.equal(blocked.reason,'no-alternative');
 assert.equal(JSON.stringify(h.s),before);
 G.DEX_ABIL[6]=[11,0,13];
 const missed=hub.useCapsule(one.id,'cap',h.s,()=>.7);
 assert.equal(missed.changed,false);
 assert.equal(missed.reason,'hidden-missed');
 assert.equal(JSON.stringify(h.s),before,'missed Hidden roll never consumes a capsule');
 assert.equal(h.writes,0,'failed capsule must not commit a save');
 assert.equal(hub.useCapsule(one.id,'cap',h.s,()=>.01).slot,2);
 assert.equal(h.writes,1,'successful reroll commits once');
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
 assert.throws(()=>hub.useMint(duplicate.id,h.s,()=>0),/Could not save/);
 assert.equal(JSON.stringify(h.s),before);
 assert.throws(()=>hub.teach(duplicate.id,'shadow-ball',h.s),/Could not save/);
 assert.equal(JSON.stringify(h.s),before);
});
test('selected instance affects Nature, Ability and learned TM in combat, without changing another instance',()=>{
 const h=setup(),duplicate=add(h.s);
 hub.item(h.s,duplicate.id).abilitySlot=0;
 hub.useMint(duplicate.id,h.s,()=>.9);
 hub.useCapsule(duplicate.id,'cap',h.s,()=>.5);
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
 assert.match(ui,/data-pkmbx-action="tm"/);
 assert.match(ui,/pkmbx-action-dialog/);
 assert.doesNotMatch(ui,/data-box-tab="items"/);
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
test('Capsule no-op feedback is localized, and hidden-only odds are explained',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub-ui.js'),'utf8');
 assert.match(ui,/receipt\.changed===false/);
 assert.match(ui,/Chưa trúng Đặc tính Ẩn\. Không mất Viên nang/);
 assert.match(ui,/Chỉ còn Đặc tính Ẩn/);
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
 assert.match(clean,/syncLauncherLabels\(menu\)/);
 assert.match(clean,/relabel\(play,\['Chơi ngay','Play now','Play'\],L\('Khám phá','Explore'\)\)/);
 assert.match(clean,/if\(n\.nodeType!==3\)/,'native buttons with bare text must also be renamed');
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
 // A protected additional NORMAL (favorite/team/locked) can contribute once.
 // Shiny does not contribute anything, even if the species has both forms.
 const protectedOrdinary=hub.rankOverview(h.s,hub.item(h.s,target.id));
 assert.ok(protectedOrdinary.protectedForms>=1);
 assert.equal(protectedOrdinary.canRank,true);
 h.s.pkmsvvRankClaimedCopies={6:stage2.claimableList(h.s,target.id).map(x=>x.id)};
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
 assert.match(src,/if\(!x\.shiny\)counts\.set/,'Shiny does not inflate the visible xN badge');
 assert.match(src,/data-box-variant="normal"/);
 assert.match(src,/data-box-variant="shiny"/);
 assert.match(src,/G\.DEX_ABIL\?\.\[infoDex\]/);
 assert.doesNotMatch(src,/Possible Natures|Các tính cách có thể xuất hiện/);
 assert.match(src,/pkmbx-dex-ability-row/);
 assert.match(src,/abilityBenefit\(id,infoDex\)/);
 assert.match(src,/const possibleAbilities=/);
 assert.match(src,/pkmbx-hub-main"><div class="pkmbx-hub-left/);
 assert.doesNotMatch(src,/Save cũ đang xem trước/);
 assert.match(css,/grid-template-columns:minmax\(0,1\.75fr\) minmax\(330px,1fr\)/);
 assert.match(css,/\.pkmbx-hub-slot\.rank-ready/);
 const prod=fs.readFileSync(path.join(__dirname,'../scripts/prepare-game.cjs'),'utf8');
 assert.doesNotMatch(prod,/pkmsvv-box-hub-ui/,'V2 must remain isolated from production');
});

test('Rank shows duplicates automatically and never requires conversion into fragments',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub-ui.js'),'utf8');
 const dialog=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-stage2-ui.js'),'utf8');
 assert.match(ui,/function renderRank\(host,it,ready\)/);
 assert.match(ui,/function performRank\(it,ready\)/);
 assert.match(ui,/api\.rankUpAuto\(it\.id,s\)/);
 assert.match(ui,/progress\.copies/);
 assert.match(ui,/progress\.fragments/);
 assert.match(ui,/\(boxItemsCache\|\|listPreview\(\)\)\.filter\(x=>x\.dex===it\.dex\)\.length/, 'Rank tab uses current snapshot without re-enumerating legacy Box');
 assert.match(ui,/Bản trùng khả dụng/);
 assert.match(ui,/Không cần đổi thành Mảnh Rank/);
 assert.match(dialog,/api\.rankUpAuto\(x\.id,s\(\)\)/);
 assert.doesNotMatch(dialog,/data-pkmbx-convert|Đổi bản sao thành Mảnh Rank/,
  'the legacy shard-conversion button must not be visible');
});
test('Newspaper graphic replaces unsupported News glyph while retaining button semantics',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-pc-menu-clean-qa.css'),'utf8');
 assert.match(css,/#scr-menu #btn-news::before/);
 assert.match(css,/data:image\/svg\+xml,/);
 assert.match(css,/#scr-menu #btn-news > svg/);
 assert.match(css,/#scr-menu #btn-news\{display:flex/);
});

test('Ready Team actions are above Pokémon hero; singleton species never shows x1',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub-ui.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub.css'),'utf8');
 assert.match(ui,/profile\.insertBefore\(topActions,profile\.firstChild\)/);
 assert.match(ui,/!it\.shiny&&duplicates>1\?'<span class="pkmbx-stack/);
 assert.match(ui,/×'\+duplicates/);
 assert.match(ui,/performRank\(it,ready\)/);
 assert.doesNotMatch(ui,/function openInlineRank/);
 assert.match(css,/#pkmsvv-pokebox-overlay #pkmbx-profile>\.pkmbx-hub-buttons/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});
test('Normal + Shiny alone does not show rank-ready; a new ordinary clone unlocks both species views',()=>{
 const h=setup(),original=hub.item(h.s,'b1-6-n'),skin=hub.item(h.s,'b1-6-s');
 let a=hub.rankOverview(h.s,original),b=hub.rankOverview(h.s,skin);
 assert.equal(a.protectedForms,0);assert.equal(b.protectedForms,0);
 assert.equal(a.cost,1);assert.equal(b.cost,1);
 assert.equal(a.canRank,false);assert.equal(b.canRank,false);
 const duplicate=add(h.s);
 a=hub.rankOverview(h.s,original);b=hub.rankOverview(h.s,skin);
 assert.equal(a.copies,1);assert.equal(b.copies,1);
 assert.equal(a.canRank,true);assert.equal(b.canRank,true);
 assert.equal(stage2.rankUpAuto(skin.id,h.s).to,1);
 assert.ok(stage2.get(h.s,skin.id)?.shiny,'Shiny survives the upgrade');
});

test('PokéBox has top BOX arrows and a six-column visible grid with type-themed detail and stat bars',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub-ui.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub.css'),'utf8');
 assert.match(ui,/pkmbx-box-carousel/);
 assert.match(ui,/pkmbx-box-label/);
 assert.match(ui,/BOX '\+\(page\+1\)/);
 assert.match(ui,/pkmbx-empty-slot/);
 assert.match(css,/\.pkmbx-box-frame>\.pkmbx-grid/);
 assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
 assert.match(ui,/const PALETTE=\{/);
 for(const type of ['fire','water','electric','grass','psychic','ghost','steel','fairy']){
  assert.ok(ui.includes(type+':['),'missing '+type+' theme');
 }
 for(const text of ['Máu','Sát thương','Tốc độ','Hồi chiêu']){
  assert.ok(ui.includes(text),'missing localized stat '+text);
 }
 assert.match(ui,/pkmbx-meter-track/);
 assert.match(css,/\.pkmbx-meter-fill/);
 assert.match(css,/--pkmbx-type/);
});

test('One-click Rank updates display immediately, turns controls grey and never opens native confirm',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub-ui.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub.css'),'utf8');
 const modal=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-stage2-ui.js'),'utf8');
 const from=ui.indexOf('function performRank(it,ready){');
 const to=ui.indexOf('function renderTeam(',from);
 assert.ok(from>=0&&to>from);
 const rank=ui.slice(from,to);
 assert.doesNotMatch(rank,/\bconfirm\(/,'explicit click is enough to spend duplicates');
 assert.match(rank,/rankBusy=true/,'rapid double click protection');
 assert.match(rank,/api\.rankUpAuto\(it\.id,s\)/,'rank mutation runs immediately');
 assert.match(ui,/function saveAction\(fn\)\{[\s\S]*?renderBox\(\)/,
  'successful mutation must redraw the cards and details');
 assert.match(ui,/progress\?\.canRank\?' rank-ready'/,
  'left grid readiness must be calculated from fresh save');
 assert.match(ui,/pkmbx-rank-tab/);
 assert.match(ui,/rank-disabled/);
 assert.match(ui,/!canRank\|\|G\.DB\?\.guest\?'disabled'/);
 assert.match(css,/\.pkmbx-rank-overview\.is-rank-disabled/);
 assert.match(css,/\.pkmbx-rank-tab\.rank-disabled/);
 const upgradeStart=modal.indexOf("if(upgrade)upgrade.onclick");
 const upgradeEnd=modal.indexOf("for(const b of body.querySelectorAll('[data-pkmbx-branch]'))",upgradeStart);
 assert.ok(upgradeStart>=0&&upgradeEnd>upgradeStart);
 assert.doesNotMatch(modal.slice(upgradeStart,upgradeEnd),/\bconfirm\(/,
  'Rank Up needs no prompt; unrelated costly Prism/branch actions may still confirm');
});
test('PC knowledge hides completed Skill Awakening and removes obsolete seasonal row',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-pc-menu-clean-qa.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-pc-menu-clean-qa.css'),'utf8');
 assert.match(js,/tracker\.progress\(save\)\.count>=8/);
 assert.match(js,/Skill Awakening\|Thức tỉnh kỹ năng/);
 assert.match(js,/Sương Ký Ức\|Memory Mist/);
 assert.match(js,/tidyPcKnowledge\(overlay\)/);
 assert.match(js,/if\(grid\.dataset\.pkmsvvUnified==='1'\)return true/,
  'PC knowledge cleanup must run when native menu rebuilds its rows');
 for(const item of ['.pkmbx-hub-panel','.pkmbx-dex-panel','.pkmbx-upgrade-panel','.pkmsvv-pc-panel'])
  assert.ok(css.includes(item),'missing shared palette for '+item);
});

test('legacy Box explains Gacha duplicates truthfully and offers backup-gated migration in place',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub-ui.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub.css'),'utf8');
 assert.match(ui,/pkmbx-legacy-migration/);
 assert.match(ui,/migrateLegacyFromBox/);
 assert.match(ui,/PKMSVVSaveUI\?\.backup\?\.\(\)/);
 assert.match(ui,/Box\.persistMigration\(\)/);
 assert.match(ui,/pkmsvv\.prepokebox\./);
 assert.match(ui,/pkmbx-ready/);
 assert.match(ui,/onlyRankReady&&!ready/);
 assert.match(ui,/Past Recruitment duplicates without individual IDs cannot be reconstructed/);
 assert.match(ui,/L\('⬆ Nâng Rank','⬆ Rank Up'\)/);
 assert.doesNotMatch(ui,/Bật PokéBox để nâng Rank|Activate PokéBox for Rank/);
 assert.match(css,/\.pkmbx-legacy-migration\[hidden\]/);
});
test('Ability names, translated effect summaries and explicit contrast are used in BOTH Box and Dex',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub-ui.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub.css'),'utf8');
 const txt=fs.readFileSync(path.join(__dirname,'../src/kecleon/pkmsvv-ability-text.js'),'utf8');
 assert.match(ui,/PKMSVVAbilityText\?\.summary\?\.\(id,mon,fx,english\)/);
 assert.match(ui,/G\.AbilityFX\?\.of\?\.\(id,mon\)/);
 assert.match(ui,/abilityBenefit\(id,infoDex\)/);
 assert.match(ui,/abilityBenefit\(ability\?\.id\|\|'',it\.dex\)/);
 assert.doesNotMatch(ui,/typeof abilityData\[2\]==='string'/,'a French name must not be used as an Ability effect');
 assert.match(css,/\.pkmbx-dex-ability-row span\{[\s\S]*color:#1b4450!important/);
 assert.match(css,/\.pkmbx-ability-effect\{[\s\S]*color:#edfaf7!important/);
 for(const id of ['blaze','solar-power','compound-eyes','overgrow','chlorophyll'])
  assert.match(txt,new RegExp('^'+id+'\\|','m'));
});
test('Wiki describes ten Fusion effects, has corresponding WebP icons and replaces the compiled legacy module',()=>{
 const pilot=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-bond-fusion.js'),'utf8');
 const wiki=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-wiki.js'),'utf8');
 const compiled=fs.readFileSync(path.join(__dirname,'../scripts/patch-qa-compiled-modules.cjs'),'utf8');
 assert.doesNotMatch(compiled,/\['PKMSVVWiki','src\/pkmsvv-wiki\.js'\]/,
  'PC Wiki is standalone; never assume the compiled game contains its assignment');
 for(const p of ['scripts/build-pokebox-stage1-qa.cjs',
  'scripts/build-pokebox-stage1-pc-qa.cjs','scripts/patch-pokebox-stage4-apk-qa.cjs']){
  const build=fs.readFileSync(path.join(__dirname,'..',p),'utf8');
  assert.match(build,/pkmsvv-wiki-qa\.js/,'isolated '+p+' must ship the corrected Wiki source');
 }
 assert.match(wiki,/formula\.id\+'\.webp'/);
 assert.match(wiki,/formula\.viEffect/);
 assert.match(wiki,/pkmsvv-fusion-benefit/);
 assert.match(wiki,/pkmsvv-fusion-recipe-grid|pkmsvv-fusion-recipes/);
 for(const id of ['ember-quick','water-tackle','grass-spin','spark-quick','mind-tackle','fire-gust','bubble-ice','leaf-rock','shadow-mind','thunder-claw']){
  assert.match(pilot,new RegExp("id:'"+id+"'[^\\n]+viEffect:"));
 }
});

test('Select to battle refreshes the HOME portrait immediately after successful saved instance choice',()=>{
 const h=setup(),copy=add(h.s,6);
 let painted=0;
 G.PKMSVVMenuCleanQA={restorePartner(){painted++;}};
 assert.equal(stage1.selectInstance(copy.id),true);
 assert.equal(h.s.pkmsvvSelectedInstanceId,copy.id);
 assert.equal(h.s.partner,copy.dex);
 assert.equal(painted,1,'must redraw menu without waiting for game end or MenuUI.open');
 assert.equal(stage1.selectInstance('no-such-pokemon'),false);
 assert.equal(painted,1,'invalid selection must not redraw home');
 h.fail=true;
 const other=hub.item(h.s,'b1-6-n');
 assert.equal(stage1.selectInstance(other.id),false,'persistence failure rolls back');
 assert.equal(painted,1,'unsaved choice must never reach home');
 assert.equal(h.s.pkmsvvSelectedInstanceId,copy.id,'failed commit preserves prior Pokémon');
});
test('Legacy Box Select immediately invokes same home redraw without an intermediate battle',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub-ui.js'),'utf8');
 const src=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-pc-menu-clean-qa.js'),'utf8');
 assert.match(ui,/function legacySelect\(it\)\{[\s\S]*?legacyCommit\(s=>[\s\S]*?PKMSVVMenuCleanQA\?\.restorePartner\?\.\(\)/);
 assert.match(src,/function restorePartner\(\)/);
 assert.match(src,/portrait\.dataset\.pkmsvvPortraitKey!==portraitKey/);
 assert.match(src,/G\.UI\.sprite\(portrait,Number\(s\.partner\)/);
});


test('Android 2.0.1 home icons preserve all three authored WebP sprites and one grid cell',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-pc-menu-clean-qa.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-v20-ui-qa.css'),'utf8');
 const original=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-pc-menu-clean-qa.css'),'utf8');
 const packaging=fs.readFileSync(path.join(__dirname,'../scripts/patch-v20-android-production.cjs'),'utf8');
 assert.match(js,/function normalizeLauncherGrid\(button,art,type\)/);
 assert.match(js,/const title=\{pc:'PC',coop:'Co-op',arena:'Arena'\}/);
 assert.match(js,/normalizeLauncherGrid\(button,art,type\)/);
 assert.match(js,/node\.nodeType===3/);
 assert.match(js,/node\.remove\(\)/);
 assert.match(js,/pkmsvv-icon-unified/);
 assert.match(css,/Android 2\.0\.1 icon-grid hotfix/);
 assert.match(css,/grid-template-columns:42px minmax\(0,1fr\)!important/);
 assert.match(css,/grid-column:1!important/);
 assert.match(css,/grid-column:2!important/);
 assert.match(css,/background-size:126px 42px!important/);
 for(const cls of ['pkmsvv-menu-icon-pc','pkmsvv-menu-icon-coop','pkmsvv-menu-icon-arena'])
  assert.ok(original.includes(cls),'missing custom-designed '+cls+' sprite');
 assert.match(packaging,/pkmsvv-pc-menu-clean-qa\.js/);
 assert.match(packaging,/pkmsvv-v20-ui-qa\.css/);
 assert.match(packaging,/pkmsvv-menu-icons\.webp/);
});
