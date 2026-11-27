/* PKMSVV 3DS Stage 4: source-verified 3DS guard/screen/rest/decoy.
 * Non-persistent per-run player states. Actual enemy bait, not just cosmetics.
 * Game engine bridge is applied in scripts/patch-3ds-support-families.cjs.
 */
G.PKMSVV3DSStage4Support=(()=>{
 'use strict';
 const old=G.PKMSVV3DSCombatFX;
 if(!old||!G.PKMSVV3DSMoveFamilies)throw Error('3DS Stage4 support needs Stage2+3 installed');
 const PREFIX='pkmsvv3ds-',decoys=[];
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,Number(v)||0));
 function data(p) {
  return p.__pkmsvv3dsSupport||(p.__pkmsvv3dsSupport={
   guard:0,rest:0,zzz:0,physical:{t:0,k:0},special:{t:0,k:0}
  });
 }
 function isResting(p){return !!p&&!p.dead&&data(p).rest>0;}
 function needsRest(p){return !!p&&!p.dead&&p.hp<p.maxHp*.40;}
 function tickPlayer(p,dt){
  if(!p||p.dead)return;
  const s=data(p),d=clamp(dt,0,.25);
  s.guard=Math.max(0,s.guard-d);
  for(const kind of ['physical','special'])s[kind].t=Math.max(0,s[kind].t-d);
  if(s.rest>0){
   s.rest=Math.max(0,s.rest-d);
   s.zzz-=d;
   if(s.zzz<=0){s.zzz=.6;G.FX?.dmgText?.(p.x+8,p.y-(p.bodyH||24)-6,'Z','#c9a6ff');}
  }
 }
 // The original Web .hurt() keeps immunity, Pippi reactions, Focus Sash,
 // stat reduction, weather and equipment. This hook changes only its input.
 function incomingDamage(p,amount,pure=false,category='physical'){
  const s=data(p);
  // Native Protect stops ordinary hits. Pure Judgment/Arceus damage bypasses
  // to avoid accidental permanent immunity to a boss's lethal mechanic.
  if(s.guard>0&&!pure){
   p.invuln=Math.max(p.invuln||0,.2);
   if(Math.random()<.3)G.FX?.ring?.(p.x,p.y-(p.bodyH||24)*.5,p.r||10,(p.r||10)*2.2,'#9ae6ff',.2,2);
   return {blocked:true,amount:0};
  }
  // Reflect = physical, Light Screen = special. Never compound other screen
  // or alter pure, already-protected, or unclassified true-damage paths.
  const screen=(category==='special'?s.special:category==='physical'?s.physical:null);
  if(screen&&screen.t>0&&!pure)amount*=1-clamp(screen.k,0,.9);
  return {blocked:false,amount};
 }
 function activeDecoys(){
  for(let i=decoys.length-1;i>=0;i--){
   const f=decoys[i];
   if(f.t>=f.life||f.gone||!f.owner||f.owner.dead)decoys.splice(i,1);
  }
  return decoys;
 }
 function decoyFor(enemy,player){
  if(!enemy||enemy.dead||enemy.boss||enemy.judge||enemy.arceus||!player)return null;
  let best=null,bd=Infinity;
  for(const f of activeDecoys()){
   if(f.ghost||f.owner!==player)continue;
   const d=(enemy.x-f.x)**2+(enemy.y-f.y)**2;
   if(d>f.pull*f.pull||d>=bd)continue;
   best=f;bd=d;
  }
  if(!best)return null;
  // Native 3DS temporarily redirects pursuit to a decoy point. Proxy
  // preserves readable player properties but never changes the real player's
  // coordinates or HP when a normal enemy collides with the silhouette.
  const target=Object.create(player);
  target.x=best.x;target.y=best.y;
  target.hurt=()=>{};
  target.__pkmsvv3dsDecoy=true;
  return target;
 }
 function spawn(fields,p,m,ghost=false){
  if(!m||!['guard','screen','rest','decoy'].includes(m.kind))
   return old.spawn(fields,p,m,ghost);
  if(!p||p.dead||!Array.isArray(fields))return false;
  const fx=G.FX;
  if(m.kind==='guard'){
   if(!ghost){
    data(p).guard=clamp(m.dur,0.1,8);
    fx?.dmgText?.(p.x,p.y-(p.bodyH||24)-8,'Protect','#9ae6ff');
   }
   fx?.ring?.(p.x,p.y-8,(p.r||12)*3,(p.r||12)*1.2,'#9ae6ff',.3,3);
   return true;
  }
  if(m.kind==='screen'){
   const physical=Number(m.shield)!==1,k=physical?'physical':'special';
   const col=physical?'#ffcb3d':'#c47bff';
   if(!ghost){
    const s=data(p)[k];
    s.t=clamp(m.dur,.2,60);s.k=clamp(m.amount,0,.9);
    fx?.dmgText?.(p.x,p.y-(p.bodyH||24)-8,m.name,col);
   }
   fx?.ring?.(p.x,p.y-8,p.r||12,(p.r||12)*3.5,col,.4,3);
   return true;
  }
  if(m.kind==='rest'){
   if(!ghost&&!needsRest(p))return false;
   if(!ghost){
    p.heal?.(p.maxHp*clamp(m.amount,0,1.5));
    const s=data(p);s.rest=clamp(m.dur,.15,6);s.zzz=0;
   }
   fx?.ring?.(p.x,p.y,6,60,'#c9a6ff',.5,3);
   return true;
  }
  // Native FK_DECOY: a pale stationary copy behind you attracts nearby
  // ordinary enemies; bosses ignore it. No damage, no HP, no save mutation.
  if(activeDecoys().length>=6)return false;
  const n=Math.min(4,Math.max(1,Math.round(m.count||1)));
  let made=0;
  for(let i=0;i<n&&activeDecoys().length<6&&fields.length<250;i++){
   const a=(Number(p.aim)||0)+Math.PI+(i-(n-1)/2)*.9;
   const f={kind:PREFIX+'decoy',owner:p,m,ghost:!!ghost,
    x:p.x+Math.cos(a)*50,y:p.y+Math.sin(a)*40,
    t:0,life:clamp(m.dur,.3,10),pull:clamp(m.radius,30,520),
    r:Math.max(8,p.r||12),col:'#e8fbff'};
   fields.push(f);decoys.push(f);made++;
   if(G.Camera?.sees?.(f.x,f.y,40))fx?.burst?.(f.x,f.y-10,'#e8fbff',8,90);
  }
  return made>0;
 }
 function update(f,dt,hooks){
  if(f?.kind!==PREFIX+'decoy')return old.update(f,dt,hooks);
  if(!f.owner||f.owner.dead)return true;
  return f.t>=f.life;
 }
 function draw(ctx,f,now){
  if(f?.kind!==PREFIX+'decoy')return old.draw(ctx,f,now);
  if(!ctx||!f.owner)return;
  const alpha=clamp((f.life-f.t)/Math.min(.5,f.life),0,1)*.55;
  if(!alpha)return;
  ctx.save();
  ctx.globalAlpha=alpha;
  // Reuse the actual Pokémon's current 8-direction PMD sprite, not a circle
  // which might be mistaken for a shield or a map marker.
  if(typeof f.owner.anim?.draw==='function'){
   f.owner.anim.draw(ctx,f.x,f.y,{flash:false,alpha,softFlash:true,color:'#e8fbff'});
  }else{
   ctx.fillStyle='#bfe8ff';
   ctx.fillRect(f.x-8,f.y-20,16,16);
  }
  ctx.restore();
 }
 const api={
  ...old,
  isPortField:f=>!!f&&(
   !!old.isPortField?.(f)||
   !!G.PKMSVV3DSStage3FX?.isStage3Field?.(f)||
   f.kind===PREFIX+'decoy'),
  spawn,update,draw
 };
 G.PKMSVV3DSCombatFX=api;
 return {data,isResting,needsRest,tickPlayer,incomingDamage,decoyFor,
         spawn,update,draw,activeDecoys};
})();
