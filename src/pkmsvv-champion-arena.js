'use strict';
/* Crown Arena — real SOLO boss combat with a 16-entrant knockout bracket.
 * The other seven matches in round 1 are simulated, never paid as human wins.
 * 3-minute inter-round preparation; Champion defence is a fifth real duel.
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
 let region=0,stage='idle',round=0,elapsed=0,opp=null,bracket=[],target=null,active=false,paid=false;
 const ROUNDS=['Vòng 16','Tứ kết','Bán kết','Chung kết','Thách đấu Champion'];
 const SEL=['Round of 16','Quarterfinal','Semifinal','Final','Reigning Champion'];
 const AI_POOL=[25,6,94,149,282,448,475,530,658,778,212,260,445,768,870,998];
 const rand=()=>Math.random();
 function ledger(save=G.DB?.save){
  if(!save)return null;
  save.arenas=save.arenas||{};
  save.arenas.pkmChampion=save.arenas.pkmChampion||{trophies:{},seals:{},rewards:{}};
  return save.arenas.pkmChampion;
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
  const next=[];
  for(let i=0;i<bracket.length;i+=2){
   const a=bracket[i],b=bracket[i+1];
   if(a.id==='you'||b.id==='you'){
    if(won)next.push(a.id==='you'?a:b);
   }else next.push(aiWinner(a,b));
  }
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
   btn.innerHTML='<span class="pkmsvv-champion-menu-icon">🏆</span><span class="pkmsvv-menu-copy"><span class="pkmsvv-menu-label">Arena · Champion</span><small>16 chiến binh · 10 vùng</small></span>';
   btn.addEventListener('click',open);
  }
  const mult=nav.querySelector('[data-go="multiplayer"]')||nav.querySelector('[data-go="play"]');
  if(mult)mult.after(btn);else nav.append(btn);
  return true;
 }
 function panel(){
  let overlay=$('pkmsvv-champion-screen');if(overlay)return overlay;
  overlay=document.createElement('section');overlay.id='pkmsvv-champion-screen';
  overlay.className='pkmsvv-champion-overlay';overlay.hidden=true;
  overlay.innerHTML='<div class="pkmsvv-champion-panel" role="dialog" aria-modal="true" aria-labelledby="pkmsvv-champion-title">'+
   '<div class="pkmsvv-champion-heading"><h2 id="pkmsvv-champion-title">🏆 Arena · Champion</h2><button class="btn ghost" id="pkmsvv-champion-close" type="button">×</button></div>'+
   '<p id="pkmsvv-champion-info"></p><div id="pkmsvv-champion-regions" class="pkmsvv-champion-regions"></div>'+
   '<div id="pkmsvv-champion-progress" class="pkmsvv-champion-progress"></div>'+
   '<div class="pkmsvv-champion-actions"><button id="pkmsvv-champion-start" type="button" class="btn gold">Bắt đầu giải đấu</button>'+
   '<button id="pkmsvv-champion-ready" type="button" class="btn gold" hidden>Sẵn sàng</button></div></div>';
  document.body.append(overlay);
  $('pkmsvv-champion-close').onclick=()=>{overlay.hidden=true;if(active)returnToMenu();};
  $('pkmsvv-champion-start').onclick=start;
  $('pkmsvv-champion-ready').onclick=nextDuel;
  overlay.addEventListener('click',e=>{if(e.target===overlay&&!active)overlay.hidden=true;});
  return overlay;
 }
 function updatePanel(){
  const o=panel(),led=G.DB?.save?.arenas?.pkmChampion||{trophies:{},seals:{}};
  $('pkmsvv-champion-info').textContent=tr(
   'Giải 16 thí sinh · 4 vòng loại trực tiếp · 3 phút chuẩn bị giữa các vòng. Đoạt cúp rồi hạ Champion đương nhiệm để nhận Ấn Chứng.',
   '16 entrants · 4 knockout rounds · up to 3 minutes preparation between rounds. Win the cup, then defeat the reigning Champion for a Crown Seal.');
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
  progress.textContent=active?tr('Vòng ','Round ')+Math.min(round+1,5)+'/5 · '+(ROUNDS[round]||'')+
   (stage==='prep'?' · '+tr('Chuẩn bị ','Preparation ')+Math.ceil(PREP_SECONDS-elapsed)+'s':
    opp?' · VS '+opp.name:''):
   tr('Đã có ','Collected ')+Object.values(led.seals||{}).filter(Boolean).length+'/10 '+
   tr('Ấn Chứng Vương Miện.','Crown Seals.');
  $('pkmsvv-champion-start').hidden=active;
  $('pkmsvv-champion-ready').hidden=!active||stage!=='prep';
  $('pkmsvv-champion-ready').textContent=tr('Sẵn sàng đấu ngay','Fight now');
  $('pkmsvv-champion-start').disabled=!G.DB?.save?.pkmsvvChapter6Seen;
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
  if(!save.pkmsvvChapter6Seen){
   return !!G.PKMSVVStory?.chapter6?.(ok=>{if(ok)open();});
  }
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
  opp=round===4?{id:'champion',name:battleName(),dex:c[1],tier:'elite'}:playerOpponent();
  if(!opp)return false;
  const dex=G.DEX_BY?.[opp.dex]?opp.dex:25;
  const targetName=G.DEX_BY?.[dex]?.name||opp.name;
  const raw={dex,name:targetName,hp:180+round*80,spd:48+round*5,dmg:10+round*2,
   xp:0,behavior:'champion',shotCd:3};
  target=G.EnemyMgr.add(new G.Enemy(raw,pl.x+Math.min(300,190+round*15),pl.y-35,
    {hp:1,spd:1,dmg:1},true));
  target.pkmsvvChampion=true;
  stage='fight';elapsed=0;
  panel().hidden=true;
  G.UI?.toast?.(tr('Arena · ','Arena · ')+(ROUNDS[round]||'')+' — '+opp.name,3000);
  return true;
 }
 function start(){
  if(active||!G.DB?.save?.pkmsvvChapter6Seen||G.Coop?.active)return false;
  paid=false;round=0;elapsed=0;opp=null;target=null;
  bracket=makeBracket();
  active=true;stage='fight';
  G.Game.startRun(null);
  if(!spawn()){active=false;stage='idle';return false;}
  return true;
 }
 function settle(rank,cup=false){
  if(paid)return;
  paid=true;
  const save=G.DB?.save;if(!save)return;
  const book=ledger(save);const name=REGIONS[region][0];
  const tickets=rank===1?10:rank===2?6:rank===3?3:0;
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
  book.seals[name]=true;
  G.DB.commit(true);
 }
 function returnToMenu(){
  active=false;stage='idle';target=null;opp=null;
  if(G.Game?.state!=='ui')G.Game?.toUI?.();
  G.Flow?.goMenu?.();
 }
 function done(reason,rank){
  if(!active)return;
  if(rank)settle(rank,rank===1);
  if(reason==='seal')claimSeal();
  const label=reason==='seal'?tr('Đã đánh bại Champion! Nhận Ấn Chứng Vương Miện.','Champion defeated! Crown Seal obtained.'):
   reason==='title-loss'?tr('Thua Champion, nhưng vẫn giữ cúp vô địch.','Champion defeated you, but your cup is safe.'):
   tr('Kết thúc giải. Hạng ','Tournament over. Rank ')+rank;
  returnToMenu();
  updatePanel();
  $('pkmsvv-champion-progress').textContent=label;
 }
 function nextDuel(){
  if(!active||stage!=='prep')return false;
  stage='fight';elapsed=0;
  return spawn();
 }
 function update(dt){
  if(!active||G.Game?.state!=='playing')return;
  const pl=G.Game.player;
  if(!pl)return;
  if(pl.dead){
   if(round===4){done('title-loss',0);return;}
   done('lost',round===0?9:round===1?5:round===2?3:2);
   return;
  }
  elapsed+=Math.max(0,dt);
  if(stage==='prep'){
   if(elapsed>=PREP_SECONDS)nextDuel();
   return;
  }
  if(stage!=='fight')return;
  if(target?.dead){
   target=null;
   if(round===4){done('seal',0);return;}
   futureBracket(true);round++;
   if(round===4){
    settle(1,true);
    stage='prep';elapsed=0;opp=null;
    updatePanel();
   }else{
    stage='prep';elapsed=0;opp=null;
    updatePanel();
   }
   return;
  }
  if(elapsed>=FIGHT_SECONDS){
   if(round===4)done('title-loss',0);
   else done('timeout',round===0?9:round===1?5:round===2?3:2);
  }
 }
 function exit(){if(active){returnToMenu();}const o=$('pkmsvv-champion-screen');if(o)o.hidden=true;}
 // Patch the live runtime rather than source js/game.js: Web/iOS and LAN builds
 // subsequently apply their own exact-code game patches. Wrappers compose safely.
 function guardUpdate(object,key,fn){
  const previous=object?.[key];if(typeof previous!=='function')return;
  object[key]=function(...args){return fn.call(this,previous,args);};
 }
 guardUpdate(G.Spawner,'update',function(original,args){
  return active?undefined:original.apply(this,args);
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
 document.addEventListener('click',e=>{
  const link=e.target?.closest?.('[data-go="multiplayer"],#pkmsvv-coop-lan-entry');
  if(!link||!G.DB?.save?.pkmsvvChapter3Seen||G.DB.save.pkmsvvChapter5Seen)return;
  e.preventDefault();e.stopImmediatePropagation();
  G.PKMSVVStory?.chapter5?.(ok=>{if(ok)link.click();});
 },true);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',menu,{once:true});else menu();
 return {REGIONS,ROUNDS,PREP_SECONDS,FIGHT_SECONDS,makeBracket,aiWinner,open,start,exit,nextDuel,
  update,settle,claimSeal,ledger,get active(){return active},get stage(){return stage},get round(){return round},
  get opponent(){return opp}};
})();
