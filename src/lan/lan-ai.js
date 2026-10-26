'use strict';
/* Host-owned LAN trainers. Movement, damage, skills and rewards use the game engine. */
G.LanAI=(()=>{
 const states=new Map();
 const sq=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
 function activeBots(){
  const room=G.Social?.room;
  if(!room?.isHost||!['coop','royale','eggrush'].includes(room.mode)||!G.Coop?.isHost)return[];
  return room.members.filter(m=>m.bot===true&&/^ai-[a-f0-9]{16}$/.test(m.uid));
 }
 function owns(pl){return !!pl?.lanBot&&G.Coop.isHost;}
 function begin(){
  states.clear();
  for(const bot of activeBots()){
   const pl=G.Coop.mate(bot.uid)?.pl;if(!pl)continue;
   pl.lanBot=true;pl.addMove(G.baseStartOf(bot.dex));
   pl.setAbility(G.Mons.abilityOf(bot.dex).id);
   states.set(bot.uid,{seq:0,route:[],replan:0,think:0,axis:[0,0],goal:null});
  }
 }
 function frame(pl){
  const m=pl.activeMove();
  return [Math.round(pl.x),Math.round(pl.y),pl.moveAngle,pl.walking?1:0,
   Math.round(pl.hp),Math.round(pl.maxHp),pl.dead?1:0,m?.id||'',m?.lvl||1,
   Math.round(pl.magnet),pl.aim,pl.xpMul,pl.reviveT||0,0,states.get(pl.uid)?.seq||0,0,Math.min(2,pl.lanEggRevives||0)];
 }
 function scoreCard(pl,card){
  const ratio=pl.hp/pl.maxHp,id=card.key.split(':')[1];
  if(card.type==='stat')return ({heal:ratio<.45?150:ratio<.75?65:-30,
   hp:ratio<.6?100:35,def:ratio<.6?60:30,rgn:ratio<.8?55:25,
   cd:45,atk:43,spd:32,xp:20,mag:12})[id]??10;
  const move=G.Moves.BY_ID[id];if(!move)return 0;
  const fit=G.Stats.fit(pl.mon,move.cat),stab=pl.mon.types.includes(move.type)?12:0;
  const damage=pl.moves.filter(m=>m.kind!=='buff');
  const ranged=['projectile','beam','homing','chain','boomerang','turret','meteor','bounce'].includes(move.kind);
  const buff=move.kind==='buff';
  return (card.type==='evo'?100:card.type==='up'?48:55)+fit*24+stab+
   (ranged&&!damage.some(m=>['projectile','beam','homing'].includes(m.kind))?15:0)+
   (card.type==='new'&&damage.length<3&&!buff?20:0)-(buff&&damage.length<2?70:0)-
   (move.kind==='dash'?20:0);
 }
 function levelUp(level,seq){
  for(const bot of activeBots()){
   const pl=G.Coop.mate(bot.uid)?.pl,s=states.get(bot.uid);
   try{
    if(!pl||!s||s.seq>=seq)continue;
    pl.level=level;
    // Choose ONLY among the same three legal cards offered to a human trainer.
    const offer=G.LevelUp.offer(pl);
    const card=offer.reduce((best,c)=>!best||scoreCard(pl,c)>scoreCard(pl,best)?c:best,null);
    if(card)card.apply(pl);
    s.seq=seq;
   }catch(error){console.error('LAN AI level reward',error);}
   finally{
    // Fallen trainers still complete the choice barrier; never wait for a bot UI.
    G.Coop.botPicked(bot.uid,seq);
   }
  }
 }
 function liquidCost(pl,x,y){
  if(!G.World.isLiquid(x,y)||pl.abil?.levitate)return 0;
  const effect=G.World.liquidEffect(pl.mon.types);
  if(effect.dmg&&!pl.abil?.lavaProof)return 25;
  if(effect.slow&&!G.PKMSVVWaterHoverDex.has(pl.dex))return 5;
  return effect.slide?2:0;
 }
 function clear(pl,x,y){return G.World.isFree(x,y,pl.r+2,true);}
 function segment(pl,a,b){
  const d=Math.sqrt(sq(a,b)),n=Math.max(1,Math.ceil(d/8));
  for(let i=1;i<=n;i++)if(!clear(pl,a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n))return false;
  return true;
 }
 function dryPoint(pl,point,radius=8){
  const ts=G.World.TS;let best=null,cost=Infinity;
  for(let y=-radius;y<=radius;y++)for(let x=-radius;x<=radius;x++){
   const p={x:(Math.floor(point.x/ts)+x+.5)*ts,y:(Math.floor(point.y/ts)+y+.5)*ts};
   if(liquidCost(pl,p.x,p.y)||!clear(pl,p.x,p.y))continue;
   const d=sq(p,point)+sq(p,pl)*.1;if(d<cost){cost=d;best=p;}
  }
  return best;
 }
 // Bounded A*: weighted liquid costs, solid-prop clearance, no diagonal corner cuts.
 function route(pl,goal){
  const ts=G.World.TS,sx=Math.floor(pl.x/ts),sy=Math.floor(pl.y/ts);
  const gx=Math.floor(goal.x/ts),gy=Math.floor(goal.y/ts),key=(x,y)=>x+','+y;
  const h=(x,y)=>Math.hypot(gx-x,gy-y),start={x:sx,y:sy,g:0,h:h(sx,sy),prev:null};
  const open=[start],seen=new Map([[key(sx,sy),start]]),closed=new Set();let best=start;
  const cell=(x,y)=>({x:(x+.5)*ts,y:(y+.5)*ts});
  for(let count=0;open.length&&count<700;count++){
   let at=0;for(let i=1;i<open.length;i++)if(open[i].g+open[i].h<open[at].g+open[at].h)at=i;
   const n=open.splice(at,1)[0],id=key(n.x,n.y);if(closed.has(id))continue;closed.add(id);
   if(n.h<best.h)best=n;if(n.x===gx&&n.y===gy){best=n;break;}
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
    const x=n.x+dx,y=n.y+dy,p=cell(x,y),k=key(x,y);
    if(Math.abs(x-sx)>22||Math.abs(y-sy)>22||closed.has(k)||!clear(pl,p.x,p.y))continue;
    if(!segment(pl,n===start?pl:cell(n.x,n.y),p))continue;
    const g=n.g+Math.hypot(dx,dy)*(1+liquidCost(pl,p.x,p.y));
    const prior=seen.get(k);if(prior&&prior.g<=g)continue;
    const next={x,y,g,h:h(x,y),prev:n};seen.set(k,next);open.push(next);
   }
  }
  const out=[];while(best.prev){out.unshift(cell(best.x,best.y));best=best.prev;}return out;
 }
 function danger(pl,p,enemies,shots,hazards){
  let score=0;
  for(const e of enemies){
   if(e.dead||e.sleepT>0||e.stunT>0)continue;
   const d=Math.sqrt(sq(p,e)),range=pl.r+(e.r||12)+38;
   if(d<range)score+=((range-d)/range)**2*160;
  }
  for(const shot of shots){
   const vx=shot.vx||0,vy=shot.vy||0,den=vx*vx+vy*vy;
   const t=den?Math.max(0,Math.min(.5,((p.x-shot.x)*vx+(p.y-shot.y)*vy)/den)):0;
   const d=Math.hypot(p.x-shot.x-vx*t,p.y-shot.y-vy*t),r=pl.r+(shot.r||5)+10;
   if(d<r)score+=(1-d/r)*180;
  }
  for(const hazard of hazards)if(!hazard.hit&&G.Hazards.inside(hazard,p.x,p.y,pl.r+12)){
   const depth=hazard.kind==='zone'||hazard.r?
    (hazard.r||0)+pl.r+12-Math.sqrt(sq(p,hazard)):
    (hazard.w||0)/2+pl.r+12-Math.abs(-(p.x-hazard.x)*Math.sin(hazard.angle)+(p.y-hazard.y)*Math.cos(hazard.angle));
   score+=200+Math.max(0,depth)*6;
  }
  return score+liquidCost(pl,p.x,p.y)*9;
 }
 function chooseAxis(pl,s,goal,enemies,shots,hazards){
  const unsafe=liquidCost(pl,pl.x,pl.y)>0;
  if(unsafe)goal=dryPoint(pl,pl)||goal;
  else if(goal===G.Coop.local&&liquidCost(pl,goal.x,goal.y))goal=dryPoint(pl,goal)||pl;
  if(!s.goal||sq(goal,s.goal)>G.World.TS**2*4||s.replan<=0){
   s.route=route(pl,goal);s.goal={x:goal.x,y:goal.y};s.replan=.65;
  }
  while(s.route.length&&sq(pl,s.route[0])<12**2)s.route.shift();
  const waypoint=s.route[0]||goal,angle=Math.atan2(waypoint.y-pl.y,waypoint.x-pl.x);
  const distance=Math.sqrt(sq(pl,goal));
  const step=Math.min(Math.max(10,pl.spd*.32),Math.max(12,Math.sqrt(sq(pl,waypoint))));
  let best=[0,0],value=Infinity;
  for(let i=-1;i<16;i++){
   const a=angle+i*Math.PI/8,axis=i<0?[0,0]:[Math.cos(a),Math.sin(a)];
   const p={x:pl.x+axis[0]*step,y:pl.y+axis[1]*step};
   if(!segment(pl,pl,p))continue;
   const progress=Math.sqrt(sq(p,waypoint))*.65;
   const risk=danger(pl,p,enemies,shots,hazards)*(pl.hp/pl.maxHp<.4?1.5:1);
   const slow=unsafe?0:liquidCost(pl,p.x,p.y)*12;
   const cost=progress+risk+slow+(distance<24&&i>=0?12:0);
   if(cost<value){value=cost;best=axis;}
  }
  return best;
 }
 function update(dt,time){
  if(!G.Coop?.isHost)return;
  const mode=G.Social.room?.mode,host=G.Coop.local;
  const enemies=G.EnemyMgr.all().filter(e=>e&&!e.dead);
  const shots=G.Projectiles.all().filter(p=>!p.friendly);
  const hazards=G.Hazards.all||[];
  for(const bot of activeBots()){
   const pl=G.Coop.mate(bot.uid)?.pl,s=states.get(bot.uid);if(!pl||!s)continue;
   if(pl.dead){
    s.axis=[0,0];pl.walking=false;
    if(mode==='coop'){
     const help=G.Coop.players().some(p=>p!==pl&&!p.dead&&sq(p,pl)<56**2);
     pl.reviveT=help?(pl.reviveT||0)+dt:Math.max(0,(pl.reviveT||0)-dt*.5);
     if(pl.reviveT>=G.Player.REVIVE_TIME)pl.revive(.5);
    }
    continue;
   }
   s.replan-=dt;s.think-=dt;
   if(s.think<=0){
    let goal=host;
    const nests=mode==='eggrush'?(G.EggRush?.nests||[]).filter(n=>!n.taken):[];
    if(nests.length)goal=nests.reduce((a,b)=>sq(pl,a)<sq(pl,b)?a:b);
    else if(mode==='coop'){
     const fallen=G.Coop.players().filter(p=>p!==pl&&p.dead&&sq(pl,p)<420**2);
     if(fallen.length)goal=fallen.reduce((a,b)=>sq(pl,a)<sq(pl,b)?a:b);
    }
    // Stay at the range of learned attacks rather than walking into monsters.
    const target=enemies.reduce((a,e)=>!a||sq(pl,e)<sq(pl,a)?e:a,null);
    if(target&&sq(pl,target)<420**2&&goal===host&&!host.dead){
     const ranged=pl.moves.some(m=>['projectile','beam','homing','chain','turret','meteor','boomerang'].includes(m.kind));
     const d=Math.sqrt(sq(pl,target))||1,range=ranged?165:85;
     goal={x:target.x+(pl.x-target.x)/d*range,y:target.y+(pl.y-target.y)/d*range};
    }
    if(goal===host&&!host.dead&&sq(pl,host)<85**2)goal={x:pl.x,y:pl.y};
    s.axis=chooseAxis(pl,s,goal,enemies,shots,hazards);s.think=.12;
    const dash=G.PKMSVVDash?.preview(pl);
    if(dash?.ready&&Math.hypot(...s.axis)>.5&&danger(pl,pl,enemies,shots,hazards)>65){
     const length=(dash.move.radius||120)*(G.PKMSVVDash.profile(dash.move).range||1);
     const end={x:pl.x+s.axis[0]*length,y:pl.y+s.axis[1]*length};
     if(segment(pl,pl,end)&&!liquidCost(pl,end.x,end.y)&&danger(pl,end,enemies,shots,hazards)<danger(pl,pl,enemies,shots,hazards)){
      pl.lanBotAxis=s.axis;G.Combat.manualDash(pl);
     }
    }
   }
   pl.lanBotAxis=s.axis;
   pl.update(dt);
   G.Combat.tick(dt,pl,time);
  }
 }
 function near(x,y,r=520){return G.Coop.isHost&&G.Coop.puppets().some(p=>p.lanBot&&!p.dead&&(p.x-x)**2+(p.y-y)**2<r*r);}
 return {activeBots,owns,begin,frame,levelUp,update,scoreCard,route,chooseAxis,near,stop(){states.clear();}};
})();
