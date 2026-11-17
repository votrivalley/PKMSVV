'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const m=require('../src/pkmsvv-fossil-expedition-core.cjs');
const humans=[{uid:'host',bot:false},{uid:'friend',bot:false}];
const botTeam=[{uid:'host',bot:false},{uid:'ai-a',bot:true}];
const launch=(members=botTeam)=>m.begin({members,roomId:'room-A',hostUid:'host',origin:{x:0,y:0},startSeconds:20});
const go=(s,end)=>{for(let sec=s.clock+1;sec<=end;sec++)m.tick(s,{seconds:sec,roomId:'room-A',threats:0,liveMembers:s.team});};
function digAll(s){for(const site of s.sites){for(let i=0;i<3;i++){
 const x=m.dig(s,{uid:'host',siteId:site.id,actor:{x:site.x,y:site.y},seconds:s.clock,source:'native-strike'});
 assert.equal(x.ok,true);
}}}
test('2–4 member expedition requires at least one human; solo human + AI counts as two',()=>{
 for(const bad of [[],[{uid:'host'}],[{uid:'ai',bot:true},{uid:'ai2',bot:true}],
 [{uid:'host'},{uid:'host'}],[{uid:'host'},...Array.from({length:4},(_,i)=>({uid:'b'+i,bot:true}))]]){
 assert.equal(m.begin({members:bad,roomId:'x',hostUid:'host',origin:{x:0,y:0}}).ok,false);
 }
 assert.equal(launch(botTeam).ok,true);
 assert.equal(launch(humans).ok,true);
 assert.equal(launch([humans[0],humans[1],{uid:'ai-a',bot:true},{uid:'ai-b',bot:true}]).ok,true);
 assert.deepEqual(m.roster(botTeam),botTeam);
});
test('native world coordinates, rock collision and three verified strikes per rock are compulsory',()=>{
 const s=launch();assert.equal(s.sites.length,3);assert.equal(s.phase,'excavate');
 assert.equal(m.dig(s,{uid:'host',siteId:1,actor:{x:s.sites[0].x,y:s.sites[0].y},seconds:s.clock,source:'fake'}).ok,false);
 assert.equal(m.dig(s,{uid:'stranger',siteId:1,actor:{x:s.sites[0].x,y:s.sites[0].y},seconds:s.clock,source:'native-strike'}).reason,'actor');
 assert.equal(m.dig(s,{uid:'host',siteId:1,actor:{x:9999,y:9999},seconds:s.clock,source:'native-strike'}).reason,'range');
 digAll(s);assert.equal(s.collected,3);assert.equal(s.events.length,3);
 assert.equal(m.dig(s,{uid:'host',siteId:1,actor:{x:s.sites[0].x,y:s.sites[0].y},seconds:s.clock,source:'native-strike'}).reason,'range');
});
test('ordinary live combat controls objective HP and defeats; 2–4 team must remain present',()=>{
 const s=launch();digAll(s);
 m.tick(s,{seconds:21,roomId:'room-A',threats:4,liveMembers:s.team});
 assert.ok(s.machine.hp<360);
 const before=s.machine.hp;
 assert.equal(m.tick(s,{seconds:23,roomId:'room-A',threats:0}).ok,true);
 assert.equal(s.machine.hp,before);
 assert.equal(m.tick(s,{seconds:28,roomId:'room-A',threats:0}).reason,'clock-jump');
 const d=launch();
 assert.equal(m.tick(d,{seconds:21,roomId:'room-A',liveMembers:[d.team[0]]}).reason,'party-too-small');
 assert.equal(d.phase,'failed');
 const e=launch();
 assert.equal(m.tick(e,{seconds:21,roomId:'wrong',liveMembers:e.team}).reason,'clock-or-room');
});
test('completed 3 fossils + 6-min real game clock + physical extraction yields the ONLY valid receipt',()=>{
 const s=launch();digAll(s);
 assert.equal(m.extract(s,{uid:'host',actor:{x:0,y:0},seconds:s.clock,roomId:'room-A'}).reason,'too-early');
 go(s,380);assert.equal(s.phase,'extract');
 const r=m.extract(s,{uid:'host',actor:{x:0,y:0},seconds:s.clock,roomId:'room-A'});
 assert.equal(r.ok,true);assert.equal(r.result.cleared,true);
 assert.equal(m.extract(s,{uid:'host',actor:{x:0,y:0},seconds:s.clock,roomId:'room-A'}).reason,'inactive');
 const receipt=m.receipt(s,1);
 assert.deepEqual({mode:receipt.mission,partySize:receipt.partySize,duration:receipt.durationSeconds,optional:receipt.optionalObjectives},
 {mode:'fossil_lab',partySize:2,duration:360,optional:2});
 assert.ok(Object.isFrozen(receipt));
 const lab=require('../src/pkmsvv-coop-lab-core.cjs');
 const save={};assert.equal(lab.settle(save,receipt,()=>true).firstClear,true);
 assert.equal(save.pkmsvvCoopLab.machineUnlocked,true);
 assert.equal(save.owned[140].from,'coop-first-clear');
});
test('no reward without all three excavations; failure at 8 min or machine destruction',()=>{
 const s=launch();go(s,381);
 assert.equal(m.extract(s,{uid:'host',actor:{x:0,y:0},seconds:s.clock,roomId:'room-A'}).reason,'specimens');
 assert.equal(m.receipt(s,1),null);
 const a=launch();digAll(a);go(a,499);assert.equal(a.phase,'failed');assert.equal(a.result.reason,'timeout');assert.equal(m.receipt(a,1),null);
 const b=launch();digAll(b);
 for(let sec=21;sec<=200&&b.phase!=='failed';sec++)m.tick(b,{seconds:sec,roomId:'room-A',threats:8});
 assert.equal(b.phase,'failed');assert.equal(b.result.reason,'machine-destroyed');assert.equal(m.receipt(b,1),null);
});
