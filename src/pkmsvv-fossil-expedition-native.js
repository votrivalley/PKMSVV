/* PKMSVV Fossil Expedition native mission adapter — QA candidate.
 * Requires G.PKMSVVFossilExpeditionCore and a real LAN/AI Co-op session.
 * World objectives are drawn in the same camera coordinates as normal
 * Pokémon and enemy entities. Only the Host resolves objectives/HP.
 * Do NOT ship as a paid, reward-bearing mission until native settlement
 * and guest interaction replication pass end-to-end tests.
 */
G.PKMSVVFossilExpedition=(()=>{
 'use strict';
 const C=G.PKMSVVFossilExpeditionCore,KEY='fossil_lab';
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 let current=null,active=false,cachedThreats=0,scanClock=0,sendClock=0,
  rendered=new Set(),lastAction=-100,lastFinish=null,uiButton=null,finished=false;
 const ready=!!C&&typeof C.begin==='function'&&typeof C.receipt==='function';
 const mine=()=>active&&current?.sites.find(x=>!x.done);
 const room=()=>G.Social?.room;
 function begin({mode}={}){
  active=false;current=null;finished=false;lastFinish=null;scanClock=0;sendClock=0;
  document.getElementById('pkmsvv-fossil-expedition-action')?.remove();
  const requested=mode||room()?.mode;
  if(requested!==KEY)return false;
  const r=room(),members=r?.members;
  if(!ready||r?.mode!==KEY||!Array.isArray(members)||members.length<2||members.length>4){
   G.UI?.toast?.(tr('Nhiệm vụ cần đủ 2–4 thành viên!','Fossil Expedition requires 2–4 party members!'),3500);
   return false;
  }
  const start=C.begin({members,roomId:r.id,hostUid:r.host,origin:{x:0,y:0},startSeconds:0});
  if(!start.ok){G.UI?.toast?.(tr('Không xác thực được nhóm Co-op.','Invalid Co-op party.'),3500);return false;}
  current=start;active=true;lastAction=-100;cachedThreats=0;uiButton=null;
  if(G.Coop?.isHost)G.Spawner?.say?.(tr('🦴 ĐÀO 3 ĐIỂM HÓA THẠCH · 2–4 thành viên','🦴 MINE THREE FOSSIL SITES · 2–4 members'),4);
  return true;
 }
 function nearestInteraction(p=G.Game?.player){
  if(!active||!p||p.dead||!G.Coop?.isHost)return null;
  if(current.collected===3&&current.elapsed>=C.MIN_TIME&&
     Math.hypot(p.x-current.machine.x,p.y-current.machine.y)<=C.EXTRACT_RADIUS)
   return {type:'extract'};
  const site=current.sites.filter(x=>!x.done)
   .map(x=>({site:x,dist:Math.hypot(p.x-x.x,p.y-x.y)}))
   .sort((a,b)=>a.dist-b.dist)[0];
  return site&&site.dist<=C.DIG_RADIUS?{type:'dig',site:site.site}:null;
 }
 function perform(){
  if(!active||G.Game?.state!=='playing'||!G.Coop?.isHost||!current)return {ok:false,reason:'inactive'};
  if(current.clock-lastAction<.55)return {ok:false,reason:'cooldown'};
  const action=nearestInteraction(),p=G.Game.player;if(!action)return {ok:false,reason:'out-of-range'};
  let outcome;
  if(action.type==='dig'){
   outcome=C.dig(current,{uid:G.Social.uid,siteId:action.site.id,
    actor:{x:p.x,y:p.y,dead:p.dead},seconds:current.clock,source:'native-strike'});
   if(outcome.ok){lastAction=current.clock;
    G.FX?.ring?.(action.site.x,action.site.y,28,'#e6c484');
    if(outcome.done)G.Spawner?.say?.(tr('🦴 Đã lấy mẫu '+current.collected+'/3','🦴 Fossils '+current.collected+'/3'),2);
   }
  }else{
   outcome=C.extract(current,{uid:G.Social.uid,actor:{x:p.x,y:p.y,dead:p.dead},
    seconds:current.clock,roomId:current.roomId});
   if(outcome.ok){lastAction=current.clock;lastFinish=outcome.result;}
  }
  return outcome;
 }
 function onKey(e){
  if(e.code!=='KeyE'||e.repeat||e.target?.matches?.('input,textarea,select,[contenteditable]'))return;
  if(!nearestInteraction()||G.Game?.state!=='playing')return;
  e.preventDefault();perform();
 }
 if(typeof document!=='undefined')document.addEventListener('keydown',onKey);
 function actionButton(){
  if(!active||typeof document==='undefined')return;
  if(!uiButton||!uiButton.isConnected){
   uiButton=document.createElement('button');
   uiButton.id='pkmsvv-fossil-expedition-action';
   uiButton.type='button';uiButton.style.cssText='position:fixed;bottom:86px;right:17px;z-index:800;color:#122a35;background:#ffe38c;border:3px solid #9d783b;border-radius:11px;padding:9px 13px;font-weight:bold;display:none';
   uiButton.onclick=()=>perform();document.body.append(uiButton);
  }
  const nearby=nearestInteraction();
  uiButton.style.display=nearby&&G.Game?.state==='playing'?'block':'none';
  uiButton.textContent=nearby?.type==='extract'?tr('🚁 Rút lui','🚁 Extract'):tr('⛏ Khai quật · E','⛏ Excavate · E');
 }
 function tick(dt,time,players,finish){
  if(!active||!current||finished)return;
  actionButton();
  if(!G.Coop?.isHost)return;
  scanClock+=Math.max(0,Number(dt)||0);
  if(scanClock>=.2){
   scanClock=0;cachedThreats=0;
   for(const e of G.EnemyMgr?.all?.()||[]){
    if(e?.dead)continue;
    const dx=(Number(e.x)||0)-current.machine.x,dy=(Number(e.y)||0)-current.machine.y;
    if(dx*dx+dy*dy<150*150)cachedThreats++;
   }
  }
  const result=C.tick(current,{seconds:time,threats:Math.min(cachedThreats,128),
   roomId:current.roomId,liveMembers:room()?.members});
  sendClock+=Math.max(0,Number(dt)||0);
  if(sendClock>=.5){
   sendClock=0;G.Coop?.broadcast?.(['fx',current.collected,
    Math.round(current.machine.hp),Math.round(current.elapsed),
    ...current.sites.map(x=>x.hits)]);
  }
  if(result.finished){finished=true;active=false;uiButton?.remove();
   finish?.({success:false,reason:result.reason,time:current.elapsed,partySize:current.team.length});return;}
  if(lastFinish?.cleared){finished=true;active=false;uiButton?.remove();
   const receipt=C.receipt(current,1);
   finish?.({success:true,receipt,time:current.elapsed,partySize:current.team.length,
    fossils:current.collected,health:current.machine.hp});}
 }
 function onEvent(ev){
  if(!active||G.Coop?.isHost||ev?.[0]!=='fx'||!current||ev.length<7)return;
  current.collected=Math.max(0,Math.min(3,Number(ev[1])||0));
  current.machine.hp=Math.max(0,Math.min(C.MAX_MACHINE_HP,Number(ev[2])||0));
  current.elapsed=Math.max(current.elapsed,Math.min(C.MAX_TIME,Number(ev[3])||0));
  for(let i=0;i<3;i++){const hits=Math.max(0,Math.min(C.ROCK_HITS,Number(ev[i+4])||0));
   current.sites[i].hits=hits;current.sites[i].done=hits===C.ROCK_HITS;}
  current.phase=current.collected<3?'excavate':current.elapsed<C.MIN_TIME?'defend':'extract';
 }
 function drawOne(ctx,obj){
  const isMachine=obj.type==='machine',done=obj.done;
  ctx.save();ctx.translate(obj.x,obj.y);ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#122e38';ctx.fillRect(-33,-7,66,25);
  if(isMachine){
   ctx.fillStyle='#b88b46';ctx.fillRect(-27,-20,54,20);
   ctx.fillStyle='#58bda3';ctx.fillRect(-22,-17,44,14);
   ctx.fillStyle='#a3f2d6';ctx.fillRect(-13,-14,26,7);
   ctx.fillStyle='#d4b27c';ctx.fillRect(-24,0,48,8);
   const ratio=obj.hp/C.MAX_MACHINE_HP;
   ctx.fillStyle='#201e2f';ctx.fillRect(-30,20,60,7);
   ctx.fillStyle=ratio>.3?'#83dbae':'#ee8579';ctx.fillRect(-28,22,56*ratio,3);
  }else{
   ctx.fillStyle=done?'#516b65':'#667c78';ctx.fillRect(-26,-22,52,25);
   ctx.fillStyle=done?'#263f40':'#8eaaa2';ctx.fillRect(-17,-30,31,9);
   ctx.fillStyle=done?'#23373b':'#d5c6a0';ctx.fillRect(-21,-12,42,13);
   ctx.fillStyle='#f2cd80';ctx.font='bold 12px sans-serif';
   ctx.fillText(done?'✓':String(obj.hits)+'/3',-13,-34);
  }
  ctx.restore();
 }
 function drawables(){
  if(!active||!current)return [];
  const objs=[...current.sites.map(x=>({...x,type:'site'})),{...current.machine,type:'machine'}];
  return objs.map(o=>({y:o.y,draw(ctx){rendered.add(o.type==='machine'?'m':o.id);drawOne(ctx,o);}}));
 }
 function beginFrame(){rendered.clear();}
 function drawMissing(ctx){
  if(!active||!current)return;
  for(const obj of [...current.sites.map(x=>({...x,type:'site'})),{...current.machine,type:'machine'}])
   if(!rendered.has(obj.type==='machine'?'m':obj.id))drawOne(ctx,obj);
 }
 function hud(ctx,w,h){
  if(!active||!current)return;
  const left=18,top=Math.max(120,(h-100)/2);
  ctx.save();ctx.font='bold 12px sans-serif';ctx.textBaseline='top';
  ctx.fillStyle='#092838e8';ctx.fillRect(left,top,240,104);
  ctx.fillStyle='#ffe2a5';ctx.fillText(tr('🦴 KHAI QUẬT HÓA THẠCH','🦴 FOSSIL EXPEDITION'),left+7,top+8);
  ctx.fillStyle='#e8fff4';ctx.fillText(tr('Mẫu vật: ','Specimens: ')+current.collected+'/3',left+7,top+29);
  ctx.fillText(tr('Máy phục nguyên: ','Machine HP: ')+Math.round(100*current.machine.hp/C.MAX_MACHINE_HP)+'%',left+7,top+47);
  ctx.fillText(tr('Thời gian: ','Time: ')+Math.floor(current.elapsed/60)+':'+String(Math.floor(current.elapsed%60)).padStart(2,'0')+' / 8:00',left+7,top+65);
  ctx.fillStyle='#ffd58e';ctx.fillText(current.phase==='excavate'?
   tr('Đi đến các tảng đá, nhấn E','Approach rocks and press E'):
   current.phase==='defend'?tr('Bảo vệ máy đến phút 6','Defend until 6:00'):
   tr('Về máy và nhấn E để rút lui','Return to machine and press E'),left+7,top+85);
  ctx.restore();
 }
 function reward(result){
  if(!result?.success)return false;
  // Intentionally no payment in native source until settlement is connected
  // to a validated receipt and checked for duplicate room sessions.
  G.UI?.toast?.(tr('Đã hoàn thành thử thách QA. Phần thưởng chưa bật.','QA mission cleared. Rewards are not enabled yet.'),3500);
  return false;
 }
 function end(){active=false;finished=true;current=null;uiButton?.remove();uiButton=null;}
 return {nativeReady:ready,begin,tick,perform,onEvent,drawables,beginFrame,drawMissing,hud,reward,end,
  get active(){return active},get session(){return current},get lastFinish(){return lastFinish}};
})();
