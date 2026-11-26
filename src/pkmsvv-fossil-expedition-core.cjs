'use strict';
/* Fossil Expedition v2: host-authoritative mission objectives, no save writes.
 * 2–4 members (host + AI allowed), 9 fossil fragments from 3 distant sites,
 * rescue Rotom before 4:00, escort to a ruined restorer, defend through 8:00.
 * The boss is an actual Pokémon enemy resolved by the native Combat engine.
 * This pure deterministic core never fakes a kill, a rescue or a reward.
 */
const MIN_PARTY=2,MAX_PARTY=4,MIN_TIME=480,MAX_TIME=480;
const ROTOM_DEADLINE=240,DEFEND_END=480,ROCK_HITS=3;
const DIG_RADIUS=85,RESCUE_RADIUS=144,MERGE_RADIUS=110,MAX_MACHINE_HP=360;
// Match Berry Rescue: +13⅓% enemy movement speed every two minutes,
// capped at three stages (+40%) for an eight-minute objective.
const SPEED_STEP_SECONDS=120,SPEED_GAIN_PER_STEP=.20*2/3,MAX_SPEED_STAGES=3;
function speedFactor(seconds){
 if(!Number.isFinite(seconds))return 1;
 return 1+SPEED_GAIN_PER_STEP*Math.max(0,Math.min(MAX_SPEED_STAGES,
  Math.floor(Math.max(0,seconds)/SPEED_STEP_SECONDS)));
}
// Each excavation is a real three-hit object with a visible HP bar.
function rockHpRatio(hits){
 const n=Number(hits);
 return 1-Math.max(0,Math.min(ROCK_HITS,Number.isFinite(n)?n:0))/ROCK_HITS;
}
// Each dig site is beyond the nearby viewport and far from the other sites.
// Keep a real expedition, but give all three sites explicit navigation cues.
const SITE_OFFSETS=[[-1340,-790],[1420,-840],[150,1600]];
const ROTOM_OFFSET=[-940,1450],BOSS_DEX=623;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=v=>!!v&&finite(v.x)&&finite(v.y);
function roster(members){
 if(!Array.isArray(members)||members.length<MIN_PARTY||members.length>MAX_PARTY)return null;
 const seen=new Set(),out=[];
 for(const m of members){
  if(typeof m?.uid!=='string'||!m.uid||seen.has(m.uid))return null;
  seen.add(m.uid);out.push({uid:m.uid,bot:m.bot===true});
 }
 return out.some(m=>!m.bot)?out:null;
}
function begin({members,roomId,hostUid,origin,startSeconds=0,sites,rotomPoint}={}){
 const team=roster(members);
 if(!team||typeof roomId!=='string'||!roomId||
  typeof hostUid!=='string'||!team.some(m=>m.uid===hostUid&&!m.bot)||
  !point(origin)||!finite(startSeconds)||startSeconds<0)return {ok:false,reason:'invalid-room'};
 const pts=Array.isArray(sites)&&sites.length===3&&sites.every(point)?
  sites:SITE_OFFSETS.map(([x,y])=>({x:origin.x+x,y:origin.y+y}));
 const rp=point(rotomPoint)?rotomPoint:{x:origin.x+ROTOM_OFFSET[0],y:origin.y+ROTOM_OFFSET[1]};
 if(pts.some(p=>distance(p,origin)<900)||pts.some((p,i)=>pts.some((q,j)=>i!==j&&distance(p,q)<1500))||
    distance(rp,origin)<850||pts.some(p=>distance(p,rp)<500))
  return {ok:false,reason:'sites-not-spread-out'};
 return {ok:true,mission:'fossil_lab',roomId,hostUid,team,clock:startSeconds,elapsed:0,
  phase:'excavate',result:null,events:[],collected:0,
  sites:pts.map((p,i)=>({id:i+1,x:p.x,y:p.y,hits:0,done:false})),
  rotom:{x:rp.x,y:rp.y,hp:100,maxHp:100,freed:false,merged:false,alive:true},
  boss:{dex:BOSS_DEX,x:rp.x+52,y:rp.y-18,spawned:false,defeated:false},
  machine:{x:origin.x,y:origin.y,hp:MAX_MACHINE_HP,maxHp:MAX_MACHINE_HP,online:false},
  lastThreats:0};
}
const active=s=>!!s?.ok&&s.mission==='fossil_lab'&&!s.result;
const participant=(s,uid)=>s.team.some(m=>m.uid===uid);
function dig(s,{uid,siteId,actor,seconds,source}={}){
 if(!active(s)||s.phase!=='excavate')return {ok:false,reason:'phase'};
 if(!participant(s,uid)||!point(actor)||actor.dead===true)return {ok:false,reason:'actor'};
 if(source!=='native-strike')return {ok:false,reason:'unverified-source'};
 if(!finite(seconds)||Math.abs(seconds-s.clock)>.25)return {ok:false,reason:'clock'};
 const site=s.sites.find(p=>p.id===siteId);
 if(!site||site.done||distance(site,actor)>DIG_RADIUS)return {ok:false,reason:'range'};
 site.hits=Math.min(ROCK_HITS,site.hits+1);
 if(site.hits===ROCK_HITS){
  site.done=true;s.collected++;
  s.events.push({type:'specimens',siteId,uid,at:s.elapsed});
  if(s.collected===3){s.phase='rescue';s.events.push({type:'rescue-start',at:s.elapsed});}
 }
 return {ok:true,hits:site.hits,done:site.done,collected:s.collected,fragments:s.sites.reduce((n,p)=>n+p.hits,0)};
}
function rescue(s,{uid,actor,seconds,roomId,bossDefeated}={}){
 if(!active(s)||s.phase!=='rescue')return {ok:false,reason:'phase'};
 if(roomId!==s.roomId||!participant(s,uid)||!point(actor)||actor.dead===true)
  return {ok:false,reason:'actor'};
 if(!finite(seconds)||Math.abs(seconds-s.clock)>.25)return {ok:false,reason:'clock'};
 if(s.elapsed>=ROTOM_DEADLINE)return fail(s,'rotom-lost');
 if(!s.boss.spawned||!s.boss.defeated||bossDefeated!==true)return {ok:false,reason:'boss-alive'};
 if(distance(actor,s.rotom)>RESCUE_RADIUS)return {ok:false,reason:'range'};
 s.rotom.freed=true;s.phase='escort';s.events.push({type:'rotom-rescued',uid,at:s.elapsed});
 return {ok:true,phase:s.phase};
}
function fail(s,reason){
 if(!s?.ok)return {ok:false,reason:'invalid'};
 if(s.result)return {ok:false,reason:'inactive'};
 s.result={cleared:false,reason,elapsed:s.elapsed};
 s.phase='failed';s.events.push({type:'failed',reason,at:s.elapsed});
 return {ok:false,reason,finished:true};
}
function tick(s,{seconds,threats=0,roomId,liveMembers,rotomPosition,bossDefeated=false}={}){
 if(!active(s))return {ok:false,reason:'inactive'};
 if(roomId!==s.roomId||!finite(seconds)||seconds<s.clock||
  !Number.isSafeInteger(threats)||threats<0||threats>128)return {ok:false,reason:'clock-or-room'};
 const delta=seconds-s.clock;
 if(delta>2.2)return {ok:false,reason:'clock-jump'};
 if(Array.isArray(liveMembers)){
  const ids=new Set(liveMembers.filter(x=>x&&!x.disconnected).map(x=>x.uid));
  if(!s.team.some(m=>!m.bot&&ids.has(m.uid)))return fail(s,'party-left');
  if(s.team.filter(m=>ids.has(m.uid)).length<MIN_PARTY)return fail(s,'party-too-small');
 }
 s.clock=seconds;s.elapsed+=delta;s.lastThreats=threats;
 if(s.collected===3){
  if(!s.boss.spawned){s.boss.spawned=true;s.events.push({type:'boss-spawn',at:s.elapsed});}
  if(bossDefeated)s.boss.defeated=true;
 }
 if(!s.rotom.freed){
  // Rotom is losing its duel against the ancient automaton.
  s.rotom.hp=Math.max(0,100*(1-s.elapsed/ROTOM_DEADLINE));
  if(s.elapsed>=ROTOM_DEADLINE||s.rotom.hp<=0)return fail(s,'rotom-lost');
 }
 if(s.phase==='escort'&&point(rotomPosition)){
  // Host supplies the actual in-world companion position. There is no teleport.
  const moved=distance(s.rotom,rotomPosition);
  if(moved<=Math.max(10,205*delta+8)){
   s.rotom.x=rotomPosition.x;s.rotom.y=rotomPosition.y;
  }
  if(distance(s.rotom,s.machine)<=MERGE_RADIUS){
   s.rotom.merged=true;s.machine.online=true;s.phase='defend';
   s.events.push({type:'rotom-merged',at:s.elapsed});
  }
 }
 if(s.phase==='defend'&&threats>0)
  s.machine.hp=Math.max(0,s.machine.hp-Math.min(threats,8)*0.85*delta);
 if(s.machine.hp<=0)return fail(s,'machine-destroyed');
 if(s.elapsed>=DEFEND_END){
  if(!s.machine.online||!s.rotom.merged)return fail(s,'machine-not-restored');
  s.phase='cleared';
  s.result={cleared:true,elapsed:s.elapsed,health:s.machine.hp,
   optionalObjectives:Number(s.machine.hp>=MAX_MACHINE_HP*.6)+Number(s.rotom.hp>=50)};
  s.events.push({type:'cleared',at:s.elapsed});
  return {ok:true,finished:true,result:{...s.result}};
 }
 return {ok:true,phase:s.phase,elapsed:s.elapsed,fragments:s.sites.reduce((n,p)=>n+p.hits,0),
  collected:s.collected,rotomHp:s.rotom.hp,machineHp:s.machine.hp};
}
function receipt(s,seq){
 if(!s?.ok||s.phase!=='cleared'||s.mission!=='fossil_lab'||!s.result?.cleared||
    !s.rotom?.freed||!s.rotom?.merged||!s.machine?.online||!finite(s.machine.hp)||s.machine.hp<=0||
    !s.boss?.spawned||!s.boss?.defeated||s.collected!==3||
    !Array.isArray(s.sites)||s.sites.length!==3||!s.sites.every(p=>p.done&&p.hits===ROCK_HITS)||
    !finite(s.elapsed)||s.elapsed<DEFEND_END||s.result.elapsed!==s.elapsed||
    !Number.isSafeInteger(seq)||seq<1||!roster(s.team))return null;
 const events=Array.isArray(s.events)?s.events:[];
 const specimens=events.filter(e=>e.type==='specimens');
 const rescue=events.findIndex(e=>e.type==='rotom-rescued'),merge=events.findIndex(e=>e.type==='rotom-merged'),clear=events.findIndex(e=>e.type==='cleared');
 if(specimens.length!==3||new Set(specimens.map(e=>e.siteId)).size!==3||
    rescue<0||merge<=rescue||clear<=merge||events[rescue].at>=ROTOM_DEADLINE||events[clear].at<DEFEND_END||
    s.result.optionalObjectives!==Number(s.machine.hp>=MAX_MACHINE_HP*.6)+Number(s.rotom.hp>=50))return null;
 return Object.freeze({mission:'fossil_lab',verified:true,cleared:true,seq,
  durationSeconds:Math.round(s.elapsed*1000)/1000,partySize:s.team.length,
  optionalObjectives:s.result.optionalObjectives});
}
module.exports={MIN_PARTY,MAX_PARTY,MIN_TIME,MAX_TIME,ROTOM_DEADLINE,DEFEND_END,
 ROCK_HITS,DIG_RADIUS,RESCUE_RADIUS,MERGE_RADIUS,MAX_MACHINE_HP,
 SPEED_STEP_SECONDS,SPEED_GAIN_PER_STEP,MAX_SPEED_STAGES,speedFactor,rockHpRatio,
 SITE_OFFSETS,ROTOM_OFFSET,BOSS_DEX,roster,begin,dig,rescue,tick,fail,receipt};
