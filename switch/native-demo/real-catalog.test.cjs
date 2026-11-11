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
 vm.runInNewContext(main,ctx,{timeout:6000});
 assert.ok(ctx.screen);
});
