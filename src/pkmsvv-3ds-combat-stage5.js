/* PKMSVV Stage 5 — source-backed 3DS Scissor/Blitz/Leap/Boom/Weather.
 * Native FK_BLITZ/FK_LEAP, X-shaped double hit and true weather state.
 * Web adapters use original hit()/blast() hooks for damage, crit, types, loot.
 */
G.PKMSVV3DSStage5Combat=(()=>{
 'use strict';
 const old=G.PKMSVV3DSCombatFX;
 if(!old||!G.PKMSVV3DSStage4Support)throw Error('Stage5 needs Stage4 runtime support');
 const K=new Set(['scissor','blitz','leap','boom','weather']);
 const PRE='pkmsvv3ds5-',TAU=6.283185307179586;
 const number=(v,d)=>Number.isFinite(Number(v))?Number(v):d;
 const cap=(v,lo,hi)=>Math.min(hi,Math.max(lo,number(v,lo)));
 const clr=m=>G.U?.TYPE_COLOR?.[m.type]||'#ffffff';
 const vis=m=>G.VFX?.forMove?.(m)||{pal:m.type,proj:'streak'};
 const visible=(x,y,r)=>!G.Camera?.sees||G.Camera.sees(x,y,r);
 const enemies=(x,y,r)=>(G.EnemyMgr?.queryCircle?.(x,y,r)||[]).slice(0,100);
 const enemyList=()=>(G.EnemyMgr?.all?.()||[]).filter(e=>e&&!e.dead);
 const targets=(p,range)=>enemyList().filter(e=>Math.hypot(e.x-p.x,e.y-p.y)<=range);
 const arc=(cx,cy,x,y,a,half)=>{
   const rel=Math.atan2(y-cy,x-cx)-a;
   return Math.abs(Math.atan2(Math.sin(rel),Math.cos(rel)))<=half;
 };
 const isStage5Field=f=>!!f&&typeof f.kind==='string'&&
   (f.kind===PRE+'scissor'||f.kind===PRE+'blitz'||
    f.kind===PRE+'leap'||f.kind===PRE+'boom');
 const base=(p,m,ghost)=>({kind:PRE+m.kind,x:p.x,y:p.y,owner:p,
   m,ghost:!!ghost,t:0,life:1,col:clr(m),vis:vis(m),
   dmg:number(m.dmg,0)*number(p.atk,1),r:cap(m.radius,8,400)});
 function nearest(p,range){
  const arr=targets(p,range).filter(e=>!e.arceus);
  const marked=arr.includes(p.target)?p.target:null;
  if(marked)return marked;
  arr.sort((a,b)=>(a.x-p.x)**2+(a.y-p.y)**2-
     ((b.x-p.x)**2+(b.y-p.y)**2));
  return arr[0]||null;
 }
 function reach(m){
   switch(m?.kind){
    case 'scissor':return cap(m.radius,8,400)+30;
    case 'blitz':return cap(m.radius,8,460);
    case 'leap':return cap(m.range||220,20,540);
    case 'boom':return cap(m.radius,8,400)*.8;
    default:return 520;
   }
 }
 function hasBlitzTarget(p,m){return !!p&&!!m&&enemies(p.x,p.y,reach(m)).some(e=>e&&!e.dead&&!e.arceus);}
 function needsTarget(m){return !!m&&['scissor','blitz','leap','boom'].includes(m.kind);}
 function spawn(fields,p,m,ghost=false){
  if(!m||!K.has(m.kind))return old.spawn(fields,p,m,ghost);
  if(!p||p.dead||!Array.isArray(fields))return false;
  if(m.only?.length&&!m.only.includes(Number(p.mon?.dex)))return false;
  if(m.kind==='weather'){
   const map=['sun','rain','sand'],kind=map[Number(m.wx)];
   if(!kind||!G.Weather?.force)return false;
   if(!ghost)G.Weather.force(kind,cap(m.dur,1,240));
   const col=G.Weather?.KINDS?.[kind]?.color||clr(m);
   G.FX?.ring?.(p.x,p.y-8,p.r||12,(p.r||12)*4,col,.5,3);
   for(let i=0;i<10;i++)G.FX?.px?.(
     p.x+(Math.random()-.5)*40,p.y-Math.random()*40,col,
     {vy:-(60+Math.random()*60),life:.6});
   return true;
  }
  if(fields.filter(isStage5Field).length>=18||fields.length>=250)return false;
  const f=base(p,m,ghost);
  if(m.kind==='scissor'){
   f.life=.25;f.struck=false;
  }else if(m.kind==='blitz'){
   f.life=1.5;f.next=0;
   f.count=cap(Math.round(m.count||1),1,8);
   f.done=new Set();f.steps=0;
  }else if(m.kind==='leap'){
   const tg=nearest(p,reach(m));
   if(!tg)return false;
   f.x=tg.x;f.y=tg.y;f.at=.32;f.life=.6;f.struck=false;
   if(m.noItem>0 && (p.item==null||p.item===''))f.dmg*=m.noItem;
   if(!ghost)p.invuln=Math.max(p.invuln||0,.45);
  }else if(m.kind==='boom'){
   f.struck=false;f.life=.28;
  }
  fields.push(f);
  return true;
 }
 function update(f,dt,hooks={}){
  if(!isStage5Field(f))return old.update(f,dt,hooks);
  const p=f.owner,m=f.m,fx=G.FX;
  if(!p||p.dead)return true;
  if(m.kind==='scissor'){
   if(f.struck)return true;
   f.struck=true;
   for(const offset of [-.45,.45]){
    const a=number(p.aim,0)+offset,r=f.r,half=cap(m.arc,.2,3.14)/2;
    if(visible(p.x,p.y,r))fx?.slash?.(p.x,p.y-6,a,r,m.arc,f.col,f.vis);
    if(f.ghost)continue;
    for(const e of enemies(p.x,p.y,r)){
     if(!e||e.dead||!arc(p.x,p.y,e.x,e.y,a,half))continue;
     hooks.hit?.(p,e,f.dmg,f.col,e.x-p.x,e.y-p.y,30,m);
    }
    for(const prop of (G.World?.propsInCircle?.(p.x,p.y,r)||[]).slice(0,64)){
     if(!prop||prop.gone||!arc(p.x,p.y,prop.x,prop.y,a,half))continue;
     G.World?.damageProp?.(prop,f.dmg,f.col);
    }
   }
   return true;
  }
  if(m.kind==='blitz'){
   f.next-=cap(dt,0,.25);
   if(f.next>0)return false;
   f.next=Math.max(.01,f.next+.08);
   if(f.ghost)return true; // Native ghost field does not teleport or damage.
   let tg=null,closest=Infinity;
   for(const e of enemies(p.x,p.y,reach(m))){
     if(!e||e.dead||e.arceus||f.done.has(e))continue;
     const d=(e.x-p.x)**2+(e.y-p.y)**2;
     if(d<closest){closest=d;tg=e;}
   }
   if(!tg)return true;
   f.done.add(tg);
   const ox=p.x,oy=p.y;
   const a=Math.atan2(tg.y-oy,tg.x-ox);
   const bx=tg.x-Math.cos(a)*(number(tg.r,9)+number(p.r,12));
   const by=tg.y-Math.sin(a)*(number(tg.r,9)+number(p.r,12));
   if(!G.Judgment?.active&&G.World?.isFree?.(bx,by,(p.r||12)*.8,true)){
    p.x=bx;p.y=by;G.World?.collide?.(p);
   }
   if(visible(tg.x,tg.y,80)){
    for(let i=0;i<=5;i++){
     const t=i/5;
     fx?.sp?.(f.vis.proj||'streak',f.vis.pal||m.type,
       ox+(p.x-ox)*t,oy+(p.y-oy)*t-8,{life:.2,angle:a});
    }
    fx?.slash?.(tg.x,tg.y-6,a,30,2,f.col,f.vis);
   }
   p.invuln=Math.max(p.invuln||0,.25);
   hooks.hit?.(p,tg,f.dmg,f.col,Math.cos(a),Math.sin(a),50,m);
   f.steps++;
   return f.steps>=f.count;
  }
  if(m.kind==='leap'){
   if(f.t<f.at)return false;
   if(f.struck)return true;
   f.struck=true;
   if(!f.ghost&&!G.Judgment?.active&&G.World?.isFree?.(f.x,f.y,(p.r||12)*.8,true)){
    p.x=f.x;p.y=f.y;G.World?.collide?.(p);
   }
   if(visible(f.x,f.y,f.r)){
    fx?.ring?.(f.x,f.y,4,f.r,f.col,.3,4);
    fx?.burst?.(f.x,f.y-6,f.col,10,160);
    if(!f.ghost)G.Camera?.kick?.(.25);
   }
   if(!f.ghost)hooks.blast?.(f,f.r);
   return true;
  }
  if(m.kind==='boom'){
   if(f.struck)return true;
   f.struck=true;
   if(visible(p.x,p.y,f.r)){
    fx?.ring?.(p.x,p.y,8,f.r,'#ffffff',.35,6);
    fx?.ring?.(p.x,p.y,8,f.r*.8,'#f44',.45,5);
    fx?.burst?.(p.x,p.y-10,'#f44',30,260);
    if(!f.ghost)G.Camera?.kick?.(1);
   }
   if(!f.ghost){
    const cost=Math.max(1,p.hp*cap(m.cost,0,.95));
    p.hp=Math.max(1,p.hp-cost);
    for(const e of enemies(p.x,p.y,f.r)){
     if(e&&!e.dead)hooks.hit?.(p,e,f.dmg,f.col,e.x-p.x,e.y-p.y,number(m.knock,200),m);
    }
    for(const prop of (G.World?.propsInCircle?.(p.x,p.y,f.r)||[]).slice(0,64)){
     if(prop&&!prop.gone)G.World?.damageProp?.(prop,f.dmg,f.col);
    }
   }
   return true;
  }
  return true;
 }
 function draw(ctx,f,now){
  if(!isStage5Field(f))return old.draw(ctx,f,now);
  if(!ctx)return;
  if(f.m.kind==='leap' && !f.struck){
   ctx.globalAlpha=.32;
   ctx.strokeStyle=f.col;ctx.lineWidth=2;
   ctx.beginPath();ctx.ellipse(f.x,f.y,f.r,f.r*.65,0,0,TAU);ctx.stroke();
  }
  // Active Blitz/Scissor/Boom visuals are native FX, not permanent drawn fields.
 }
 G.PKMSVV3DSCombatFX={
  ...old,
  isPortField:f=>isStage5Field(f)||!!old.isPortField?.(f),
  spawn,update,draw
 };
 return {isStage5Field,needsTarget,hasBlitzTarget,reach,spawn,update,draw};
})();
