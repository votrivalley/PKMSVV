/* PKMSVV Fossil Expedition v2 — actual host-owned LAN/AI objective adapter.
 * QA-only; local host + AI reward gate, remote-human settlement disabled.
 * Ground-truth simulation stays on host; each bot acts via G.LanAI.
 */
G.PKMSVVFossilExpedition=(()=>{
 'use strict';
 const C=G.PKMSVVFossilExpeditionCore,KEY='fossil_lab';
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const ready=!!C&&typeof C.rescue==='function'&&C.ROTOM_DEADLINE===240;
 const image=(url)=>{const img=new Image();img.src=url;return img;};
 // All seven live sprites are cut from the user's approved art reference.
 const concept=image('images/coop-lab/approved-fossil-source-atlas.png');
 const excavations=concept;
 // Complete machine OFF/ON from the original approved concept (not the clipped 96px atlas).
 const machines=image('images/coop-lab/approved-fossil-machine-full-v4.png');
 // Approved V3 source PNG: three complete sprites, not the clipped V1/V2 cells.
 const v3=image('images/coop-lab/approved-fossil-v3-atlas.png'),rotomFallback=v3;
 const ART_CELL=96;
 const digSprite=[[192,0],[288,0],[0,96]];
 let current=null,active=false,finished=false,bossEnemy=null,rotomAnimator=null,
  uiButton=null,lastAction=-100,lastBossHint=-100,sendClock=0,scanClock=0,
  waveClock=0,waveIndex=0,duelClock=0,cachedThreats=0,rendered=new Set(),lastFinish=null,
  machineTarget=null,speedStage=-1,speedClock=0,distressNode=null,distressUntil=0,distressShown=false,
  worldCollider=null,escortRoute=[],escortRepathAt=0,rewardGate=null,lastReward=null;
 const botTimes=new Map(),humanTimes=new Map(),remoteSeq=new Map();
 let outgoingSeq=0,lastRequest=-100,escortUid=null;
 const matchSerial=()=>Number.isSafeInteger(room()?.matchSerial)?room().matchSerial:0;
 const room=()=>G.Social?.room;
 const allBots=()=>G.Coop?.puppets?.().filter(p=>p.lanBot&&!p.dead)||[];
 const ally=()=>[G.Game?.player,...(G.Coop?.puppets?.()||[])].filter(p=>p&&!p.dead&&Number.isFinite(p.x)&&Number.isFinite(p.y));
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
  // Small upper-right SOS notification: gameplay controls and timer unobstructed.
  distressNode.style.cssText='position:fixed;top:clamp(60px,10vh,108px);right:clamp(9px,3vw,30px);left:auto;transform:none;z-index:820;width:min(78vw,350px);max-width:calc(100vw - 18px);display:flex;align-items:center;gap:9px;padding:8px 10px;background:#152e43f2;border:2px solid #fca36e;border-radius:10px;box-shadow:0 3px 0 #613d39,0 6px 16px #0008;pointer-events:none;color:#fff4da;font:700 12px/1.3 sans-serif;box-sizing:border-box';
  const portrait=document.createElement('span');portrait.setAttribute('aria-hidden','true');
  // V3 SOS crop 144×144 with safe transparent padding, displayed at half size.
  portrait.style.cssText='width:72px;height:72px;flex:none;display:block;background-image:url("images/coop-lab/approved-fossil-v3-atlas.png");background-repeat:no-repeat;background-size:232px 72px;background-position:-88px 0;image-rendering:pixelated';
  const body=document.createElement('div');body.style.cssText='flex:1;min-width:0';
  const label=document.createElement('div');label.textContent='⚡ Rotom · SOS';
  label.style.cssText='color:#ffaf79;font-weight:900;font-size:14px;margin-bottom:2px';
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
 function passable(x,y,r=18){
  try{return typeof G.World?.isFree==='function'&&
    G.World.isFree(x,y,r)!==false&&!G.World?.isLiquid?.(x,y);}
  catch(_){return false;}
 }
 // All objective artwork needs room, not just one empty centre tile.
 function footprintFree(p,kind){
  const bounds=kind==='machine'?[-86,86,-138,34,43]:
   kind==='rotom'?[-78,78,-104,36,39]:[-68,68,-106,34,34];
  const [left,right,top,bottom,step]=bounds;
  for(let y=top;y<=bottom;y+=step)
   for(let x=left;x<=right;x+=step)
    if(!passable(p.x+x,p.y+y,17))return false;
  let approaches=0;
  for(let i=0;i<8;i++){
   const angle=i*Math.PI/4,dx=Math.cos(angle),dy=Math.sin(angle);
   if(passable(p.x+dx*105,p.y+dy*105,20)&&
      passable(p.x+dx*152,p.y+dy*152,20))approaches++;
  }
  return approaches>=5;
 }
 function safePoint(p,kind='site',accept=()=>true,minRadius=0){
  if(typeof G.World?.isFree!=='function')return null;
  const valid=v=>accept(v)&&footprintFree(v,kind);
  if(minRadius===0&&valid(p))return p;
  for(let radius=Math.max(48,minRadius);radius<=1200;radius+=44)
   for(let i=0;i<32;i++){
    const angle=i*Math.PI/16;
    const v={x:p.x+Math.cos(angle)*radius,y:p.y+Math.sin(angle)*radius};
    if(valid(v))return v;
   }
  return null; // Never fall back onto untested trees/rocks.
 }
 // World.isFree is also the native player/enemy movement collision gate.
 function installMachineCollider(){
  const world=G.World;
  // Player.move() uses World.collide(actor), NOT World.isFree().
  // Both gates must block the machine for real native movement.
  if(typeof world?.isFree!=='function'||typeof world?.collide!=='function')return false;
  const original=world.isFree,originalCollide=world.collide;
  const wrapper=function(x,y,r=0){
   if(active&&current&&Number.isFinite(x)&&Number.isFinite(y)){
    const m=current.machine,extra=Math.max(0,Number(r)||0);
    if(x>m.x-53-extra&&x<m.x+53+extra&&
       y>m.y-99-extra&&y<m.y+10+extra)return false;
   }
   return original.apply(this,arguments);
  };
  const collideWrapper=function(actor){
   const nativeHit=originalCollide.apply(this,arguments);
   if(!active||!current||!actor||!Number.isFinite(actor.x)||
      !Number.isFinite(actor.y))return nativeHit;
   const m=current.machine,left=m.x-53,right=m.x+53,
    top=m.y-99,bottom=m.y+10;
   const radius=Math.max(1,Number(actor.r)||12);
   const closestX=Math.max(left,Math.min(right,actor.x));
   const closestY=Math.max(top,Math.min(bottom,actor.y));
   const dx=actor.x-closestX,dy=actor.y-closestY,d2=dx*dx+dy*dy;
   if(d2>=radius*radius)return nativeHit;
   if(d2>1e-6){
    const distance=Math.sqrt(d2),push=(radius-distance)/distance;
    actor.x+=dx*push;actor.y+=dy*push;
   }else{
    // Circle centre inside the machine rectangle: expel via closest edge.
    const sides=[actor.x-left,right-actor.x,actor.y-top,bottom-actor.y];
    const min=Math.min(...sides);
    if(min===sides[0])actor.x=left-radius;
    else if(min===sides[1])actor.x=right+radius;
    else if(min===sides[2])actor.y=top-radius;
    else actor.y=bottom+radius;
   }
   return true;
  };
  try{
   world.isFree=wrapper;
   world.collide=collideWrapper;
   if(world.isFree!==wrapper||world.collide!==collideWrapper){
    world.isFree=original;world.collide=originalCollide;return false;
   }
   worldCollider={world,original,wrapper,originalCollide,collideWrapper};return true;
  }catch(_){
   try{world.isFree=original;world.collide=originalCollide;}catch(__){}
   return false;
  }
 }
 function restoreMachineCollider(){
  if(worldCollider){
   if(worldCollider.world?.isFree===worldCollider.wrapper)
    worldCollider.world.isFree=worldCollider.original;
   if(worldCollider.world?.collide===worldCollider.collideWrapper)
    worldCollider.world.collide=worldCollider.originalCollide;
  }
  worldCollider=null;
 }
 function begin({mode}={}){
  end();finished=false;lastFinish=null;lastReward=null;lastAction=-100;lastBossHint=-100;scanClock=sendClock=waveClock=duelClock=speedClock=0;speedStage=-1;waveIndex=0;distressUntil=0;distressShown=false;botTimes.clear();humanTimes.clear();remoteSeq.clear();outgoingSeq=0;lastRequest=-100;escortUid=null;
  if((mode||room()?.mode)!==KEY)return false;
  const r=room();
  if(!ready||r?.mode!==KEY||!Array.isArray(r.members)||r.members.length<2||r.members.length>4){
   G.UI?.toast?.(tr('Co-op hóa thạch cần 2–4 thành viên.','Fossil Co-op requires 2–4 party members.'),3000);
   return false;
  }
  // Deterministic host/guest world coordinates, away from spawn (0,0).
  const origin=safePoint({x:0,y:0},'machine',p=>Math.hypot(p.x,p.y)>=290,310);
  if(!origin){
   G.UI?.toast?.(tr('Không tìm được chỗ trống cho máy phục hồi. Hãy thử lại.',
    'No clear restorer location found. Please retry.'),3500);return false;
  }
  const sites=[];
  for(const [x,y] of C.SITE_OFFSETS){
   const p=safePoint({x:origin.x+x,y:origin.y+y},'site',
    t=>Math.hypot(t.x-origin.x,t.y-origin.y)>=1500&&
      sites.every(q=>Math.hypot(t.x-q.x,t.y-q.y)>=2550));
   if(!p){
    G.UI?.toast?.(tr('Không đủ chỗ trống để bố trí ba điểm khai thác.',
     'No safe locations for all three excavation sites.'),3500);return false;
   }
   sites.push(p);
  }
  const desiredRotom={x:origin.x+C.ROTOM_OFFSET[0],y:origin.y+C.ROTOM_OFFSET[1]};
  const rotomPoint=safePoint(desiredRotom,'rotom',p=>
   Math.hypot(p.x-origin.x,p.y-origin.y)>=900&&
   sites.every(site=>Math.hypot(p.x-site.x,p.y-site.y)>=600));
  if(!rotomPoint){
   G.UI?.toast?.(tr('Không tìm được vị trí cứu Rotom không vướng vật cản.',
    'No obstacle-free Rotom rescue location.'),3500);return false;
  }
  const session=C.begin({members:r.members,roomId:r.id,hostUid:r.host,
   origin,sites,rotomPoint});
  if(!session.ok)return false;
  current=session;active=true;
  if(!installMachineCollider()){
   G.UI?.toast?.(tr('Không thể bật va chạm cho máy phục hồi.',
    'Could not activate restorer collision.'),3500);
   end();return false;
  }
  if(typeof window!=='undefined'&&window.PKMSVV_FOSSIL_REWARDS_QA===true&&typeof window.PKMSVVCreateFossilRewardGate==='function'){
   rewardGate=window.PKMSVVCreateFossilRewardGate(C);
   rewardGate.begin(current,G.DB?.save,{uid:G.Social?.uid,host:G.Coop?.isHost===true,members:r.members,roomId:r.id,guest:!!G.DB?.guest});
  }
  machineTarget={x:current.machine.x,y:current.machine.y,r:54,level:1,dead:false,
   _vx:0,_vy:0,_pkmsvvFossilMachine:true};
  if(G.Sprites?.Animator)try{
   rotomAnimator=new G.Sprites.Animator(479,1.15);
   G.Sprites.preload?.([479,623],8000,false);
  }catch(_){rotomAnimator=null;}
  talk('Pippi: Có ba mỏ đá nằm xa nhau. Mỗi chỗ đào ba lần để đủ 9 mảnh nha. Đừng bỏ sót rồi bắt tui đi tìm!',
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
   talk('Pippi: Rotom đang bị Golurk chặn! Đánh bại Golurk rồi cứu Rotom trước phút 4, nhanh lên!',
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
  const last=fromBot?(botTimes.get(uid)??-100):(humanTimes.get(uid)??-100);
  if(now-last<(fromBot?0.9:0.55))return {ok:false,reason:'cooldown'};
  let result={ok:false,reason:'range'};
  if(current.phase==='excavate'){
   const site=current.sites.find(s=>!s.done&&at(actor,s,C.DIG_RADIUS));
   if(site)result=C.dig(current,{uid,siteId:site.id,actor,
    seconds:now,source:'native-strike'});
   if(result.ok&&current.phase==='rescue')showRotomSOS();
   if(result.ok&&result.done){
    talk('Pippi: Nhặt được '+fragments()+'/9 mảnh rồi! Còn thiếu thì tìm mỏ tiếp theo đi, tui chỉ đường.',
     'Pippi: '+fragments()+'/9 pieces! No speedrun button for these rocks.');
   }
  }else if(current.phase==='rescue'&&at(actor,current.rotom,C.RESCUE_RADIUS)){
   current.boss.defeated=bossDown();
   result=C.rescue(current,{uid,actor,seconds:now,roomId:current.roomId,
    bossDefeated:current.boss.defeated});
   if(result.reason==='boss-alive'&&now-lastBossHint>5){
    lastBossHint=now;
    talk('Pippi: Golurk còn ở đó! Hạ nó trước rồi mới giải cứu Rotom được nha.',
     'Pippi: Golurk is still standing! Beat the boss before freeing Rotom!');
   }
   if(result.ok){
    escortUid=uid;
    talk('Pippi: Cứu được Rotom rồi! Dẫn em ấy về máy phục nguyên cũ nhé, đi chậm thôi để em theo kịp.',
     'Pippi: Rotom rescued! Escort it back to the old machine!');
   }
  }
  if(result.ok){
   if(fromBot)botTimes.set(uid,now);else {humanTimes.set(uid,now);lastAction=now;}
  }
  return result;
 }
 function perform(){
  const actor=G.Game?.player;
  if(G.Coop?.isHost)return interact(actor,G.Social?.uid,false);
  if(!nearestInteraction(actor)||G.Game?.state!=='playing'||!G.Coop?.toHost)return {ok:false,reason:'inactive'};
  const now=Number(G.Game?.st?.time)||0;
  if(now-lastRequest<.55)return {ok:false,reason:'cooldown'};
  lastRequest=now;
  G.Coop.toHost(['fa',current.roomId,matchSerial(),++outgoingSeq]);
  return {ok:true,pending:true};
 }
 function remoteAction(uid,actor,ev){
  if(!active||!current||!G.Coop?.isHost||!Array.isArray(ev)||ev.length!==4||
     ev[0]!=='fa'||ev[1]!==current.roomId||ev[2]!==matchSerial()||
     !Number.isSafeInteger(ev[3])||ev[3]<1||uid===G.Social?.uid||
     !current.team.some(m=>m.uid===uid&&!m.bot)||
     !room()?.members?.some(m=>m.uid===uid&&!m.bot&&!m.disconnected)||
     !actor||actor.uid!==uid||actor.lanBot||actor.dead)return {ok:false,reason:'remote'};
  if(ev[3]<=(remoteSeq.get(uid)||0))return {ok:false,reason:'duplicate'};
  remoteSeq.set(uid,ev[3]);
  return interact(actor,uid,false);
 }
 function botInteract(pl){
  if(!pl?.lanBot||!active||!G.Coop?.isHost)return false;
  return interact(pl,pl.uid,true).ok===true;
 }
 function nearestInteraction(p=G.Game?.player){
  if(!active||!p||p.dead)return null;
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
 // Check the full segment to stop Rotom slipping through thin trunks.
 function lineFree(from,to){
  const dx=to.x-from.x,dy=to.y-from.y;
  const length=Math.hypot(dx,dy),samples=Math.max(1,Math.ceil(length/16));
  for(let i=1;i<=samples;i++)
   if(!passable(from.x+dx*i/samples,from.y+dy*i/samples,19))return false;
  return true;
 }
 // Bounded 8-direction A*: only planned when Rotom hits a genuine blocker.
 // It runs at most once per 0.7s, with <=1250 small map nodes, never teleports.
 function escortDetour(from,leader){
  const unit=40,bound=15,dx=leader.x-from.x,dy=leader.y-from.y;
  const length=Math.hypot(dx,dy)||1,reach=Math.min(440,length);
  const goal={x:from.x+dx/length*reach,y:from.y+dy/length*reach};
  const key=(x,y)=>x+','+y;
  const dist=(x,y)=>Math.hypot(from.x+x*unit-goal.x,from.y+y*unit-goal.y);
  const open=[{x:0,y:0,g:0,f:dist(0,0)}];
  const cost=new Map([['0,0',0]]),parent=new Map(),closed=new Set(),clear=new Map();
  const walk=(x,y)=>{
   const k=key(x,y);
   if(!clear.has(k))clear.set(k,passable(from.x+x*unit,from.y+y*unit,20));
   return clear.get(k);
  };
  let best=null,closest=Infinity;
  for(let scans=0;open.length&&scans<1250;scans++){
   open.sort((a,b)=>b.f-a.f);
   const cur=open.pop(),ck=key(cur.x,cur.y);
   if(closed.has(ck))continue;
   closed.add(ck);
   const remain=dist(cur.x,cur.y);
   if(remain<closest){closest=remain;best=cur;}
   if(remain<=unit*.6)break;
   for(const [ax,ay] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
    const nx=cur.x+ax,ny=cur.y+ay,nk=key(nx,ny);
    if(Math.abs(nx)>bound||Math.abs(ny)>bound||closed.has(nk)||!walk(nx,ny))continue;
    if(ax&&ay&&(!walk(cur.x+ax,cur.y)||!walk(cur.x,cur.y+ay)))continue;
    const g=cur.g+(ax&&ay?Math.SQRT2:1)*unit;
    if(g>=(cost.get(nk)??Infinity))continue;
    cost.set(nk,g);parent.set(nk,ck);
    open.push({x:nx,y:ny,g,f:g+dist(nx,ny)});
   }
  }
  if(!best||(!best.x&&!best.y))return [];
  const route=[],visited=new Set();let k=key(best.x,best.y);
  while(k!=='0,0'&&!visited.has(k)&&route.length<500){
   visited.add(k);
   const [x,y]=k.split(',').map(Number);
   route.push({x:from.x+x*unit,y:from.y+y*unit});
   k=parent.get(k);if(!k)return [];
  }
  return route.reverse();
 }
 function moveRotom(dt){
  if(current?.phase!=='escort'||!G.Coop?.isHost)return;
  const r=current.rotom,players=ally();if(!players.length)return;
  const leader=players.find(p=>p.uid===escortUid&&!p.lanBot)||players.find(p=>p===G.Game?.player)||players[0];
  const dx=leader.x-r.x,dy=leader.y-r.y,d=Math.hypot(dx,dy);
  if(d<50){escortRoute=[];return;}
  const step=Math.min(d-45,165*Math.max(0,dt));if(step<=0)return;
  while(escortRoute.length&&at(r,escortRoute[0],24))escortRoute.shift();
  const clock=Number(current.elapsed)||0;
  if(escortRoute.length&&lineFree(r,leader)&&d<210)escortRoute=[];
  let goal=escortRoute[0]||leader;
  let angle=Math.atan2(goal.y-r.y,goal.x-r.x);
  let next={x:r.x+Math.cos(angle)*step,y:r.y+Math.sin(angle)*step};
  if(!lineFree(r,next)){
   if(clock>=escortRepathAt||!escortRoute.length){
    escortRoute=escortDetour(r,leader);escortRepathAt=clock+.7;
   }
   goal=escortRoute[0];if(!goal)return;
   angle=Math.atan2(goal.y-r.y,goal.x-r.x);
   next={x:r.x+Math.cos(angle)*step,y:r.y+Math.sin(angle)*step};
  }
  if(lineFree(r,next)){r.x=next.x;r.y=next.y;}
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
   distressNode?.remove();distressNode=null;distressUntil=0;
   talk('Pippi: Máy sáng rồi! Giờ giữ quái tránh xa máy tới phút 8 nha. Đừng để công đào nãy giờ đổ sông!',
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
   // Only this private host-owned completion path may settle.
   if(result.result?.cleared&&rewardGate?.eligible){
    try{
     lastReward=rewardGate.finish(current,G.DB?.save,{uid:G.Social?.uid,host:G.Coop?.isHost===true,
      members:room()?.members,roomId:room()?.id,guest:!!G.DB?.guest},()=>G.DB.commit(true));
    }catch(_){lastReward={ok:false,reason:'save'};}
    if(lastReward.ok){
     G.UI?.refreshCoins?.();
     G.UI?.toast?.(lastReward.firstClear?
      tr('+'+lastReward.reward+' Xu Đồng Đội · Mở khóa máy phục nguyên và Kabuto!','+'+lastReward.reward+' Co-op Coins · Restorer and Kabuto unlocked!'):
      tr('+'+lastReward.reward+' Xu Đồng Đội','+'+lastReward.reward+' Co-op Coins'),4500);
    }else G.UI?.toast?.(tr('Chưa lưu được thưởng Co-op. Không cộng xu.','Co-op reward could not be saved. No coins credited.'),3500);
   }
   finish?.({success:!!result.result?.cleared,reason:result.reason,
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
  if(current.rotom.merged){distressNode?.remove();distressNode=null;distressUntil=0;}
  updateRotomSOS();
 }
 function drawOne(ctx,obj){
  ctx.save();ctx.translate(obj.x,obj.y);ctx.imageSmoothingEnabled=false;
  if(obj.type==='machine'){
   if(machines.complete&&machines.naturalWidth>0){
    // Full 128px ON/OFF frames. Pixel-art footing at +3, with complete Rotom
    // face and lightning ABOVE the machine: no 96px cell-cropping anymore.
    const overlap=ally().some(p=>Math.abs(p.x-obj.x)<70&&p.y>=obj.y-80&&p.y<=obj.y+25);
    if(overlap)ctx.globalAlpha=.58;
    ctx.drawImage(machines,obj.online?128:0,0,128,128,-64,-116,128,128);
    ctx.globalAlpha=1;
   }else{
    ctx.fillStyle='#594e49';ctx.fillRect(-45,-80,90,82);
    ctx.fillStyle=obj.online?'#80e9ef':'#554740';ctx.fillRect(-30,-62,60,38);
   }
   const ratio=Math.max(0,Math.min(1,obj.hp/C.MAX_MACHINE_HP));
   // Machine art occupies y=-75..+5. Leave an 8px clear gap before HP.
   ctx.fillStyle='#1e2630';ctx.fillRect(-35,14,70,8);
   ctx.fillStyle=ratio>.3?'#7fe0a9':'#ef7768';ctx.fillRect(-33,16,66*ratio,4);
  }else if(obj.type==='site'){
   const col=Math.max(0,Math.min(2,obj.id-1)),[sx,sy]=digSprite[col];
   if((col===2?v3:excavations).complete&&(col===2?v3:excavations).naturalWidth>0){
    ctx.globalAlpha=obj.hits>=3?.20:obj.hits>=2?.67:obj.hits>=1?.86:1;
    if(col===2){
     // Approved V3 amber: original 176×144 crop at exact 1/2 size (88×72).
     // Unlike V1, no lost crystal edges and no interpolation or fractional zoom.
     ctx.drawImage(v3,0,0,176,144,-44,-51,88,72);
    }else{
     // Keep the already approved moss / bone site sprites unchanged.
     ctx.drawImage(excavations,sx,sy,ART_CELL,ART_CELL,-48,-61,ART_CELL,ART_CELL);
    }
    ctx.globalAlpha=1;
   }else{
    ctx.fillStyle=obj.hits>=3?'#53483c':obj.hits>=2?'#977860':'#b59c79';
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
   if(current.phase==='escort'&&current.rotom.freed){
    // Freed Rotom is the actual Pokémon #479 (preloaded normal Animator).
    // SOS portrait / beacon belong exclusively to the rescue stage.
    if(rotomAnimator&&typeof rotomAnimator.draw==='function'){
     try{rotomAnimator.draw(ctx,0,-18);ctx.restore();return;}catch(_){}
    }
    // Loading-only fallback, never a reuse of the distress sprite.
    ctx.fillStyle='#fa7840';ctx.beginPath();ctx.arc(0,-22,14,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#b5f7ed';ctx.fillRect(-6,-26,4,5);ctx.fillRect(3,-26,4,5);
   }else if(rotomFallback.complete&&rotomFallback.naturalWidth>0){
    // Approved V3 rescue marker: 144px complete source at 72px on map.
    ctx.drawImage(rotomFallback,320,0,144,144,-36,-66,72,72);
   }else{
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
  // Sort machine at foot point so players standing in front appear in front.
  return visibleObjects().map(obj=>({y:obj.type==='machine'?obj.y+7:obj.y,draw(ctx){
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
  if(!G.Coop?.isHost&&typeof document!=='undefined')actionButton();
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
  // Never settle an externally supplied summary, even for host.
  return false;
 }
 function end(){
  rewardGate?.end();rewardGate=null;
  active=false;restoreMachineCollider();finished=true;current=null;bossEnemy=null;rotomAnimator=null;
  escortRoute=[];escortRepathAt=0;
  uiButton?.remove();uiButton=null;distressNode?.remove();distressNode=null;distressShown=false;
  rendered.clear();botTimes.clear();humanTimes.clear();remoteSeq.clear();escortUid=null;machineTarget=null;speedStage=-1;
 }
 return {nativeReady:ready,begin,tick,perform,remoteAction,botGoal,botInteract,targetFor,onEvent,
  drawables,beginFrame,drawMissing,hud,reward,end,
  get active(){return active},get session(){return current},get lastFinish(){return lastFinish},get rewardEligible(){return !!rewardGate?.eligible},get lastReward(){return lastReward?{...lastReward}:null},
  get machineCollisionActive(){return !!worldCollider&&G.World?.isFree===worldCollider.wrapper;},
  get objectivePositionDiagnostics(){
   if(!current)return [];
   const native=p=>worldCollider?.original?.call(worldCollider.world,p.x,p.y,20);
   return [...current.sites.map((point,i)=>({type:'site'+(i+1),point,
    safe:footprintFree(point,'site'),nativeCenterFree:native(point)})),
    {type:'rotom',point:current.rotom,safe:footprintFree(current.rotom,'rotom'),
     nativeCenterFree:native(current.rotom)},
    {type:'machine',point:current.machine,nativeCenterFree:native(current.machine)},
    {type:'world',biome:G.World?.biome,
     nativePlayerFree:native(G.Game?.player||{x:0,y:0}),
     nativeOriginFree:native({x:0,y:0}),
     nativeFarFree:native({x:4000,y:4000})}];
  },
  get objectivePositionsSafe(){return !!current&&[...current.sites.map(p=>[p,'site']),
   [current.rotom,'rotom']].every(([p,k])=>footprintFree(p,k));},
  get spriteReady(){return excavations.complete&&excavations.naturalWidth>0&&
   machines.complete&&machines.naturalWidth===256&&machines.naturalHeight===128&&
   v3.complete&&v3.naturalWidth===464}};
})();
