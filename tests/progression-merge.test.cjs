'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{apply}=require('../src/pkmsvv-progression-merge.js');
const egg=(kills=0,dex=175)=>({dex,kills,region:1,from:'baby-egg',shiny:false});
const inc=(kills=0)=>({serial:1,active:'egg-1',eggs:{'egg-1':egg(kills)},hatched:{}});
test('legacy save does not erase newer feature data; no double-counting Mastery',()=>{
 const a={pkmsvvMastery:{25:20},pkmsvvEggEvolutions:{176:true},pkmsvvIncubator:inc(40)};
 const b={pkmsvvMastery:{25:10,7:30},pkmsvvEggEvolutions:{468:true}};
 const r=apply({},b,a);
 assert.deepEqual(r.pkmsvvMastery,{25:20,7:30});assert.deepEqual(r.pkmsvvEggEvolutions,{468:true,176:true});
 assert.deepEqual(r.pkmsvvIncubator,a.pkmsvvIncubator);assert.notEqual(r.pkmsvvIncubator,a.pkmsvvIncubator);
 assert.deepEqual(apply({}, {}, {}),{});
});
test('advanced incubation survives newer timestamp on an older snapshot and legitimate hatch remains spent',()=>{
 const old={pkmsvvIncubator:inc(100)},next={pkmsvvIncubator:inc(499)};
 assert.equal(apply({},old,next).pkmsvvIncubator.eggs['egg-1'].kills,499);
 const hatch={pkmsvvIncubator:{serial:1,active:null,eggs:{},hatched:{'egg-1':175}}};
 assert.deepEqual(apply({owned:{175:{at:1}}},old,hatch).pkmsvvIncubator,hatch.pkmsvvIncubator);
 assert.throws(()=>apply({},old,hatch),/PROGRESSION_CONFLICT/);
});
test('divergent egg IDs or pre-rolled shiny results are blocked, not merged or rerolled',()=>{
 const a={pkmsvvIncubator:inc(10)},b={pkmsvvIncubator:inc(20)};
 b.pkmsvvIncubator.eggs['egg-1'].dex=447;
 const merged={owned:{25:{at:1}}};const before=JSON.stringify(merged);
 assert.throws(()=>apply(merged,a,b),/PROGRESSION_CONFLICT/);assert.equal(JSON.stringify(merged),before);
 b.pkmsvvIncubator.eggs['egg-1'].dex=175;b.pkmsvvIncubator.eggs['egg-1'].shiny=true;
 assert.throws(()=>apply(merged,a,b),/PROGRESSION_CONFLICT/);
});
test('two incompatible concurrent histories and invalid old saves fail closed',()=>{
 const a={pkmsvvIncubator:inc(100)},b={pkmsvvIncubator:inc(20)};
 a.pkmsvvIncubator.serial=2;a.pkmsvvIncubator.eggs['egg-2']=egg(0,447);
 b.pkmsvvIncubator.serial=2;b.pkmsvvIncubator.eggs['egg-2']=egg(0,440);
 assert.throws(()=>apply({},a,b),/PROGRESSION_CONFLICT/);
 assert.throws(()=>apply({}, {pkmsvvMastery:{25:-1}}, {}),/PROGRESSION_CONFLICT/);
 const shiny={pkmsvvIncubator:inc(500)};shiny.pkmsvvIncubator.eggs['egg-1'].shiny=true;
 const hatch={pkmsvvIncubator:{serial:1,active:null,eggs:{},hatched:{'egg-1':175}}};
 assert.throws(()=>apply({owned:{175:{at:1}}},shiny,hatch),/PROGRESSION_CONFLICT/);
 assert.equal(apply({owned:{175:{at:1}},shiny:{175:{at:1}}},shiny,hatch).pkmsvvIncubator.hatched['egg-1'],175);
});

test('Co-op high water receipts survive stale save merge without summing or replay',()=>{
 const a={pkmsvvCoopProgress:{'room-A':{serial:3,at:100}}},b={pkmsvvCoopProgress:{'room-A':{serial:2,at:200},'room-B':{serial:1,at:300}}};
 const r=apply({},a,b);assert.deepEqual(r.pkmsvvCoopProgress,{'room-A':{serial:3,at:100},'room-B':{serial:1,at:300}});
 assert.throws(()=>apply({}, {pkmsvvCoopProgress:{bad:{serial:-1,at:10}}}, {}),/PROGRESSION_CONFLICT/);
});

test('upgraded incubators, long goals and pending rank credits survive merge without additive prizes',()=>{
 const a=inc(20);a.level=3;a.serial=2;a.extra=['egg-2'];a.eggs['egg-2']={...egg(750),goal:1000};a.prizes={'room-A.1':{count:2,claimed:[]}};
 const b=JSON.parse(JSON.stringify(a));b.prizes['room-A.1'].claimed=['egg-3'];b.serial=3;
 b.eggs['egg-3']={...egg(0,447),goal:1000,from:'egg-rush-baby',prize:'room-A.1'};
 assert.deepEqual(apply({}, {pkmsvvIncubator:a},{pkmsvvIncubator:b}).pkmsvvIncubator,b);
 const bad=JSON.parse(JSON.stringify(b));bad.prizes['room-A.1'].claimed=['egg-1'];
 assert.throws(()=>apply({}, {pkmsvvIncubator:bad},{}),/PROGRESSION_CONFLICT/);
 const conflict=JSON.parse(JSON.stringify(b));conflict.prizes={'room-B.1':{count:2,claimed:[]}};delete conflict.eggs['egg-3'].prize;conflict.eggs['egg-3'].from='baby-egg';
 assert.throws(()=>apply({}, {pkmsvvIncubator:b},{pkmsvvIncubator:conflict}),/PROGRESSION_CONFLICT/);
});

test('paid incubator upgrade cannot merge with an older higher wallet on a newer timestamp',()=>{
 const a={pkmsvvIncubator:inc(10),pkmsvvCoopLab:{coopCoins:120}};
 const b=JSON.parse(JSON.stringify(a));b.pkmsvvIncubator.level=2;b.pkmsvvCoopLab.coopCoins=0;
 assert.throws(()=>apply({},a,b),/PROGRESSION_CONFLICT/);
 assert.equal(apply({},b,a).pkmsvvIncubator.level,2);
});
