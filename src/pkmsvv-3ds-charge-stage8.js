/* 3DS Stage8 native Charge: wind up first, fire the genuine Web beam later.
 * Mirrors src/core/combat.cpp FK_CHARGE: follows player until deadline,
 * then uses the current aim and original wall-clipped beam collision.
 */
G.PKMSVV3DSStage8Charge=(()=>{
 'use strict';
 const old=G.PKMSVV3DSCombatFX;
 if(!old||!G.PKMSVV3DSStage8Moves)throw Error('Stage8 requires Stage7 native combat and move catalog');
 const kind='pkmsvv3ds8-charge';
 const isChargeField=f=>!!f&&f.kind===kind;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):a));
 function spawn(fields,p,m,ghost=false){
  if(m?.kind!=='charge')return old.spawn(fields,p,m,ghost);
  if(!Array.isArray(fields)||!p||p.dead)return false;
  if(m.only?.length&&!m.only.includes(Number(p.mon?.dex)))return false;
  if(fields.filter(isChargeField).length>=12||fields.length>=250)return false;
  const at=clamp(m.charge||.75,.08,5);
  const f={kind,t:0,at,life:at+.5,owner:p,m,ghost:!!ghost,x:p.x,y:p.y,
   col:G.U?.TYPE_COLOR?.[m.type]||'#ffffff',done:false};
  fields.push(f);
  // Visual notice. A ghost cast may render but never cause the delayed hit.
  G.FX?.ring?.(p.x,p.y-(G.LIFT||12)*.5,(p.r||12)*3.2,(p.r||12)*.8,f.col,at,2);
  return true;
 }
 function update(f,dt,hooks={}){
  if(!isChargeField(f))return old.update(f,dt,hooks);
  const p=f.owner;
  if(!p||p.dead||f.done)return true;
  f.x=p.x;f.y=p.y;
  if(f.t<f.at)return false;
  f.done=true;
  if(!f.ghost){
   if(typeof hooks.beam!=='function')throw Error('Stage8 delayed Charge needs original beam hook');
   hooks.beam(p,f.m);
  }
  return true;
 }
 function draw(ctx,f,now){
  if(!isChargeField(f))return old.draw(ctx,f,now);
  if(!ctx||f.done)return;
  const p=f.owner;if(!p||p.dead)return;
  const progress=clamp(f.t/Math.max(.08,f.at),0,1);
  ctx.save();
  ctx.globalAlpha=.2+.55*progress;
  ctx.strokeStyle=f.col;ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(p.x,p.y-(G.LIFT||12)*.4,
   (p.r||12)*(1.1+.5*(1-progress)),(p.r||12)*(.55+.2*(1-progress)),
   0,0,Math.PI*2);ctx.stroke();
  ctx.restore();
 }
 G.PKMSVV3DSCombatFX={
  ...old,
  isPortField:f=>isChargeField(f)||!!old.isPortField?.(f),
  spawn,update,draw
 };
 return {isChargeField,spawn,update,draw};
})();