'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const folder=path.join(__dirname,'romfs');
const real=JSON.parse(fs.readFileSync(path.join(folder,'real-game-catalog.json'),'utf8'));
const built=JSON.parse(fs.readFileSync(path.join(folder,'kanto-config.json'),'utf8'));
const main=fs.readFileSync(path.join(folder,'main.js'),'utf8');
test('Native ROM embeds all 103 REAL PKMSVV move definitions, not hardcoded sample',()=>{
 assert.equal(real.format,'pkmsvv-switch-native-real-catalog-v1');
 assert.equal(real.moves.length,103);
 assert.equal(built.nativeAlpha.realMoves.length,103);
 assert.equal(new Set(real.moves.map(m=>m.id)).size,103);
 assert.ok(new Set(real.moves.map(m=>m.kind)).size>=20);
 assert.ok(real.moves.every(m=>m.id&&m.name&&m.kind&&m.cd>0&&Number.isFinite(m.dmg)));
 assert.ok(!main.includes('document.getElementById('),'no DOM bundle');
});
test('Full Kanto Dex #1-151 comes from real compiled Pokédex, not handcrafted Pokémon',()=>{
 const roster=built.nativeAlpha.realPokedex;
 assert.equal(real.pokemon.length,151);
 assert.equal(roster.length,151);
 assert.ok(roster.every((p,i)=>p.dex===i+1&&p.name&&p.types.length>=1));
 assert.equal(roster.find(p=>p.dex===25)?.name,'Pikachu');
 assert.equal(roster.find(p=>p.dex===150)?.name,'Mewtwo');
 assert.ok(roster.every(p=>p.hp>0&&p.spd>0));
});
test('Runtime remains native and keeps real source provenance separate from save',()=>{
 assert.equal(built.nativeAlpha.realSource,'PKMSVV compiled Android QA build 42868942245');
 assert.match(real.runtime,/nx\.js native/);
 assert.doesNotMatch(real.runtime,/WebView/);
 const ctx={screen:{getContext(){return new Proxy({},{
  get(o,k){return k in o?o[k]:()=>{}},set(o,k,v){o[k]=v;return true}})}},
 navigator:{getGamepads(){return []}},requestAnimationFrame(){},console:{error(){}}};
 const context=vm.createContext(ctx);
 vm.runInContext(main,context,{timeout:6000});
 assert.equal(vm.runInContext('alpha.availableMoveCount',context),103);
 assert.equal(vm.runInContext('alpha.availablePokemonCount',context),151);
 assert.equal(vm.runInContext('alpha.realDexLength',context),151);
 assert.equal(vm.runInContext('lastError',context),'');
});

test('Native gameplay selects Gen1 wild opponents from original stats and source rarity',()=>{
 const ctx={
  screen:{getContext(){return new Proxy({},{
   get(o,k){return k in o?o[k]:()=>{}},set(o,k,v){o[k]=v;return true}
  })}},
  navigator:{getGamepads(){return []}},requestAnimationFrame(){},console:{error(){}}
 };
 const context=vm.createContext(ctx);
 vm.runInContext(main,context,{timeout:6000});
 const result=vm.runInContext(
  'Array.from({length:300},()=>alpha.selectSpecies(5)).map(p=>({dex:p.dex,rarity:p.rarity,legendary:p.legendary}))',context);
 assert.ok(result.every(p=>p.dex>=1&&p.dex<=151&&p.rarity<=3&&!p.legendary));
 assert.ok(new Set(result.map(p=>p.dex)).size>=20,'later Kanto waves must contain many authentic species');
 const opening=vm.runInContext('Array.from({length:80},()=>alpha.selectSpecies(0).dex)',context);
 assert.ok(opening.every(dex=>dex===16||dex===19),'keep safe opening Rattata/Pidgey');
});
test('Every starter move references original catalogue without fabricated IDs',()=>{
 for(const id of ['tackle','quick-attack','ember','water-gun','vine-whip','thunder-shock'])
  assert.ok(real.moves.some(m=>m.id===id),'missing real move '+id);
 const originalKinds=new Set(real.moves.map(m=>m.kind));
 assert.ok(originalKinds.has('beam'));
 assert.ok(originalKinds.has('chain'));
 assert.ok(originalKinds.has('orbit'));
});

test('Real PKMSVV compiled gacha rates and pity are exported into native build',()=>{
 assert.equal(real.recruitment.source,'js/systems/gacha.js');
 assert.equal(JSON.stringify(real.recruitment.rates),JSON.stringify([[1,45.5],[2,30],[3,17],[4,6.5],[5,1]]));
 assert.equal(real.recruitment.pity5,100);
 assert.equal(JSON.stringify(built.nativeAlpha.recruitment.rates),JSON.stringify(real.recruitment.rates));
 assert.equal(built.nativeAlpha.recruitment.pity5,100);
});

test('Source-authentic Kanto move pools are embedded for all 151 species',()=>{
 assert.equal(real.movePoolSource,'js/data/moves.js:Moves.poolFor');
 assert.equal(Object.keys(real.movePools).length,151);
 assert.equal(JSON.stringify(built.nativeAlpha.realMovePools),JSON.stringify(real.movePools));
 const all=new Set(real.moves.map(m=>m.id));
 assert.ok(Object.values(real.movePools).filter(pool=>pool.length>0).length>=120);
 assert.ok(Object.values(real.movePools).every(pool=>Array.isArray(pool)&&
  pool.every(id=>all.has(id))&&new Set(pool).size===pool.length));
 assert.ok(new Set(Object.values(real.movePools).map(pool=>pool.join('|'))).size>=6);
});
