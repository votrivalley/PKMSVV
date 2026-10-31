/* Offline-first LAN Berry Rescue (4 trainers): 3 defended trees; Host authoritative.
 * Two boss waves: 4:00 and 8:00; each surviving tree has 30% independent
 * reward chance. No Rift, eggs, wild Pokémon rescue or story-boss spawns.
 */
G.PKMSVVBerryRescue=(()=>{
 'use strict';
 const DURATION=480,BOSS_TIMES=[240,480],REWARD_CHANCE=.3;
 const POS=[[-260,105],[0,145],[260,105]];
 const NAMES=['Oran','Sitrus','Lum'];
 let active=false,time=0,trees=[],bossStage=0,won=false,claimed=false,sendClock=0,endClock=0;
 let sprites=[];
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 function begin(cfg){
  active=!!(cfg&&cfg.mode==='berry');time=0;bossStage=0;won=false;claimed=false;
  sendClock=0;endClock=0;
  trees=POS.map(([x,y],i)=>({id:i,x,y,hp:100,maxHp:100,guard:0}));
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
  for(let i=0;i<3;i++)trees[i].hp=Math.max(0,Math.min(100,Number(ev[1+i])||0));
  bossStage=Math.max(bossStage,Number(ev[4])||0);
  time=Math.max(time,Math.min(DURATION+45,Number(ev[5])||0));
 }
 function state(){return trees.map(t=>Math.max(0,Math.round(t.hp)));}
 function reward(result){
  if(claimed||!result||!Array.isArray(result.trees))return [];claimed=true;
  const awarded=[];
  if(!result.success)return awarded;
  for(const alive of result.trees.slice(0,3)){
   if(!alive||Math.random()>=REWARD_CHANCE)continue;
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
  if(!survivors){active=false;finish?.({success:false,trees:[false,false,false],time:Math.floor(time)});return;}
  if(time>=DURATION){
   const lastBossAlive=enemies.some(e=>e&&!e.dead&&e._pkmsvvBerryBoss===2);
   if(!lastBossAlive||time>=DURATION+30){
    won=true;active=false;finish?.({success:true,trees:trees.map(t=>t.hp>0),time:Math.floor(time)});
   }
  }
 }
 function draw(ctx){
  if(!active)return;
  for(const t of trees){
   ctx.save();ctx.translate(t.x,t.y);
   ctx.fillStyle='#112823b3';ctx.strokeStyle=t.hp>0?'#98eea4':'#6e7686';
   ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,55,30,0,0,Math.PI*2);ctx.fill();ctx.stroke();
   const img=sprites[t.id];
   if(img?.complete&&img.naturalWidth)ctx.drawImage(img,-28,-60,56,56);
   else{ctx.fillStyle='#e69b5e';ctx.fillRect(-20,-45,40,30);}
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
   ctx.fillStyle='#e8f7eb';ctx.fillText('🌳 '+(i+1)+' '+Math.round(tree.hp)+'%',left+9,top+29+i*20);
  });
  ctx.restore();
 }
 return {DURATION,BOSS_TIMES,REWARD_CHANCE,begin,tick,onEvent,reward,draw,hud,state,
  get active(){return active},get trees(){return trees},get bossStage(){return bossStage}};
})();
