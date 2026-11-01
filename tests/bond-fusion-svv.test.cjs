'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function setup(){
 const G={I18n:{lang:'vi'},Coop:{active:false},Royale:{active:false},EggRush:{active:false},
  PKMSVVBerryRescue:{active:false},PKMSVVArenaSolo:{active:false},
  PKMSVVChampionArena:{active:false},Judgment:{cinematic:false},Rift:{inArena:false},
  Moves:{EVO:Object.fromEntries(['ember','quick-attack','water-gun','tackle','vine-whip','rapid-spin','thunder-shock','confusion'].map(id=>[id,{}]))},
  RunUI:{showBond(){}},DB:{save:{coins:122,pkmsvvBerry:{bag:{oran:1}}}}};
 const document={getElementById(){return null},querySelector(){return null}};
 vm.runInNewContext(read('src/pkmsvv-bond-fusion.js'),{G,document});
 const m=id=>({id,evolved:true,lvl:6,def:{maxLvl:6},type:'normal'});
 const pl={slots:[[m('ember')],[m('quick-attack')]],bonds:1};
 return {G,api:G.PKMSVVFusionPilot,pl};
}
test('Five known recipes each contain precisely two existing evolved move IDs',()=>{
 const {api,G}=setup();
 assert.equal(api.RECIPES.length,5);
 for(const r of api.RECIPES){
  assert.equal(r.ids.length,2);
  assert.equal(new Set(r.ids).size,2);
  for(const id of r.ids)assert.ok(G.Moves.EVO[id],id+' must genuinely evolve');
 }
 assert.equal(api.maxPerRun,1);
});
test('Pilot only offers a fully evolved max-level single-slot pair, consumes once per run',()=>{
 const {api,pl}=setup(),old=pl.slots;
 const opt=api.options(pl);assert.equal(opt.mode,'pair');assert.equal(opt.loose.length,2);
 assert.equal(opt.pilot,true);assert.equal(opt.recipe,'ember-quick');
 assert.equal(api.confirm(pl,[opt.loose[0],opt.loose[1]]),true);
 assert.equal(pl._pkmsvvFusionUsed,1);
 assert.equal(api.options(pl),null,'cannot fuse twice');
 assert.equal(api.confirm(pl,opt.loose),false);
 assert.equal(pl.slots,old,'the actual game Player.fuse owns the move grouping and VFX');
});
test('No Fusion for missing evolution, level, multiple grouped slots or wrong pair',()=>{
 const {api,pl}=setup();
 pl.slots[0][0].evolved=false;assert.equal(api.options(pl),null);
 pl.slots[0][0].evolved=true;pl.slots[1][0].lvl=4;assert.equal(api.options(pl),null);
 pl.slots[1][0].lvl=6;assert.equal(api.confirm(pl,[pl.slots[0][0],pl.slots[0][0]]),false);
 pl.slots=[pl.slots[0].concat(pl.slots[1])];assert.equal(api.options(pl),null);
});
test('AI, Co-op, Berry Rescue, Royale, Eggs, Arena and Champion use existing Bond only',()=>{
 const {api,G,pl}=setup();
 for(const [obj,key] of [[G.Coop,'active'],[G.Royale,'active'],[G.EggRush,'active'],
  [G.PKMSVVBerryRescue,'active'],[G.PKMSVVArenaSolo,'active'],[G.PKMSVVChampionArena,'active']]){
  obj[key]=true;assert.equal(api.pilotEligible(pl),false);
  assert.equal(api.options(pl),null);obj[key]=false;
 }
 pl.uid='ai99';assert.equal(api.pilotEligible(pl),false);
 delete pl.uid;pl.remote=true;assert.equal(api.pilotEligible(pl),false);
});
test('Fusion does not mutate persistent save or create new combat effects',()=>{
 const {api,G,pl}=setup(),before=JSON.stringify(G.DB.save);
 assert.equal(api.confirm(pl,api.options(pl).loose),true);
 assert.equal(JSON.stringify(G.DB.save),before);
 const source=read('scripts/patch-bond-fusion.cjs');
 assert.match(source,/pl\.bondOptions\(\)/,'multiplayer remains upstream');
 assert.match(source,/pl\.fuse\(picked, opt\.group\)/,'existing engine handles casts, no invented VFX');
 assert.match(source,/confirm/);
 assert.match(read('scripts/prepare-game.cjs'),/patch-bond-fusion\.cjs/);
});