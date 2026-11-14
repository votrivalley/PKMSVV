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
  activeBuff:null,slowed:[]};}
 function heal(pl,lv){
  if(!pl||!Number.isFinite(pl.maxHp)||pl.maxHp<=0||pl.hp/pl.maxHp>.65)return false;
  const gain=pl.maxHp*(.12+lv*.011);
  pl.hp=Math.min(pl.maxHp,Math.max(0,pl.hp)+gain);
  return true;
 }
 function buff(pl,run,now,lv){
  if(!pl||run.activeBuff||!Number.isFinite(+pl.atkMul)||pl.atkMul<=0)return false;
  const factor=1.08+Math.min(.09,lv*.01);
  pl.atkMul*=factor;
  run.activeBuff={player:pl,factor,until:now+8};
  return true;
 }
 function slow(G,run,now,lv){
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
   const factor=e.pkmsvvExploreBoss?.72:.65; // Boss slow is weaker.
   e.spd*=factor;
   run.slowed.push({enemy:e,factor,until:now+Math.min(4,2+lv*.17)});
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
 function finish(run){if(run)endEffects(run,Infinity);}
 function tryRevive(G,run,pl,now){
  if(!eligible(G)||!run||run.player!==pl||run.revived||
     !pl||pl.dead||!(Number(pl.hp)<=0)||typeof pl.revive!=='function')return false;
  if(data(G.DB?.save).bond<10)return false;
  run.revived=true;
  run.reviveAt=now;run.megaUntil=now+3.6;
  pl.extraRevives=0;
  pl.revive(.4);
  pl.invuln=Math.max(Number(pl.invuln)||0,3);
  run.sleepUntil=now+75;
  return true;
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
  const language=()=>G.I18n?.lang==='en';
  const copy=(vi,en)=>language()?en:vi;
  function getUI(){
   if(ui?.isConnected)return ui;
   if(!d.body)return null;
   const el=d.createElement('aside');
   el.id='pkmsvv-pippi';el.setAttribute('aria-live','off');el.hidden=true;
   el.innerHTML='<span class="pippi-portrait"></span><span class="pippi-message"><b>Pippi</b><span class="pippi-line"></span><small class="pippi-bond"></small></span>';
   d.body.appendChild(el);
   ui=el;return el;
  }
  function follow(pl){
   if(!d.body)return;
   if(!follower?.isConnected){
    follower=d.createElement('div');
    follower.id='pkmsvv-pippi-follower';
    follower.setAttribute('aria-label','Pippi — bạn đồng hành');
    follower.innerHTML=faceSVG('smile',false)+'<span class="pippi-pmd-sprite"></span>';
    d.body.appendChild(follower);
    const probe=d.createElement('img');
    probe.onload=()=>follower?.classList.add('has-pmd');
    probe.onerror=()=>follower?.classList.remove('has-pmd');
    probe.src='images/pippi/Walk-Anim.png';
   }
   follower.hidden=false;
   const canvas=d.getElementById('game'),rect=canvas?.getBoundingClientRect?.();
   if(!rect||!rect.width||!rect.height)return;
   // G.Camera tracks the world centre in Explore. This is a visual-only
   // follower; it has no body/collision/skill projectile/hitbox.
   const zoomX=rect.width/(Number(canvas.width)||rect.width);
   const zoomY=rect.height/(Number(canvas.height)||rect.height);
   const camX=Number(G.Camera?.x),camY=Number(G.Camera?.y);
   let x=rect.left+rect.width*.5-40,y=rect.top+rect.height*.5+18;
   if(Number.isFinite(camX)&&Number.isFinite(camY)){
    x+=Math.max(-rect.width*.33,Math.min(rect.width*.33,(pl.x-camX)*zoomX));
    y+=Math.max(-rect.height*.33,Math.min(rect.height*.33,(pl.y-camY)*zoomY));
   }
   // The initial portrait marker is intentionally a lightweight placeholder.
   // PMD's eight directional animation replaces this one visual element only.
   const last=run.lastPos,dx=last?pl.x-last.x:0,dy=last?pl.y-last.y:0;
   if(Math.hypot(dx,dy)>2){
    run.direction=(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8;
   }
   run.lastPos={x:pl.x,y:pl.y};
   follower.style.left=Math.round(x)+'px';
   follower.style.top=Math.round(y)+'px';
   follower.dataset.direction=String(run.direction);
   const mega=run.now<run.megaUntil;
   const asleep=!mega&&run.now<run.sleepUntil;
   follower.classList.toggle('sleeping',asleep);
   follower.classList.toggle('mega',mega);
   if(follower.classList.contains('has-pmd')){
    const moving=Math.hypot(dx,dy)>2;
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
  function say(event,force=false){
   if(!run)return;
   const now=run.now;
   if(!force&&now-run.lastTalk<8)return;
   run.lastTalk=now;
   const lines=LINES[event]||LINES.intro;
   const [face,message]=lines[Math.floor(Math.random()*lines.length)];
   const el=getUI();if(!el)return;
   const portrait=el.querySelector('.pippi-portrait');
   const fallback=faceSVG(face,face==='mega');
   const filename=PORTRAIT_FILES[face]||'Normal';
   const img=d.createElement('img');
   img.alt='Pippi';
   img.src='images/pippi/portrait/'+filename+'.png';
   img.onerror=()=>{if(portrait.contains(img))portrait.innerHTML=fallback;};
   portrait.replaceChildren(img);
   portrait.classList.toggle('mega',face==='mega');
   el.querySelector('.pippi-line').textContent=message;
   el.querySelector('.pippi-bond').textContent='Bond '+data(G.DB?.save).bond+'/10';
   el.hidden=false;
   el.dataset.until=String(now+(force?5:3.6));
  }
  function migrate(){
   const save=G.DB?.save;
   if(!save||typeof save!=='object'||save===lastSave&&data(save).refundReviveV1)return 0;
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
    w.console?.warn?.('[Pippi] Refusing uncommitted refund',err);
    return 0;
   }
   if(amount)G.UI?.toast?.(copy('Pippi trả lại '+amount.toLocaleString('vi-VN')+' PokéCoins hồi sinh cũ!',
        'Pippi refunded '+amount.toLocaleString('en-US')+' PokéCoins!'),4500);
   return amount;
  }
  function tick(){
   try{
    if(G.DB?.save)migrate();
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
    follow(pl);
    endEffects(run,now);
    if(ui&&!ui.hidden&&now>=Number(ui.dataset.until))ui.hidden=true;
    const p=data(G.DB?.save),lv=p.bond;
    const isSleeping=now<run.sleepUntil;
    if(isSleeping){
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
     if(heal(pl,lv))say('heal');}
    if(lv>=2&&now>=run.buffAt){run.buffAt=now+40;
     if(buff(pl,run,now,lv))say('buff');}
    if(lv>=3&&now>=run.slowAt){run.slowAt=now+27;
     if(slow(G,run,now,lv))say('slow');}
    if(lv>=7&&now>=run.guardAt&&pl.hp>0&&pl.hp/pl.maxHp<.22){
     run.guardAt=now+90;pl.invuln=Math.max(Number(pl.invuln)||0,1.8);
     say('shield',true);
    }
   }catch(err){w.console?.warn?.('[Pippi] frame guarded',err);}
  }
  function revive(pl){
   if(!run||!eligible(G))return false;
   const now=Math.max(0,Number(G.Game?.st?.time??G.Game?.time)||0);
   if(!tryRevive(G,run,pl,now))return false;
   run.now=now;say('revive',true);
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
  const api={installed:true,refund,migrate,data,rank,earn,eligible:()=>eligible(G),
   tryRevive:revive,tick,show:say,get run(){return run;}};
  G.PKMSVVPippi=api;
  // The RAF loop never mutates other modes; work only at a throttled 4Hz.
  let last=0;const frame=stamp=>{
   if(Number(stamp)-last>=250){last=Number(stamp);tick();}
   w.requestAnimationFrame?.(frame);
  };
  if(typeof w.requestAnimationFrame==='function')w.requestAnimationFrame(frame);
  else if(typeof w.setInterval==='function')w.setInterval(tick,350);
  return api;
 }
 return {rank,data,refund,earn,eligible,newRun,heal,buff,slow,endEffects,finish,tryRevive,faceSVG,install};
});
