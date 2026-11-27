/* Stage10 gameplay adapter: native 3DS Shove, Stun, Bounce and Geomancy.
 * Spin, Tremor and Quake already execute through the Stage2 real Canvas
 * combat field adapter with hit/blast (not cosmetic-only).
 * Native reference: juanluismm521/pokesurvivor3ds v1.0.0 combat.cpp.
 */
G.PKMSVV3DSStage10Combat=(()=>{
 'use strict';
 const old=G.PKMSVV3DSCombatFX;
 if(!old||!G.PKMSVV3DSStage10Moves)
  throw Error('Stage10 requires prior combat adapters and skill catalog');
 const PREFIX='pkmsvv3ds10-',KINDS=new Set(['shove','stun','buff']);
 const limit=(v,lo,hi)=>Math.min(hi,Math.max(lo,Number.isFinite(Number(v))?Number(v):lo));
 const color=m=>G.U?.TYPE_COLOR?.[m.type]||'#fff';
 const query=(x,y,r)=>(G.EnemyMgr?.queryCircle?.(x,y,r)||[]).slice(0,100);
 const isStage10Field=f=>!!f&&(f.kind===PREFIX+'stun'||f.kind===PREFIX+'shove');
 const spa=p=>p.__pkmsvv3dsSpa||(p.__pkmsvv3dsSpa={n:0,t:0,amount:0});
 function specialMultiplier(p,m){
  if(!p||!m||!(m.cat==='special'||m.pkmsvv3dsCategory==='special'))return 1;
  const b=p.__pkmsvv3dsSpa;
  return b&&b.n>0&&b.t>0 ? 1+limit(b.n,0,9)*limit(b.amount,0,2) : 1;
 }
 function tickPlayer(p,dt){
  if(!p||!p.__pkmsvv3dsSpa)return;
  const b=p.__pkmsvv3dsSpa;
  if(b.t>0){b.t=Math.max(0,b.t-limit(dt,0,.25));if(b.t===0)b.n=0;}
 }
 function reach(m){
  if(!m)return 0;
  if(m.kind==='shove'||m.kind==='spin')return limit(m.radius,0,500)+20;
  if(m.kind==='tremor')return limit(m.radius,0,500);
  if(m.kind==='stun')return 300;
  if(m.kind==='quake')return Math.max(1,m.count|0)*34+limit(m.radius,0,500);
  return 520;
 }
 function needsTarget(m){
  return !!m&&m.pkmsvv3dsNative&&
   ['shove','spin','stun','tremor','bounce','quake'].includes(m.kind);
 }
 function spawn(fields,p,m,ghost=false){
  if(!m||!KINDS.has(m.kind))return old.spawn(fields,p,m,ghost);
  if(!Array.isArray(fields)||!p||p.dead)return false;
  if(m.only?.length&&!m.only.includes(Number(p.mon?.dex)))return false;
  if(m.kind==='buff'){
   if(!ghost){
    const b=spa(p);
    b.n=Math.min(limit(m.stacks,1,9),b.n+1);
    b.amount=limit(m.amount,0,2);
    b.t=limit(m.dur,.1,90);
    G.FX?.dmgText?.(p.x,p.y-(p.bodyH||24)-8,
     'SP.ATK '+b.n+'x',color(m),false);
   }
   G.FX?.ring?.(p.x,p.y-8,p.r||12,(p.r||12)*3,color(m),.4,3);
   return true;
  }
  if(fields.filter(isStage10Field).length>=18||fields.length>=250)return false;
  const target=p.target&&!p.target.dead? p.target:null;
  if(m.kind==='stun' && (!target ||
   Math.hypot(target.x-p.x,target.y-p.y)>300))return false;
  const f={kind:PREFIX+m.kind,owner:p,m,ghost:!!ghost,t:0,
   life:m.kind==='stun'?.76:.25,delay:m.kind==='stun'?.45:0,
   x:m.kind==='stun'?target.x:p.x,y:m.kind==='stun'?target.y:p.y,
   r:limit(m.radius,8,360),col:color(m),
   dmg:Math.max(0,Number(m.dmg)||0)*(Number(p.atk)||1),
   struck:false};
  fields.push(f);
  if(m.kind==='stun')
   G.FX?.ring?.(f.x,f.y,4,f.r,f.col,.45,2);
  return true;
 }
 function update(f,dt,hooks={}){
  if(!isStage10Field(f))return old.update(f,dt,hooks);
  const p=f.owner,m=f.m;
  if(!p||p.dead||f.struck)return true;
  if(f.kind===PREFIX+'stun'&&f.t<f.delay)return false;
  f.struck=true;
  const x=f.kind===PREFIX+'shove'?p.x:f.x;
  const y=f.kind===PREFIX+'shove'?p.y:f.y;
  if(!G.Camera?.sees||G.Camera.sees(x,y,f.r)){
   G.FX?.ring?.(x,y,4,f.r,f.col,.35,4);
   G.FX?.burst?.(x,y-6,f.col,10,140);
  }
  if(f.ghost)return true;
  for(const e of query(x,y,f.r)){
   if(!e||e.dead)continue;
   hooks.hit?.(p,e,f.dmg,f.col,e.x-x,e.y-y,
    f.kind===PREFIX+'shove'?(Number(m.knock)||300):0,m);
   if(f.kind===PREFIX+'stun'&&!e.dead){
    const sec=limit(m.stun||1,.05,6)*((e.boss||e.judge) ? .35 : 1);
    e._pkmsvv3dsStunT=Math.max(e._pkmsvv3dsStunT||0,sec);
   }
  }
  for(const prop of (G.World?.propsInCircle?.(x,y,f.r)||[]).slice(0,64))
   if(prop&&!prop.gone)G.World?.damageProp?.(prop,f.dmg,f.col);
  return true;
 }
 function draw(ctx,f,now){
  if(!isStage10Field(f))return old.draw(ctx,f,now);
  if(!ctx||f.struck||f.kind!==PREFIX+'stun')return;
  const alpha=Math.min(.55,.15+.4*limit(f.t/f.delay,0,1));
  ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=f.col;
  ctx.beginPath();ctx.ellipse(f.x,f.y,f.r,f.r*.62,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=.85;ctx.strokeStyle=f.col;ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(f.x,f.y,f.r,f.r*.62,0,0,Math.PI*2);ctx.stroke();
  ctx.restore();
 }
 // Native rebound: 220 radius, never revisit already-hit IDs, prolong
 // 0.5 seconds per valid bounce. Projectile's original swept collision stays
 // the authority and owns actual damage; we only redirect after an impact.
 function rebound(p,at){
  if(!p?.pkmsvv3dsNative||!(p.bounce>0)||!at||p.orb)return false;
  let target=null,dist=220*220;
  for(const e of query(at.x,at.y,220)){
   if(!e||e.dead||p.hits?.has(e.id))continue;
   const d=(e.x-at.x)**2+(e.y-at.y)**2;
   if(d<dist){dist=d;target=e;}
  }
  if(!target)return false;
  const dx=target.x-at.x,dy=target.y-at.y,
   mag=Math.hypot(dx,dy),speed=Math.hypot(p.vx,p.vy)||300;
  if(mag<.001)return false;
  p.bounce--;
  p.vx=dx/mag*speed;p.vy=dy/mag*speed;
  p.x=at.x;p.y=at.y;p.px=at.x;p.py=at.y;
  p.t=Math.max(0,p.t-.5);
  G.FX?.spark?.(p.x,p.y-(G.LIFT||12),p.color,p.vx/speed,p.vy/speed,3);
  return true;
 }
 G.PKMSVV3DSCombatFX={
  ...old,
  isPortField:f=>isStage10Field(f)||!!old.isPortField?.(f),
  spawn,update,draw
 };
 return {isStage10Field,needsTarget,reach,spawn,update,draw,
  specialMultiplier,tickPlayer,rebound};
})();
