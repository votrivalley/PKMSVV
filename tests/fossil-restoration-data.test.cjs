'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const spec=require('../data/pkmsvv-fossil-catalog.json');
const counts=[5,0,4,4,4,4,0,4,0,0];
test('25 fossil species, 15 restoration recipes, 15 material types across six generations',()=>{
 assert.equal(spec.implementationStatus,'prepared-only-not-wired-to-gameplay');
 assert.equal(spec.materialTypes.length,15);
 assert.equal(spec.recipes.length,15);
 const dexIds=spec.recipes.flatMap(x=>[x.dex,...x.evolutionDexIds]);
 assert.equal(dexIds.length,25);assert.equal(new Set(dexIds).size,25);
 for(let index=0;index<counts.length;index++){
   const region=spec.regionPools[String(index+1)];
   assert.ok(region);assert.equal(region.speciesDexIds.length,counts[index],region.name);
 }
 assert.deepEqual(spec.rules.allowedRegionNumbers,[1,3,4,5,6,8]);
 assert.deepEqual(spec.rules.ineligibleRegions,[2,7,9,10]);
});
test('one region only yields its own fossil materials; no materials in empty generations',()=>{
 const known=new Map(spec.materialTypes.map(x=>[x.id,x]));
 assert.equal(known.size,15);
 for(const [key,region] of Object.entries(spec.regionPools)){
  const gen=Number(key);
  for(const id of region.materialIds)assert.equal(known.get(id)?.generation,gen);
  const calculated=spec.recipes.filter(x=>x.generation===gen)
   .flatMap(x=>[x.dex,...x.evolutionDexIds]).sort((a,b)=>a-b);
  assert.deepEqual([...region.speciesDexIds].sort((a,b)=>a-b),calculated);
 }
 for(const gen of [2,7,9,10]){
  assert.deepEqual(spec.regionPools[String(gen)].materialIds,[]);
 }
});
test('restoration recipe ingredients remain Galar two-part and all others one whole fossil',()=>{
 const ids=new Set(spec.materialTypes.map(x=>x.id));
 for(const recipe of spec.recipes){
  assert.equal(recipe.materialIds.length,recipe.generation===8?2:1,recipe.name);
  assert.ok(recipe.materialIds.every(id=>ids.has(id)),recipe.name);
 }
 const galar=spec.recipes.filter(x=>x.generation===8);
 assert.deepEqual(galar.map(x=>[x.dex,...x.materialIds]),[
   [880,'fossilized_bird','fossilized_drake'],
   [881,'fossilized_bird','fossilized_dino'],
   [882,'fossilized_fish','fossilized_drake'],
   [883,'fossilized_fish','fossilized_dino']
 ]);
});
test('rock 3–5 percent chance applies once per destroyed rock, never per hit',()=>{
 assert.deepEqual(spec.rules.rockDropChanceByClass,{ordinaryPokemon:.02,rockType:.04,fossilPokemon:.06});
 assert.equal(spec.rules.rockTrigger,'once-on-actual-destructible-rock-destruction');
 assert.equal(spec.rules.mode,'explore');
 assert.equal(spec.rules.newPlayerAcquisition,'fossil-restoration-only');
 assert.equal(spec.rules.existingOwnedPokemon,'preserve');
});

test('role rates and Kabuto first-rock guarantee are ordered, save-once and secret in dialogue',()=>{
 const rules=spec.rules;
 assert.deepEqual(rules.rockDropChanceByClass,{ordinaryPokemon:.02,rockType:.04,fossilPokemon:.06});
 assert.deepEqual(rules.dropRatePriority,['fossilPokemon','rockType','ordinaryPokemon']);
 assert.equal(rules.guaranteedFirstKabuto.materialId,'dome_fossil');
 assert.equal(rules.guaranteedFirstKabuto.pokemonDex,140);
 assert.equal(rules.guaranteedFirstKabuto.oncePerProfile,true);
 assert.equal(rules.guaranteedFirstKabuto.allowedOnAnyExploreRegion,true);
 assert.equal(rules.guaranteedFirstKabuto.revealRatesToPlayer,false);
 const guide=require('node:fs').readFileSync(require('node:path').join(__dirname,'../src/pkmsvv-pippi-guide.js'),'utf8');
 assert.match(guide,/fossils:\[/);
 assert.match(guide,/Hóa thạch Mái vòm/);
 assert.match(guide,/PC → Hồi sinh hóa thạch/);
 const tutorial=guide.split("  fossils:[")[1].split("  explore:[")[0];
 assert.doesNotMatch(tutorial,/\b(?:2%|4%|6%|0\.02|0\.04|0\.06)\b/);
});
