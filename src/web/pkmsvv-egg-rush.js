/* PKMSVV v1.5 — Egg Rush, online 4-player host-authoritative match. */
G.EggRush=(()=>{
 const MAX_TIME=720,MAX_SCORE=10,WIN_SCORE=6,SPAWN_EVERY=60,RESPAWN_SECONDS=8,EGG_SPECIES=[172,447,173,35,360,438,175,174];
 let active=false,supportMode=false,cooperative=false,survival=false,nextSpawn=60,roster=[],nests=[],trails=new Map(),pets=[],score={},at={},laid=0,seed=1,outcome=null,transition={},levelSeen=1,killsSeen=0;
 let allocation=0,retryAt=0,pendingBatch=0;const seenIds=new Set();
 const metrics={placementAttempts:0,placementFailures:0,expired:0};
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const nameOf=uid=>roster.find(m=>m.uid===uid)?.name||'Player';
 const rand=k=>{let x=((seed+Math.imul(k+1,2654435761))|0);x^=x>>>16;x=Math.imul(x,2246822507);x^=x>>>13;return (x>>>0)/4294967296;};
 function startPosition(cfg,i){
  const corners=[[-300,-225],[300,225],[-300,225],[300,-225]];
  const rotation=Math.floor((Number(cfg.seed)||0)%4);
  const p=corners[(i+rotation)%4];return p.slice();
 }
 function begin(cfg){
  active=!!(cfg&&cfg.mode==='eggrush');cooperative=cfg?.mode==='coop';supportMode=cooperative||cfg?.mode==='royale';nextSpawn=SPAWN_EVERY;
  survival=cfg?.mode==='royale';if(survival)nextSpawn=30;
  allocation=0;retryAt=0;pendingBatch=0;seenIds.clear();Object.assign(metrics,{placementAttempts:0,placementFailures:0,expired:0});
  roster=(active||supportMode)?(cfg.members||[]).map(m=>({uid:m.uid,name:String(m.name||'Player').slice(0,24),dex:m.dex||25,shiny:!!m.shiny})):[];
  seed=Math.floor(Number(cfg?.seed)||1);nests=[];pets=[];trails=new Map();levelSeen=1;killsSeen=0;
  score=Object.fromEntries(roster.map(m=>[m.uid,0]));at={};laid=0;outcome=null;transition={};
  if(active||supportMode){
   G.Sprites?.preload?.([...EGG_SPECIES,...roster.map(x=>x.dex)],7500);
   roster.forEach(m=>{transition[m.uid]={anim:new G.Sprites.Animator(m.dex,.32,false),rank:roster.findIndex(x=>x.uid===m.uid)};});
  }
 }
 function standings(){
  return roster.map(m=>({...m,eggs:score[m.uid]||0,at:at[m.uid]||0})).sort((a,b)=>
   b.eggs-a.eggs || (a.at||Infinity)-(b.at||Infinity) || a.name.localeCompare(b.name) || a.uid.localeCompare(b.uid));
 }
 function randomNest(index,players,preferred){
  const n=index+1,cam=G.Camera;
  const width=Number(cam?.w)>0?cam.w:768,height=Number(cam?.h)>0?cam.h:420;
  const screen=Math.hypot(width,height),minDistance=cooperative?150:screen+80;
  // Include players who are down: avoid pop-ins while waiting to revive.
  const positioned=players.filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y));
  const origin=preferred||(positioned.length?positioned[index%positioned.length]:{x:0,y:0});
  const constrained=!!G.Arena?.active;
  for(let tries=0;tries<(constrained?192:96);tries++){
   metrics.placementAttempts++;
   const a=2*Math.PI*rand(n*73+tries*11);
   const d=cooperative?180+rand(n*57+tries*7)*160:
    minDistance+rand(n*57+tries*7)*screen*.7+Math.floor(tries/24)*screen*.35;
   let x=Math.round(origin.x+Math.cos(a)*d),y=Math.round(origin.y+Math.sin(a)*d);
   // Search the bounded arena's outer annulus after local attempts fail. Do not
   // relax camera or terrain checks, even with ten widely separated cameras.
   if(constrained&&tries>=48){const r=(G.Arena.radius-50)*Math.sqrt(.15+.85*rand(n*901+tries));x=Math.round(Math.cos(a)*r);y=Math.round(Math.sin(a)*r);}
   if(constrained&&!G.Arena.validSpawn(x,y,40))continue;
   if(constrained?G.Arena.visible(x,y,positioned,80):positioned.some(p=>G.U.dist2(p.x,p.y,x,y)<minDistance*minDistance))continue;
   if(!cooperative&&G.Camera?.sees?.(x,y,64))continue;
   if(nests.some(q=>!q.taken&&G.U.dist2(q.x,q.y,x,y)<120*120))continue;
   if(!G.World.isFree(x,y,20)||G.World.isLiquid(x,y))continue;
   return {id:n,x,y,taken:false};
  }
  metrics.placementFailures++;
  return null; // Retry later without forcing a visible spawn.
 }
 function onEvent(ev){
  if((!active&&!supportMode)||ev[0]!=='er'||(outcome&&ev[1]==='take'))return;
  if(ev[1]==='spawn'){
   if(!seenIds.has(ev[2])){seenIds.add(ev[2]);nests.push({id:ev[2],x:ev[3],y:ev[4],expiresAt:ev[5]||0,taken:false});G.Spawner?.say?.(tr('Trứng mới xuất hiện! Đi theo mũi tên.','New egg! Follow the arrow.'),4);}
  }else if(ev[1]==='despawn'){
   nests=nests.filter(n=>n.id!==ev[2]||n.taken);
  }else if(ev[1]==='take'){
   const [, ,id,uid,dex,total,when]=ev;
   const n=nests.find(n=>n.id===id);
   if(!n||pets.some(p=>p.id===id)||!roster.some(m=>m.uid===uid)||(n.expiresAt&&when>=n.expiresAt))return;
   n.taken=true;
   score[uid]=total;at[uid]=when;
   if(!pets.some(p=>p.id===id)){
    // Host-owned support HP is transmitted with the verified egg claim.
    const maxHp=Number.isFinite(ev[7])&&ev[7]>0?Math.max(1,Math.min(50000,Math.round(ev[7]))):100;
    pets.push({id,uid,dex,age:0,hatch:false,x:n?.x||0,y:n?.y||0,anim:null,
     hp:maxHp,maxHp,hurtCd:0,hpSeq:0,shield:0});
   }
  }else if(ev[1]==='hatch'){
   const pet=pets.find(p=>p.id===ev[2]);
   if(pet&&!pet.hatch){pet.hatch=true;pet.anim=new G.Sprites.Animator(pet.dex,.6,false);G.FX?.ring?.(pet.x,pet.y,8,48,'#f5de8d',.6,3);}
  }else if(ev[1]==='hp'){
    const pet=pets.find(p=>p.id===ev[2]);
    if(pet&&Number.isFinite(ev[3])&&Number.isSafeInteger(ev[4])&&ev[4]>pet.hpSeq){
     pet.hpSeq=ev[4];pet.hp=Math.max(0,Math.min(pet.maxHp,ev[3]));
    }
   }else if(ev[1]==='down'){
    const pet=pets.find(p=>p.id===ev[2]);
    if(pet){pet.hp=0;pets=pets.filter(p=>p.id!==ev[2]);}
   }else if(ev[1]==='hit'){
   return; // Egg Rush is a non-PvP race: ignore old/malicious damage events.
  }
 }
 function claim(n,pl,time){
  if(!G.Coop.isHost||outcome||pl.dead||!nests.includes(n)||(n.expiresAt&&time>=n.expiresAt)||
   G.U.dist2(pl.x,pl.y,n.x,n.y)>=38*38||(G.Arena?.active&&!G.Arena.validSpawn(n.x,n.y,0)))return false;
  if((supportMode&&pets.filter(p=>p.uid===pl.uid).length>=2)||n.taken||!roster.some(m=>m.uid===pl.uid))return false;
  // Multiple trainers may overlap different nests in one Host frame.
  // Stop accepting claims the instant either winning condition is met;
  // the authoritative finish callback below still runs exactly once.
  if(active&&(Object.values(score).reduce((n,v)=>n+v,0)>=MAX_SCORE||
      Object.values(score).some(v=>v>=WIN_SCORE)))return false;
  n.taken=true;score[pl.uid]=(score[pl.uid]||0)+1;at[pl.uid]=time;
  const dex=EGG_SPECIES[Math.floor(rand(n.id*413)*EGG_SPECIES.length)];
  // 50–80% of this owner's real HP, not a global cosmetic HP bar.
   const statScale=.5+rand(n.id*37)*.3;
   const maxHp=supportMode?Math.max(1,Math.round((pl.maxHp||100)*statScale)):100;
   const event=['er','take',n.id,pl.uid,dex,score[pl.uid],time,maxHp];
  onEvent(event);G.Coop.broadcast(event);
  G.Spawner?.say?.(nameOf(pl.uid)+' '+tr('nhặt được trứng!','collected an egg!'),2);
  return true;
 }
 function result(time){
  const board=standings(),win=board[0]||null;
  return {winner:win?.uid||null,standings:board.map((m,i)=>({...m,rank:i+1,win:m.uid===win?.uid})),collected:Object.values(score).reduce((sum,n)=>sum+n,0),finishedAt:Math.round(time)};
 }
 function update(dt,time,players,finish){
  if((!active&&!supportMode)||outcome)return;
  for(const p of players){
   if(!p||!p.uid)continue;
   let trl=trails.get(p.uid);if(!trl){trl=[];trails.set(p.uid,trl);}
   trl.unshift({x:p.x,y:p.y});if(trl.length>300)trl.length=300;
   if(active&&(p===G.Game.player||(G.Coop.isHost&&p.lanBot))){
    if(p.dead){p.lanEggDeath=(p.lanEggDeath||0)+dt;
     if(p.lanEggDeath>=RESPAWN_SECONDS){p.revive(.5);p.lanEggDeath=0;p.invuln=Math.max(p.invuln||0,2);}}
    else p.lanEggDeath=0;
   }
  }
  const hostMe=G.Game.player;
  const owners=new Map(),ownedCounts=new Map();
  for(const pet of pets){if(!owners.has(pet.uid))owners.set(pet.uid,[]);owners.get(pet.uid).push(pet);ownedCounts.set(pet.uid,(ownedCounts.get(pet.uid)||0)+1);}
  const advanceLevel=G.Coop.isHost?Math.max(0,(hostMe?.level||1)-levelSeen):0;
  const advanceKills=G.Coop.isHost?Math.max(0,(hostMe?.kills||0)-killsSeen):0;
  if(G.Coop.isHost){levelSeen=hostMe?.level||1;killsSeen=hostMe?.kills||0;}
  for(const pet of pets){
   const trl=trails.get(pet.uid);
   if(!trl?.length)continue;
   const siblings=owners.get(pet.uid),i=siblings.indexOf(pet);
   const loc=trl[Math.min((i+1)*12,trl.length-1)];
   const ox=pet.x,oy=pet.y;
   pet.x+=(loc.x-pet.x)*Math.min(1,dt*10);pet.y+=(loc.y-pet.y)*Math.min(1,dt*10);
   pet.age+=dt;
   if(G.Coop.isHost)pet.boost=(pet.boost||0)+advanceLevel*3+advanceKills*.65;
   if(G.Coop.isHost&&pet.age>=20&&pet.age+(pet.boost||0)>=45&&!pet.hatch){
    const event=['er','hatch',pet.id];onEvent(event);G.Coop.broadcast(event);
   }
   const moving=Math.hypot(pet.x-ox,pet.y-oy)>.05;
   if(pet.anim&&moving&&G.Sprites.dirFromAngle)pet.anim.dir=G.Sprites.dirFromAngle(Math.atan2(pet.y-oy,pet.x-ox));
   pet.anim?.loop?.(moving?'Walk':'Idle');pet.anim?.update?.(dt);
   // In Co-op/Royale the Host owns support damage AND support healing.
   // Human guests must not independently buff the same support twice.
   const owner=supportMode?(G.Coop.isHost?players.find(p=>p.uid===pet.uid):null):
    (pet.uid===G.Game.player?.uid?G.Game.player:(G.Coop.isHost?players.find(p=>p.uid===pet.uid):null));
   if(pet.hatch&&owner&&!owner.dead){
    const own=siblings.filter(q=>q.hatch);
    if(own.indexOf(pet)<3){pet.cd=(pet.cd||0)-dt;if(pet.cd<=0){support(pet,owner);pet.cd=({172:10,173:12,35:16,360:19,438:15}[pet.dex]||8);}}
   }
  }
  if(G.Coop.isHost&&supportMode){
   // Only Host applies real enemy touch damage. Other clients render synced HP.
   const enemies=(G.EnemyMgr?.all?.()||[]).filter(e=>e&&!e.dead&&!e.remote&&e.dmg>0);
   for(const pet of pets.slice()){
    if(!pet.hatch||!(pet.hp>0))continue;
    pet.hurtCd=Math.max(0,(pet.hurtCd||0)-dt);
    if(pet.hurtCd>0)continue;
    const enemy=enemies.find(e=>G.U.dist2(e.x,e.y,pet.x,pet.y)<(Number(e.r||16)+11)**2);
    if(!enemy)continue;
    const raw=Math.min(pet.maxHp*.2,Math.max(1,enemy.dmg*.55));
    const blocked=Math.min(pet.shield||0,raw);
    pet.shield=Math.max(0,(pet.shield||0)-blocked);
    pet.hp=Math.max(0,pet.hp-(raw-blocked));pet.hurtCd=1.25;
    G.Coop.broadcast(['er','hp',pet.id,pet.hp,++pet.hpSeq]);
    if(!pet.hp){const event=['er','down',pet.id];onEvent(event);G.Coop.broadcast(event);}
   }
  }
  const order=standings();
  Object.entries(transition).forEach(([uid,t])=>{
   t.anim?.update?.(dt);
   const target=Math.max(0,order.findIndex(m=>m.uid===uid));
   t.rank+=(target-t.rank)*Math.min(1,dt*11);
  });
  if(!G.Coop.isHost)return;
  if(survival){
   for(const n of nests.slice())if(!n.taken&&((n.expiresAt&&time>=n.expiresAt)||(G.Arena?.active&&!G.Arena.validSpawn(n.x,n.y,0)))){
    const event=['er','despawn',n.id];onEvent(event);G.Coop.broadcast(event);metrics.expired++;
   }
   nests=nests.filter(n=>!n.taken);
   // Never burst five eggs on entry: one unclaimed support nest every 30s.
   if(time>=nextSpawn&&!pendingBatch){pendingBatch=1;nextSpawn=time+30;retryAt=time;}
   if(pendingBatch&&time>=retryAt&&(!G.Arena?.mode||G.Arena.active)){
    retryAt=time+1;
    const eligible=players.filter(p=>p?.uid&&!p.dead&&(ownedCounts.get(p.uid)||0)<2);
    const deficit=p=>Math.max(0,2-(ownedCounts.get(p.uid)||0));
    const need=eligible.reduce((n,p)=>n+deficit(p),0),untaken=nests.filter(n=>!n.taken).length;
    const allow=Math.max(0,Math.min(pendingBatch,3-untaken,need-untaken));
    for(let i=0;i<allow;i++){
     const max=Math.max(...eligible.map(deficit)),pool=eligible.filter(p=>deficit(p)===max);
     const owner=pool[allocation++%pool.length],n=randomNest(laid,players,owner);if(!n)continue;
     laid++;const event=['er','spawn',n.id,n.x,n.y,time+180];onEvent(event);G.Coop.broadcast(event);pendingBatch--;
    }
    if(!allow)pendingBatch=0;
   }
  }else if((supportMode||time<MAX_TIME)&&time>=nextSpawn){
   const n=randomNest(laid,players);
   if(n){laid++;onEvent(['er','spawn',n.id,n.x,n.y]);G.Coop.broadcast(['er','spawn',n.id,n.x,n.y]);
    nextSpawn=(Math.floor(time/SPAWN_EVERY)+1)*SPAWN_EVERY;}
  }
  for(const n of nests){
   if(n.taken)continue;
   let nearest=null,best=38*38;
   for(const p of players){
    if(!p||p.dead||!p.uid||(supportMode&&(ownedCounts.get(p.uid)||0)>=2))continue;
    const d=G.U.dist2(p.x,p.y,n.x,n.y);
    if(d<best){best=d;nearest=p;}
   }
   if(nearest&&claim(n,nearest,time))ownedCounts.set(nearest.uid,(ownedCounts.get(nearest.uid)||0)+1);
  }
  if(active&&(Object.values(score).reduce((n,v)=>n+v,0)>=MAX_SCORE||Object.values(score).some(v=>v>=WIN_SCORE)||time>=MAX_TIME)){
   // Host alone commits one result; counted eggs, not respawns or nest attempts.
   outcome=result(time);finish(outcome);
  }

 }
 // Egg Rush is a free-for-all. Never heal/shield other human players.
 // Pets have cosmetic/noncombat state currently; only the owning player is
 // damageable, but support for future owned pet HP is kept explicitly guarded.
 function ownedBuffTargets(pet,pl){
  if(!pl||pl.dead||pet.uid!==pl.uid)return [];
  return [pl,...pets.filter(q=>q.uid===pet.uid&&q.hatch&&q!==pet&&
   Number.isFinite(q.hp)&&Number.isFinite(q.maxHp)&&q.maxHp>0&&!q.dead)];
 }
 function eggRushBuff(pet,pl,role,power){
  let changed=0;
  for(const ally of ownedBuffTargets(pet,pl)){
   if(!Number.isFinite(ally.maxHp)||ally.maxHp<=0||!Number.isFinite(ally.hp))continue;
   if(role==='heal'){
    const before=ally.hp;
    if(before>=ally.maxHp)continue;
    if(ally===pl&&typeof ally.heal==='function')ally.heal(ally.maxHp*power);
    else ally.hp+=ally.maxHp*power;
    ally.hp=Math.min(ally.hp,ally.maxHp);
    if(ally.hp>before){
     changed++;
     if(ally!==pl&&G.Coop.isHost&&supportMode){
      // Healed support bars must remain identical on every client.
      G.Coop.broadcast(['er','hp',ally.id,ally.hp,++ally.hpSeq]);
     }
    }
   }else{
    const key=ally===pl?'pkmsvvShield':'shield';
    const before=Math.max(0,Number(ally[key])||0);
    ally[key]=Math.min(ally.maxHp*.25,before+ally.maxHp*power);
    if(ally[key]>before)changed++;
   }
  }
  return changed;
 }
 function support(pet,pl){
  const nearby=(G.EnemyMgr?.all?.()||[]).filter(e=>e&&!e.dead&&!e.remote&&G.U.dist2(e.x,e.y,pl.x,pl.y)<240*240);
  const enemy=nearby[0];
  switch(pet.dex){
   case 172:{
    // Pichu only stuns hostile AI here. PvP CC must be host-authoritative,
    // so it is never applied directly to opponents by peer clients.
    const candidates=nearby.filter(e=>typeof e.applyStun==='function'&&
     (pet.age||0)>=(e.pkmsvvPichuImmuneUntil||0));
    if(!candidates.length)break;
    candidates.sort((a,b)=>G.U.dist2(a.x,a.y,pet.x,pet.y)-G.U.dist2(b.x,b.y,pet.x,pet.y));
    const center=candidates[0];
    let count=0;
    for(const e of candidates){
     if(count>=4)break;
     if(G.U.dist2(e.x,e.y,center.x,center.y)>95*95)continue;
     e.applyStun((e.boss||e.judge||e.pkmsvvBossGuard) ? 0.35 : 1.1);
     e.pkmsvvPichuImmuneUntil=(pet.age||0)+7;count++;
    }
    if(count)G.FX?.ring?.(center.x,center.y,8,95,'#ffdb55',.5,3);
    break;
   }
   case 447:if(enemy){
    if(G.Coop?.isHost&&(G.Royale?.active||G.EggRush?.active)&&pet.uid)enemy.pkmsvvLastHitUid=pet.uid;
    enemy.hurt(19,'#c8e2ff');
   }break;
   case 173:eggRushBuff(pet,pl,'heal',.035);break;
   case 35:eggRushBuff(pet,pl,'heal',.06);break;
   case 360:eggRushBuff(pet,pl,'shield',.09);break;
   case 438:eggRushBuff(pet,pl,'shield',.05);break;
   case 175:G.Pickups?.pullAll?.();break;
   case 174:if(enemy)enemy.applySlow(.3,2.5);break;
  }
 }
 // Compete for nests and score; skills/Orbs never hurt another trainer.
 function cast(){}
 function orb(){}
 function egg(ctx,x,y,progress=0){
  if(G.PKMSVVEggArt?.egg(ctx,x,y-9,1,progress))return;
  ctx.fillStyle='#ffebbf';ctx.strokeStyle='#c19b6f';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(x,y-9,10,13,0,0,6.283);ctx.fill();ctx.stroke();
 }
 function draw(ctx){
  if(!active&&!supportMode)return;
  ctx.save();
  for(const n of nests){
   if(n.taken||!G.Camera.sees(n.x,n.y,40))continue;
   if(!G.PKMSVVEggArt?.nest(ctx,n.x,n.y))egg(ctx,n.x,n.y);
  }
  for(const p of pets){
   if(!G.Camera.sees(p.x,p.y,50))continue;
   if(!p.hatch)egg(ctx,p.x,p.y,(p.age+(p.boost||0))/45);
   else{
    p.anim?.draw(ctx,p.x,p.y,{alpha:.85});
    if(supportMode&&p.maxHp>0){
     const ratio=Math.max(0,Math.min(1,p.hp/p.maxHp));
     ctx.fillStyle='rgba(13,38,43,.85)';ctx.fillRect(p.x-14,p.y-35,28,3);
     ctx.fillStyle=ratio>.55?'#a3f2cd':ratio>.25?'#ffe08b':'#ff8395';
     ctx.fillRect(p.x-14,p.y-35,28*ratio,3);
    }
   }
  }
  ctx.restore();
 }
 function objective(pl){
  if(!pl||(supportMode&&pets.filter(p=>p.uid===pl.uid).length>=2))return null;
  return nests.filter(n=>!n.taken&&(!n.expiresAt||n.expiresAt>(G.Game?.st?.time||0))&&(!G.Arena?.active||G.Arena.validSpawn(n.x,n.y,0))).reduce((a,n)=>!a||G.U.dist2(pl.x,pl.y,n.x,n.y)<G.U.dist2(pl.x,pl.y,a.x,a.y)?n:a,null);
 }
 function guide(ctx,w,h){
  const pl=G.Game.player,n=objective(pl),cam=G.Camera;
  if(pl?.dead&&active&&!G.PKMSVVDeathHUD){
   ctx.save();ctx.textAlign='center';ctx.font='bold 16px sans-serif';ctx.fillStyle='#fff3bd';
   ctx.fillText(tr('Hồi sinh sau ','Respawn in ')+Math.max(0,Math.ceil(RESPAWN_SECONDS-(pl.lanEggDeath||0)))+'s',w/2,92);ctx.restore();
  }
  if(!n||!cam?.scale)return;
  const sx=(n.x-cam.left())*cam.scale,sy=(n.y-cam.top())*cam.scale;
  let x=Math.max(50,Math.min(w-50,sx)),y=Math.max(95,Math.min(h-90,sy));
  const sidebar=G.HUD?.leftBounds;
  const ranking=G.Royale?.active&&G.Royale.hudBounds;
  if(ranking&&x<ranking.right+45&&y<ranking.bottom+35)x=Math.min(w-50,ranking.right+50);
  else if(sidebar&&x<sidebar.x+270&&y<sidebar.bottom+66)y=Math.min(h-90,sidebar.bottom+66);
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(sy-h/2,sx-w/2));
  ctx.fillStyle='#ffe381';ctx.strokeStyle='#13283a';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(17,0);ctx.lineTo(-11,-10);ctx.lineTo(-6,0);ctx.lineTo(-11,10);ctx.closePath();ctx.stroke();ctx.fill();ctx.restore();
  ctx.save();ctx.textAlign='center';ctx.font='bold 12px sans-serif';ctx.fillStyle='#fff3b4';ctx.strokeStyle='#102a38';ctx.lineWidth=3;
  const text=tr('TRỨNG','EGG')+' · '+Math.round(Math.hypot(n.x-pl.x,n.y-pl.y)/32)+'m';
  ctx.strokeText(text,x,y-19);ctx.fillText(text,x,y-19);ctx.restore();
 }
 function hud(ctx,w,h){
  if(!active&&!supportMode)return;
  guide(ctx,w,h);
  if(supportMode&&G.Royale?.active)return; // Survival owns the ranking sidebar.
  const bounds=G.HUD?.leftBounds||{x:8,bottom:111};
  const top=bounds.bottom+8,left=Math.max(8,bounds.x);
  if(supportMode){
   // Survival/Co-op use support eggs, not the competitive Egg Rush scoreboard.
   const uid=G.Game?.player?.uid||G.Social.uid;
   const owned=pets.filter(p=>p.uid===uid),hatched=owned.filter(p=>p.hatch).length;
   const text=tr('Hỗ trợ: ','Supports: ')+hatched+'/2'+
    (owned.length>hatched?tr(' · Đang ấp: ',' · Hatching: ')+(owned.length-hatched):'');
   ctx.save();ctx.font='bold 11px sans-serif';ctx.textAlign='left';
   const width=Math.min(w-left-8,Math.max(150,ctx.measureText(text).width+16));
   ctx.fillStyle='rgba(11,39,51,.78)';ctx.strokeStyle='#80cfc4';ctx.lineWidth=1;
   ctx.beginPath();ctx.roundRect(left,top,width,26,7);ctx.fill();ctx.stroke();
   ctx.fillStyle='#ffe17a';ctx.fillText(text,left+8,top+17,width-16);ctx.restore();return;
  }
  const board=standings(),collected=Object.values(score).reduce((s,n)=>s+n,0);
  const size=Math.min(165,w*.27);
  ctx.save();
  ctx.translate(left-8,top-119);
  ctx.fillStyle='rgba(11,39,51,.78)';ctx.strokeStyle='#80cfc4';ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(8,119,size,24+board.length*26,8);ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffe17a';ctx.textAlign='right';ctx.font='bold 11px sans-serif';ctx.fillText(supportMode?tr('Hỗ trợ: tối đa 2/người','Supports: max 2/trainer'):tr('Trứng đã nhặt: ','Collected: ')+collected,size,135);
  for(let i=0;i<board.length;i++){
   const p=board[i],y=151+(transition[p.uid]?.rank??i)*26,local=p.uid===G.Social.uid;
   if(local){ctx.fillStyle='#ffe27429';ctx.fillRect(11,y-12,size-5,24);}
   ctx.fillStyle=local?'#ffeaa3':'#f3fffd';ctx.font='bold 11px sans-serif';ctx.textAlign='left';
   ctx.fillText(String(i+1),14,y+3);
   const sprite=transition[p.uid]?.anim;if(sprite)sprite.draw(ctx,43,y+4,{alpha:1});
   else{ctx.fillStyle='#ffe5a2';ctx.beginPath();ctx.arc(39,y,7,0,6.283);ctx.fill();}
   ctx.fillStyle=local?'#ffebac':'#f2fbfb';ctx.font='10px sans-serif';
   ctx.fillText(p.name.slice(0,12),54,y+3);
   ctx.textAlign='right';ctx.fillStyle='#ffe17a';ctx.fillText(String(p.eggs),size-4,y+3);
  }
  ctx.restore();
 }
 function html(r){
  if(!r||!Array.isArray(r.standings))return '';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return '<section class="pkmsvv-results" style="grid-column:1/-1" data-pkmsvv-results="eggrush">'+
   '<h3>🥚 '+tr('KẾT QUẢ TRANH TRỨNG','EGG RUSH RESULTS')+'</h3>'+
   '<div class="pkmsvv-results-champion">🏆 '+tr('Vô địch: ','Winner: ')+esc(r.standings[0]?.name||'—')+'</div>'+
   '<div class="pkmsvv-results-list">'+r.standings.map((p,i)=>{
    const d=Number(p.dex),dex=Number.isInteger(d)&&d>0&&d<=1025?d:25;
    const local=p.uid===G.Social?.uid;
    return '<div class="pkmsvv-result-row'+(local?' pkmsvv-result-me':'')+(p.win?' pkmsvv-result-winner':'')+'">'+
     '<strong class="pkmsvv-result-rank">#'+(i+1)+'</strong>'+
     '<canvas class="pkmsvv-result-mon" width="48" height="48" data-pkmsvv-result-dex="'+dex+'" data-pkmsvv-result-shiny="'+(p.shiny?'1':'0')+'" aria-label="Pokémon #'+dex+'"></canvas>'+
     '<span class="pkmsvv-result-name">'+esc(p.name)+'</span>'+
     '<b class="pkmsvv-result-stat">'+p.eggs+' '+tr('trứng','eggs')+'</b></div>';
   }).join('')+'</div></section>';
 }
 function finish(r){if(r){outcome=r;active=true;}}
 return {begin,startPosition,onEvent,update,draw,hud,html,finish,cast,orb,standings,objective,get metrics(){return {...metrics};},
  get enabled(){return active||supportMode;},get pets(){return pets;},
  get nests(){return nests;},get active(){return active;},get outcome(){return outcome;},get collected(){return Object.values(score).reduce((s,n)=>s+n,0);}};
})();
