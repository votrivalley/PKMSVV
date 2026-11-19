'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const m=require('../src/pkmsvv-fossil-expedition-core.cjs');
const botTeam=[{uid:'host',bot:false},{uid:'ai-a',bot:true}];
const room=()=>m.begin({members:botTeam,roomId:'R1',hostUid:'host',origin:{x:0,y:0},startSeconds:20});
function t(s,end,{threats=0,rotomPosition,bossDefeated=false}={}){
 let result;
 for(let time=s.clock+1;time<=end;time++)
  result=m.tick(s,{seconds:time,roomId:s.roomId,threats,liveMembers:s.team,
   ...(rotomPosition?{rotomPosition}:{}),bossDefeated});
 return result;
}
function fragments(s){
 for(const site of s.sites)for(let i=0;i<3;i++){
  const a=m.dig(s,{uid:'host',siteId:site.id,actor:{x:site.x,y:site.y},
   seconds:s.clock,source:'native-strike'});
  assert.equal(a.ok,true,'native mining succeeds for a valid player inside site radius');
 }
 assert.equal(s.collected,3);
 assert.equal(s.sites.reduce((n,x)=>n+x.hits,0),9);
 assert.equal(s.phase,'rescue');
}
function rescue(s){
 fragments(s);
 t(s,s.clock+1,{bossDefeated:true});
 const r=m.rescue(s,{uid:'host',actor:{x:s.rotom.x,y:s.rotom.y},seconds:s.clock,
  bossDefeated:true,roomId:s.roomId});
 assert.equal(r.ok,true);
 assert.equal(s.phase,'escort');
}
function escort(s){
 for(let i=0;i<15&&!s.machine.online;i++){
  const dx=s.machine.x-s.rotom.x,dy=s.machine.y-s.rotom.y,d=Math.hypot(dx,dy);
  const step=Math.min(155,d);
  const rp={x:s.rotom.x+dx/d*step,y:s.rotom.y+dy/d*step};
  t(s,s.clock+1,{rotomPosition:rp,bossDefeated:true});
 }
 assert.equal(s.machine.online,true,'Rotom must physically reach and fuse with machine');
 assert.equal(s.phase,'defend');
}
test('2–4 people with at least one human, including solo human + AI; reject invalid rooms',()=>{
 for(const bad of [[],[{uid:'host'}],[{uid:'ai1',bot:true},{uid:'ai2',bot:true}],
  [{uid:'host'},{uid:'host'}],[{uid:'host'},...Array.from({length:4},(_,i)=>({uid:'ai'+i,bot:true}))]])
  assert.equal(m.begin({members:bad,roomId:'R1',hostUid:'host',origin:{x:0,y:0}}).ok,false);
 assert.equal(room().ok,true);
 assert.equal(m.begin({members:[{uid:'host'},{uid:'friend'}],roomId:'R1',hostUid:'host',origin:{x:0,y:0}}).ok,true);
 assert.equal(m.begin({members:[{uid:'host'},...Array.from({length:3},(_,i)=>({uid:'ai'+i,bot:true}))],roomId:'R1',hostUid:'host',origin:{x:0,y:0}}).ok,true);
});
test('three sites require a genuine multi-screen expedition, exactly nine real strikes',()=>{
 const s=room();
 for(const site of s.sites)assert.ok(Math.hypot(site.x,site.y)>=1500,
  'no excavation can spawn in the immediate Restorer screen');
 for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)
  assert.ok(Math.hypot(s.sites[i].x-s.sites[j].x,s.sites[i].y-s.sites[j].y)>=2500,
   'site pair too close: dig sites must not overlap a single screen');
 assert.equal(m.begin({members:botTeam,roomId:'R1',hostUid:'host',origin:{x:0,y:0},
  sites:[{x:420,y:0},{x:770,y:0},{x:0,y:950}]}).reason,'sites-not-spread-out');
 const p=s.sites[0];
 assert.equal(m.dig(s,{uid:'host',siteId:p.id,actor:p,seconds:s.clock,source:'fake'}).reason,'unverified-source');
 assert.equal(m.dig(s,{uid:'host',siteId:p.id,actor:{x:0,y:0},seconds:s.clock,source:'native-strike'}).reason,'range');
 fragments(s);
 assert.deepEqual(s.sites.map(p=>p.hits),[3,3,3]);
 assert.equal(m.dig(s,{uid:'host',siteId:1,actor:s.sites[0],seconds:s.clock,source:'native-strike'}).reason,'phase');
});
test('real Golurk must spawn and be defeated; Rotom cannot be rescued from afar',()=>{
 const s=room();fragments(s);
 const trySave=(actor,bossDefeated=true)=>m.rescue(s,{uid:'host',actor,seconds:s.clock,
  roomId:'R1',bossDefeated});
 assert.equal(trySave(s.rotom).reason,'boss-alive','no fake boss completion before spawn');
 t(s,s.clock+1);
 assert.equal(s.boss.spawned,true);
 assert.equal(trySave(s.rotom).reason,'boss-alive','cannot rescue while boss alive');
 t(s,s.clock+1,{bossDefeated:true});
 assert.equal(trySave({x:0,y:0}).reason,'range');
 assert.equal(trySave(s.rotom).ok,true);
 assert.equal(s.rotom.freed,true);
});
test('rescue radius allows near-tree interaction but still requires a defeated Golurk',()=>{
 assert.equal(m.RESCUE_RADIUS,144);
 const s=room();
 for(const site of s.sites)for(let k=0;k<3;k++){
  const result=m.dig(s,{uid:'host',siteId:site.id,actor:site,seconds:s.clock,source:'native-strike'});
  assert.equal(result.ok,true);s.clock+=1;s.elapsed+=1;
 }
 s.phase='rescue';s.boss.spawned=true;s.boss.defeated=true;
 const actor={x:s.rotom.x+132,y:s.rotom.y};
 const far={x:s.rotom.x+152,y:s.rotom.y};
 const opts={uid:'host',seconds:s.clock,roomId:s.roomId};
 assert.equal(m.rescue(s,{...opts,actor:far,bossDefeated:true}).reason,'range');
 assert.equal(m.rescue(s,{...opts,actor,bossDefeated:false}).reason,'boss-alive');
 assert.equal(m.rescue(s,{...opts,actor,bossDefeated:true}).ok,true);
});
test('rescue deadline 4:00 is fail if Rotom still in boss fight, even with nine fragments',()=>{
 const s=room();fragments(s);t(s,260,{bossDefeated:false});
 assert.equal(s.phase,'failed');assert.equal(s.result.reason,'rotom-lost');
 assert.equal(s.rotom.hp,0);assert.equal(m.receipt(s,1),null);
});
test('Rotom must be escorted: no phantom machine activation or teleport to base',()=>{
 const s=room();rescue(s);
 assert.equal(s.machine.online,false);
 const far={x:s.machine.x,y:s.machine.y};
 t(s,s.clock+1,{rotomPosition:far});
 assert.equal(s.machine.online,false,'huge impossible Rotom jump should not fuse machine');
 escort(s);
 assert.equal(s.rotom.merged,true);
 assert.equal(s.machine.online,true);
});
test('machine can only be damaged by real nearby enemy threats after Rotom merges',()=>{
 const s=room();
 t(s,s.clock+1,{threats:8});
 assert.equal(s.machine.hp,360,'ruined offline machine is not defendable yet');
 rescue(s);escort(s);
 const hp=s.machine.hp;
 t(s,s.clock+2,{threats:6});
 assert.ok(s.machine.hp<hp);
 for(let i=0;i<100&&!s.result;i++)t(s,s.clock+1,{threats:8});
 assert.equal(s.result?.reason,'machine-destroyed');
 assert.equal(m.receipt(s,1),null);
});
test('auto victory exactly 8:00 after physical rescue+fusion, no old 6-minute extraction',()=>{
 const s=room();rescue(s);escort(s);
 t(s,499);
 assert.equal(s.phase,'defend');
 assert.equal(m.receipt(s,1),null);
 const result=t(s,500);
 assert.equal(result.finished,true);
 assert.equal(s.phase,'cleared');
 assert.equal(s.result.elapsed,480);
 const receipt=m.receipt(s,1);
 assert.equal(receipt.durationSeconds,480);
 assert.equal(receipt.partySize,2);
 assert.equal(receipt.optionalObjectives,2);
 const lab=require('../src/pkmsvv-coop-lab-core.cjs');
 const save={};
 assert.equal(lab.settle(save,receipt,()=>true).firstClear,true);
 assert.equal(save.pkmsvvCoopLab.machineUnlocked,true);
 assert.equal(save.owned[140].from,'coop-first-clear');
 assert.equal(lab.settle(save,receipt,()=>true).reason,'duplicate');
});
test('disconnecting any real player or dropping below two party members fails safely',()=>{
 const s=room();
 const result=m.tick(s,{seconds:21,roomId:'R1',liveMembers:[botTeam[0]]});
 assert.equal(result.reason,'party-too-small');
 assert.equal(s.result.cleared,false);
});

test('Berry-matched Fossil difficulty speeds enemies up each 2 minutes, capped at 40% without stacking',()=>{
 assert.equal(m.speedFactor(0),1);
 assert.equal(m.speedFactor(119.999),1);
 assert.ok(Math.abs(m.speedFactor(120)-(1+2/15))<1e-12);
 assert.ok(Math.abs(m.speedFactor(240)-(1+4/15))<1e-12);
 assert.ok(Math.abs(m.speedFactor(360)-1.4)<1e-12);
 assert.ok(Math.abs(m.speedFactor(480)-1.4)<1e-12);
 assert.equal(m.speedFactor(-1),1);
 assert.equal(m.speedFactor(NaN),1);
 assert.equal(m.SPEED_STEP_SECONDS,120);
 assert.equal(m.MAX_SPEED_STAGES,3);
});
test('Egg-like fossil rock HP loses exactly one-third after each valid dig',()=>{
 const s=room();
 const p=s.sites[0],ratios=[];
 for(let hit=0;hit<3;hit++){
  ratios.push(m.rockHpRatio(p.hits));
  assert.equal(m.dig(s,{uid:'host',siteId:p.id,actor:p,
   seconds:s.clock,source:'native-strike'}).ok,true);
 }
 ratios.push(m.rockHpRatio(p.hits));
 for(let i=0;i<4;i++)assert.ok(Math.abs(ratios[i]-(3-i)/3)<1e-12);
 assert.deepEqual(s.sites.map(x=>x.hits),[3,0,0]);
 assert.equal(m.rockHpRatio(999),0);
 assert.equal(m.rockHpRatio(-1),1);
});
