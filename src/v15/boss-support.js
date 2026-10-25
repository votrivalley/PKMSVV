/* PKMSVV v1.5.3 — 1–3 boss bodyguards, 30% boss HP each.
 * Spawn as hittable enemies, no ownership, eggs or persistent saves.
 */
G.PKMSVVBossSupport=(()=>{
 const POOL=[{dex:172,role:'attack',cd:5},{dex:447,role:'attack',cd:6},
  {dex:173,role:'heal',cd:12},{dex:360,role:'shield',cd:15},
  {dex:174,role:'slow',cd:10}];
 const linked=new Map();
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 function cast(g,b,pl){
  if(g.dead||b.dead||!pl||pl.dead)return false;
  const role=g.pkmsvvRole;
  if(role==='heal'){
   const healed=Math.min(Math.max(0,b.maxHp-b.hp),b.maxHp*.0015,
     Math.max(0,b.rd||0)/6*.2);
   if(healed<1)return false;
   b.hp+=healed;
   G.FX?.ring?.(b.x,b.y,8,60,'#81ffaf',.5,2);
   G.FX?.dmgText?.(b.x,b.y-(b.bodyH||40)-10,'+'+Math.ceil(healed),'#81ffaf');
  }else if(role==='shield'){
   if((b.shieldT||0)>2)return false;
   const amount=Math.min(b.maxHp*.003,Math.max(0,b.rd||0)/6*.3);
   if(amount<1)return false;
   b.shield=Math.max(b.shield||0,amount);
   b.shieldT=5;
   G.FX?.ring?.(b.x,b.y,8,60,'#90d4ff',.5,2);
  }else if(role==='slow'){
   if(Math.hypot(pl.x-g.x,pl.y-g.y)>180)return false;
   pl.slowT=Math.max(pl.slowT||0,.6);
   G.FX?.ring?.(pl.x,pl.y,6,40,'#e7aaff',.5,2);
   G.FX?.dmgText?.(pl.x,pl.y-(pl.bodyH||38)-10,tr('CHẬM!','SLOWED!'),'#e7aaff');
  }else{
   const dx=pl.x-g.x,dy=pl.y-g.y,dist=Math.hypot(dx,dy);
   if(dist>350)return false;
   const shot=G.Projectiles?.spawn?.({x:g.x,y:g.y-12,vx:160*dx/(dist||1),
    vy:160*dy/(dist||1),dmg:Math.max(1,Math.round((b.dmg||30)*.09)),
    r:5,life:1.6,friendly:false,color:'#ffd2a1',mtype:'normal',
    vis:G.VFX?.forType?.('normal')});
   if(shot&&G.Coop?.active&&G.Coop?.isHost)G.Coop?.enemyShot?.(shot,'normal');
   G.FX?.ring?.(g.x,g.y,5,25,'#ffd2a1',.3,2);
  }
  G.FX?.ring?.(g.x,g.y,5,34,'#ffa9da',.3,2);
  return true;
 }
 function spawn(boss){
  if(!boss?.boss||boss.remote||boss.dead||linked.has(boss.id))return [];
  // Unlock boss allies only once players can hatch their own support eggs.
  if(!G.PKMSVVEggs?.unlocked?.())return [];
  if(G.Coop?.active&&!G.Coop?.isHost)return [];
  // Weighted 1/2/3 guardians; never exceeds three.
  const roll=Math.random(),n=roll<.5?1:roll<.82?2:3;
  const guards=[];linked.set(boss.id,guards);
  const hp=Math.max(1,Math.round(boss.maxHp*.30));
  for(let i=0;i<n;i++){
   const option=POOL[Math.floor(Math.random()*POOL.length)];
   const theta=1+i*2*Math.PI/n;
   const x=boss.x+Math.cos(theta)*55,y=boss.y+Math.sin(theta)*42;
   const mon=G.DEX_BY?.[option.dex];
   const def={dex:option.dex,name:mon?.name||'Support',hp,spd:75,
    dmg:Math.max(1,Math.round((boss.dmg||30)*.1)),xp:1,behavior:'chase'};
   const g=new G.Enemy(def,x,y,{hp:1,spd:1,dmg:1},false);
   g.maxHp=hp;g.hp=hp;g.boss=false;
   g.pkmsvvBossGuard=true;g.pkmsvvGuardianOf=boss.id;g.pkmsvvRole=option.role;
   g.pkmsvvAngle=theta;g.pkmsvvRadius=51+i*10;
   g.pkmsvvTime=0;g.pkmsvvCast=option.cd;
   g.update=function(dt,pl){
    if(this.dead){this.fade-=dt;this.anim?.update?.(dt);return;}
    if(boss.dead||!G.EnemyMgr.get(boss.id)){
     // Dissolve without dropping boss loot or duplicating their death effects.
     this.dead=true;this.hp=0;this.fade=.6;
     this.anim?.play?.('Faint',{hold:true});return;
    }
    this.pkmsvvTime+=dt;
    this.touchCd=Math.max(0,(this.touchCd||0)-dt);
    this.flash=Math.max(0,(this.flash||0)-dt);
    this.bob=(this.bob||0)+dt*5;
    if(this.shieldT>0&&(this.shieldT-=dt)<=0)this.shield=0;
    const a=this.pkmsvvAngle+Math.sin(this.pkmsvvTime*.45)*.2;
    const tx=boss.x+Math.cos(a)*this.pkmsvvRadius;
    const ty=boss.y+Math.sin(a)*this.pkmsvvRadius*.78;
    const dx=tx-this.x,dy=ty-this.y,d=Math.hypot(dx,dy);
    if(d>460){this.x=tx;this.y=ty;}
    else if(d>3){
     const step=Math.min(d,Math.max(0,dt)*105);
     const nx=this.x+dx/d*step,ny=this.y+dy/d*step;
     if(!G.World?.isFree||G.World.isFree(nx,ny,8)){this.x=nx;this.y=ny;}
     else if(G.World.isFree(nx,this.y,8))this.x=nx;
     else if(G.World.isFree(this.x,ny,8))this.y=ny;
    }
    this.anim.dir=G.Sprites?.dirFromAngle?.(Math.atan2(dy,dx))??0;
    this.anim.loop(d>4?'Walk':'Idle');
    this.anim.update(dt);
    this.pkmsvvCast-=dt;
    if(this.pkmsvvCast<=0)this.pkmsvvCast=cast(this,boss,pl)?option.cd:.75;
   };
   const baseDraw=g.draw;
   g.draw=function(ctx){
    baseDraw.call(this,ctx);
    if(this.dead)return;
    const pct=Math.max(0,Math.min(1,this.hp/this.maxHp));
    const y=this.y-(this.bodyH||35)-14;
    ctx.fillStyle='#13202a';ctx.fillRect(this.x-22,y,44,7);
    ctx.fillStyle='#ff7eaa';ctx.fillRect(this.x-20,y+2,40*pct,3);
   };
   G.EnemyMgr.add(g);guards.push(g);
   G.FX?.ring?.(g.x,g.y,5,38,'#ffb0d8',.4,2);
  }
  G.Sprites?.preload?.(guards.map(e=>e.dex),7000);
  G.Spawner?.say?.(tr('Boss có '+n+' Pokémon hộ vệ!','Boss has '+n+' support Pokémon!'),3.2);
  return guards;
 }
 const add=G.EnemyMgr.add;
 if(typeof add!=='function')throw Error('EnemyMgr.add is required');
 G.EnemyMgr.add=function(e){
  const result=add.call(this,e);
  if(e?.boss&&!e.remote)spawn(e);
  return result;
 };
 const clear=G.EnemyMgr.clear;
 if(typeof clear==='function')G.EnemyMgr.clear=function(...args){linked.clear();return clear.apply(this,args);};
 return {spawn,getForBoss:id=>linked.get(id)||[],active:()=>[...linked.values()].flat().filter(g=>!g.dead)};
})();
