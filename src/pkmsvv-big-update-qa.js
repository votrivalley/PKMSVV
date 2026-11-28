/* Big Update progression QA: cosmetic mastery and permanent recruitment eggs.
 * Native result hook only; no damage/stat buffs, no alteration of support eggs.
 * Old saves are read lazily. Rewards do not forge Pokédex defeat history.
 */
(function(root){
 'use strict';
 const G=root.G;if(!G)return;
 const LEVELS=Object.freeze([0,20,60,150,350,750]),GOAL=500,CAP=6,MIN_TIME=60,MAX_POINTS=1000000;
 const TITLES=[['Tân binh','Rookie'],['Thân quen','Familiar'],['Thành thạo','Skilled'],['Tinh anh','Expert'],['Bậc thầy','Master'],['Huyền thoại','Legend']];
 // Canonical baby IDs. Existing Pikachu/Clefairy/Jigglypuff evolution
 // families remain available through their normal story/wild routes.
 // Mr. Rime and Toxtricity variant-specific gates await real variant IDs.
 const EGG_ONLY=Object.freeze([172,173,174,175,236,238,239,240,298,360,406,433,438,439,440,446,447,458,848]);
 const eggSet=new Set(EGG_ONLY);
 const EGG_PARENT=Object.freeze({176:175,468:176,106:236,107:236,237:236,124:238,125:239,466:125,
  126:240,467:126,183:298,184:183,202:360,315:406,407:315,358:433,185:438,122:439,
  113:440,242:113,143:446,448:447,226:458,849:848});
 const SHINY_RATE=.0045;
 // Preserve all pre-existing egg thresholds. Only newly issued Baby eggs
 // carry an explicit target. All selected slots advance in parallel.
 const INCUBATOR_LEVELS=Object.freeze([
  {level:1,capacity:6,slots:1,cost:0},{level:2,capacity:8,slots:1,cost:120},
  {level:3,capacity:10,slots:2,cost:240},{level:4,capacity:12,slots:2,cost:360},
  {level:5,capacity:15,slots:3,cost:480}
 ].map(Object.freeze));
 const BABY_TIERS=Object.freeze([
  {name:['Thường','Common'],color:'#a7c39a',weight:55,goal:500,dex:[172,173,174,298,360,406]},
  {name:['Hiếm','Rare'],color:'#86bfff',weight:30,goal:750,dex:[239,240,238,438,439,433,458]},
  {name:['Cực hiếm','Super rare'],color:'#d6a6ff',weight:15,goal:1000,dex:[175,447,446,236,440,848]}
 ].map(t=>Object.freeze({...t,dex:Object.freeze(t.dex),name:Object.freeze(t.name)})));
 const tierFor=dex=>BABY_TIERS.find(t=>t.dex.includes(Number(dex)));
 const goalFor=e=>e?.goal??GOAL;
 const levelOf=i=>i?.level??1;
 const capacity=i=>INCUBATOR_LEVELS[levelOf(i)-1]?.capacity;
 const slots=i=>INCUBATOR_LEVELS[levelOf(i)-1]?.slots;
 const activeIds=i=>[...(i.active===null?[]:[i.active]),...(i.extra||[])];
 const prizeKey=(room,serial)=>room+'.'+serial;
 const prizeCount=i=>Object.values(i.prizes||{}).reduce((n,p)=>n+p.count-p.claimed.length,0);
 function setActive(i,ids){
  i.active=ids[0]??null;
  if(ids.length>1)i.extra=ids.slice(1);else delete i.extra;
 }
 const isEggOnly=dex=>eggSet.has(Number(dex));
 const eggEvolutionParent=dex=>EGG_PARENT[Number(dex)]||null;
 const runs=new WeakMap(),riftBosses=new WeakMap(),coopRuns=new WeakMap();
 const MAX_COOP_ROOMS=128;
 const wall=()=>globalThis.performance?.now?.()??Date.now();
 const isObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const own=(s,k)=>Object.prototype.hasOwnProperty.call(s||{},k);
 const copy=x=>JSON.parse(JSON.stringify(x));
 const n=(v,cap=MAX_POINTS)=>Number.isFinite(Number(v))?Math.max(0,Math.min(cap,Math.floor(Number(v)))):0;
 const dexId=v=>Number.isInteger(Number(v))&&Number(v)>0&&Number(v)<=1025?Number(v):null;
 const L=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const save=()=>G.DB?.save;
 function eggDiscovered(s,dex){
  return (isEggOnly(dex)||!!eggEvolutionParent(dex))&&!!(s?.owned?.[dex]||s?.shiny?.[dex]||s?.pkmsvvEggEvolutions?.[dex]===true);
 }
 // null means the normal defeat-based recruitment policy still applies.
 function eggGachaPolicy(s,dex){
  if(isEggOnly(dex))return false;
  if(eggEvolutionParent(dex))return !!(s?.owned?.[dex]||s?.shiny?.[dex]||s?.pkmsvvEggEvolutions?.[dex]===true);
  return null;
 }
 function eggHint(dex){
  if(isEggOnly(dex))return Number(dex)===446?
   L('Chỉ nhận qua ấp trứng thu phục. Có thể tìm trứng Munchlax khi thắng Giải cứu Berry Thường và hạ Munchlax.','Hatch recruitment eggs only. Defeat Munchlax and win Normal Berry Rescue for its egg.'):
   L('Chỉ nhận qua ấp trứng thu phục: boss vùng, Rift, nhiệm vụ tuần hoặc Tranh Trứng. Không có trong Chiêu mộ.','Hatch recruitment eggs from region bosses, Rift, weekly missions or Egg Rush. Not available in Recruitment.');
  const parent=eggEvolutionParent(dex);
  return parent?L('Mở Chiêu mộ khi tự tiến hóa từ ','Unlock Recruitment by evolving from ')+(G.DEX_BY?.[parent]?.name||('#'+parent))+'.':null;
 }
 function summary(s,dex){
  const points=n(s?.pkmsvvMastery?.[dex]);let tier=0;
  for(let i=1;i<LEVELS.length;i++)if(points>=LEVELS[i])tier=i;
  return {points,tier,next:LEVELS[tier+1]??null,title:L(...TITLES[tier]),gold:tier>=4,aura:tier>=5};
 }
 function incubator(s){
  const raw=s?.pkmsvvIncubator;
  if(raw===undefined)return {serial:0,active:null,eggs:{},hatched:{}};
  if(!isObj(raw)||!Number.isSafeInteger(raw.serial)||raw.serial<0||!isObj(raw.eggs)||!isObj(raw.hatched)||
   !Number.isInteger(levelOf(raw))||levelOf(raw)<1||levelOf(raw)>5||
   Object.keys(raw.eggs).length>capacity(raw))throw Error('Invalid incubator save; keep original');
  const validId=id=>/^egg-[1-9][0-9]*$/.test(id)&&Number.isSafeInteger(Number(id.slice(4)))&&Number(id.slice(4))<=raw.serial;
  for(const [id,e] of Object.entries(raw.eggs)){
   if(!validId(id)||!dexId(e?.dex)||!Number.isInteger(e.kills)||e.kills<0||e.kills>goalFor(e)||own(raw.hatched,id)||
      (e.goal!==undefined&&e.goal!==(tierFor(e.dex)?.goal??GOAL))||
      (e.shiny!==undefined&&typeof e.shiny!=='boolean')||(['baby-egg','rift-baby','mission-baby','egg-rush-baby'].includes(e.from)&&!isEggOnly(e.dex))||
      (e.from==='berry-boss'&&Number(e.dex)!==446))throw Error('Invalid egg record');
  }
  for(const [id,dex] of Object.entries(raw.hatched))if(!validId(id)||!dexId(dex))throw Error('Invalid hatch receipt');
  if(raw.extra!==undefined&&!Array.isArray(raw.extra))throw Error('Invalid slots');
  const active=activeIds(raw);
  if(active.length>slots(raw)||new Set(active).size!==active.length||active.some(id=>typeof id!=='string'||!own(raw.eggs,id))||
     (raw.active===null&&active.length))throw Error('Invalid active egg');
  if(raw.prizes!==undefined&&!isObj(raw.prizes))throw Error('Invalid prize journal');
  const claimed=new Set();
  for(const [key,p] of Object.entries(raw.prizes||{})){
   if(!/^[A-Za-z0-9_-]{1,128}\.[1-9][0-9]*$/.test(key)||!isObj(p)||![1,2].includes(p.count)||!Array.isArray(p.claimed)||p.claimed.length>p.count)throw Error('Invalid rank prize');
   for(const id of p.claimed){
    if(!validId(id)||claimed.has(id)||(!own(raw.eggs,id)&&!own(raw.hatched,id))||
       (own(raw.eggs,id)&&(raw.eggs[id].from!=='egg-rush-baby'||raw.eggs[id].prize!==key))||
       (own(raw.hatched,id)&&!isEggOnly(raw.hatched[id])))throw Error('Invalid prize redemption');
    claimed.add(id);
   }
  }
  for(const [id,e] of Object.entries(raw.eggs))if(e.prize!==undefined&&!claimed.has(id))throw Error('Unlinked rank prize');
  return raw;
 }
 function competitive(){return !!(G.Coop?.active||G.Royale?.active||G.EggRush?.active||G.Arena?.active||
  G.PKMSVVArenaSolo?.active||G.PKMSVVChampionArena?.active||G.PKMSVVArenaPvp?.active||
  G.PKMSVVBerryRescue?.active||G.PKMSVVFossilExpedition?.session);}
 // Normal survival Co-op only. Identity comes from the actual LAN/Wi-Fi
 // locked room and native begin configuration, never from an award packet.
 function party(members){
  if(!Array.isArray(members)||members.length<2||members.length>4)return null;
  const ids=new Set(),rows=[];
  for(const m of members){
   if(typeof m?.uid!=='string'||!m.uid||m.uid.length>128||ids.has(m.uid)||m.disconnected)return null;
   ids.add(m.uid);rows.push([m.uid,m.bot===true]);
  }
  return JSON.stringify(rows.sort((a,b)=>a[0].localeCompare(b[0])));
 }
 function roomId(v){return typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);}
 function receipts(s){
  const value=s.pkmsvvCoopProgress;
  if(value===undefined)return {};
  if(!isObj(value)||Object.keys(value).length>MAX_COOP_ROOMS)throw Error('Invalid Co-op receipts');
  for(const [k,v] of Object.entries(value))
   if(!roomId(k)||!isObj(v)||!Number.isSafeInteger(v.serial)||v.serial<1||!Number.isSafeInteger(v.at)||v.at<0)throw Error('Invalid Co-op receipt');
  return value;
 }
 function roomMatches(r){
  const room=G.Social?.room;
  return !!(r&&r.profile===save()&&!G.DB?.guest&&room?.id===r.room&&room.host===r.host&&
    room.mode===r.mode&&room.open===false&&room.matchSerial===r.serial&&party(room.members)===r.roster&&
    G.Social?.uid===r.uid&&G.Net?.uid===r.uid);
 }
 function beginCoop(s,p,cfg,uid,host){
  if(!s||s!==save()||G.DB?.guest||!p||p.remote||p.lanBot||coopRuns.has(p))return false;
  const room=G.Social?.room,dex=dexId(p.dex),roster=party(room?.members);
  // The native start packet intentionally contains only UID/name/dex/Shiny;
  // the locked lobby roster is the canonical bot/human classification.
  const cfgParty=Array.isArray(cfg?.members)?party(cfg.members.map(m=>{
   const member=room?.members?.find(x=>x.uid===m?.uid);
   return member?{uid:m.uid,bot:member.bot===true,disconnected:member.disconnected}:null;
  })):null;
  const mode=cfg?.mode;
  if(!['coop','eggrush'].includes(mode)||room?.mode!==mode||(mode==='eggrush'&&room.members?.length!==4)||room.open!==false||!roomId(room.id)||
     !Number.isSafeInteger(room.matchSerial)||room.matchSerial<1||!Number.isSafeInteger(cfg.seed)||cfg.seed<0||
     cfg.host!==room.host||typeof uid!=='string'||uid!==G.Net?.uid||uid!==G.Social?.uid||
     host!==(uid===room.host)||!roster||roster!==cfgParty||
     !room.members.some(m=>m.uid===uid&&!m.bot)||!room.members.some(m=>m.uid===cfg.host&&!m.bot)||!dex||!s.owned?.[dex])return false;
  let egg=[];
  try{if((receipts(s)[room.id]?.serial||0)>=room.matchSerial)return false;egg=activeIds(incubator(s));}catch(_){return false;}
  coopRuns.set(p,{profile:s,dex,egg,mode,room:room.id,serial:room.matchSerial,seed:cfg.seed,uid,host:cfg.host,
   isHost:host,roster,started:wall(),t:0,kills:0,bosses:0,frames:0,riftType:null,terminal:false,settled:false,invalid:false});
  return true;
 }
 function validType(v){return v===null||typeof v==='string'&&/^[a-z]{3,12}$/.test(v)&&(!G.U?.TYPE_NAME||own(G.U.TYPE_NAME,v));}
 function tag(r){return {room:r.room,serial:r.serial,seed:r.seed,host:r.host,rift:r.riftType,...(r.mode==='eggrush'?{mode:r.mode}:{})};}
 function matchingTag(r,v){return !!(v&&v.room===r.room&&v.serial===r.serial&&v.seed===r.seed&&v.host===r.host&&(r.mode==='eggrush'?v.mode==='eggrush'&&v.rift===null:!v.mode||v.mode==='coop')&&validType(v.rift));}
 function observeCoop(r,t,kills,bosses,rift){
  if(!r||r.invalid||r.terminal||r.settled)return false;
  if(!roomMatches(r)){r.invalid=true;return false;}
  if(!Number.isFinite(t)||t<0||t>86400||!Number.isSafeInteger(kills)||kills<0||kills>1000000||
     !Number.isSafeInteger(bosses)||bosses<0||bosses>10000||!validType(rift))return false;
  // A late/duplicate frame does not invalidate the current run. Reject
  // counter rollback and clocks faster than real elapsed time (grace 8s).
  if(t+0.2<r.t||kills<r.kills||bosses<r.bosses||t>(wall()-r.started)/1000+8)return false;
  if(r.riftType!==null&&rift!==r.riftType)return false;
  r.t=Math.max(r.t,t);r.kills=kills;r.bosses=bosses;r.riftType=rift;r.frames++;return true;
 }
 function observeCoopHost(p,stats){
  const r=coopRuns.get(p);
  if(!r?.isHost||!G.Coop?.isHost||p!==G.Game?.player)return false;
  return observeCoop(r,stats?.time,stats?.kills,stats?.bosses,r.riftType);
 }
 function coopFrameTag(p){
  const r=coopRuns.get(p);
  return r?.isHost&&!r.invalid&&roomMatches(r)?tag(r):null;
 }
 function observeCoopFrame(p,frame,from){
  const r=coopRuns.get(p);
  if(!r||r.isHost||from!==r.host||!matchingTag(r,frame?.pkmsvvProgressRun))return false;
  return observeCoop(r,frame.t,frame.ki,frame.bo,frame.pkmsvvProgressRun.rift);
 }
 // Validate the actual sealed pick-up ledger against the final Host result.
 // Do not accept UI reveal callbacks, locally fabricated ranks or a quit
 // summary. Every egg ID must have been seen in this locked four-slot room.
 function verifyEggRush(r,data){
  const out=data?.eggrush,mode=G.EggRush;
  if(r.mode!=='eggrush'||!mode?.active||!out||!Array.isArray(out.standings)||out.standings.length!==4||
     !Number.isSafeInteger(out.collected)||out.collected<1||out.collected>10||
     !Number.isFinite(out.finishedAt)||Math.abs(out.finishedAt-r.t)>1.5||
     (out.collected!==10&&out.finishedAt<720)||out.finishedAt>722||
     (r.isHost&&out!==mode.outcome))return null;
  const pets=mode.pets,expected=JSON.parse(r.roster).map(x=>x[0]),known=new Set((G.PKMSVVEggs?.SPECIES||[]).filter(x=>G.PKMSVVEggs.supportReady?.(x.dex)!==false).map(x=>x.dex));
  if(!Array.isArray(pets)||pets.length!==out.collected||!known.size)return null;
  const ids=new Set(),users=new Set(),rows=[];
  for(const row of out.standings){
   if(!expected.includes(row?.uid)||users.has(row.uid)||!Array.isArray(row.hatched)||row.eggs!==row.hatched.length||
      !Number.isSafeInteger(row.points)||row.points<0||!Number.isInteger(row.rank)||row.rank<1||row.rank>4)return null;
   users.add(row.uid);let points=0;
   for(const e of row.hatched){
    if(!Number.isSafeInteger(e?.id)||ids.has(e.id)||!known.has(e.dex)||typeof e.shiny!=='boolean'||
       !pets.some(p=>p.id===e.id&&p.uid===row.uid&&!p.hatch))return null;
    ids.add(e.id);
    const base=[151,385].includes(e.dex)?20:e.dex===132?10:5,score=base*(e.shiny?2:1);
    if(e.basePoints!==base||e.points!==score)return null;points+=score;
   }
   if(points!==row.points)return null;
   rows.push({uid:row.uid,rank:row.rank,points,eggs:row.eggs,hatched:copy(row.hatched),at:row.at||0});
  }
  if(ids.size!==out.collected||users.size!==4||out.standings.some((row,i)=>row.rank!==i+1||row.win!==(i===0))||out.winner!==rows[0].uid)return null;
  for(let i=1;i<rows.length;i++)if(rows[i-1].points<rows[i].points||
     (rows[i-1].points===rows[i].points&&rows[i-1].eggs<rows[i].eggs))return null;
  return rows.find(row=>row.uid===r.uid)||null;
 }
 function finalizeCoopHost(p,data){
  const r=coopRuns.get(p);
  if(!r?.isHost||!G.Coop?.isHost||p!==G.Game?.player||!data||r.frames<2||
     !observeCoop(r,data.t,data.ki,data.bo,r.riftType))return data;
  if(r.t<MIN_TIME)return data;
  if(r.mode==='eggrush'){r.eggRush=verifyEggRush(r,data);if(!r.eggRush)return data;}
  r.terminal=true;
  return {...data,pkmsvvProgressRun:tag(r)};
 }
 function acceptCoopTerminal(p,data,from){
  const r=coopRuns.get(p);
  if(!r||r.isHost||from!==r.host||p!==G.Game?.player||r.frames<2||
     !matchingTag(r,data?.pkmsvvProgressRun)||
     !observeCoop(r,data.t,data.ki,data.bo,data.pkmsvvProgressRun.rift)||r.t<MIN_TIME)return false;
  if(r.mode==='eggrush'){r.eggRush=verifyEggRush(r,data);if(!r.eggRush)return false;}
  r.terminal=true;return true;
 }
 function settleEggRush(s,r,journal){
  const row=r.eggRush;if(!row)return null;
  const want=row.eggs>0?(row.rank===1?2:row.rank===2?1:0):0;
  const draft=copy(s),reward=[];
  // Friendship is a separate support collection, never permanent ownership.
  if(draft.pkmsvvSupportBond!==undefined&&!isObj(draft.pkmsvvSupportBond))return null;
  if(draft.pkmsvvSupportShiny!==undefined&&!isObj(draft.pkmsvvSupportShiny))return null;
  if(row.eggs){
   draft.pkmsvvSupportBond=draft.pkmsvvSupportBond||{};
   for(const e of row.hatched){
    draft.pkmsvvSupportBond[e.dex]=Math.min(999,n(draft.pkmsvvSupportBond[e.dex])+1);
    if(e.shiny){draft.pkmsvvSupportShiny=draft.pkmsvvSupportShiny||{};draft.pkmsvvSupportShiny[e.dex]=true;}
   }
   draft.stats=draft.stats||{};draft.stats.pkmsvvEggsHatched=Math.min(99999,n(draft.stats.pkmsvvEggsHatched)+row.eggs);
  }
  let blocked=false,pending=0;
  try{
   if(want){
    const next=copy(incubator(draft)),key=prizeKey(r.room,r.serial);
    next.prizes=next.prizes||{};
    if(own(next.prizes,key))return null;
    next.prizes[key]={count:want,claimed:[]};
    reward.push(...redeemPrize(draft,next,key));
    pending=want-reward.length;draft.pkmsvvIncubator=next;
   }
  }catch(err){blocked=true;reward.length=0;console.warn('[Egg Rush reward] incubator preserved',err);}
  const next={...journal,[r.room]:{serial:r.serial,at:Date.now()}};
  draft.pkmsvvCoopProgress=Object.fromEntries(Object.entries(next).sort((a,b)=>b[1].at-a[1].at||a[0].localeCompare(b[0])).slice(0,MAX_COOP_ROOMS));
  if(JSON.stringify(draft).length>(G.PKMSVVBox2?.MAX_SAVE_CHARS||1400000))return null;
  // Native endRun commits the full result together, including high-water
  // receipt, bond and eggs. Its run retry writes the SAME state on failure.
  Object.assign(s,draft);
  const receipt={rank:row.rank,friendship:row.eggs,want,awarded:reward.length,pending,blocked};
  G.EggRush?.setLocalReward?.(receipt);
  return receipt;
 }
 function settleCoop(s,p,time){
  const r=coopRuns.get(p);
  if(!r||r.invalid||!r.terminal||r.settled||r.profile!==s||s!==save()||G.DB?.guest||p.remote||p.lanBot||
     !Number.isFinite(time)||time<MIN_TIME||Math.abs(time-r.t)>1.5)return null;
  r.settled=true;
  let journal;
  try{journal=receipts(s);if((journal[r.room]?.serial||0)>=r.serial)return null;}catch(_){return null;}
  if(r.mode==='eggrush')return settleEggRush(s,r,journal);
  const points=Math.min(120,Math.floor(Math.min(r.t,1800)/60)+Math.floor(r.kills/100)+Math.min(5,r.bosses)*5);
  if(s.pkmsvvMastery!==undefined&&!isObj(s.pkmsvvMastery))return null;
  s.pkmsvvMastery={...(s.pkmsvvMastery||{}),[r.dex]:Math.min(MAX_POINTS,summary(s,r.dex).points+points)};
  let progress=0,riftReward=null;
  try{
   const next=copy(incubator(s));
   progress=advanceEggs(next,r.egg,r.kills);
   if(r.riftType!==null&&Object.keys(next.eggs).length<capacity(next)){
    const pool=eligibleDex(s,9,next),matching=pool.filter(id=>G.DEX_BY?.[id]?.types?.includes(r.riftType));
    const candidates=matching.length?matching:pool;
    if(candidates.length){
     const dex=pickReward(s,candidates,.40);
     riftReward=createEgg(next,dex,9,isEggOnly(dex)?'rift-baby':'rift');
    }
   }
   if(progress||riftReward)s.pkmsvvIncubator=next;
  }catch(err){console.warn('[Co-op incubator] unchanged',err);}
  // Keep one high-water receipt per room; old closed rooms cannot rejoin.
  const next={...journal,[r.room]:{serial:r.serial,at:Date.now()}};
  const rows=Object.entries(next).sort((a,b)=>b[1].at-a[1].at||a[0].localeCompare(b[0]));
  s.pkmsvvCoopProgress=Object.fromEntries(rows.slice(0,MAX_COOP_ROOMS));
  return {dex:r.dex,points,progress,riftReward};
 }
 function begin(s,p,coop){
  const region=G.PKMSVVQuickRegion,idx=region?.selectedRegion,dex=dexId(p?.dex);
  if(!s||s!==save()||G.DB?.guest||!p||p.remote||p.lanBot||coop||competitive()||
     region?.active!==true||!Number.isInteger(idx)||idx<0||idx>9||!dex||!s.owned?.[dex])return false;
  let egg=[];try{egg=activeIds(incubator(s));}catch(_){}
  runs.set(p,{profile:s,dex,region:idx,egg,badge:false,riftType:null,settled:false});return true;
 }
 function markBadge(p,boss,region){
  const r=p&&runs.get(p);
  if(!r||r.settled||p!==G.Game?.player||r.region!==region||competitive()||!boss?.dead||
    !Number.isFinite(boss.hp)||boss.hp>0||!boss.pkmsvvExploreBoss&&!boss.def?.pkmsvvExploreBoss)return false;
  r.badge=true;return true;
 }
 function registerRift(p,arena,boss){
  const r=p&&(runs.get(p)||coopRuns.get(p)),co=!!(r&&coopRuns.get(p)===r);
  if(!r||r.settled||r.profile!==save()||(co?(!r.isHost||!G.Coop?.isHost||!roomMatches(r)):competitive())||G.DB?.guest||p!==G.Game?.player||
     arena!==G.Rift?.arena||arena?.phase!=='fight'||!boss||boss.dead||boss.remote||
     boss.id!==arena.bossId||!dexId(arena.dex)||Number(boss.dex)!==Number(arena.dex)||boss.legend!==true||riftBosses.has(arena))return false;
  riftBosses.set(arena,{run:r,boss});return true;
 }
 function markRiftWin(p,arena){
  const r=p&&(runs.get(p)||coopRuns.get(p)),proof=arena&&riftBosses.get(arena),co=!!(r&&coopRuns.get(p)===r);
  if(!r||r.settled||r.profile!==save()||r.riftType!==null||(co?(!r.isHost||!G.Coop?.isHost||!roomMatches(r)):competitive())||G.DB?.guest||
     p!==G.Game?.player||arena!==G.Rift?.arena||arena?.phase!=='won'||proof?.run!==r||
     !proof.boss.dead||Number(proof.boss.dex)!==Number(arena.dex)||!Number.isFinite(proof.boss.hp)||proof.boss.hp>0||typeof arena.type!=='string')return false;
  r.riftType=arena.type;return true;
 }
 function spriteReady(dex){
  return !!(G.DEX_BY?.[dex]&&G.SPRITE_META?.[dex]?.a?.Idle&&G.SPRITE_META?.[dex]?.a?.Walk);
 }
 function babyEligible(s,dex,inc){
  return isEggOnly(dex)&&spriteReady(dex)&&
   (!s.owned?.[dex]||G.PKMSVVBox?.validBox?.(s)===true)&&
   !Object.values(inc.eggs).some(x=>Number(x.dex)===Number(dex));
 }
 function eligibleDex(s,region,inc){
  const reserved=new Set(Object.values(inc.eggs).map(x=>Number(x.dex)));
  return (G.PKMSVVQuickRegion?.speciesFor?.(region)||[]).filter(id=>{
   const d=dexId(id),mon=G.DEX_BY?.[d];
   if(!d||!spriteReady(d)||G.PKMSVVFossils?.isFossilDex?.(d)||reserved.has(d))return false;
   if(isEggOnly(d))return babyEligible(s,d,inc);
   const policy=eggGachaPolicy(s,d);
   return Number(mon.rarity)>=1&&Number(mon.rarity)<=5&&!s.owned?.[d]&&
    policy!==false&&G.PKMSVVDexDefeats?.unlocked?.(s,d)===true;
  }).sort((a,b)=>a-b);
 }
 function pickBaby(s,pool,random=Math.random){
  const groups=BABY_TIERS.map(t=>({...t,pool:pool.filter(d=>t.dex.includes(d))})).filter(t=>t.pool.length);
  if(!groups.length)return null;
  let roll=random()*groups.reduce((sum,t)=>sum+t.weight,0),group=groups.at(-1);
  for(const t of groups){if(roll<t.weight){group=t;break;}roll-=t.weight;}
  const missing=group.pool.filter(d=>!s.owned?.[d]),choices=missing.length?missing:group.pool;
  return choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];
 }
 function pickReward(s,pool,chance,random=Math.random){
  const baby=pool.filter(isEggOnly),ordinary=pool.filter(d=>!isEggOnly(d));
  if(baby.length&&(!ordinary.length||random()<chance))return pickBaby(s,baby,random);
  return ordinary.length?ordinary[Math.min(ordinary.length-1,Math.floor(random()*ordinary.length))]:null;
 }
 function advanceEggs(i,selected,kills){
  let progress=0;
  for(const id of selected||[]){
   const e=i.eggs[id];if(!e||!activeIds(i).includes(id))continue;
   const before=e.kills;e.kills=Math.min(goalFor(e),before+kills);progress+=e.kills-before;
  }
  return progress;
 }
 function createEgg(i,dex,region,source){
  if(Object.keys(i.eggs).length>=capacity(i)||!Number.isSafeInteger(i.serial+1))return null;
  const id='egg-'+(++i.serial);
  const e={dex,kills:0,region,from:source};
  if(isEggOnly(dex))e.goal=tierFor(dex)?.goal??GOAL;
  // Shiny is rolled ONCE when a special egg is earned, never on hatch/retry.
  if(isEggOnly(dex))e.shiny=!!G.Sprites?.hasShiny?.(dex)&&Math.random()<SHINY_RATE;
  i.eggs[id]=e;return id;
 }
 function redeemPrize(s,i,key){
  const p=i.prizes?.[key],reward=[];
  if(!p)return reward;
  while(p.claimed.length<p.count&&Object.keys(i.eggs).length<capacity(i)){
   const pool=EGG_ONLY.filter(d=>babyEligible(s,d,i));if(!pool.length)break;
   const dex=pickBaby(s,pool),id=createEgg(i,dex,9,'egg-rush-baby');
   if(!id)break;
   i.eggs[id].prize=key;p.claimed.push(id);reward.push(id);
  }
  return reward;
 }
 function claimPrizes(s=save()){
  return atomic(s,d=>{
   const i=copy(incubator(d)),reward=[];
   for(const key of Object.keys(i.prizes||{})){
    reward.push(...redeemPrize(d,i,key));
    if(Object.keys(i.eggs).length>=capacity(i))break;
   }
   if(!reward.length)throw Error(L('Chưa có chỗ trống hoặc chưa có Baby phù hợp.','No free slot or eligible Baby Pokémon.'));
   d.pkmsvvIncubator=i;return {awarded:reward.length,pending:prizeCount(i)};
  });
 }
 function upgradeIncubator(expected,s=save()){
  return atomic(s,d=>{
   const i=copy(incubator(d)),current=levelOf(i),next=INCUBATOR_LEVELS[current],wallet=d.pkmsvvCoopLab;
   if(expected!==current||!next)throw Error(L('Cấp máy đã thay đổi hoặc đạt tối đa.','Incubator level changed or is maxed.'));
   if(!isObj(wallet)||wallet.machineUnlocked!==true||!Number.isSafeInteger(wallet.coopCoins)||wallet.coopCoins<next.cost)
    throw Error(L('Cần mở Xây dựng và đủ Xu Đồng Đội.','Unlock construction and earn enough Co-op Coins.'));
   d.pkmsvvCoopLab={...wallet,coopCoins:wallet.coopCoins-next.cost};
   i.level=next.level;d.pkmsvvIncubator=i;return {level:next.level,capacity:next.capacity,slots:next.slots,remaining:d.pkmsvvCoopLab.coopCoins};
  });
 }
 function markEggEvolution(s,from,to,p){
  const target=dexId(to),source=dexId(from),r=p&&runs.get(p);
  if(!target||eggEvolutionParent(target)!==source||!r||r.settled||r.profile!==s||s!==save()||
     G.DB?.guest||competitive()||p!==G.Game?.player||p.remote||p.lanBot||Number(p.dex)!==target||
     !s.owned?.[r.dex]||(!isEggOnly(r.dex)&&!eggEvolutionParent(r.dex)))return false;
  const hist=p.pkmEvoHistory;if(!Array.isArray(hist)||!hist.length)return false;
  // Require a real uninterrupted chain from the owned starter in this run.
  let previous=r.dex;
  for(const row of hist){
   const next=dexId(row?.to);
   if(Number(row?.from)!==previous||eggEvolutionParent(next)!==previous)return false;
   previous=next;
  }
  if(previous!==target||Number(hist.at(-1)?.from)!==source)return false;
  if(s.pkmsvvEggEvolutions!==undefined&&!isObj(s.pkmsvvEggEvolutions))return false;
  if(s.pkmsvvEggEvolutions?.[target]===true)return false;
  const had=own(s,'pkmsvvEggEvolutions'),before=s.pkmsvvEggEvolutions;
  s.pkmsvvEggEvolutions={...(before||{}),[target]:true};
  try{if(typeof G.DB?.commit!=='function'||G.DB.commit(true)===false)throw Error('Evolution unlock save failed');return true;}
  catch(_){if(had)s.pkmsvvEggEvolutions=before;else delete s.pkmsvvEggEvolutions;return false;}
 }
 // Called only INSIDE the verified native solo-host + 3 bot Berry coin
 // settlement. If the egg cannot be added, don't prevent the ordinary coins.
 // A failed shared DB commit rolls back the egg, too.
 function commitBerryEgg(s,commit){
  if(typeof commit!=='function')throw Error('Missing save commit');
  if(!s||s!==save()||G.DB?.guest||G.Coop?.isHost!==true||!G.PKMSVVBerryRescue?.eggEligible)
   return {committed:commit(),egg:null};
  const had=own(s,'pkmsvvIncubator'),before=s.pkmsvvIncubator;let id=null;
  try{
   const next=copy(incubator(s));
   if(babyEligible(s,446,next))id=createEgg(next,446,3,'berry-boss');
   if(id)s.pkmsvvIncubator=next;
  }catch(err){console.warn('[Berry egg] original kept',err);}
  try{
   const committed=commit();
   if(committed===false&&id){if(had)s.pkmsvvIncubator=before;else delete s.pkmsvvIncubator;}
   return {committed,egg:committed===false?null:id};
  }catch(err){if(id){if(had)s.pkmsvvIncubator=before;else delete s.pkmsvvIncubator;}throw err;}
 }
 function settle(s,p,time,coop){
  if(coop)return settleCoop(s,p,time);
  const r=p&&runs.get(p);
  if(!r||r.settled||r.profile!==s||s!==save()||G.DB?.guest||coop||p.remote||p.lanBot||
    !Number.isFinite(time)||time<MIN_TIME||competitive())return null;
  r.settled=true;
  const kills=n(p.kills,1000000),bosses=n(p.bosses,100);
  // One species per run, credited to the owned starter even if it evolves.
  const points=Math.min(120,Math.floor(Math.min(time,1800)/60)+Math.floor(kills/100)+Math.min(5,bosses)*5);
  let reward=null,riftReward=null,progress=0;
  if(s.pkmsvvMastery===undefined||isObj(s.pkmsvvMastery))
   s.pkmsvvMastery={...(s.pkmsvvMastery||{}),[r.dex]:Math.min(MAX_POINTS,summary(s,r.dex).points+points)};
  try{
   const next=copy(incubator(s));
   progress=advanceEggs(next,r.egg,kills);
   if(r.badge&&time>=900&&Object.keys(next.eggs).length<capacity(next)){
    const pool=eligibleDex(s,r.region,next);
    if(pool.length){
     const dex=pickReward(s,pool,.25);
     reward=createEgg(next,dex,r.region,isEggOnly(dex)?'baby-egg':'region-boss');
    }
   }
   // One additional egg per real Rift victory per run, not per summary
   // packet. Preserve the original region-boss egg as first priority.
   if(r.riftType!==null&&Object.keys(next.eggs).length<capacity(next)){
    const pool=eligibleDex(s,r.region,next),matching=pool.filter(id=>G.DEX_BY?.[id]?.types?.includes(r.riftType));
    const candidates=matching.length?matching:pool;
    if(candidates.length){
     const dex=pickReward(s,candidates,.40);
     riftReward=createEgg(next,dex,r.region,isEggOnly(dex)?'rift-baby':'rift');
    }
   }
   if(reward||riftReward||progress)s.pkmsvvIncubator=next;
  }catch(err){console.warn('[Big Update incubator] unchanged',err);}
  // Original native endRun owns the save commit, so no extra result commit.
  return {dex:r.dex,points,progress,reward,riftReward};
 }
 function menuOnly(){return ['ui','over'].includes(G.Game?.state)&&!competitive();}
 function atomic(s,fn){
  if(!s||s!==save()||G.DB?.guest||!menuOnly()||typeof G.DB?.commit!=='function')throw Error(L('Chỉ thao tác ngoài trận trên hồ sơ chính.','Use your main profile outside a run.'));
  const draft=copy(s),before=copy(s),result=fn(draft);
  if(JSON.stringify(draft).length>(G.PKMSVVBox2?.MAX_SAVE_CHARS||1400000))throw Error('Save too large');
  try{Object.assign(s,draft);if(G.DB.commit(true)===false)throw Error('Save failed');return result;}
  catch(e){for(const k of Object.keys(s))delete s[k];Object.assign(s,before);throw e;}
 }
 // The native mission claim calls this before changing the actual mission.
 // The weekly bonus is one baby egg per eligible weekly claim, never a
 // second payout for a stale mission reference. A full queue does not block
 // the original coins/tickets. Only sprite-ready babies can be offered.
 function claimMission(s,m,weekly,grant){
  if(!s||s!==save()||G.DB?.guest||!menuOnly()||typeof grant!=='function'||!m||
    m.claimed||!Number.isFinite(m.prog)||!Number.isFinite(m.goal)||m.goal<=0||m.prog<m.goal)return null;
  const ids=G.Ranking?.periodIds?.(),list=weekly?s.missions?.weekly:s.missions?.daily;
  if(!Array.isArray(list)||!list.includes(m)||!ids||(weekly?s.missions.week!==ids.w:s.missions.day!==ids.d)||!G.MissionDefs?.BY?.[m.id])return null;
  return G.Shop?.transaction?.('mission-claim',()=>{
   let egg=null;
   if(weekly)try{
    const next=copy(incubator(s));
    const pool=EGG_ONLY.filter(d=>babyEligible(s,d,next));
    if(pool.length&&Object.keys(next.eggs).length<capacity(next)){
     egg=createEgg(next,pickBaby(s,pool),9,'mission-baby');
     if(egg)s.pkmsvvIncubator=next;
    }
   }catch(err){console.warn('[Mission incubator] unchanged',err);}
   grant();if(m.claimed!==true)return false;
   return {ok:true,egg};
  },s)||null;
 }
 function activateEgg(id,s=save()){
  return atomic(s,d=>{
   const i=copy(incubator(d));if(id!==null&&!own(i.eggs,id))throw Error('Unknown egg');
   if(id!==null&&i.eggs[id].kills>=goalFor(i.eggs[id]))throw Error('Egg ready');
   let selected=activeIds(i);
   if(id===null)selected=[];
   else if(selected.includes(id))selected=selected.filter(x=>x!==id);
   else if(slots(i)===1)selected=[id];
   else{
    // A ready egg does not occupy a running slot. Keep its progress intact.
    selected=selected.filter(x=>i.eggs[x].kills<goalFor(i.eggs[x]));
    if(selected.length>=slots(i))throw Error(L('Hãy tạm dừng một trứng đang ấp.','Pause an active egg first.'));
    selected.push(id);
   }
   setActive(i,selected);d.pkmsvvIncubator=i;return id;
  });
 }
 function hatch(id,s=save()){
  return atomic(s,d=>{
   const i=copy(incubator(d)),e=i.eggs[id];
   if(!e||e.kills!==goalFor(e))throw Error(L('Trứng chưa sẵn sàng.','Egg is not ready.'));
   const dex=Number(e.dex),special=isEggOnly(dex)&&(['baby-egg','rift-baby','berry-boss','mission-baby','egg-rush-baby'].includes(e.from));
   const shiny=e.shiny===true;
   // Preserve pre-update queued region eggs even if their species is now gated.
   // New special egg records may legitimately reveal an unseen baby.
   if(!spriteReady(dex)||(!special&&G.PKMSVVDexDefeats?.unlocked?.(d,dex)!==true)||
      G.PKMSVVFossils?.isFossilDex?.(dex)||(shiny&&(!special||!G.Sprites?.hasShiny?.(dex))))
    throw Error('Hatch species unavailable');
   if(!isObj(d.owned))throw Error('Invalid owned collection');
   if(d.shiny!==undefined&&!isObj(d.shiny))throw Error('Invalid shiny collection');
   if(d.pkmsvvBoxSchema!==undefined){
    if(!G.PKMSVVBox?.validBox?.(d)||!G.PKMSVVBox2?.makeOne)throw Error('Invalid PokéBox');
    G.PKMSVVBox2.makeOne(d,{dex,shiny});
    if(!G.PKMSVVBox.validBox(d))throw Error('Invalid hatch copy');
   }else if(d.owned[dex]&&(!shiny||d.shiny?.[dex]))throw Error(L('Pokémon đã có. Hãy sao lưu và chuyển PokéBox để giữ bản sao từ trứng.','Already owned; back up and migrate PokéBox to retain a hatch duplicate.'));
   d.owned[dex]=d.owned[dex]||{at:Date.now(),from:'incubator'};
   if(shiny){d.shiny=d.shiny||{};d.shiny[dex]=d.shiny[dex]||{at:Date.now(),from:'incubator'};}
   delete i.eggs[id];i.hatched[id]=dex;setActive(i,activeIds(i).filter(x=>x!==id));d.pkmsvvIncubator=i;
   return {id,dex,shiny};
  });
 }
 function applyMasteryPortrait(portrait,dex){
  if(!portrait||!save()?.owned?.[dex])return;
  const m=summary(save(),dex);
  portrait.dataset.masteryTier=String(m.tier);
  if(m.gold){portrait.style.borderColor='#e9bf54';}
  if(m.aura)portrait.style.filter='drop-shadow(0 6px 4px #07151ea8) drop-shadow(0 0 8px #e9bf54)';
 }
 function renderMastery(host,dex){
  if(!host||!save()?.owned?.[dex])return;
  const m=summary(save(),dex),el=document.createElement('section');el.className='pkmsvv-mastery-qa';el.dataset.masteryTier=String(m.tier);
  el.style.cssText='margin:9px 0;padding:12px;border:1px solid #a89661;border-radius:9px;background:#1e3445;color:#f8e8ac;overflow-wrap:anywhere';
  const h=document.createElement('h3');h.textContent=L('Tinh thông','Mastery')+' · '+m.title;h.style.cssText='margin:0 0 6px;color:#ffe28b';
  const p=document.createElement('p');p.textContent=m.next===null?m.points+' · MAX':m.points+' / '+m.next;
  const bar=document.createElement('progress');bar.max=m.next??Math.max(1,m.points);bar.value=m.points;bar.style.cssText='width:100%;accent-color:#e9bf54';bar.setAttribute('aria-label',L('Điểm tinh thông','Mastery points'));
  const note=document.createElement('p');note.textContent=L('Tích lũy khi chơi Khám phá hoặc Sống Sót Co-op có kết quả xác nhận. Thường và Shiny dùng chung tiến độ. Không cộng chỉ số.','Earned in Explore or confirmed Survival Co-op. Normal and Shiny share progress. No stat bonus.');
  const rewards=document.createElement('div');rewards.style.cssText='display:grid;gap:5px;margin-top:12px';
  const heading=document.createElement('strong');heading.textContent=L('Mốc tinh thông','Mastery milestones');rewards.append(heading);
  for(let tier=1;tier<LEVELS.length;tier++){
   const row=document.createElement('div');row.dataset.masteryReward=String(tier);row.dataset.unlocked=String(m.tier>=tier);
   row.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px;border-top:1px solid #647c8b;color:'+(m.tier>=tier?'#ffe28b':'#d9e4ed');
   const label=document.createElement('span');label.textContent=(m.tier>=tier?'✓ ':'○ ')+L(...TITLES[tier])+(tier===4?' · '+L('Khung vàng','Gold frame'):tier===5?' · '+L('Hào quang chân dung','Portrait glow'):'');
   const value=document.createElement('strong');value.textContent=String(LEVELS[tier]);row.append(label,value);rewards.append(row);
  }
  el.append(h,p,bar,note,rewards);host.append(el);
 }
 function renderIncubator(frame,fromLab){
  if(!frame)return;
  frame.querySelector('[data-recruit-egg-panel]')?.remove();
  if(!fromLab)return;
  const panel=document.createElement('section');panel.dataset.recruitEggPanel='1';panel.style.cssText='padding:14px;margin:10px 0;border:1px solid #a89661;border-radius:9px;background:#213949;color:#fff2cf;overflow-wrap:anywhere';
  const heading=document.createElement('strong');heading.textContent=L('Trứng thu phục · Máy ấp','Recruitment eggs · Incubator');panel.append(heading);
  const info=document.createElement('p');info.textContent=L('Boss vùng, Rift, nhiệm vụ tuần, Giải cứu Berry và Tranh Trứng cho trứng thu phục. Hạ quái trong Khám phá hoặc Sống Sót Co-op để ấp; các ô đang ấp cùng tiến độ. Nâng máy tại Xây dựng.','Earn recruitment eggs from region bosses, Rift, weekly missions, Berry Rescue and Egg Rush. Defeat enemies in Explore or Survival Co-op; selected slots progress in parallel. Upgrade in Build Mode.');panel.append(info);
  const say=msg=>G.UI?.toast?.(msg,3000);
  try{
   const i=incubator(save()),entries=Object.entries(i.eggs),selected=activeIds(i),pending=prizeCount(i);
   const status=document.createElement('p');status.dataset.incubatorStatus='1';status.textContent=L('Cấp ','Level ')+levelOf(i)+' · '+L('Kho ','Storage ')+entries.length+'/'+capacity(i)+' · '+L('Đang ấp ','Incubating ')+selected.filter(id=>i.eggs[id].kills<goalFor(i.eggs[id])).length+'/'+slots(i);panel.append(status);
   if(pending){
    const reward=document.createElement('button');reward.type='button';reward.className='btn small';reward.dataset.recruitPrizes='1';
    reward.textContent=L('Nhận trứng thưởng đang chờ: ','Claim pending prize eggs: ')+pending;
    reward.disabled=!!G.DB?.guest||!menuOnly()||entries.length>=capacity(i);
    reward.onclick=()=>{if(!reward.isConnected)return;try{const r=claimPrizes();say(L('Đã nhận ','Received ')+r.awarded+' '+L('trứng','eggs'));renderIncubator(frame,true);}catch(err){say(String(err.message||err));}};
    panel.append(reward);
   }
   if(!entries.length){const p=document.createElement('small');p.textContent=L('Chưa có trứng thu phục.','No recruitment eggs yet.');panel.append(p);}
   for(const [id,e] of entries){
    const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap;border-top:1px solid #647c8b;padding:8px 0';
    const info=document.createElement('div');info.style.cssText='flex:1 1 150px;min-width:0';
    const goal=goalFor(e),ready=e.kills===goal,tier=e.goal!==undefined?tierFor(e.dex):null,active=selected.includes(id);
    const art=document.createElement('img');art.src='assets/eggs/'+(ready?'egg_crack.svg':'egg_follow.svg');art.alt='';art.width=32;art.height=36;art.style.cssText='image-rendering:pixelated;object-fit:contain;padding:4px;border-radius:6px;border:1px solid '+(tier?.color||'#a89661');row.append(art);
    const label=document.createElement('strong');label.textContent=(tier?L('Trứng Baby ','Baby egg ')+L(...tier.name):L('Trứng bí ẩn','Mystery egg'))+' · '+e.kills+'/'+goal;
    if(tier)label.style.color=tier.color;
    const state=document.createElement('small');state.style.cssText='display:block;color:#f8e8ac';state.textContent=ready?L('Sẵn sàng nở','Ready to hatch'):active?L('Đang ấp','Incubating'):L('Chờ ấp','Waiting');
    const bar=document.createElement('progress');bar.max=goal;bar.value=e.kills;bar.style.cssText='width:100%;accent-color:#e9bf54';bar.setAttribute('aria-label',L('Tiến độ ấp trứng','Egg progress'));
    info.append(label,state,bar);row.append(info);
    const btn=document.createElement('button');btn.className='btn small';btn.type='button';btn.dataset.recruitEgg=id;
    btn.textContent=ready?L('Nở trứng','Hatch'):active?L('Tạm dừng','Pause'):L('Chọn ấp','Incubate');
    btn.disabled=!!G.DB?.guest||!menuOnly();
    btn.onclick=()=>{if(!btn.isConnected)return;try{if(ready){const r=hatch(id);say(L('Đã nhận ','Received ')+(r.shiny?'✨ Shiny ':'')+(G.DEX_BY?.[r.dex]?.name||r.dex));}else activateEgg(id);renderIncubator(frame,true);}catch(err){say(String(err.message||err));}};
    row.append(btn);panel.append(row);
   }
   const count=document.createElement('small');count.textContent=entries.length+'/'+capacity(i)+' · '+L('Đã nở: ','Hatched: ')+Object.keys(i.hatched).length;panel.append(count);
  }catch(err){const note=document.createElement('small');note.textContent=L('Dữ liệu máy ấp không hợp lệ; không ghi đè save.','Invalid incubator data; save preserved.');panel.append(note);}
  frame.append(panel);
 }
 function renderIncubatorUpgrade(frame,refresh){
  if(!frame)return;
  try{
   const s=save(),i=incubator(s),current=levelOf(i),next=INCUBATOR_LEVELS[current],wallet=s.pkmsvvCoopLab;
   const row=document.createElement('div');row.className='pkmsvv-build-item';row.dataset.incubatorUpgrade='1';
   const label=document.createElement('strong');label.textContent=L('Máy ấp trứng · Cấp ','Incubator · Level ')+current+'/5';
   const desc=document.createElement('small');desc.textContent=capacity(i)+' '+L('chỗ chứa','storage')+' · '+slots(i)+' '+L('ô ấp','active slots')+(next?' → '+next.capacity+' / '+next.slots:'');
   const btn=document.createElement('button');btn.type='button';btn.className='pkmsvv-pc-close';btn.dataset.incubatorLevel=String(current);
   btn.disabled=!next||!menuOnly()||!!G.DB?.guest||wallet?.machineUnlocked!==true||!Number.isSafeInteger(wallet.coopCoins)||wallet.coopCoins<next.cost;
   btn.textContent=next?L('Nâng · ','Upgrade · ')+next.cost+' '+L('Xu Đồng Đội','Co-op Coins'):'MAX';
   btn.onclick=()=>{if(!btn.isConnected||btn.disabled||s!==save())return;btn.disabled=true;try{upgradeIncubator(current,s);G.UI?.refreshCoins?.();G.UI?.toast?.(L('Đã nâng máy ấp!','Incubator upgraded!'),2200);}catch(err){G.UI?.toast?.(String(err.message||err),3000);}refresh?.();};
   row.append(label,desc,btn);frame.append(row);
  }catch(err){console.warn('[Incubator upgrade] preserved',err);}
 }
 G.PKMSVVBigUpdateQA=Object.freeze({LEVELS,GOAL,CAP,EGG_ONLY,SHINY_RATE,INCUBATOR_LEVELS,BABY_TIERS,goalFor,capacity,slots,activeIds,prizeCount,pickBaby,pickReward,claimPrizes,upgradeIncubator,renderIncubatorUpgrade,isEggOnly,eggEvolutionParent,eggDiscovered,eggGachaPolicy,eggHint,markEggEvolution,commitBerryEgg,registerRift,markRiftWin,summary,incubator,begin,beginCoop,observeCoopHost,coopFrameTag,observeCoopFrame,finalizeCoopHost,acceptCoopTerminal,claimMission,markBadge,settle,activateEgg,hatch,applyMasteryPortrait,renderMastery,renderIncubator});
})(typeof globalThis==='object'?globalThis:this);
