/* PKMSVV v1.5 — in-run egg nests and tiny companion followers.
   Shiny support is 3% per hatch, stays in the RUN only, no ownership/save changes. */
G.PKMSVVEggs=(()=>{
 const SPECIES=[
  {dex:172,role:'attack',period:3.3,power:9}, // Pichu
  {dex:447,role:'attack',period:4.3,power:16}, // Riolu
  {dex:173,role:'heal',period:11,power:.045}, // Cleffa
  {dex:35,role:'heal',period:14,power:.08}, // Clefairy
  {dex:360,role:'shield',period:17,power:.12}, // Wynaut
  {dex:438,role:'shield',period:12,power:.065}, // Bonsly
  {dex:175,role:'magnet',period:12,power:18}, // Togepi
  {dex:174,role:'slow',period:9,power:.32} // Igglybuff
 ];
 const byDex=Object.fromEntries(SPECIES.map(x=>[x.dex,x]));
 const COLLECT_TIME=4, NEST_RADIUS=38, HATCH_BASE=45, HATCH_MIN=20;
 const SHINY_CHANCE=.03, MIN_STAT=.5, MAX_STAT=.8, HIT_COOLDOWN=1.25;
 const FX_COLOR={attack:'#ffd472',heal:'#66ffad',shield:'#6edaff',magnet:'#ffe078',slow:'#e99aff'};
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 let player=null,items=[],nests=[],trail=[],spawnAt=55,seq=0,kills=0,lv=1,runTime=0,lastDir={x:0,y:1},wasInArena=false;
 // New teams start with one slot. Finishing the Chapter 3 egg quest grants slot two.
 // Respect the previous 'slot3' unlock for compatibility with existing saves.
 function hasSecondSlot(){return !!(G.DB?.save?.pkmsvvEggSlot2||G.DB?.save?.pkmsvvEggSlot3);}
 function limit(){return hasSecondSlot()?2:1;}
 function unlocked(){return !!G.DB?.save?.pkmsvvChapter3Seen;}
 function begin(pl,coop){
  player=pl;items=[];nests=[];trail=pl?[{x:pl.x,y:pl.y}]:[];spawnAt=55;seq=0;runTime=0;lastDir={x:0,y:1};wasInArena=!!G.Rift?.inArena;kills=pl?.kills||0;lv=pl?.level||1;
  if(!coop&&unlocked())G.Sprites?.preload?.(SPECIES.map(s=>s.dex),7000);
 }
 const support=()=>items.filter(x=>x.hatched&&x.active&&x.hp>0);
 const occupied=()=>items.filter(x=>!x.hatched||(x.active&&x.hp>0)).length;
 const vacancy=()=>Math.max(0,limit()-occupied());
 function roleName(s){return {attack:tr('Tấn công','Attack'),heal:tr('Hồi phục','Healing'),shield:tr('Tạo khiên','Shield'),magnet:tr('Hút vật phẩm','Magnet'),slow:tr('Làm chậm','Slow')}[s.role]||s.role;}
 function nestSpawn(){
  if(!player||G.Rift?.inArena||nests.length>=1||vacancy()<=nests.length)return;
  for(let i=0;i<14;i++){
   const a=Math.random()*Math.PI*2,d=165+Math.random()*245;
   const x=player.x+Math.cos(a)*d,y=player.y+Math.sin(a)*d;
   if(G.World.isLiquid(x,y)||!G.World.isFree(x,y,18))continue;
   nests.push({id:++seq,x,y,age:0,collecting:0});G.Spawner?.say?.(tr('Một ổ trứng đã xuất hiện!','An egg nest has appeared!'),3);return;
  }
 }
 function onHatch(it){
  const stats=G.DB.save.stats||(G.DB.save.stats={});
  stats.pkmsvvEggsHatched=Math.min(99999,(stats.pkmsvvEggsHatched||0)+1);
  if(!hasSecondSlot()&&G.DB.save.pkmsvvChapter3Seen&&stats.pkmsvvEgg15min&&stats.pkmsvvEggsHatched>=20){
   G.DB.save.pkmsvvEggSlot2=true;
   G.Spawner?.say?.(tr('Hoàn thành thử thách Chương 3: mở ô đồng hành thứ hai!','Chapter 3 challenge complete: second companion slot unlocked!'),5,true);
  }
  G.DB.commit(true);
  G.FX?.ring?.(it.x,it.y,6,62,'#ffe17b',.55,2);
  // Reserved egg slots prevent overflow; there is no replacement dialog.
  it.active=true;
  it.shiny=Math.random()<SHINY_CHANCE;
  it.statScale=it.shiny?1:MIN_STAT+Math.random()*(MAX_STAT-MIN_STAT);
  it.maxHp=Math.max(1,Math.round((player.maxHp||100)*it.statScale));
  it.hp=it.maxHp;
  it.atk=Math.max(1,Number(player.atk||player.baseAtk||10)*it.statScale);
  it.def=Math.max(0,Number(player.reduction||0)*it.statScale);
  it.spdScale=it.shiny?1:.8+Math.random()*.1;
  it.spd=Math.max(25,Number(player.spd||player.baseSpd||120)*it.spdScale);
  it.shield=0;it.hitCooldown=1.2;it.hurtFlash=0;
  it.anim=new G.Sprites.Animator(it.dex,.72,it.shiny);
  it.anim.loop('Idle');
  if(it.shiny){
   G.Sprites?.preload?.([it.dex],5000,true);
   G.Spawner?.say?.(tr('Một Pokémon hỗ trợ Shiny đã nở! (100% chỉ số)','A Shiny support Pokémon hatched! (100% stats)'),4,true);
   G.FX?.ring?.(it.x,it.y,10,80,'#ffe773',.8,3);
  }else{
   G.Spawner?.say?.(tr('Pokémon hỗ trợ nở: '+Math.round(it.statScale*100)+'% chỉ số!',
                           'Support hatched: '+Math.round(it.statScale*100)+'% stats!'),2.5);
  }
 }
 function collect(n){
  const chosen=SPECIES[Math.floor(Math.random()*SPECIES.length)];
  items.push({dex:chosen.dex,id:n.id,hatched:false,active:false,age:0,boost:0,penalty:0,cooldown:chosen.period,x:n.x,y:n.y,anim:null,step:0,moving:false,effectFlash:0,shiny:false,hp:0,maxHp:0,statScale:0,hitCooldown:0});
  G.FX?.ring?.(n.x,n.y,5,43,'#f7dc91',.35,2);
  G.Spawner?.say?.(tr('Đã tìm thấy trứng. Hãy chiến đấu để ấp nở!','Egg found. Keep fighting to hatch it!'),3,true);
 }
 function remaining(it){
  // Kills/levels may accelerate hatching, but actual time >= 20 seconds.
  return Math.max(0,HATCH_MIN+it.penalty-it.age,HATCH_BASE+it.penalty-it.age-it.boost);
 }
 function onHurt(actualDamage){
  if(!(actualDamage>0)||!unlocked()||!player||G.Coop?.active)return;
  let count=0;
  for(const it of items){
   if(it.hatched)continue;
   it.penalty=(it.penalty||0)+3;count++;
   G.FX?.dmgText?.(it.x,it.y-39,'+3s','#ff9fac');
  }
  if(count)G.Spawner?.say?.(tr('Trứng bị chậm ấp +3 giây!','Egg incubation delayed by 3 seconds!'),1.5);
 }
 function hurtSupport(it,raw){
  if(!it||!it.hatched||!it.active||it.hp<=0||it.hitCooldown>0||!(raw>0))return false;
  // They are followers, not tanks: incidental collision only; protected
  // by per-hit cooldown and capped damage to prevent instant deaths in swarms.
  const blocked=Math.min(Math.max(0,it.shield||0),raw);
  it.shield=Math.max(0,(it.shield||0)-blocked);
  const loss=Math.min(it.maxHp*.20,Math.max(0,(raw-blocked)*(1-Math.min(.65,it.def||0))));
  it.hitCooldown=HIT_COOLDOWN;
  if(loss<=0){
   G.FX?.ring?.(it.x,it.y,5,32,'#82dfff',.25,2);
   return false;
  }
  it.hp=Math.max(0,it.hp-loss);it.hurtFlash=.5;it.recentlyHit=3;
  G.FX?.dmgText?.(it.x,it.y-29,'-'+Math.ceil(loss),'#ff939c');
  G.FX?.burst?.(it.x,it.y-12,'#ff8c94',4,45);
  if(it.hp<=0){
   it.active=false;
   G.FX?.ring?.(it.x,it.y,10,61,it.shiny?'#fff1a3':'#ff8899',.6,2);
   G.Spawner?.say?.(tr('Pokémon hỗ trợ đã bị hạ! Có thể tìm trứng mới.',
                          'A support Pokémon fainted! A new egg may appear.'),3);
   items=items.filter(x=>x!==it); // dead followers never occupy slots
   spawnAt=Math.min(spawnAt,runTime+8); // replacement nest becomes possible
  }
  return true;
 }
 function hitByEnemies(dt){
  const enemies=G.EnemyMgr?.all?.()||[];
  if(!enemies.length)return;
  for(const it of support().slice()){
   if(it.hitCooldown>0)continue;
   for(const e of enemies){
    if(!e||e.dead||e.remote||!(e.dmg>0))continue;
    const radius=(Number(e.r)||12)+11;
    if(Math.abs(e.x-it.x)>radius||Math.abs(e.y-it.y)>radius)continue;
    if(G.U.dist2(e.x,e.y,it.x,it.y)>radius*radius)continue;
    // Enemy touch damage rather than adding support to enemy target AI.
    if(hurtSupport(it,e.dmg*.55))e.touchCd=Math.max(e.touchCd||0,.45);
    break;
   }
  }
 }
 // A lower share of enemies chase supports (player weight 1, support weight .4).
 function enemyTarget(e,pl,dt){
  if(!pl||pl.dead||!unlocked()||G.Coop?.active||e?.remote||e?.boss||e?.pkmsvvBossGuard)return pl;
  e.pkmsvvAggroT=Math.max(0,(e.pkmsvvAggroT||0)-Math.min(.25,Math.max(0,dt||0)));
  const team=support().filter(it=>G.U.dist2(it.x,it.y,e.x,e.y)<230*230);
  let chosen=team.find(it=>it.id===e.pkmsvvAggroId);
  if(e.pkmsvvAggroT<=0||!chosen){
   chosen=null;e.pkmsvvAggroId=null;e.pkmsvvAggroT=2+Math.random()*1.5;
   const pool=team.filter(it=>(G.EnemyMgr?.all?.()||[]).filter(m=>m!==e&&m.pkmsvvAggroId===it.id&&!m.dead).length<4);
   const threshold=pool.length*.4/(1+pool.length*.4);
   if(pool.length&&Math.random()<threshold){
    chosen=pool[Math.floor(Math.random()*pool.length)];
    e.pkmsvvAggroId=chosen.id;
   }
  }
  if(!chosen)return pl;
  let proxy=chosen.aggroProxy;
  if(!proxy){proxy=Object.create(pl);chosen.aggroProxy=proxy;}
  proxy.x=chosen.x;proxy.y=chosen.y;proxy.r=11;proxy.bodyH=25;
  proxy.dead=false;proxy.level=pl.level;proxy._vx=0;proxy._vy=0;
  proxy.maxHp=chosen.maxHp;proxy.hp=chosen.hp;
  proxy.hurt=(damage)=>hurtSupport(chosen,damage);
  return proxy;
 }
 function interceptProjectile(p){
  if(!p||p.friendly||G.Coop?.active||!unlocked())return false;
  for(const it of support()){
   if(it.hitCooldown>0)continue;
   const rr=(Number(p.r)||4)+11;
   if(G.U.dist2(it.x,it.y,p.x,p.y)<=rr*rr){
    hurtSupport(it,p.dmg);return true;
   }
  }
  return false;
 }
 function hitHazard(h){
  if(!h||G.Coop?.active||!unlocked())return;
  for(const it of support().slice()){
   if(it.hitCooldown>0)continue;
   let inside=false;
   if(h.kind==='zone')inside=G.U.dist2(it.x,it.y,h.x,h.y)<Math.pow((h.r||0)+7,2);
   else if(h.kind==='beam'){
    const ca=Math.cos(h.angle),sa=Math.sin(h.angle);
    const px=it.x-h.x,py=it.y-h.y,along=px*ca+py*sa;
    inside=along>=-11&&along<=(h.len||0)+11&&Math.abs(-px*sa+py*ca)<=(h.w||0)/2+7;
   }
   if(inside)hurtSupport(it,h.pct?Math.max(h.dmg||0,it.maxHp*h.pct):h.dmg);
  }
 }
 function effect(it,pl){
  const spec=byDex[it.dex];if(!spec||!it.active||it.hp<=0||pl.dead)return false;
  const enemies=(G.EnemyMgr?.all?.()||[]).filter(e=>e&&!e.dead&&!e.remote&&G.U.dist2(e.x,e.y,it.x,it.y)<260*260);
  const target=enemies.reduce((acc,e)=>!acc||G.U.dist2(e.x,e.y,it.x,it.y)<G.U.dist2(acc.x,acc.y,it.x,it.y)?e:acc,null);
  if((spec.role==='attack'||spec.role==='slow')&&!target)return false;
  let recipient=pl;
  if(spec.role==='attack')target.hurt(Math.max(1,(spec.power+pl.level*.55)*it.statScale),'#ffe8a1',0,0,0);
  else if(spec.role==='heal'){
   const wounded=support().filter(a=>a.hp<a.maxHp);
   const teammate=wounded.reduce((best,a)=>!best||a.hp/a.maxHp<best.hp/best.maxHp?a:best,null);
   // Heal a wounded teammate when they are worse off than the hero.
   if(teammate&&teammate.hp/teammate.maxHp<pl.hp/pl.maxHp){
    teammate.hp=Math.min(teammate.maxHp,teammate.hp+Math.max(1,teammate.maxHp*spec.power*it.statScale));
    recipient=teammate;
   }else{
    if(pl.hp>=pl.maxHp)return false;
    pl.heal(Math.max(1,pl.maxHp*spec.power*it.statScale));
   }
  }else if(spec.role==='shield'){
   pl.pkmsvvShield=Math.min(pl.maxHp*.25,(pl.pkmsvvShield||0)+pl.maxHp*spec.power*it.statScale);
   for(const teammate of support()) teammate.shield=Math.min(teammate.maxHp*.25,(teammate.shield||0)+teammate.maxHp*spec.power*it.statScale);
  }
  else if(spec.role==='slow')target.applySlow(spec.power*it.statScale,2.8);
  else if(spec.role==='magnet')G.Pickups?.pullAll?.();
  const c=FX_COLOR[spec.role];
  it.effectFlash=.85;
  G.FX?.ring?.(it.x,it.y,7,48,c,.48,2);
  if(spec.role==='slow'){
   // Igglybuff is a ranged DEBUFF on monsters, not a buff on the hero.
   G.FX?.ring?.(target.x,target.y,6,48,c,.55,2);
   G.FX?.burst?.(target.x,target.y-9,c,7,70);
   G.FX?.dmgText?.(target.x,target.y-26,tr('CHẬM!','SLOWED!'),c);
  }else if(spec.role==='heal'||spec.role==='shield'||spec.role==='magnet'){
   G.FX?.ring?.(recipient.x,recipient.y,8,56,c,.45,2);
   G.FX?.burst?.(recipient.x,recipient.y-12,c,6,65);
   G.FX?.dmgText?.(recipient.x,recipient.y-38,
     spec.role==='heal'?tr('HỒI MÁU','HEAL'):spec.role==='shield'?tr('KHIÊN','SHIELD'):tr('HÚT','MAGNET'),c);
  }else if(target)G.FX?.burst?.(target.x,target.y-10,c,5,52);
  return true;
 }
 function follow(it,j,pl,dt){
  const gap=48+j*30,stepIndex=6+j*4;
  const anchor=trail[stepIndex]||{
   x:pl.x-lastDir.x*gap,y:pl.y-lastDir.y*gap
  };
  // Stagger teammates beside their own trail; never glue sprites to player.
  const side=(j%2?1:-1)*12;
  const tx=anchor.x-lastDir.y*side,ty=anchor.y+lastDir.x*side;
  const dx=tx-it.x,dy=ty-it.y,dist=Math.hypot(dx,dy);
  const ox=it.x,oy=it.y;
  const move=dist>5;
  if(dist>310){
   // The previous navigation point is unreachable or from a teleported map.
   it.x=pl.x-lastDir.x*gap-lastDir.y*side;
   it.y=pl.y-lastDir.y*gap+lastDir.x*side;
  }else if(move){
   const maxStep=Math.min(dist,dt*Math.max(75,Math.min(230,it.hatched?it.spd*1.12:148)));
   const nx=it.x+dx/dist*maxStep,ny=it.y+dy/dist*maxStep;
   if(!G.World?.isFree||G.World.isFree(nx,ny,9)){it.x=nx;it.y=ny;}
   else if(G.World.isFree(nx,it.y,9))it.x=nx;
   else if(G.World.isFree(it.x,ny,9))it.y=ny;
  }
  const moved=Math.hypot(it.x-ox,it.y-oy);
  if(it.hatched&&it.anim){
   const heading=moved>.1?Math.atan2(it.y-oy,it.x-ox):Math.atan2(dy,dx);
   it.anim.dir=G.Sprites.dirFromAngle?.(heading)??it.anim.dir;
   it.anim.loop(moved>.6?'Walk':'Idle',Math.max(.8,Math.min(1.4,it.spd/110)));
   it.anim.update(dt);
  }
  it.moving=moved>.6;it.effectFlash=Math.max(0,(it.effectFlash||0)-dt);
  it.hurtFlash=Math.max(0,(it.hurtFlash||0)-dt);
  it.recentlyHit=Math.max(0,(it.recentlyHit||0)-dt);
 }
 // Reanchor every teammate on map-to-rift and rift-to-map transitions.
 function syncArena(pl){
  const inArena=!!G.Rift?.inArena;
  if(inArena===wasInArena)return;
  wasInArena=inArena;
  trail=[{x:pl.x,y:pl.y}];lastDir={x:0,y:1};
  if(inArena)nests=[];
  for(let i=0;i<items.length;i++){
   const it=items[i];
   const a=2*Math.PI*(i+1)/(items.length+1);
   it.x=pl.x+Math.cos(a)*44;
   it.y=pl.y+Math.sin(a)*32;
   it.moving=false;
  }
 }
 function update(dt,pl,time,coop){
  if(!pl||!unlocked()||coop)return;
  player=pl;runTime=time;
  // Prevent long background frames from completing an 8-second capture instantly.
  dt=Math.max(0,Math.min(dt,.25));
  const stats=G.DB.save.stats||(G.DB.save.stats={});
  if(time>=900&&!stats.pkmsvvEgg15min){stats.pkmsvvEgg15min=true;G.DB.commit(true);}
  if(!hasSecondSlot()&&stats.pkmsvvEgg15min&&stats.pkmsvvEggsHatched>=20){
   G.DB.save.pkmsvvEggSlot2=true;G.DB.commit(true);
  }
  if(pl.dead)return;
  syncArena(pl);
  if(G.Rift?.inArena&&nests.length)nests=[];
  if(vacancy()<=0&&nests.length)nests.length=0;
  if(time>=spawnAt){
   if(!G.Rift?.inArena&&vacancy()>nests.length)nestSpawn();
   spawnAt=time+(vacancy()>nests.length?100:12);
  }
  for(let i=nests.length-1;i>=0;i--){
   const n=nests[i];n.age+=dt;
   if(vacancy()<=0){nests.splice(i,1);continue;}
   if(G.U.dist2(pl.x,pl.y,n.x,n.y)<=NEST_RADIUS*NEST_RADIUS){
    n.collecting=Math.min(COLLECT_TIME,n.collecting+dt);
    if(n.collecting>=COLLECT_TIME){nests.splice(i,1);collect(n);}
   }else n.collecting=0; // Leaving the nest interrupts the channel.
   if(n.age>180&&n.collecting===0)nests.splice(i,1);
  }
  const dk=Math.max(0,(pl.kills||0)-kills),dl=Math.max(0,(pl.level||1)-lv);
  kills=pl.kills||0;lv=pl.level||1;
  const head=trail[0];
  if(head){
   const dx=pl.x-head.x,dy=pl.y-head.y;
   if(dx*dx+dy*dy>=64){
    const length=Math.hypot(dx,dy);
    lastDir={x:dx/length,y:dy/length};
    trail.unshift({x:pl.x,y:pl.y});
    if(trail.length>90)trail.length=90;
   }
  }else trail.unshift({x:pl.x,y:pl.y});
  for(let j=0;j<items.length;j++){
   const it=items[j];
   it.hitCooldown=Math.max(0,(it.hitCooldown||0)-dt);
   follow(it,j,pl,dt);
   if(!it.hatched){
    it.age+=dt;it.boost+=dk*1.5+dl*5;
    if(it.age>=HATCH_MIN+it.penalty&&remaining(it)<=0){
     it.hatched=true;it.active=false;onHatch(it);
    }
   }else{
    it.cooldown-=dt;
    if(it.cooldown<=0)it.cooldown=effect(it,pl)?byDex[it.dex].period:.5;
   }
  }
  hitByEnemies(dt);
 }
 function bar(ctx,x,y,width,seconds,maxTime){
  // One discreet white 2px line. The right edge retreats as time runs out.
  // No frame, dark track, seconds label, glow or floating title.
  const ratio=Math.max(0,Math.min(1,seconds/Math.max(1,maxTime)));
  if(ratio<=0)return;
  ctx.save();
  ctx.globalAlpha=.92;
  ctx.fillStyle='#ffffff';
  ctx.fillRect(x-width/2,y,width*ratio,2);
  ctx.restore();
 }
 // Ground elements stay below entities; support sprites are Y-sorted in drawScene.
 function draw(ctx){
  if(!unlocked()||!player||G.Coop?.active||G.Rift?.inArena)return;
  ctx.save();
  for(const n of nests){
   if(!G.Camera.sees(n.x,n.y,60))continue;
   if(!G.PKMSVVEggArt?.nest(ctx,n.x,n.y))egg(ctx,n.x,n.y-11,1);
   if(n.collecting>0)bar(ctx,n.x,n.y-34,48,COLLECT_TIME-n.collecting,COLLECT_TIME);
  }
  ctx.restore();
 }
 function drawFollower(ctx,it){
  ctx.save();
  if(!it.hatched){
   const remainingTime=remaining(it);
   egg(ctx,it.x,it.y-10,.75,1-remainingTime/(HATCH_BASE+it.penalty));
   bar(ctx,it.x,it.y-31,42,remainingTime,HATCH_BASE+it.penalty);
  }else{
   if(it.anim)it.anim.draw(ctx,it.x,it.y,{alpha:it.hurtFlash>0?.72:1});
   if(it.shiny){
    ctx.textAlign='center';ctx.font='bold 14px sans-serif';
    ctx.shadowColor='#ffe581';ctx.shadowBlur=7;ctx.fillStyle='#ffdc71';
    ctx.fillText('★',it.x+18,it.y-28);ctx.shadowBlur=0;
   }
   const hpRatio=Math.max(0,Math.min(1,(it.hp||0)/Math.max(1,it.maxHp||1)));
   if(hpRatio<.999||(it.recentlyHit||0)>0){
    ctx.save();ctx.globalAlpha=hpRatio<.999?.85:.4;
    const bx=it.x-13,by=it.y-35;
    ctx.fillStyle='#193942';ctx.fillRect(bx,by,26,2);
    ctx.fillStyle=hpRatio>.55?'#a3f2cd':hpRatio>.25?'#ffe08b':'#ff8395';
    ctx.fillRect(bx,by,26*hpRatio,2);ctx.restore();
   }
   if(it.effectFlash>0&&it.active){
    const c=FX_COLOR[byDex[it.dex]?.role]||'#fff8a9';
    ctx.globalAlpha=Math.min(.55,it.effectFlash*.62);
    ctx.strokeStyle=c;ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(it.x,it.y-6,20+(1-it.effectFlash)*14,10,0,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=1;
   }
   if(it.hurtFlash>0){
    ctx.globalAlpha=it.hurtFlash*.5;ctx.strokeStyle='#ffb2bd';ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(it.x,it.y-9,14,8,0,0,Math.PI*2);ctx.stroke();
   }
  }
  ctx.restore();
 }
 function drawables(cam){
  if(!unlocked()||!player||G.Coop?.active)return [];
  return items.filter(it=>cam.sees(it.x,it.y,55))
   .map(it=>({y:it.y,draw(ctx){drawFollower(ctx,it);}}));
 }
 function egg(ctx,x,y,scale,progress=0){
  if(G.PKMSVVEggArt?.egg(ctx,x,y,scale,progress))return;
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  ctx.fillStyle='#ffefbf';ctx.strokeStyle='#d9b879';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(0,0,10,13,0,0,6.283);ctx.fill();ctx.stroke();
  ctx.restore();
 }
 function arrow(ctx,w,h){
  if(!nests.length||!player)return;
  const n=nests.reduce((a,b)=>!a||G.U.dist2(player.x,player.y,b.x,b.y)<G.U.dist2(player.x,player.y,a.x,a.y)?b:a,null);
  if(!n||G.U.dist2(player.x,player.y,n.x,n.y)<=NEST_RADIUS*NEST_RADIUS)return;
  const cam=G.Camera;if(!cam?.scale)return;
  const sx=(n.x-cam.left())*cam.scale,sy=(n.y-44-cam.top())*cam.scale;
  const off=sx<38||sx>w-38||sy<72||sy>h-78;
  const x=off?Math.max(46,Math.min(w-46,sx)):sx;
  const y=off?Math.max(82,Math.min(h-86,sy)):sy-12;
  const pulse=Math.abs(Math.sin(runTime*5))*5;
  const angle=off?Math.atan2(sy-y,sx-x):Math.PI/2;
  ctx.save();ctx.translate(x,y);
  if(!off)ctx.translate(0,-pulse);
  ctx.rotate(angle);
  ctx.lineWidth=4;ctx.strokeStyle='#132039';ctx.fillStyle='#ffe28d';
  ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-10,-10);ctx.lineTo(-6,0);ctx.lineTo(-10,10);ctx.closePath();
  ctx.stroke();ctx.fill();ctx.restore();
  ctx.save();ctx.textAlign='center';ctx.font='bold 11px sans-serif';
  ctx.lineWidth=3;ctx.strokeStyle='#09182c';ctx.fillStyle='#ffefb2';
  const label=tr('Ổ TRỨNG','EGG NEST')+(off?' · '+Math.round(Math.sqrt(G.U.dist2(player.x,player.y,n.x,n.y))/32)+'m':'');
  const textY=off?y-20:y-32-pulse;
  ctx.strokeText(label,x,textY);ctx.fillText(label,x,textY);ctx.restore();
 }
 function hud(ctx,w,h){
  if(!unlocked()||G.Coop?.active)return;
  arrow(ctx,w,h);
  const ready=support().length;
  ctx.save();ctx.fillStyle='rgba(13,48,57,.89)';ctx.strokeStyle='#80ddce';
  const x=Math.max(8,w-147),y=101;ctx.beginPath();ctx.roundRect(x,y,134,25,7);ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff3bd';ctx.font='bold 11px sans-serif';ctx.textAlign='left';
  ctx.fillText(tr('Đồng hành','Companions')+' '+ready+'/'+limit(),x+8,y+16);ctx.restore();
 }
 return {SPECIES,SHINY_CHANCE,COLLECT_TIME,begin,update,onHurt,hurtSupport,enemyTarget,interceptProjectile,hitHazard,remaining,draw,drawables,hud,limit,unlocked,get followers(){return items;},get nests(){return nests;},get occupied(){return occupied();}};
})();
