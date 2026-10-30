'use strict';
/* Mega Lucario PROTOTYPE — no Arena reward / Gacha rolls or save grants.
 * Pinned SpriteCollab art is packed offline under virtual sprite dex 10448;
 * the real Pokémon stays dex #448 in save, Pokédex, skills and Co-op identity.
 * PvP / LAN / bot runs are deliberately disabled until replication is tested.
 */
G.MegaLucario=(()=>{
 const BASE=448,SPRITE=10448,DURATION=30,COOLDOWN=0.7;
 // Game-accurate Mega Lucario stat ratios (Lucario -> Mega Lucario):
 // Atk 110->145, Def 70->88, SpA 115->140, SpD 70->70, Speed 90->112.
 const RATIOS=Object.freeze({physical:145/110,special:140/115,defense:88/70,speed:112/90});
 let preview=false,busy=false,button=null,menuButton=null;
 const saved=()=>G.DB&&G.DB.save;
 const toast=t=>{if(G.UI&&G.UI.toast)G.UI.toast(t);};
 const player=()=>G.Game&&G.Game.player;
 const owned=()=>!!(saved()&&saved().megaStones&&saved().megaStones.lucarionite);
 function eligible(){
  const p=player();
  return !!(p&&p.dex===BASE&&!p.dead&&G.Game.state==='playing'&&
   !(G.Coop&&G.Coop.active)&&saved()?.pkmsvvChapter7Seen===true&&!p._megaUsed&&!p._megaActive&&(preview||owned())&&
   (!p.shiny||G.Sprites.hasShiny?.(SPRITE)===true));
 }
 function previewUnlock(){
  const s=saved();
  if(!s?.pkmsvvChapter7Seen||s.partner!==BASE||!s.owned||!s.owned[BASE])return false;
  preview=true;
  toast('Mega Lucario BETA: vào trận solo, nhấn phím 4 hoặc nút MEGA (30 giây).');
  sync();return true;
 }
 function changeAppearance(p,mega){
  const dex=mega?SPRITE:BASE;
  const scale=G.Sprites.playerScale(dex);
  const dir=p.anim&&p.anim.dir||0;
  p.scale=scale;
  p.anim=new G.Sprites.Animator(dex,scale,!!p.shiny&&(!mega||G.Sprites.hasShiny?.(dex)===true));
  p.anim.dir=dir;
  p.r=G.Sprites.playerRadius(dex);
  p.bodyH=G.Sprites.bodyHeight(dex,scale);
 }
 function stop(p){
  if(!p||!p._megaActive||!p._megaBackup)return false;
  const old=p._megaBackup;
  // Restore the original species stat object: never alter the global Pokédex.
  p.mon=old.mon;p.baseAtk=old.atk;p.baseSpd=old.spd;
  // Preserve other cooldown perks/buffs by removing only the Mega factor.
  if(p._megaCdApplied){p.cdMul/=COOLDOWN;p._megaCdApplied=false;}
  p._megaActive=false;p._megaRemaining=0;p._megaBackup=null;
  changeAppearance(p,false);
  sync();return true;
 }
 function activate(p){
  if(!p||!eligible()||p!==player()||!G.SPRITE_META[SPRITE])return false;
  p._megaBackup={mon:p.mon,atk:p.baseAtk,spd:p.baseSpd};
  const mon=p.mon;
  const pa=mon.pa*RATIOS.physical,sa=mon.sa*RATIOS.special;
  p.mon={...mon,pa,sa,atk:Math.max(pa,sa),df:mon.df*RATIOS.defense,
   sd:mon.sd,spd:mon.spd*RATIOS.speed};
  p.baseAtk=p.mon.atk;p.baseSpd=p.mon.spd;
  // The existing Combat and Cast paths already apply this player's cdMul.
  p.cdMul*=COOLDOWN;p._megaCdApplied=true;
  // A ready or partially recharging move also benefits from Mega's -30% CD.
  for(const m of p.moves||[])if(Number.isFinite(m.t)&&m.t>0)m.t*=COOLDOWN;
  p._megaRemaining=DURATION;p._megaUsed=true;p._megaActive=true;
  changeAppearance(p,true);
  if(G.FX&&G.FX.ring)G.FX.ring(p.x,p.y,15,100,'#7d8fff',0.9,8);
  if(G.Audio&&G.Audio.sfx)G.Audio.sfx('shinyGet');
  toast('MEGA LUCARIO! 30 giây · Chỉ số Mega gốc · Hồi chiêu -30%.');
  sync();return true;
 }
 async function tryActivate(){
  if(busy||!eligible())return false;
  const p=player();busy=true;
  try{
   // Avoid the blank placeholder sprite on the first frame.
   await G.Sprites.preload([SPRITE],3500,!!p.shiny);
   const image=G.Sprites.sheet?.(SPRITE,'Idle',!!p.shiny);
   if(image&&!image.ready)return false;
   return activate(p);
  }finally{busy=false;sync();}
 }
 function tick(p,dt){
  if(p&&p._megaActive){
   if(p.dead||G.Game.state==='over'){stop(p);return;}
   p._megaRemaining-=Math.max(0,dt);
   if(p._megaRemaining<=0)stop(p);
  }
 }
 const STONE_SVG='<svg class="pkmsvv-mega-btn__gem" viewBox="0 0 52 52" aria-hidden="true" focusable="false">'+
  '<defs><linearGradient id="pkmsvv-lucarionite-g" x1="0" y1="0" x2="1" y2="1">'+
  '<stop stop-color="#83f3ff"/><stop offset=".42" stop-color="#b4a1ff"/><stop offset=".8" stop-color="#e45fff"/><stop offset="1" stop-color="#fff1a6"/></linearGradient></defs>'+
  '<path d="M26 2 42 9 50 26 42 43 26 50 10 43 2 26 10 9Z" fill="#f6d786" stroke="#fff4b1" stroke-width="2"/>'+
  '<path d="M26 7 38 13 44 26 38 39 26 45 14 39 8 26 14 13Z" fill="#2b2565" stroke="#a9d7ff" stroke-width="1.7"/>'+
  '<path d="M26 11 39 26 26 41 13 26Z" fill="url(#pkmsvv-lucarionite-g)"/>'+
  '<path d="m16 30 6-11 4 7 4-7 6 11" fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>'+
  '<path d="m12 14 4-4m25 7 3-3" stroke="#fff7c5" stroke-width="2.5" stroke-linecap="round"/>'+
  '</svg>';
 function initUI(){
  if(button||!document.body)return;
  button=document.createElement('button');
  button.id='pkmsvv-mega-lucario-btn';
  button.type='button';
  button.className='pkmsvv-mega-btn';
  button.title='Mega Lucario · Phím 4 · Hồi chiêu -30%';
  button.innerHTML=STONE_SVG+'<span class="pkmsvv-mega-btn__label">MEGA</span>';
  button.style.display='none';
  button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();tryActivate();});
  document.body.appendChild(button);
 }
 function sync(){
  if(!button)return;
  const p=player();
  const show=!!(p&&p.dex===BASE&&G.Game.state==='playing'&&
    !(G.Coop&&G.Coop.active)&&(eligible()||p._megaActive));
  document.body?.classList?.toggle?.('pkmsvv-mega-gamepad',!!G.Pad?.name);
  button.style.display=show?'flex':'none';
  if(!show)return;
  const active=!!p._megaActive;
  button.className='pkmsvv-mega-btn'+(active?' is-active':'');
  button.disabled=busy||active;
  const label=typeof button.querySelector==='function'?button.querySelector('.pkmsvv-mega-btn__label'):null;
  if(label)label.textContent=active?Math.max(0,Math.ceil(p._megaRemaining))+'s':'MEGA';
  button.title=active?'Mega Lucario: '+Math.ceil(p._megaRemaining)+' giây còn lại':'Mega Lucario · Phím 4 · Hồi chiêu -30%';
  button.setAttribute?.('aria-label',button.title);
 }
 function menu(){
  const s=saved();const target=document.getElementById('menu-partner-info');
  if(!target||!s||!s.owned)return;
  if(!menuButton){
   menuButton=document.createElement('button');
   menuButton.id='pkmsvv-mega-preview';
   menuButton.className='btn small ghost';
   menuButton.style.cssText='display:none;margin:8px auto 0;font-size:12px;';
   menuButton.textContent='Thử nghiệm Mega Lucario';
   menuButton.addEventListener('click',previewUnlock);
   target.insertAdjacentElement('afterend',menuButton);
  }
  const show=!!s.pkmsvvChapter7Seen&&s.partner===BASE&&!!s.owned[BASE];
  menuButton.style.display=show?'inline-block':'none';
  menuButton.textContent=preview||owned()?'Mega Lucario đã sẵn sàng (BETA)':'Thử Mega Lucario (BETA, không tốn vé)';
 }
 const originalUpdate=G.Player.prototype.update;
 G.Player.prototype.update=function(dt){
  if(this===player()){
   tick(this,dt);
   if((G.Input?.tap?.('digit4')||G.Input?.tap?.('pkmsvv-mega'))&&eligible())tryActivate();
  }
  return originalUpdate.call(this,dt);
 };
 const originalStart=G.Game.startRun;
 G.Game.startRun=function(...args){
  stop(player());
  const out=originalStart.apply(this,args);
  sync();return out;
 };
 const originalToUI=G.Game.toUI;
 G.Game.toUI=function(...args){stop(player());const out=originalToUI.apply(this,args);sync();return out;};
 const originalQuit=G.Game.quit;
 G.Game.quit=function(...args){stop(player());const out=originalQuit.apply(this,args);sync();return out;};
 const originalMenu=G.MenuUI.open;
 G.MenuUI.open=function(...args){const out=originalMenu.apply(this,args);menu();return out;};
 // Same keyboard/controller Mega input mapping as the regional transformations.
 initUI();
 setInterval(sync,250);
 return {BASE,SPRITE,DURATION,COOLDOWN,RATIOS,owned,eligible,previewUnlock,tryActivate,activate,stop,tick,sync};
})();
