/* Stage6: extra effects missing from original Web projectile pipeline. */
G.PKMSVV3DSStage6ProjectileFX=(()=>{
 'use strict';
 const zones=[], clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||a));
 function payload(m){
  if(!m?.pkmsvv3dsNative||m.kind!=='projectile')return {};
  return {pkmsvv3dsId:m.id,stun:m.stun||0,critUp:m.critUp||0,puddle:m.puddle||0,pr:m.pr||0};
 }
 function rollCrit(player,p){
  if(p?.ghost)return false;
  const chance=clamp((Number(player?.critChance)||0)+(Number(p?.critUp)||0),0,1);
  return chance>0&&Math.random()<chance;
 }
 function puddle(p,x,y){
  if(!p?.pkmsvv3dsId||p.ghost||!p.puddle||p._pkmsvv3dsPuddlePlaced)return;
  if(!Number.isFinite(x)||!Number.isFinite(y))return;
  p._pkmsvv3dsPuddlePlaced=true;
  if(zones.length>=24)zones.shift();
  zones.push({x,y,r:clamp(p.pr||32,6,150),life:clamp(p.puddle,.1,15),t:0,next:.15,
   dmg:Math.max(0,Number(p.dmg)||0),owner:p.owner,color:p.color||'#b86ce5',type:p.mtype||'poison'});
  G.FX?.ring?.(x,y,6,clamp(p.pr||32,6,150),p.color||'#b86ce5',.35,3);
 }
 function onHit(p,e){
  if(!p?.pkmsvv3dsId||p.ghost||!e||e.dead)return;
  if(p.stun>0)e._pkmsvv3dsStunT=Math.max(e._pkmsvv3dsStunT||0,clamp(p.stun,0,3));
  if(p.puddle>0)puddle(p,e.x,e.y);
 }
 function onEnd(p){if(p?.puddle>0&&!p.ghost)puddle(p,p.x,p.y);}
 function update(dt){
  dt=clamp(dt,0,.2);
  for(let i=zones.length-1;i>=0;i--){
   const z=zones[i];z.t+=dt;if(z.t>=z.life){zones.splice(i,1);continue;}
   z.next-=dt;if(z.next>0)continue;
   z.next=Math.max(.05,z.next+.5);
   for(const e of (G.EnemyMgr?.queryCircle?.(z.x,z.y,z.r)||[]).slice(0,90)){
    if(!e||e.dead)continue;
    const mul=(G.Types?.mult?.(z.type,e.types)||1)*(G.Weather?.mult?.(z.type)||1);
    const dmg=Math.max(0,z.dmg*.3*mul);
    if(dmg>0){e.hurt?.(dmg,z.color,e.x-z.x,e.y-z.y,0);
     if(z.owner){z.owner.dmgDealt=(z.owner.dmgDealt||0)+dmg;z.owner.onDealt?.(dmg);}}
    e.applyPoison?.(1);
   }
  }
 }
 function draw(ctx){
  if(!ctx)return;
  for(const z of zones){if(G.Camera?.sees&&!G.Camera.sees(z.x,z.y,z.r))continue;
   ctx.save();ctx.globalAlpha=.22*Math.min(1,(z.life-z.t)*2);
   ctx.fillStyle=z.color;ctx.beginPath();ctx.ellipse(z.x,z.y,z.r,z.r*.6,0,0,Math.PI*2);
   ctx.fill();ctx.restore();}
 }
 function clear(owner){
  if(!owner){zones.length=0;return;}
  for(let i=zones.length-1;i>=0;i--)if(zones[i].owner===owner)zones.splice(i,1);
 }
 return {payload,rollCrit,onHit,onEnd,update,draw,clear,zones};
})();