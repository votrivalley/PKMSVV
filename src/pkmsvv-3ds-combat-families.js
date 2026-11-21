/* PKMSVV 3DS native combat families — actual Web Canvas game mechanics.
 * Adapted from juanluismm521/pokesurvivor3ds src/core/combat.cpp v1.0.0.
 * Uses G.FX pixel primitives and original Web hit()/blast() callbacks.
 * Does not touch permanent player saves or replace the 103 original attacks.
 */
G.PKMSVV3DSCombatFX = (() => {
  'use strict';
  const PREFIX = 'pkmsvv3ds-';
  const kinds = new Set(['spin','quake','vortex']);
  const TAU = Math.PI * 2;
  const clamp = (v,a,b) => Math.max(a, Math.min(b, Number(v)||0));
  const typeColor = m => G.U?.TYPE_COLOR?.[m.type] || '#9edaff';
  const visible = (x,y,r) => !G.Camera?.sees || G.Camera.sees(x,y,r);
  const vfx = m => G.VFX?.forMove?.(m) || {pal:m.type,proj:'ball'};
  const isPortField = f => !!f && typeof f.kind==='string' && f.kind.startsWith(PREFIX);
  const fieldName = m => PREFIX + m.kind;
  const query = (x,y,r) => (G.EnemyMgr?.queryCircle?.(x,y,r) || []).slice(0,80);

  function spawn(fields, p, m, ghost=false) {
    if (!Array.isArray(fields) || !p || !m || !kinds.has(m.kind)) return false;
    const kind=fieldName(m), same=fields.filter(f=>f.kind===kind&&f.owner===p);
    // Avoid stacking more than two whirlpools or six transient shockwaves.
    const limit=m.kind==='vortex'?2:6;
    if(same.length>=limit){
      const oldest=fields.findIndex(f=>f.kind===kind&&f.owner===p);
      if(oldest>=0)fields.splice(oldest,1);
    }
    // Hard cap only our fields: no interference with original mines/turrets.
    if(fields.filter(isPortField).length>=24)return false;
    const color=typeColor(m), x=Number(p.x)||0, y=Number(p.y)||0;
    const radius=clamp(m.radius,16,150), n=Math.round(clamp(m.count||3,1,10));
    const base={
      kind,owner:p,ghost:!!ghost,m,vis:vfx(m),col:color,
      x,y,sx:x,sy:y,t:0,life:1,r:radius,
      next:0,step:0,left:n,angle:Number(p.aim)||0,
      ca:Math.cos(Number(p.aim)||0),sa:Math.sin(Number(p.aim)||0),
      dmg:(Number(m.dmg)||0)*(Number(p.atk)||1)
    };
    if(m.kind==='spin'){
      base.life=n*0.13+0.25;
    }else if(m.kind==='quake'){
      base.life=n*0.07+0.25;
      if(!ghost)G.Camera?.kick?.(0.10);
    }else{
      const tg=p.target && !p.target.dead &&
        Math.hypot(p.target.x-x,p.target.y-y)<=clamp(m.range||300,20,450)
        ? p.target:null;
      base.x=tg?tg.x:x+base.ca*120;
      base.y=tg?tg.y:y+base.sa*100;
      base.sx=base.x;base.sy=base.y;
      base.life=clamp(m.dur||2.6,0.5,5);
      base.tick=0.15;
      base.pull=clamp(m.pull||140,0,220);
      G.FX?.ring?.(base.x,base.y,base.r,6,color,0.4,3);
    }
    fields.push(base);
    return true;
  }

  function update(f, dt, hooks={}) {
    if (!isPortField(f)) return false;
    if (!f.owner || f.owner.dead) return true;
    // Original game already advances field.t; our own next/tick counters
    // must not advance time twice. Clamp pathological frame jumps.
    const delta=clamp(dt,0,0.15);
    const fx=G.FX, p=f.owner, m=f.m, kind=f.kind.slice(PREFIX.length);
    if(kind==='spin') {
      f.next-=delta;
      if(f.next<=0&&f.left>0){
        f.next+=0.13;
        const a=f.angle, x=p.x, y=p.y;
        f.x=x;f.y=y;
        if(visible(x,y,140))fx?.slash?.(x,y-(G.LIFT||10)*0.5,a,f.r,3.6,f.col,f.vis);
        f.angle+=2.2;
        if(!f.ghost){
          for(const e of query(x,y,f.r)){
            if(!e.dead)hooks.hit?.(p,e,f.dmg,f.col,e.x-x,e.y-y,40,m);
          }
          for(const obj of (G.World?.propsInCircle?.(x,y,f.r)||[])){
            G.World.damageProp?.(obj,f.dmg,f.col);
          }
        }
        f.left--;
      }
      return f.left<=0;
    }
    if(kind==='quake'){
      f.next-=delta;
      let steps=0;
      while(f.next<=0 && f.left>0 && steps++<3){
        f.next+=0.07;
        f.step++;f.left--;
        const x=f.sx+f.ca*f.step*34, y=f.sy+f.sa*f.step*34;
        if(G.World?.isWall?.(x,y))return true;
        f.x=x;f.y=y;
        if(visible(x,y,80)){
          fx?.ring?.(x,y,4,f.r,f.col,0.3,3);
          fx?.burst?.(x,y-4,f.col,6,120);
          for(let k=0;k<2;k++)
            fx?.sp?.('rock',m.type,x+(Math.random()-0.5)*f.r,y-4,
              {vy:-55,life:0.3,scale:0.8});
        }
        if(!f.ghost)hooks.blast?.(f,f.r);
      }
      return f.left<=0;
    }
    if(kind==='vortex'){
      if(!f.ghost){
        for(const e of query(f.x,f.y,f.r*1.4)){
          if(e.dead)continue;
          const dx=f.x-e.x,dy=f.y-e.y,d=Math.hypot(dx,dy);
          if(d<4)continue;
          const strength=(e.boss||e.judge)?0.25:1;
          const step=Math.min(d,f.pull*delta*strength);
          const nx=e.x+dx/d*step,ny=e.y+dy/d*step;
          if(!G.World?.isWall?.(nx,ny)){e.x=nx;e.y=ny;}
        }
      }
      f.tick-=delta;
      if(f.tick<=0) {
        f.tick+=0.4;
        if(!f.ghost)hooks.blast?.(f,f.r);
      }
      // Camera culling and density cap prevent mobile particle floods.
      if(visible(f.x,f.y,100) && Math.random()<delta*12){
        const a=Math.random()*TAU,rr=f.r*(0.45+Math.random()*0.5);
        fx?.sp?.('wind',m.type,f.x+Math.cos(a)*rr,f.y+Math.sin(a)*rr*0.6-4,
          {vx:-Math.sin(a)*70-Math.cos(a)*50,
            vy:Math.cos(a)*45-Math.sin(a)*25,life:0.38,spin:6});
      }
      return f.life>0 && f.t>=f.life;
    }
    return true;
  }

  function draw(ctx,f,now) {
    if(!isPortField(f)||!ctx)return;
    const kind=f.kind.slice(PREFIX.length);
    const fade=clamp(Math.min(f.t*6,(f.life-f.t)*3),0,1);
    if(kind==='vortex'){
      ctx.globalAlpha=fade*0.32;
      ctx.strokeStyle=f.col;ctx.lineWidth=2;
      for(let i=0;i<3;i++){
        const phase=now*(1+i*.2)*2+i*TAU/3;
        ctx.beginPath();
        ctx.ellipse(f.x,f.y,f.r*(0.48+i*0.22),
          f.r*(0.28+i*0.13),phase,0,TAU);
        ctx.stroke();
      }
      ctx.globalAlpha=fade*0.7;
      G.VFX?.draw?.(ctx,'wind',f.m.type,f.x,f.y-6,
        {scale:1.5,angle:now*3,frame:Math.floor(now*8)});
    }else if(kind==='quake'){
      ctx.globalAlpha=fade*0.16;
      ctx.fillStyle=f.col;ctx.beginPath();
      ctx.ellipse(f.x,f.y,f.r,f.r*.5,0,0,TAU);ctx.fill();
    }
  }

  return { spawn,update,draw,isPortField };
})();
