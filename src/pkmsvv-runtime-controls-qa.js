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
 const full=()=>Array.isArray(G.Game?.player?.moves)&&G.Game.player.moves.length>=8;
 const playing=()=>G.Game?.state==='playing'&&!G.Game?.player?.dead;
 const byId=id=>document.getElementById(id);
 let fast=false,autoDash=false,held=false,heldTimer=null,choiceToken=null,choicePending=false;
 let lastCast=0,lastUI=0,lastChoiceShow=false;
 function toast(vi,en){G.UI?.toast?.(L(vi,en),2000);}
 // Never speed up a real multiplayer simulation or any Arena match.
 // AI matches are eligible only when the room is host-owned and every other
 // member is a bot. Unknown peer metadata fails closed, rather than desyncing.
 function arenaMatch(){
  return !!(G.PKMSVVArenaSolo?.active||G.PKMSVVChampionArena?.active||
   G.PKMSVVArenaPvp?.active||G.ArenaPvp?.active);
 }
 function isBot(member){return !!(member?.bot||member?.lanBot||member?.isAI||member?.ai);}
 function canSpeed(){
  if(!playing()||arenaMatch())return false;
  const room=G.Social?.room,mode=String(room?.mode||'').toLowerCase();
  if(['coop','co-op','arena','champion','pvp'].includes(mode))return false;
  if(G.Coop?.mode==='coop'||G.Coop?.mode==='arena')return false;
  const members=room?.members;
  const humans=Array.isArray(members)?members.filter(m=>m&&!isBot(m)):null;
  if(humans?.length>1)return false;
  if(G.Coop?.active){
   if(!room?.isHost||!['royale','eggrush'].includes(mode)||
     !humans||humans.length!==1)return false;
   const uid=G.Social?.uid||G.Game?.player?.uid;
   if(uid&&humans[0]?.uid!==uid)return false;
   if(!G.Royale?.active&&!G.EggRush?.active)return false;
  }
  return true;
 }
 function setSpeed(on){
  if(typeof G.Game?.debugSpeed!=='function')return false;
  if(on&&!canSpeed())return false;
  fast=!!on;
  G.Game.debugSpeed(fast?1.5:1);
  refreshLabels();return true;
 }
 function autoButtonLabel(){return L('⚡ Tự chọn sau 8 kỹ năng: ','⚡ Auto-pick after 8 skills: ')+
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
  name.textContent=L('Tự chọn 1/3 phần thưởng khi đủ 8 kỹ năng','Auto-pick 1 of 3 rewards after learning 8 skills');
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
  // Respect the user's first encounter: turning on auto mode is a deliberate
  // button or Settings action; we never silently select on a new profile.
  if(!enabled()||choicePending)return;
  const choices=[...cards.children].filter(el=>!el.disabled&&!el.hidden&&
   el.getAttribute('aria-disabled')!=='true').slice(0,3);
  if(!choices.length)return;
  const token=choices[0];if(choiceToken===token)return;
  choiceToken=token;choicePending=true;
  setTimeout(()=>{
   choicePending=false;
   if(!enabled()||!full()||screen.classList.contains('hidden')||!token.isConnected)return;
   const current=[...cards.children].filter(el=>!el.disabled&&!el.hidden&&
    el.getAttribute('aria-disabled')!=='true').slice(0,3);
   if(current[0]!==token||!current.length)return;
   current[Math.floor(Math.random()*current.length)]?.click?.();
  },180);
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
   fast=false;autoDash=false;cancelHold();choiceToken=null;choicePending=false;
   G.Game?.debugSpeed?.(1);
   return oldStart.apply(this,args);
  }
  wrapped._pkmsvvRuntimeControls=true;G.Game.startRun=wrapped;
 }
 function frame(ts){
  if(ts-lastUI>=250){
   lastUI=ts;ensureSpeed();ensureSettings();ensureLevelup();
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
 G.PKMSVVRuntimeControlsQA={full,enabled,setEnabled,canSpeed,arenaMatch,setSpeed,toggleDash,target,castTowardsNearest,ensureLevelup,ensureSettings,ensureSpeed};
})();
