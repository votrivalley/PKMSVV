/* PKMSVV v1.5 — Egg Rush, online 4-player host-authoritative match. */
G.EggRush=(()=>{
 const MAX=10,MAX_TIME=720,EGG_SPECIES=[172,447,173,35,360,438,175,174];
 let active=false,roster=[],nests=[],trails=new Map(),pets=[],score={},at={},laid=0,wave=0,seed=1,outcome=null,transition={},revives=0,deathTime=0,levelSeen=1,killsSeen=0;
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const nameOf=uid=>roster.find(m=>m.uid===uid)?.name||'Player';
 const rand=k=>{let x=((seed+Math.imul(k+1,2654435761))|0);x^=x>>>16;x=Math.imul(x,2246822507);x^=x>>>13;return (x>>>0)/4294967296;};
 function startPosition(cfg,i){
  const corners=[[-300,-225],[300,225],[-300,225],[300,-225]];
  const rotation=Math.floor((Number(cfg.seed)||0)%4);
  const p=corners[(i+rotation)%4];return p.slice();
 }
 function begin(cfg){
  active=!!(cfg&&cfg.mode==='eggrush');
  roster=active?(cfg.members||[]).map(m=>({uid:m.uid,name:String(m.name||'Player').slice(0,24),dex:m.dex||25})):[];
  seed=Math.floor(Number(cfg?.seed)||1);nests=[];pets=[];trails=new Map();revives=0;deathTime=0;levelSeen=1;killsSeen=0;
  score=Object.fromEntries(roster.map(m=>[m.uid,0]));at={};laid=0;wave=0;outcome=null;transition={};
  if(active){
   G.Sprites?.preload?.([...EGG_SPECIES,...roster.map(x=>x.dex)],7500);
   roster.forEach(m=>{transition[m.uid]={anim:new G.Sprites.Animator(m.dex,.32,false),rank:roster.findIndex(x=>x.uid===m.uid)};});
  }
 }
 function standings(){
  return roster.map(m=>({...m,eggs:score[m.uid]||0,at:at[m.uid]||0})).sort((a,b)=>
   b.eggs-a.eggs || (a.at||Infinity)-(b.at||Infinity) || a.name.localeCompare(b.name));
 }
 function randomNest(index,players){
  const n=index+1,cam=G.Camera;
  const width=Number(cam?.w)>0?cam.w:768,height=Number(cam?.h)>0?cam.h:420;
  const screen=Math.hypot(width,height),minDistance=screen+80;
  // Include players who are down: avoid pop-ins while waiting to revive.
  const positioned=players.filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y));
  const origin=positioned.length?positioned[index%positioned.length]:{x:0,y:0};
  for(let tries=0;tries<96;tries++){
   const a=2*Math.PI*rand(n*73+tries*11);
   const d=minDistance+rand(n*57+tries*7)*screen*.7+Math.floor(tries/24)*screen*.35;
   const x=Math.round(origin.x+Math.cos(a)*d),y=Math.round(origin.y+Math.sin(a)*d);
   if(positioned.some(p=>G.U.dist2(p.x,p.y,x,y)<minDistance*minDistance))continue;
   if(G.Camera?.sees?.(x,y,64))continue;
   if(nests.some(q=>!q.taken&&G.U.dist2(q.x,q.y,x,y)<120*120))continue;
   if(!G.World.isFree(x,y,20)||G.World.isLiquid(x,y))continue;
   return {id:n,x,y,taken:false};
  }
  return null; // Retry later without forcing a visible spawn.
 }
 function onEvent(ev){
  if(!active||ev[0]!=='er')return;
  if(ev[1]==='spawn'){
   if(!nests.some(n=>n.id===ev[2]))nests.push({id:ev[2],x:ev[3],y:ev[4],taken:false});
  }else if(ev[1]==='take'){
   const [, ,id,uid,dex,total,when]=ev;
   const n=nests.find(n=>n.id===id);if(n)n.taken=true;
   score[uid]=total;at[uid]=when;
   if(!pets.some(p=>p.id===id))pets.push({id,uid,dex,age:0,hatch:false,x:n?.x||0,y:n?.y||0,anim:null});
  }else if(ev[1]==='hatch'){
   const pet=pets.find(p=>p.id===ev[2]);
   if(pet&&!pet.hatch){pet.hatch=true;pet.anim=new G.Sprites.Animator(pet.dex,.7,false);G.FX?.ring?.(pet.x,pet.y,8,48,'#f5de8d',.6,3);}
  }else if(ev[1]==='hit'){
   const [, ,uid,dmg,slow]=ev,pl=G.Game.player;
   if(pl?.uid!==uid||pl.dead)return;
   if(pl.pkmsvvPvpImmune>0)return;
   pl.hurt(Math.max(1,Math.min(90,dmg)),null,true);
   if(slow>0){if(!pl.pkmsvvPvpSlowApplied){pl.spdMul*=.7;pl.pkmsvvPvpSlowApplied=true;}pl.pkmsvvPvpSlow=Math.max(pl.pkmsvvPvpSlow||0,slow);}
   pl.pkmsvvPvpImmune=.85;
  }
 }
 function claim(n,pl,time){
  if(n.taken||!roster.some(m=>m.uid===pl.uid))return false;
  n.taken=true;score[pl.uid]=(score[pl.uid]||0)+1;at[pl.uid]=time;
  const dex=EGG_SPECIES[Math.floor(rand(n.id*413)*EGG_SPECIES.length)];
  const event=['er','take',n.id,pl.uid,dex,score[pl.uid],time];
  onEvent(event);G.Coop.broadcast(event);
  G.Spawner?.say?.(nameOf(pl.uid)+' '+tr('nhặt được trứng!','collected an egg!'),2);
  return true;
 }
 const wins=()=>Object.values(score).some(n=>n>=6);
 function result(time){
  const board=standings(),win=board[0]||null;
  return {winner:win?.uid||null,standings:board.map((m,i)=>({...m,rank:i+1,win:m.uid===win?.uid})),collected:Object.values(score).reduce((sum,n)=>sum+n,0),finishedAt:Math.round(time)};
 }
 function update(dt,time,players,finish){
  if(!active||outcome)return;
  for(const p of players){
   if(!p||!p.uid)continue;
   let trl=trails.get(p.uid);if(!trl){trl=[];trails.set(p.uid,trl);}
   trl.unshift({x:p.x,y:p.y});if(trl.length>300)trl.length=300;
   if(p===G.Game.player){
    if(p.pkmsvvPvpImmune>0)p.pkmsvvPvpImmune=Math.max(0,p.pkmsvvPvpImmune-dt);
    if(p.pkmsvvPvpSlow>0)p.pkmsvvPvpSlow=Math.max(0,p.pkmsvvPvpSlow-dt);
    if(p.pkmsvvPvpSlowApplied&&!p.pkmsvvPvpSlow){p.spdMul/= .7;p.pkmsvvPvpSlowApplied=false;}
    if(p.dead&&revives<2){deathTime+=dt;if(deathTime>=5){p.revive(.5);revives++;deathTime=0;}}
    else if(!p.dead)deathTime=0;
   }
  }
  const hostMe=G.Game.player;
  const advanceLevel=G.Coop.isHost?Math.max(0,(hostMe?.level||1)-levelSeen):0;
  const advanceKills=G.Coop.isHost?Math.max(0,(hostMe?.kills||0)-killsSeen):0;
  if(G.Coop.isHost){levelSeen=hostMe?.level||1;killsSeen=hostMe?.kills||0;}
  for(const pet of pets){
   const trl=trails.get(pet.uid);
   if(!trl?.length)continue;
   const siblings=pets.filter(x=>x.uid===pet.uid),i=siblings.indexOf(pet);
   const loc=trl[Math.min((i+1)*12,trl.length-1)];
   pet.x+=(loc.x-pet.x)*Math.min(1,dt*10);pet.y+=(loc.y-pet.y)*Math.min(1,dt*10);
   pet.age+=dt;
   if(G.Coop.isHost)pet.boost=(pet.boost||0)+advanceLevel*3+advanceKills*.65;
   if(G.Coop.isHost&&pet.age>=20&&pet.age+(pet.boost||0)>=45&&!pet.hatch){
    const event=['er','hatch',pet.id];onEvent(event);G.Coop.broadcast(event);
   }
   pet.anim?.update?.(dt);
   if(pet.hatch&&pet.uid===G.Game.player?.uid){
    const own=pets.filter(q=>q.uid===pet.uid&&q.hatch);
    if(own.indexOf(pet)<3){pet.cd=(pet.cd||0)-dt;if(pet.cd<=0){support(pet,G.Game.player);pet.cd=({172:10,173:12,35:16,360:19,438:15}[pet.dex]||8);}}
   }
  }
  const order=standings();
  Object.entries(transition).forEach(([uid,t])=>{
   t.anim?.update?.(dt);
   const target=Math.max(0,order.findIndex(m=>m.uid===uid));
   t.rank+=(target-t.rank)*Math.min(1,dt*11);
  });
  if(!G.Coop.isHost)return;
  while(wave<5&&time>=8+wave*132){
   // Preserve two eggs per wave and do not consume IDs on a failed placement.
   const n=randomNest(laid,players);
   if(!n)break;
   nests.push(n);laid++;
   G.Coop.broadcast(['er','spawn',n.id,n.x,n.y]);
   if(laid%2===0)wave++;
  }
  for(const n of nests){
   if(n.taken)continue;
   let nearest=null,best=38*38;
   for(const p of players){
    if(!p||p.dead||!p.uid)continue;
    const d=G.U.dist2(p.x,p.y,n.x,n.y);
    if(d<best){best=d;nearest=p;}
   }
   if(nearest)claim(n,nearest,time);
  }
  if(wins()||nests.filter(n=>n.taken).length>=MAX||time>=MAX_TIME){
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
    if(ally.hp>before)changed++;
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
     e.applyStun(e.boss||e.judge||e.pkmsvvBossGuard?.35:1.1);
     e.pkmsvvPichuImmuneUntil=(pet.age||0)+7;count++;
    }
    if(count)G.FX?.ring?.(center.x,center.y,8,95,'#ffdb55',.5,3);
    break;
   }
   case 447:if(enemy)enemy.hurt(19,'#c8e2ff');break;
   case 173:eggRushBuff(pet,pl,'heal',.035);break;
   case 35:eggRushBuff(pet,pl,'heal',.06);break;
   case 360:eggRushBuff(pet,pl,'shield',.09);break;
   case 438:eggRushBuff(pet,pl,'shield',.05);break;
   case 175:G.Pickups?.pullAll?.();break;
   case 174:if(enemy)enemy.applySlow(.3,2.5);break;
  }
 }
 function cast(pl,m){
  if(!active||!G.Coop.isHost||!pl||pl.dead||!m)return;
  const players=G.Coop.players();
  const target=players.filter(p=>p.uid!==pl.uid&&!p.dead).sort((a,b)=>
   G.U.dist2(pl.x,pl.y,a.x,a.y)-G.U.dist2(pl.x,pl.y,b.x,b.y))[0];
  if(!target||G.U.dist2(pl.x,pl.y,target.x,target.y)>180*180)return;
  // The host uses a bounded damage approximation (40% PvE budget).
  const move=G.Moves?.BY_ID?.[m.id||m],base=Number(move?.power||move?.pow||25);
  const dmg=Math.max(2,Math.min(50,(base+(m.lvl||1)*2)*.4));
  const evt=['er','hit',target.uid,Math.round(dmg),.35];
  if(target.uid===G.Game.player?.uid)onEvent(evt);else G.Coop.broadcast(evt);
 }
 function orb(pl,id){
  if(!active||!G.Coop.isHost||!pl||pl.dead)return;
  const players=G.Coop.players();
  for(const target of players){
   if(!target||target.uid===pl.uid||target.dead||G.U.dist2(pl.x,pl.y,target.x,target.y)>250*250)continue;
   const slow=['slow','slumber'].includes(id)?.8:0;
   const evt=['er','hit',target.uid,id==='blowback'?10:4,slow];
   if(target.uid===G.Game.player?.uid)onEvent(evt);else G.Coop.broadcast(evt);
  }
 }
 function egg(ctx,x,y,progress=0){
  if(G.PKMSVVEggArt?.egg(ctx,x,y-9,1,progress))return;
  ctx.fillStyle='#ffebbf';ctx.strokeStyle='#c19b6f';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(x,y-9,10,13,0,0,6.283);ctx.fill();ctx.stroke();
 }
 function draw(ctx){
  if(!active)return;
  ctx.save();
  for(const n of nests){
   if(n.taken||!G.Camera.sees(n.x,n.y,40))continue;
   if(!G.PKMSVVEggArt?.nest(ctx,n.x,n.y))egg(ctx,n.x,n.y);
  }
  for(const p of pets){
   if(!G.Camera.sees(p.x,p.y,50))continue;
   if(!p.hatch)egg(ctx,p.x,p.y,(p.age+(p.boost||0))/45);else p.anim?.draw(ctx,p.x,p.y,{alpha:.85});
  }
  ctx.restore();
 }
 function hud(ctx,w,h){
  if(!active)return;
  const board=standings(),collected=Object.values(score).reduce((s,n)=>s+n,0);
  const size=Math.min(165,w*.27);
  ctx.save();
  ctx.fillStyle='rgba(11,39,51,.78)';ctx.strokeStyle='#80cfc4';ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(8,119,size,24+board.length*26,8);ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffe17a';ctx.textAlign='right';ctx.font='bold 11px sans-serif';ctx.fillText(collected+'/10',size,135);
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
  const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  return '<div style="grid-column:1/-1"><h3>'+tr('Kết quả Tranh Trứng','Egg Rush results')+'</h3>'+
   r.standings.map(p=>'<p>#'+p.rank+' '+esc(p.name)+' — '+p.eggs+' '+tr('trứng','eggs')+'</p>').join('')+'</div>';
 }
 function finish(r){if(r){outcome=r;active=true;}}
 return {begin,startPosition,onEvent,update,draw,hud,html,finish,cast,orb,standings,
  get active(){return active;},get outcome(){return outcome;},get collected(){return Object.values(score).reduce((s,n)=>s+n,0);}};
})();
