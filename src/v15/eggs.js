/* PKMSVV v1.5 — in-run egg nests and tiny companion followers.
   No gacha, shiny, permanent ownership or changes to existing companion saves. */
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
 const FX_COLOR={attack:'#ffd472',heal:'#66ffad',shield:'#6edaff',magnet:'#ffe078',slow:'#e99aff'};
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 let player=null,items=[],nests=[],trail=[],spawnAt=55,seq=0,kills=0,lv=1,runTime=0,lastDir={x:0,y:1};
 function limit(){return G.DB?.save?.pkmsvvEggSlot3?3:2;}
 function unlocked(){return !!G.DB?.save?.pkmsvvChapter3Seen;}
 function begin(pl,coop){
  player=pl;items=[];nests=[];trail=pl?[{x:pl.x,y:pl.y}]:[];spawnAt=55;seq=0;runTime=0;lastDir={x:0,y:1};kills=pl?.kills||0;lv=pl?.level||1;
  if(!coop&&unlocked())G.Sprites?.preload?.(SPECIES.map(s=>s.dex),7000);
 }
 const support=()=>items.filter(x=>x.hatched&&x.active);
 function roleName(s){return {attack:tr('Tấn công','Attack'),heal:tr('Hồi phục','Healing'),shield:tr('Tạo khiên','Shield'),magnet:tr('Hút vật phẩm','Magnet'),slow:tr('Làm chậm','Slow')}[s.role]||s.role;}
 function nestSpawn(){
  if(!player||nests.length>=2)return;
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
  if(support().length<limit())it.active=true;
  else chooseReplace(it);
 }
 function chooseReplace(fresh){
  const active=support();
  const box=document.createElement('div');box.className='pkmsvv-egg-choice';box.setAttribute('role','dialog');
  box.setAttribute('aria-label',tr('Thay Pokémon hỗ trợ','Replace support Pokémon'));
  const label=dex=>(G.DEX_BY[dex]?.name||'#'+dex);
  box.innerHTML='<div class="pkmsvv-egg-choice-inner"><h3>'+tr('Đội hỗ trợ đã đầy','Support team is full')+'</h3>'+
   '<p>'+label(fresh.dex)+' '+tr('vừa nở. Chọn bé muốn thay, hoặc giữ bé mới đi theo nhưng không kích hoạt.','hatched. Choose one active companion to replace, or keep the new one as an inactive follower.')+'</p>'+
   active.map((p,i)=>'<button type="button" class="btn small" data-replace="'+i+'">'+label(p.dex)+' · '+roleName(byDex[p.dex])+'</button>').join('')+
   '<button type="button" class="btn small ghost" data-leave="1">'+tr('Giữ nguyên đội','Keep current team')+'</button></div>';
  document.body.appendChild(box);
  box.querySelectorAll('[data-replace]').forEach(b=>b.onclick=()=>{
   active[+b.dataset.replace].active=false;fresh.active=true;box.remove();
  });
  box.querySelector('[data-leave]').onclick=()=>box.remove();
 }
 function collect(n){
  const chosen=SPECIES[Math.floor(Math.random()*SPECIES.length)];
  items.push({dex:chosen.dex,id:n.id,hatched:false,active:false,age:0,boost:0,penalty:0,cooldown:chosen.period,x:n.x,y:n.y,anim:null,step:0,moving:false,effectFlash:0});
  G.FX?.ring?.(n.x,n.y,5,43,'#f7dc91',.35,2);
  G.Spawner?.say?.(tr('Đã tìm thấy trứng. Hãy chiến đấu để ấp nở!','Egg found. Keep fighting to hatch it!'),3,true);
 }
 function remaining(it){
  // Kills/levels may accelerate hatching, but actual time >= 20 seconds.
  return Math.max(0,HATCH_MIN-it.age,HATCH_BASE+it.penalty-it.age-it.boost);
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
  const spec=byDex[it.dex];if(!spec||!it.active||pl.dead)return false;
  const enemies=(G.EnemyMgr?.all?.()||[]).filter(e=>e&&!e.dead&&!e.remote&&G.U.dist2(e.x,e.y,it.x,it.y)<260*260);
  const target=enemies.reduce((acc,e)=>!acc||G.U.dist2(e.x,e.y,it.x,it.y)<G.U.dist2(acc.x,acc.y,it.x,it.y)?e:acc,null);
  if((spec.role==='attack'||spec.role==='slow')&&!target)return false;
  if(spec.role==='attack')target.hurt(Math.max(1,spec.power+pl.level*.55),'#ffe8a1',0,0,0);
  else if(spec.role==='heal'){
   if(pl.hp>=pl.maxHp)return false; // Do not show a false heal when already full.
   pl.heal(Math.max(1,pl.maxHp*spec.power));
  }else if(spec.role==='shield')pl.pkmsvvShield=Math.min(pl.maxHp*.25,(pl.pkmsvvShield||0)+pl.maxHp*spec.power);
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
    if(it.age>=HATCH_MIN&&remaining(it)<=0){
     it.hatched=true;it.active=false;it.anim=new G.Sprites.Animator(it.dex,.72,false);
     it.anim.loop('Idle');onHatch(it);
    }
   }else{
    it.cooldown-=dt;
    if(it.cooldown<=0)it.cooldown=effect(it,pl)?byDex[it.dex].period:.5;
   }
  }
 }
 function draw(ctx){
  if(!unlocked()||!player||G.Coop?.active)return;
  ctx.save();
  for(const n of nests){
   if(!G.Camera.sees(n.x,n.y,60))continue;
   if(!G.PKMSVVEggArt?.nest(ctx,n.x,n.y))egg(ctx,n.x,n.y-11,1);
  }
  for(const it of items){
   if(!G.Camera.sees(it.x,it.y,45))continue;
   if(!it.hatched)egg(ctx,it.x,it.y-10,.75,(it.age+it.boost)/45);
   else{
    if(it.anim)it.anim.draw(ctx,it.x,it.y,{alpha:it.active?1:.52});
    if(!it.active){ctx.fillStyle='#d0edf3';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText('◇',it.x,it.y-32);}
   }
  }
  ctx.restore();
 }
 function egg(ctx,x,y,scale,progress=0){
  if(G.PKMSVVEggArt?.egg(ctx,x,y,scale,progress))return;
  // Render a simple placeholder only until the local sprite has loaded.
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  ctx.fillStyle='#ffefbf';ctx.strokeStyle='#d9b879';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(0,0,10,13,0,0,6.283);ctx.fill();ctx.stroke();
  ctx.restore();
 }
 function hud(ctx,w,h){
  if(!unlocked()||G.Coop?.active)return;
  const ready=support().length;
  ctx.save();ctx.fillStyle='rgba(13,48,57,.89)';ctx.strokeStyle='#80ddce';
  const x=Math.max(8,w-147),y=101;ctx.beginPath();ctx.roundRect(x,y,134,25,7);ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff3bd';ctx.font='bold 11px sans-serif';ctx.textAlign='left';
  ctx.fillText(tr('Đồng hành','Companions')+' '+ready+'/'+limit(),x+8,y+16);ctx.restore();
 }
 return {SPECIES,begin,update,draw,hud,limit,unlocked,get followers(){return items;},get nests(){return nests;}};
})();
