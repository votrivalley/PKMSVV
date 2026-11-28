/* QA tactical steering and real movement-status feedback. No persisted state. */
(function(){
 'use strict';
 if(typeof G==='undefined')return;
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const sq=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
 const finite=p=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 const alliedMode=mode=>['coop','berry','berryeasy','fossil_lab'].includes(mode)&&!!G.Coop?.isHost;
 const alive=p=>finite(p)&&!p.dead;
 function assignRescuers(players,bots,previous=new Map()){
  const down=players.filter(p=>finite(p)&&p.dead),living=bots.filter(alive),out=new Map(),claimed=new Set();
  // If a real trainer is already providing a revive, leave that player alone.
  const human=players.filter(p=>alive(p)&&!p.lanBot);
  const covered=p=>human.some(h=>sq(h,p)<44**2);
  const available=(b,p)=>alive(b)&&down.includes(p)&&!covered(p)&&sq(b,p)<=420**2&&!claimed.has(p);
  // Keep the current assigned rescuer whenever still viable.
  for(const b of living){const p=previous.get(b.uid)?.rescue;if(available(b,p)){out.set(b,p);claimed.add(p);}}
  const pairs=[];
  for(const b of living)if(!out.has(b))for(const p of down)if(available(b,p)){
   const rest=Number(b.__pkmsvv3dsSupport?.rest)||0,hp=(b.hp||0)/Math.max(1,b.maxHp||1);
   pairs.push({b,p,cost:sq(b,p)+(hp<.25?120**2:0)+(rest>0?150**2:0)});
  }
  pairs.sort((a,b)=>a.cost-b.cost||String(a.b.uid).localeCompare(String(b.b.uid)));
  for(const {b,p} of pairs)if(!out.has(b)&&!claimed.has(p)){out.set(b,p);claimed.add(p);}
  return out;
 }
 function directPath(pl,goal,segment,liquidCost){
  if(!alliedMode(G.Social?.room?.mode)||!finite(pl)||!finite(goal)||sq(pl,goal)>520**2)return false;
  if(!segment(pl,pl,goal))return false;
  const steps=Math.max(1,Math.ceil(Math.sqrt(sq(pl,goal))/12));
  for(let i=0;i<=steps;i++)if(liquidCost(pl,pl.x+(goal.x-pl.x)*i/steps,pl.y+(goal.y-pl.y)*i/steps)>0)return false;
  return true;
 }
 function margin(h,x,y,r){
  if(!finite(h))return Infinity;
  const pad=Math.max(0,r)*.6;
  if(h.kind==='zone')return Math.hypot(x-h.x,y-h.y)-(Number(h.r)||0)-pad;
  if(h.kind!=='beam'||![h.angle,h.len,h.w].every(Number.isFinite))return Infinity;
  const dx=x-h.x,dy=y-h.y,ca=Math.cos(h.angle),sa=Math.sin(h.angle),along=dx*ca+dy*sa,side=Math.abs(-dx*sa+dy*ca);
  return Math.max(-r-along,along-h.len-r,side-h.w/2-pad);
 }
 const left=h=>Number.isFinite(h.delay)&&Number.isFinite(h.t)?h.delay-h.t:Infinity;
 const speed=p=>Math.max(0,Math.min(500,Number(p.spd)||0));
 function relevant(pl,hazards){
  const r=(pl.r||10)+10,sp=speed(pl);
  return hazards.filter(h=>h&&!h.hit&&left(h)>=0&&left(h)<=1.45&&margin(h,pl.x,pl.y,r)<=sp*Math.min(left(h),.8)+45)
    .sort((a,b)=>left(a)-left(b)).slice(0,12);
 }
 function needsEvade(pl,axis,hazards){
  if(!alive(pl))return false;
  const r=(pl.r||10)+10,v=speed(pl),a=axis||[0,0];
  return relevant(pl,hazards).some(h=>{
   const t=Math.min(.65,left(h));
   return margin(h,pl.x,pl.y,r)<8||margin(h,pl.x+(a[0]||0)*v*t,pl.y+(a[1]||0)*v*t,r)<8;
  });
 }
 function evade(pl,axis,goal,hazards,segment,liquidCost){
  if(!needsEvade(pl,axis,hazards))return null;
  const threats=relevant(pl,hazards),r=(pl.r||10)+10,v=speed(pl);
  if(v<=0||pl.__pkmsvv3dsSupport?.rest>0||pl.frozen)return [0,0];
  const angle=finite(goal)?Math.atan2(goal.y-pl.y,goal.x-pl.x):Math.atan2(axis?.[1]||0,axis?.[0]||1);
  const wet=liquidCost(pl,pl.x,pl.y)>0;
  let best=[0,0],bestScore=-Infinity;
  for(let i=-1;i<16;i++){
   const a=angle+i*Math.PI/8,d=i<0?[0,0]:[Math.cos(a),Math.sin(a)];
   // Check only a short legal segment, not a fictional teleport to safety.
   const travel=Math.min(v*.45,90),end={x:pl.x+d[0]*travel,y:pl.y+d[1]*travel};
   if(!segment(pl,pl,end))continue;
   if(!wet&&[.25,.5,.75,1].some(k=>liquidCost(pl,pl.x+d[0]*travel*k,pl.y+d[1]*travel*k)>0))continue;
   let worst=Infinity,sum=0;
   for(const h of threats){
    const t=Math.min(left(h),.7),distance=v*t,point={x:pl.x+d[0]*distance,y:pl.y+d[1]*distance};
    // If the full predicted path hits a wall, score only reachable progress.
    const pos=segment(pl,pl,point)?point:end;
    const m=margin(h,pos.x,pos.y,r);worst=Math.min(worst,m);sum+=Math.max(-300,Math.min(80,m));
   }
   // Prefer surviving every telegraph over chasing the original goal.
   const progress=finite(goal)?Math.sqrt(sq(pl,goal))-Math.sqrt(sq(end,goal)):0;
   const score=Math.min(80,worst)*8+sum+progress*.12-(wet?liquidCost(pl,end.x,end.y)*12:0);
   if(score>bestScore){bestScore=score;best=d;}
  }
  return best;
 }
 function rangedGoal(pl,target,range,fallback){
  if(!alive(pl)||!alive(target))return fallback;
  const d=Math.sqrt(sq(pl,target));
  if(d<range*.85||d>range*1.15||!pl.moves?.some(m=>['projectile','beam','homing','chain','turret','meteor','boomerang','bounce','wave'].includes(m.kind)))return fallback;
  // Maintain spacing, use slight lateral movement instead of constant retreat.
  const sign=String(pl.uid||'').charCodeAt(String(pl.uid||'').length-1)%2?1:-1;
  const a=Math.atan2(pl.y-target.y,pl.x-target.x)+sign*.28;
  const p={x:target.x+Math.cos(a)*range,y:target.y+Math.sin(a)*range};
  return G.World?.isFree?.(p.x,p.y,(pl.r||10)+2,true)?p:fallback;
 }
 function berryGoal(pl,enemies,slot){
  const api=G.PKMSVVBerryRescue;if(!api?.active||!alive(pl))return null;
  const live=(api.trees||[]).filter(t=>finite(t)&&t.hp>0).sort((a,b)=>a.hp/Math.max(1,a.maxHp)-b.hp/Math.max(1,b.maxHp)||a.id-b.id);
  if(!live.length)return null;
  const c={x:live.reduce((n,t)=>n+t.x,0)/live.length,y:live.reduce((n,t)=>n+t.y,0)/live.length};
  if(sq(pl,c)>(api.DEFENSE_RADIUS||170)**2)return c;
  const tree=live[Math.max(0,slot|0)%live.length];
  let target=null,score=Infinity;
  for(const e of enemies)if(alive(e)&&sq(e,tree)<135**2){
   const v=sq(e,tree)+(e.boss?-3000:0);if(v<score){target=e;score=v;}
  }
  const ref=target||c;let dx=ref.x-tree.x,dy=ref.y-tree.y,d=Math.hypot(dx,dy);
  if(d<.01){dx=pl.x-tree.x;dy=pl.y-tree.y;d=Math.hypot(dx,dy);}
  if(d<.01){dx=1;dy=0;d=1;}
  const point={x:tree.x+dx/d*76,y:tree.y+dy/d*76};
  return finite(point)&&G.World?.isFree?.(point.x,point.y,(pl.r||10)+2,true)?point:null;
 }
 function rangedFootwork(e,p,spd,range,dist){
  if(!G.PKMSVVCombatBalanceQA?.enabled()||!alive(e)||!alive(p)||e.boss||e.remote||e.friendly||
     !e.pkmsvvPressureElite||!Number.isFinite(spd)||spd<=0||dist<range*.72||dist>range*.97||
     e.stunT>0||e.sleepT>0||e.jump)return null;
  const a=Math.atan2(p.y-e.y,p.x-e.x),sign=Number(e.id)%2?1:-1;
  // Native ranged attacks still use real player direction and original timer.
  for(const side of [sign,-sign]){
   const v=a+side*Math.PI/2,dx=Math.cos(v)*spd*.32,dy=Math.sin(v)*spd*.32;
   if(G.World?.isFree?.(e.x+dx*.3,e.y+dy*.3,(e.r||10)+1,true))return [dx,dy];
  }
  return null;
 }
 // Arena enemies use the native boss controller. Only override its idle
 // locomotion when an existing, approaching player projectile threatens it.
 // No cast cancellation, extra speed, teleport, damage or stat adjustment.
 const arenaFootworkState=new WeakMap();
 function arenaDuel(e,p){
  if(!alive(e)||!alive(p)||e.remote||e.friendly||G.Coop?.active||G.Game?.state!=='playing')return false;
  const solo=G.PKMSVVArenaSolo,champ=G.PKMSVVChampionArena;
  return !!((e.pkmsvvArenaSolo&&solo?.active&&solo.stage==='fight')||
   (e.pkmsvvChampion&&!e._pkmsvvSkyBoss&&champ?.active&&champ.stage==='fight'));
 }
 function projectileClearance(e,shot,vx,vy,horizon){
  const x=shot.x-e.x,y=shot.y-(typeof e.cy==='function'?e.cy():e.y),dx=shot.vx-vx,dy=shot.vy-vy;
  const den=dx*dx+dy*dy,t=den>0?Math.max(0,Math.min(horizon,-(x*dx+y*dy)/den)):0;
  return {margin:Math.hypot(x+dx*t,y+dy*t)-(Math.max(0,e.r||10)+Math.max(0,shot.r||5)+5),t};
 }
 function arenaFootwork(e,p,spd,vx,vy,dt){
  if(!arenaDuel(e,p))return null;
  if(![spd,vx,vy,dt].every(Number.isFinite)||dt<=0)return null;
  let s=arenaFootworkState.get(e);
  if(!s){s={hold:0,wait:0,axis:null};arenaFootworkState.set(e,s);}
  s.wait=Math.max(0,s.wait-dt);s.hold=Math.max(0,s.hold-dt);
  if(e.ai?.cast||e.stunT>0||e.sleepT>0||e.jump||e._pkmsvvMegaTransition>0){
   s.hold=0;s.axis=null;return null;
  }
  const speed=Math.min(spd,Math.hypot(vx,vy));
  if(speed<=0||typeof G.World?.isFree!=='function')return null;
  const safe=(ax,ay,seconds)=>{
   const travel=speed*seconds,n=Math.max(1,Math.ceil(travel/10));
   for(let i=1;i<=n;i++)if(!G.World.isFree(e.x+ax*travel*i/n,e.y+ay*travel*i/n,(e.r||10)+2,false))return false;
   return true;
  };
  if(s.hold>0&&s.axis){
   if(safe(...s.axis,Math.min(.12,s.hold)))return s.axis.map(a=>a*speed);
   s.hold=0;s.axis=null;
  }
  if(s.wait>0)return null;
  s.wait=.18;
  const threats=[];
  for(const shot of G.Projectiles?.all?.()||[]){
   if(!shot?.friendly||shot.orb||shot.boom||shot.homing>0||shot.visualOnly||shot.dmg<=0||
      shot.hits?.has?.(e.id)||![shot.x,shot.y,shot.vx,shot.vy,shot.life,shot.t].every(Number.isFinite))continue;
   const horizon=Math.min(.42,shot.life-shot.t);
   if(horizon<=.08||sq(e,shot)>380**2||Math.hypot(shot.vx,shot.vy)<30)continue;
   const initial=projectileClearance(e,shot,vx,vy,horizon);
   // Already passed, moving away, or far enough even on the native path.
   if(initial.t<.06||initial.margin>7)continue;
   threats.push({shot,horizon,initial});
  }
  threats.sort((a,b)=>a.initial.t-b.initial.t);
  const nearby=threats.slice(0,12);
  if(!nearby.length)return null;
  const baseline=Math.min(...nearby.map(t=>t.initial.margin));
  const dir=Math.atan2(vy,vx),distance=Math.sqrt(sq(e,p));
  let best=null,bestScore=-Infinity;
  for(const off of [Math.PI/2,-Math.PI/2,Math.PI/4,-Math.PI/4,3*Math.PI/4,-3*Math.PI/4,Math.PI]){
   const a=dir+off,ax=Math.cos(a),ay=Math.sin(a);
   if(!safe(ax,ay,.38))continue;
   const end={x:e.x+ax*speed*.38,y:e.y+ay*speed*.38};
   // Avoid turning a duel into endless kiting.
   if(Math.sqrt(sq(end,p))>Math.max(330,distance+12))continue;
   const clearance=Math.min(...nearby.map(t=>projectileClearance(e,t.shot,ax*speed,ay*speed,t.horizon).margin));
   if(clearance<baseline+8)continue;
   const score=Math.min(50,clearance)-Math.max(0,Math.sqrt(sq(end,p))-distance)*.16-Math.abs(off)*2;
   if(score>bestScore){bestScore=score;best=[ax,ay];}
  }
  if(!best)return null;
  s.axis=best;s.hold=.36;s.wait=1.05;
  return best.map(a=>a*speed);
 }
 function status(pl){
  if(!pl||pl.dead||!['playing','held'].includes(G.Game?.state))return [];
  const rows=[],rest=Number(pl.__pkmsvv3dsSupport?.rest)||0;
  if(rest>0)rows.push({id:'rest',text:tr('NGỦ (Rest) ','REST ')+Math.ceil(rest*10)/10+'s',color:'#d6b4ff'});
  if(pl.slowT>0)rows.push({id:'slow',text:tr('CHẬM ','SLOWED ')+Math.ceil(pl.slowT*10)/10+'s',color:'#91dcff'});
  if(pl.frozen&&rest<=0)rows.push({id:'frozen',text:tr('KHÓA ĐIỀU KHIỂN','INPUT LOCKED'),color:'#ffd580'});
  const fps=Number(G.PKMSVVHordePerformance?.fps);
  if(Number.isFinite(fps)&&fps>0&&fps<38)rows.push({id:'fps',text:tr('FPS THẤP ','LOW FPS ')+Math.round(fps),color:'#ffa59b'});
  return rows;
 }
 function drawStatus(ctx,x,y,w,pl){
  const rows=status(pl);if(!rows.length||!ctx)return x;
  ctx.save();ctx.font='700 10px sans-serif';ctx.textAlign='left';ctx.textBaseline='alphabetic';
  for(const row of rows){
   const width=Math.min(ctx.measureText(row.text).width+12,w-x-12);
   if(width<50)break;
   ctx.fillStyle='rgba(12,20,30,.85)';ctx.fillRect(x,y,width,16);
   ctx.fillStyle=row.color;ctx.fillText(row.text,x+6,y+12,width-12);x+=width+5;
  }
  ctx.restore();return x;
 }
 G.PKMSVVCombatTacticsQA=Object.freeze({alliedMode,assignRescuers,directPath,margin,needsEvade,evade,rangedGoal,berryGoal,rangedFootwork,arenaFootwork,status,drawStatus});
})();
