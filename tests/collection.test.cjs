'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const mons=[
  {dex:1,name:'Bulbasaur',gen:1,rarity:1},
  {dex:4,name:'Charmander',gen:1,rarity:1},
  {dex:7,name:'Squirtle',gen:1,rarity:1},
  {dex:152,name:'Chikorita',gen:2,rarity:1},
  {dex:155,name:'Cyndaquil',gen:2,rarity:1}
];
function context(){
 const G={
   DEX:mons,DEX_BY:Object.fromEntries(mons.map(x=>[x.dex,x])),
   SPRITE_META:Object.fromEntries(mons.map(x=>[x.dex,{}])),
   Sprites:{hasShiny:d=>d!==152},U:{pick:a=>a[0]}
 };
 const ctx={G,Date,console,Math};
 vm.runInNewContext(read('src/pkmsvv-collection.js'),ctx);
 return {ctx,G,C:G.PKMSVVCollect};
}
function fresh(owned=[1,4]){
 return {owned:Object.fromEntries(owned.map(x=>[x,{at:100}])),shiny:{},pused:{1:10,4:0,7:1},
   coins:0,tickets:{t1:0,t10:0},pkmStamps:{},pkmMilestones:{},pkmGenRewards:{},pkmShinyRewards:{}};
}
const obj=x=>JSON.parse(JSON.stringify(x));

test('3-minute stamp awarded only once, no map changes',()=>{
 const {C}=context(),s=fresh();
 assert.equal(C.onRunEnd(s,4,179),false);assert.equal(s.coins,0);
 assert.equal(C.onRunEnd(s,4,180),true);assert.ok(s.pkmStamps[4]);assert.equal(s.coins,150);
 C.onRunEnd(s,4,190);assert.equal(s.coins,150);
 C.onRunEnd(s,152,240);assert.equal(s.coins,150);
});
test('daily assigned Pokémon prioritizes unused owned pokemon and grants reward once',()=>{
 const {C}=context(),s=fresh();C.ensure(s);
 assert.equal(s.pkmDaily.dex,4);
 C.onRunEnd(s,4,180);assert.equal(s.pkmDaily.complete,true);
 assert.equal(C.claim(s,'daily'),true);assert.equal(C.claim(s,'daily'),false);
 assert.equal(s.tickets.t1,2);assert.equal(s.coins,650);
});
test('weekly requires completing each distinct owned Pokémon and grants 10x ticket',()=>{
 const {C}=context(),s=fresh([1,4,7]);C.ensure(s);
 assert.deepEqual(new Set(s.pkmWeekly.dexes).size,3);
 for(const id of s.pkmWeekly.dexes)C.onRunEnd(s,id,180);
 assert.equal(C.claim(s,'weekly'),true);
 assert.equal(C.claim(s,'weekly'),false);
 assert.equal(s.tickets.t10,2); // 1 for weekly reward + 1 for completing Gen 1
});
test('full owned generation grants coins and 10x exactly once; shiny milestone ignores impossible shiny',()=>{
 const {C}=context(),s=fresh([1,4,7,152,155]);
 assert.equal(C.checkCollection(s),true);
 assert.equal(s.pkmGenRewards[1]>0,true);
 assert.equal(s.pkmGenRewards[2]>0,true);
 assert.equal(s.coins,10000);assert.equal(s.tickets.t10,2);
 C.checkCollection(s);assert.equal(s.coins,10000);
 s.shiny={1:{},4:{},7:{},155:{}};
 assert.equal(C.checkCollection(s),true);assert.equal(s.coins,30000);
 assert.equal(s.pkmShinyRewards[1]>0,true);
 assert.equal(s.pkmShinyRewards[2]>0,true);
});
test('old saves without extension fields migrate without losing old data',()=>{
 const {C}=context(),s={owned:{1:{}},shiny:{},coins:40,tickets:{t1:9,t10:1},pused:{}};
 C.ensure(s);assert.equal(s.tickets.t1,9);
 assert.ok(s.pkmDaily);assert.ok(s.pkmWeekly);
 assert.deepEqual(obj(s.pkmStamps),{});
});
test('backup JSON format verifies and saves all player data, including stamps',()=>{
 const G={DB:{save:{owned:{1:{}},shiny:{4:{}},pupg:{1:{atk:2}},globalUpgrades:{revive:1},
   pkmStamps:{1:100},coins:123,stats:{runs:8}},guest:false,commit:()=>true}};
 const ctx={G,Date,JSON,Error,Number,localStorage:{getItem:()=>JSON.stringify('pkmsvv')},window:{},document:{}};
 vm.runInNewContext(read('src/pkmsvv-save-ui.js'),ctx);
 const backup=G.PKMSVVSaveUI.backup();
 const restored=G.PKMSVVSaveUI.validate(backup);
 assert.equal(restored.shiny['4']!=null,true);assert.equal(restored.globalUpgrades.revive,1);
 assert.ok(restored.pkmStamps[1]);assert.equal(restored.coins,123);
 assert.throws(()=>G.PKMSVVSaveUI.validate('{"save":{}}'));
});
test('all gen is default with independent pity and nine legacy banners kept',()=>{
 const base=path.join(root,'vendor','pokesurvivor');
 if(!fs.existsSync(path.join(base,'index.html')))return;
 const gacha=fs.readFileSync(path.join(base,'js/systems/gacha.js'),'utf8');
 const ui=fs.readFileSync(path.join(base,'js/ui/gacha-ui.js'),'utf8');
 const game=fs.readFileSync(path.join(base,'js/game.js'),'utf8');
 const goals=fs.readFileSync(path.join(base,'js/ui/goals-ui.js'),'utf8');
 assert.match(gacha,/gen:0,name:'ALL GEN'/);
 assert.match(gacha,/gen === 0 \|\| p.gen === gen/);
 assert.match(gacha,/save.pity\[gen\]/);
 assert.match(ui,/let gen = 0/);assert.match(ui,/gen=0; \/\/ default every time/);
 assert.match(game,/G.PKMSVVCollect.onRunEnd/);
 assert.match(goals,/G.PKMSVVCollectUI.render/);
 assert.doesNotMatch(fs.readFileSync(path.join(base,'js/ui/settings-ui.js'),'utf8'),/G\.PKMSVVSaveUI\.mount/);
 assert.match(fs.readFileSync(path.join(base,'js/app.min.js'),'utf8'),/pkmStamps|PKMSVV_SAVE/);
});
