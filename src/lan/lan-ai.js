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
 // Personality only affects in-run decisions, NEVER the shared competitive stat baseline.
 const PERSONALITY={
  elite:{think:.12,dash:.85},
  trained:{think:.28,dash:.5},
  novice:{think:.48,dash:.2}
 };
 // Randomize which opponent receives which skill level at every new match.
 // A four-bot roster is 2 skilled, 1 intermediate and 1 beginner. Egg Rush
 // has four TOTAL slots, so a human + three bots = 1 of each bot tier.
 function tiersFor(mode,count,random=Math.random){
  const n=Math.max(0,Math.min(20,Math.trunc(Number(count)||0)));
  if(!n)return[];
  let tiers;
  if(mode==='eggrush'){
   tiers=n===1?['trained']:n===2?['elite','novice']:n===3?
    ['elite','trained','novice']:['elite','elite','trained','novice'];
   if(n>4)for(let i=4;i<n;i++)tiers.push(i%4===0?'elite':i%4===1?'trained':'novice');
  }else if(n===1)tiers=['trained'];
  else if(n===2)tiers=['elite','trained'];
  else if(n===3)tiers=['elite','trained','novice'];
  else{
   const elite=Math.max(1,Math.round(n*.25)),novice=Math.max(1,Math.round(n*.2));
   tiers=[...Array(elite).fill('elite'),...Array(n-elite-novice).fill('trained'),...Array(novice).fill('novice')];
  }
  // Fisher-Yates: balanced composition, unpredictable ownership of every tier.
  for(let i=tiers.length-1;i>0;i--){
   const r=Math.max(0,Math.min(.999999,Number(random())||0)),j=Math.floor(r*(i+1));
   [tiers[i],tiers[j]]=[tiers[j],tiers[i]];
  }
  return tiers;
 }
 function strength(random=Math.random){
  const r=random(),tier=r<.25?'normal':r<.7?'trained':'elite';
  const [min,max]=tier==='normal'?[2,4]:tier==='trained'?[4,7]:[7,10];
  const level=()=>min+Math.floor(random()*(max-min+1));
  const levels={hp:level(),atk:level(),def:Math.min(8,level()),cd:Math.min(8,level()),
   spd:Math.min(8,level()),regen:Math.min(5,level())};
  return {tier,levels};
 }
 // A one-time baseline is chosen from REAL trainers, never from the best AI.
 // Room metadata carries only bounded earned perks, not save data.
 function humanBaseline(){
  const room=G.Social?.room,members=(room?.members||[]).filter(m=>!m.bot);
  const humans=members.map(m=>{
   const mon=G.DEX_BY?.[m.dex]||G.DEX_BY?.[25]||{};
   const p=m.power||{},local=m.uid===G.Social?.uid?G.Coop.local:null;
   const hp=local?.maxHp??(Number(mon.hp||100)+Number(p.hp||0));
   const atk=local?(local.baseAtk||mon.atk||50)*(local.atkMul||1):(Number(mon.atk||50)*Number(p.atkMul||1));
   const spd=local?(local.baseSpd||mon.spd||50)*(local.spdMul||1):(Number(mon.spd||50)*Number(p.spdMul||1));
   const cd=local?.cdMul??Number(p.cdMul??1),def=local?.dmgReduce??Number(p.dmgReduce||0);
   const regen=local?.regenFlat??Number(p.regen||0);
   const df=Number(mon.df||50),sd=Number(mon.sd||50);
   const vals={uid:m.uid,hp,atk,spd,cd,def,regen,df,sd};
   vals.rating=hp*.25+atk*1.2+spd*.8+(df+sd)*.4+
    (1-Math.max(.2,cd))*120+def*220+regen*20;
   return vals;
  }).filter(m=>[m.hp,m.atk,m.spd,m.cd,m.def,m.regen].every(Number.isFinite));
  humans.sort((a,b)=>b.rating-a.rating||a.uid.localeCompare(b.uid));
  return humans[0]||null;
 }
 function raiseToHuman(pl,target,margin=1){
  if(!target)return;
  // Same legal game actors and move/Ability/Nature; NEVER mutate shared mon.
  const hp=Math.ceil(target.hp*margin);
  if(pl.maxHp<hp){
   const bonus=hp-pl.maxHp;
   if(typeof pl.addMaxHp==='function')pl.addMaxHp(bonus);
   else{pl.maxHp+=bonus;pl.hp+=bonus;} // supports simple test actors
  }
  pl.atkMul=Math.max(pl.atkMul||1,target.atk*margin/Math.max(1,pl.baseAtk||pl.mon?.atk||50));
  pl.spdMul=Math.max(pl.spdMul||1,target.spd*margin/Math.max(1,pl.baseSpd||pl.mon?.spd||50));
  pl.cdMul=Math.min(pl.cdMul||1,target.cd);
  // Species-specific defense remains untouched. Use the normal per-player
  // damage-reduction channel to compensate for a weaker species baseline.
  const defGap=Math.max(0,target.df-(pl.mon.df||0),target.sd-(pl.mon.sd||0));
  pl.dmgReduce=Math.max(pl.dmgReduce||0,Math.min(.8,target.def+defGap/Math.max(100,target.df+target.sd)*.3));
  pl.regenFlat=Math.max(pl.regenFlat||0,target.regen);
 }
 // Competitive fairness: all trainers (human, guest and AI) share the
 // strongest real trainer's effective START-OF-MATCH stat vector.
 // Never change the permanent save or global species DEX. Freeze per actor.
 function normalizeMatch(){
  const mode=G.Social?.room?.mode;
  if(!['eggrush','royale'].includes(mode)||!G.Coop?.active)return null;
  const target=humanBaseline();
  if(!target)return null;
  for(const pl of G.Coop.players?.()||[]){
   if(!pl||pl.lanFairStatsApplied)continue;
   // Keep the same proportions and preserve current HP when reconnecting
   // into an already active match, although normal start HP is 100%.
   const fraction=Math.max(0,Math.min(1,(pl.hp||0)/Math.max(1,pl.maxHp||1)));
   const nextHp=Math.max(1,Math.round(target.hp));
   pl.maxHp=nextHp;
   pl.hp=pl.dead?0:Math.max(1,Math.round(nextHp*fraction));
   pl.atkMul=target.atk/Math.max(1,pl.baseAtk||pl.mon?.atk||50);
   pl.spdMul=target.spd/Math.max(1,pl.baseSpd||pl.mon?.spd||50);
   pl.cdMul=target.cd;
   pl.dmgReduce=target.def;
   pl.regenFlat=target.regen;
   // Defense is a species base-stat input into damage formulas. Clone only
   // this match's actor sheet, never mutate shared DEX_BY or saved Pokémon.
   if(pl.mon)pl.mon={...pl.mon,df:target.df,sd:target.sd};
   pl.lanFairStatsApplied=true;
   if(pl.lanBot)pl.lanBotProfile={...(pl.lanBotProfile||{}),equalized:true,targetUid:target.uid};
  }
  return target;
 }
 function begin(){
  states.clear();
  const bots=activeBots().slice().sort((a,b)=>a.uid.localeCompare(b.uid));
  const mode=G.Social?.room?.mode,baseline=humanBaseline(),tiers=tiersFor(mode,bots.length);
  bots.forEach((bot,index)=>{
   const pl=G.Coop.mate(bot.uid)?.pl;if(!pl)return;
   const tier=tiers[index],personality=PERSONALITY[tier];
   const state={seq:0,route:[],replan:0,think:0,axis:[0,0],goal:null,
    home:{x:pl.x,y:pl.y},wander:0,tier,personality};
   states.set(bot.uid,state);
   pl.lanBot=true;
   // Record tier for QA only. Never persist it into the player's save.
   pl.lanBotProfile={...(pl.lanBotProfile||{}),tier};
   if(pl.lanBotPowerApplied)return;
   pl.lanBotPowerApplied=true;
   pl.addMove(G.baseStartOf(bot.dex));
   pl.setAbility(G.Mons.abilityOf(bot.dex).id);
   // A good co-op companion may match the real player's baseline, but not
   // every AI gets a 102% challenger bonus, and competitive stats stay equal.
   if(mode==='coop'&&tier==='elite')raiseToHuman(pl,baseline,1);
  });
 }
 function coopDifficulty(){
  if(G.Social?.room?.mode!=='coop')return 1;
  const bots=activeBots().length;
  return bots?1+Math.min(.28,.12+.04*Math.min(4,bots)):1;
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
 function pickCard(pl,offer,tier,random=Math.random){
  if(!offer?.length)return null;
  const sorted=offer.slice().sort((a,b)=>scoreCard(pl,b)-scoreCard(pl,a));
  if(tier==='elite'||sorted.length===1)return sorted[0];
  // Even beginners recognise an emergency heal: variation isn't sabotage.
  if(pl.hp/Math.max(1,pl.maxHp)<.28&&sorted[0].key==='stat:heal')return sorted[0];
  const r=random();
  if(tier==='trained')return r<.8?sorted[0]:sorted[1];
  return r<.55?sorted[0]:r<.9?sorted[Math.min(1,sorted.length-1)]:
   sorted[Math.min(2,sorted.length-1)];
 }
 function levelUp(level,seq){
  for(const bot of activeBots()){
   const pl=G.Coop.mate(bot.uid)?.pl,s=states.get(bot.uid);
   try{
    if(!pl||!s||s.seq>=seq)continue;
    pl.level=level;
    // Choose ONLY among the same three legal cards offered to a human trainer.
    const offer=G.LevelUp.offer(pl);
    const card=pickCard(pl,offer,s.tier);
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
   G.MatchMetrics?.route();
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
  if(G.Social.room?.mode==='royale')for(const other of G.Coop.players()){
   if(other===pl||other.dead)continue;
   const d=Math.sqrt(sq(p,other));if(d<180)score+=(1-d/180)*100;
  }
  if(G.Social.room?.mode==='coop')for(const other of G.Coop.players()){
   if(other===pl||other.dead)continue;
   const d=Math.sqrt(sq(p,other));if(d<85)score+=(1-d/85)*65;
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
   if(!unsafe&&[.25,.5,.75,1].some(t=>liquidCost(pl,pl.x+(p.x-pl.x)*t,pl.y+(p.y-pl.y)*t)>0))continue;
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
   // Emergency avoidance still works for beginners; no intentionally
   // standing inside a fire/meteor zone just to simulate being 'noob'.
   if(s.think>0&&hazards.some(h=>!h.hit&&G.Hazards.inside(h,pl.x,pl.y,pl.r+14)))s.think=0;
   if(s.think<=0){
    s.wander-=.12;
    if(mode==='royale'&&(!s.roam||s.wander<=0)){
     const a=Math.random()*Math.PI*2;
     s.roam=dryPoint(pl,{x:s.home.x+Math.cos(a)*300,y:s.home.y+Math.sin(a)*300})||s.home;
     s.wander=5+Math.random()*6;
    }
    if(mode==='coop'&&(!s.roam||s.wander<=0||!s.anchor||sq(host,s.anchor)>180**2||sq(pl,host)>430**2)){
     const a=Math.random()*Math.PI*2,radius=140+Math.random()*120;
     s.roam=dryPoint(pl,{x:host.x+Math.cos(a)*radius,y:host.y+Math.sin(a)*radius})||{x:pl.x,y:pl.y};
     s.anchor={x:host.x,y:host.y};s.wander=4+Math.random()*5;
    }
    let goal=['royale','coop'].includes(mode)?s.roam:host;
    let objective=G.EggRush?.objective?.(pl);
    if(mode==='coop'&&objective&&sq(objective,host)>520**2)objective=null;
    const nests=objective?[objective]:mode==='eggrush'?(G.EggRush?.nests||[]).filter(n=>!n.taken):[];
    if(nests.length)goal=nests.reduce((a,b)=>sq(pl,a)<sq(pl,b)?a:b);
    if(mode==='coop'){
     const fallen=G.Coop.players().filter(p=>p!==pl&&p.dead&&sq(pl,p)<420**2);
     if(fallen.length)goal=fallen.reduce((a,b)=>sq(pl,a)<sq(pl,b)?a:b);
    }
    // Stay at the range of learned attacks rather than walking into monsters.
    const target=enemies.reduce((a,e)=>!a||sq(pl,e)<sq(pl,a)?e:a,null);
    if(target&&sq(pl,target)<420**2&&(mode==='royale'&&(!objective||pl.hp/pl.maxHp<.55||sq(pl,target)<150**2)||
     mode==='coop'&&goal===s.roam&&sq(pl,host)<430**2&&sq(target,host)<520**2&&!host.dead||goal===host&&!host.dead)){
     const ranged=pl.moves.some(m=>['projectile','beam','homing','chain','turret','meteor','boomerang'].includes(m.kind));
     const d=Math.sqrt(sq(pl,target))||1,range=pl.hp/pl.maxHp<.4?230:ranged?165:85;
     goal={x:target.x+(pl.x-target.x)/d*range,y:target.y+(pl.y-target.y)/d*range};
    }
    if(mode==='coop'&&!nests.length&&goal===s.roam&&sq(pl,goal)<50**2)goal={x:pl.x,y:pl.y};
    if(G.Arena?.active)goal=G.Arena.clampGoal(goal,pl);
    s.axis=chooseAxis(pl,s,goal,enemies,shots,hazards);
    s.think=s.personality.think*(.9+Math.random()*.2);
    const dash=G.PKMSVVDash?.preview(pl);
    if(dash?.ready&&Math.random()<s.personality.dash&&Math.hypot(...s.axis)>.5&&
      danger(pl,pl,enemies,shots,hazards)>65){
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
 return {activeBots,owns,begin,normalizeMatch,frame,levelUp,update,scoreCard,pickCard,tiersFor,route,chooseAxis,near,strength,humanBaseline,raiseToHuman,coopDifficulty,stop(){states.clear();}};
})();
