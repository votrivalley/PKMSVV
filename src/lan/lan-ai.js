'use strict';
/* LAN-only PvE AI companions. All local, no cloud/API or separate process. */
G.LanAI=(()=>{
 const states=new Map(),STEP=.12,MAX_RANGE=420;
 const now=()=>Date.now();
 const sq=(a,b,c,d)=>(a-c)**2+(b-d)**2;
 function activeBots(){
  const room=G.Social?.room;
  if(!room||!room.isHost||!['coop','royale','eggrush'].includes(room.mode)||!G.Coop?.isHost)return[];
  return room.members.filter(x=>x.bot===true&&/^ai-[a-f0-9]{16}$/.test(x.uid));
 }
 function update(){
  if(!G.Coop?.isHost){states.clear();return;}
  const bots=activeBots(),ids=new Set(bots.map(x=>x.uid)),mode=G.Social.room?.mode;
  for(const id of states.keys())if(!ids.has(id))states.delete(id);
  if(!bots.length)return;
  const host=G.Coop.local;
  if(!host)return;
  let enemies=[];
  try{enemies=G.EnemyMgr.all().filter(e=>e&&!e.dead&&Number.isFinite(e.x)&&Number.isFinite(e.y));}catch(_){return;}
  for(const bot of bots){
   const mate=G.Coop.mate(bot.uid);
   if(!mate||!mate.connected)continue;
   const prior=mate.pl.net||{};
   let state=states.get(bot.uid);
   if(!state){
    state={x:prior.x??mate.pl.x??0,y:prior.y??mate.pl.y??0,
     hp:Math.max(1,prior.hp||mate.pl.hp||80),maxHp:Math.max(1,prior.maxHp||mate.pl.maxHp||80),nextCast:0};
    states.set(bot.uid,state);
   }
   let closest=null,dist=Infinity;
   for(const e of enemies){const d=sq(state.x,state.y,e.x,e.y);if(d<dist){dist=d;closest=e;}}
   const hasTarget=!!closest&&dist<=MAX_RANGE*MAX_RANGE;
   // Egg Rush opponents search for actual untaken nests; host checks egg claims.
   const eggs=mode==='eggrush'?(G.EggRush?.nests||[]).filter(n=>!n.taken):[];
   eggs.sort((a,b)=>sq(state.x,state.y,a.x,a.y)-sq(state.x,state.y,b.x,b.y));
   const nest=eggs[0]||null;
   const target=nest||(hasTarget?closest:host);
   let dx=target.x-state.x,dy=target.y-state.y,d=Math.hypot(dx,dy);
   const follow=nest?185:hasTarget?125:95,desired=nest?4:hasTarget?70:Math.min(100,45+bots.indexOf(bot)*25);
   const walk=d>desired+8;
   if(walk&&d>0){const step=Math.min(d-desired,follow*STEP);state.x+=dx/d*step;state.y+=dy/d*step;}
   const aim=Math.atan2(dy,dx)||0,events=[['lp']]; // instant pick: never deadlock co-op level-up
   if(state.hp>0&&hasTarget){
    // A companion can take damage near mobs; not an invulnerable free combat slot.
    if(dist<38*38)state.hp=Math.max(0,state.hp-3.4*STEP);
    if(now()>=state.nextCast){
     const skill=prior.mv||G.baseStartOf(bot.dex);
     if(typeof skill==='string'&&skill.length<=40&&skill.length){
      events.push(['c',skill,1,aim,0]);
      state.nextCast=now()+1600+Math.floor(Math.random()*300);
     }
    }
   }
   const data=[Math.round(state.x),Math.round(state.y),aim,walk?1:0,
     Math.round(state.hp),Math.round(state.maxHp),state.hp<=0?1:0,
     String(prior.mv||G.baseStartOf(bot.dex)||'').slice(0,40),1,78,aim,1,0,0,0];
   G.Net.injectBot(bot.uid,{k:'f',p:data,ev:events});
  }
 }
 const timer=setInterval(()=>{try{update();}catch(e){console.warn('LAN AI',e);}},Math.round(STEP*1000));
 return {activeBots,update,stop(){clearInterval(timer);states.clear();}};
})();