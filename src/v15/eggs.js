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
 const COLLECT_TIME=8, NEST_RADIUS=38, HATCH_BASE=45, HATCH_MIN=20;
 const SHINY_CHANCE=.03, MIN_STAT=.5, MAX_STAT=.8, HIT_COOLDOWN=1.25;
 const FX_COLOR={attack:'#ffd472',heal:'#66ffad',shield:'#6edaff',magnet:'#ffe078',slow:'#e99aff'};
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 let player=null,items=[],nests=[],trail=[],spawnAt=55,seq=0,kills=0,lv=1,runTime=0,lastDir={x:0,y:1};
 function limit(){return G.DB?.save?.pkmsvvEggSlot3?3:2;}
 function unlocked(){return !!G.DB?.save?.pkmsvvChapter3Seen;}
 function begin(pl,coop){
  player=pl;items=[];nests=[];trail=pl?[{x:pl.x,y:pl.y}]:[];spawnAt=55;seq=0;runTime=0;lastDir={x:0,y:1};kills=pl?.kills||0;lv=pl?.level||1;
  if(!coop&&unlocked())G.Sprites?.preload?.(SPECIES.map(s=>s.dex),7000);
 }
 const support=()=>items.filter(x=>x.hatched&&x.active&&x.hp>0);
 const occupied=()=>items.filter(x=>!x.hatched||(x.active&&x.hp>0)).length;
 const vacancy=()=>Math.max(0,limit()-occupied());
 function roleName(s){return {attack:tr('Tấn công','Attack'),heal:tr('Hồi phục','Healing'),shield:tr('Tạo khiên','Shield'),magnet:tr('Hút vật phẩm','Magnet'),slow:tr('Làm chậm','Slow')}[s.role]||s.role;}
 function nestSpawn(){
  if(!player||nests.length>=1||vacancy()<=nests.length)return;
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
  if(!G.DB.save.pkmsvvEggSlot3&&G.DB.save.pkmsvvChapter3Seen&&stats.pkmsvvEgg15min&&stats.pkmsvvEggsHatched>=20){
   G.DB.save.pkmsvvEggSlot3=true;
   G.Spawner?.say?.(tr('Nhà Ấp Trứng: mở slot support thứ ba!','Egg Keeper: third support slot unlocked!'),5,true);
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
  it.spd=Math.max(25,Number(player.spd||player.baseSpd||120)*it.statScale);
  it.shield=0;it.hitCooldown=1.2;it.hurtFlash=0;
  it.anim=new G.Sprites.Animator(it.dex,.72,it.shiny);
  it.anim.loop('Idle');
  if(it.shiny){
   G.Sprites?.preload?.([it.dex],5000,true);
   G.Spawner?.say?.(tr('Một Pokémon hỗ trợ Shiny đã nở! (100% chỉ số)','A Shiny support Pokémon hatched! (100% stats)'),4,true);
   G.FX?.ring?.(it.x,it.y,10,80,'#ffe773',.8,3);
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
 function effect(it,pl){
  const spec=byDex[it.dex];if(!spec||!it.active||it.hp<=0||pl.dead)return false;
  const enemies=(G.EnemyMgr?.all?.()||[]).filter(e=>e&&!e.dead&&!e.remote&&G.U.dist2(e.x,e.y,it.x,it.y)<260*260);
  const target=enemies.reduce((acc,e)=>!acc||G.U.dist2(e.x,e.y,it.x,it.y)<G.U.dist2(acc.x,acc.y,it.x,it.y)?e:acc,null);
  if((spec.role==='attack'||spec.role==='slow')&&!target)return false;
  if(spec.role==='attack')target.hurt(Math.max(1,(spec.power+pl.level*.55)*it.statScale),'#ffe8a1',0,0,0);
  else if(spec.role==='heal'){
   const wounded=support().filter(a=>a.hp<a.maxHp);
   const teammate=wounded.reduce((best,a)=>!best||a.hp/a.maxHp<best.hp/best.maxHp?a:best,null);
   // Heal a wounded teammate when they are worse off than the hero.
   if(teammate&&teammate.hp/teammate.maxHp<pl.hp/pl.maxHp){
    teammate.hp=Math.min(teammate.maxHp,teammate.hp+Math.max(1,teammate.maxHp*spec.power*it.statScale));
    G.FX?.ring?.(teammate.x,teammate.y,6,35,FX_COLOR.heal,.4,2);
   }else{
    if(pl.hp>=pl.maxHp)return false;
    pl.heal(Math.max(1,pl.maxHp*spec.power*it.statScale));
   }
  }else if(spec.role==='shield'){
   pl.pkmsvvShield=Math.min(pl.maxHp*.25,(pl.pkmsvvShield||0)+pl.maxHp*spec.power*it.statScale);
   for(const teammate of support()) teammate.shield=Math.min(teammate.maxHp*.25,(teammate.shield||0)+teammate.maxHp*spec.power*it.statScale);
  }
  else if(spec.role==='slow')target.applySlow(spec.power,2.8);
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
   G.FX?.ring?.(pl.x,pl.y,8,56,c,.45,2);
   G.FX?.burst?.(pl.x,pl.y-12,c,6,65);
   G.FX?.dmgText?.(pl.x,pl.y-38,
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
  const move=dist>5;
  if(move){
   const maxStep=Math.min(dist,dt*148);
   const nx=it.x+dx/dist*maxStep,ny=it.y+dy/dist*maxStep;
   if(!G.World?.isFree||G.World.isFree(nx,ny,9)){it.x=nx;it.y=ny;}
   else if(G.World.isFree(nx,it.y,9))it.x=nx;
   else if(G.World.isFree(it.x,ny,9))it.y=ny;
  }
  if(it.hatched&&it.anim){
   it.anim.dir=G.Sprites.dirFromAngle?.(Math.atan2(dy,dx))??it.anim.dir;
   it.anim.loop(move?'Walk':'Idle');
   it.anim.update(dt);
  }
  it.moving=move;it.effectFlash=Math.max(0,(it.effectFlash||0)-dt);
 }
 function update(dt,pl,time,coop){
  if(!pl||!unlocked()||coop)return;
  player=pl;runTime=time;
  // Prevent long background frames from completing an 8-second capture instantly.
  dt=Math.max(0,Math.min(dt,.25));
  const stats=G.DB.save.stats||(G.DB.save.stats={});
  if(time>=900&&!stats.pkmsvvEgg15min){stats.pkmsvvEgg15min=true;G.DB.commit(true);}
  if(!G.DB.save.pkmsvvEggSlot3&&stats.pkmsvvEgg15min&&stats.pkmsvvEggsHatched>=20){
   G.DB.save.pkmsvvEggSlot3=true;G.DB.commit(true);
  }
  if(pl.dead)return;
  if(time>=spawnAt){nestSpawn();spawnAt=time+100;}
  for(let i=nests.length-1;i>=0;i--){
   const n=nests[i];n.age+=dt;
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
   follow(it,j,pl,dt);
   if(!it.hatched){
    it.age+=dt;it.boost+=dk*1.5+dl*5;
    if(it.age>=HATCH_MIN+it.penalty&&remaining(it)<=0){
     it.hatched=true;it.active=false;it.anim=new G.Sprites.Animator(it.dex,.72,false);
     it.anim.loop('Idle');onHatch(it);
    }
   }else{
    it.cooldown-=dt;
    if(it.cooldown<=0)it.cooldown=effect(it,pl)?byDex[it.dex].period:.5;
   }
  }
 }
 function bar(ctx,x,y,width,seconds,maxTime,color,label){
  // Seconds REMAINING: filled right edge retreats towards the left.
  const ratio=Math.max(0,Math.min(1,seconds/Math.max(1,maxTime)));
  ctx.save();
  ctx.fillStyle='rgba(6,21,36,.9)';ctx.strokeStyle='#071b29';ctx.lineWidth=2;
  ctx.fillRect(x-width/2-3,y-3,width+6,16);ctx.strokeRect(x-width/2-3,y-3,width+6,16);
  ctx.fillStyle='#152c40';ctx.fillRect(x-width/2,y,width,10);
  ctx.fillStyle=color;ctx.fillRect(x-width/2,y,width*ratio,10);
  ctx.fillStyle='#fffbea';ctx.strokeStyle='#06162b';ctx.lineWidth=2;
  ctx.textAlign='center';ctx.font='bold 10px sans-serif';
  const msg=label+' '+Math.ceil(seconds)+'s';
  ctx.strokeText(msg,x,y-8);ctx.fillText(msg,x,y-8);
  ctx.restore();
 }
 function draw(ctx){
  if(!unlocked()||!player||G.Coop?.active)return;
  ctx.save();
  for(const n of nests){
   if(!G.Camera.sees(n.x,n.y,60))continue;
   if(!G.PKMSVVEggArt?.nest(ctx,n.x,n.y))egg(ctx,n.x,n.y-11,1);
   if(n.collecting>0)bar(ctx,n.x,n.y-53,66,
      COLLECT_TIME-n.collecting,COLLECT_TIME,'#ffe088',tr('Lấy trứng','Collecting'));
   else{
    ctx.fillStyle='#ffe9a0';ctx.font='bold 10px sans-serif';ctx.textAlign='center';
    ctx.fillText(tr('Giữ 8 giây','Hold 8s'),n.x,n.y-44);
   }
  }
  for(const it of items){
   if(!G.Camera.sees(it.x,it.y,55))continue;
   if(!it.hatched){
    const remainingTime=remaining(it);
    egg(ctx,it.x,it.y-10,.75,1-remainingTime/(HATCH_BASE+it.penalty));
    bar(ctx,it.x,it.y-41,56,remainingTime,HATCH_BASE+it.penalty,
        '#86e2fd',tr('Đang ấp','Hatching'));
   }else{
    // Sprite feet remain anchored on ground, with Walk/Idle directional anim.
    if(it.anim)it.anim.draw(ctx,it.x,it.y,{alpha:it.active?1:.52});
    if(it.effectFlash>0&&it.active){
     const c=FX_COLOR[byDex[it.dex]?.role]||'#fff8a9';
     ctx.globalAlpha=Math.min(.55,it.effectFlash*.62);
     ctx.strokeStyle=c;ctx.lineWidth=3;
     ctx.beginPath();ctx.ellipse(it.x,it.y-6,20+(1-it.effectFlash)*14,10,0,0,Math.PI*2);ctx.stroke();
     ctx.globalAlpha=1;
    }
    if(!it.active){ctx.fillStyle='#d0edf3';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText('◇',it.x,it.y-32);}
   }
  }
  ctx.restore();
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
 return {SPECIES,begin,update,onHurt,remaining,draw,hud,limit,unlocked,get followers(){return items;},get nests(){return nests;}};
})();
