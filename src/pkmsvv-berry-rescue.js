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
 let sprites=[];
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 function begin(cfg){
  active=!!(cfg&&['berry','berryeasy'].includes(cfg.mode));easy=cfg?.mode==='berryeasy';time=0;bossStage=0;won=false;claimed=false;
  sendClock=0;endClock=0;
  const hp=easy?220:180;
  trees=POS.map(([x,y],i)=>({id:i,x,y,hp,maxHp:hp,guard:0}));
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
 function state(){return trees.map(t=>Math.max(0,Math.round(100*t.hp/t.maxHp)));}
 function chanceForHp(pct,isEasy=easy){
  if(!Number.isFinite(pct)||pct<=0)return 0;
  const rates=isEasy?EASY_REWARDS:NORMAL_REWARDS;
  return pct>=99.999?rates[0]:pct>=80?rates[1]:pct>=60?rates[2]:pct>=40?rates[3]:rates[4];
 }
 function difficultyFor(stage,isEasy=easy){return (isEasy?.7:1)*(1+(isEasy?.15:.20)*Math.max(0,Math.min(3,stage)));}
 function rebalanceEnemy(e,stage){
  if(!e||e.dead||e.remote)return;
  if(!e._pkmsvvBerryAdjusted){
   e._pkmsvvBerryAdjusted=true;
   if(easy){
    if(Number.isFinite(e.maxHp)){e.maxHp=Math.max(1,e.maxHp*.7);e.hp=Math.min(e.maxHp,Math.max(1,(e.hp||e.maxHp)*.7));}
    if(Number.isFinite(e.dmg))e.dmg*=.7;
   }
  }
  const next=difficultyFor(stage),old=e._pkmsvvBerrySpeedFactor||1;
  if(Number.isFinite(e.spd))e.spd=e.spd/old*next;
  e._pkmsvvBerrySpeedFactor=next;
 }
 function reward(result){
  if(claimed||!result||!Array.isArray(result.trees))return [];claimed=true;
  const awarded=[];
  if(!result.success)return awarded;
  for(const health of result.trees.slice(0,3)){
   const pct=health===true?100:Math.max(0,Number(health)||0);
   if(Math.random()>=chanceForHp(pct,result.easy===true))continue;
   const r=Math.random(),types=G.PKMSVVBerry?.TYPES||[];
   const id=r<.015?'enigma':r<.045?'starf':r<.12?'petaya':r<.2?'lum':
    types[Math.floor(Math.random()*Math.min(6,types.length))]?.id;
   if(id&&G.PKMSVVBerry?.grant?.(id,1))awarded.push(id);
  }
  if(awarded.length)G.UI?.toast?.(tr('🍓 Nhận Berry: ','🍓 Awarded Berries: ')+awarded.join(', '),4500);
  return awarded;
 }
 function tick(dt,t,players,finish){
  if(!active)return;time=Math.max(0,t);
  if(!G.Coop?.isHost)return;
  while(bossStage<BOSS_TIMES.length&&time>=BOSS_TIMES[bossStage]){
   bossStage++;bosses();
  }
  const enemies=G.EnemyMgr?.all?.()||[];
  for(const e of enemies)rebalanceEnemy(e,Math.floor(time/120));
  for(const tree of trees)if(tree.hp>0){
   const nearby=enemies.filter(e=>e&&!e.dead&&Math.hypot((e.x||0)-tree.x,(e.y||0)-tree.y)<105);
   const danger=nearby.length?Math.min(3,nearby.length*.11)*(nearby.some(e=>e.boss)?1.8:1):0;
   tree.hp=Math.max(0,tree.hp-Math.max(0,dt)*danger);
  }
  sendClock+=dt;
  if(sendClock>=.5){
   sendClock=0;G.Coop?.broadcast?.(['br',...state(),bossStage,Math.round(time),1]);
  }
  const survivors=trees.filter(t=>t.hp>0).length;
  if(!survivors){active=false;finish?.({success:false,trees:[0,0,0],easy,time:Math.floor(time)});return;}
  if(time>=DURATION){
   const lastBossAlive=enemies.some(e=>e&&!e.dead&&e._pkmsvvBerryBoss===2);
   if(!lastBossAlive||time>=DURATION+30){
    won=true;active=false;finish?.({success:true,trees:state(),easy,time:Math.floor(time)});
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
 function draw(ctx){
  if(!active)return;
  for(const t of trees){
   ctx.save();ctx.translate(t.x,t.y);
   ctx.fillStyle='#112823b3';ctx.strokeStyle=t.hp>0?'#98eea4':'#6e7686';
   ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,55,30,0,0,Math.PI*2);ctx.fill();ctx.stroke();
   drawTree(ctx,t.hp/t.maxHp,t.id);
   ctx.fillStyle='#081e29';ctx.fillRect(-38,-65,76,9);
   ctx.fillStyle=t.hp>35?'#8adf9e':'#e8765d';ctx.fillRect(-36,-63,72*t.hp/t.maxHp,5);
   ctx.restore();
  }
 }
 function hud(ctx,w,h){
  if(!active)return;
  ctx.save();ctx.font='bold 12px sans-serif';ctx.textBaseline='top';
  const left=15,top=Math.max(130,h-124);
  ctx.fillStyle='#0c2738df';ctx.fillRect(left,top,202,95);
  ctx.fillStyle='#ffe9ab';ctx.fillText('🍓 '+tr('GIẢI CỨU BERRY','RESCUE BERRY')+' · '+Math.max(0,Math.ceil((DURATION-time)/60))+'m',left+8,top+7);
  trees.forEach((tree,i)=>{
   ctx.fillStyle='#e8f7eb';ctx.fillText('🌳 '+(i+1)+' '+Math.round(100*tree.hp/tree.maxHp)+'%',left+9,top+29+i*20);
  });
  ctx.restore();
 }
 return {DURATION,BOSS_TIMES,REWARD_CHANCE,NORMAL_REWARDS,EASY_REWARDS,chanceForHp,difficultyFor,begin,tick,onEvent,reward,draw,hud,state,
  get easy(){return easy},
  get active(){return active},get trees(){return trees},get bossStage(){return bossStage}};
})();
// Same opening forest music as Tranh Trứng, without re-editing js/game.js.
// Installed after core/audio.js in defer ordering, and restored automatically
// outside of Berry matches. Only wraps once across rematches.
if(G.Audio?.music&&!G.Audio._pkmsvvBerryMusicWrapped){
 const originalMusic=G.Audio.music;
 G.Audio._pkmsvvBerryMusicWrapped=true;
 G.Audio.music=function(track,...args){
  return originalMusic.call(this,G.PKMSVVBerryRescue?.active?(G.BIOME_MUSIC?.[0]||'forest'):track,...args);
 };
}
