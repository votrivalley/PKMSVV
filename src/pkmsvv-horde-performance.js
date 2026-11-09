/* Pokémon Chuyển Sinh: non-Fusion normal-horde render guard.
 * A fight with many simultaneous AUTO skills can emit hundreds of native
 * damage labels and burst particles per second. Only VISUALS are sampled.
 * Enemy.hurt, collision, status effects, XP, drops and stats are NEVER skipped.
 * Boss telegraph rings and informative non-numeric messages are never capped.
 */
G.PKMSVVHordePerformance=(()=>{
 'use strict';
 // Previous FX guard never ran below 24 enemies; 8 AUTO moves at Lv20 can
 // already flood the canvas with particle bursts even in a small crowd.
 const MIN_ENEMIES=8,HEAVY_ENEMIES=24,WINDOW_MS=100;
 const LIMIT=Object.freeze({burst:10,dmgText:14});
 const HEAVY_LIMIT=Object.freeze({burst:7,dmgText:10});
 const PARTICLE_LIMIT=6;
 const skipped={burst:0,dmgText:0};
 let particlesReduced=0;
 let enabled=true,at=-1,spent={burst:0,dmgText:0};
 let sampledAt=-Infinity,cachedCount=0;
 const time=()=>typeof performance!=='undefined'&&typeof performance.now==='function'?
  performance.now():Date.now();
 function countEnemies(){
  const mgr=G.EnemyMgr;
  const direct=Number(mgr?.count);
  if(Number.isFinite(direct)&&direct>=0)return direct;
  const now=time();
  if(now-sampledAt<250)return cachedCount;
  sampledAt=now;
  const list=mgr?.all?.();
  cachedCount=Array.isArray(list)?list.length:
   Number.isFinite(list?.size)?list.size:0;
  return cachedCount;
 }
 function isDamageText(value){
  return typeof value==='number'&&Number.isFinite(value)||
   typeof value==='string'&&/^\s*[+\-]?\d/.test(value);
 }
 function dense(name,args){
  if(!enabled||G.Game?.state!=='playing')return false;
  if(name==='dmgText'&&!isDamageText(args[2]))return false;
  return countEnemies()>=MIN_ENEMIES;
 }
 function wrap(fx,name){
  const before=fx?.[name];
  if(typeof before!=='function'||before._pkmsvvHordePerformance)return false;
  function limited(...args){
   if(dense(name,args)){
    const now=time();
    if(at<0||now-at>=WINDOW_MS||now<at){
     at=now;spent={burst:0,dmgText:0};
    }
    const max=countEnemies()>=HEAVY_ENEMIES?HEAVY_LIMIT[name]:LIMIT[name];
    if(++spent[name]>max){skipped[name]++;return;}
    // Only FX.burst's cosmetic particle-count argument is limited.
    // Damage, cooldowns, enemy events, XP and loot never pass this wrapper.
    if(name==='burst'&&Number.isFinite(args[3])&&args[3]>PARTICLE_LIMIT){
     particlesReduced+=args[3]-PARTICLE_LIMIT;
     args[3]=PARTICLE_LIMIT;
    }
   }
   return before.apply(this,args);
  }
  limited._pkmsvvHordePerformance=true;
  fx[name]=limited;
  return true;
 }
 function install(){
  const fx=G.FX;if(!fx)return false;
  const had=typeof fx.burst==='function'&&fx.burst._pkmsvvHordePerformance&&
   typeof fx.dmgText==='function'&&fx.dmgText._pkmsvvHordePerformance;
  wrap(fx,'burst');wrap(fx,'dmgText');
  return !!had||!!(fx.burst?._pkmsvvHordePerformance||
   fx.dmgText?._pkmsvvHordePerformance);
 }
 function setEnabled(on){enabled=on!==false;return enabled;}
 install();
 return {install,setEnabled,get enabled(){return enabled;},
  get stats(){return {threshold:MIN_ENEMIES,heavyThreshold:HEAVY_ENEMIES,
   windowMs:WINDOW_MS,particleLimit:PARTICLE_LIMIT,
   enemies:countEnemies(),particlesReduced,skipped:{...skipped}};}};
})();