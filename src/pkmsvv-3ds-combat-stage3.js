/* PKMSVV 3DS Stage 3 — real Punch/Cross/Storm attack families.
 * Adapted from native 3DS v1.0.0 combat.cpp FK_PUNCH/FK_CROSS/FK_BOLT.
 * Always call the original Web hit/blast functions for type/crit/boss/loot.
 */
G.PKMSVV3DSStage3FX = (() => {
 'use strict';
 const prior=G.PKMSVV3DSCombatFX;
 if(!prior||!G.PKMSVV3DSMoveFamilies)throw Error('3DS Stage 3 requires previous skill port');
 const KINDS=new Set(['punch','cross','storm']),PREFIX='pkmsvv3ds-';
 const num=(n,d)=>Number.isFinite(Number(n))?Number(n):d;
 const limit=(n,a,b)=>Math.max(a,Math.min(b,num(n,a)));
 const visibles=(x,y,r)=>!G.Camera?.sees||G.Camera.sees(x,y,r);
 const query=(x,y,r)=>(G.EnemyMgr?.queryCircle?.(x,y,r)||[]).slice(0,80);
 const color=m=>G.U?.TYPE_COLOR?.[m.type]||'#ffffff';
 const vis=m=>G.VFX?.forMove?.(m)||{pal:m.type,proj:'ball'};
 const extra=f=>!!f&&['pkmsvv3ds-punch','pkmsvv3ds-cross','pkmsvv3ds-storm'].includes(f.kind);
 const inArc=(x,y,ex,ey,a,half)=>{
   const diff=Math.atan2(Math.sin(Math.atan2(ey-y,ex-x)-a),
                         Math.cos(Math.atan2(ey-y,ex-x)-a));
   return Math.abs(diff)<=half;
 };
 const inCross=(f,x,y,r)=>{
   const dx=Math.abs(x-f.x),dy=Math.abs(y-f.y)/0.6;
   return (dx<=f.r+r&&dy<=f.w/2+r)||(dy<=f.r+r&&dx<=f.w/2+r);
 };
 function base(p,m,ghost){
   return {kind:PREFIX+m.kind,owner:p,m,ghost:!!ghost,vis:vis(m),
    col:color(m),x:p.x,y:p.y,t:0,life:0.7,r:limit(m.radius,8,250),
    dmg:num(m.dmg,0)*num(p.atk,1)};
 }
 function spawn(fields,p,m,ghost=false){
   if(!KINDS.has(m?.kind))return prior.spawn(fields,p,m,ghost);
   if(!p||!Array.isArray(fields))return false;
   if(m.only?.length&&!m.only.includes(Number(p.mon?.dex)))return false;
   if(fields.filter(f=>typeof f.kind==='string'&&f.kind.startsWith(PREFIX)).length>=24)return false;
   if(m.kind==='punch'){
     const f=base(p,m,ghost);
     f.left=limit(Math.round(m.count||3),1,7);f.index=0;f.next=0;
     f.life=f.left*0.09+0.35;
     fields.push(f);return true;
   }
   if(m.kind==='cross'){
     const tg=(p.target&&!p.target.dead)?p.target:null;
     if(!tg)return false; // Native Cross requires a nearby target.
     const f=base(p,m,ghost);f.x=tg.x;f.y=tg.y;
     f.w=limit(m.width,12,95);f.delay=0.3;f.life=0.7;f.struck=false;
     fields.push(f);return true;
   }
   const targets=(G.EnemyMgr?.all?.()||[]).filter(e=>
     e&&!e.dead&&!e.arceus&&visibles(e.x,e.y,10)).slice(0,96);
   if(!targets.length)return false;
   const count=limit(Math.round(m.count||1),1,12),room=Math.max(0,24-fields.filter(
     f=>typeof f.kind==='string'&&f.kind.startsWith(PREFIX)).length);
   for(let i=0;i<Math.min(count,room);i++){
     const e=targets[Math.floor(Math.random()*targets.length)];
     const f=base(p,m,ghost);
     f.x=e.x+(Math.random()-.5)*24;f.y=e.y+(Math.random()-.5)*16;
     f.t=-i*.09;f.delay=.32;f.life=.64;f.struck=false;
     fields.push(f);
   }
   return true;
 }
 function update(f,dt,hooks={}){
   if(!extra(f))return prior.update(f,dt,hooks);
   const p=f.owner,m=f.m,fx=G.FX;
   if(!p||p.dead)return true;
   const kind=m.kind,delta=limit(dt,0,0.15);
   if(kind==='punch'){
     f.next-=delta;
     if(f.next>0)return false;
     f.next=Math.max(0.01,f.next+.09);
     f.index++;f.left--;
     const last=f.left<=0;
     const a=num(p.aim,0)+(f.index%2?-.18:.18);
     const r=limit(m.radius,8,125),half=limit(m.arc,0.25,3.1)/2;
     if(visibles(p.x,p.y,r))fx?.slash?.(p.x+Math.cos(a)*10,
        p.y+Math.sin(a)*10-6,a,r,num(m.arc,1)*.7,f.col,f.vis);
     if(!f.ghost){
       let healing=0;
       const d=f.dmg*(last?1.4:1);
       for(const e of query(p.x,p.y,r)){
         if(!e||e.dead||!inArc(p.x,p.y,e.x,e.y,a,half))continue;
         hooks.hit?.(p,e,d,f.col,e.x-p.x,e.y-p.y,last?70:10,m);
         if(!e.arceus&&num(m.drain,0)>0)healing+=num(m.drain,0);
         if(last&&!e.dead&&num(m.stun,0)>0){
           const seconds=num(m.stun,0)*(e.boss||e.judge?.35:1);
           if(typeof e.applyStun==='function')e.applyStun(seconds);
           else if(typeof e.applySlow==='function')e.applySlow(1,seconds);
         }
         if(last&&!e.dead&&num(m.zap,0)>0){
           let z=0;
           for(const other of query(e.x,e.y,150)){
             if(other===e||other.dead||other.arceus)continue;
             hooks.hit?.(p,other,d*.6,f.col,other.x-e.x,other.y-e.y,0,m);
             if(++z>=limit(Math.round(m.zap),1,4))break;
           }
         }
       }
       for(const obj of (G.World?.propsInCircle?.(p.x,p.y,r)||[]).slice(0,64)){
         if(obj.gone||!inArc(p.x,p.y,obj.x,obj.y,a,half))continue;
         G.World?.damageProp?.(obj,d,f.col);
       }
       if(healing>0)p.heal?.(Math.min(healing,6));
     }
     return last;
   }
   if(kind==='cross'){
     if(f.t<f.delay)return false;
     if(!f.struck){
       f.struck=true;
       if(visibles(f.x,f.y,f.r)){
         fx?.ring?.(f.x,f.y,4,f.w*1.4,f.col,.3,4);
         for(const [sx,sy] of [[1,0],[-1,0],[0,1],[0,-1]])
           for(let i=1;i<=4;i++)fx?.burst?.(f.x+sx*f.r*i/4,
             f.y+sy*f.r*.6*i/4-4,f.col,4,110);
         if(!f.ghost)G.Camera?.kick?.(.2);
       }
       if(!f.ghost){
         for(const e of query(f.x,f.y,f.r+35)){
           if(e&&!e.dead&&inCross(f,e.x,e.y,num(e.r,0)))
             hooks.hit?.(p,e,f.dmg,f.col,e.x-f.x,e.y-f.y,40,m);
         }
         for(const obj of (G.World?.propsInCircle?.(f.x,f.y,f.r)||[]).slice(0,64)){
           if(obj&&!obj.gone&&inCross(f,obj.x,obj.y,num(obj.r,8)))
             G.World?.damageProp?.(obj,f.dmg,f.col);
         }
       }
     }
     return true;
   }
   if(f.t<f.delay)return false;
   if(!f.struck){
     f.struck=true;
     if(visibles(f.x,f.y,60)){
       fx?.ring?.(f.x,f.y,3,f.r,'#ffffff',.2,3);
       fx?.beam?.(f.x,f.y-150,Math.PI/2,150,10,f.col,{pal:m.type,beam:'lightning'});
       fx?.burst?.(f.x,f.y-4,f.col,8,140);
     }
     if(!f.ghost)hooks.blast?.(f,f.r);
   }
   return f.t>=f.delay+.16;
 }
 function draw(ctx,f,now){
   if(!extra(f))return prior.draw(ctx,f,now);
   if(!ctx)return;
   if(f.m.kind==='punch')return;
   if(f.m.kind==='cross'){
     const k=f.struck?.22:.5;
     ctx.globalAlpha=k;ctx.strokeStyle=f.col;ctx.lineWidth=3;
     ctx.beginPath();ctx.moveTo(f.x-f.r,f.y);ctx.lineTo(f.x+f.r,f.y);
     ctx.moveTo(f.x,f.y-f.r*.6);ctx.lineTo(f.x,f.y+f.r*.6);ctx.stroke();
   }else if(!f.struck){
     ctx.globalAlpha=.22;ctx.strokeStyle=f.col;ctx.lineWidth=2;
     ctx.beginPath();ctx.ellipse(f.x,f.y,f.r,f.r*.55,0,0,Math.PI*2);ctx.stroke();
   }
 }
 G.PKMSVV3DSCombatFX={
   ...prior,
   spawn,
   update,
   draw
 };
 return {spawn,update,draw,isStage3Field:extra};
})();
