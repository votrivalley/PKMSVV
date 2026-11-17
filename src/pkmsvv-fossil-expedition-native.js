/* PKMSVV Fossil Expedition v2 — actual host-owned LAN/AI objective adapter.
 * QA only until full 8-minute/multi-human/reward QA passes. No save writes.
 * Ground-truth simulation stays on host; each bot acts via G.LanAI.
 */
G.PKMSVVFossilExpedition=(()=>{
 'use strict';
 const C=G.PKMSVVFossilExpeditionCore,KEY='fossil_lab';
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const ready=!!C&&typeof C.rescue==='function'&&C.ROTOM_DEADLINE===240;
 const image=(url)=>{const img=new Image();img.src=url;return img;};
 const excavations=image('images/coop-lab/fossil-excavation-atlas.svg');
 const machines=image('images/coop-lab/rotom-restorer-atlas.svg');
 const rotomFallback=image('images/coop-lab/rotom-orb.svg');
 let current=null,active=false,finished=false,bossEnemy=null,rotomAnimator=null,
  uiButton=null,lastAction=-100,lastBossHint=-100,sendClock=0,scanClock=0,
  waveClock=0,waveIndex=0,cachedThreats=0,rendered=new Set(),lastFinish=null;
 const botTimes=new Map();
 const room=()=>G.Social?.room;
 const allBots=()=>G.Coop?.puppets?.().filter(p=>p.lanBot&&!p.dead)||[];
 const ally=()=>[G.Game?.player,...allBots()].filter(p=>p&&!p.dead&&Number.isFinite(p.x)&&Number.isFinite(p.y));
 const at=(p,q,r)=>!!p&&!!q&&Math.hypot(p.x-q.x,p.y-q.y)<=r;
 const phaseName=()=>current?.phase||'';
 const fragments=()=>current?.sites.reduce((n,s)=>n+s.hits,0)||0;
 function talk(vi,en){
  if(G.Coop?.isHost)G.Spawner?.say?.(tr(vi,en),3);
 }
 function safePoint(p){
  if(!G.World?.isFree)return p;
  if(G.World.isFree(p.x,p.y,32)&&!G.World.isLiquid?.(p.x,p.y))return p;
  for(let radius=32;radius<=220;radius+=24)
   for(let step=0;step<16;step++){
    const a=step*Math.PI/8;
    const t={x:p.x+Math.cos(a)*radius,y:p.y+Math.sin(a)*radius};
    if(G.World.isFree(t.x,t.y,32)&&!G.World.isLiquid?.(t.x,t.y))return t;
   }
  return p;
 }
 function begin({mode}={}){
  end();finished=false;lastFinish=null;lastAction=-100;lastBossHint=-100;scanClock=sendClock=waveClock=0;waveIndex=0;botTimes.clear();
  if((mode||room()?.mode)!==KEY)return false;
  const r=room();
  if(!ready||r?.mode!==KEY||!Array.isArray(r.members)||r.members.length<2||r.members.length>4){
   G.UI?.toast?.(tr('Co-op hóa thạch cần 2–4 thành viên.','Fossil Co-op requires 2–4 party members.'),3000);
   return false;
  }
  const origin=safePoint({x:0,y:0}),sites=C.SITE_OFFSETS.map(([x,y])=>safePoint({x:origin.x+x,y:origin.y+y}));
  const rotomPoint=safePoint({x:origin.x+C.ROTOM_OFFSET[0],y:origin.y+C.ROTOM_OFFSET[1]});
  // The pure core refuses any map locations that are too close together.
  // Fallback to guaranteed distant offsets rather than silently grouping rocks.
  let session=C.begin({members:r.members,roomId:r.id,hostUid:r.host,origin,sites,rotomPoint});
  if(!session.ok)session=C.begin({members:r.members,roomId:r.id,hostUid:r.host,origin});
  if(!session.ok)return false;
  current=session;active=true;
  if(G.Sprites?.Animator)try{
   rotomAnimator=new G.Sprites.Animator(479,1.15);
   G.Sprites.preload?.([479,623],8000,false);
  }catch(_){rotomAnimator=null;}
  talk('Pippi: Ba mỏ đá nằm xa nhau đó! 9 mảnh, không phải đào cho vui. Đi thôi, khảo cổ Gen Z!',
   'Pippi: Three distant sites, nine fragments. This is an expedition, not decorative gravel!');
  return true;
 }
 function bossDown(){
  return !!bossEnemy&&(bossEnemy.dead===true||
   !G.EnemyMgr?.all?.().includes(bossEnemy));
 }
 function spawnBoss(){
  if(!G.Coop?.isHost||bossEnemy||!current?.boss.spawned)return;
  const b=current.boss;
  try{
   bossEnemy=G.EnemyMgr.add(new G.Enemy(
    {dex:C.BOSS_DEX,hp:1350,spd:0,dmg:12,xp:30,behavior:'chase'},
    b.x,b.y,{hp:1,spd:1,dmg:1},true));
   bossEnemy.pkmsvvFossilRotomBoss=true;
   G.EnemyMgr.rebuildGrid?.();
   talk('Pippi: Ê cứu Rotom trước 4:00! Golurk đang dí điện thoại biết bay kia kìa!',
    'Pippi: Save Rotom before 4:00! Golurk is camping the rescue site!');
  }catch(e){
   console.error('[Fossil] Golurk spawn failed',e);
   // Do not bypass boss kill; mission cannot falsely finish without it.
  }
 }
 function botGoal(pl,index=0){
  if(!active||!current)return null;
  const s=current;
  if(s.phase==='excavate'){
   const sites=s.sites.filter(site=>!site.done);
   if(!sites.length)return s.rotom;
   // Distribute allies between separate rocks; do not all pile onto one spot.
   return sites[index%sites.length];
  }
  if(s.phase==='rescue')return s.rotom;
  if(s.phase==='escort'){
   if(at(pl,s.rotom,160))return s.machine;
   return s.rotom;
  }
  if(s.phase==='defend')return s.machine;
  return null;
 }
 function interact(actor,uid,fromBot=false){
  if(!active||!G.Coop?.isHost||!actor||actor.dead||G.Game?.state!=='playing')
   return {ok:false,reason:'inactive'};
  const now=current.clock;
  const last=fromBot?(botTimes.get(uid)||-100):lastAction;
  if(now-last<(fromBot?0.9:0.55))return {ok:false,reason:'cooldown'};
  let result={ok:false,reason:'range'};
  if(current.phase==='excavate'){
   const site=current.sites.find(s=>!s.done&&at(actor,s,C.DIG_RADIUS));
   if(site)result=C.dig(current,{uid,siteId:site.id,actor,
    seconds:now,source:'native-strike'});
   if(result.ok&&result.done){
    talk('Pippi: Lụm được '+fragments()+'/9 mảnh! Đá này không có nút tua nhanh nha.',
     'Pippi: '+fragments()+'/9 pieces! No speedrun button for these rocks.');
   }
  }else if(current.phase==='rescue'&&at(actor,current.rotom,C.RESCUE_RADIUS)){
   current.boss.defeated=bossDown();
   result=C.rescue(current,{uid,actor,seconds:now,roomId:current.roomId,
    bossDefeated:current.boss.defeated});
   if(result.reason==='boss-alive'&&now-lastBossHint>5){
    lastBossHint=now;
    talk('Pippi: Golurk còn đứng đó kìa! Đánh boss rồi mới cứu Rotom được, trời ơi!',
     'Pippi: Golurk is still standing! Beat the boss before freeing Rotom!');
   }
   if(result.ok){
    talk('Pippi: Rotom được cứu rồi! Hộ tống em về máy cũ, đừng bỏ rơi giữa đường nha!',
     'Pippi: Rotom rescued! Escort it back to the old machine!');
   }
  }
  if(result.ok){
   if(fromBot)botTimes.set(uid,now);else lastAction=now;
  }
  return result;
 }
 function perform(){
  const actor=G.Game?.player;
  return interact(actor,G.Social?.uid,false);
 }
 function botInteract(pl){
  if(!pl?.lanBot||!active||!G.Coop?.isHost)return false;
  return interact(pl,pl.uid,true).ok===true;
 }
 function nearestInteraction(p=G.Game?.player){
  if(!active||!p||p.dead||!G.Coop?.isHost)return null;
  if(current.phase==='excavate'){
   const site=current.sites.find(s=>!s.done&&at(p,s,C.DIG_RADIUS));
   return site?{type:'dig',site}:null;
  }
  if(current.phase==='rescue'&&at(p,current.rotom,C.RESCUE_RADIUS))
   return {type:'rescue'};
  return null;
 }
 function onKey(e){
  if(e.code!=='KeyE'||e.repeat||e.target?.matches?.('input,textarea,select,[contenteditable]'))return;
  if(!nearestInteraction()||G.Game?.state!=='playing')return;
  e.preventDefault();perform();
 }
 if(typeof document!=='undefined')document.addEventListener('keydown',onKey);
 function actionButton(){
  if(!active)return;
  if(!uiButton||!uiButton.isConnected){
   uiButton=document.createElement('button');uiButton.id='pkmsvv-fossil-expedition-action';
   uiButton.type='button';
   uiButton.style.cssText='position:fixed;bottom:86px;right:17px;z-index:800;color:#112e38;background:#ffe3a0;border:3px solid #8e7136;border-radius:12px;padding:9px 13px;font-weight:800;display:none;box-shadow:0 4px 0 #58442e';
   uiButton.onclick=perform;document.body.append(uiButton);
  }
  const action=nearestInteraction();
  uiButton.style.display=action&&G.Game?.state==='playing'?'block':'none';
  uiButton.textContent=action?.type==='dig'?tr('⛏ Đào hóa thạch · E','⛏ Mine fossil · E'):
   tr('⚡ Cứu Rotom · E','⚡ Rescue Rotom · E');
 }
 function moveRotom(dt){
  if(current?.phase!=='escort'||!G.Coop?.isHost)return;
  const r=current.rotom,players=ally();
  if(!players.length)return;
  const leader=players.find(p=>p===G.Game?.player)||players[0];
  const dx=leader.x-r.x,dy=leader.y-r.y,d=Math.hypot(dx,dy);
  if(d<50)return;
  const step=Math.min(d-45,165*Math.max(0,dt));
  const a=Math.atan2(dy,dx);
  const offsets=[0,.4,-.4,.8,-.8,1.4,-1.4,Math.PI];
  for(const offset of offsets){
   const nx=r.x+Math.cos(a+offset)*step,ny=r.y+Math.sin(a+offset)*step;
   if(!G.World?.isFree||G.World.isFree(nx,ny,14)){
    r.x=nx;r.y=ny;return;
   }
  }
 }
 function spawnWave(){
  if(!current?.machine.online||!G.Coop?.isHost)return;
  const m=current.machine;waveIndex++;
  // Small fixed-size waves; bounded spawn count avoids horde/O(n^2) spikes.
  for(let i=0;i<2;i++){
   const angle=(waveIndex*2.399+i*Math.PI),radius=240+(i%2)*65;
   const p=safePoint({x:m.x+Math.cos(angle)*radius,y:m.y+Math.sin(angle)*radius});
   try{
    G.EnemyMgr.add(new G.Enemy(
     {dex:[74,95,92][(waveIndex+i)%3],hp:120+waveIndex*12,spd:54,dmg:8,xp:3,behavior:'chase'},
     p.x,p.y,{hp:1,spd:1,dmg:1}));
   }catch(e){console.warn('[Fossil] defense wave spawn skipped',e);}
  }
 }
 function tick(dt,time,players,finish){
  if(!active||!current||finished)return;
  actionButton();
  if(rotomAnimator)try{rotomAnimator.update?.(dt);}catch(_){}
  if(!G.Coop?.isHost)return;
  if(current.phase==='escort')moveRotom(dt);
  scanClock+=Math.max(0,Number(dt)||0);
  if(scanClock>=.2){
   scanClock=0;cachedThreats=0;
   if(current.machine.online)for(const e of G.EnemyMgr?.all?.()||[]){
    if(e?.dead)continue;
    const dx=e.x-current.machine.x,dy=e.y-current.machine.y;
    if(dx*dx+dy*dy<150*150)cachedThreats++;
   }
  }
  const oldPhase=current.phase;
  const result=C.tick(current,{seconds:time,roomId:current.roomId,
   liveMembers:room()?.members,threats:Math.min(128,cachedThreats),
   rotomPosition:{x:current.rotom.x,y:current.rotom.y},bossDefeated:bossDown()});
  if(current.boss.spawned)spawnBoss();
  if(current.phase==='defend'&&oldPhase!=='defend'){
   talk('Pippi: Rotom nhập máy rồi! Máy đã sáng, giờ bảo vệ tới đúng 8:00. Thua là tui khóc giả đó!',
    'Pippi: Rotom fused with the restorer! Keep it safe until 8:00!');
  }
  if(current.phase==='defend'){
   waveClock+=Math.max(0,dt);
   if(waveClock>=13){waveClock=0;spawnWave();}
  }
  sendClock+=Math.max(0,Number(dt)||0);
  if(sendClock>=.5){
   sendClock=0;
   const phaseIndex={excavate:0,rescue:1,escort:2,defend:3,cleared:4,failed:5}[current.phase]??0;
   G.Coop?.broadcast?.(['fx',phaseIndex,Math.round(current.machine.hp),Math.round(current.elapsed),
    ...current.sites.map(s=>s.hits),Math.round(current.rotom.x),Math.round(current.rotom.y),
    Math.round(current.rotom.hp),current.rotom.freed?1:0,current.rotom.merged?1:0,
    current.boss.defeated?1:0]);
  }
  if(result.finished){
   finished=true;active=false;uiButton?.remove();
   lastFinish=result.result||{cleared:false,reason:result.reason};
   const receipt=result.result?.cleared?C.receipt(current,1):null;
   finish?.({success:!!result.result?.cleared,reason:result.reason,receipt,
    time:current.elapsed,partySize:current.team.length,fragments:fragments(),
    machineHp:current.machine.hp,rotom:current.rotom.merged});
  }
 }
 function onEvent(ev){
  if(!active||G.Coop?.isHost||ev?.[0]!=='fx'||!current||ev.length<13)return;
  const phase=['excavate','rescue','escort','defend','cleared','failed'][Math.max(0,Math.min(5,Number(ev[1])||0))];
  current.phase=phase;
  current.machine.hp=Math.max(0,Math.min(C.MAX_MACHINE_HP,Number(ev[2])||0));
  current.elapsed=Math.max(current.elapsed,Math.min(C.DEFEND_END,Number(ev[3])||0));
  for(let i=0;i<3;i++){
   const n=Math.max(0,Math.min(3,Number(ev[4+i])||0));
   current.sites[i].hits=n;current.sites[i].done=n===3;
  }
  current.collected=current.sites.filter(s=>s.done).length;
  current.rotom.x=Number(ev[7])||0;current.rotom.y=Number(ev[8])||0;
  current.rotom.hp=Math.max(0,Math.min(100,Number(ev[9])||0));
  current.rotom.freed=ev[10]===1;current.rotom.merged=ev[11]===1;
  current.machine.online=current.rotom.merged;
  current.boss.defeated=ev[12]===1;
 }
 function drawOne(ctx,obj){
  ctx.save();ctx.translate(obj.x,obj.y);ctx.imageSmoothingEnabled=false;
  if(obj.type==='machine'){
   if(machines.complete&&machines.naturalWidth>0){
    ctx.drawImage(machines,obj.online?160:0,0,160,160,-66,-126,132,132);
   }else{
    ctx.fillStyle='#594e49';ctx.fillRect(-45,-80,90,82);
    ctx.fillStyle=obj.online?'#80e9ef':'#554740';ctx.fillRect(-30,-62,60,38);
   }
   const ratio=Math.max(0,Math.min(1,obj.hp/C.MAX_MACHINE_HP));
   ctx.fillStyle='#1e2630';ctx.fillRect(-44,14,88,10);
   ctx.fillStyle=ratio>.3?'#7fe0a9':'#ef7768';ctx.fillRect(-42,17,84*ratio,5);
  }else if(obj.type==='site'){
   const col=Math.max(0,Math.min(2,obj.id-1)),row=obj.hits>=3?2:obj.hits>=2?1:0;
   if(excavations.complete&&excavations.naturalWidth>0)
    ctx.drawImage(excavations,col*128,row*128,128,128,-49,-58,98,98);
   else{
    ctx.fillStyle=row===2?'#53483c':row===1?'#977860':'#b59c79';
    ctx.fillRect(-36,-32,72,45);
   }
   ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;
   ctx.strokeStyle='#172b35';ctx.fillStyle='#ffe4a7';
   const text=obj.hits>=3?'✓':String(obj.hits)+'/3';
   ctx.strokeText(text,0,-57);ctx.fillText(text,0,-57);
  }else if(obj.type==='rotom'&&!current.rotom.merged){
   if(rotomAnimator)try{
    rotomAnimator.draw(ctx,0,-18);ctx.restore();return;
   }catch(_){}
   if(rotomFallback.complete&&rotomFallback.naturalWidth>0)
    ctx.drawImage(rotomFallback,-28,-55,56,56);
   else{
    ctx.fillStyle='#fa7840';ctx.beginPath();ctx.arc(0,-22,14,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#b5f7ed';ctx.fillRect(-6,-26,4,5);ctx.fillRect(3,-26,4,5);
   }
  }
  ctx.restore();
 }
 function visibleObjects(){
  if(!active||!current)return [];
  return [...current.sites.map(s=>({...s,type:'site'})),
    {...current.machine,type:'machine'},
    ...(!current.rotom.merged&&current.collected===3?[{...current.rotom,type:'rotom'}]:[])];
 }
 function drawables(){
  return visibleObjects().map(obj=>({y:obj.y,draw(ctx){
   const id=obj.type==='site'?'s'+obj.id:obj.type;
   rendered.add(id);drawOne(ctx,obj);
  }}));
 }
 function beginFrame(){rendered.clear();}
 function drawMissing(ctx){
  for(const obj of visibleObjects()){
   const id=obj.type==='site'?'s'+obj.id:obj.type;
   if(!rendered.has(id))drawOne(ctx,obj);
  }
 }
 function objective(){
  if(!active||!current)return null;
  if(current.phase==='excavate')return current.sites.find(s=>!s.done)||
    current.rotom;
  if(current.phase==='rescue')return current.rotom;
  return current.machine;
 }
 function hud(ctx,w,h){
  if(!active||!current)return;
  const phase=current.phase,s=current,pl=G.Game?.player;
  const left=14,top=Math.max(115,h-145),obj=objective();
  ctx.save();ctx.textBaseline='top';
  ctx.fillStyle='#092838ec';ctx.fillRect(left,top,296,128);
  ctx.fillStyle='#ffe2a5';ctx.font='bold 13px sans-serif';
  ctx.fillText(tr('🦴 KHAI QUẬT HÓA THẠCH','🦴 FOSSIL EXPEDITION'),left+8,top+7);
  ctx.fillStyle='#f5f6de';ctx.font='12px sans-serif';
  ctx.fillText(tr('Mảnh hóa thạch: ','Fossil fragments: ')+fragments()+'/9',left+8,top+28);
  ctx.fillText(tr('Máy: ','Machine: ')+Math.round(100*s.machine.hp/C.MAX_MACHINE_HP)+'% · '+
   Math.floor(s.elapsed/60)+':'+String(Math.floor(s.elapsed%60)).padStart(2,'0')+'/8:00',left+8,top+46);
  ctx.fillStyle=phase==='rescue'?'#ffad8b':'#c1e5d4';
  const remaining=Math.max(0,Math.ceil(C.ROTOM_DEADLINE-s.elapsed));
  const msg=phase==='excavate'?tr('Đào 3 mỏ xa nhau · mỗi mỏ 3 lần','Mine 3 distant sites · 3 strikes each'):
   phase==='rescue'?tr('CỨU ROTOM trước 4:00! Còn ','RESCUE ROTOM by 4:00! ')+Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0'):
   phase==='escort'?tr('Đưa Rotom về máy bỏ hoang','Escort Rotom to the derelict machine'):
   tr('Giữ máy đến phút 8:00!','Defend the machine until 8:00!');
  ctx.fillText(msg,left+8,top+66);
  ctx.fillStyle='#fff0bd';
  if(obj&&pl){
   const dx=obj.x-pl.x,dy=obj.y-pl.y;
   const distance=Math.round(Math.hypot(dx,dy));
   const compass=Math.abs(dx)>Math.abs(dy)?dx>0?'→':'←':dy>0?'↓':'↑';
   ctx.fillText(tr('Mục tiêu tiếp theo: ','Next target: ')+compass+' '+distance+'px',left+8,top+88);
  }
  ctx.fillStyle='#bad3dc';ctx.fillText(tr('E / nút ⛏ để đào hoặc cứu Rotom','Press E / ⛏ to mine or rescue Rotom'),left+8,top+108);
  ctx.restore();
 }
 function reward(result){
  if(!result?.success)return false;
  G.UI?.toast?.(tr('Thắng thử nghiệm! Thưởng Kabuto/Xu Đồng Đội chưa kích hoạt.',
    'Mission QA cleared! Kabuto and Co-op Coins are not enabled yet.'),3500);
  return false;
 }
 function end(){
  active=false;finished=true;current=null;bossEnemy=null;rotomAnimator=null;
  uiButton?.remove();uiButton=null;rendered.clear();botTimes.clear();
 }
 return {nativeReady:ready,begin,tick,perform,botGoal,botInteract,onEvent,
  drawables,beginFrame,drawMissing,hud,reward,end,
  get active(){return active},get session(){return current},get lastFinish(){return lastFinish},
  get spriteReady(){return excavations.complete&&excavations.naturalWidth>0&&
   machines.complete&&machines.naturalWidth>0}};
})();
