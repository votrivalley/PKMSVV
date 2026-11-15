'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../src/pkmsvv-encounter-rarity-qa.js'),'utf8');
function fixture(rift){
 const species=[{dex:25,rarity:3,name:'Rare'},{dex:445,rarity:4,name:'Epic'}];
 const G={DEX:species,DEX_BY:Object.fromEntries(species.map(x=>[x.dex,x])),
  SPRITE_META:{25:{},445:{}},Rift:{inArena:rift},Game:{state:'playing'},
  EnemyMgr:{add(x){return x;}}};
 const math=Object.create(Math);math.random=()=>.9; // Rift roll: Rare.
 vm.runInNewContext(source,{G,Math:math,Number,Map,Set,WeakSet,console});
 return {G,api:G.PKMSVVEncounterRarity};
}
test('Rift ordinary Pokémon double their HP even if rarity returns the same species',()=>{
 const f=fixture(true),enemy={dex:25,def:{dex:25},hp:38,maxHp:40};
 f.G.EnemyMgr.add(enemy);
 assert.equal(enemy.maxHp,80);assert.equal(enemy.hp,76);
 assert.equal(enemy.pkmsvvRiftDoubleHp,true);
 f.api.grade(enemy);
 assert.equal(enemy.maxHp,80,'never stack the 2x modifier');
});
test('Outside Rift no extra HP scaling is introduced',()=>{
 const f=fixture(false),enemy={dex:25,def:{dex:25},hp:40,maxHp:40};
 f.G.EnemyMgr.add(enemy);
 assert.equal(enemy.maxHp,40);
 assert.equal(enemy.pkmsvvRiftDoubleHp,undefined);
});
test('Rift species remains limited to Rare or Epic and never becomes Legendary',()=>{
 const f=fixture(true);
 const result=f.api.choose(-1,true,false);
 assert.ok([25,445].includes(result));
});
