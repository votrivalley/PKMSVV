'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-big-update-qa.js'),'utf8');
function setup(){
 const s={owned:{25:{at:1}},shiny:{},stats:{runs:0},coins:100,pkmsvvDefeatedDex:{19:true},pkmsvvIncubator:{serial:1,active:'egg-1',eggs:{'egg-1':{dex:16,kills:499,region:0,from:'region-boss'}},hatched:{}}};
 const p={dex:25,kills:101,bosses:1,mon:{atk:1},shiny:false};
 const G={DB:{save:s,guest:false,commit:()=>true},Game:{player:p,state:'playing'},PKMSVVQuickRegion:{active:true,selectedRegion:0,speciesFor:()=>[16,19,25]},DEX_BY:{16:{rarity:1},19:{rarity:1},25:{rarity:1}},SPRITE_META:{16:{a:{Idle:{},Walk:{}}},19:{a:{Idle:{},Walk:{}}},25:{a:{Idle:{},Walk:{}}}},PKMSVVDexDefeats:{unlocked:(x,d)=>d===16||!!x.pkmsvvDefeatedDex[d]},Coop:{active:false}};
 vm.runInNewContext(src,{G,console});return {G,s,p,api:G.PKMSVVBigUpdateQA};
}
test('native run snapshot credits starter, only once; no stats, coins or fake defeat flags',()=>{
 const {G,s,p,api}=setup();assert.equal(api.begin(s,p,null),true);p.dex=26;G.PKMSVVQuickRegion.active=false;
 const before=JSON.stringify(p.mon),defeated=JSON.stringify(s.pkmsvvDefeatedDex);
 const result=api.settle(s,p,900,false);assert.equal(result.dex,25);assert.equal(result.points,21);
 assert.equal(s.pkmsvvMastery[25],21);assert.equal(s.pkmsvvMastery[26],undefined);assert.equal(s.pkmsvvIncubator.eggs['egg-1'].kills,500);
 assert.equal(api.settle(s,p,900,false),null);assert.equal(JSON.stringify(p.mon),before);assert.equal(s.coins,100);assert.equal(JSON.stringify(s.pkmsvvDefeatedDex),defeated);
});
test('badge eggs require authentic dead regional boss and eligible exact species',()=>{
 const {s,p,api}=setup();api.begin(s,p,null);assert.equal(api.markBadge(p,{dead:true,hp:0},0),false);
 assert.equal(api.markBadge(p,{dead:true,hp:0,pkmsvvExploreBoss:true},0),true);
 const receipt=api.settle(s,p,901,false);assert.equal(receipt.reward,'egg-2');assert.equal(s.pkmsvvIncubator.eggs['egg-2'].dex,19);assert.equal(s.pkmsvvIncubator.eggs['egg-2'].kills,0);
});
test('guest, short run, co-op and arena cannot earn progress',()=>{
 for(const mode of ['guest','coop','arena','short']){
  const {G,s,p,api}=setup();if(mode==='guest')G.DB.guest=true;if(mode==='coop')G.Coop.active=true;if(mode==='arena')G.PKMSVVArenaSolo={active:true};
  api.begin(s,p,null);assert.equal(api.settle(s,p,mode==='short'?59:900,false),null);assert.equal(s.pkmsvvMastery,undefined);assert.equal(s.pkmsvvIncubator.eggs['egg-1'].kills,499);
 }
});
test('hatch atomic, no gameplay stats, no duplicate claim, no fake defeat',()=>{
 const {G,s,api}=setup();G.Game.state='ui';assert.throws(()=>api.hatch('egg-1'));
 s.pkmsvvIncubator.eggs['egg-1'].kills=500;const old=JSON.stringify(s);G.DB.commit=()=>false;assert.throws(()=>api.hatch('egg-1'));assert.equal(JSON.stringify(s),old);
 G.DB.commit=()=>true;const r=api.hatch('egg-1');assert.equal(r.dex,16);assert.equal(s.owned[16].from,'incubator');assert.equal(s.pkmsvvIncubator.hatched['egg-1'],16);
 assert.equal(s.pkmsvvIncubator.active,null);assert.throws(()=>api.hatch('egg-1'));assert.equal(s.pkmsvvDefeatedDex[16],undefined);
});
test('migrated box uses native individual factory; legacy duplicate refuses without migration',()=>{
 const {G,s,api}=setup();G.Game.state='ui';s.pkmsvvIncubator.eggs['egg-1'].kills=500;s.owned[16]={at:1};
 assert.throws(()=>api.hatch('egg-1'));s.pkmsvvBoxSchema=1;s.pkmsvvBox=[];
 G.PKMSVVBox={validBox:d=>Array.isArray(d.pkmsvvBox)};G.PKMSVVBox2={makeOne:(d,roll)=>d.pkmsvvBox.push({...roll,id:'native-copy'})};
 api.hatch('egg-1');assert.equal(s.pkmsvvBox[0].dex,16);assert.equal(s.pkmsvvBox.length,1);
});
test('mastery tiers cosmetic only and active egg locked while playing',()=>{
 const {G,s,api}=setup();assert.throws(()=>api.activateEgg(null));G.Game.state='ui';api.activateEgg(null);assert.equal(s.pkmsvvIncubator.active,null);
 s.pkmsvvMastery={25:750};assert.equal(api.summary(s,25).gold,true);assert.equal(api.summary(s,25).aura,true);assert.equal(api.summary(s,25).next,null);
});
