/* Isolated Big Update combat balance. Never writes a profile or changes population. */
(function(){
 'use strict';
 if(typeof G==='undefined')return;
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
 const number=(n,f=0)=>Number.isFinite(n)?n:f;
 const POLICY=Object.freeze({
  elite:Object.freeze({hard:.9,recover:1.4,slow:.55,slowTime:2,wave:.45,vortex:.6}),
  boss:Object.freeze({hard:.65,recover:2,slow:.4,slowTime:1.5,wave:.06,vortex:.1})
 });
 const hardStates=new WeakMap();
 function enabled(){
  if(G.Royale?.active||G.EggRush?.active||G.Arena?.active||G.PKMSVVArenaSolo?.active||
     G.PKMSVVChampionArena?.active||G.PKMSVVArenaPvp?.active||G.PKMSVVBerryRescue?.active||
     G.PKMSVVFossilExpedition?.session||G.Judgment?.active)return false;
  return G.Coop?.active?G.Social?.room?.mode==='coop':G.PKMSVVQuickRegion?.active===true;
 }
 function tier(e){
  if(!enabled()||!e||e.dead||e.remote||e.friendly||e.pkmsvvFriendly||e.isSupport||e.arceus||e.judge)return null;
  return e.boss||e.legend||e.pkmsvvExploreBoss?'boss':e.pkmsvvPressureElite?'elite':null;
 }
 function powerRate(taken){const n=Math.max(0,Math.floor(number(taken)));return n<10?.10:n<20?.06:.03;}
 function powerFactor(taken){
  const n=clamp(Math.floor(number(taken)),0,40);
  return 1.10**Math.min(10,n)*1.06**Math.min(10,Math.max(0,n-10))*1.03**Math.max(0,n-20);
 }
 const playerEligible=p=>enabled()&&!!p&&!p.dead&&!p.remote&&!p.isSupport;
 function dragScale(e,kind){
  const t=tier(e);if(t)return POLICY[t][kind]??1;
  if(enabled()&&e?.remote)return 0;
  return kind==='wave'?(e?.boss||e?.judge? .15:.75):(e?.boss||e?.judge? .25:1);
 }
 function drag(e,dx,dy){
  if(!tier(e)||!Number.isFinite(dx)||!Number.isFinite(dy)||!Number.isFinite(e.x)||!Number.isFinite(e.y))return false;
  const x=e.x+dx,y=e.y+dy;if(G.World?.isWall?.(x,y))return false;e.x=x;e.y=y;return true;
 }
 const proto=G.Enemy?.prototype;
 function wrap(name,fn){
  const old=proto?.[name];if(typeof old!=='function')return false;
  proto[name]=function(...args){return fn.call(this,old,args);};return true;
 }
 // Count down with authoritative simulation time, not real time or UI pause.
 wrap('update',function(old,args){
  const s=hardStates.get(this),dt=number(args[0]);
  if(s&&tier(this)&&dt>0)s.left=Math.max(0,s.left-dt);
  return old.apply(this,args);
 });
 for(const [name,key] of [['applyStun','stunT'],['applySleep','sleepT']]){
  wrap(name,function(old,args){
   const t=tier(this);if(!t)return old.apply(this,args);
   const duration=number(args[0]);if(duration<=0)return;
   // One shared stun/sleep window. Do not refresh it during recovery.
   if((hardStates.get(this)?.left||0)>0||number(this.stunT)>0||number(this.sleepT)>0)return;
   const result=old.apply(this,args),policy=POLICY[t];
   this[key]=clamp(number(this[key]),0,policy.hard);
   if(this[key]>0)hardStates.set(this,{left:this[key]+policy.recover,applied:this[key]});
   return result;
  });
 }
 wrap('applySlow',function(old,args){
  const t=tier(this);if(!t)return old.apply(this,args);
  const policy=POLICY[t],factor=clamp(number(args[0]),0,policy.slow),dur=clamp(number(args[1],1.2),0,policy.slowTime);
  if(!factor||!dur)return;
  const result=old.call(this,factor,dur,...args.slice(2));
  this.slow=clamp(number(this.slow),0,policy.slow);this.slowT=clamp(number(this.slowT),0,policy.slowTime);return result;
 });
 // Only the native Power card changes; other items, Rank, buffs, abilities
 // and special power multipliers remain independent, not divided away.
 const power=G.LevelUp?.STATS?.find(s=>s.id==='atk');
 if(power){
  const old=power.apply;power.apply=function(p){
   if(!playerEligible(p)||number(p.statsTaken?.atk)<10)return old.call(this,p);
   p.atkMul*=1+powerRate(p.statsTaken?.atk);
  };
 }
 const offer=G.LevelUp?.offer;
 if(typeof offer==='function')G.LevelUp.offer=function(p,...args){
  const cards=offer.call(this,p,...args);
  if(playerEligible(p)&&Array.isArray(cards)){
   const rate=Math.round(powerRate(p.statsTaken?.atk)*100);
   for(const c of cards)if(c.key==='stat:atk')c.desc=tr('+'+rate+'% sát thương mọi kỹ năng (giảm dần sau 10/20 lần).','+'+rate+'% all move damage (diminishing after 10/20 picks).');
  }
  return cards;
 };
 const balance=G.PKMSVVBalance;
 if(balance){
  const cd=balance.effectiveCooldown,reward=balance.rewardRift;
  if(typeof cd==='function')balance.effectiveCooldown=function(p,m){
   const value=cd.call(this,p,m);
   if(!playerEligible(p))return value;
   if(m.kind==='wave')return Math.max(1.5,value);
   if(m.kind==='vortex')return Math.max(1.8,value);
   return value;
  };
  if(typeof reward==='function')balance.rewardRift=function(p,...args){
   const capped=playerEligible(p)&&number(p.pkmsvvResonance)>=3,haste=p?.cdMul;
   const result=reward.call(this,p,...args);if(capped)p.cdMul=haste;return result;
  };
 }
 // Read-only catalogue audit: use native constructors and level-up/evolution
 // rather than reimplementing the 176 skills. Single-hit proxy is NOT DPS:
 // projectile multiplicity, area, ticks, target availability and defense vary.
 function audit(){
  return Object.values(G.Moves.BY_ID).map(def=>{
   const first=G.Moves.instance(def.id),max=G.Moves.instance(def.id);
   for(let n=1;n<def.maxLvl;n++)if(!G.Moves.levelUp(max))throw Error('Upgrade failed '+def.id);
   const describe=m=>{
    const cd=G.PKMSVVBalance.effectiveCooldown({cdMul:1,dead:false},m),hasted=G.PKMSVVBalance.effectiveCooldown({cdMul:.2,dead:false},m);
    if(!Number.isFinite(cd)||cd<=0||!Number.isFinite(hasted)||hasted<=0)throw Error('Invalid cooldown '+def.id);
    const out={lvl:m.lvl,cd,hasted};
    for(const k of ['dmg','radius','range','width','dur','count','pierce','pull','knock','stun','slow','amount']){
     if(m[k]===undefined)continue;if(!Number.isFinite(m[k]))throw Error('Invalid '+k+' '+def.id);out[k]=m[k];
    }
    if(Number.isFinite(m.dmg)&&m.dmg>0)out.nominalSingleHitPerSecond=+(m.dmg/cd).toFixed(3);
    return out;
   };
   const row={id:def.id,kind:def.kind,type:def.type,native:!!def.pkmsvv3dsNative,maxLvl:def.maxLvl,first:describe(first),max:describe(max)};
   const ev=G.Moves.evoInfo?.(max,{});if(ev&&G.Moves.evolve(max))row.evolved=describe(max);
   return row;
  });
 }
 G.PKMSVVCombatBalanceQA=Object.freeze({POLICY,enabled,tier,powerRate,powerFactor,dragScale,drag,audit,control:e=>hardStates.has(e)?{...hardStates.get(e)}:null});
})();
