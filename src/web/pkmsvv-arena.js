'use strict';
// Shared competitive world boundary. Only the simulation Host applies penalties.
G.Arena=(()=>{
 let mode=null,center={x:0,y:0},time=0,epoch=0,disabled=false,serial=0;
 const outside=new Map(),received=new Map(),views=new Map(),totals=new Map(),applied=new Map(),zoneDead=new Set();
 const radiusAt=(m,t)=>m==='eggrush'?1600:m==='royale'?
  t<=240?1650:t<=480?1650-(t-240)*450/240:t<=720?1200-(t-480)*300/240:900:Infinity;
 const exempt=()=>!!(G.Rift?.inArena||G.Judgment?.active||G.World?.arena);
 const radius=()=>radiusAt(mode,time);
 const enabled=()=>!!mode&&!disabled&&!exempt();
 function begin(cfg){
  mode=['royale','eggrush'].includes(cfg?.mode)?cfg.mode:null;
  center={x:0,y:0};time=0;epoch=Number(cfg?.seed)||0;disabled=false;serial=0;
  outside.clear();received.clear();views.clear();totals.clear();applied.clear();zoneDead.clear();
 }
 function validSpawn(x,y,pad=24){return !enabled()||Math.hypot(x-center.x,y-center.y)<=radius()-pad;}
 function clampGoal(p,actor){
  if(!enabled()||validSpawn(p.x,p.y,130))return p;
  const a=Math.atan2(p.y-center.y,p.x-center.x),r=Math.max(0,radius()-140);
  for(let i=0;i<32;i++){
   const angle=a+i*.35,d=r-Math.floor(i/8)*64,x=center.x+Math.cos(angle)*d,y=center.y+Math.sin(angle)*d;
   if(G.World.isFree(x,y,(actor?.r||14)+2)&&!G.World.isLiquid(x,y))return {x,y};
  }
  return {x:center.x,y:center.y};
 }
 function motion(pl,old){
  if(!enabled()||mode!=='eggrush'||pl.dead||!old)return;
  const r=radius()-(pl.r||0),d=Math.hypot(pl.x-center.x,pl.y-center.y),prior=Math.hypot(old.x-center.x,old.y-center.y);
  if(d<=r||d<prior-1e-6)return; // Always permit inward movement from outside.
  const k=r/Math.max(d,1),x=center.x+(pl.x-center.x)*k,y=center.y+(pl.y-center.y)*k;
  if(prior<=r+2&&G.World.isFree(x,y,(pl.r||14)+2)&&!G.World.isLiquid(x,y)){pl.x=x;pl.y=y;}
  else{pl.x=old.x;pl.y=old.y;}
 }
 function damage(pl,hp,dead){
  pl.hp=Math.max(0,Math.min(pl.hp,hp));
  if(dead||pl.hp<=0){pl.hp=0;pl.dead=true;pl.reviveT=0;pl.anim?.play?.('Faint',{hold:true});G.Projectiles?.clearOrbs?.(pl);}
 }
 function update(dt,t,players){
  if(!mode)return;
  if(G.Coop.isHost){time=Math.max(0,t);disabled=exempt();}
  if(!enabled()||!G.Coop.isHost){if(disabled)outside.clear();return;}
  const live=new Set(players.filter(Boolean).map(p=>p.uid));
  for(const id of outside.keys())if(!live.has(id))outside.delete(id);
  if(mode!=='royale')return;
  for(const p of players){
   if(!p?.uid||p.dead||validSpawn(p.x,p.y,0)){outside.delete(p?.uid);continue;}
   const s=outside.get(p.uid)||{elapsed:0,charged:0};s.elapsed+=dt;outside.set(p.uid,s);
   const ticks=Math.floor(Math.max(0,s.elapsed-10));
   if(ticks<=s.charged)continue;
   const loss=(ticks-s.charged)*p.maxHp*.01,hp=Math.max(0,p.hp-loss);s.charged=ticks;
   damage(p,hp,hp<=0);
   const total=(totals.get(p.uid)||0)+loss;totals.set(p.uid,total);if(p.dead)zoneDead.add(p.uid);
   G.Coop.broadcast(['az',epoch,p.uid,hp,p.dead,++serial,loss,total]);
  }
 }
 function onEvent(ev){
  if(G.Coop.isHost||ev[0]!=='az'||ev[1]!==epoch||ev[2]!==G.Game.player?.uid||!Number.isFinite(ev[3]))return;
  if(!(ev[5]>(received.get(ev[2])||0)))return;
  received.set(ev[2],ev[5]);const p=G.Game.player;
  if(Number.isFinite(ev[7]))applyTotal(ev[7],ev[4]);
  else damage(p,Number.isFinite(ev[6])&&ev[6]>0?p.hp-ev[6]:ev[3],ev[4]);
 }
 function applyTotal(total,dead){const p=G.Game.player;if(!p||!Number.isFinite(total)||total<0)return;
  const before=applied.get(p.uid)||0;if(total<before)return;applied.set(p.uid,total);
  if(total>before||dead)damage(p,p.hp-(total-before),dead);
 }
 const snapshot=()=>({mode,x:center.x,y:center.y,time,epoch,disabled,damage:Object.fromEntries(totals),dead:[...zoneDead]});
 function receive(s){
  if(G.Coop.isHost||!s||s.epoch!==epoch||s.mode!==mode||!Number.isFinite(s.time)||s.time<time)return;
  time=s.time;disabled=!!s.disabled;applyTotal(s.damage?.[G.Game.player?.uid],s.dead?.includes(G.Game.player?.uid));
 }
 function view(uid,v){
  if(!G.Coop.isHost||!Array.isArray(v)||v.length!==4||!v.every(Number.isFinite))return;
  // Use a conservative rectangle; malformed/unbounded cameras are rejected.
  if(v[2]<100||v[2]>4096||v[3]<100||v[3]>4096)return;
  views.set(uid,{x:v[0],y:v[1],w:v[2],h:v[3]});
 }
 function visible(x,y,players,pad=70){
  const cam=G.Camera,baseW=Math.max(768,cam?.w||0),baseH=Math.max(420,cam?.h||0);
  return players.some(p=>{
   if(!p)return false;
   const v=p.uid===G.Game?.player?.uid?{x:cam?.x??p.x,y:cam?.y??p.y,w:baseW,h:baseH}:views.get(p.uid);
   return Math.abs(x-(v?.x??p.x))<Math.max(baseW,v?.w||0)/2+pad&&
    Math.abs(y-(v?.y??p.y))<Math.max(baseH,v?.h||0)/2+pad;
  });
 }
 function draw(ctx,w,h){
  const p=G.Game.player,cam=G.Camera;if(!enabled()||!p||p.dead||!cam?.scale)return;
  const d=Math.hypot(p.x-center.x,p.y-center.y),r=radius(),near=d>=r-150,out=d>r;
  const vi=G.I18n?.lang==='vi',royale=mode==='royale';
  // World-space ring: the same border for Host/Guest, never a circle glued
  // to each player's camera. Only draw when the ring crosses this viewport.
  const cx=(center.x-cam.left())*cam.scale,cy=(center.y-cam.top())*cam.scale,R=r*cam.scale;
  ctx.save();
  if(cx+R>=-8&&cy+R>=-8&&cx-R<=w+8&&cy-R<=h+8){
   ctx.strokeStyle=royale?'rgba(255,77,85,.9)':'rgba(255,196,109,.7)';
   ctx.lineWidth=royale?3:2;ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.stroke();
  }
  if(royale){
   // Lightweight permanent legend instead of a full-screen tutorial.
   const until=time<240?240-time:time<480?480-time:time<720?720-time:0;
   const fmt=Math.floor(until/60)+':'+String(Math.ceil(until%60)).padStart(2,'0');
   const hint=time<240?(vi?'Vòng đỏ thu sau '+fmt:'Red circle shrinks in '+fmt):
    time<720?(vi?'Vòng đỏ đang thu':'Red circle shrinking'):
    (vi?'Vòng đỏ đã thu tối đa':'Final red circle');
   ctx.textAlign='center';ctx.font='bold 11px sans-serif';
   ctx.strokeStyle='rgba(5,18,29,.9)';ctx.lineWidth=3;ctx.fillStyle='#ffb3b7';
   ctx.strokeText(hint,w/2,118,Math.max(90,w-190));ctx.fillText(hint,w/2,118,Math.max(90,w-190));
   if(out){ctx.fillStyle='rgba(255,40,40,.045)';ctx.fillRect(0,0,w,h);}
  }
  if(near){
   // Near/outside warning only; never cover skill buttons or the score panel.
   ctx.save();ctx.translate(w/2,h-116);ctx.rotate(Math.atan2(center.y-p.y,center.x-p.x));
   ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(-5,-5);ctx.lineTo(-5,5);ctx.closePath();
   ctx.fillStyle=royale?'#ff8f94':'#ffe19d';ctx.fill();ctx.restore();
   const msg=!royale?(vi?'Về vùng chơi':'Return to arena'):
    out?(vi?'Ngoài vòng đỏ · Về tâm!':'Outside red circle · Return!'):
    (vi?'Gần rìa vòng đỏ':'Near the red circle');
   ctx.textAlign='center';ctx.font='bold 11px sans-serif';ctx.fillStyle=royale?'#ffb1b8':'#ffe19d';
   ctx.strokeStyle='#092536';ctx.lineWidth=3;
   ctx.strokeText(msg,w/2,h-96,Math.max(80,w-180));ctx.fillText(msg,w/2,h-96,Math.max(80,w-180));
  }
  ctx.restore();
 }
 const openingBoost=t=>mode==='royale'?1+1.3*(1-Math.max(0,Math.min(180,t))/180):1;
 return {begin,update,onEvent,snapshot,receive,view,visible,motion,validSpawn,clampGoal,draw,radiusAt,openingBoost,
  get radius(){return radius();},get active(){return enabled();},get mode(){return mode;}};
})();
