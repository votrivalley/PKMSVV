'use strict';
/* Mega Lucario PROTOTYPE — no Arena reward / Gacha rolls or save grants.
 * Pinned SpriteCollab art is packed offline under virtual sprite dex 10448;
 * the real Pokémon stays dex #448 in save, Pokédex, skills and Co-op identity.
 * PvP / LAN / bot runs are deliberately disabled until replication is tested.
 */
G.MegaLucario=(()=>{
 const BASE=448,SPRITE=10448,DURATION=30;
 let preview=false,busy=false,button=null,menuButton=null;
 const saved=()=>G.DB&&G.DB.save;
 const toast=t=>{if(G.UI&&G.UI.toast)G.UI.toast(t);};
 const player=()=>G.Game&&G.Game.player;
 const owned=()=>!!(saved()&&saved().megaStones&&saved().megaStones.lucarionite);
 function eligible(){
  const p=player();
  return !!(p&&p.dex===BASE&&!p.dead&&G.Game.state==='playing'&&
   !(G.Coop&&G.Coop.active)&&!p._megaUsed&&!p._megaActive&&(preview||owned()));
 }
 function previewUnlock(){
  const s=saved();
  if(!s||s.partner!==BASE||!s.owned||!s.owned[BASE])return false;
  preview=true;
  toast('Mega Lucario BETA: vào trận solo, nhấn M hoặc nút MEGA (30 giây).');
  sync();return true;
 }
 function changeAppearance(p,mega){
  const dex=mega?SPRITE:BASE;
  const scale=G.Sprites.playerScale(dex);
  const dir=p.anim&&p.anim.dir||0;
  p.scale=scale;
  p.anim=new G.Sprites.Animator(dex,scale,mega?false:p.shiny);
  p.anim.dir=dir;
  p.r=G.Sprites.playerRadius(dex);
  p.bodyH=G.Sprites.bodyHeight(dex,scale);
 }
 function stop(p){
  if(!p||!p._megaActive||!p._megaBackup)return false;
  const old=p._megaBackup;
  p.baseAtk=old.atk;p.baseSpd=old.spd;
  p._megaActive=false;p._megaRemaining=0;p._megaBackup=null;
  changeAppearance(p,false);
  sync();return true;
 }
 function activate(p){
  if(!p||!eligible()||p!==player()||!G.SPRITE_META[SPRITE])return false;
  p._megaBackup={atk:p.baseAtk,spd:p.baseSpd};
  p.baseAtk*=1.18;p.baseSpd*=1.08;
  p._megaRemaining=DURATION;p._megaUsed=true;p._megaActive=true;
  changeAppearance(p,true);
  if(G.FX&&G.FX.ring)G.FX.ring(p.x,p.y,15,100,'#7d8fff',0.9,8);
  if(G.Audio&&G.Audio.sfx)G.Audio.sfx('shinyGet');
  toast('MEGA LUCARIO! 30 giây sức mạnh thức tỉnh.');
  sync();return true;
 }
 async function tryActivate(){
  if(busy||!eligible())return false;
  const p=player();busy=true;
  try{
   // Avoid the blank placeholder sprite on the first frame.
   await G.Sprites.preload([SPRITE],3500,false);
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
 function initUI(){
  if(button||!document.body)return;
  button=document.createElement('button');
  button.id='pkmsvv-mega-lucario-btn';
  button.type='button';button.textContent='MEGA · M';
  Object.assign(button.style,{
   position:'fixed',right:'12px',bottom:'98px',zIndex:'950',
   background:'#433181',border:'2px solid #bcb2ff',borderRadius:'12px',
   color:'#fff',font:'700 13px sans-serif',padding:'11px 14px',
   boxShadow:'0 3px 15px #0009',cursor:'pointer',display:'none'
  });
  button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();tryActivate();});
  document.body.appendChild(button);
 }
 function sync(){
  if(!button)return;
  const p=player();
  const show=!!(p&&p.dex===BASE&&G.Game.state==='playing'&&
    !(G.Coop&&G.Coop.active)&&(eligible()||p._megaActive));
  button.style.display=show?'block':'none';
  if(!show)return;
  button.disabled=busy||p._megaActive;
  button.textContent=p._megaActive?'MEGA '+Math.max(0,Math.ceil(p._megaRemaining))+'s':'MEGA · M';
  button.style.opacity=button.disabled?'0.72':'1';
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
  const show=s.partner===BASE&&!!s.owned[BASE];
  menuButton.style.display=show?'inline-block':'none';
  menuButton.textContent=preview||owned()?'Mega Lucario đã sẵn sàng (BETA)':'Thử Mega Lucario (BETA, không tốn vé)';
 }
 const originalUpdate=G.Player.prototype.update;
 G.Player.prototype.update=function(dt){
  if(this===player())tick(this,dt);
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
 document.addEventListener('keydown',event=>{
  if(event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.key.toLowerCase()!=='m')return;
  if(event.target&&/INPUT|TEXTAREA|SELECT/.test(event.target.tagName||''))return;
  if(eligible()){event.preventDefault();tryActivate();}
 });
 initUI();
 setInterval(sync,250);
 return {BASE,SPRITE,DURATION,owned,eligible,previewUnlock,tryActivate,activate,stop,tick,sync};
})();
