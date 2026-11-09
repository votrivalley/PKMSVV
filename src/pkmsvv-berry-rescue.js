/* Offline-first LAN Berry Rescue (4 trainers): 3 defended trees; Host authoritative.
 * Two boss waves: 4:00 and 8:00; tree rewards scale by remaining HP and difficulty. No Rift, eggs, wild Pokémon rescue or story-boss spawns.
 */
G.PKMSVVBerryRescue=(()=>{
 'use strict';
 const DURATION=480,BOSS_TIMES=[240,480],REWARD_CHANCE=.3;
 const NORMAL_REWARDS=[.35,.33,.32,.31,.30],EASY_REWARDS=[.18,.16,.15,.14,.13];
 // Cluster the three objective trees as a tactical triangle.
 const POS=[[-92,82],[92,82],[0,-72]];
 const NAMES=['Oran','Sitrus','Lum'];
 let active=false,easy=false,time=0,trees=[],bossStage=0,won=false,claimed=false,sendClock=0,endClock=0;
 let sprites=[],treeAtlas=null,treeTargets=[];
 // Track which trees the native entity pass actually rendered this frame.
 // Android may skip the entity layer after a WebView context recreation.
 const drawnTrees=new Set();
 const TREE_ATLAS_URL='assets/berry-trees/berry_trees_3x6.webp';
 const TREE_CELL=192,TREE_ATLAS_WIDTH=6*TREE_CELL,TREE_ATLAS_HEIGHT=3*TREE_CELL;
 function hasTreeAtlas(){return !!(treeAtlas?.complete&&treeAtlas.naturalWidth===TREE_ATLAS_WIDTH&&treeAtlas.naturalHeight===TREE_ATLAS_HEIGHT);}
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 function begin(cfg){
  const requested=typeof cfg==='string'?cfg:(cfg?.mode||G.Social?.room?.mode);
  active=['berry','berryeasy'].includes(requested);easy=requested==='berryeasy';time=0;bossStage=0;won=false;claimed=false;
  if(typeof document!=='undefined')document.body?.classList?.toggle?.('pkmsvv-berry-defense',active);
  if(active){
   G.World?.flattenForBerry?.(); // Clear cached wall chunks.
   G.Audio?.music?.('eggrush'); // Same bundled BGM as Egg Rush, from match start.
  }
  drawnTrees.clear();lastAwards=[];
  if(typeof document!=='undefined')document.getElementById?.('pkmsvv-berry-team-result')?.remove?.();
  sendClock=0;endClock=0;
  const hp=easy?220:180;
  trees=POS.map(([x,y],i)=>({id:i,x,y,hp,maxHp:hp,guard:0}));
  // Reuse target actors: enemies call targetFor each simulation frame.
  // Avoid allocating/filtering tree arrays for each Pokémon on every tick.
  treeTargets=trees.map(t=>({x:t.x,y:t.y,r:34,level:1,dead:false,
    _vx:0,_vy:0,_pkmsvvBerryTree:t.id}));
  treeAtlas=typeof Image==='function'?new Image():null;
  if(treeAtlas){treeAtlas.decoding='async';treeAtlas.src=TREE_ATLAS_URL;}
  sprites=['oran','sitrus','lum'].map(id=>{
   const img=typeof Image==='function'?new Image():null;
   if(img)img.src=G.PKMSVVBerry?.spriteUrl?.(id)||'assets/berry/'+id+'.png';
   return img;
  });
  return active;
 }
 function bosses(){
  if(!active||!G.Coop?.isHost)return;
  const def=G.Enemies?.BOSSES?.[bossStage-1];
  if(!def||!G.Enemy||!G.EnemyMgr)return;
  const boss=new G.Enemy(def,bossStage===1?-200:200,-270,
   G.Enemies.bossScale?.(time)||{hp:1,dmg:1,spd:1},true);
  boss.hp=boss.maxHp=Math.max(boss.maxHp||1,bossStage===1?3800:7900);
  boss._pkmsvvBerryBoss=bossStage;
  G.EnemyMgr.add(boss);
  G.Spawner?.say?.(bossStage===1?
   tr('🍓 BOSS ĐỢT 1! Bảo vệ ba cây Berry!','🍓 WAVE 1 BOSS! Protect the three trees!'):
   tr('🍓 BOSS CUỐI! Giữ vườn Berry tới phút 8!','🍓 FINAL BOSS! Save the Berry grove!'),4);
 }
 function onEvent(ev){
  if(!active||G.Coop?.isHost||ev?.[0]!=='br')return;
  if(!Array.isArray(ev)||ev.length<7)return;
  for(let i=0;i<3;i++)trees[i].hp=trees[i].maxHp*Math.max(0,Math.min(100,Number(ev[1+i])||0))/100;
  bossStage=Math.max(bossStage,Number(ev[4])||0);
  time=Math.max(time,Math.min(DURATION+45,Number(ev[5])||0));
 }
 function state(){return trees.map(t=>t.hp>0?Math.max(1,Math.round(100*t.hp/t.maxHp)):0);}
 function chanceForHp(pct,isEasy=easy){
  if(!Number.isFinite(pct)||pct<=0)return 0;
  const rates=isEasy?EASY_REWARDS:NORMAL_REWARDS;
  return pct>=99.999?rates[0]:pct>=80?rates[1]:pct>=60?rates[2]:pct>=40?rates[3]:rates[4];
 }
 // Enemy pathing and boss attacks use a living tree as their destination.
 function targetFor(enemy){
  if(!active||!enemy)return null;
  let chosen=null,nearest=Infinity;
  for(const t of trees){
   if(t.hp<=0)continue;
   const dx=(Number(enemy.x)||0)-t.x,dy=(Number(enemy.y)||0)-t.y;
   const d2=dx*dx+dy*dy;
   if(d2<nearest){nearest=d2;chosen=t;}
  }
  return chosen?treeTargets[chosen.id]:null;
 }
 // Reduced per-stage enemy speed escalation to two thirds of the prior increment.
  const SPEED_GAIN_NORMAL=.20*2/3,SPEED_GAIN_EASY=.15*2/3,XP_MULT=1;
  function difficultyFor(stage,isEasy=easy){return (isEasy?.7:1)*(1+(isEasy?SPEED_GAIN_EASY:SPEED_GAIN_NORMAL)*Math.max(0,Math.min(3,stage)));}
 function rebalanceEnemy(e,stage){
  if(!e||e.dead||e.remote)return;
  if(!e._pkmsvvBerryAdjusted){
   e._pkmsvvBerryAdjusted=true;
    // Rescue gives normal enemy XP; do not multiply or mutate rewards.
   if(easy){
    if(Number.isFinite(e.maxHp)){e.maxHp=Math.max(1,e.maxHp*.7);e.hp=Math.min(e.maxHp,Math.max(1,(e.hp||e.maxHp)*.7));}
    if(Number.isFinite(e.dmg))e.dmg*=.7;
   }
  }
  const next=difficultyFor(stage),old=e._pkmsvvBerrySpeedFactor||1;
  // Never write enemy speed each frame: many LAN bots + enemies and the
  // continuous float reassignments caused avoidable hot-loop work. Some
  // imported enemy variants expose a read-only speed getter; that would
  // throw from the Host update and stop the whole Berry run.
  if(next!==old){
   const speed=Number(e.spd);
   if(Number.isFinite(speed)){
    const own=Object.getOwnPropertyDescriptor(e,'spd');
    const proto=!own&&Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e),'spd');
    const field=own||proto;
    if(!field||field.writable||typeof field.set==='function'){
     try{e.spd=speed/old*next;}
     catch(err){/* Read-only custom enemy variant: preserve native speed. */}
    }
   }
   e._pkmsvvBerrySpeedFactor=next;
  }
 }
 function rewardBerry(){
  const r=Math.random(),types=G.PKMSVVBerry?.TYPES||[];
  return r<.015?'enigma':r<.045?'starf':r<.12?'petaya':r<.2?'lum':
   types[Math.floor(Math.random()*Math.min(6,types.length))]?.id||types[0]?.id||'oran';
 }
 // A completed rescue awards each human independently. The host records all
 // rolls inside the existing result packet, so the whole team sees the same
 // confirmed names; AI companions have no persistent Berry inventory.
 function rollRewards(result){
  const won=[];
  for(const hp of result.trees.slice(0,3)){
   const pct=hp===true?100:Math.max(0,Number(hp)||0);
   if(pct>0&&Math.random()<chanceForHp(pct,result.easy===true))won.push(rewardBerry());
  }
  if(result.trees.length>=3&&result.trees.slice(0,3).every(h=>h===true||Number(h)>0))
   won.push(rewardBerry()); // guaranteed at ANY positive HP, not only full trees
  return won.filter(Boolean);
 }
 function members(){
  const roster=Array.isArray(G.Social?.room?.members)?G.Social.room.members:[];
  const list=[],seen=new Set();
  for(const m of roster)if(typeof m?.uid==='string'&&!seen.has(m.uid)){
   seen.add(m.uid);list.push({uid:m.uid,bot:!!m.bot,
    name:String(m.name||m.nick||m.label||(m.bot?'AI':tr('Người chơi','Player'))).slice(0,48)});
  }
  const uid=G.Social?.uid;
  if(typeof uid==='string'&&!seen.has(uid))list.unshift({uid,bot:false,name:tr('Bạn','You')});
  if(!list.length)list.push({uid:'self',bot:false,name:tr('Bạn','You')});
  return list;
 }
 let lastAwards=[];
 function renderRewardPanel(result,rows,own){
  if(typeof document==='undefined'||!document.createElement||!document.body?.append)return;
  const render=()=>{
   document.getElementById('pkmsvv-berry-team-result')?.remove?.();
   const layer=document.createElement('section');layer.id='pkmsvv-berry-team-result';
   layer.className='pkmsvv-berry-team-result';layer.setAttribute('translate','no');
   layer.setAttribute('role','dialog');
   const panel=document.createElement('div');panel.className='pkmsvv-berry-team-panel';
   const title=document.createElement('h2');
   title.textContent=tr('🍓 GIẢI CỨU THÀNH CÔNG!','🍓 BERRY RESCUE COMPLETE!');
   const info=document.createElement('p');
   info.textContent=tr('Cây còn sống: ','Trees saved: ')+
    result.trees.filter(h=>h===true||Number(h)>0).length+
    '/3 · '+tr('Phần thưởng cả đội','Team rewards');
   const list=document.createElement('div');list.className='pkmsvv-berry-team-list';
   for(const row of rows){
    const item=document.createElement('div');item.className='pkmsvv-berry-team-row';
    const name=document.createElement('strong');name.textContent=row.name;
    const items=document.createElement('div');
    if(row.bot||!row.berries.length){
     items.textContent=row.bot?tr('AI · không có túi Berry','AI · no Berry bag'):
      tr('Không trúng Berry ngẫu nhiên','No bonus Berry roll');
    }else for(const id of row.berries){
     const badge=document.createElement('span');badge.className='pkmsvv-berry-team-award';
     const img=document.createElement('img');img.width=24;img.height=24;
     img.src=G.PKMSVVBerry?.spriteUrl?.(id)||'assets/berry/'+id+'.png';
     img.alt=id+' Berry';
     const text=document.createElement('span');
     text.textContent=(G.PKMSVVBerry?.byId?.[id]?.name||id)+' Berry';
     badge.append(img,text);items.append(badge);
    }
    item.append(name,items);list.append(item);
   }
   const yours=document.createElement('p');yours.className='pkmsvv-berry-team-own';
   yours.textContent=tr('Túi của bạn nhận: ','Added to your bag: ')+
    (own.length?own.map(id=>(G.PKMSVVBerry?.byId?.[id]?.name||id)+' Berry').join(', '):
     tr('Không có','None'));
   const close=document.createElement('button');close.type='button';
   close.className='pkmsvv-berry-team-close';close.textContent=tr('Đóng','Close');
   close.addEventListener('click',()=>layer.remove());
   panel.append(title,info,list,yours,close);layer.append(panel);document.body.append(layer);
  };
  // Co-op's native finish screen is mounted immediately after the host
  // reward callback; defer our panel until it is safely visible on top.
  if(typeof setTimeout==='function')setTimeout(render,120);else render();
 }
 function reward(result){
  if(claimed||!result||!Array.isArray(result.trees))return [];claimed=true;
  if(!result.success)return [];
  const me=G.Social?.uid||'self';
  if(!Array.isArray(result.berryAwards)&&G.Coop?.isHost!==false)
   result.berryAwards=members().map(m=>({...m,berries:m.bot?[]:rollRewards(result)}));
  // Legacy/older-host result still awards locally without risking save loss.
  const source=Array.isArray(result.berryAwards)?result.berryAwards:
   [{uid:me,name:tr('Bạn','You'),bot:false,berries:rollRewards(result)}];
  const valid=G.PKMSVVBerry?.byId||{};
  const rows=source.slice(0,20).filter(m=>typeof m?.uid==='string').map(m=>({
   uid:m.uid,name:String(m.name||tr('Người chơi','Player')).slice(0,48),bot:!!m.bot,
   berries:Array.isArray(m.berries)?m.berries.filter(id=>typeof id==='string'&&
    (valid[id]||G.PKMSVVBerry?.TYPES?.some(t=>t.id===id))).slice(0,4):[]
  }));
  const awarded=[];
  for(const id of rows.find(r=>r.uid===me&&!r.bot)?.berries||[])
   if(G.PKMSVVBerry?.grant?.(id,1))awarded.push(id);
  lastAwards=rows;
  renderRewardPanel(result,rows,awarded);
  return awarded;
 }
 function tick(dt,t,players,finish){
  if(!active)return;time=Math.max(0,t);
  if(!G.Coop?.isHost)return;
  while(bossStage<BOSS_TIMES.length&&time>=BOSS_TIMES[bossStage]){
   bossStage++;bosses();
  }
  const enemies=G.EnemyMgr?.all?.()||[];
  const stage=Math.floor(time/120);
  for(const e of enemies)rebalanceEnemy(e,stage);
  // One enemy pass for all three objectives, instead of three array filters
  // and repeated square roots on each of 60 simulation frames per second.
  const threats=[0,0,0],bossNear=[false,false,false];
  for(const e of enemies){
   if(!e||e.dead)continue;
   for(const tree of trees){
    if(tree.hp<=0)continue;
    const dx=(Number(e.x)||0)-tree.x,dy=(Number(e.y)||0)-tree.y;
    if(dx*dx+dy*dy<105*105){
     threats[tree.id]++;
     if(e.boss)bossNear[tree.id]=true;
    }
   }
  }
  for(const tree of trees)if(tree.hp>0){
   const danger=threats[tree.id]?
    Math.min(3,threats[tree.id]*.11)*(bossNear[tree.id]?1.8:1):0;
   tree.hp=Math.max(0,tree.hp-Math.max(0,dt)*danger);
  }
  sendClock+=dt;
  if(sendClock>=.5){
   sendClock=0;G.Coop?.broadcast?.(['br',...state(),bossStage,Math.round(time),1]);
  }
  const survivors=trees.filter(t=>t.hp>0).length;
  if(!survivors){active=false;if(typeof document!=='undefined')document.body?.classList?.remove?.('pkmsvv-berry-defense');G.Spawner?.say?.(tr('PHÒNG THỦ THẤT BẠI!','DEFENSE FAILED!'),4);finish?.({success:false,trees:[0,0,0],easy,time:Math.floor(time)});return;}
  if(time>=DURATION){
   const lastBossAlive=enemies.some(e=>e&&!e.dead&&e._pkmsvvBerryBoss===2);
   if(!lastBossAlive||time>=DURATION+30){
    won=true;active=false;if(typeof document!=='undefined')document.body?.classList?.remove?.('pkmsvv-berry-defense');finish?.({success:true,trees:state(),easy,time:Math.floor(time)});
   }
  }
 }
 // Six hand-pixelled states: full fruit, 80%, 60%, 40%, 20% and bare.
 // Retains offline pixel aesthetic across Windows, Web and Android.
 const LEAVES=[[-16,-33],[-8,-39],[0,-42],[8,-39],[16,-33],[-21,-25],[-10,-27],[2,-29],[14,-27],[21,-25],[-12,-19],[0,-19],[12,-19]];
 const FRUIT=[[-12,-31],[8,-34],[16,-22],[-4,-21],[4,-40]];
 function treeStage(r){return r<=0?5:r<.4?4:r<.6?3:r<.8?2:r<1?1:0;}
 function drawTree(ctx,ratio,id){
  const stage=treeStage(ratio),leaves=[13,10,8,5,2,0][stage],fruit=[5,4,3,2,1,0][stage];
  ctx.save();ctx.imageSmoothingEnabled=false;
  // Each row is one defended tree: pink/yellow/mixed. Columns are HP 100/80/60/40/20/0.
  // Lossless WebP sprite atlas is bundled offline; original canvas pixel tree remains fallback.
  if(hasTreeAtlas()){
   ctx.drawImage(treeAtlas,stage*TREE_CELL,id*TREE_CELL,TREE_CELL,TREE_CELL,-45,-89,90,90);
   ctx.restore();return;
  }
  ctx.fillStyle='#18291f';ctx.fillRect(-6,-29,12,31);ctx.fillRect(-16,-28,15,9);ctx.fillRect(3,-34,15,9);
  ctx.fillStyle='#4c3228';ctx.fillRect(-4,-27,8,27);ctx.fillRect(-14,-26,11,5);ctx.fillRect(4,-32,12,5);
  ctx.fillStyle='#9b653c';ctx.fillRect(-2,-24,3,22);ctx.fillRect(-12,-25,7,2);ctx.fillRect(5,-31,8,2);
  for(let i=0;i<leaves;i++){const [x,y]=LEAVES[i];const tint=i%3;
   ctx.fillStyle='#153c2f';ctx.fillRect(x-5,y-5,11,11);
   ctx.fillStyle=tint===0?'#286b43':tint===1?'#4f9d55':'#79bb64';
   ctx.fillRect(x-4,y-4,9,9);ctx.fillStyle='#afdf83';ctx.fillRect(x-2,y-3,3,3);}
  for(let i=0;i<fruit;i++){const [x,y]=FRUIT[(i+id)%FRUIT.length];
   ctx.fillStyle='#392e31';ctx.fillRect(x-3,y-2,7,7);
   ctx.fillStyle=id===1?'#f0b447':id===2?'#d777aa':'#e96346';
   ctx.fillRect(x-2,y-1,5,5);ctx.fillStyle='#fff3c0';ctx.fillRect(x-1,y,2,2);}
  ctx.restore();
 }
 // Tree sprites are scene foreground (not a giant target ring); compact bars only.
 // A single tree is drawn in the same Y-sorted world layer as players and enemies.
 function drawOne(ctx,t){
  drawnTrees.add(t.id);
  ctx.save();ctx.translate(t.x,t.y);
  // One health indicator BELOW the trunk; the old ground anchor resembled
  // a second HP bar while the tiny canopy bar looked like a third.
  drawTree(ctx,t.hp/t.maxHp,t.id);
  const ratio=Math.max(0,Math.min(1,t.hp/t.maxHp));
  const barY=9;
  ctx.fillStyle='rgba(12,35,31,.9)';ctx.fillRect(-34,barY,68,7);
  ctx.fillStyle=ratio>.35?'#8fe2ad':'#f28a73';ctx.fillRect(-32,barY+2,64*ratio,3);
  ctx.restore();
 }
 function beginFrame(){drawnTrees.clear();}
 function drawMissing(ctx){
  if(!active)return;
  // Render missing objectives in world coordinates, while the game's camera
  // transform is still applied. No duplicate drawings when Y-sort works.
  for(const t of trees)if(!drawnTrees.has(t.id))drawOne(ctx,t);
 }
 function draw(ctx){
  if(active)for(const t of trees)drawOne(ctx,t);
 }
 // Must be inserted into game's items.sort((a,b)=>a.y-b.y) entity render list.
 // The base of the trunk is the same anchor as a Pokémon's feet (t.y).
 function drawables(){
  if(!active)return [];
  return trees.map(t=>({y:t.y,draw(ctx){drawOne(ctx,t);}}));
 }
 // Host AI defends the three-tree cluster instead of following players across the map.
 const DEFENSE_RADIUS=170,THREAT_RADIUS=135;
 function defendGoal(pl,enemies=[],slot=0){
  if(!active||!pl)return null;
  const live=trees.filter(t=>t.hp>0);
  if(!live.length)return {x:0,y:0};
  const cx=live.reduce((n,t)=>n+t.x,0)/live.length,cy=live.reduce((n,t)=>n+t.y,0)/live.length;
  if(Math.hypot(pl.x-cx,pl.y-cy)>DEFENSE_RADIUS)return {x:cx,y:cy};
  const defendPosition=(t,dx,dy)=>{
   // Stand beside a tree, not *on top of* its trunk or under its canopy.
   let len=Math.hypot(dx,dy);
   if(len<.01){dx=cx-t.x;dy=cy-t.y;len=Math.hypot(dx,dy)||1;}
   return {x:t.x+dx/len*76,y:t.y+dy/len*76};
  };
  const threats=(enemies||[]).filter(e=>e&&!e.dead&&
   live.some(t=>Math.hypot(e.x-t.x,e.y-t.y)<THREAT_RADIUS));
  if(threats.length){
   const enemy=threats.reduce((a,b)=>(Math.hypot(pl.x-a.x,pl.y-a.y)<
    Math.hypot(pl.x-b.x,pl.y-b.y)?a:b));
   const base=live.reduce((a,b)=>(Math.hypot(enemy.x-a.x,enemy.y-a.y)<
    Math.hypot(enemy.x-b.x,enemy.y-b.y)?a:b));
   return defendPosition(base,enemy.x-base.x,enemy.y-base.y);
  }
  const tree=live[Math.abs(slot|0)%live.length];
  return defendPosition(tree,cx-tree.x,cy-tree.y);
 }
 // All trainers (including the local player) should avoid walking through
 // the physical trunk. Tree canopies are visual and do not block spells.
 function keepOutsideTrunks(pl){
  if(!active||!pl||pl.dead)return;
  for(const t of trees){
   if(t.hp<=0)continue;
   const dx=pl.x-t.x,dy=pl.y-t.y,d=Math.hypot(dx,dy);
   const minDist=Math.max(56,(Number(pl.r)||14)+36);
   if(d<minDist){
    const vx=d>1e-6?dx/d:0,vy=d>1e-6?dy/d:1;
    pl.x=t.x+vx*minDist;pl.y=t.y+vy*minDist;
   }
  }
 }
 function hud(ctx,w,h){
  if(!active)return;
  ctx.save();ctx.font='bold 12px sans-serif';ctx.textBaseline='top';
  // Berry objective HUD goes to the bottom CENTER but clears the
  // Orb/skill hotbar by sitting above it. Bottom-left belongs to x1.5.
  const left=Math.max(8,Math.round((w-202)/2));
  const top=Math.max(100,Math.min(h-112,h-250));
  ctx.fillStyle='#0c2738df';ctx.fillRect(left,top,202,95);
  ctx.fillStyle='#ffe9ab';ctx.fillText('🍓 '+tr('GIẢI CỨU BERRY','RESCUE BERRY')+' · EXP ×1',left+8,top+7);
  trees.forEach((tree,i)=>{
   ctx.fillStyle='#e8f7eb';ctx.fillText('🌳 '+(i+1)+' '+Math.round(100*tree.hp/tree.maxHp)+'%',left+9,top+29+i*20);
  });
  ctx.restore();
 }
 return {DURATION,BOSS_TIMES,REWARD_CHANCE,NORMAL_REWARDS,EASY_REWARDS,XP_MULT,DEFENSE_RADIUS,chanceForHp,difficultyFor,targetFor,defendGoal,keepOutsideTrunks,begin,beginFrame,drawMissing,tick,onEvent,reward,draw,drawables,hud,state,
  get easy(){return easy},
  get active(){return active},get trees(){return trees},get bossStage(){return bossStage},
  get lastAwards(){return lastAwards.map(r=>({...r,berries:r.berries.slice()}))}};
})();
// Berry Rescue must use the exact Egg Rush BGM (custom-music/eggrush.ogg).
// Intercept subsequent biome/boss refreshes without touching other modes;
// restore regular game music as soon as Berry Rescue is inactive.
if(G.Audio?.music&&!G.Audio._pkmsvvBerryMusicWrapped){
 const originalMusic=G.Audio.music;
 G.Audio._pkmsvvBerryMusicWrapped=true;
 G.Audio.music=function(track,...args){
  return originalMusic.call(this,G.PKMSVVBerryRescue?.active?'eggrush':track,...args);
 };
}
