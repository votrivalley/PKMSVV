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
 // One free training point per Thân thiết level beyond level 1; no new currency.
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
 // A single consumable reroutes Pippi's spent points without affecting friendship.
 function resetTraining(save,commit){
  if(!save||typeof save!=='object')return {ok:false,reason:'invalid'};
  const p=data(save),spent=TRAINING_KEYS.reduce((n,k)=>n+p.training[k],0);
  if(!spent)return {ok:false,reason:'nothing'};
  const stock=Number(save.bag?.pippiReset)||0;
  if(!Number.isSafeInteger(stock)||stock<1)return {ok:false,reason:'item'};
  if(typeof commit!=='function')return {ok:false,reason:'save'};
  const before={...p.training},amount=save.bag.pippiReset;
  for(const key of TRAINING_KEYS)p.training[key]=0;
  if(amount===1)delete save.bag.pippiReset;
  else save.bag.pippiReset=amount-1;
  try{if(commit()===false)throw Error('Save refused');}
  catch(_){p.training=before;save.bag.pippiReset=amount;return {ok:false,reason:'save'};}
  return {ok:true,refundedPoints:spent,points:trainingPoints(save),remaining:amount-1};
 }
 // Earn bonus friendship through first genuine chest, healing and aid in a run.
 // One point per kind; three extra points total, never XP from every pickup.
 function awardMoment(run,save,key,commit){
  if(!run||!save||!['chest','heal','assist'].includes(key)||typeof commit!=='function')
   return {ok:false,reason:'invalid'};
  run.bondAwards=run.bondAwards||new Set();
  if(run.bondAwards.has(key)||(run.bondBonus||0)>=3)return {ok:false,reason:'already'};
  const p=data(save),previous={xp:p.xp,bond:p.bond},result=earn(save,1);
  try{if(commit()===false)throw Error('Save refused');}
  catch(_){p.xp=previous.xp;p.bond=previous.bond;return {ok:false,reason:'save'};}
  run.bondAwards.add(key);run.bondBonus=(run.bondBonus||0)+1;
  return {ok:true,...result};
 }
 function bondProgress(save){
  const p=data(save),from=RANK_XP[p.bond-1]||0;
  return {bond:p.bond,xp:p.xp,from,to:p.bond<10?RANK_XP[p.bond]:null,points:trainingPoints(save)};
 }
 const LINES={
  intro:[['smile','Ê, nghe danh Pippi chưa? Clefairy từng làm Red muốn độn thổ đó! Nay tui là đạo diễn cuộc đời bạn.'],
   ['proud','Pippi đây! Vẻ đẹp, trí tuệ và sự khiêm tốn đều tập trung ở tui... Ờ, hơi xạo xíu.'],
   ['wink','Tui từng đi quậy tưng bừng với Red. Giờ tới lượt bạn chịu trận—ý là được tui bảo kê!']],
  heal:[['love','Máu đây! Người đẹp support tận răng, nhớ ghi công nha!'],
   ['wink','Lại tụt máu à? Tui không phải bình nước di động nha trời!'],
   ['happy','Tui vừa cứu cái sự nghiệp anh hùng của bạn đó. Không cần cảm ơn nhiều, cúi đầu là được.']],
  buff:[['proud','Đã buff! Diễn cho ra dáng vai chính giùm cái!'],
   ['wink','Tui gánh hậu trường, bạn lo đừng diễn như quần chúng!'],
   ['happy','Đẹp! Tăng sức mạnh rồi đó, cấm xài ngu nha!']],
  slow:[['angry','Đứng im! Chạy nhanh quá làm tui mất spotlight!'],
   ['wink','Bộ tính dí bạn tui hả? Xếp hàng lấy số đi mấy cha!'],
   ['proud','Tui cho tụi nó đi chậm để bạn còn cơ hội tỏa sáng đó.']],
  shield:[['panic','Ê né! Tui chưa muốn viết điếu văn cho bạn đâu!'],
   ['proud','Tấm khiên xịn nhất khu này, do Pippi tài trợ!'],
   ['angry','Ai cho phép đụng vào nhân vật chính của... trợ lý Pippi hả?']],
  revive:[['mega','CHƯA ĐƯỢC NGỦ! Tui còn chưa kịp khoe chiến công!'],
   ['mega','Moon Miracle! Sống lại đi, tui không khiêng nổi đâu!'],
   ['mega','Ủa định bỏ tui gánh cả map thật hả? Dậy mau!']],
  sleep:[['sleep','Cứu người xong mệt xỉu. Ai có Poké Doll cho tui ôm ngủ cái...'],
   ['sleep','Pippi off camera nha. Đừng ai quay góc xấu!']],
  boss:[['panic','Boss kìa! Bạn đánh đi, tui lo... chiến thuật rút lui!'],
   ['wink','Con bự vậy mà không biết xin lịch hẹn trước hả?'],
   ['shock','Ê ê, nhìn mặt nó dữ quá. Tui núp sau bạn... để bảo vệ phía sau!']],
  bond:[['sparkle','Thân thiết tăng rồi! Cuối cùng bạn cũng biết trân trọng một siêu sao.'],
   ['proud','Lên trình rồi! Ai nói Pippi chỉ giỏi gây họa bước ra đây!']],
  cousin:[['shock','EM HỌ PIKACHU! SÉT TỤI NÓ CHO CHỊ—À CHO ANH!'],
   ['wink','Tui gọi em họ tới giải quyết. Gia đình này có quan hệ rộng nha!'],
   ['proud','Nhìn cho rõ: đó là dịch vụ điện lực của nhà Pippi!']],
  evolve:[['sparkle','Tui đẹp lên thành Clefable hai giây, đừng ghen!'],
   ['proud','Thần chú biến hình! Không ai được chụp lúc tui đang đổi đồ!']],
  tutorial:[['thinking','Nhớ nha: boss phút 15 mở vùng, boss phút 30 mới hết trận. Tui nhắc lần cuối thôi!'],
   ['wink','Đánh boss phút 15 để mở vùng mới. Đợi phút 30 mới được nghỉ—đừng có lười!']],
  tease:[['wink','Đứng im chi vậy? Đợi quái xin chữ ký à?'],
   ['proud','Mất mạng à? Tui đi catwalk thử, bạn cứ đứng ngắm.'],
   ['happy','Đứng đây lâu quá tui tưởng bạn đang tải bản cập nhật!']],
  danger:[['panic','Máu đỏ rồi trời ơi! Bạn định làm trò cười cho boss hả?'],
   ['teary','Ê đừng chết! Tui chưa kịp thu tiền cứu hộ!'],
   ['angry','Ai bảo lao vào giữa bầy? Nghĩ mình là Mewtwo à?!']],
  cheer:[['proud','Được đấy! Nhưng spotlight chính vẫn là tui nha.'],
   ['wink','Ồ, biết đánh cơ đấy. Tui hơi bất ngờ nha!'],
   ['happy','Đánh vậy mới xứng làm người đi cùng Pippi chứ!']],
  chest:[['shock','RƯƠNG! Đừng động, để chuyên gia kho báu Pippi kiểm kê trước!'],
   ['wink','Ô hô, rương xịn! Nếu là đồ quý thì chia tui bảy, bạn ba nha?'],
   ['proud','Thấy chưa, tui ngửi thấy mùi tiền từ xa. Cái mũi vàng này không đùa đâu!']],
  item:[['proud','Nhặt gì đó? Đưa tui coi. Tui chỉ kiểm tra chất lượng thôi, không chôm đâu!'],
   ['wink','Item mới kìa. Cất kỹ nha, đừng để rơi rồi đổ tại Pippi!'],
   ['happy','Có đồ mới rồi! Đừng tiêu linh tinh, nghe cố vấn tài chính Pippi.']],
  healItem:[['angry','Bình máu! Tui nghỉ một ca nha, có người thay việc rồi!'],
   ['wink','Nhặt máu nhanh vậy? Biết sợ chết là tốt!']],
  magnetItem:[['happy','Hút đồ à? Ui, máy hốt của cải! Cho tui mượn một tí!'],
   ['proud','Nam châm này giống tui: có sức hút không thể cưỡng!']],
  bombItem:[['shock','BOM! Trời ơi đừng quăng gần tóc tui!'],
   ['wink','Nổ cho tụi nó sáng mắt! Tui đứng xa... quan sát chuyên môn!']],
  orbItem:[['proud','Orb! Đồ phép thuật! Tui biết xài đó, nhưng cho bạn thử trước.'],
   ['shock','Nhặt Orb rồi hả? Đừng bấm bừa rồi nổ cái bụp nha!']],
  coinItem:[['wink','Xu! Đưa thủ quỹ Pippi cất. Tui tính phí có chút xíu à!'],
   ['proud','Nghe tiếng tiền leng keng mà tim tui muốn nhảy múa!']],
  ticketItem:[['shock','Vé quay?! Tui nhìn thấy Legend đang vẫy tay... chắc nó vẫy đứa khác.'],
   ['wink','Có vé! Đừng quay ra Rattata rồi quay qua nhìn tui nha!']]
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
  activeBuff:null,slowed:[],lastSlowTargets:[],motion:null,castCue:null,emoteType:'sparkle',
  reactionAt:14,lastDangerAt:-100,lastQuirkCount:0,emoteUntil:0,cousinUntil:0,cousinTargets:0,damageHook:null,evolveUntil:0,megaSpoken:false,
  lastLineByEvent:Object.create(null),pendingReaction:null,pickupCount:0,bondAwards:new Set(),bondBonus:0};}
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
  run.lastSlowTargets=[];
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
   run.lastSlowTargets.push(e);
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
 // Match regular Pokémon Support: show a visible in-world action on the
 // recipient AND on the helper, not merely a floating line of chat.
 // Use the native FX budget so light-effects mode can throttle particles.
 const SUPPORT_PALETTE=Object.freeze({
  heal:['#ffaad7','#fff5fb','+HP'],
  buff:['#ffd775','#fff3be','TĂNG CÔNG'],
  slow:['#aa9aff','#c7d7ff','CHẬM!'],
  shield:['#9beeff','#ffe3fc','BẢO VỆ'],
  revive:['#ffe7fa','#ffc8f1','HỒI SINH'],
  cousin:['#ffe26e','#ffffff','TÊ LIỆT!']
 });
 // One visual event per actual support cast, never a per-frame emitter.
 // Reuse FX.ring/burst/dmgText which obey the game's low-effects budget.
 function showSupportFX(G,run,pl,event,value=0){
  const fx=G?.FX,colors=SUPPORT_PALETTE[event];
  if(!fx||!pl||!colors||!Number.isFinite(+pl.x)||!Number.isFinite(+pl.y))return false;
  const [primary,highlight,label]=colors;
  const helper=run?.motion,now=Number(G?.Game?.st?.time??run?.now)||0;
  if(run)run.castCue={event,started:now,until:now+(event==='cousin'?1.0:.78),
   targets:event==='slow'?(run.lastSlowTargets||[]).slice(0,6).map(e=>({x:e.x,y:e.y})):[]};
  try{
   if(helper&&Number.isFinite(helper.x)&&Number.isFinite(helper.y)){
    fx.ring?.(helper.x,helper.y-5,5,event==='cousin'?55:38,primary,.56,2);
    fx.burst?.(helper.x,helper.y-12,highlight,event==='cousin'?10:5,40);
   }
   if(event==='slow'){
    // Show which monsters were actually slowed, unlike the old effect that
    // incorrectly printed CHẬM on the player. Max six targets per cast.
    const targets=run?.lastSlowTargets||[];
    for(const e of targets.slice(0,6)){
     if(!e||!Number.isFinite(+e.x)||!Number.isFinite(+e.y))continue;
     fx.ring?.(e.x,e.y-3,5,40,primary,.35,2);
     fx.dmgText?.(e.x,e.y-27,label,primary);
    }
    return targets.length>0;
   }
   if(event==='heal'){
    fx.ring?.(pl.x,pl.y-5,9,72,primary,.62,3);
    fx.ring?.(pl.x,pl.y-5,4,40,highlight,.45,2);
    fx.burst?.(pl.x,pl.y-16,primary,8,60);
    if(value>0)fx.dmgText?.(pl.x,pl.y-32,'+'+Math.ceil(value)+' HP',highlight);
   }else if(event==='buff'){
    fx.ring?.(pl.x,pl.y-6,8,66,primary,.6,3);
    fx.burst?.(pl.x,pl.y-18,highlight,7,55);
    fx.dmgText?.(pl.x,pl.y-32,label,primary);
   }else if(event==='shield'||event==='revive'){
    fx.ring?.(pl.x,pl.y-9,9,82,primary,.68,3);
    fx.ring?.(pl.x,pl.y-9,5,54,highlight,.56,3);
    fx.burst?.(pl.x,pl.y-21,highlight,event==='revive'?12:7,70);
    fx.dmgText?.(pl.x,pl.y-39,label,primary);
   }else if(event==='cousin'){
    fx.ring?.(pl.x,pl.y-8,9,88,primary,.55,3);
    fx.burst?.(pl.x,pl.y-20,highlight,8,65);
    fx.dmgText?.(pl.x,pl.y-40,'PIKA!',primary);
   }
  }catch(_){return false;}
  return true;
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
  showSupportFX(G,run,pl,'cousin');
  if(run.castCue&&lightning.center)run.castCue.targets=[lightning.center];
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
 // Sống Sót-style support leash: keep a loose offset behind the lead, not
 // a lockstep copy of every player footstep. All coordinates remain in world
 // units. The dead zone means Pippi can idle while the player changes skills.
 const FOLLOW_DISTANCE=78;
 const SAFE_DISTANCE=56;
 const MAX_SUPPORT_GAP=168;
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
 // Tiny independent AI: walks as a support Pokemon, not a fixed UI pet.
 // Only changes its preferred position after the player has rested for a few
 // seconds. This makes it curious/playful without orbiting or twitching.
 function advanceFollower(run,pl,now,requestedGap=FOLLOW_DISTANCE){
  if(!run||!pl||!Number.isFinite(+pl.x)||!Number.isFinite(+pl.y))return null;
  const desired=clamp(requestedGap,64,150),minimum=Math.max(SAFE_DISTANCE,desired*.67);
  const init={x:pl.x-desired*.85,y:pl.y+desired*.38};
  const state=run.motion||(run.motion={
   x:init.x,y:init.y,px:pl.x,py:pl.y,last:now,
   speed:0,moving:false,direction:0,headingX:1,headingY:0,
   history:[{...init},{x:pl.x,y:pl.y}],warped:false,
   side:1,quirkSide:1,quirkAt:now+5.25,quirkCount:0,
   idleSince:now,mood:'guard'
  });
  const dt=clamp(now-state.last,0,.4);
  state.last=now;
  const dx=pl.x-state.px,dy=pl.y-state.py,travel=Math.hypot(dx,dy);
  const gap=Math.hypot(pl.x-state.x,pl.y-state.y);
  if(travel>450||gap>650){
   const hx=travel>1?dx/travel:state.headingX;
   const hy=travel>1?dy/travel:state.headingY;
   state.x=pl.x-hx*desired-hy*desired*.24;
   state.y=pl.y-hy*desired+hx*desired*.24;
   state.headingX=hx;state.headingY=hy;
   state.history=[{x:state.x,y:state.y},{x:pl.x,y:pl.y}];
   state.speed=0;state.moving=false;state.warped=true;
   state.px=pl.x;state.py=pl.y;
   state.quirkAt=now+5.25;state.idleSince=now;
   return state;
  }
  state.warped=false;
  if(travel>2){
   state.history.push({x:pl.x,y:pl.y});
   if(state.history.length>40)state.history.splice(0,state.history.length-40);
   const hx=dx/travel,hy=dy/travel,blend=.72;
   const nx=state.headingX*(1-blend)+hx*blend;
   const ny=state.headingY*(1-blend)+hy*blend;
   const norm=Math.hypot(nx,ny)||1;
   state.headingX=nx/norm;state.headingY=ny/norm;
   state.idleSince=now;state.quirkAt=now+5.25;
   state.mood='guard';
  }
  if(dt>.01&&travel>.4){
   const observed=Math.min(850,travel/dt);
   state.speed=state.speed>0?state.speed*.45+observed*.55:observed;
  }else state.speed*=.76;
  state.px=pl.x;state.py=pl.y;
  const idle=travel<=2&&now-state.idleSince>4.5;
  // A spontaneous side-step once every 7-9s; no random calls per tick.
  if(idle&&now>=state.quirkAt){
   state.quirkSide=-state.quirkSide;
   state.quirkCount++;
   state.quirkAt=now+7.2+(state.quirkCount%3)*.75;
   state.mood=state.quirkCount%3===0?'peek':'prance';
  }
  const hx=state.headingX,hy=state.headingY;
  const side=idle?state.quirkSide*.46:.26;
  const ahead=(idle&&state.mood==='peek')?0.1:0;
  const tx=pl.x-hx*desired*(1-ahead)-hy*desired*side;
  const ty=pl.y-hy*desired*(1-ahead)+hx*desired*side;
  const vx=tx-state.x,vy=ty-state.y,distance=Math.hypot(vx,vy);
  const leash=Math.max(MAX_SUPPORT_GAP,desired*1.55);
  const deadzone=Math.max(11,desired*.17);
  let step=0;
  if(dt>0&&(distance>deadzone||gap>leash)){
   const catchUp=gap>leash?Math.max(185,state.speed*1.9):
    gap>desired*1.4?Math.max(105,state.speed*1.35):
    idle?73:Math.max(50,state.speed*.93);
   step=Math.min(distance,catchUp*dt);
  }
  state.moving=step>1;
  if(state.moving){
   const mx=vx/(distance||1)*step,my=vy/(distance||1)*step;
   state.x+=mx;state.y+=my;
   state.direction=(Math.round(Math.atan2(my,mx)/(Math.PI/4))+8)%8;
  }else if(idle&&state.quirkCount>0&&Math.floor(now*.18)!==Math.floor((now-dt)*.18)){
   // Change facing occasionally, not position: a curious look around.
   state.direction=(state.direction+(state.quirkSide>0?1:7))%8;
  }
  const sx=state.x-pl.x,sy=state.y-pl.y,apart=Math.hypot(sx,sy);
  if(apart<minimum){
   const ux=apart>1?sx/apart:-state.headingX;
   const uy=apart>1?sy/apart:-state.headingY;
   state.x=pl.x+ux*minimum;state.y=pl.y+uy*minimum;
   state.moving=state.moving||travel>2;
  }
  return state;
 }
 // Pixel-art white speech-bubble emotes inspired by Ragnarok's emotion
 // vocabulary, but drawn independently: no extracted RO sticker assets.
 const EMOTES={
  intro:'heart',heal:'heart',buff:'sparkle',slow:'angry',cousin:'sparkle',evolve:'sparkle',
  shield:'alarm',revive:'heart',sleep:'sleep',boss:'alarm',
  bond:'sparkle',tutorial:'question',tease:'question',danger:'alarm',cheer:'sparkle'
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
 function personalityReaction(run,pl,now){
   if(!run||!pl||now<run.sleepUntil||now<(run.reactionAt||0))return null;
   const ratio=Number(pl.maxHp)>0?Number(pl.hp)/pl.maxHp:1;
   if(ratio>0&&ratio<.30&&now-(run.lastDangerAt??-100)>=24){
    run.lastDangerAt=now;run.reactionAt=now+24;
    return 'danger';
   }
   const idleSteps=Number(run.motion?.quirkCount)||0;
   if(idleSteps>(run.lastQuirkCount||0)){
    run.lastQuirkCount=idleSteps;
    run.reactionAt=now+23;
    return 'tease';
   }
   // Rare one-liner when the player is doing well: no per-frame RNG.
   if(now>=80&&now>=run.reactionAt+28){
    run.reactionAt=now+47;
    return 'cheer';
   }
   return null;
  }
 function install(w){
  const G=w.G,d=w.document;
  if(G.PKMSVVPippi?.installed)return G.PKMSVVPippi;
  let run=null,ui=null,lastSave=null,follower=null;
  // Native depth-sorted world drawing is shared with the real Sống Sót
  // Pokémon supports. Never paint Pippi as a fixed browser overlay.
  let nativeWorldReady=false;
  let worldAnimator=null,worldAnimMode='',lastWorldFrame=0;
  let insideNativePickup=false;
  function nativeWorldDraw(ctx){
   const m=run?.motion;
   if(!m||visualModalOpen()||!eligible(G)||!ctx)return;
   const wall=typeof w.performance?.now==='function'?w.performance.now():Date.now();
   const elapsed=clamp((wall-(m.wallUpdated||wall))/250,0,1);
   const x=(m.fromX??m.x)+(m.x-(m.fromX??m.x))*elapsed;
   const y=(m.fromY??m.y)+(m.y-(m.fromY??m.y))*elapsed;
   const d=wall-lastWorldFrame;
   const dt=lastWorldFrame?clamp(d/1000,0,.075):.016;
   lastWorldFrame=wall;
   ctx.save();
   ctx.fillStyle='rgba(33,26,29,.34)';
   ctx.beginPath();ctx.ellipse(x,y+1,11.7,3.6,0,0,Math.PI*2);ctx.fill();
   if(!worldAnimator&&typeof G.Sprites?.Animator==='function'){
    try{
     G.Sprites?.sheet?.(35,'Idle',false);
     G.Sprites?.sheet?.(35,'Walk',false);
     const base=Number(G.Sprites?.playerScale?.(35))||1;
     worldAnimator=new G.Sprites.Animator(35,Math.max(.8,base)*1.008,false); // 10% smaller than 1.12
     worldAnimator.loop('Idle');
     worldAnimMode='Idle';
    }catch(err){w.console?.warn?.('[Pippi] Native animator unavailable',err);}
   }
   if(worldAnimator){
    const mode=m.moving?'Walk':'Idle';
    if(worldAnimMode!==mode){worldAnimator.loop(mode,m.moving?1.1:1);worldAnimMode=mode;}
    if(m.facing!==undefined&&G.Sprites?.dirFromAngle)
     worldAnimator.dir=G.Sprites.dirFromAngle(m.facing);
    worldAnimator.update(dt);
    worldAnimator.draw(ctx,x,y,{alpha:1});
   }
   // A 0.8-second in-world casting gesture, not a permanent particle loop.
  // Lines/rings live in the SAME Y-sorted canvas as Pokémon and expire with
  // game time. With simple FX quality there are still clear action cues.
  const cue=run?.castCue,gameNow=Number(G.Game?.st?.time??run?.now)||0;
  if(cue&&gameNow<=cue.until){
   const fade=clamp((cue.until-gameNow)/.78,0,1);
   const color=SUPPORT_PALETTE[cue.event]?.[0]||'#fff2bc';
   ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.globalAlpha=Math.max(.08,fade*.82);
   if(typeof ctx.arc==='function'&&typeof ctx.stroke==='function'){
    ctx.beginPath();ctx.arc(x,y-10,10+14*(1-fade),0,Math.PI*2);ctx.stroke();
   }
   const targets=(cue.targets?.length?cue.targets:
    [{x:run?.player?.x,y:run?.player?.y}]).slice(0,4);
   if(typeof ctx.moveTo==='function'&&typeof ctx.lineTo==='function'&&
      typeof ctx.stroke==='function'){
    for(const target of targets){
     if(!Number.isFinite(+target?.x)||!Number.isFinite(+target?.y))continue;
     const sx=x,sy=y-18,tx=target.x,ty=target.y-14;
     const dx=tx-sx,dy=ty-sy;
     if(Math.hypot(dx,dy)>300)continue;
     ctx.beginPath();ctx.moveTo(sx,sy);
     if(cue.event==='cousin'){
      // Three chunky electric zigzags, intentionally deterministic.
      for(let i=1;i<=3;i++){
       const t=i/4,offset=(i%2?11:-10);
       ctx.lineTo(sx+dx*t-dy/(Math.hypot(dx,dy)||1)*offset,
                  sy+dy*t+dx/(Math.hypot(dx,dy)||1)*offset);
      }
      ctx.lineTo(tx,ty);
     }else if(typeof ctx.quadraticCurveTo==='function'){
      ctx.quadraticCurveTo((sx+tx)/2,(sy+ty)/2-30,tx,ty);
     }else ctx.lineTo(tx,ty);
     ctx.stroke();
    }
   }
   ctx.globalAlpha=1;
  }
  // Reaction bubble is a tiny in-world icon, not a permanent floating face.
  if(run?.emoteUntil>run?.now){
   const glyph={heart:'♥',sparkle:'✦',alarm:'!',question:'?',angry:'!',sleep:'Z'};
   const ch=glyph[run.emoteType]||'✦';
   ctx.font='bold 16px sans-serif';ctx.textAlign='center';
   ctx.fillStyle='#fff5b0';ctx.strokeStyle='#4c2b50';ctx.lineWidth=2;
   ctx.strokeText?.(ch,x+15,y-45);ctx.fillText?.(ch,x+15,y-45);
  }
   ctx.restore();
  }
  // Native Game.item() is called by real item/chest reward pickup logic.
  // Install one wrapper only. Give visual feedback on EVERY pickup, but limit
  // portrait speech to the existing 8-second cooldown to protect Chromium.
  function reactPickup(kind='item',value){
   if(!run||!eligible(G))return false;
   const id=String(value?.kind??value?.id??value??'').toLowerCase();
   const event=kind==='orb'?'orbItem':
    /heal|potion|hp/.test(kind+' '+id)?'healItem':
    /magnet|vacuum|hút/.test(kind+' '+id)?'magnetItem':
    /bomb|explos|nổ/.test(kind+' '+id)?'bombItem':
    kind==='chest'||kind==='item'?'chest':
    /ticket/.test(kind)?'ticketItem':
    kind==='coin'?'coinItem':'item';
   const now=Math.max(0,Number(G.Game?.st?.time??run.now)||0);
   run.pickupCount=(run.pickupCount||0)+1;
   run.emoteType=event==='bombItem'?'alarm':'sparkle';
   run.emoteUntil=Math.max(run.emoteUntil||0,now+1.9);
   if(run.motion&&G.FX&&run.pickupCount%2===1){
    G.FX.burst?.(run.motion.x,run.motion.y-13,'#ffe5a2',3,28);
   }
   // Coalesce rapid successive drops, but do not lose the discovery.
   run.pendingReaction=event;
   if(event==='chest')earnMoment('chest');
   G.PKMSVVPippiGuide?.queue?.(event==='chest'?'chest':'pickup');
   return true;
  }
  function installPickupReactions(){
   if(!G.Game)return false;
   let found=false;
   for(const [name,kind] of [['item','chest'],['orb','orb'],
     ['pickup','item'],['collect','item']]){
    const previous=G.Game[name];
    if(typeof previous!=='function')continue;
    if(previous.__pkmsvvPippiPickup){found=true;continue;}
    function wrapped(...args){
     const result=previous.apply(this,args);
     if(!insideNativePickup&&eligible(G))reactPickup(kind,args[0]);
     return result;
    }
    wrapped.__pkmsvvPippiPickup=true;G.Game[name]=wrapped;found=true;
   }
   // Native Pickups.update(dt, players, onCollected) calls its callback
   // ONLY after proximity collection. Wrap that callback, never scan 60Hz
   // DOM/canvas nodes and never treat a drop on the ground as a pickup.
   const pickups=G.Pickups,previous=pickups?.update;
   if(typeof previous==='function'&&!previous.__pkmsvvPippiPickup){
    function wrapped(dt,players,onCollected,...rest){
     if(typeof onCollected!=='function')
      return previous.call(this,dt,players,onCollected,...rest);
     const notify=function(pickup,collector,...args){
      insideNativePickup=true;
      let result;
      try{result=onCollected.call(this,pickup,collector,...args);}
      finally{insideNativePickup=false;}
      if(eligible(G)&&pickup&&collector===G.Game?.player&&
         !['xp','xpBig'].includes(String(pickup.kind||''))){
       reactPickup(String(pickup.kind||'item'),pickup.value);
      }
      return result;
     };
     return previous.call(this,dt,players,notify,...rest);
    }
    wrapped.__pkmsvvPippiPickup=true;pickups.update=wrapped;found=true;
   }
   return found;
  }
  function installNativeWorld(){
   const eggs=G.PKMSVVEggs;
   if(!eggs||typeof eggs.drawables!=='function'||typeof G.Sprites?.Animator!=='function')
    return false;
   if(eggs.drawables.__pkmsvvPippiWorld){nativeWorldReady=true;return true;}
   const previous=eggs.drawables;
   function withPippi(cam){
    const items=previous.call(this,cam);
    const base=Array.isArray(items)?items:[];
    const m=run?.motion;
    if(eligible(G)&&!visualModalOpen()&&m&&
       (!cam?.sees||cam.sees(m.x,m.y,95))){
     base.push({y:m.y,pkmsvvPippi:true,draw:nativeWorldDraw});
    }
    return base;
   }
   withPippi.__pkmsvvPippiWorld=true;
   eggs.drawables=withPippi;
   nativeWorldReady=true;
   G.Sprites?.preload?.([35],7000,false);
   return true;
  }
  // Repair an older PC panel if the cached Wiki script made only three
  // buttons. Reuse the original PC styles and its actual training callback.
  // Runs only at the home UI; no MutationObserver in the combat scene.
  function ensurePcCompanion(){
   const grid=d.querySelector?.('#pkmsvv-wiki-overlay .pkmsvv-pc-grid');
   if(!grid)return false;
   for(const item of grid.children){
    if(item.dataset?.pippiCompanionCard||
       /Bạn đồng hành|Companions/i.test(item.getAttribute?.('aria-label')||item.textContent||''))return true;
   }
   const button=d.createElement('button');
   button.type='button';button.className='pkmsvv-pc-card';
   button.dataset.pippiCompanionCard='1';
   button.setAttribute('aria-label','Bạn đồng hành — Chăm sóc Pippi');
   const canvas=d.createElement('canvas');canvas.width=144;canvas.height=144;
   canvas.setAttribute('aria-hidden','true');
   button.append(canvas);
   const title=d.createElement('strong');title.textContent='Bạn đồng hành';
   const desc=d.createElement('small');desc.textContent='Thân thiết · Hồi máu · Cổ vũ · Em họ Pikachu';
   const action=d.createElement('span');action.className='pkmsvv-pc-action';
   action.textContent='Chăm sóc Pippi';
   button.append(title,desc,action);
   button.onclick=()=>{
    if(typeof G.PKMSVVWiki?.pippiCorner==='function')G.PKMSVVWiki.pippiCorner();
    else{
     const p=data(G.DB?.save);
     G.UI?.toast?.('Pippi · Thân thiết '+p.bond+'/10 — Vào lại PC khi menu cập nhật.',3500);
    }
   };
   grid.append(button);
   // Draw one static copy, not an endless animated sprite canvas in the PC.
   try{
    const art=G.UI?.spriteCanvas?.(35,144,144,{lively:false,scale:2,hero:true});
    if(art?.nodeType)canvas.replaceWith(art);
   }catch(_){}
   grid.dataset.pippiQaRepair='1';
   return true;
  }
  const decodedPortraits=new Map();
  let portraitsPreloading=false;
  const portraitAtlasOrder=['Normal','Happy','Joyous','Determined',
   'Angry','Crying','Dizzy','Inspired',
   'Pain','Sad','Shouting','Sigh',
   'Stunned','Surprised','Teary-Eyed','Worried'];
  const portraitAtlasIndex=new Map(portraitAtlasOrder.map((name,index)=>[name,index]));
  let portraitAtlasReady=false,portraitAtlasRequested=false;
  function loadPortraitAtlas(){
   if(portraitAtlasRequested||typeof w.Image!=='function')return;
   portraitAtlasRequested=true;
   const atlas=new w.Image();
   atlas.decoding='async';
   atlas.onload=()=>{portraitAtlasReady=!!atlas.naturalWidth;};
   atlas.onerror=()=>{portraitAtlasReady=false;};
   atlas.src='images/pippi/portrait/atlas.png';
  }
  // Decode all 16 expressions while the home menu is idle, not mid-combat.
  // Retain the decoded Image objects, and move them between the chat bubble
  // and cache without changing image.src in a live Rift/Explore RAF.
  function prewarmPortraits(){
   if(portraitsPreloading||typeof w.Image!=='function'||G.Game?.state!=='ui')return;
   portraitsPreloading=true;
   for(const name of new Set(Object.values(PORTRAIT_FILES))){
    const art=new w.Image();
    art.decoding='async';
    art.className='pippi-portrait-picture';
    art.alt='Pippi: '+name;
    art.src='images/pippi/portrait/'+name+'.png';
    if(typeof art.decode==='function'){
     art.decode().then(()=>decodedPortraits.set(name,art)).catch(()=>{});
    }else{
     art.onload=()=>decodedPortraits.set(name,art);
    }
   }
  }
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
   // Lightweight always-visible SVG expression. PNG decoding inside native
   // combat caused Chromium stalls; retain the PNG assets in PC, but never
   // show a blank portrait when battle PNGs are intentionally disabled.
   el.innerHTML='<span class="pippi-portrait"><span class="pippi-portrait-art">'+faceSVG('smile')+'</span><span class="pippi-chat-emote" aria-hidden="true"></span></span><span class="pippi-message"><b>Pippi</b><span class="pippi-line"></span><small class="pippi-bond" hidden></small></span>';
   d.body.appendChild(el);
   ui=el;return el;
  }
  // Only count genuinely VISIBLE dialogs. Native G.UI.isOpen('scr-menu')
  // can remain truthy underneath an active Explore run; relying on it hid
  // Pippi throughout combat even though no menu covered the screen.
  function visibleModal(){
   if(String(G.Game?.state||'')!=='playing')return 'native-nonplaying';
   const selectors=['#scr-pause','#scr-levelup','#scr-settings','#scr-pc',
    '#scr-pokemon','#scr-item','#scr-items','#scr-over','#scr-evolution',
    '#pkmsvv-wiki-overlay','#pkmsvv-pokebox-overlay','#pkmsvv-fusion-guide',
    '#pkmsvv-pippi-guide',
    '#pkmsvv-forget-skill','#pkmsvv-support-catalog',
    '#pkmsvv-quick-region','.pkmsvv-berry-overlay',
    '#pkmsvv-native-choice','#pkmsvv-mega-phase1','.pkmsvv-evo'];
   for(const selector of selectors){
    const el=d.querySelector?.(selector);
    if(!el||el.hidden||el.getAttribute?.('aria-hidden')==='true'||
      el.classList?.contains('hidden'))continue;
    if(typeof w.getComputedStyle==='function'){
     const style=w.getComputedStyle(el);
     if(style.display==='none'||style.visibility==='hidden'||+style.opacity===0)continue;
    }
    if(typeof el.getClientRects==='function'&&el.getClientRects().length===0)continue;
    return selector;
   }
   return null;
  }
  function visualModalOpen(){return visibleModal()!==null;}
  function concealVisuals(){
   if(ui)ui.hidden=true;
   if(follower)follower.hidden=true;
  }
  function follow(pl){
   if(visualModalOpen()){concealVisuals();return;}
   if(installNativeWorld()){
    // Position is in world coordinates, identical to all other Pokémon.
    // The normal game renderer now performs camera projection + Y sorting.
    const before=run?.motion&&{x:run.motion.x,y:run.motion.y};
    const m=advanceFollower(run,pl,run.now,FOLLOW_DISTANCE);
    if(!m)return;
    m.fromX=before?.x??m.x;
    m.fromY=before?.y??m.y;
    m.wallUpdated=typeof w.performance?.now==='function'?w.performance.now():Date.now();
    const mx=m.x-m.fromX,my=m.y-m.fromY;
    if(m.moving&&Math.hypot(mx,my)>1)m.facing=Math.atan2(my,mx);
    if(follower)follower.hidden=true;
    return;
   }
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
   const canvas=d.getElementById?.('game'),rect=canvas?.getBoundingClientRect?.();
   if(!rect||!rect.width||!rect.height){concealVisuals();return;}
   const zoomX=rect.width/(Number(canvas.width)||rect.width);
   const zoomY=rect.height/(Number(canvas.height)||rect.height);
   // High-DPI WebViews should not shrink the support to an invisible dot,
   // nor push it so far away that its heal/buff appears disconnected.
   const visualScale=Math.max(.3,Math.min(zoomX,zoomY)*(Number(G.Camera?.scale)||1));
   const desiredGap=Math.max(FOLLOW_DISTANCE,Math.min(120,48/visualScale));
   const state=advanceFollower(run,pl,run.now,desiredGap);if(!state)return;
   const camX=Number(G.Camera?.x),camY=Number(G.Camera?.y);
   // Use the same camera-centre projection as the previously visible Pippi.
   // G.Camera.left()/top() in some native builds already incorporate zoom:
   // multiplying their output by another scale placed Pippi off-screen.
   // Prefer native world-centre coordinates, with a player-relative fallback.
   const centerX=Number.isFinite(camX)?camX:pl.x;
   const centerY=Number.isFinite(camY)?camY:pl.y;
   const x=rect.left+rect.width*.5+(state.x-centerX)*zoomX;
   const y=rect.top+rect.height*.5+(state.y-centerY)*zoomY;
   // Pippi is a world actor, not a floating browser overlay: never leak it
   // outside the game canvas or across a fixed-position menu/pause dialog.
   const padding=12;
   if(!Number.isFinite(x)||!Number.isFinite(y)||
      x<rect.left+padding||x>rect.right-padding||
      y<rect.top+padding||y>rect.bottom-6){
    concealVisuals();return;
   }
   follower.hidden=false;
   follower.classList.toggle('warped',!!state.warped);
   follower.style.left=Math.round(x)+'px';
   follower.style.top=Math.round(y+4)+'px';
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
    // CSS sprite-step animation is independent of the 4Hz AI logic tick.
    // Recalculating frame from the 4Hz timer skipped half the walking frames.
    const row=(run.direction+6)%8;
    const part=follower.querySelector('.pippi-pmd-sprite');
    part.style.width=width+'px';part.style.height=height+'px';
    if(part.dataset.sheet!==file){
     part.dataset.sheet=file;
     part.style.backgroundImage="url('images/pippi/"+file+"')";
    }
    part.style.backgroundPositionY=(-height*row)+'px';
   }
  }
  // Combat may fire a skill proc while the native canvas engine is inside
  // its RAF. Never parse portrait SVG / replace image nodes synchronously in
  // that same combat frame. Coalesce repeated speech into one deferred update,
  // and reuse one portrait image instead of decoding a new <img> on each event.
  let speechPending=null,speechTimer=null;
  function renderSpeech(job){
   const trace=w.__pkmsvvPippiStageTrace===true;
   const mark=name=>{if(trace)w.console?.log?.('QA_PIPPI_SPEECH:'+name);};
   mark('enter');
   if(!job||job.origin!==run||!eligible(G)||visualModalOpen()){
    mark('skip');return;
   }
   const {event,force,now}=job;
   mark('emote-enter');
   const worldEmote=follower?.querySelector('.pippi-world-emote');
   if(worldEmote&&w.__pkmsvvPippiNoEmote!==true){
    if(worldEmote.dataset.emoteEvent!==event){
     worldEmote.innerHTML=emoteSVG(EMOTES[event]||'heart');
     worldEmote.dataset.emoteEvent=event;
    }
    worldEmote.hidden=false;
   }
   mark('emote-exit');
   const lines=LINES[event]||LINES.intro;
   // Shuffle without replacement of the immediately previous variant.
   const previous=run?.lastLineByEvent?.[event]??-1;
   const position=lines.length===1?0:(previous+1+Math.floor(Math.random()*(lines.length-1)))%lines.length;
   if(run)run.lastLineByEvent[event]=position;
   const [face,message]=lines[position];
   mark('create-ui-enter');
   const el=getUI();if(!el)return;
   mark('create-ui-exit');
   const portrait=el.querySelector('.pippi-portrait');if(!portrait)return;
   const chatEmote=portrait.querySelector('.pippi-chat-emote');
   mark('chat-emote-enter');
   if(chatEmote&&w.__pkmsvvPippiNoEmote!==true&&chatEmote.dataset.emoteEvent!==event){
    chatEmote.innerHTML=emoteSVG(EMOTES[event]||'heart');
    chatEmote.dataset.emoteEvent=event;
   }
   mark('chat-emote-exit');
   const filename=PORTRAIT_FILES[face]||'Normal';
   mark('portrait-enter');
   portrait.dataset.expression=face;
   const fallbackArt=portrait.querySelector('.pippi-portrait-art');
   const canUseAtlas=portraitAtlasReady&&w.__pkmsvvPippiPortraitDisabled!==true&&
    w.__pkmsvvPippiNoPortrait!==true;
   if(fallbackArt&&
      (fallbackArt.dataset.face!==face||
       fallbackArt.dataset.atlas!==(canUseAtlas?'1':'0'))){
    if(canUseAtlas){
     const idx=portraitAtlasIndex.get(filename)??0;
     fallbackArt.replaceChildren();
     fallbackArt.style.backgroundImage="url('images/pippi/portrait/atlas.png')";
     fallbackArt.style.backgroundPosition=((idx%4)*100/3)+'% '+(Math.floor(idx/4)*100/3)+'%';
    }else{
     fallbackArt.style.backgroundImage='none';
     fallbackArt.innerHTML=faceSVG(face,face==='mega');
    }
    fallbackArt.dataset.face=face;
    fallbackArt.dataset.atlas=canUseAtlas?'1':'0';
   }
   // Chromium/Android QA: even previously decoded PNG portraits may cause
   // a renderer stall as the canvas game and Rift scenes repaint. Keep the
   // dialogue text + small SVG emote during combat, but retain all original
   // 16 PNGs for the PC/gallery and a separately validated opt-in renderer.
   // Do not sacrifice combat stability to decorative portrait animation.
   if(w.__pkmsvvPippiAllowCombatPortrait===true&&
      w.__pkmsvvPippiNoPortrait!==true&&w.__pkmsvvPippiPortraitDisabled!==true){
    const ready=decodedPortraits.get(filename)||decodedPortraits.get('Normal');
    const displayed=portrait.querySelector('img');
    mark('portrait-load-enter');
    if(ready&&displayed!==ready){
     // Moving an already-decoded node cannot initiate another PNG fetch.
     if(displayed)displayed.remove();
     portrait.prepend(ready);
    }
    mark('portrait-load-exit');
   }
   portrait.dataset.emotion=face;
   el.dataset.event=event;
   portrait.classList.toggle('mega',face==='mega');
   el.querySelector('.pippi-line').textContent=message;
   const bondLine=el.querySelector('.pippi-bond');
   if(bondLine){bondLine.hidden=event!=='bond';
    bondLine.textContent=event==='bond'?copy('Thân thiết ','Bond ')+data(G.DB?.save).bond+'/10':'';}
   el.hidden=false;
   el.dataset.until=String(now+(force?5:3.6));
   mark('exit');
  }
  function say(event,force=false){
   if(!run||w.__pkmsvvPippiSpeechDisabled===true)return;
   const now=run.now;
   if(!force&&now-run.lastTalk<8)return;
   run.lastTalk=now;
   run.emoteType=EMOTES[event]||'sparkle';
   run.emoteUntil=now+(force?3.8:2.6);
   speechPending={event,force,now,origin:run};
   if(speechTimer!==null)return;
   const deliver=()=>{
    speechTimer=null;
    const job=speechPending;speechPending=null;
    try{renderSpeech(job)}catch(err){w.console?.warn?.('[Pippi] speech guarded',err);}
   };
   // Creating portrait PNGs and SVG emotes in the middle of the native
   // combat RAF can contend with Rift scene initialization and level-up.
   // Render only when the browser yields an idle slice; coalesced events and
   // origin guards keep stale dialogue from appearing in the next match.
   if(typeof w.requestIdleCallback==='function'){
    speechTimer=w.requestIdleCallback(deliver,{timeout:900});
   }else if(typeof w.setTimeout==='function'){
    speechTimer=w.setTimeout(deliver,180);
   }else deliver();
  }
  function earnMoment(key){
   if(!run||!eligible(G)||G.DB?.guest||!G.DB?.save||
      typeof G.DB.commit!=='function')return false;
   const result=awardMoment(run,G.DB.save,key,()=>G.DB.commit(true));
   if(result.ok&&result.leveled)say('bond',true);
   return !!result.ok;
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
  let qaTraceTicks=0;
  function tick(){
   const trace=w.__pkmsvvPippiStageTrace===true&&qaTraceTicks++<16;
   const stage=name=>{if(trace)w.console?.log?.('QA_PIPPI_STAGE:'+name+':'+String(G.Game?.state||''));};
   stage('enter');
   try{
    installPickupReactions();
    stage('migration-enter');
    // Refund bookkeeping can touch persistent storage. Finish migrations
    // from the home UI, never synchronously in a live combat tick.
    if(G.Game?.state==='ui')ensurePcCompanion();
    if(G.DB?.save&&G.Game?.state==='ui'){
     // One-time exact refund for retired account-wide regen, with no save
     // writes in the battle tick. Personal regen and Pippi heal remain.
     const returned=G.GlobalPower?.refundRetiredPowerups?.(G.DB.save)||0;
     if(returned>0){
      G.DB?.commit?.(true);G.UI?.refreshCoins?.();
      G.UI?.toast?.('Đã hoàn '+Math.round(returned).toLocaleString('vi-VN')+
       ' PokéCoins từ nâng cấp Hồi phục/Tốc chạy cũ.',3500);
     }
    }
    if(G.DB?.save&&G.Game?.state==='ui'&&!w.__pkmsvvPippiMigrationDisabled)migrate();
    if(w.__pkmsvvPippiAllowCombatPortrait===true&&G.Game?.state==='ui')prewarmPortraits();
    stage('migration-exit');
    const pl=G.Game?.player;
    // Native level-up and other modal choices are temporary pauses of the
    // SAME Explore run. Resetting Pippi here used to remove the follower,
    // revert buffs and re-create its DOM/dialogue right after pressing 1/2/3.
    // Keep the run and installed hurt hook until the player genuinely exits.
    const phase=String(G.Game?.state||'');
    if(run&&run.player===pl&&G.PKMSVVQuickRegion?.active===true&&
       ['levelup','choice','held','pause','paused'].includes(phase)){
     concealVisuals();
     return;
    }
    stage('eligible-enter');
    if(!eligible(G)){
     if(run){finish(run);run=null;worldAnimator=null;worldAnimMode='';lastWorldFrame=0;}
     if(ui)ui.hidden=true;
     if(follower)follower.hidden=true;
     return;
    }
    stage('eligible-exit');
    const now=Math.max(0,Number(G.Game?.st?.time??G.Game?.time)||0);
    if(!run||run.player!==pl||now+1<run.now){
     stage('new-run-enter');
     finish(run);worldAnimator=null;worldAnimMode='';lastWorldFrame=0;
     run=newRun(pl,now);say('intro',true);say('tutorial');
     stage('new-run-exit');
    }
    run.now=now;
    installDamageHook(run,pl,(before,after,hitPlayer)=>{
     const outcome=rollCousinOnHit(G,run,hitPlayer,before,after);
     if(outcome.triggered)say('cousin',true);
    });
    stage('follow-enter');
    follow(pl);
    stage('follow-exit');
    endEffects(run,now);
    stage('effects-exit');
    if(ui&&!ui.hidden&&(visualModalOpen()||now>=Number(ui.dataset.until)))ui.hidden=true;
    stage('data-enter');
    const p=data(G.DB?.save),lv=p.bond,training=p.training;
    stage('data-exit');
    if(run.pendingReaction&&now-run.lastTalk>=8&&!visualModalOpen()){
     const event=run.pendingReaction;
     run.pendingReaction=null;
     say(event);
    }else if(now-run.lastTalk>=9){
     const comment=personalityReaction(run,pl,now);
     if(comment)say(comment);
    }
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
     const oldHp=pl.hp;
     if(heal(pl,lv,training.heal)){
      showSupportFX(G,run,pl,'heal',pl.hp-oldHp);
      earnMoment('heal');say('heal');
     }
    }
    if(lv>=2&&now>=run.buffAt){run.buffAt=now+40;
     if(buff(pl,run,now,lv,training.buff)){
      showSupportFX(G,run,pl,'buff');earnMoment('assist');say('buff');
     }}
    if(lv>=3&&now>=run.slowAt){run.slowAt=now+27;
     if(slow(G,run,now,lv,training.slow)){
      showSupportFX(G,run,pl,'slow');earnMoment('assist');say('slow');
     }}
    if(lv>=7&&now>=run.guardAt&&pl.hp>0&&pl.hp/pl.maxHp<.22){
     run.guardAt=now+90;pl.invuln=Math.max(Number(pl.invuln)||0,1.8+training.shield*.35);
     showSupportFX(G,run,pl,'shield');
     say('shield',true);
    }
    // Only after real reward/level-up dialogs close: no automatic skip,
    // no extra RAF/interval, no interruption of item selection.
    G.PKMSVVPippiGuide?.flush?.();
   }catch(err){w.console?.warn?.('[Pippi] frame guarded',err);}
   finally{stage('exit');}
  }
  function revive(pl){
   if(!run||!eligible(G))return false;
   const now=Math.max(0,Number(G.Game?.st?.time??G.Game?.time)||0);
   if(!tryRevive(G,run,pl,now))return false;
   run.now=now;showSupportFX(G,run,pl,'revive');say('evolve',true);
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
  const api={installed:true,refund,migrate,data,rank,earn,train,resetTraining,awardMoment,trainingPoints,bondProgress,cousinChance,eligible:()=>eligible(G),
   tryRevive:revive,tick,show:say,reactPickup,
   get visual(){return {renderMode:nativeWorldReady?'native-world':'fallback',
    nativeWorldReady,worldAnimatorReady:!!worldAnimator,
    blocked:visualModalOpen(),blockedBy:visibleModal(),
    followerHidden:nativeWorldReady?false:(follower?.hidden??true),
    followerConnected:!!follower?.isConnected,position:run?.motion?{
     x:run.motion.x,y:run.motion.y}:null};},
   get run(){return run;}};
  G.PKMSVVPippi=api;
  // One 160x160 portrait texture loads once, before entering combat.
  loadPortraitAtlas();
  // Pippi only needs four updates per second. The old self-recursing RAF
  // installed an extra callback on EVERY native 60Hz combat frame even while
  // Pippi was idle. Use a single 250ms timer instead to keep the companion
  // off the critical rendering path (including Grieta/Rift transitions).
  // Keep RAF only for rare hosts with no timer implementation.
  if(typeof w.setInterval==='function'){
   w.setInterval(()=>{
    if(w.__pkmsvvPippiTickDisabled!==true)tick();
   },250);
  }else if(typeof w.requestAnimationFrame==='function'){
   let last=0;
   const frame=stamp=>{
    if(w.__pkmsvvPippiTickDisabled!==true&&Number(stamp)-last>=250){
     last=Number(stamp);tick();
    }
    w.requestAnimationFrame?.(frame);
   };
   w.requestAnimationFrame(frame);
  }
  return api;
 }
 return {rank,data,refund,earn,train,resetTraining,awardMoment,trainingPoints,bondProgress,cousinChance,cousinLightning,rollCousinOnHit,installDamageHook,uninstallDamageHook,eligible,newRun,advanceFollower,emoteSVG,heal,buff,slow,showSupportFX,personalityReaction,endEffects,finish,tryRevive,faceSVG,install};
});
