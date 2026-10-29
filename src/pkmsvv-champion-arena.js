'use strict';
/* Crown Arena — real SOLO boss combat with a 16-entrant knockout bracket.
 * The other seven matches in round 1 are simulated, never paid as human wins.
 * 180-second real monster farming BEFORE every round; final victory earns Champion.
 * No LAN >10, no fake Mega sprite, no invented Champion victory.
 */
G.PKMSVVChampionArena=(()=>{
 const REGIONS=Object.freeze([
  ['Kanto',6,'Charizard'],['Johto',212,'Scizor'],['Hoenn',260,'Swampert'],
  ['Sinnoh',445,'Garchomp'],['Unova',530,'Excadrill'],
  ['Kalos',658,'Greninja'],['Alola',768,'Golisopod'],['Galar',870,'Falinks'],
  ['Paldea',998,'Baxcalibur'],['Votri Valley',149,'Dragonite']
 ]);
 const PREP_SECONDS=180,FIGHT_SECONDS=150;
 const $=id=>document.getElementById(id);
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 let region=0,stage='idle',round=0,elapsed=0,opp=null,bracket=[],target=null,active=false,paid=false,lastSecond=-1,semiLosers=[],lastPodium=null;
 const ROUNDS=['Vòng 16','Tứ kết','Bán kết','Chung kết','Tranh hạng ba'];
 const SEL=['Round of 16','Quarterfinal','Semifinal','Final','Reigning Champion'];
 const AI_POOL=[25,6,94,149,282,448,475,530,658,778,212,260,445,768,870,998];
 const rand=()=>Math.random();
 function ledger(save=G.DB?.save){
  if(!save)return null;
  save.arenas=save.arenas||{};
  save.arenas.pkmChampion=save.arenas.pkmChampion||{trophies:{},seals:{},rewards:{}};
  const book=save.arenas.pkmChampion;book.history=book.history||[];return book;
 }
 // A bracket seed is not a win; only player defeat of a real Enemy counts.
 function makeBracket(random=rand){
  const opponents=Array.from({length:15},(_,i)=>({
   id:'ai-'+i,name:'AI '+String(i+1).padStart(2,'0'),
   dex:AI_POOL[i%AI_POOL.length],
   tier:i<2?'elite':random()<.22?'elite':random()<.68?'trained':'novice'
  }));
  const shuffled=opponents.slice();
  for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  return [{id:'you',name:tr('Bạn','You'),dex:G.DB?.save?.partner||25,tier:'human'},...shuffled];
 }
 function aiWinner(a,b,random=rand){
  const p={elite:.68,trained:.5,novice:.35};
  return random()<(p[a.tier]||.5)/((p[a.tier]||.5)+(p[b.tier]||.5))?a:b;
 }
 function futureBracket(won){
  const next=[],losses=[];
  for(let i=0;i<bracket.length;i+=2){
   const a=bracket[i],b=bracket[i+1];
   if(a.id==='you'||b.id==='you'){const winner=a.id==='you'?(won?a:b):(won?b:a);
    next.push(winner);losses.push(winner===a?b:a);
   }else{const winner=aiWinner(a,b);next.push(winner);losses.push(winner===a?b:a);}
  }
  if(round===2)semiLosers=losses;
  bracket=next;
 }
 const playerOpponent=()=>{const at=bracket.findIndex(p=>p.id==='you');
  return at<0?null:bracket[at%2===0?at+1:at-1];};
 function menu(){
  const nav=document.querySelector('#scr-menu .menu-right .menu-list');
  if(!nav)return false;
  let btn=$('pkmsvv-champion-entry');
  if(!btn){
   btn=document.createElement('button');btn.id='pkmsvv-champion-entry';
   btn.className='menu-item pkmsvv-champion-menu';btn.type='button';
   btn.innerHTML='<span class="pkmsvv-champion-menu-icon">🏆</span><span class="pkmsvv-menu-copy"><span class="pkmsvv-menu-label">Arena</span><small>Solo 1v1 · Champion 16</small></span>';
   btn.addEventListener('click',open);
  }
  const mult=nav.querySelector('[data-go="multiplayer"]')||nav.querySelector('[data-go="play"]');
  if(mult)mult.after(btn);else nav.append(btn);
  const gate=G.PKMSVVStory?.arenaUnlocked?.();
  const p=G.PKMSVVStory?.multiplayerProgress?.();
  const small=btn.querySelector?.('small');
  if(small)small.textContent=gate?tr('16 chiến binh · 10 vùng','16 entrants · 10 regions'):
   (p?tr('🔒 Hoàn thành 3 chế độ: ','🔒 Complete 3 modes: ')+p.count+'/3':tr('🔒 Chưa mở khóa','🔒 Locked'));
  return true;
 }
 function panel(){
  let overlay=$('pkmsvv-champion-screen');if(overlay)return overlay;
  overlay=document.createElement('section');overlay.id='pkmsvv-champion-screen';
  overlay.className='pkmsvv-champion-overlay';overlay.hidden=true;
  overlay.innerHTML='<div class="pkmsvv-champion-panel" role="dialog" aria-modal="true" aria-labelledby="pkmsvv-champion-title">'+
   '<div class="pkmsvv-champion-heading"><h2 id="pkmsvv-champion-title">🏆 Arena · Champion</h2><button class="btn ghost" id="pkmsvv-champion-close" type="button">×</button></div>'+
   '<p id="pkmsvv-champion-info"></p><div id="pkmsvv-champion-regions" class="pkmsvv-champion-regions"></div>'+
   '<div class="pkmsvv-arena-mode-tabs"><button id="pkmsvv-arena-mode-solo" type="button" class="btn">⚔ Solo 1v1</button><button id="pkmsvv-arena-mode-champion" type="button" class="btn gold">🏆 Champion 16</button></div>'+
   '<div id="pkmsvv-champion-progress" class="pkmsvv-champion-progress"></div>'+'<div id="pkmsvv-champion-bracket" class="pkmsvv-champion-bracket"></div>'+'<div id="pkmsvv-champion-podium" class="pkmsvv-champion-podium" hidden></div>'+
   '<div class="pkmsvv-champion-actions"><button id="pkmsvv-champion-start" type="button" class="btn gold">Bắt đầu giải đấu</button>'+
   '<button id="pkmsvv-champion-rematch" type="button" class="btn gold" hidden>Thách đấu lại Champion</button>'+
   '<button id="pkmsvv-champion-ready" type="button" class="btn gold" hidden>Sẵn sàng</button></div></div>';
  document.body.append(overlay);
  $('pkmsvv-champion-close').onclick=()=>{overlay.hidden=true;if(active)returnToMenu();};
  $('pkmsvv-arena-mode-solo').onclick=()=>{overlay.hidden=true;G.PKMSVVArenaSolo?.open?.();};
  $('pkmsvv-arena-mode-champion').onclick=()=>updatePanel();
  $('pkmsvv-champion-start').onclick=start;
  $('pkmsvv-champion-rematch').onclick=rematch;
  $('pkmsvv-champion-ready').onclick=nextDuel;
  overlay.addEventListener('click',e=>{if(e.target===overlay&&!active)overlay.hidden=true;});
  return overlay;
 }
 function updatePanel(){
  const o=panel(),led=G.DB?.save?.arenas?.pkmChampion||{trophies:{},seals:{}};
  $('pkmsvv-champion-info').textContent=tr(
   'Giải 16 thí sinh · 4 vòng loại trực tiếp, 3 phút đánh quái trước MỖI vòng. Vô địch chung kết nhận cúp và Ấn Chứng.',
   '16 entrants, 4 knockout rounds, 3 minutes of monster farming before EACH round. Win the final for the trophy and Crown Seal.');
  const regionBox=$('pkmsvv-champion-regions');
  regionBox.replaceChildren();
  REGIONS.forEach(([name,dex,champion],i)=>{
   const b=document.createElement('button');b.type='button';b.className='pkmsvv-champion-region'+(region===i?' chosen':'');
   b.textContent=(led.seals?.[name]?'👑 ':led.trophies?.[name]?'🏆 ':'○ ')+name;
   b.disabled=active;
   b.onclick=()=>{region=i;updatePanel();};
   regionBox.append(b);
  });
  const progress=$('pkmsvv-champion-progress');
  progress.textContent=active?tr('Vòng ','Round ')+Math.min(round+1,4)+'/4 · '+(ROUNDS[round]||'')+
   (stage==='prep'?' · '+tr('Chuẩn bị ','Preparation ')+Math.ceil(PREP_SECONDS-elapsed)+'s':
    opp?' · VS '+opp.name:''):
   tr('Đã có ','Collected ')+Object.values(led.seals||{}).filter(Boolean).length+'/10 '+
   tr('Ấn Chứng Vương Miện.','Crown Seals.');
  const bracketEl=$('pkmsvv-champion-bracket');
  if(bracketEl)bracketEl.textContent=active?bracket.map((p,i)=>
   (i%2===0?'\n':' VS ')+(p.id==='you'?'⭐ ':'')+p.name).join(''):
   tr('Đã lưu ','Recorded ')+(led.history?.length||0)+tr(' giải đấu.',' tournaments.');
  $('pkmsvv-champion-start').hidden=active;
  const regionName=REGIONS[region][0];
  const replayTitle=!active&&!!led.trophies?.[regionName]&&!led.seals?.[regionName];
  $('pkmsvv-champion-rematch').hidden=!replayTitle;
  $('pkmsvv-champion-rematch').textContent=tr('⚔️ Thách đấu lại Champion','⚔️ Rematch Champion');
  $('pkmsvv-champion-ready').hidden=!active||stage!=='prep';
  $('pkmsvv-champion-ready').textContent=tr('Sẵn sàng đấu ngay','Fight now');
  $('pkmsvv-champion-start').disabled=!G.PKMSVVStory?.arenaUnlocked?.();
  o.hidden=false;
 }
 function open(){
  menu();
  const save=G.DB?.save;
  if(!save?.pkmsvvChapter3Seen){
   G.UI?.toast?.(tr('Hoàn thành Chương 4 để mở cốt truyện Arena.','Complete Chapter 4 to unlock the Arena story.'));
   return false;
  }
  if(!save.pkmsvvChapter5Seen){
   return !!G.PKMSVVStory?.chapter5?.(ok=>{if(ok)open();});
  }
  if(!G.PKMSVVStory?.allMultiplayerCompleted?.(save)&&
     !G.PKMSVVStory?.arenaUnlocked?.(save)){
   const missing=G.PKMSVVStory?.multiplayerProgress?.(save)?.missing||[];
   const names={coop:'Co-op',royale:'Sống Còn',eggrush:'Tranh Trứng'};
   G.UI?.toast?.(tr('🔒 Hoàn thành cả ba chế độ trước khi vào Arena. Còn: ','🔒 Finish all three multiplayer modes before Arena. Missing: ')+
    missing.map(m=>names[m]||m).join(', '),3800);
   return false;
  }
  if(!save.pkmsvvChapter6Seen){
   return !!G.PKMSVVStory?.chapter6?.(ok=>{if(ok)open();});
  }
  if(!G.PKMSVVStory?.arenaUnlocked?.(save))return false;
  updatePanel();return true;
 }
 function battleName(){
  const ch=REGIONS[region];
  return tr('Champion ','Champion ')+ch[0]+' · '+ch[2];
 }
 function spawn(){
  const pl=G.Game?.player;
  if(!pl||!G.Enemy||!G.EnemyMgr)return false;
  const c=REGIONS[region];
  opp=round===4?(semiLosers.find(x=>x.id!=='you')||{id:'ai-3rd',name:'AI',dex:c[1],tier:'elite'}):playerOpponent();
  if(!opp)return false;
  const dex=G.DEX_BY?.[opp.dex]?opp.dex:25;
  const targetName=G.DEX_BY?.[dex]?.name||opp.name;
  // Same baseline HP and movement for both sides. Skill builds still matter.
  pl._arenaOriginal={mon:pl.mon,maxHp:pl.maxHp,baseAtk:pl.baseAtk,baseSpd:pl.baseSpd,
   atkMul:pl.atkMul,spdMul:pl.spdMul};
  pl.mon={...pl.mon,hp:320,pa:130,sa:130,atk:130,df:110,sd:110,spd:112};
  pl.maxHp=320;pl.hp=320;pl.baseAtk=1.3;pl.baseSpd=112;
  pl.atkMul=1;pl.spdMul=1;
  const aiTier=opp.tier==='elite'?'elite':opp.tier==='trained'?'trained':'novice';
  const raw={dex,name:targetName,hp:320,spd:112,dmg:11,
   xp:0,behavior:'champion',shotCd:aiTier==='elite'?1.65:aiTier==='trained'?2.5:3.5};
  target=G.EnemyMgr.add(new G.Enemy(raw,pl.x+Math.min(300,190+round*15),pl.y-35,
    {hp:1,spd:1,dmg:1},true));
  target.pkmsvvChampion=true;
  target.skillCd=aiTier==='elite'?0.9:aiTier==='trained'?2.0:3.5;
  stage='fight';elapsed=0;lastSecond=-1;
  panel().hidden=true;
  G.UI?.toast?.(tr('Arena · ','Arena · ')+(ROUNDS[round]||'')+' — '+opp.name,3000);
  return true;
 }
 function launch(championOnly=false){
  if(active||!G.PKMSVVStory?.arenaUnlocked?.()||G.Coop?.active)return false;
  paid=false;round=0;elapsed=0;opp=null;target=null;semiLosers=[];lastPodium=null;
  bracket=makeBracket();
  active=true;stage='prep';
  G.Game.startRun(null);
  const zoneType=G.DEX_BY?.[REGIONS[region][1]]?.types?.[0]||'normal';
  G.World?.setArena?.({tx:0,ty:0,r:22,type:zoneType});
  if(G.Tiles?.arenaBiome)G.World?.setBiome?.(G.Tiles.arenaBiome(zoneType),true);
  const bar=$('pkmsvv-champion-hud')||document.createElement('div');
  bar.id='pkmsvv-champion-hud';bar.className='pkmsvv-champion-hud';
  document.body.append(bar);bar.hidden=false;
  beginPrep();return true;
 }
 function start(){return launch(false);}
 // Previous Champion rematch is superseded by the four-round title.
 function rematch(){return false;}
 function restoreStats(){
  const p=G.Game?.player,old=p?._arenaOriginal;
  if(!old)return;
  p.mon=old.mon;p.maxHp=old.maxHp;p.hp=Math.max(1,p.maxHp);
  p.baseAtk=old.baseAtk;p.baseSpd=old.baseSpd;
  p.atkMul=old.atkMul;p.spdMul=old.spdMul;
  delete p._arenaOriginal;
 }
 function beginPrep(){
  restoreStats();
  stage='prep';elapsed=0;lastSecond=-1;opp=null;target=null;
  G.World?.setArena?.(null);
  panel().hidden=true;
  let ready=$('pkmsvv-arena-ready-float');
  if(!ready){ready=document.createElement('button');ready.id='pkmsvv-arena-ready-float';
   ready.className='btn gold pkmsvv-arena-ready-float';
   ready.textContent=tr('⚔ Sẵn sàng đấu','⚔ Fight now');
   ready.addEventListener('click',nextDuel);document.body.append(ready);}
  ready.hidden=false;
  G.UI?.toast?.(tr('3 phút farm quái và nâng kỹ năng trước trận!','3 minutes of farming and skill upgrades before the duel!'),2800);
 }
 function settle(rank,cup=false){
  if(paid)return;
  paid=true;
  const save=G.DB?.save;if(!save)return;
  const book=ledger(save);const name=REGIONS[region][0];
  const tickets=rank===1?10:rank===2?6:rank===3?3:0;
  // One actual tournament finish, no grant for lobby/start/abandon.
  const arenaEarned=G.PKMSVVMegaGacha?.grantTournament?.(
   save,name,rank,!book.trophies[name])||0;
  if(arenaEarned)G.UI?.toast?.('✦ +'+arenaEarned+' Điểm Arena');
  // Rewards are paid once per successful rank per region. No infinite refresh farming.
  if(!book.rewards[name]||book.rewards[name].rank>rank){
   const old=book.rewards[name]?.tickets||0;
   const delta=Math.max(0,tickets-old);
   save.tickets=save.tickets||{t1:0,t10:0};
   save.tickets.t1=(Number(save.tickets.t1)||0)+delta;
   save.coins=(Number(save.coins)||0)+(rank===1?500:rank===2?350:rank===3?200:120);
   book.rewards[name]={rank,tickets};
  }
  if(cup)book.trophies[name]=true;
  G.DB.commit(true);
 }
 function claimSeal(){
  const save=G.DB?.save,book=ledger(save);if(!book)return;
  const name=REGIONS[region][0];
  if(!book.trophies[name])return; // never grant seal without an earned cup
  if(book.seals[name])return; // one Champion payout per region, forever
  const first=Object.values(book.seals).every(v=>v!==true);
  book.seals[name]=true;
  const arenaEarned=G.PKMSVVMegaGacha?.grantChampion?.(save,name)||0;
  if(arenaEarned)G.UI?.toast?.('👑 +100 Điểm Arena · Champion '+name);
  if(first&&!save.pkmsvvChapter7Seen)save.pkmsvvChapter7Pending=true;
  G.DB.commit(true);
 }
 function returnToMenu(){
  restoreStats();
  active=false;stage='idle';target=null;opp=null;
  G.World?.setArena?.(null);
  const bar=$('pkmsvv-champion-hud');if(bar)bar.hidden=true;
  const ready=$('pkmsvv-arena-ready-float');if(ready)ready.hidden=true;
  if(G.Game?.state!=='ui')G.Game?.toUI?.();
  G.Flow?.goMenu?.();
 }
 function done(reason,rank){
  if(!active)return;
  if(rank===2&&!lastPodium&&opp){
   lastPodium=[opp,{id:'you',name:tr('Bạn','You'),dex:G.DB?.save?.partner||25},
    semiLosers.length===2?aiWinner(semiLosers[0],semiLosers[1]):semiLosers[0]].filter(Boolean);
  }
  if(rank)settle(rank,rank===1);
  if(reason==='seal'){
   const book=ledger(G.DB?.save);
   if(book){book.history.push({region:REGIONS[region][0],dex:G.DB.save.partner,
    wins:4,rank:1,at:new Date().toISOString(),
    podium:lastPodium?.map(p=>({dex:p.dex,name:p.name}))||[]});
    if(book.history.length>75)book.history.shift();G.DB.commit(true);}
  }
  const label=reason==='seal'?tr('Đăng quang Champion! Nhận cúp và Ấn Chứng Vương Miện.','Champion crowned! Cup and Crown Seal awarded.'):
   reason==='title-loss'?tr('Thua Champion, nhưng vẫn giữ cúp vô địch.','Champion defeated you, but your cup is safe.'):
   tr('Kết thúc giải. Hạng ','Tournament over. Rank ')+rank;
  returnToMenu();
  updatePanel();
  $('pkmsvv-champion-progress').textContent=label;
  if(lastPodium)renderPodium(lastPodium);
  if(reason==='seal'&&G.DB?.save?.pkmsvvChapter7Pending&&
     !G.DB.save.pkmsvvChapter7Seen){
   panel().hidden=true;
   G.PKMSVVStory?.chapter7?.(()=>G.Flow?.goMenu?.());
  }
 }
 function nextDuel(){
  if(!active||stage!=='prep')return false;
  G.EnemyMgr?.clear?.();G.Pickups?.clear?.();G.Projectiles?.clear?.();G.Hazards?.clear?.();
  G.World?.setArena?.({tx:0,ty:0,r:20,type:'normal'});
  const pl=G.Game?.player;if(pl){pl.x=0;pl.y=100;pl.invuln=2;}
  const ready=$('pkmsvv-arena-ready-float');if(ready)ready.hidden=true;
  stage='fight';elapsed=0;lastSecond=-1;return spawn();
 }
 function update(dt){
  if(!active||G.Game?.state!=='playing')return;
  const pl=G.Game.player;
  if(!pl)return;
  if(pl.dead){
   if(round===2){futureBracket(false);round=4;pl.dead=false;pl.hp=Math.max(1,pl.maxHp);beginPrep();return;}
   done('lost',round===0?9:round===1?5:round===4?4:2);return;
  }
  elapsed+=Math.max(0,dt);
  const second=Math.floor(elapsed);
  if(lastSecond!==second){
   lastSecond=second;
   const bar=$('pkmsvv-champion-hud');
   if(bar)bar.textContent='🏆 '+REGIONS[region][0]+' · '+(ROUNDS[round]||'')+
    (stage==='fight'?' · '+Math.max(0,Math.ceil(FIGHT_SECONDS-elapsed))+'s':'');
   if(stage==='prep'){
    const label=$('pkmsvv-champion-progress');
    if(label)label.textContent=tr('Chuẩn bị trận tiếp theo: ','Next round in ')+
     Math.max(0,Math.ceil(PREP_SECONDS-elapsed))+'s · '+(ROUNDS[round]||'');
   }
  }
  if(stage==='prep'){
   if(elapsed>=PREP_SECONDS)nextDuel();
   return;
  }
  if(stage!=='fight')return;
  if(target?.dead){
   target=null;
   if(round===4){
    const title=aiWinner(bracket[0],bracket[1]);
    lastPodium=[title,bracket.find(p=>p!==title),
      {id:'you',name:tr('Bạn','You'),dex:G.DB?.save?.partner||25}].filter(Boolean);
    done('third',3);return;}
   if(round===3){
    lastPodium=[bracket.find(x=>x.id==='you'),bracket.find(x=>x.id!=='you'),
     semiLosers.length===2?aiWinner(semiLosers[0],semiLosers[1]):semiLosers[0]].filter(Boolean);
    settle(1,true);claimSeal();
    G.FX?.burst?.(pl.x,pl.y,'#ffe49c',55,250);
    done('seal',0);return;
   }
   futureBracket(true);round++;beginPrep();return;
  }
  if(elapsed>=FIGHT_SECONDS){
   if(pl.hp/Math.max(1,pl.maxHp)>(target?.hp||0)/Math.max(1,target?.maxHp||1)){
    target.dead=true;update(0);
   }else if(round===2){futureBracket(false);round=4;beginPrep();}
   else done('timeout',round===0?9:round===1?5:round===4?4:2);
  }
 }
 function renderPodium(podium){
  const box=$('pkmsvv-champion-podium');if(!box)return;
  box.hidden=false;box.replaceChildren();
  ['🥇','🥈','🥉'].forEach((symbol,i)=>{
   const p=podium[i];if(!p)return;
   const step=document.createElement('div');step.className='pkmsvv-champion-podium-place place-'+i;
   const art=G.UI?.spriteCanvas?.(p.dex,92,92,{scale:2,lively:true,hero:true});
   if(art)step.append(art);
   const name=document.createElement('strong');name.textContent=symbol+' '+p.name;
   step.append(name);box.append(step);
  });box.classList?.add?.('celebrate');
 }
 function exit(){if(active){returnToMenu();}const o=$('pkmsvv-champion-screen');if(o)o.hidden=true;}
 // Patch the live runtime rather than source js/game.js: Web/iOS and LAN builds
 // subsequently apply their own exact-code game patches. Wrappers compose safely.
 function guardUpdate(object,key,fn){
  const previous=object?.[key];if(typeof previous!=='function')return;
  object[key]=function(...args){return fn.call(this,previous,args);};
 }
 guardUpdate(G.Spawner,'update',function(original,args){
  if(!active)return original.apply(this,args);
  if(stage==='prep'){const copy=args.slice();if(copy.length>2)copy[2]=elapsed;
   return original.apply(this,copy);}
  return undefined;
 });
 guardUpdate(G.Rift,'update',function(original,args){
  return active?undefined:original.apply(this,args);
 });
 guardUpdate(G.Judgment,'update',function(original,args){
  return active?undefined:original.apply(this,args);
 });
 guardUpdate(G.EnemyMgr,'update',function(original,args){
  const out=original.apply(this,args);
  update(args[0]); // observe actual boss HP/death AFTER combat manager update
  return out;
 });
 // If menu is opened externally, create its entry without opening a match.
 const oldOpen=G.MenuUI?.open;
 if(typeof oldOpen==='function')G.MenuUI.open=function(...args){const out=oldOpen.apply(this,args);menu();return out;};
 // Do not intercept the real Multiplayer/Co-op click.
 // Chapter 5 is explicitly accessible through Memories and Arena intro.
 // In particular, first LAN access must never be blocked by a cutscene.
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',menu,{once:true});else menu();
 return {REGIONS,ROUNDS,PREP_SECONDS,FIGHT_SECONDS,makeBracket,aiWinner,open,start,rematch,exit,nextDuel,renderPodium,
  update,settle,claimSeal,ledger,get active(){return active},get stage(){return stage},get round(){return round},
  get opponent(){return opp}};
})();
