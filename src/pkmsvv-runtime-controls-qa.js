/* PKMSVV isolated QA: 8-skill auto level picks, 2s F auto active skill,
 * and an explicit 1×/1.5× game-speed toggle. No production/save rewrites. */
(function(){
 'use strict';
 if(typeof G==='undefined'||typeof document==='undefined')return;
 const KEY='pkmsvvAutoPickMaxSkill';
 const L=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const settings=()=>G.Settings;
 const enabled=()=>settings()?.get?.(KEY)===true;
 const setEnabled=value=>{settings()?.set?.(KEY,!!value);refreshLabels();};
 // MAX means eight learned moves each at its true catalog max level.
 const maxLevel=m=>Number(m?.def?.maxLvl??G.Moves?.BY_ID?.[m?.id]?.maxLvl??G.Moves?.BY?.[m?.id]?.maxLvl);
 const full=()=>Array.isArray(G.Game?.player?.moves)&&G.Game.player.moves.length>=8&&
  G.Game.player.moves.slice(0,8).every(m=>{
   const cap=maxLevel(m);return Number.isFinite(cap)&&cap>=1&&Number(m?.lvl)>=cap;
  });
 const playing=()=>G.Game?.state==='playing'&&!G.Game?.player?.dead;
 // Level-up and selection dialogs temporarily suspend 'playing', but may
 // NEVER cancel the user's chosen 1.5x speed for this SAME active run.
 const runContext=()=>!!G.Game?.player&&!G.Game.player.dead&&
  !['ui','over','ended','idle'].includes(String(G.Game?.state||'ui'));
 const byId=id=>document.getElementById(id);
 let fast=false,autoDash=false,held=false,heldTimer=null,choiceToken=null,choicePending=false;
 let lastCast=0,lastUI=0,lastChoiceShow=false,lastSpeedState=null;
 function toast(vi,en){G.UI?.toast?.(L(vi,en),2000);}
 // Speed is a solo/AI training aid, never a competitive advantage.
 // Explore must be single-player. Survival/Rescue Berry can accelerate only
 // for the local AI-room host when EVERY other participant is a verified bot.
 // Unknown participant metadata fails closed to avoid multiplayer desync.
 function arenaMatch(){
  return !!(G.PKMSVVArenaSolo?.active||G.PKMSVVChampionArena?.active||
   G.PKMSVVArenaPvp?.active||G.ArenaPvp?.active);
 }
 function isBot(member){return !!(member?.bot||member?.lanBot||member?.isAI||member?.ai);}
 function canSpeed(){
  if(!runContext()||arenaMatch()||G.Royale?.active||G.EggRush?.active)return false;
  const room=G.Social?.room,mode=String(room?.mode||'').toLowerCase();
  // Competitive rooms remain blocked even if their match-mode flag has not
  // initialized yet, including the AI-only Battle Royale / Egg Rush variants.
  if(['royale','eggrush','arena','champion','pvp','solo'].includes(mode))return false;
  if(!G.Coop?.active){
   // Plain campaign, unselected home/menu and legacy modes are NOT Explore.
   return G.PKMSVVQuickRegion?.active===true;
  }
  if(!['coop','berry','berryeasy'].includes(mode)||!room?.isHost)return false;
  const members=room.members;
  if(!Array.isArray(members)||members.length<2||
    members.some(m=>!m||!m.uid))return false;
  const humans=members.filter(m=>!isBot(m));
  if(humans.length!==1||members.length-humans.length<1)return false;
  const uid=G.Social?.uid||G.Game?.player?.uid;
  if(uid&&humans[0].uid!==uid)return false;
  return true;
 }
 function setSpeed(on){
  if(typeof G.Game?.debugSpeed!=='function')return false;
  if(on&&!canSpeed())return false;
  fast=!!on;
  G.Game.debugSpeed(fast?1.5:1);
  refreshLabels();return true;
 }
 function autoButtonLabel(){return L('⚡ Tự chọn khi 8 kỹ năng MAX: ','⚡ Auto-pick when all 8 moves MAX: ')+
  (enabled()?L('BẬT','ON'):L('TẮT','OFF'));}
 function refreshLabels(){
  const b=byId('pkmsvv-maxskill-autopick');if(b){
   b.textContent=autoButtonLabel();b.setAttribute('aria-pressed',String(enabled()));
  }
  const cb=byId('pkmsvv-settings-autopick');if(cb)cb.checked=enabled();
  const speed=byId('pkmsvv-speed-button');if(speed){
   speed.textContent=fast?'⏩ ×1,5':'▶ ×1';
   speed.setAttribute('aria-pressed',String(fast));
   speed.setAttribute('aria-label',L('Tốc độ trận đấu ','Battle speed ')+(fast?'1,5×':'1×'));
  }
  const tag=byId('pkmsvv-active-auto');if(tag){
   tag.hidden=!autoDash;tag.textContent=L('F · TỰ DÙNG','F · AUTO CAST');
  }
 }
 function ensureSettings(){
  const root=byId('scr-settings'),body=byId('set-body');if(!root||!body||root.classList.contains('hidden'))return;
  if(body.querySelector('#pkmsvv-settings-autopick'))return;
  const row=document.createElement('label');row.className='set-row pkmsvv-qa-auto-option';
  const name=document.createElement('span');
  name.textContent=L('Tự chọn không hiện popup khi cả 8 kỹ năng đã MAX','Auto-pick without popup after all 8 moves reach MAX');
  const input=document.createElement('input');input.id='pkmsvv-settings-autopick';
  input.type='checkbox';input.checked=enabled();input.addEventListener('change',()=>setEnabled(input.checked));
  row.append(name,input);body.append(row);
 }
 function ensureLevelup(){
  const screen=byId('scr-levelup'),cards=byId('cards');if(!screen||!cards)return;
  let b=byId('pkmsvv-maxskill-autopick');
  if(!b){b=document.createElement('button');b.type='button';b.id='pkmsvv-maxskill-autopick';
   b.className='btn small pkmsvv-maxskill-toggle';
   b.addEventListener('click',event=>{event.stopPropagation();setEnabled(!enabled());});
   cards.before(b);
  }
  b.hidden=!full();
  const shown=!screen.classList.contains('hidden')&&!screen.hidden;
  if(!shown||!full()){choicePending=false;choiceToken=null;lastChoiceShow=false;return;}
  if(!lastChoiceShow){refreshLabels();lastChoiceShow=true;}
  // See installAutoPick: handle the native completion callback BEFORE
  // opening any level-up popup, never click a card after it is rendered.
 }
 function installAutoPick(){
  const run=G.RunUI,original=run?.showLevelUp;
  if(typeof original!=='function'||original._pkmsvvMaxAutoPick)return false;
  function wrapped(level,offers,complete,...rest){
   if(!enabled()||!full()||!Array.isArray(offers)||!offers.length||
      typeof complete!=='function')
    return original.call(this,level,offers,complete,...rest);
   const available=offers.filter(card=>card&&typeof card.apply==='function');
   if(!available.length)return original.call(this,level,offers,complete,...rest);
   const selected=available[Math.floor(Math.random()*available.length)];
   // Complete the exact native level-up queue, without showing a card UI.
   // A new task frame avoids reentrancy when several levels are pending.
   setTimeout(()=>complete(selected),0);
   return undefined;
  }
  wrapped._pkmsvvMaxAutoPick=true;run.showLevelUp=wrapped;return true;
 }
 // Arena gives tournament wins/points, never persistent wild Shiny claims.
 // Suppress the REAL callback and DB grant, not only the results decoration.
 // Both wrappers are guarded by active mode, so Explore/normal Co-op continue
 // granting catches with the original implementation.
 function ensureArenaShinyGuard(){
  const caught=G.onShinyCaught;
  if(typeof caught==='function'&&!caught._pkmsvvArenaNoShiny){
   const wrapper=function(...args){
    if(arenaMatch())return false;
    return caught.apply(this,args);
   };
   wrapper._pkmsvvArenaNoShiny=true;G.onShinyCaught=wrapper;
  }
  const db=G.DB,grant=db?.grantShiny;
  if(typeof grant==='function'&&!grant._pkmsvvArenaNoShiny){
   const wrapper=function(...args){
    if(arenaMatch())return false;
    return grant.apply(this,args);
   };
   wrapper._pkmsvvArenaNoShiny=true;db.grantShiny=wrapper;
  }
  const show=G.RunUI?.showOver;
  if(typeof show==='function'&&!show._pkmsvvArenaNoShiny){
   const wrapper=function(summary,...rest){
    if(arenaMatch()&&summary&&typeof summary==='object')
     summary={...summary,caught:[]};
    return show.call(this,summary,...rest);
   };
   wrapper._pkmsvvArenaNoShiny=true;G.RunUI.showOver=wrapper;
  }
 }
 function ensureSpeed(){
  let button=byId('pkmsvv-speed-button'),indicator=byId('pkmsvv-active-auto');
  if(!button){
   button=document.createElement('button');button.id='pkmsvv-speed-button';
   button.className='pkmsvv-speed-button';button.type='button';
   button.addEventListener('pointerdown',e=>e.stopPropagation());
   button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setSpeed(!fast);});
   document.body.append(button);
  }
  if(!indicator){indicator=document.createElement('span');indicator.id='pkmsvv-active-auto';
   indicator.className='pkmsvv-active-auto';document.body.append(indicator);}
  if(fast&&!canSpeed())setSpeed(false); // room mode/peer changed mid-run
  button.hidden=!canSpeed();indicator.hidden=!playing()||!autoDash;
  refreshLabels();
 }
 function toggleDash(){
  if(!playing())return false;
  autoDash=!autoDash;
  toast(autoDash?'Đã BẬT tự động dùng kỹ năng (giữ F 2 giây để tắt).':
   'Đã TẮT tự động dùng kỹ năng.',
   autoDash?'Auto active skill ON (hold F for 2 seconds to disable).':
   'Auto active skill OFF.');
  refreshLabels();return true;
 }
 function dashKey(){
  const raw=G.PKMSVVPadOrb?.keyboardBindings?.()?.dash||
   G.Settings?.get?.('keys')?.dash||'keyf';
  return String(raw).toLowerCase();
 }
 function cancelHold(){
  held=false;
  if(heldTimer!==null){clearTimeout(heldTimer);heldTimer=null;}
 }
 document.addEventListener('keydown',e=>{
  if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||!playing()||
     String(e.code||'').toLowerCase()!==dashKey())return;
  cancelHold();held=true;
  heldTimer=setTimeout(()=>{heldTimer=null;if(held){held=false;toggleDash();}},2000);
 },true);
 document.addEventListener('keyup',e=>{
  if(String(e.code||'').toLowerCase()===dashKey())cancelHold();
 },true);
 if(typeof window!=='undefined')window.addEventListener('blur',cancelHold);
 function target(pl){
  const enemies=G.EnemyMgr?.all?.()||[];let nearest=null,dist=Infinity;
  for(const e of enemies){
   if(!e||e.dead||e.remote||e.friendly||e.pkmsvvFriendly||e.isSupport||
    !Number.isFinite(e.x)||!Number.isFinite(e.y))continue;
   const n=(e.x-pl.x)**2+(e.y-pl.y)**2;
   if(n<dist){dist=n;nearest=e;}
  }
  return nearest;
 }
 function castTowardsNearest(){
  if(!autoDash||!playing()||typeof G.Combat?.manualDash!=='function')return false;
  if([...document.querySelectorAll('.scr.dim:not(.hidden)')].some(x=>!x.hidden))return false;
  const pl=G.Game.player,e=target(pl);if(!e)return false;
  const dx=e.x-pl.x,dy=e.y-pl.y,distance=Math.hypot(dx,dy);
  if(!(distance>2))return false;
  const before=pl.lanBotAxis;
  try{
   pl.lanBotAxis={x:dx/distance,y:dy/distance};
   return !!G.Combat.manualDash(pl);
  }finally{pl.lanBotAxis=before;}
 }
 const oldStart=G.Game?.startRun;
 if(typeof oldStart==='function'&&!oldStart._pkmsvvRuntimeControls){
  function wrapped(...args){
   fast=false;autoDash=false;cancelHold();choiceToken=null;choicePending=false;lastSpeedState=null;
   G.Game?.debugSpeed?.(1);
   return oldStart.apply(this,args);
  }
  wrapped._pkmsvvRuntimeControls=true;G.Game.startRun=wrapped;
 }
 function frame(ts){
  if(ts-lastUI>=250){
   lastUI=ts;installAutoPick();ensureArenaShinyGuard();ensureSpeed();ensureSettings();ensureLevelup();
    const state=G.Game?.state;
    if(fast&&state==='playing'&&lastSpeedState!=='playing'&&canSpeed())
     G.Game?.debugSpeed?.(1.5); // restore after a level/choice popup
    lastSpeedState=state;
   // Royale already checks this from its native draw loop; avoid a duplicate.
   if(!G.Royale?.active&&(G.EggRush?.active||G.PKMSVVArenaSolo?.active||
     G.PKMSVVChampionArena?.active||G.PKMSVVArenaPvp?.active)){
    G.PKMSVVEvo?.tryLiveCompetitive?.(G.Game?.player,G.Game?.st?.time||0);
   }
  }
  if(autoDash&&ts-lastCast>=180){lastCast=ts;castTowardsNearest();}
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(frame);
 }
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(frame);
 G.PKMSVVRuntimeControlsQA={full,maxLevel,enabled,setEnabled,canSpeed,arenaMatch,setSpeed,toggleDash,target,castTowardsNearest,ensureLevelup,installAutoPick,ensureArenaShinyGuard,ensureSettings,ensureSpeed};
})();
