/* PKMSVV — Pippi: persistent Explore-only story companion.
 * No new Pokemon slot, no cloud key changes, no competitive-mode effects.
 * Sprite/portrait is self-contained until authored PMD / Mega artwork is cleared.
 */
(function(root,factory){
 'use strict';
 const core=factory();
 if(typeof module==='object'&&module.exports)module.exports=core;
 if(root&&root.G&&root.document)core.install(root);
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const RANK_XP=[0,2,5,9,14,20,27,35,44,54];
 const TRAINING_KEYS=Object.freeze(['heal','buff','slow','shield','cousin']);
 const TRAINING_MAX=3;
 // One free training point per Bond level beyond Bond 1; no new currency.
 function trainingPoints(save){
  const p=data(save);
  const used=TRAINING_KEYS.reduce((total,key)=>total+(p.training?.[key]||0),0);
  return Math.max(0,p.bond-1-used);
 }
 function train(save,key,commit){
  if(!save||typeof save!=='object'||!TRAINING_KEYS.includes(key))return {ok:false,reason:'invalid'};
  const p=data(save),gate={heal:1,buff:2,slow:3,shield:7,cousin:4}[key];
  if(p.bond<gate)return {ok:false,reason:'locked'};
  if(p.training[key]>=TRAINING_MAX)return {ok:false,reason:'max'};
  if(trainingPoints(save)<1)return {ok:false,reason:'points'};
  const before={...p.training};
  p.training[key]+=1;
  try{if(typeof commit==='function'&&commit()===false)throw Error('Save refused');}
  catch(e){p.training=before;return {ok:false,reason:'save'};}
  return {ok:true,level:p.training[key],points:trainingPoints(save)};
 }
 function bondProgress(save){
  const p=data(save),from=RANK_XP[p.bond-1]||0;
  return {bond:p.bond,xp:p.xp,from,to:p.bond<10?RANK_XP[p.bond]:null,points:trainingPoints(save)};
 }
 const LINES={
  intro:[['smile','Pippi đây! Đi cùng tui cho đỡ cô đơn nha!'],['proud','Tân thủ cứ theo tui, đừng hoảng!']],
  heal:[['love','Bơm máu nè, đừng nằm vội!'],['wink','Còn sống là còn quậy nha!']],
  buff:[['proud','Pippi buff rồi, đánh cho đáng nha!'],['happy','Mạnh lên nào, cả nhà ơi!']],
  slow:[['angry','Đứng im, đừng dí bạn tui!'],['wink','Chậm lại coi mấy cha!']],
  shield:[['panic','Ê máu đỏ rồi! Né sau lưng tui!']],
  revive:[['mega','KHÔNG! Bạn tui chưa được nằm!'],['mega','Moon Miracle! Tỉnh lại coiii!']],
  sleep:[['sleep','Hết pin... Pippi ngủ tí... zzz...']],
  boss:[['panic','Boss tới kìa! Tui lo hậu cần!']],
  bond:[['sparkle','Tình bạn lên cấp! Pippi xịn hơn rồi nè!']],
  cousin:[['shock','EM HỌ ƠI! CỨU PIPPI VỚI!'],['wink','Ê Pikachu, mấy cha này bắt nạt bạn tui nè!']],
  evolve:[['sparkle','Hóa Clefable hai giây… Đừng có đếm nhanh!']],
  tutorial:[['thinking','Hạ Boss phút 15 mở vùng mới; phút 30 mới hết trận nha!']]
 };
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number.isFinite(+n)?+n:min));
 const rank=xp=>{let lv=1;for(let i=1;i<RANK_XP.length;i++)if(xp>=RANK_XP[i])lv=i+1;return lv;};
 function data(save){
  if(!save||typeof save!=='object')return {xp:0,bond:1,seen:{}};
  const value=save.pkmsvvPippi;
  if(!value||Array.isArray(value)||typeof value!=='object')save.pkmsvvPippi={xp:0,bond:1,seen:{}};
  const p=save.pkmsvvPippi;
  p.xp=clamp(Math.floor(+p.xp||0),0,100000);
  p.bond=rank(p.xp);
  if(!p.seen||Array.isArray(p.seen)||typeof p.seen!=='object')p.seen={};
  if(!p.training||Array.isArray(p.training)||typeof p.training!=='object')p.training={};
  for(const key of TRAINING_KEYS)p.training[key]=clamp(Math.floor(Number(p.training[key])||0),0,TRAINING_MAX);
  return p;
 }
 function refund(save){
  if(!save||typeof save!=='object')return 0;
  const state=data(save);
  if(state.refundReviveV1===true)return 0;
  const levels=save.globalUpgrades;
  const ledger=save.globalSpent;
  const owned=!!(levels&&+levels.revive>0);
  const spent=clamp(Math.floor(Number(ledger?.revive)||0),0,50000);
  // The historical unique one-time upgrade cost is 50,000. A pre-ledger
  // save has no ledger entry but must receive the same full refund.
  const amount=owned?(spent||50000):0;
  if(amount){
   save.coins=Math.min(Number.MAX_SAFE_INTEGER,Math.max(0,Number(save.coins)||0)+amount);
  }
  if(levels&&Object.prototype.hasOwnProperty.call(levels,'revive'))delete levels.revive;
  if(ledger&&Object.prototype.hasOwnProperty.call(ledger,'revive'))delete ledger.revive;
  state.refundReviveV1=true;
  state.refundedCoins=amount;
  return amount;
 }
 function earn(save,amount){
  const p=data(save),old=p.bond;
  p.xp=clamp(p.xp+Math.max(0,Math.floor(Number(amount)||0)),0,100000);
  p.bond=rank(p.xp);
  return {level:p.bond,leveled:p.bond>old,xp:p.xp};
 }
 function eligible(G){
  const room=String(G?.Social?.room?.mode||'').toLowerCase();
  return G?.Game?.state==='playing'&&!!G.Game.player&&!G.Game.player.dead&&
   G.PKMSVVQuickRegion?.active===true&&!G.Coop?.active&&!G.Royale?.active&&
   !G.EggRush?.active&&!G.PKMSVVArenaSolo?.active&&
   !G.PKMSVVChampionArena?.active&&!G.PKMSVVArenaPvp?.active&&
   !['arena','pvp','royale','eggrush','coop','survival'].includes(room);
 }
 function newRun(pl,now=0){return {player:pl,now,healAt:8,buffAt:12,slowAt:15,guardAt:0,
  sleepUntil:0,megaUntil:0,reviveAt:0,sleepTalked:false,revived:false,lastTalk:-100,marks:new Set(),lastPos:null,direction:0,
  activeBuff:null,slowed:[],motion:null,emoteUntil:0,cousinUntil:0,cousinTargets:0,damageHook:null,evolveUntil:0,megaSpoken:false};}
 function heal(pl,lv,training=0){
  if(!pl||!Number.isFinite(pl.maxHp)||pl.maxHp<=0||pl.hp/pl.maxHp>.65)return false;
  const gain=pl.maxHp*(.12+lv*.011+clamp(training,0,TRAINING_MAX)*.02);
  pl.hp=Math.min(pl.maxHp,Math.max(0,pl.hp)+gain);
  return true;
 }
 function buff(pl,run,now,lv,training=0){
  if(!pl||run.activeBuff||!Number.isFinite(+pl.atkMul)||pl.atkMul<=0)return false;
  const factor=1.08+Math.min(.09,lv*.01)+clamp(training,0,TRAINING_MAX)*.015;
  pl.atkMul*=factor;
  run.activeBuff={player:pl,factor,until:now+8};
  return true;
 }
 function slow(G,run,now,lv,training=0){
  const pl=run.player,raw=G.EnemyMgr?.all?.();
  const tag=Object.prototype.toString.call(raw);
  const arr=Array.isArray(raw)?raw:
   tag==='[object Map]'||tag==='[object Set]'?Array.from(raw.values()):
   raw&&typeof raw[Symbol.iterator]==='function'?Array.from(raw):[];
  if(!arr.length||!pl)return false;
  let affected=0;
  for(const e of arr){
   if(!e||e.dead||!Number.isFinite(+e.x)||!Number.isFinite(+e.y)||
      !Number.isFinite(+e.spd)||e.spd<=0)continue;
   const dx=e.x-pl.x,dy=e.y-pl.y;
   if(dx*dx+dy*dy>190*190)continue;
   if(run.slowed.some(s=>s.enemy===e))continue;
   const tier=clamp(training,0,TRAINING_MAX);
   const factor=e.pkmsvvExploreBoss?.72-tier*.01:.65-tier*.04; // Boss slow is weaker.
   e.spd*=factor;
   run.slowed.push({enemy:e,factor,until:now+Math.min(5,2+lv*.17+tier*.35)});
   if(++affected>=6)break;
  }
  return affected>0;
 }
 function endEffects(run,now){
  if(run.activeBuff&&now>=run.activeBuff.until){
   const {player,factor}=run.activeBuff;
   if(Number.isFinite(player.atkMul))player.atkMul/=factor;
   run.activeBuff=null;
  }
  for(let i=run.slowed.length-1;i>=0;i--){
   const item=run.slowed[i];
   if(now<item.until&&item.enemy&&!item.enemy.dead)continue;
   if(Number.isFinite(item.enemy?.spd)&&item.factor>0)item.enemy.spd/=item.factor;
   run.slowed.splice(i,1);
  }
 }
 // Revert buffs whenever player exits Explore or a new player is spawned.
 function finish(run){if(run){endEffects(run,Infinity);uninstallDamageHook(run);}}
 function tryRevive(G,run,pl,now){
  if(!eligible(G)||!run||run.player!==pl||run.revived||
     !pl||pl.dead||!(Number(pl.hp)<=0)||typeof pl.revive!=='function')return false;
  if(data(G.DB?.save).bond<10)return false;
  run.revived=true;
  run.reviveAt=now;run.evolveUntil=now+2;run.megaUntil=now+3.6;
  pl.extraRevives=0;
  pl.revive(.4);
  pl.invuln=Math.max(Number(pl.invuln)||0,3);
  run.sleepUntil=now+75;
  return true;
 }
 // Cousin Pikachu is rolled after each CONFIRMED HP-reducing hit in Explore.
 // L1=3%, L2=4.5%, L3=6%, locked=0%; never roll each animation frame.
 const COUSIN_CHANCES=Object.freeze([0,.03,.045,.06]);
 const cousinChance=level=>COUSIN_CHANCES[clamp(Math.floor(level||0),0,3)];
 function cousinLightning(G,pl,now){
  const raw=G.EnemyMgr?.all?.();
  const enemies=Array.isArray(raw)?raw:raw&&typeof raw[Symbol.iterator]==='function'?
   Array.from(raw instanceof Map?raw.values():raw):[];
  const nearby=enemies.filter(e=>e&&!e.dead&&!e.remote&&
   typeof e.applyStun==='function'&&Number.isFinite(+e.x)&&Number.isFinite(+e.y)&&
   (e.x-pl.x)**2+(e.y-pl.y)**2<=240*240&&
   now>=(Number(e.pkmsvvPippiCousinImmuneUntil)||0));
  nearby.sort((a,b)=>((a.x-pl.x)**2+(a.y-pl.y)**2)-
                     ((b.x-pl.x)**2+(b.y-pl.y)**2));
  const center=nearby[0]||null;
  const hit=[];
  if(center){
   for(const e of nearby){
    if((e.x-center.x)**2+(e.y-center.y)**2>95*95)continue;
    e.applyStun((e.boss||e.judge||e.pkmsvvBossGuard)?0.35:1.1);
    e.pkmsvvPippiCousinImmuneUntil=now+7;
    hit.push(e);
    G.FX?.burst?.(e.x,e.y-9,'#ffda50',5,60);
    G.FX?.dmgText?.(e.x,e.y-24,'TÊ LIỆT!','#ffdf60');
    if(hit.length===4)break;
   }
   G.FX?.ring?.(center.x,center.y,8,95,'#ffd34a',.55,3);
  }
  G.FX?.ring?.(pl.x+30,pl.y-12,5,40,'#ffe078',.36,2);
  return {affected:hit.length,center:center?{x:center.x,y:center.y}:null};
 }
 function rollCousinOnHit(G,run,pl,beforeHp,afterHp,random=Math.random){
  if(!run||!pl||pl!==run.player||!(beforeHp>afterHp)||!eligible(G)||
     (Number(G.Game?.st?.time??G.Game?.time)||run.now)<run.sleepUntil)
   return {triggered:false,reason:'not-real-hit'};
  const now=Math.max(run.now,Number(G.Game?.st?.time??G.Game?.time)||run.now);
  const level=data(G.DB?.save).training.cousin;
  const chance=cousinChance(level);
  if(!chance)return {triggered:false,reason:'not-learned',chance};
  if(!(Number(random())<chance))return {triggered:false,reason:'roll',chance};
  const lightning=cousinLightning(G,pl,now);
  run.now=now;run.cousinUntil=now+1.9;
  run.cousinTargets=lightning.affected;
  return {triggered:true,chance,...lightning};
 }
 function installDamageHook(run,pl,callback){
  if(!run||!pl||typeof pl.hurt!=='function')return false;
  if(run.damageHook?.player===pl)return true;
  const hadOwn=Object.prototype.hasOwnProperty.call(pl,'hurt'),original=pl.hurt;
  const wrapper=function(...args){
   const before=Number(this.hp);
   const result=original.apply(this,args);
   const after=Number(this.hp);
   if(Number.isFinite(before)&&Number.isFinite(after)&&after<before){
    try{callback(before,after,this);}catch(_){/* preserve native damage */}
   }
   return result;
  };
  pl.hurt=wrapper;
  run.damageHook={player:pl,hadOwn,original,wrapper};
  return true;
 }
 function uninstallDamageHook(run){
  const h=run?.damageHook;
  if(h&&h.player?.hurt===h.wrapper){
   if(h.hadOwn)h.player.hurt=h.original;else delete h.player.hurt;
  }
  if(run)run.damageHook=null;
 }
 // Eight-direction autonomous follower in world units. Follow the player's
 // recorded movement trail instead of sticking to a viewport offset.
 // Sampling actual player displacement inherently respects water/terrain
 // slowdowns and speed multipliers (including x1.5).
 const FOLLOW_DISTANCE=72;
 const SAFE_DISTANCE=56;
 function followTarget(history,offset=FOLLOW_DISTANCE){
  if(!history?.length)return null;
  let remain=offset;
  for(let i=history.length-1;i>0;i--){
   const newer=history[i],older=history[i-1];
   const dx=newer.x-older.x,dy=newer.y-older.y;
   const segment=Math.hypot(dx,dy);
   if(segment<.001)continue;
   if(segment>=remain){
    const share=remain/segment;
    return {x:newer.x-dx*share,y:newer.y-dy*share};
   }
   remain-=segment;
  }
  return {x:history[0].x,y:history[0].y};
 }
 // PMD follower moves in its OWN world coordinates, following a point 72
 // world pixels behind the player ALONG THE PLAYER'S TRAVELLED PATH. It never
 // targets pl.x/pl.y directly; that was the cause of the two sprites merging.
 function advanceFollower(run,pl,now,requestedGap=FOLLOW_DISTANCE){
  if(!run||!pl||!Number.isFinite(+pl.x)||!Number.isFinite(+pl.y))return null;
  const followGap=clamp(requestedGap,FOLLOW_DISTANCE,260);
  const minimumGap=Math.max(SAFE_DISTANCE,followGap*.82);
  const init={x:pl.x-followGap,y:pl.y+18};
  const state=run.motion||(run.motion={
   x:init.x,y:init.y,px:pl.x,py:pl.y,last:now,
   speed:0,moving:false,
   history:[{...init},{x:pl.x,y:pl.y}],direction:0
  });
  const dt=clamp(now-state.last,0,.4);
  state.last=now;
  const dx=pl.x-state.px,dy=pl.y-state.py,travel=Math.hypot(dx,dy);
  const gap=Math.hypot(pl.x-state.x,pl.y-state.y);
  // A portal/map warp is the ONLY normal reason to instantly relocate Pippi.
  // Never teleport just because the player is running or swimming.
  if(travel>450||gap>650){
   const ux=travel>0?dx/travel:1,uy=travel>0?dy/travel:0;
   state.x=pl.x-ux*followGap;
   state.y=pl.y-uy*followGap;
   state.history=[{x:state.x,y:state.y},{x:pl.x,y:pl.y}];
   state.speed=0;state.moving=false;
   state.px=pl.x;state.py=pl.y;
   return state;
  }
  if(travel>1.5){
   state.history.push({x:pl.x,y:pl.y});
   if(state.history.length>180)state.history.splice(0,state.history.length-180);
  }
  // 4 Hz updates use actual movement distance, so player speed modifiers,
  // x1.5, water and terrain naturally propagate to Pippi's travel speed.
  if(dt>.01&&travel>.4){
   const observed=Math.min(850,travel/dt);
   state.speed=state.speed>0?state.speed*.45+observed*.55:observed;
  }
  state.px=pl.x;state.py=pl.y;
  const target=followTarget(state.history,followGap);
  const vx=target.x-state.x,vy=target.y-state.y;
  const distance=Math.hypot(vx,vy);
  const pace=state.speed*(gap>180?1.15:1); // rare bounded catch-up
  const step=Math.min(distance,Math.max(0,pace*dt));
  state.moving=distance>2&&step>.15;
  if(state.moving){
   const mx=vx/distance*step,my=vy/distance*step;
   state.x+=mx;state.y+=my;
   state.direction=(Math.round(Math.atan2(my,mx)/(Math.PI/4))+8)%8;
  }
  // Tight turns may cross the player's path. Never let Pippi enter the
  // player's footprint: no merged or overlapping sprites while standing.
  const apartX=state.x-pl.x,apartY=state.y-pl.y;
  const apart=Math.hypot(apartX,apartY);
  if(apart<minimumGap){
   const ux=apart>1?apartX/apart:-1,uy=apart>1?apartY/apart:0;
   state.x=pl.x+ux*minimumGap;
   state.y=pl.y+uy*minimumGap;
  }
  return state;
 }
 // Pixel-art white speech-bubble emotes inspired by Ragnarok's emotion
 // vocabulary, but drawn independently: no extracted RO sticker assets.
 const EMOTES={
  intro:'heart',heal:'heart',buff:'sparkle',slow:'angry',cousin:'sparkle',evolve:'sparkle',
  shield:'alarm',revive:'heart',sleep:'sleep',boss:'alarm',
  bond:'sparkle',tutorial:'question'
 };
 function emoteSVG(type){
  const fill='#fff9ef',ink='#574453',pink='#f26893';
  const shell="<path d='M9 2h22v3h5v5h3v20h-5v4H21l-7 7v-7H9v-3H5V9h4z' fill='"+fill+"' stroke='"+ink+"' stroke-width='2' stroke-linejoin='miter'/>";
  const p={
   heart:"<path d='M15 13h5v3h4v-3h6v4h3v6l-10 9-11-9v-6h3z' fill='"+pink+"' stroke='#a63861' stroke-width='2'/>",
   angry:"<path d='M12 13l9 7-7 2m20-9-9 7 7 2' fill='none' stroke='#bd4559' stroke-width='3'/><path d='M17 29l6-4 6 4' fill='none' stroke='#a34156' stroke-width='2'/>",
   alarm:"<path d='M18 11h9v14h-9zM18 28h9v5h-9z' fill='#ed5e80'/>",
   question:"<path d='M16 13h12v3h3v8h-7v4h-5v-8h7v-4H16zM19 30h5v4h-5z' fill='#7d69b5'/>",
   sleep:"<path d='M14 15h15v4L21 27h8v4H14v-4l8-8h-8z' fill='#8c77ba'/>",
   sparkle:"<path d='M23 10l4 10 10 4-10 3-4 9-4-9-10-3 10-4z' fill='#ffc961' stroke='#b68548' stroke-width='2'/>"
  };
  return "<svg viewBox='0 0 44 44' xmlns='http://www.w3.org/2000/svg' shape-rendering='crispEdges' aria-hidden='true'>"+shell+(p[type]||p.heart)+"</svg>";
 }
 // Tiny 16-bit-style placeholder portrait; replaced by cleared original
 // sprite atlas without changing the skill/chat/save contracts.
 const PORTRAIT_FILES=Object.freeze({
  smile:'Normal',proud:'Determined',love:'Joyous',wink:'Happy',
  happy:'Happy',angry:'Angry',panic:'Surprised',sleep:'Sigh',
  mega:'Inspired',sparkle:'Inspired',thinking:'Worried',
  dizzy:'Dizzy',cry:'Crying',sad:'Sad',help:'Shouting',
  danger:'Pain',shock:'Stunned',teary:'Teary-Eyed'
 });
 function faceSVG(face='smile',mega=false){
  const eyes=face==='sleep'?"<path d='M18 29h7m12 0h7' stroke='#633c53' stroke-width='3'/>":
   face==='panic'?"<circle cx='22' cy='29' r='4'/><circle cx='40' cy='29' r='4'/>":
   face==='angry'?"<path d='m18 25 8 6m18-6-8 6' stroke='#633c53' stroke-width='3'/>":
   "<circle cx='22' cy='29' r='3'/><circle cx='40' cy='29' r='3'/>";
  const mouth=face==='panic'?"<ellipse cx='31' cy='40' rx='4' ry='6' fill='#a24a6f'/>":
    face==='sleep'?"<path d='M27 39h8' stroke='#9d5971' stroke-width='2'/>":
    face==='angry'?"<path d='M28 42l3-3 4 3' stroke='#9d5971' stroke-width='2' fill='none'/>":
    "<path d='M25 39q6 7 12 0' fill='none' stroke='#9d5971' stroke-width='3'/>";
  return "<svg viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg' shape-rendering='crispEdges' aria-hidden='true'>"+
   (mega?"<path d='M8 26 1 9 24 22M56 26 63 9 40 22' fill='#eea4d4' stroke='#a85d9b' stroke-width='2'/>":'')+
   "<path d='m12 25-6-20 18 10 8-4 8 4L57 5l-5 20' fill='#f39ac1' stroke='#8e5e80' stroke-width='3'/>"+
   "<ellipse cx='32' cy='35' rx='23' ry='23' fill='#f7add0' stroke='#885778' stroke-width='3'/>"+
   "<path d='m25 12 4-7 7 7 5 1' fill='none' stroke='#945577' stroke-width='3'/>"+
   "<ellipse cx='17' cy='37' rx='5' ry='3' fill='#ea7c9f'/><ellipse cx='46' cy='37' rx='5' ry='3' fill='#ea7c9f'/>"+
   "<g fill='#613c54'>"+eyes+"</g>"+mouth+
   (mega?"<path d='m27 0 5 6 5-6' fill='#fff7a8'/>":'')+"</svg>";
 }
 function install(w){
  const G=w.G,d=w.document;
  if(G.PKMSVVPippi?.installed)return G.PKMSVVPippi;
  let run=null,ui=null,lastSave=null,follower=null;
  // A failed save must NEVER be retried every 250ms in active combat.
  // Older profiles/guest sessions can reject commit until storage is ready.
  const failedMigrationRetryAt=new WeakMap();

  const language=()=>G.I18n?.lang==='en';
  const copy=(vi,en)=>language()?en:vi;
  function getUI(){
   if(ui?.isConnected)return ui;
   if(!d.body)return null;
   const el=d.createElement('aside');
   el.id='pkmsvv-pippi';el.setAttribute('aria-live','off');el.hidden=true;
   el.innerHTML='<span class="pippi-portrait"><span class="pippi-chat-emote" aria-hidden="true"></span></span><span class="pippi-message"><b>Pippi</b><span class="pippi-line"></span><small class="pippi-bond"></small></span>';
   d.body.appendChild(el);
   ui=el;return el;
  }
  function follow(pl){
   // CI-only A/B switch. Do not render companion DOM when explicitly disabled;
   // the native combat and Pippi skills still run, isolating UI layout pressure.
   if(w.__pkmsvvPippiRenderDisabled===true)return;
   if(!d.body)return;
   if(!follower?.isConnected){
    follower=d.createElement('div');
    follower.id='pkmsvv-pippi-follower';
    follower.setAttribute('aria-label','Pippi — bạn đồng hành');
    follower.innerHTML=faceSVG('smile',false)+'<span class="pippi-pmd-sprite"></span>'+
     '<span class="pippi-clefable-sprite"></span><span class="pippi-world-emote"></span>'+
     '<span class="pippi-cousin" hidden></span>';
    // Do NOT create two extra live Pokémon sprite canvases at Explore start.
    // Animated UI sprite loops may outlive their elements across repeated
    // runs, exhausting Web/Android renderers. PMD Pippi remains independent.
    d.body.appendChild(follower);
    const probe=d.createElement('img');
    probe.onload=()=>follower?.classList.add('has-pmd');
    probe.onerror=()=>follower?.classList.remove('has-pmd');
    probe.src='images/pippi/Walk-Anim.png';
   }
   follower.hidden=false;
   const canvas=d.getElementById('game'),rect=canvas?.getBoundingClientRect?.();
   if(!rect||!rect.width||!rect.height)return;
   const zoomX=rect.width/(Number(canvas.width)||rect.width);
   const zoomY=rect.height/(Number(canvas.height)||rect.height);
   // Android WebView frequently has a high-DPI backing canvas; 72 world
   // units could render as only 25 CSS pixels and visually overlap Celebi.
   // Keep at least 62 CSS pixels behind the player at any display density.
   const visualScale=Math.max(.24,Math.min(zoomX,zoomY));
   const desiredGap=Math.max(FOLLOW_DISTANCE,62/visualScale);
   const state=advanceFollower(run,pl,run.now,desiredGap);if(!state)return;
   const camX=Number(G.Camera?.x),camY=Number(G.Camera?.y);
   let x,y;
   if(Number.isFinite(camX)&&Number.isFinite(camY)){
    x=rect.left+rect.width*.5+(state.x-camX)*zoomX;
    y=rect.top+rect.height*.5+(state.y-camY)*zoomY;
   }else{
    // Fallback for camera implementations with no exported centre.
    x=rect.left+rect.width*.5+(state.x-pl.x)*zoomX;
    y=rect.top+rect.height*.5+(state.y-pl.y)*zoomY;
   }
   follower.style.left=Math.round(x)+'px';
   follower.style.top=Math.round(y)+'px';
   run.direction=state.direction;
   follower.classList.toggle('moving',state.moving);
   const cousin=follower.querySelector('.pippi-cousin');
   if(cousin){
    cousin.hidden=run.now>=run.cousinUntil;
    // Spawn the real game Pikachu sprite ONLY when the learned proc fires.
    // Still/static sprite: never start an extra perpetual RAF loop.
    if(!cousin.hidden&&!cousin.firstElementChild){
     try{
      const art=G.UI?.spriteCanvas?.(25,48,48,{lively:false,scale:1.1,hero:false});
      if(art?.nodeType)cousin.append(art);
     }catch(_){/* optional art, lightning effect stays functional */}
    }
   }
   const emote=follower.querySelector('.pippi-world-emote');
   if(emote)emote.hidden=run.now>=run.emoteUntil;
   follower.dataset.direction=String(run.direction);
   const evolving=run.revived&&run.now<run.evolveUntil;
   const mega=run.revived&&run.now>=run.evolveUntil&&run.now<run.megaUntil;
   const asleep=run.revived&&run.now>=run.megaUntil&&run.now<run.sleepUntil;
   follower.classList.toggle('evolving',evolving);
   follower.classList.toggle('sleeping',asleep);
   follower.classList.toggle('mega',mega);
   if(evolving||mega){
    const artBox=follower.querySelector('.pippi-clefable-sprite');
    if(artBox&&!artBox.firstElementChild){
     try{
      const art=G.UI?.spriteCanvas?.(36,48,48,{lively:false,scale:1.2,hero:false});
      if(art?.nodeType)artBox.append(art);
     }catch(_){/* local Pippi portrait remains the fallback */}
    }
   }
   if(follower.classList.contains('has-pmd')){
    const moving=!!state.moving;
    const file=asleep?'Sleep-Anim.png':moving?'Walk-Anim.png':'Idle-Anim.png';
    const width=asleep?24:moving?24:32,height=asleep?24:40,cols=asleep?2:moving?8:6;
    const frame=Math.floor(run.now*(asleep?1.2:moving?6:3))%cols;
    // PMD rows: S, SW, W, NW, N, NE, E, SE.
    const row=(run.direction+6)%8;
    const part=follower.querySelector('.pippi-pmd-sprite');
    part.style.width=width+'px';part.style.height=height+'px';
    part.style.backgroundImage="url('images/pippi/"+file+"')";
    part.style.backgroundPosition=(-width*frame)+'px '+(-height*row)+'px';
   }
  }
  // Combat may fire a skill proc while the native canvas engine is inside
  // its RAF. Never parse portrait SVG / replace image nodes synchronously in
  // that same combat frame. Coalesce repeated speech into one deferred update,
  // and reuse one portrait image instead of decoding a new <img> on each event.
  let speechPending=null,speechTimer=null;
  function renderSpeech(job){
   if(!job||job.origin!==run||!eligible(G))return;
   const {event,force,now}=job;
   const worldEmote=follower?.querySelector('.pippi-world-emote');
   if(worldEmote){
    if(worldEmote.dataset.emoteEvent!==event){
     worldEmote.innerHTML=emoteSVG(EMOTES[event]||'heart');
     worldEmote.dataset.emoteEvent=event;
    }
    worldEmote.hidden=false;
   }
   const lines=LINES[event]||LINES.intro;
   const [face,message]=lines[Math.floor(Math.random()*lines.length)];
   const el=getUI();if(!el)return;
   const portrait=el.querySelector('.pippi-portrait');if(!portrait)return;
   const chatEmote=portrait.querySelector('.pippi-chat-emote');
   if(chatEmote&&chatEmote.dataset.emoteEvent!==event){
    chatEmote.innerHTML=emoteSVG(EMOTES[event]||'heart');
    chatEmote.dataset.emoteEvent=event;
   }
   const filename=PORTRAIT_FILES[face]||'Normal';
   let img=portrait.querySelector('img');
   if(!img){
    img=d.createElement('img');
    img.className='pippi-portrait-picture';
    portrait.prepend(img);
   }
   img.alt='Pippi: '+filename;
   portrait.dataset.expression=face;
   img.onerror=()=>{
    if(!img.dataset.retry&&img.dataset.faceFile!=='Normal'){
     img.dataset.retry='1';
     img.src='images/pippi/portrait/Normal.png';
     return;
    }
    if(portrait.contains(img)){
     portrait.innerHTML=faceSVG(portrait.dataset.expression||'smile',
      portrait.classList.contains('mega'));
     if(chatEmote)portrait.append(chatEmote);
    }
   };
   if(img.dataset.faceFile!==filename){
    img.dataset.faceFile=filename;
    delete img.dataset.retry;
    img.src='images/pippi/portrait/'+filename+'.png';
   }
   portrait.dataset.emotion=face;
   el.dataset.event=event;
   portrait.classList.toggle('mega',face==='mega');
   el.querySelector('.pippi-line').textContent=message;
   el.querySelector('.pippi-bond').textContent='Bond '+data(G.DB?.save).bond+'/10';
   el.hidden=false;
   el.dataset.until=String(now+(force?5:3.6));
  }
  function say(event,force=false){
   if(!run||w.__pkmsvvPippiSpeechDisabled===true)return;
   const now=run.now;
   if(!force&&now-run.lastTalk<8)return;
   run.lastTalk=now;
   run.emoteUntil=now+(force?3.8:2.6);
   speechPending={event,force,now,origin:run};
   if(speechTimer!==null)return;
   if(typeof w.setTimeout==='function'){
    speechTimer=w.setTimeout(()=>{
     speechTimer=null;
     const job=speechPending;speechPending=null;
     try{renderSpeech(job)}catch(err){w.console?.warn?.('[Pippi] speech guarded',err);}
    },0);
   }else{
    const job=speechPending;speechPending=null;
    renderSpeech(job);
   }
  }
  function migrate(){
   const save=G.DB?.save;
   if(!save||typeof save!=='object'||save===lastSave&&data(save).refundReviveV1)return 0;
   const nextRetry=failedMigrationRetryAt.get(save)||0;
   if(Date.now()<nextRetry)return 0;
   lastSave=save;
   if(data(save).refundReviveV1)return 0;
   const snapshot=JSON.stringify({coins:save.coins,globalUpgrades:save.globalUpgrades,
     globalSpent:save.globalSpent,pkmsvvPippi:save.pkmsvvPippi});
   const amount=refund(save);
   try{
    if(typeof G.DB?.commit==='function'&&G.DB.commit(true)===false)
     throw new Error('Unable to persist Pippi save migration');
   }catch(err){
    const prior=JSON.parse(snapshot);
    for(const key of Object.keys(prior)){
     if(prior[key]===undefined)delete save[key];else save[key]=prior[key];
    }
    lastSave=null;
    // Defer retry for one minute (per save object) instead of committing
    // 4 times/second. Original upgrades/coins are rolled back above.
    failedMigrationRetryAt.set(save,Date.now()+60000);
    w.console?.warn?.('[Pippi] Refusing uncommitted refund; retry deferred',err);
    return 0;
   }
   if(amount)G.UI?.toast?.(copy('Pippi trả lại '+amount.toLocaleString('vi-VN')+' PokéCoins hồi sinh cũ!',
        'Pippi refunded '+amount.toLocaleString('en-US')+' PokéCoins!'),4500);
   return amount;
  }
  function tick(){
   try{
    if(G.DB?.save&&!w.__pkmsvvPippiMigrationDisabled)migrate();
    const pl=G.Game?.player;
    if(!eligible(G)){
     if(run){finish(run);run=null;}
     if(ui)ui.hidden=true;
     if(follower)follower.hidden=true;
     return;
    }
    const now=Math.max(0,Number(G.Game?.st?.time??G.Game?.time)||0);
    if(!run||run.player!==pl||now+1<run.now){
     finish(run);run=newRun(pl,now);say('intro',true);say('tutorial');
    }
    run.now=now;
    installDamageHook(run,pl,(before,after,hitPlayer)=>{
     const outcome=rollCousinOnHit(G,run,hitPlayer,before,after);
     if(outcome.triggered)say('cousin',true);
    });
    follow(pl);
    endEffects(run,now);
    if(ui&&!ui.hidden&&now>=Number(ui.dataset.until))ui.hidden=true;
    const p=data(G.DB?.save),lv=p.bond,training=p.training;
    const isSleeping=now<run.sleepUntil;
    if(run.revived&&!run.megaSpoken&&now>=run.evolveUntil){
     run.megaSpoken=true;say('revive',true);
    }
    if(isSleeping){
     if(!run.megaSpoken&&now>=run.evolveUntil&&now<run.megaUntil){
      run.megaSpoken=true;say('revive',true);
     }
     if(!run.sleepTalked&&now>=run.megaUntil&&run.revived){
      run.sleepTalked=true;say('sleep',true);
     }
     return;
    }
    if(now>=35&&!run.marks.has(35)){run.marks.add(35);say('tutorial');}
    for(const marker of [120,300,900,1800]){
     if(now>=marker&&!run.marks.has(marker)){
      run.marks.add(marker);
      const result=earn(G.DB.save,marker===900||marker===1800?2:1);
      G.DB?.commit?.(true);
      if(result.leveled)say('bond',true);
      if(marker===900)say('boss');
     }
    }
    if(now>=run.healAt){run.healAt=now+Math.max(23,31-lv*.6);
     if(heal(pl,lv,training.heal))say('heal');}
    if(lv>=2&&now>=run.buffAt){run.buffAt=now+40;
     if(buff(pl,run,now,lv,training.buff))say('buff');}
    if(lv>=3&&now>=run.slowAt){run.slowAt=now+27;
     if(slow(G,run,now,lv,training.slow))say('slow');}
    if(lv>=7&&now>=run.guardAt&&pl.hp>0&&pl.hp/pl.maxHp<.22){
     run.guardAt=now+90;pl.invuln=Math.max(Number(pl.invuln)||0,1.8+training.shield*.35);
     say('shield',true);
    }
   }catch(err){w.console?.warn?.('[Pippi] frame guarded',err);}
  }
  function revive(pl){
   if(!run||!eligible(G))return false;
   const now=Math.max(0,Number(G.Game?.st?.time??G.Game?.time)||0);
   if(!tryRevive(G,run,pl,now))return false;
   run.now=now;say('evolve',true);
   return true;
  }
  // Original 50k global revive is retired everywhere. The new revive fires
  // ONLY from native Player.hurt's pre-death GlobalPower.tryRevive hook.
  const gp=G.GlobalPower;
  if(gp){
   const oldCombine=gp.combine;
   if(typeof oldCombine==='function')gp.combine=function(...args){
    const perks=oldCombine.apply(this,args);if(perks)perks.revives=0;return perks;
   };
   gp.tryRevive=pl=>revive(pl);
   if(Array.isArray(gp.LIST)){
    const item=gp.LIST.find(p=>p.id==='revive');
    if(item)item.retired=true;
   }
   if(gp.BY?.revive)gp.BY.revive.retired=true;
   const purchase=gp.purchase;
   if(typeof purchase==='function')gp.purchase=function(save,id){
    if(id==='revive')return false;
    return purchase.call(this,save,id);
   };
  }
  const api={installed:true,refund,migrate,data,rank,earn,train,trainingPoints,bondProgress,cousinChance,eligible:()=>eligible(G),
   tryRevive:revive,tick,show:say,get run(){return run;}};
  G.PKMSVVPippi=api;
  // The RAF loop never mutates other modes; work only at a throttled 4Hz.
  let last=0;const frame=stamp=>{
   // Optional CI A/B diagnostic: retain install hooks and PC menu, but pause
   // all periodic companion work. No player-facing setting or gameplay change.
   if(w.__pkmsvvPippiTickDisabled!==true&&Number(stamp)-last>=250){
    last=Number(stamp);tick();
   }
   w.requestAnimationFrame?.(frame);
  };
  if(typeof w.requestAnimationFrame==='function')w.requestAnimationFrame(frame);
  else if(typeof w.setInterval==='function')w.setInterval(tick,350);
  return api;
 }
 return {rank,data,refund,earn,train,trainingPoints,bondProgress,cousinChance,cousinLightning,rollCousinOnHit,installDamageHook,uninstallDamageHook,eligible,newRun,advanceFollower,emoteSVG,heal,buff,slow,endEffects,finish,tryRevive,faceSVG,install};
});
