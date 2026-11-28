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
   L('Chỉ nhận qua ấp trứng thu phục: boss vùng, Rift hoặc nhiệm vụ tuần. Không có trong Chiêu mộ.','Hatch recruitment eggs from region bosses, Rift or weekly missions. Not available in Recruitment.');
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
   Object.keys(raw.eggs).length>CAP)throw Error('Invalid incubator save; keep original');
  for(const [id,e] of Object.entries(raw.eggs)){
   if(!/^egg-[1-9][0-9]*$/.test(id)||!dexId(e?.dex)||!Number.isInteger(e.kills)||e.kills<0||e.kills>GOAL||own(raw.hatched,id)||
      (e.shiny!==undefined&&typeof e.shiny!=='boolean')||(['baby-egg','rift-baby','mission-baby'].includes(e.from)&&!isEggOnly(e.dex))||
      (e.from==='berry-boss'&&Number(e.dex)!==446))throw Error('Invalid egg record');
  }
  if(raw.active!==null&&!own(raw.eggs,raw.active))throw Error('Invalid active egg');
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
 function roomId(v){return typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);}
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
    room.mode==='coop'&&room.open===false&&room.matchSerial===r.serial&&party(room.members)===r.roster&&
    G.Social?.uid===r.uid&&G.Net?.uid===r.uid);
 }
 function beginCoop(s,p,cfg,uid,host){
  if(!s||s!==save()||G.DB?.guest||!p||p.remote||p.lanBot||coopRuns.has(p))return false;
  const room=G.Social?.room,dex=dexId(p.dex),roster=party(cfg?.members);
  if(cfg?.mode!=='coop'||room?.mode!=='coop'||room.open!==false||!roomId(room.id)||
     !Number.isSafeInteger(room.matchSerial)||room.matchSerial<1||!Number.isSafeInteger(cfg.seed)||cfg.seed<0||
     cfg.host!==room.host||typeof uid!=='string'||uid!==G.Net?.uid||uid!==G.Social?.uid||
     host!==(uid===room.host)||!roster||roster!==party(room.members)||
     !cfg.members.some(m=>m.uid===uid&&!m.bot)||!cfg.members.some(m=>m.uid===cfg.host&&!m.bot)||!dex||!s.owned?.[dex])return false;
  let egg=null;
  try{if((receipts(s)[room.id]?.serial||0)>=room.matchSerial)return false;egg=incubator(s).active;}catch(_){return false;}
  coopRuns.set(p,{profile:s,dex,egg,room:room.id,serial:room.matchSerial,seed:cfg.seed,uid,host:cfg.host,
   isHost:host,roster,started:wall(),t:0,kills:0,bosses:0,frames:0,riftType:null,terminal:false,settled:false,invalid:false});
  return true;
 }
 function validType(v){return v===null||typeof v==='string'&&/^[a-z]{3,12}$/.test(v)&&(!G.U?.TYPE_NAME||own(G.U.TYPE_NAME,v));}
 function tag(r){return {room:r.room,serial:r.serial,seed:r.seed,host:r.host,rift:r.riftType};}
 function matchingTag(r,v){return !!(v&&v.room===r.room&&v.serial===r.serial&&v.seed===r.seed&&v.host===r.host&&validType(v.rift));}
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
 function finalizeCoopHost(p,data){
  const r=coopRuns.get(p);
  if(!r?.isHost||!G.Coop?.isHost||p!==G.Game?.player||!data||r.frames<2||
     !observeCoop(r,data.t,data.ki,data.bo,r.riftType))return data;
  if(r.t<MIN_TIME)return data;
  r.terminal=true;
  return {...data,pkmsvvProgressRun:tag(r)};
 }
 function acceptCoopTerminal(p,data,from){
  const r=coopRuns.get(p);
  if(!r||r.isHost||from!==r.host||p!==G.Game?.player||r.frames<2||
     !matchingTag(r,data?.pkmsvvProgressRun)||
     !observeCoop(r,data.t,data.ki,data.bo,data.pkmsvvProgressRun.rift)||r.t<MIN_TIME)return false;
  r.terminal=true;return true;
 }
 function settleCoop(s,p,time){
  const r=coopRuns.get(p);
  if(!r||r.invalid||!r.terminal||r.settled||r.profile!==s||s!==save()||G.DB?.guest||p.remote||p.lanBot||
     !Number.isFinite(time)||time<MIN_TIME||Math.abs(time-r.t)>1.5)return null;
  r.settled=true;
  let journal;
  try{journal=receipts(s);if((journal[r.room]?.serial||0)>=r.serial)return null;}catch(_){return null;}
  const points=Math.min(120,Math.floor(Math.min(r.t,1800)/60)+Math.floor(r.kills/100)+Math.min(5,r.bosses)*5);
  if(s.pkmsvvMastery!==undefined&&!isObj(s.pkmsvvMastery))return null;
  s.pkmsvvMastery={...(s.pkmsvvMastery||{}),[r.dex]:Math.min(MAX_POINTS,summary(s,r.dex).points+points)};
  let progress=0,riftReward=null;
  try{
   const next=copy(incubator(s));
   if(r.egg&&next.active===r.egg&&next.eggs[r.egg]){
    const e=next.eggs[r.egg],before=e.kills;e.kills=Math.min(GOAL,before+r.kills);progress=e.kills-before;
   }
   if(r.riftType!==null&&Object.keys(next.eggs).length<CAP){
    const pool=eligibleDex(s,9,next),matching=pool.filter(id=>G.DEX_BY?.[id]?.types?.includes(r.riftType));
    const candidates=matching.length?matching:pool;
    if(candidates.length){
     const dex=candidates[Math.floor(Math.random()*candidates.length)];
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
  let egg=null;try{egg=incubator(s).active;}catch(_){}
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
     boss.id!==arena.bossId||boss.legend!==true||riftBosses.has(arena))return false;
  riftBosses.set(arena,{run:r,boss});return true;
 }
 function markRiftWin(p,arena){
  const r=p&&(runs.get(p)||coopRuns.get(p)),proof=arena&&riftBosses.get(arena),co=!!(r&&coopRuns.get(p)===r);
  if(!r||r.settled||r.profile!==save()||r.riftType!==null||(co?(!r.isHost||!G.Coop?.isHost||!roomMatches(r)):competitive())||G.DB?.guest||
     p!==G.Game?.player||arena!==G.Rift?.arena||arena?.phase!=='won'||proof?.run!==r||
     !proof.boss.dead||!Number.isFinite(proof.boss.hp)||proof.boss.hp>0||typeof arena.type!=='string')return false;
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
 function createEgg(i,dex,region,source){
  if(Object.keys(i.eggs).length>=CAP||!Number.isSafeInteger(i.serial+1))return null;
  const id='egg-'+(++i.serial);
  const e={dex,kills:0,region,from:source};
  // Shiny is rolled ONCE when a special egg is earned, never on hatch/retry.
  if(isEggOnly(dex))e.shiny=!!G.Sprites?.hasShiny?.(dex)&&Math.random()<SHINY_RATE;
  i.eggs[id]=e;return id;
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
   if(r.egg&&next.active===r.egg&&next.eggs[r.egg]){
    const e=next.eggs[r.egg],before=e.kills;
    e.kills=Math.min(GOAL,before+kills);progress=e.kills-before;
   }
   if(r.badge&&time>=900&&Object.keys(next.eggs).length<CAP){
    const pool=eligibleDex(s,r.region,next);
    if(pool.length){
     const dex=pool[Math.floor(Math.random()*pool.length)];
     reward=createEgg(next,dex,r.region,isEggOnly(dex)?'baby-egg':'region-boss');
    }
   }
   // One additional egg per real Rift victory per run, not per summary
   // packet. Preserve the original region-boss egg as first priority.
   if(r.riftType!==null&&Object.keys(next.eggs).length<CAP){
    const pool=eligibleDex(s,r.region,next),matching=pool.filter(id=>G.DEX_BY?.[id]?.types?.includes(r.riftType));
    const candidates=matching.length?matching:pool;
    if(candidates.length){
     const dex=candidates[Math.floor(Math.random()*candidates.length)];
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
    if(pool.length&&Object.keys(next.eggs).length<CAP){
     egg=createEgg(next,pool[Math.floor(Math.random()*pool.length)],9,'mission-baby');
     if(egg)s.pkmsvvIncubator=next;
    }
   }catch(err){console.warn('[Mission incubator] unchanged',err);}
   grant();if(m.claimed!==true)return false;
   return {ok:true,egg};
  },s)||null;
 }
 function activateEgg(id,s=save()){
  return atomic(s,d=>{const i=copy(incubator(d));if(id!==null&&!own(i.eggs,id))throw Error('Unknown egg');
   if(id!==null&&i.eggs[id].kills>=GOAL)throw Error('Egg ready');i.active=id;d.pkmsvvIncubator=i;return id;});
 }
 function hatch(id,s=save()){
  return atomic(s,d=>{
   const i=copy(incubator(d)),e=i.eggs[id];
   if(!e||e.kills!==GOAL)throw Error(L('Trứng chưa sẵn sàng.','Egg is not ready.'));
   const dex=Number(e.dex),special=isEggOnly(dex)&&(['baby-egg','rift-baby','berry-boss','mission-baby'].includes(e.from));
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
   delete i.eggs[id];i.hatched[id]=dex;if(i.active===id)i.active=null;d.pkmsvvIncubator=i;
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
  const info=document.createElement('p');info.textContent=L('Hạ boss vùng 15 phút, thắng Rift trong Khám phá hoặc Sống Sót Co-op, hay nhận thưởng nhiệm vụ tuần để tìm trứng thu phục. Nhiệm vụ tuần chỉ tặng trứng nếu còn chỗ và Baby Pokémon phù hợp. Trứng Munchlax cũng có thể nhận khi hạ Munchlax và thắng Giải cứu Berry Thường đủ điều kiện. Chọn một trứng, hạ 500 quái trong Khám phá hoặc Sống Sót Co-op để ấp. Khác trứng hỗ trợ trong trận.','Defeat a region badge boss, win a Rift in Explore or Survival Co-op, or claim weekly missions for recruitment eggs. Weekly bonus requires a free slot and eligible Baby Pokémon. A qualifying Normal Berry Rescue win with Munchlax defeated can also award its egg. Select one and defeat 500 enemies in Explore or Survival Co-op to hatch. Separate from run support eggs.');panel.append(info);
  const say=msg=>G.UI?.toast?.(msg,3000);
  try{
   const i=incubator(save()),entries=Object.entries(i.eggs);
   if(!entries.length){const p=document.createElement('small');p.textContent=L('Chưa có trứng thu phục.','No recruitment eggs yet.');panel.append(p);}
   for(const [id,e] of entries){
    const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap;border-top:1px solid #647c8b;padding:8px 0';
    const info=document.createElement('div');info.style.cssText='flex:1 1 150px;min-width:0';
    const label=document.createElement('strong');label.textContent=L('Trứng bí ẩn','Mystery egg')+' · '+e.kills+'/'+GOAL;
    const state=document.createElement('small');state.style.cssText='display:block;color:#f8e8ac';state.textContent=e.kills===GOAL?L('Sẵn sàng nở','Ready to hatch'):i.active===id?L('Đang ấp','Incubating'):L('Chờ ấp','Waiting');
    const bar=document.createElement('progress');bar.max=GOAL;bar.value=e.kills;bar.style.cssText='width:100%;accent-color:#e9bf54';bar.setAttribute('aria-label',L('Tiến độ ấp trứng','Egg progress'));
    info.append(label,state,bar);row.append(info);
    const btn=document.createElement('button');btn.className='btn small';btn.type='button';btn.dataset.recruitEgg=id;
    btn.textContent=e.kills===GOAL?L('Nở trứng','Hatch'):i.active===id?L('Đang ấp','Incubating'):L('Chọn ấp','Incubate');
    btn.disabled=!!G.DB?.guest||!menuOnly()||(i.active===id&&e.kills<GOAL);
    btn.onclick=()=>{try{if(e.kills===GOAL){const r=hatch(id);say(L('Đã nhận ','Received ')+(r.shiny?'✨ Shiny ':'')+(G.DEX_BY?.[r.dex]?.name||r.dex));}else activateEgg(id);renderIncubator(frame,true);}catch(err){say(String(err.message||err));}};
    row.append(btn);panel.append(row);
   }
   const count=document.createElement('small');count.textContent=entries.length+'/'+CAP+' · '+L('Đã nở: ','Hatched: ')+Object.keys(i.hatched).length;panel.append(count);
  }catch(err){const note=document.createElement('small');note.textContent=L('Dữ liệu máy ấp không hợp lệ; không ghi đè save.','Invalid incubator data; save preserved.');panel.append(note);}
  frame.append(panel);
 }
 G.PKMSVVBigUpdateQA=Object.freeze({LEVELS,GOAL,CAP,EGG_ONLY,SHINY_RATE,isEggOnly,eggEvolutionParent,eggDiscovered,eggGachaPolicy,eggHint,markEggEvolution,commitBerryEgg,registerRift,markRiftWin,summary,incubator,begin,beginCoop,observeCoopHost,coopFrameTag,observeCoopFrame,finalizeCoopHost,acceptCoopTerminal,claimMission,markBadge,settle,activateEgg,hatch,applyMasteryPortrait,renderMastery,renderIncubator});
})(typeof globalThis==='object'?globalThis:this);
