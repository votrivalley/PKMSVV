'use strict';
/* Fossil Expedition 6–8-minute objective engine, independent of rendering.
 * A participant can be a real player or a host-owned LAN AI actor. The
 * authoritative Host alone supplies game-clock ticks, strike events and
 * enemy proximity. No script starts a separate simulation or grants coins.
 * The mission receipt is issued ONLY after all native objectives succeeded.
 */
const MIN_PARTY=2,MAX_PARTY=4,MIN_TIME=360,MAX_TIME=480;
const DIG_RADIUS=85,EXTRACT_RADIUS=100;
const MAX_MACHINE_HP=360,ROCK_HITS=3;
const SITE_OFFSETS=[[-185,-95],[180,-125],[-10,200]];
function finite(x){return typeof x==='number'&&Number.isFinite(x);}
function distance(a,b){return Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0));}
function roster(members){
 if(!Array.isArray(members)||members.length<MIN_PARTY||members.length>MAX_PARTY)return null;
 const seen=new Set(),out=[];
 for(const m of members){
  if(typeof m?.uid!=='string'||!m.uid||seen.has(m.uid))return null;
  seen.add(m.uid);out.push({uid:m.uid,bot:m.bot===true});
 }
 if(!out.some(m=>!m.bot))return null;
 return out;
}
function begin({members,roomId,hostUid,origin,startSeconds=0}={}){
 const team=roster(members);
 if(!team||typeof roomId!=='string'||!roomId||
    typeof hostUid!=='string'||!team.some(m=>m.uid===hostUid&&!m.bot)||
    !finite(origin?.x)||!finite(origin?.y)||!finite(startSeconds)||startSeconds<0)
  return {ok:false,reason:'invalid-room'};
 return {ok:true,mission:'fossil_lab',roomId,hostUid,team,clock:startSeconds,
  elapsed:0,result:null,phase:'excavate',
  machine:{x:origin.x,y:origin.y,hp:MAX_MACHINE_HP,maxHp:MAX_MACHINE_HP},
  sites:SITE_OFFSETS.map(([x,y],i)=>({id:i+1,x:origin.x+x,y:origin.y+y,hits:0,done:false})),
  collected:0,extractedBy:null,events:[],lastThreats:0};
}
function active(s){return !!s?.ok&&s.mission==='fossil_lab'&&!s.result;}
function participant(s,uid){return s.team.some(m=>m.uid===uid);}
function dig(s,{uid,siteId,actor,seconds,source}={}){
 if(!active(s))return {ok:false,reason:'inactive'};
 if(!participant(s,uid)||!finite(actor?.x)||!finite(actor?.y)||actor?.dead===true)
  return {ok:false,reason:'actor'};
 if(source!=='native-strike')return {ok:false,reason:'unverified-source'};
 if(!finite(seconds)||Math.abs(seconds-s.clock)>0.25)return {ok:false,reason:'clock'};
 const site=s.sites.find(x=>x.id===siteId);
 if(!site||site.done||distance(actor,site)>DIG_RADIUS)return {ok:false,reason:'range'};
 site.hits++;
 if(site.hits>=ROCK_HITS){site.done=true;s.collected++;
  s.events.push({type:'fossil',siteId,uid,at:s.elapsed});}
 return {ok:true,siteId,hits:site.hits,done:site.done,collected:s.collected};
}
function tick(s,{seconds,threats=0,roomId,liveMembers}={}){
 if(!active(s))return {ok:false,reason:'inactive'};
 if(roomId!==s.roomId||!finite(seconds)||seconds<s.clock||!Number.isSafeInteger(threats)||threats<0||threats>128)
  return {ok:false,reason:'clock-or-room'};
 const delta=seconds-s.clock;
 if(delta>2.2)return {ok:false,reason:'clock-jump'}; // no arbitrary QA fast-forward reward
 if(Array.isArray(liveMembers)){
  const ids=new Set(liveMembers.filter(x=>x&&!x.disconnected).map(x=>x.uid));
  if(!s.team.some(m=>!m.bot&&ids.has(m.uid)))return fail(s,'party-left');
  if(s.team.filter(m=>ids.has(m.uid)).length<MIN_PARTY)return fail(s,'party-too-small');
 }
 s.clock=seconds;s.elapsed+=delta;s.lastThreats=threats;
 // Real native enemies threatening the machine chip its health. Players can
 // kill them through the ordinary Co-op combat system; no scripted damage.
 if(s.collected===3&&threats>0)s.machine.hp=Math.max(0,s.machine.hp-
   Math.min(threats,8)*0.85*delta);
 if(s.machine.hp<=0)return fail(s,'machine-destroyed');
 if(s.elapsed>=MAX_TIME)return fail(s,'timeout');
 s.phase=s.collected<3?'excavate':s.elapsed<MIN_TIME?'defend':'extract';
 return {ok:true,phase:s.phase,elapsed:s.elapsed,collected:s.collected,hp:s.machine.hp};
}
function fail(s,reason){
 if(!s?.ok)return {ok:false,reason:'invalid'};
 s.result={cleared:false,reason,elapsed:s.elapsed};
 s.phase='failed';return {ok:false,reason,finished:true};
}
function extract(s,{uid,actor,seconds,roomId}={}){
 if(!active(s))return {ok:false,reason:'inactive'};
 if(roomId!==s.roomId||!participant(s,uid)||actor?.dead===true||
   !finite(actor?.x)||!finite(actor?.y))return {ok:false,reason:'actor'};
 if(Math.abs(Number(seconds)-s.clock)>0.25)return {ok:false,reason:'clock'};
 if(s.collected!==3)return {ok:false,reason:'specimens'};
 if(s.elapsed<MIN_TIME)return {ok:false,reason:'too-early'};
 if(s.elapsed>=MAX_TIME||s.machine.hp<=0)return {ok:false,reason:'too-late'};
 if(distance(actor,s.machine)>EXTRACT_RADIUS)return {ok:false,reason:'range'};
 s.phase='cleared';s.extractedBy=uid;
 s.result={cleared:true,elapsed:s.elapsed,health:s.machine.hp,
  optionalObjectives:Number(s.machine.hp>=MAX_MACHINE_HP*0.6)+Number(s.elapsed<=420)};
 return {ok:true,finished:true,result:{...s.result}};
}
function receipt(s,seq){
 if(!s?.result?.cleared||!Number.isSafeInteger(seq)||seq<1)return null;
 if(s.team.length<MIN_PARTY||s.team.length>MAX_PARTY)return null;
 return Object.freeze({mission:'fossil_lab',verified:true,cleared:true,
  seq,durationSeconds:Math.round(s.elapsed*1000)/1000,
  partySize:s.team.length,optionalObjectives:s.result.optionalObjectives});
}
module.exports={MIN_PARTY,MAX_PARTY,MIN_TIME,MAX_TIME,MAX_MACHINE_HP,ROCK_HITS,
 DIG_RADIUS,EXTRACT_RADIUS,SITE_OFFSETS,roster,begin,dig,tick,extract,fail,receipt};
