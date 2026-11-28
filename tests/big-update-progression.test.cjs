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

test('19 baby species hatch from a region boss without inventing a defeat, and stay outside Gacha',()=>{
 const {G,s,p,api}=setup();assert.equal(api.EGG_ONLY.length,19);
 G.DEX_BY[175]={rarity:1};G.SPRITE_META[175]={a:{Idle:{},Walk:{}}};
 G.PKMSVVQuickRegion.selectedRegion=1;G.PKMSVVQuickRegion.speciesFor=()=>[175];
 assert.equal(api.eggGachaPolicy(s,175),false);
 assert.equal(api.begin(s,p,null),true);assert.equal(api.markBadge(p,{dead:true,hp:0,pkmsvvExploreBoss:true},1),true);
 const receipt=api.settle(s,p,901,false);assert.equal(receipt.reward,'egg-2');
 assert.equal(s.pkmsvvIncubator.eggs['egg-2'].dex,175);assert.equal(s.pkmsvvIncubator.eggs['egg-2'].from,'baby-egg');
 s.pkmsvvIncubator.eggs['egg-2'].kills=500;G.Game.state='ui';
 assert.equal(api.hatch('egg-2').dex,175);assert.equal(api.eggDiscovered(s,175),true);
 assert.equal(api.eggGachaPolicy(s,175),false);assert.equal(s.pkmsvvDefeatedDex[175],undefined);
 assert.equal(api.eggGachaPolicy(s,25),null,'Pikachu remains on its normal story route');
});
test('egg evolution ledger requires the owned starter, exact chain and real solo player; branches stay separate',()=>{
 const {G,s,p,api}=setup();
 s.owned[175]={at:1};p.dex=175;G.DEX_BY[175]={rarity:1};G.DEX_BY[176]={rarity:2};G.DEX_BY[468]={rarity:4};
 assert.equal(api.eggGachaPolicy(s,176),false);assert.equal(api.eggGachaPolicy(s,468),false);
 assert.equal(api.begin(s,p,null),true);p.dex=468;p.pkmEvoHistory=[{from:175,to:468}];
 assert.equal(api.markEggEvolution(s,175,468,p),false,'cannot skip Togetic');
 p.dex=176;p.pkmEvoHistory=[{from:175,to:176}];
 G.DB.commit=()=>false;assert.equal(api.markEggEvolution(s,175,176,p),false);assert.equal(s.pkmsvvEggEvolutions,undefined);
 G.DB.commit=()=>true;assert.equal(api.markEggEvolution(s,175,176,p),true);assert.equal(api.eggGachaPolicy(s,176),true);
 assert.equal(api.eggGachaPolicy(s,468),false);p.dex=468;p.pkmEvoHistory.push({from:176,to:468});
 assert.equal(api.markEggEvolution(s,176,468,p),true);assert.equal(api.eggGachaPolicy(s,468),true);
 const t={...p,dex:236,pkmEvoHistory:[]};s.owned[236]={at:1};G.Game.player=t;
 assert.equal(api.begin(s,t,null),true);t.dex=106;t.pkmEvoHistory=[{from:236,to:106}];
 assert.equal(api.markEggEvolution(s,236,106,t),true);assert.equal(api.eggGachaPolicy(s,106),true);
 assert.equal(api.eggGachaPolicy(s,107),false);assert.equal(api.eggGachaPolicy(s,237),false);
 assert.equal(api.eggGachaPolicy({owned:{143:{at:1}}},143),true,'legacy Snorlax owner retained');
});
test('Munchlax Berry egg shares authentic save commit; full bag or rollback never costs coins',()=>{
 const {G,s,api}=setup();G.Coop.isHost=true;G.PKMSVVBerryRescue={eggEligible:false};
 G.DEX_BY[446]={rarity:1};G.SPRITE_META[446]={a:{Idle:{},Walk:{}}};
 assert.equal(api.commitBerryEgg(s,()=>true).egg,null);
 G.PKMSVVBerryRescue.eggEligible=true;const before=JSON.stringify(s);
 assert.equal(api.commitBerryEgg(s,()=>false).egg,null);assert.equal(JSON.stringify(s),before);
 assert.throws(()=>api.commitBerryEgg(s,()=>{throw Error('disk')}));assert.equal(JSON.stringify(s),before);
 const got=api.commitBerryEgg(s,()=>true);assert.equal(got.egg,'egg-2');
 assert.equal(s.pkmsvvIncubator.eggs[got.egg].dex,446);assert.equal(s.pkmsvvIncubator.eggs[got.egg].from,'berry-boss');
 assert.equal(api.commitBerryEgg(s,()=>true).egg,null,'no duplicate queued Munchlax');
});

test('Rift rewards require the recorded native dead boss and are settled once per run',()=>{
 const {G,s,p,api}=setup();G.DEX_BY[175]={rarity:1,types:['fairy']};G.SPRITE_META[175]={a:{Idle:{},Walk:{}}};
 G.PKMSVVQuickRegion.selectedRegion=1;G.PKMSVVQuickRegion.speciesFor=()=>[175];
 assert.equal(api.begin(s,p,null),true);
 const arena={phase:'fight',type:'fairy',bossId:2},boss={id:2,legend:true,dead:false,hp:100};G.Rift={arena};
 assert.equal(api.registerRift(p,arena,boss),true);
 assert.equal(api.registerRift(p,arena,boss),false);
 arena.phase='won';assert.equal(api.markRiftWin(p,arena),false);
 boss.hp=0;boss.dead=true;assert.equal(api.markRiftWin(p,arena),true);
 assert.equal(api.markRiftWin(p,arena),false);
 const receipt=api.settle(s,p,901,false);
 assert.equal(receipt.riftReward,'egg-2');assert.equal(s.pkmsvvIncubator.eggs['egg-2'].from,'rift-baby');
 assert.equal(s.pkmsvvIncubator.eggs['egg-2'].dex,175);assert.equal(api.settle(s,p,901,false),null);
 s.pkmsvvIncubator.eggs['egg-2'].kills=500;G.Game.state='ui';assert.equal(api.hatch('egg-2').dex,175);
});
test('Rift loss, missing boss and guest or remote actors do not grant an egg',()=>{
 for(const failure of ['loss','missing','guest','remote','coop']){
  const {G,s,p,api}=setup();api.begin(s,p,null);
  const arena={phase:'fight',type:'normal',bossId:1},boss={id:1,legend:true,dead:true,hp:0};G.Rift={arena};
  if(failure==='remote')boss.remote=true;
  if(failure!=='missing'){boss.dead=false;boss.hp=10;api.registerRift(p,arena,boss);boss.dead=true;boss.hp=0;}
  arena.phase=failure==='loss'?'lost':'won';
  if(failure==='guest')G.DB.guest=true;if(failure==='coop')G.Coop.active=true;
  assert.equal(api.markRiftWin(p,arena),false);
  api.settle(s,p,901,false);assert.equal(Object.keys(s.pkmsvvIncubator.eggs).length,1);
 }
});

function coopFixture(host=true){
 const f=setup(),{G,s,p,api}=f;let t=0;
 // The native module uses Date.now in the VM if performance is absent.
 // Recreate it with a controllable monotonic wall clock for these tests.
 vm.runInNewContext(src,{G,console,performance:{now:()=>t}});
 const members=[{uid:'host',dex:25},{uid:'guest',dex:25}];
 const cfg={mode:'coop',host:'host',seed:123,members};
 const uid=host?'host':'guest';
 G.Social={uid,room:{id:'room-A',host:'host',mode:'coop',open:false,matchSerial:1,members}};
 G.Net={uid};G.Coop={active:true,isHost:host};
 const co=G.PKMSVVBigUpdateQA;
 return {G,s,p,api:co,cfg,uid,clock:v=>{t=v*1000}};
}
test('normal Co-op Host settles authentic terminal only, shared team kills, starter and receipt retained',()=>{
 const f=coopFixture(),{G,s,p,api,cfg,uid}=f;
 assert.equal(api.beginCoop(s,p,cfg,uid,true),true);
 f.clock(1);assert.equal(api.observeCoopHost(p,{time:1,kills:0,bosses:0}),true);
 f.clock(61);assert.equal(api.observeCoopHost(p,{time:61,kills:101,bosses:1}),true);
 assert.equal(api.settle(s,p,61,true),null,'no terminal yet');
 const terminal=api.finalizeCoopHost(p,{t:61,ki:101,bo:1,why:'host'});
 assert.equal(terminal.pkmsvvProgressRun.serial,1);
 G.Coop.active=false;G.Coop.isHost=false;
 assert.equal(api.settle(s,p,61,true).points,7);
 assert.equal(s.pkmsvvMastery[25],7);assert.equal(s.pkmsvvIncubator.eggs['egg-1'].kills,500);
 assert.equal(s.pkmsvvCoopProgress['room-A'].serial,1);assert.equal(api.settle(s,p,61,true),null);
 assert.equal(api.beginCoop(s,{...p},cfg,uid,true),false,'saved match cannot be awarded twice');
});
test('Client requires matching native Host frames and terminal; wrong room, serial, sender and disconnect do not settle',()=>{
 const f=coopFixture(false),{G,s,p,api,cfg,uid}=f;
 assert.equal(api.beginCoop(s,p,cfg,uid,false),true);
 const tag={room:'room-A',serial:1,seed:123,host:'host',rift:null};
 f.clock(1);assert.equal(api.observeCoopFrame(p,{t:1,ki:0,bo:0,pkmsvvProgressRun:tag},'host'),true);
 f.clock(61);const last={t:61,ki:5,bo:0,pkmsvvProgressRun:tag};
 assert.equal(api.observeCoopFrame(p,last,'host'),true);
 assert.equal(api.acceptCoopTerminal(p,last,'other'),false);
 assert.equal(api.acceptCoopTerminal(p,{...last,pkmsvvProgressRun:{...tag,serial:2}},'host'),false);
 assert.equal(api.acceptCoopTerminal(p,{...last,t:5000},'host'),false);
 assert.equal(api.settle(s,p,61,true),null);
 assert.equal(api.acceptCoopTerminal(p,last,'host'),true);
 assert.equal(api.acceptCoopTerminal(p,last,'host'),false);
 G.Coop.active=false;
 assert.equal(api.settle(s,p,61,true).points,1);assert.equal(s.pkmsvvIncubator.eggs['egg-1'].kills,500);
});
test('roster change, wrong modes, bot local and early termination cannot award',()=>{
 for(const kind of ['roster','early','mode','bot','disconnect']){
  const f=coopFixture(),{G,s,p,api,cfg,uid}=f;
  if(kind==='mode')cfg.mode='berry';if(kind==='bot')p.lanBot=true;
  const started=api.beginCoop(s,p,cfg,uid,true);
  if(kind==='mode'||kind==='bot'){assert.equal(started,false);continue;}
  f.clock(1);api.observeCoopHost(p,{time:1,kills:0,bosses:0});
  if(kind==='roster')G.Social.room.members=G.Social.room.members.slice(0,1);
  f.clock(kind==='early'?10:61);
  const time=kind==='early'?10:61;api.observeCoopHost(p,{time,kills:5,bosses:0});
  if(kind!=='disconnect')assert.equal(api.finalizeCoopHost(p,{t:time,ki:5,bo:0}).pkmsvvProgressRun,undefined);
  G.Coop.active=false;assert.equal(api.settle(s,p,time,true),null);assert.equal(s.pkmsvvMastery,undefined);
 }
});
test('weekly mission gives one pre-rolled baby egg only with real claim, rollback and full queue are safe',()=>{
 const {G,s,api}=setup();G.Game.state='ui';G.DEX_BY[175]={rarity:1};G.SPRITE_META[175]={a:{Idle:{},Walk:{}}};
 const m={id:'weekly',prog:5,goal:5,claimed:false};s.missions={week:'week-1',weekly:[m],day:'day-1',daily:[]};
 G.Ranking={periodIds:()=>({w:'week-1',d:'day-1'})};G.MissionDefs={BY:{weekly:{}}};
 let fail=true;
 G.Shop={transaction(kind,change){
  const before=JSON.stringify(s),r=change(s);
  if(fail){for(const k of Object.keys(s))delete s[k];Object.assign(s,JSON.parse(before));return null;}
  return r;
 }};
 const before=JSON.stringify(s),grant=()=>{m.claimed=true;s.coins+=20;};
 assert.equal(api.claimMission(s,m,true,grant),null);assert.equal(JSON.stringify(s),before);
 fail=false;assert.equal(api.claimMission(s,m,true,grant),null,'stale object no longer in mission list');
 const live=s.missions.weekly[0],res=api.claimMission(s,live,true,()=>{live.claimed=true;s.coins+=20;});
 assert.equal(res.egg,'egg-2');assert.equal(s.pkmsvvIncubator.eggs['egg-2'].from,'mission-baby');assert.equal(s.coins,120);
 assert.equal(api.claimMission(s,live,true,()=>{}),null);
 s.pkmsvvIncubator.eggs['egg-2'].kills=500;assert.equal(api.hatch('egg-2').dex,175);
});

test('native packet without bot flags uses locked authoritative lobby roster, not a mismatched client claim',()=>{
 const {G,s,p,api,cfg,uid}=coopFixture();
 G.Social.room.members.push({uid:'ai-test',bot:true,dex:7});
 cfg.members=G.Social.room.members.map(({uid,dex})=>({uid,dex}));
 assert.equal(api.beginCoop(s,p,cfg,uid,true),true);
});
