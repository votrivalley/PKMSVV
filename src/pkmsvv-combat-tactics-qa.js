/* QA tactical steering and real movement-status feedback. No persisted state. */
(function(){
 'use strict';
 if(typeof G==='undefined')return;
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const sq=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
 const finite=p=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 const alliedMode=mode=>['coop','berry','berryeasy','fossil_lab'].includes(mode)&&!!G.Coop?.isHost;
 const alive=p=>finite(p)&&!p.dead;
 function assignRescuers(players,bots,previous=new Map()){
  const down=players.filter(p=>finite(p)&&p.dead),living=bots.filter(alive),out=new Map(),claimed=new Set();
  // If a real trainer is already providing a revive, leave that player alone.
  const human=players.filter(p=>alive(p)&&!p.lanBot);
  const covered=p=>human.some(h=>sq(h,p)<44**2);
  const available=(b,p)=>alive(b)&&down.includes(p)&&!covered(p)&&sq(b,p)<=420**2&&!claimed.has(p);
  // Keep the current assigned rescuer whenever still viable.
  for(const b of living){const p=previous.get(b.uid)?.rescue;if(available(b,p)){out.set(b,p);claimed.add(p);}}
  const pairs=[];
  for(const b of living)if(!out.has(b))for(const p of down)if(available(b,p)){
   const rest=Number(b.__pkmsvv3dsSupport?.rest)||0,hp=(b.hp||0)/Math.max(1,b.maxHp||1);
   pairs.push({b,p,cost:sq(b,p)+(hp<.25?120**2:0)+(rest>0?150**2:0)});
  }
  pairs.sort((a,b)=>a.cost-b.cost||String(a.b.uid).localeCompare(String(b.b.uid)));
  for(const {b,p} of pairs)if(!out.has(b)&&!claimed.has(p)){out.set(b,p);claimed.add(p);}
  return out;
 }
 function directPath(pl,goal,segment,liquidCost){
  if(!alliedMode(G.Social?.room?.mode)||!finite(pl)||!finite(goal)||sq(pl,goal)>520**2)return false;
  if(!segment(pl,pl,goal))return false;
  const steps=Math.max(1,Math.ceil(Math.sqrt(sq(pl,goal))/12));
  for(let i=0;i<=steps;i++)if(liquidCost(pl,pl.x+(goal.x-pl.x)*i/steps,pl.y+(goal.y-pl.y)*i/steps)>0)return false;
  return true;
 }
 function margin(h,x,y,r){
  if(!finite(h))return Infinity;
  const pad=Math.max(0,r)*.6;
  if(h.kind==='zone')return Math.hypot(x-h.x,y-h.y)-(Number(h.r)||0)-pad;
  if(h.kind!=='beam'||![h.angle,h.len,h.w].every(Number.isFinite))return Infinity;
  const dx=x-h.x,dy=y-h.y,ca=Math.cos(h.angle),sa=Math.sin(h.angle),along=dx*ca+dy*sa,side=Math.abs(-dx*sa+dy*ca);
  return Math.max(-r-along,along-h.len-r,side-h.w/2-pad);
 }
 const left=h=>Number.isFinite(h.delay)&&Number.isFinite(h.t)?h.delay-h.t:Infinity;
 const speed=p=>Math.max(0,Math.min(500,Number(p.spd)||0));
 function relevant(pl,hazards){
  const r=(pl.r||10)+10,sp=speed(pl);
  return hazards.filter(h=>h&&!h.hit&&left(h)>=0&&left(h)<=1.45&&margin(h,pl.x,pl.y,r)<=sp*Math.min(left(h),.8)+45)
    .sort((a,b)=>left(a)-left(b)).slice(0,12);
 }
 function needsEvade(pl,axis,hazards){
  if(!alive(pl))return false;
  const r=(pl.r||10)+10,v=speed(pl),a=axis||[0,0];
  return relevant(pl,hazards).some(h=>{
   const t=Math.min(.65,left(h));
   return margin(h,pl.x,pl.y,r)<8||margin(h,pl.x+(a[0]||0)*v*t,pl.y+(a[1]||0)*v*t,r)<8;
  });
 }
 function evade(pl,axis,goal,hazards,segment,liquidCost){
  if(!needsEvade(pl,axis,hazards))return null;
  const threats=relevant(pl,hazards),r=(pl.r||10)+10,v=speed(pl);
  if(v<=0||pl.__pkmsvv3dsSupport?.rest>0||pl.frozen)return [0,0];
  const angle=finite(goal)?Math.atan2(goal.y-pl.y,goal.x-pl.x):Math.atan2(axis?.[1]||0,axis?.[0]||1);
  const wet=liquidCost(pl,pl.x,pl.y)>0;
  let best=[0,0],bestScore=-Infinity;
  for(let i=-1;i<16;i++){
   const a=angle+i*Math.PI/8,d=i<0?[0,0]:[Math.cos(a),Math.sin(a)];
   // Check only a short legal segment, not a fictional teleport to safety.
   const travel=Math.min(v*.45,90),end={x:pl.x+d[0]*travel,y:pl.y+d[1]*travel};
   if(!segment(pl,pl,end))continue;
   if(!wet&&[.25,.5,.75,1].some(k=>liquidCost(pl,pl.x+d[0]*travel*k,pl.y+d[1]*travel*k)>0))continue;
   let worst=Infinity,sum=0;
   for(const h of threats){
    const t=Math.min(left(h),.7),distance=v*t,point={x:pl.x+d[0]*distance,y:pl.y+d[1]*distance};
    // If the full predicted path hits a wall, score only reachable progress.
    const pos=segment(pl,pl,point)?point:end;
    const m=margin(h,pos.x,pos.y,r);worst=Math.min(worst,m);sum+=Math.max(-300,Math.min(80,m));
   }
   // Prefer surviving every telegraph over chasing the original goal.
   const progress=finite(goal)?Math.sqrt(sq(pl,goal))-Math.sqrt(sq(end,goal)):0;
   const score=Math.min(80,worst)*8+sum+progress*.12-(wet?liquidCost(pl,end.x,end.y)*12:0);
   if(score>bestScore){bestScore=score;best=d;}
  }
  return best;
 }
 function rangedGoal(pl,target,range,fallback){
  if(!alive(pl)||!alive(target))return fallback;
  const d=Math.sqrt(sq(pl,target));
  if(d<range*.85||d>range*1.15||!pl.moves?.some(m=>['projectile','beam','homing','chain','turret','meteor','boomerang','bounce','wave'].includes(m.kind)))return fallback;
  // Maintain spacing, use slight lateral movement instead of constant retreat.
  const sign=String(pl.uid||'').charCodeAt(String(pl.uid||'').length-1)%2?1:-1;
  const a=Math.atan2(pl.y-target.y,pl.x-target.x)+sign*.28;
  const p={x:target.x+Math.cos(a)*range,y:target.y+Math.sin(a)*range};
  return G.World?.isFree?.(p.x,p.y,(pl.r||10)+2,true)?p:fallback;
 }
 function berryGoal(pl,enemies,slot){
  const api=G.PKMSVVBerryRescue;if(!api?.active||!alive(pl))return null;
  const live=(api.trees||[]).filter(t=>finite(t)&&t.hp>0).sort((a,b)=>a.hp/Math.max(1,a.maxHp)-b.hp/Math.max(1,b.maxHp)||a.id-b.id);
  if(!live.length)return null;
  const c={x:live.reduce((n,t)=>n+t.x,0)/live.length,y:live.reduce((n,t)=>n+t.y,0)/live.length};
  if(sq(pl,c)>(api.DEFENSE_RADIUS||170)**2)return c;
  const tree=live[Math.max(0,slot|0)%live.length];
  let target=null,score=Infinity;
  for(const e of enemies)if(alive(e)&&sq(e,tree)<135**2){
   const v=sq(e,tree)+(e.boss?-3000:0);if(v<score){target=e;score=v;}
  }
  const ref=target||c;let dx=ref.x-tree.x,dy=ref.y-tree.y,d=Math.hypot(dx,dy);
  if(d<.01){dx=pl.x-tree.x;dy=pl.y-tree.y;d=Math.hypot(dx,dy);}
  if(d<.01){dx=1;dy=0;d=1;}
  const point={x:tree.x+dx/d*76,y:tree.y+dy/d*76};
  return finite(point)&&G.World?.isFree?.(point.x,point.y,(pl.r||10)+2,true)?point:null;
 }
 function rangedFootwork(e,p,spd,range,dist){
  if(!G.PKMSVVCombatBalanceQA?.enabled()||!alive(e)||!alive(p)||e.boss||e.remote||e.friendly||
     !e.pkmsvvPressureElite||!Number.isFinite(spd)||spd<=0||dist<range*.72||dist>range*.97||
     e.stunT>0||e.sleepT>0||e.jump)return null;
  const a=Math.atan2(p.y-e.y,p.x-e.x),sign=Number(e.id)%2?1:-1;
  // Native ranged attacks still use real player direction and original timer.
  for(const side of [sign,-sign]){
   const v=a+side*Math.PI/2,dx=Math.cos(v)*spd*.32,dy=Math.sin(v)*spd*.32;
   if(G.World?.isFree?.(e.x+dx*.3,e.y+dy*.3,(e.r||10)+1,true))return [dx,dy];
  }
  return null;
 }
 // Read the actual offline duel build once at spawn, not account level or
 // theoretical unlocked capacity. Nominal pressure is a bounded tuning proxy,
 // not measured DPS: collision, type matchup, aim and uptime still matter.
 const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
 const positive=(n,fallback)=>Number.isFinite(n)&&n>0?n:fallback;
 const CLOSE=new Set(['melee','spin','orbit','aura','dash','blitz','leap','boom','scissor']);
 const RANGED=new Set(['projectile','beam','homing','chain','turret','meteor','boomerang','bounce','wave','cone','charge','quake','vortex','shove','stun','nova']);
 function arenaProfile(p){
  const hp=positive(p?.maxHp,320),atk=positive(p?.baseAtk,1.3)*positive(p?.atkMul,1),
   spd=positive(p?.baseSpd,112)*positive(p?.spdMul,1);
  let pressure=0,close=0,ranged=0,control=0,support=0,attacks=0;
  const moves=[],seen=new Set();
  for(const m of Array.isArray(p?.moves)?p.moves:[]){
   if(!m||seen.has(m))continue;seen.add(m);
   if(moves.length>=16)break;
   let cd=positive(m.cd,2)*positive(p.cdMul,1);
   try{cd=positive(G.PKMSVVBalance?.effectiveCooldown?.(p,m),cd);}catch(_){}
   cd=clamp(cd,.12,60);
   let fit=atk;
   try{fit=positive(p.atkFor?.(m),atk);}catch(_){}
   const dmg=clamp(Number.isFinite(m.dmg)?m.dmg:0,0,1000000);
   // Multiple projectiles/fields are not guaranteed to hit a single rival.
   // Count is deliberately capped; do not multiply by the whole spread.
   const weight=CLOSE.has(m.kind)?.46:RANGED.has(m.kind)?.55:.35;
   const count=clamp(positive(m.count,1),1,3);
   const contribution=Math.min(100000,dmg*fit/cd*weight*(1+(count-1)*.22));
   moves.push({id:String(m.id||''),kind:m.kind,lvl:positive(m.lvl,1),cd,damage:dmg,pressure:contribution});
   if(dmg>0){
    attacks++;pressure+=contribution;
    if(CLOSE.has(m.kind))close+=contribution;
    else if(RANGED.has(m.kind))ranged+=contribution;
   }else support++;
   if(m.stun>0||m.slow>0||m.sleep>0||m.kind==='stun'||m.kind==='vortex')control++;
  }
  const reduction=clamp(Number.isFinite(p?.reduction)?p.reduction:Number(p?.dmgReduce)||0,0,.8);
  let taken=1;
  try{taken=(positive(G.Stats?.taken?.(p.mon,'physical'),1)+positive(G.Stats?.taken?.(p.mon,'special'),1))/2;}catch(_){}
  const melee=!!p?.activeGroup?.()?.some?.(m=>m.kind==='melee');
  const mitigation=clamp(taken*(1-reduction)*(melee?.75:1),.12,2);
  const regen=clamp(Number(p?.regen)||Number(p?.regenFlat)||0,0,hp);
  const style=close>Math.max(1,pressure)*.55?'keep-range':ranged>Math.max(1,pressure)*.64?'press':'mixed';
  return {hp,atk,spd,pressure,attacks,support,control,mitigation,regen,style,moves};
 }
 function arenaStats(p,ratios,opts={}){
  const profile=arenaProfile(p),r=clamp(Math.floor(Number(opts.round)||0),0,4),champ=opts.mode==='champion';
  const ratio=k=>clamp(positive(ratios?.[k],1),.9,1.25);
  const seconds=champ?[14,16,18,21,18][r]:14;
  // Health targets ~14–21 seconds of weighted attack potential, with an
  // explicit upper limit; no per-hit rescaling or resistance to type counters.
  const hp=Math.round(Math.max(profile.hp*ratio('hp'),Math.min(profile.hp*(champ?42:32),profile.pressure*seconds*ratio('hp'))));
  const hitFraction=champ?[.052,.06,.067,.073,.067][r]:.06;
  const rawBase=Math.max(11*profile.atk/1.3,profile.hp*hitFraction/profile.mitigation+Math.min(profile.hp*.04,profile.regen*1.2));
  // Existing final Mega doubles damage, so phase 1 has a stricter cap.
  const ceiling=profile.hp*(champ&&r===3?.13:.20);
  const dmg=Math.round(Math.max(1,Math.min(ceiling,rawBase*ratio('dmg')))*100)/100;
  const spd=Math.round(clamp(profile.spd*ratio('spd'),35,420));
  const tempo=clamp(1-profile.attacks*.022-profile.support*.012-Math.min(.10,profile.pressure/Math.max(1,profile.hp)*.22)-(champ?r*.025:0),.68,1);
  return {hp,dmg,spd,shotDmg:dmg,shotCd:Math.max(.9,2.5*tempo),profile:{...profile,tempo,mode:opts.mode||'solo',round:r,hp,dmg,spd}};
 }
 // Solo may select a different Ready species after farming. Carry genuine
 // run bonuses relative to the old base species, not the old species stats.
 function arenaPreserveFighter(p,oldMon,oldDex){
  if(oldDex!==p.dex&&oldMon&&p.mon){
   p.maxHp=Math.max(1,positive(p.mon.hp,positive(p.maxHp,320))+Math.max(0,positive(p.maxHp,320)-positive(oldMon.hp,positive(p.maxHp,320))));
   p.baseAtk=positive(p.mon.atk,positive(p.baseAtk,1.3))*positive(p.baseAtk,1.3)/positive(oldMon.atk,positive(p.baseAtk,1.3));
   p.baseSpd=positive(p.mon.spd,positive(p.baseSpd,112))*positive(p.baseSpd,112)/positive(oldMon.spd,positive(p.baseSpd,112));
  }
  p.hp=p.maxHp;p.invuln=2;
 }
 const arenaPlans=new WeakMap();
 function arenaPlan(e,p,dt){
  const build=e.pkmsvvArenaBuild,ai=e.ai;
  if(!build||!arenaDuel(e,p)||!ai||ai.cast||e.jump||e.stunT>0||e.sleepT>0)return;
  let left=(arenaPlans.get(e)||0)-Math.max(0,Number(dt)||0);
  if(left>0){arenaPlans.set(e,left);return;}
  arenaPlans.set(e,2.8);
  if(build.style==='keep-range'){
   ai.farLike=.75;ai.mode='far';ai.modeT=Math.max(ai.modeT||0,3);
  }else if(build.style==='press'){
   ai.farLike=.2;ai.mode='close';ai.modeT=Math.max(ai.modeT||0,3);
  }
 }
 function arenaRecovery(e,cd){
  if(!e.pkmsvvArenaBuild||!arenaDuel(e,G.Game?.player)||!Number.isFinite(cd))return cd;
  // Preserve readable attack windups; no instantaneous casts or extra hits.
  return Math.max(.85,cd*e.pkmsvvArenaBuild.tempo);
 }
 // Stage 5: real catalogue instances, adapted to the hostile combat
 // pipeline. Unsupported kinds (persistent fields, dash, Fusion, etc.) are
 // excluded rather than pretending the player-only implementation is safe.
 const ARENA_KIND=Object.freeze({projectile:'shot',cone:'shot',nova:'nova',beam:'beam',charge:'beam',melee:'melee',spin:'melee',aura:'melee',meteor:'zone',quake:'zone',buff:'buff'});
 const arenaKits=new WeakMap();
 const arenaMoveLabel=m=>G.T?.(m.name||m.id,'move')||m.name||m.id;
 const arenaHash=(dex,id)=>{let n=(Number(dex)||1)*997;for(const c of String(id))n=(Math.imul(n,31)+c.charCodeAt(0))>>>0;return n/4294967296;};
 function arenaFamily(m){
  const k=ARENA_KIND[m?.kind];
  if(k==='buff')return ['def','regen','atk','patk','satk'].includes(m.stat)?k:null;
  return k&&m.dmg>0?k:null;
 }
 function arenaReach(m,family){
  if(family==='melee')return clamp(positive(m.radius,60)+18,64,135);
  if(family==='beam')return clamp(positive(m.radius,250),150,410);
  if(family==='zone')return clamp(positive(m.range,280),180,390);
  if(family==='buff')return 430;
  return clamp(positive(m.speed,200)*positive(m.life,1.4),135,420);
 }
 function arenaEquip(e,p){
  if(!e?.pkmsvvArenaBuild||!G.Moves?.poolFor||!G.Moves?.instance||!e.mon?.types)return [];
  const b=e.pkmsvvArenaBuild,round=b.mode==='champion'?b.round:0,types=e.mon.types;
  const count=clamp((b.attacks||0)+(b.support||0)+(round>=2?1:0),3,8);
  const lvls=b.moves||[],avg=lvls.length?lvls.reduce((s,m)=>s+positive(m.lvl,1),0)/lvls.length:1;
  const level=clamp(Math.round(avg)+(round>=2?1:0),1,8);
  const pool=[...new Set(G.Moves.poolFor(e.mon))].map(id=>{
   const def=G.Moves.BY_ID?.[id];if(!def||!arenaFamily(def)||!types.includes(def.type)&&def.type!=='normal')return null;
   const m=G.Moves.instance(id,Math.min(level,positive(def.maxLvl,1))),family=arenaFamily(m);
   return {m,family,own:types.includes(m.type),rank:arenaHash(e.dex,id),reach:arenaReach(m,family),ready:0,last:-100};
  }).filter(Boolean);
  const selected=[],families=new Set(),take=(list)=>{
   const next=list.filter(v=>!selected.includes(v)).sort((a,b)=>(Number(b.own)-Number(a.own))*3+
    (Number(!families.has(b.family))-Number(!families.has(a.family)))*1.8+b.rank-a.rank)[0];
   if(next){selected.push(next);families.add(next.family);}return next;
  };
  // Start with a STAB attack; seek one near/far alternative and a tactical
  // utility move rather than filling the kit with eight identical projectiles.
  const attacks=pool.filter(v=>v.family!=='buff');
  take(attacks);
  if(count>1)take(attacks.filter(v=>v.family!=='melee'));
  if(count>2)take(attacks.filter(v=>v.family==='melee'));
  if(count>=4&&attacks.length>=2)take(pool.filter(v=>v.family==='buff'));
  while(selected.length<count&&take(attacks)){}
  if(!selected.some(v=>v.family!=='buff'))return [];
  const median=attacks.length?attacks.map(v=>v.m.dmg).sort((a,b)=>a-b)[Math.floor(attacks.length/2)]:1;
  for(let i=0;i<selected.length;i++){
   const v=selected[i],m=v.m,base=positive(m.cd,2);
   let cd=base*positive(p?.cdMul,1);
   try{cd=positive(G.PKMSVVBalance?.effectiveCooldown?.(p,m),cd);}catch(_){}
   // This is sequential trainer AI, not eight simultaneous boss attacks.
   v.cd=v.family==='buff'?clamp(cd+5,8,18):clamp(cd*1.6+1.6,2.2,9);
   v.power=v.family==='buff'?0:clamp(m.dmg/Math.max(1,median),.60,1.45);
   v.ready=i*.18;
  }
  arenaKits.set(e,{entries:selected,clock:0,last:null,buffUntil:0,buffStat:null,buffAmount:0,utilityUses:0,casts:0,history:[],observe:finite(p)?{x:p.x,y:p.y,t:0,vx:0,vy:0}:null});
  e.pkmsvvArenaMoves=selected.map(v=>({id:v.m.id,name:arenaMoveLabel(v.m),type:v.m.type,kind:v.m.kind,level:v.m.lvl,cd:v.cd,family:v.family,reach:v.reach}));
  return e.pkmsvvArenaMoves;
 }
 function arenaKit(e){
  const s=arenaKits.get(e);if(!s)return null;
  return {moves:e.pkmsvvArenaMoves.map(v=>({...v})),casts:s.casts,history:s.history.slice(),utilityUses:s.utilityUses};
 }
 function arenaSkillClock(e,p,dt){
  const s=arenaKits.get(e);if(!s||!arenaDuel(e,p))return;
  const t=clamp(Number(dt)||0,0,.25);s.clock+=t;
  for(const v of s.entries)v.ready=Math.max(0,v.ready-t);
  // Sample past visible movement only. One bounded estimate per 160ms,
  // never read controls, aim input, target choice, or future positions.
  if(finite(p)){
   if(!s.observe)s.observe={x:p.x,y:p.y,t:0,vx:0,vy:0};
   const o=s.observe;o.t+=t;
   if(o.t>=.16){
    let vx=(p.x-o.x)/o.t,vy=(p.y-o.y)/o.t;
    const speed=Math.hypot(vx,vy),limit=clamp(positive(p.spd,150),40,420);
    if(speed>limit){vx*=limit/speed;vy*=limit/speed;}
    o.vx=o.vx*.35+vx*.65;o.vy=o.vy*.35+vy*.65;
    o.x=p.x;o.y=p.y;o.t=0;
   }
  }
 }
 function arenaAimPoint(e,p,lead=.23){
  const o=arenaKits.get(e)?.observe;
  if(!o||!finite(p))return {x:p.x,y:p.y};
  let dx=o.vx*clamp(lead,0,.3),dy=o.vy*clamp(lead,0,.3);
  const n=Math.hypot(dx,dy);if(n>45){dx*=45/n;dy*=45/n;}
  const point={x:p.x+dx,y:p.y+dy};
  // Don't put a target-zone telegraph inside a blocked tile.
  if(G.World?.isFree&&!G.World.isFree(point.x,point.y,Math.max(3,(p.r||10)*.4),true))return {x:p.x,y:p.y};
  return point;
 }
 function arenaSkillPick(e,p,dist){
  const s=arenaKits.get(e);if(!s||!arenaDuel(e,p)||e.ai?.cast||e.stunT>0||e.sleepT>0||e._pkmsvvMegaTransition>0)return null;
  const hp=clamp(e.hp/Math.max(1,e.maxHp),0,1),style=e.pkmsvvArenaBuild.style;
  let best=null,score=-Infinity;
  for(const v of s.entries){
   if(v.ready>0||dist>v.reach)continue;
   const m=v.m;let value=0;
   if(v.family==='buff'){
    if(s.utilityUses>=2||s.buffUntil>s.clock)continue;
    if(m.stat==='regen'){if(hp>.55)continue;value=3.2;}
    else if(m.stat==='def'){if(hp>.75||e.shield>0)continue;value=2.7;}
    else {if(hp<.25||dist>260)continue;value=.85;}
   }else{
    let mult=1;try{mult=G.Types?.mult?.(m.type,p.mon?.types||[])??1;}catch(_){}
    // Type preference is modest; no immunity bypass and no perfect counterpick.
    value=1+Math.min(1.2,Math.max(-1.5,(mult-1)*.48))+v.power*.34+
     (v.own?.35:0)+(v.family==='melee'&&dist<95?.8:0)+(style==='keep-range'&&v.family!=='melee'?.30:0);
    if(v.family==='nova'&&dist>v.reach*.8)value-=.65;
   }
   value+=Math.min(1.2,(s.clock-v.last)*.07)-(s.last===v.m.id?1.2:0)+v.rank*.12;
   if(value>score){score=value;best=v;}
  }
  return best;
 }
 function arenaSkillStart(e,p,dist){
  const s=arenaKits.get(e);
  // False = original boss (no kit). True = this trainer owns selection, even
  // while waiting for range/cooldown, so no extra hidden generic attacks.
  if(!s||!arenaDuel(e,p))return false;
  const v=arenaSkillPick(e,p,dist);if(!v)return true;
  const m=v.m,f=v.family,col=G.U?.TYPE_COLOR?.[m.type]||'#ffb7cf';
  const aim=arenaAimPoint(e,p,f==='zone'?.27:.20),ang=Math.atan2(aim.y-e.y,aim.x-e.x);
  const wind=f==='buff'?.72:f==='beam'?clamp(positive(m.charge,.85),.8,1.25):f==='zone'?.95:f==='melee'?.68:.62;
  const token={id:'pkmsvv-arena:'+m.id,arenaSkill:true,v,wind,t:0,after:.3,ang,col,fired:false,cancelled:false};
  e.ai.cast=token;v.ready=v.cd;v.last=s.clock;s.last=m.id;s.casts++;s.history.push(m.id);if(s.history.length>24)s.history.shift();
  let damage=positive(e.dmg,1)*v.power;
  if(s.buffUntil>s.clock&&(s.buffStat==='atk'||s.buffStat===(m.cat==='physical'?'patk':'satk')))damage*=1+s.buffAmount;
  // Keep the trained base damage cap meaningful even on high-power moves.
  damage=Math.min(damage,positive(e.dmg,1)*1.5);
  token.damage=damage;
  const add=h=>G.Hazards?.add?.({...h,dmg:damage,type:m.type,cat:m.cat,color:col,delay:wind,pkmsvvArenaOwner:e,pkmsvvArenaCast:token,pkmsvvArenaMove:m.id});
  if(f==='beam')add({kind:'beam',x:e.x,y:e.y,angle:ang,len:v.reach,w:clamp(positive(m.width,26),20,55)});
  if(f==='melee')add({kind:'zone',x:e.x,y:e.y,r:clamp(positive(m.radius,60),36,115)});
  if(f==='zone')add({kind:'zone',x:aim.x,y:aim.y,r:clamp(positive(m.radius,48),32,85)});
  e.anim?.play?.('Charge',{speed:1.2});
  G.FX?.ring?.(e.x,e.y,e.r||12,(e.r||12)*2.2,col,wind,2);
  G.FX?.dmgText?.(e.x,e.y-(e.bodyH||35)-8,String(arenaMoveLabel(m)),col,true);
  return true;
 }
 function arenaSkillInterrupt(e,p){
  const c=e?.ai?.cast;if(!c?.arenaSkill)return;
  if(!arenaDuel(e,p)||e.stunT>0||e.sleepT>0||e._pkmsvvMegaTransition>0){
   c.cancelled=true;e.ai.cast=null;e.ai.cd=Math.max(.85,e.ai.cd||0);
  }
 }
 function arenaHazardActive(h,p){
  const e=h?.pkmsvvArenaOwner,c=h?.pkmsvvArenaCast;
  return !e||(!c?.cancelled&&arenaDuel(e,p)&&!e._pkmsvvMegaTransition&&!(e.stunT>0)&&!(e.sleepT>0)&&e.ai?.cast===c);
 }
 function arenaSkillCast(e,p,dt){
  const c=e?.ai?.cast,s=arenaKits.get(e);
  if(!c?.arenaSkill||!s)return null;
  if(!arenaDuel(e,p)||c.cancelled){e.ai.cast=null;return [0,0,'Idle'];}
  c.t+=Math.max(0,Number(dt)||0);
  if(c.t>=c.wind&&!c.fired){
   c.fired=true;const {m,family:f}=c.v;
   if(f==='shot'||f==='nova'){
    const n=f==='nova'?clamp(Math.round(positive(m.count,8)),6,12):clamp(Math.round(positive(m.count,1)),1,5);
    const spread=f==='nova'?2*Math.PI*(n-1)/n:clamp(positive(m.spread,positive(m.arc,.5)),.16,1.15);
    const speed=clamp(positive(m.speed,200)*.82,150,310),life=clamp(positive(m.life,1.4),.4,2.4);
    for(let i=0;i<n;i++){
     const a=c.ang+(n===1?0:(i/(n-1)-.5)*spread);
     G.Projectiles?.spawn?.({x:e.x,y:e.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:clamp(positive(m.size,7),5,12),life,dmg:c.damage,
      friendly:false,mtype:m.type,cat:m.cat,color:c.col,vis:G.VFX?.forType?.(m.type),pkmsvvArenaMove:m.id});
    }
    e.anim?.play?.('Shoot',{speed:1.3});
   }else if(f==='buff'){
    s.utilityUses++;const maxHp=positive(e.maxHp,1);
    if(m.stat==='regen'){
     const heal=Math.min(maxHp*.04,Math.max(0,maxHp-e.hp));e.hp+=heal;
     G.FX?.ring?.(e.x,e.y,12,48,'#70e9a3',.45,3);
    }else if(m.stat==='def'){
     // Native shield is visible and absorbable, never invulnerability.
     e.shield=Math.min(maxHp*.035,Math.max(0,positive(e.rd,0)*.30));e.shieldT=4;
     G.FX?.ring?.(e.x,e.y,12,48,'#91dcff',.45,3);
    }else{
     s.buffStat=m.stat;s.buffAmount=clamp(positive(m.amount,.10),.08,.22);s.buffUntil=s.clock+Math.min(6,positive(m.dur,5));
     G.FX?.ring?.(e.x,e.y,12,48,'#ffc668',.45,3);
    }
   }else e.anim?.play?.('Attack',{speed:1.2});
  }
  if(c.t>=c.wind+c.after){
   // Use the real native recovery hook (including Champion round modifiers).
   return e.bossEnd();
  }
  return [0,0,'Idle'];
 }
 // Arena enemies use the native boss controller. Only override its idle
 // locomotion when an existing, approaching player projectile threatens it.
 // No cast cancellation, extra speed, teleport, damage or stat adjustment.
 const arenaFootworkState=new WeakMap();
 function arenaDuel(e,p){
  if(!alive(e)||!alive(p)||e.remote||e.friendly||G.Coop?.active||G.Game?.state!=='playing')return false;
  const solo=G.PKMSVVArenaSolo,champ=G.PKMSVVChampionArena;
  return !!((e.pkmsvvArenaSolo&&solo?.active&&solo.stage==='fight')||
   (e.pkmsvvChampion&&!e._pkmsvvSkyBoss&&champ?.active&&champ.stage==='fight'));
 }
 function projectileClearance(e,shot,vx,vy,horizon){
  const x=shot.x-e.x,y=shot.y-(typeof e.cy==='function'?e.cy():e.y),dx=shot.vx-vx,dy=shot.vy-vy;
  const den=dx*dx+dy*dy,t=den>0?Math.max(0,Math.min(horizon,-(x*dx+y*dy)/den)):0;
  return {margin:Math.hypot(x+dx*t,y+dy*t)-(Math.max(0,e.r||10)+Math.max(0,shot.r||5)+5),t};
 }
 function arenaFootwork(e,p,spd,vx,vy,dt){
  if(!arenaDuel(e,p))return null;
  if(![spd,vx,vy,dt].every(Number.isFinite)||dt<=0)return null;
  let s=arenaFootworkState.get(e);
  if(!s){s={hold:0,wait:0,axis:null};arenaFootworkState.set(e,s);}
  s.wait=Math.max(0,s.wait-dt);s.hold=Math.max(0,s.hold-dt);
  if(e.ai?.cast||e.stunT>0||e.sleepT>0||e.jump||e._pkmsvvMegaTransition>0){
   s.hold=0;s.axis=null;return null;
  }
  const speed=Math.min(spd,Math.hypot(vx,vy));
  if(speed<=0||typeof G.World?.isFree!=='function')return null;
  const safe=(ax,ay,seconds)=>{
   const travel=speed*seconds,n=Math.max(1,Math.ceil(travel/10));
   for(let i=1;i<=n;i++)if(!G.World.isFree(e.x+ax*travel*i/n,e.y+ay*travel*i/n,(e.r||10)+2,false))return false;
   return true;
  };
  if(s.hold>0&&s.axis){
   if(safe(...s.axis,Math.min(.12,s.hold)))return s.axis.map(a=>a*speed);
   s.hold=0;s.axis=null;
  }
  if(s.wait>0)return null;
  s.wait=.18;
  const threats=[];
  for(const shot of G.Projectiles?.all?.()||[]){
   if(!shot?.friendly||shot.orb||shot.boom||shot.homing>0||shot.visualOnly||shot.dmg<=0||
      shot.hits?.has?.(e.id)||![shot.x,shot.y,shot.vx,shot.vy,shot.life,shot.t].every(Number.isFinite))continue;
   const horizon=Math.min(.42,shot.life-shot.t);
   if(horizon<=.08||sq(e,shot)>380**2||Math.hypot(shot.vx,shot.vy)<30)continue;
   const initial=projectileClearance(e,shot,vx,vy,horizon);
   // Already passed, moving away, or far enough even on the native path.
   if(initial.t<.06||initial.margin>7)continue;
   threats.push({shot,horizon,initial});
  }
  threats.sort((a,b)=>a.initial.t-b.initial.t);
  const nearby=threats.slice(0,12);
  if(!nearby.length)return null;
  const baseline=Math.min(...nearby.map(t=>t.initial.margin));
  const dir=Math.atan2(vy,vx),distance=Math.sqrt(sq(e,p));
  let best=null,bestScore=-Infinity;
  for(const off of [Math.PI/2,-Math.PI/2,Math.PI/4,-Math.PI/4,3*Math.PI/4,-3*Math.PI/4,Math.PI]){
   const a=dir+off,ax=Math.cos(a),ay=Math.sin(a);
   if(!safe(ax,ay,.38))continue;
   const end={x:e.x+ax*speed*.38,y:e.y+ay*speed*.38};
   // Avoid turning a duel into endless kiting.
   if(Math.sqrt(sq(end,p))>Math.max(330,distance+12))continue;
   const clearance=Math.min(...nearby.map(t=>projectileClearance(e,t.shot,ax*speed,ay*speed,t.horizon).margin));
   if(clearance<baseline+8)continue;
   const score=Math.min(50,clearance)-Math.max(0,Math.sqrt(sq(end,p))-distance)*.16-Math.abs(off)*2;
   if(score>bestScore){bestScore=score;best=[ax,ay];}
  }
  if(!best)return null;
  s.axis=best;s.hold=.36;s.wait=1.05;
  return best.map(a=>a*speed);
 }
 function status(pl){
  if(!pl||pl.dead||!['playing','held'].includes(G.Game?.state))return [];
  const rows=[],rest=Number(pl.__pkmsvv3dsSupport?.rest)||0;
  if(rest>0)rows.push({id:'rest',text:tr('NGỦ (Rest) ','REST ')+Math.ceil(rest*10)/10+'s',color:'#d6b4ff'});
  if(pl.slowT>0)rows.push({id:'slow',text:tr('CHẬM ','SLOWED ')+Math.ceil(pl.slowT*10)/10+'s',color:'#91dcff'});
  if(pl.frozen&&rest<=0)rows.push({id:'frozen',text:tr('KHÓA ĐIỀU KHIỂN','INPUT LOCKED'),color:'#ffd580'});
  const fps=Number(G.PKMSVVHordePerformance?.fps);
  if(Number.isFinite(fps)&&fps>0&&fps<38)rows.push({id:'fps',text:tr('FPS THẤP ','LOW FPS ')+Math.round(fps),color:'#ffa59b'});
  return rows;
 }
 function drawStatus(ctx,x,y,w,pl){
  const rows=status(pl);if(!rows.length||!ctx)return x;
  ctx.save();ctx.font='700 10px sans-serif';ctx.textAlign='left';ctx.textBaseline='alphabetic';
  for(const row of rows){
   const width=Math.min(ctx.measureText(row.text).width+12,w-x-12);
   if(width<50)break;
   ctx.fillStyle='rgba(12,20,30,.85)';ctx.fillRect(x,y,width,16);
   ctx.fillStyle=row.color;ctx.fillText(row.text,x+6,y+12,width-12);x+=width+5;
  }
  ctx.restore();return x;
 }
 G.PKMSVVCombatTacticsQA=Object.freeze({alliedMode,assignRescuers,directPath,margin,needsEvade,evade,rangedGoal,berryGoal,rangedFootwork,arenaDuel,arenaProfile,arenaStats,arenaPreserveFighter,arenaPlan,arenaRecovery,arenaEquip,arenaKit,arenaSkillClock,arenaAimPoint,arenaSkillStart,arenaSkillInterrupt,arenaHazardActive,arenaSkillCast,arenaFootwork,status,drawStatus});
})();
