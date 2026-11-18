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
  waveClock=0,waveIndex=0,duelClock=0,cachedThreats=0,rendered=new Set(),lastFinish=null,
  machineTarget=null,speedStage=-1,speedClock=0,distressNode=null,distressUntil=0,distressShown=false;
 const botTimes=new Map();
 const room=()=>G.Social?.room;
 const allBots=()=>G.Coop?.puppets?.().filter(p=>p.lanBot&&!p.dead)||[];
 const ally=()=>[G.Game?.player,...allBots()].filter(p=>p&&!p.dead&&Number.isFinite(p.x)&&Number.isFinite(p.y));
 const at=(p,q,r)=>!!p&&!!q&&Math.hypot(p.x-q.x,p.y-q.y)<=r;
 const phaseName=()=>current?.phase||'';
 const fragments=()=>current?.sites.reduce((n,s)=>n+s.hits,0)||0;
 // Berry-inspired targeting: one stable target actor; no per-frame allocation.
 // Four out of every five enemies prioritize attacking the powered restorer.
 function targetFor(enemy){
  if(!active||!G.Coop?.isHost||!current?.machine.online||
     current.phase!=='defend'||!enemy||enemy.dead||enemy.remote)return null;
  const id=Number(enemy.id);
  return Number.isSafeInteger(id)&&Math.abs(id)%5!==0?machineTarget:null;
 }
 // Update native enemy speed only on new stages or newly spawned enemies.
 // Guard read-only custom variants: an exception here would freeze Co-op.
 function rebalanceEnemy(e,stage){
  if(!e||e.dead||e.remote||e._pkmsvvFossilSpeedStage===stage)return;
  const factor=C.speedFactor(current?.elapsed??0);
  const own=Object.getOwnPropertyDescriptor(e,'spd');
  const proto=!own&&Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e),'spd');
  const field=own||proto;
  if(field&&!field.writable&&typeof field.set!=='function')return;
  const speed=Number(e.spd),old=e._pkmsvvFossilSpeedFactor||1;
  if(!Number.isFinite(speed))return;
  try{
   e.spd=speed/old*factor;
   e._pkmsvvFossilSpeedFactor=factor;
   e._pkmsvvFossilSpeedStage=stage;
  }catch(_){/* Never let read-only variants stop the game loop. */}
 }
 function talk(vi,en){
  if(G.Coop?.isHost)G.Spawner?.say?.(tr(vi,en),3);
 }

// Rotom's own SOS portrait/dialogue: a real phase transition, not a Pippi toast.
// Keep it separate from other story text and never stop the moving Co-op clock.
function showRotomSOS(){
 if(!active||!current||current.phase!=='rescue'||distressShown)return;
 distressShown=true;distressUntil=current.elapsed+7;
 if(typeof document==='undefined')return;
 distressNode=document.getElementById('pkmsvv-rotom-distress');
 if(!distressNode){
  distressNode=document.createElement('div');distressNode.id='pkmsvv-rotom-distress';
  distressNode.setAttribute('role','status');distressNode.setAttribute('aria-live','polite');
  distressNode.style.cssText='position:fixed;top:clamp(88px,13vh,142px);left:50%;transform:translateX(-50%);z-index:820;width:min(85vw,460px);max-width:calc(100vw - 22px);display:flex;align-items:center;gap:12px;padding:10px 14px;background:#152e43f2;border:3px solid #fca36e;border-radius:12px;box-shadow:0 5px 0 #613d39,0 9px 28px #0009;pointer-events:none;color:#fff4da;font:700 14px/1.35 sans-serif;box-sizing:border-box';
  const portrait=document.createElement('img');portrait.src='images/coop-lab/rotom-orb.svg';portrait.alt='';
  portrait.style.cssText='width:54px;height:54px;flex:none;image-rendering:pixelated;filter:drop-shadow(0 0 7px #ff944e)';
  const body=document.createElement('div');body.style.cssText='flex:1;min-width:0';
  const label=document.createElement('div');label.textContent='⚡ Rotom · SOS';
  label.style.cssText='color:#ffaf79;font-weight:900;font-size:15px;margin-bottom:3px';
  const message=document.createElement('div');message.className='pkmsvv-rotom-message';
  body.append(label,message);distressNode.append(portrait,body);
  document.body.append(distressNode);
 }
 const message=distressNode.querySelector('.pkmsvv-rotom-message');
 if(message)message.textContent=tr(
  'Cứu tôi với! Golurk đang tấn công! Đến đây trước 4:00 nhé!',
  'Help! Golurk is attacking me! Get here before 4:00!');
 distressNode.style.display='flex';
}
function updateRotomSOS(){
 if(!distressNode||!current)return;
 distressNode.style.display=current.phase==='rescue'&&current.elapsed<distressUntil?'flex':'none';
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
  end();finished=false;lastFinish=null;lastAction=-100;lastBossHint=-100;scanClock=sendClock=waveClock=duelClock=speedClock=0;speedStage=-1;waveIndex=0;distressUntil=0;distressShown=false;botTimes.clear();
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
  machineTarget={x:current.machine.x,y:current.machine.y,r:44,level:1,dead:false,
   _vx:0,_vy:0,_pkmsvvFossilMachine:true};
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
   if(result.ok&&current.phase==='rescue')showRotomSOS();
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
  actionButton();updateRotomSOS();
  if(rotomAnimator)try{rotomAnimator.update?.(dt);}catch(_){}
  if(!G.Coop?.isHost)return;
  if(current.phase==='escort')moveRotom(dt);
  // Berry Rescue cadence at 5Hz: +13⅓% every 2 min, capped +40%.
  // Existing enemies keep their HP, damage, XP and original hitboxes.
  const stage=Math.max(0,Math.min(C.MAX_SPEED_STAGES,
   Math.floor(current.elapsed/C.SPEED_STEP_SECONDS)));
  speedClock+=Math.max(0,Number(dt)||0);
  if(speedClock>=.2||speedStage!==stage){
   speedClock=0;speedStage=stage;
   for(const e of G.EnemyMgr?.all?.()||[])rebalanceEnemy(e,stage);
  }
  if(current.phase==='rescue'&&bossEnemy&&!bossDown()){
   duelClock+=Math.max(0,dt);
   if(duelClock>=1.6){
    duelClock=0;
    // Rotom lands weak Ghost-type sparks, while Golurk's Ground typing
    // prevents simple Electric spam. Rotom cannot solo-finish the boss.
    if(bossEnemy.hp>110)bossEnemy.hurt?.(Math.min(9,bossEnemy.hp-110),'#d4aeec',0,0,0);
   }
  }
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
  const previous=current.phase;
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
  if(phase==='rescue'&&previous!=='rescue')showRotomSOS();
  updateRotomSOS();
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
   // Egg-like HP bar; 3 real excavation hits = 100%, 67%, 33%, 0%.
   // No synthetic damage: bar derives directly from host-authoritative hits.
   const hp=C.rockHpRatio(obj.hits);
   const bx=-38,by=-72,bw=76;
   ctx.fillStyle='#152b34e8';ctx.fillRect(bx-2,by-2,bw+4,12);
   ctx.fillStyle='#51545c';ctx.fillRect(bx,by,bw,8);
   ctx.fillStyle=hp>.65?'#a4e4bc':hp>.3?'#f4cf81':'#e77c77';
   ctx.fillRect(bx+2,by+2,(bw-4)*hp,4);
   ctx.fillStyle='#253740';ctx.fillRect(bx+bw/3,by+1,2,6);
   ctx.fillRect(bx+bw*2/3,by+1,2,6);
   ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;
   ctx.strokeStyle='#172b35';ctx.fillStyle='#ffe4a7';
   const text=obj.hits>=3?'✓':String(obj.hits)+'/3';
   ctx.strokeText(text,0,-87);ctx.fillText(text,0,-87);
  }else if(obj.type==='rotom'&&!current.rotom.merged){
   if(current.phase==='rescue'&&bossEnemy&&!bossDown()&&Math.floor(current.elapsed*4)%4<2){
    const dx=bossEnemy.x-obj.x,dy=bossEnemy.y-obj.y;
    ctx.strokeStyle='#ddbaed';ctx.lineWidth=3;ctx.beginPath();
    ctx.moveTo(7,-25);ctx.lineTo(dx*.3,-38);
    ctx.lineTo(dx*.6+8,dy*.65-20);ctx.lineTo(dx,dy-15);ctx.stroke();
   }
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

 // World-space bearings projected onto a safe screen edge, not buried in the
 // lower-left text panel. Every uncompleted excavation gets its own arrow.
 function guidanceTargets(){
  if(!active||!current)return [];
  if(current.phase==='excavate')
   return current.sites.filter(site=>!site.done).map(site=>({
    point:site,label:String(site.id),color:['#99deb7','#eed298','#ffbc70'][site.id-1]}));
  if(current.phase==='rescue')return [{point:current.rotom,label:'SOS',color:'#ff8856'}];
  if(current.phase==='escort')return [{point:current.machine,label:'⚡',color:'#86e8e3'}];
  if(current.phase==='defend')return [{point:current.machine,label:'⌂',color:'#8de5bc'}];
  return [];
 }
 function drawCompass(ctx,w,h,player){
  if(!player||w<220||h<240)return;
  const midX=w/2,midY=h/2,minX=54,maxX=w-54,minY=104,maxY=h-108;
  for(const t of guidanceTargets()){
   const dx=t.point.x-player.x,dy=t.point.y-player.y,dist=Math.hypot(dx,dy);
   if(!Number.isFinite(dist)||dist<120)continue;
   const ux=dx/dist,uy=dy/dist;
   const tx=Math.abs(ux)<.00001?Infinity:(ux>0?(maxX-midX)/ux:(minX-midX)/ux);
   const ty=Math.abs(uy)<.00001?Infinity:(uy>0?(maxY-midY)/uy:(minY-midY)/uy);
   const along=Math.max(0,Math.min(tx,ty));
   const x=midX+ux*along,y=midY+uy*along;
   if(!Number.isFinite(x)||!Number.isFinite(y))continue;
   ctx.save();ctx.translate(x,y);
   ctx.fillStyle='#102b39ec';ctx.strokeStyle=t.color;ctx.lineWidth=3;
   ctx.beginPath();ctx.arc(0,0,25,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.rotate(Math.atan2(dy,dx));
   ctx.fillStyle=t.color;ctx.beginPath();ctx.moveTo(19,0);
   ctx.lineTo(-6,-12);ctx.lineTo(-2,0);ctx.lineTo(-6,12);ctx.closePath();ctx.fill();
   ctx.rotate(-Math.atan2(dy,dx));
   ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 10px sans-serif';
   ctx.fillStyle='#fff5df';ctx.fillText(t.label,0,0);
   ctx.font='bold 10px sans-serif';
   ctx.strokeStyle='#092637';ctx.lineWidth=3;
   const range=Math.round(dist)+'px';
   ctx.strokeText(range,0,35);ctx.fillText(range,0,35);
   ctx.restore();
  }
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
   tr('Giữ máy tới 8:00 · Quái nhanh dần mỗi 2 phút','Hold until 8:00 · Enemies accelerate every 2 min');
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
  drawCompass(ctx,w,h,pl);
 }
 function reward(result){
  if(!result?.success)return false;
  G.UI?.toast?.(tr('Thắng thử nghiệm! Thưởng Kabuto/Xu Đồng Đội chưa kích hoạt.',
    'Mission QA cleared! Kabuto and Co-op Coins are not enabled yet.'),3500);
  return false;
 }
 function end(){
  active=false;finished=true;current=null;bossEnemy=null;rotomAnimator=null;
  uiButton?.remove();uiButton=null;distressNode?.remove();distressNode=null;distressShown=false;
  rendered.clear();botTimes.clear();machineTarget=null;speedStage=-1;
 }
 return {nativeReady:ready,begin,tick,perform,botGoal,botInteract,targetFor,onEvent,
  drawables,beginFrame,drawMissing,hud,reward,end,
  get active(){return active},get session(){return current},get lastFinish(){return lastFinish},
  get spriteReady(){return excavations.complete&&excavations.naturalWidth>0&&
   machines.complete&&machines.naturalWidth>0}};
})();
