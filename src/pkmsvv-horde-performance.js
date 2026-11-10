/* Pokémon Chuyển Sinh 2.0 - adaptive, VISUAL-ONLY graphics budget.
 * Never skip hitbox/projectile/collision/cast, Enemy.hurt, statuses, XP,
 * drops or telegraph rings. Touches ONLY cosmetic FX.burst and numeric
 * FX.dmgText plus explicitly labelled allied Fusion alpha.
 * One passive rAF FPS sampler, no combat-loop DOM scans or observers.
 */
G.PKMSVVHordePerformance=(()=>{
 'use strict';
 const MIN_ENEMIES=8,HEAVY_ENEMIES=24,WINDOW_MS=100;
 const LIMIT=Object.freeze({burst:10,dmgText:14});
 const HEAVY_LIMIT=Object.freeze({burst:7,dmgText:10});
 const PARTICLE_LIMIT=6,KEY='pkmsvvFxQualityV36';
 const skipped={burst:0,dmgText:0};
 let particlesReduced=0,enabled=true,at=-1,spent={burst:0,dmgText:0};
 let sampledAt=-Infinity,cachedCount=0,mode='auto',tier='high',fps=0;
 let frameStart=0,frameCount=0,strongWindows=0,weakWindows=0;
 let uiReady=false,rafInstalled=false;
 const time=()=>typeof performance!=='undefined'&&typeof performance.now==='function'?
  performance.now():Date.now();
 const normalize=value=>['auto','quality','performance'].includes(value)?value:'auto';
 function loadMode(){
  try{mode=normalize(G.Settings?.get?.(KEY)||'auto');}catch(_){mode='auto';}
  if(mode==='quality')tier='high';
  if(mode==='performance')tier='low';
  return mode;
 }
 function setMode(value){
  mode=normalize(value);strongWindows=0;weakWindows=0;
  if(mode==='quality')tier='high';
  else if(mode==='performance')tier='low';
  else tier='high'; // recalibrate from real FPS, never guess device class
  try{G.Settings?.set?.(KEY,mode);}catch(_){}
  updateSelect();return mode;
 }
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
 // Measured FPS is display/frame rate, not battle time multiplier.
 // Downgrade after one sustained low-FPS window; upgrade only after 3
 // consecutive good windows (hysteresis prevents a quality-flip loop).
 function recordFPS(measured){
  const value=Number(measured);
  if(!Number.isFinite(value)||value<=0||value>300)return tier;
  fps=Math.round(value*10)/10;
  if(mode!=='auto')return tier;
  const desired=value<38?'low':value<53?'medium':'high';
  const ranks={low:0,medium:1,high:2};
  if(ranks[desired]<ranks[tier]){
   weakWindows++;
   if(weakWindows>=1){tier=desired;strongWindows=0;weakWindows=0;}
  }else if(ranks[desired]>ranks[tier]){
   weakWindows=0;
   if(value>57&&++strongWindows>=3){
    tier=ranks[tier]===0?'medium':'high';strongWindows=0;
   }
  }else{weakWindows=0;strongWindows=0;}
  return tier;
 }
 function frame(t){
  if(typeof requestAnimationFrame==='function')
   requestAnimationFrame(frame);
  // Hidden/background tabs and pause/menus should not be classified as slow.
  const visible=typeof document==='undefined'||document.hidden!==true;
  if(!visible||G.Game?.state!=='playing'){
   frameStart=0;frameCount=0;return;
  }
  const now=Number.isFinite(t)?t:time();
  if(!frameStart){frameStart=now;frameCount=0;return;}
  frameCount++;
  const elapsed=now-frameStart;
  if(elapsed>=2500){
   if(elapsed<15000)recordFPS(frameCount*1000/elapsed);
   frameStart=now;frameCount=0;
  }
 }
 function startSampler(){
  if(rafInstalled||typeof requestAnimationFrame!=='function')return false;
  rafInstalled=true;requestAnimationFrame(frame);return true;
 }
 function budget(name,count){
  if(tier==='low'){
   return {max:name==='burst'?4:6,particles:2,minimum:0};
  }
  if(tier==='medium'){
   return {max:name==='burst'?7:10,particles:4,minimum:4};
  }
  return {max:count>=HEAVY_ENEMIES?HEAVY_LIMIT[name]:LIMIT[name],
   particles:PARTICLE_LIMIT,minimum:MIN_ENEMIES};
 }
 function wrap(fx,name){
  const before=fx?.[name];
  if(typeof before!=='function'||before._pkmsvvHordePerformance)return false;
  function limited(...args){
   if(enabled&&G.Game?.state==='playing'&&
      (name!=='dmgText'||isDamageText(args[2]))){
    const count=countEnemies(),limit=budget(name,count);
    if(count>=limit.minimum){
     const now=time();
     if(at<0||now-at>=WINDOW_MS||now<at){
      at=now;spent={burst:0,dmgText:0};
     }
     if(++spent[name]>limit.max){skipped[name]++;return;}
     // FX.burst particle argument is cosmetic ONLY, never a projectile.
     if(name==='burst'&&Number.isFinite(args[3])&&args[3]>limit.particles){
      particlesReduced+=args[3]-limit.particles;
      args[3]=limit.particles;
     }
    }
   }
   return before.apply(this,args);
  }
  limited._pkmsvvHordePerformance=true;fx[name]=limited;return true;
 }
 function install(){
  const fx=G.FX;if(!fx)return false;
  const had=typeof fx.burst==='function'&&fx.burst._pkmsvvHordePerformance&&
   typeof fx.dmgText==='function'&&fx.dmgText._pkmsvvHordePerformance;
  wrap(fx,'burst');wrap(fx,'dmgText');
  return !!had||!!(fx.burst?._pkmsvvHordePerformance||
   fx.dmgText?._pkmsvvHordePerformance);
 }
 // Use ONLY for effects emitted by allied Fusion code. Never modify FX.ring
 // globally: it is also responsible for enemy attacks and boss warnings.
 function allyAlpha(base=.68){
  const a=Number(base);
  const original=Number.isFinite(a)?a:.68;
  return tier==='low'?Math.min(original,.34):
   tier==='medium'?Math.min(original,.49):Math.min(original,.68);
 }
 function setEnabled(on){enabled=on!==false;return enabled;}
 function updateSelect(){
  if(typeof document==='undefined')return;
  const select=document.getElementById('pkmsvv-fx-quality');
  if(select&&select.value!==mode)select.value=mode;
 }
 function ensureSettings(){
  if(typeof document==='undefined')return false;
  const root=document.getElementById('scr-settings');
  const body=document.getElementById('set-body');
  if(!root||!body||root.hidden||root.classList?.contains('hidden'))return false;
  if(document.getElementById('pkmsvv-fx-quality')){updateSelect();return true;}
  const row=document.createElement('label');
  row.className='set-row pkmsvv-fx-setting';
  const label=document.createElement('span');
  label.textContent=G.I18n?.lang==='en'?'Skill effects quality':'Chất lượng hiệu ứng kỹ năng';
  const select=document.createElement('select');select.id='pkmsvv-fx-quality';
  select.setAttribute('aria-label',label.textContent);
  for(const [value,vi,en] of [
   ['auto','Tự động (theo FPS)','Auto (FPS adaptive)'],
   ['quality','Đẹp','Quality'],['performance','Mượt','Performance']]){
   const option=document.createElement('option');
   option.value=value;option.textContent=G.I18n?.lang==='en'?en:vi;
   select.appendChild(option);
  }
  select.value=mode;
  select.addEventListener('change',()=>setMode(select.value));
  row.append(label,select);body.appendChild(row);
  return true;
 }
 function installSettings(){
  if(uiReady||typeof document==='undefined')return;
  uiReady=true;
  ensureSettings();
  // Settings opened from either keyboard/controller, click or pause menu.
  // Observer watches only the screen's own hidden/class attrs (NOT its
  // descendants); it cannot feedback-loop on new options or card focus.
  const root=document.getElementById('scr-settings');
  if(root&&typeof MutationObserver==='function'){
   const observer=new MutationObserver(()=>ensureSettings());
   observer.observe(root,{attributes:true,attributeFilter:['class','hidden']});
  }
  // If the setting is first mounted after script load, a real settings
  // interaction installs the row without any per-frame DOM traversal.
  document.addEventListener('click',e=>{
   if(e.target?.closest?.('#scr-settings,[data-go="settings"],#btn-settings'))
    Promise.resolve().then(ensureSettings);
  },true);
 }
 loadMode();
 install();startSampler();installSettings();
 return {install,setEnabled,setMode,recordFPS,allyAlpha,ensureSettings,
  get enabled(){return enabled;},get mode(){return mode;},
  get tier(){return tier;},get fps(){return fps;},
  get stats(){return {threshold:MIN_ENEMIES,heavyThreshold:HEAVY_ENEMIES,
   windowMs:WINDOW_MS,particleLimit:tier==='low'?2:tier==='medium'?4:PARTICLE_LIMIT,
   mode,tier,fps,enemies:countEnemies(),particlesReduced,skipped:{...skipped}};}};
})();
