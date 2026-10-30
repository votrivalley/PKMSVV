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
 const clock=secs=>{const n=Math.max(0,Math.ceil(secs));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');};
 const DUEL_TYPES=['normal','fighting','psychic','steel','rock','ghost'];
 // Ten distinct built-in biomes; bespoke outlined stadium art is still pending.
 const REGION_THEMES=['fire','steel','water','ground','rock','dark','bug','fighting','ice','dragon'];
 const FARM_SPAWN_MULT=2,FARM_XP_MULT=2;
 const $=id=>document.getElementById(id);
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 let region=0,stage='idle',round=0,elapsed=0,opp=null,bracket=[],target=null,active=false,paid=false,lastSecond=-1,semiLosers=[],lastPodium=null,mode='story',mapChoice='random',duelType='normal';
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
 // Exactly two strong AI with 13 randomized others; shuffle player position too.
 function makeBracket(random=rand){
  const opponents=Array.from({length:15},(_,i)=>({id:'ai-'+i,name:'AI '+String(i+1).padStart(2,'0'),
   dex:AI_POOL[Math.min(AI_POOL.length-1,Math.floor(random()*AI_POOL.length))],
   tier:i<2?'elite':random()<Math.min(.85,.38+region*.05)?'trained':'novice'}));
  const seats=[{id:'you',name:tr('Bạn','You'),dex:G.DB?.save?.partner||25,tier:'human'},...opponents];
  for(let i=seats.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[seats[i],seats[j]]=[seats[j],seats[i]];}
  return seats;
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
 function regionUnlocked(index,save=G.DB?.save){
  if(!Number.isInteger(index)||index<0||index>=REGIONS.length)return false;
  if(index===0)return true;
  const seals=save?.arenas?.pkmChampion?.seals||{};
  return seals[REGIONS[index][0]]===true||REGIONS.slice(0,index).every(([name])=>seals[name]===true);
 }
 function storyCompleted(save=G.DB?.save){return REGIONS.every(([name])=>save?.arenas?.pkmChampion?.seals?.[name]===true);}
 function nextStoryRegion(save=G.DB?.save){const seals=save?.arenas?.pkmChampion?.seals||{};
  const index=REGIONS.findIndex(([name],i)=>seals[name]!==true&&regionUnlocked(i,save));return index<0?0:index;}
 function clearResult(){lastPodium=null;const box=$('pkmsvv-champion-podium');if(box){box.hidden=true;box.replaceChildren?.();box.classList?.remove?.('celebrate');}}
 function menu(){
  const nav=document.querySelector('#scr-menu .menu-right .menu-list');
  if(!nav)return false;
  let btn=$('pkmsvv-champion-entry');
  if(!btn){
   btn=document.createElement('button');btn.id='pkmsvv-champion-entry';
   btn.className='menu-item pkmsvv-champion-menu';btn.type='button';
   btn.innerHTML='<span class="pkmsvv-champion-menu-icon">🏆</span><span class="pkmsvv-menu-copy"><span class="pkmsvv-menu-label">Arena</span><small>Hành Trình Vương Miện · Giải Champion</small></span>';
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
   '<div class="pkmsvv-arena-mode-tabs"><button id="pkmsvv-arena-mode-solo" type="button" class="btn">⚔ Solo 1v1</button><button id="pkmsvv-arena-mode-champion" type="button" class="btn gold">📜 Hành Trình Vương Miện</button><button id="pkmsvv-arena-mode-league" type="button" class="btn">🏆 Giải Champion</button></div>'+
   '<div id="pkmsvv-champion-map-row" class="pkmsvv-champion-map-row" hidden><label for="pkmsvv-champion-map">Sân thi đấu</label><select id="pkmsvv-champion-map"></select><small>Đấu với AI trong bản thử nghiệm; đấu với bạn bè qua LAN sẽ phát triển sau.</small></div>'+ 
    '<div id="pkmsvv-champion-progress" class="pkmsvv-champion-progress"></div>'+'<div id="pkmsvv-champion-bracket" class="pkmsvv-champion-bracket"></div>'+'<div id="pkmsvv-champion-hall" class="pkmsvv-champion-hall"></div>'+'<div id="pkmsvv-champion-podium" class="pkmsvv-champion-podium" hidden></div>'+
   '<div class="pkmsvv-champion-actions"><button id="pkmsvv-champion-start" type="button" class="btn gold">Bắt đầu giải đấu</button>'+
   '<button id="pkmsvv-champion-rematch" type="button" class="btn gold" hidden>Thách đấu lại Champion</button>'+
   '<button id="pkmsvv-champion-ready" type="button" class="btn gold" hidden>Sẵn sàng</button></div></div>';
  document.body.append(overlay);
  $('pkmsvv-champion-close').onclick=()=>{overlay.hidden=true;clearResult();if(active)returnToMenu();};
  $('pkmsvv-arena-mode-solo').onclick=()=>{overlay.hidden=true;G.PKMSVVArenaSolo?.open?.();};
  $('pkmsvv-arena-mode-champion').onclick=()=>{mode='story';clearResult();updatePanel();};
   $('pkmsvv-arena-mode-league').onclick=()=>{if(!storyCompleted())return;mode='league';clearResult();updatePanel();};
   $('pkmsvv-champion-map').onchange=()=>{mapChoice=String($('pkmsvv-champion-map').value||'random');};
  $('pkmsvv-champion-start').onclick=start;
  $('pkmsvv-champion-rematch').onclick=rematch;
  $('pkmsvv-champion-ready').onclick=()=>{if(active&&elapsed>=PREP_SECONDS)nextDuel();};
  overlay.addEventListener('click',e=>{if(e.target===overlay&&!active){overlay.hidden=true;clearResult();}});
  return overlay;
 }
 function updatePanel(){
  const o=panel(),led=G.DB?.save?.arenas?.pkmChampion||{trophies:{},seals:{}};
  $('pkmsvv-champion-info').textContent=mode==='story'?tr(
   'Hành Trình Vương Miện: mở 10 vùng lần lượt, farm 3 phút mỗi vòng; chỉ nhận thưởng một lần.',
   'Crown Journey: 10 regions in order, 3-minute farm per round; rewards once only.'):
   tr('Giải Champion: 16 suất với 2 AI mạnh. Bản này đấu với AI; LAN nhiều người sẽ cập nhật sau.',
   'Champion League: 16 slots and 2 elite AI. This build supports AI-only matches, LAN PvP is coming later.');
  const leagueTab=$('pkmsvv-arena-mode-league');leagueTab.disabled=!storyCompleted();
  leagueTab.classList?.toggle?.('gold',mode==='league');
  $('pkmsvv-arena-mode-champion').classList?.toggle?.('gold',mode==='story');
  const mapRow=$('pkmsvv-champion-map-row');if(mapRow)mapRow.hidden=mode!=='league';
  const chooser=$('pkmsvv-champion-map');if(chooser&&mode==='league'){
   chooser.replaceChildren();
   for(const [v,label] of [['random',tr('🎲 Ngẫu nhiên','🎲 Random')],...REGIONS.map(([name],i)=>[String(i),name])]){
    const option=document.createElement('option');option.value=v;option.textContent=label;option.selected=mapChoice===v;chooser.append(option);
   }
  }
  const regionBox=$('pkmsvv-champion-regions');
  regionBox.replaceChildren();regionBox.hidden=mode==='league';
  REGIONS.forEach(([name,dex,champion],i)=>{
   const b=document.createElement('button');b.type='button';b.className='pkmsvv-champion-region'+(region===i?' chosen':'');
   b.textContent=(led.seals?.[name]?'👑 ':led.trophies?.[name]?'🏆 ':regionUnlocked(i)?'○ ':'🔒 ')+name;
   b.disabled=active||mode==='league'||!regionUnlocked(i);
   b.onclick=()=>{region=i;clearResult();updatePanel();};
   regionBox.append(b);
  });
  const progress=$('pkmsvv-champion-progress');
  progress.textContent=active?tr('Vòng ','Round ')+Math.min(round+1,4)+'/4 · '+(ROUNDS[round]||'')+
   (stage==='prep'?' · '+tr('Vào trận sau ','Battle in ')+clock(PREP_SECONDS-elapsed):
    opp?' · VS '+opp.name:''):
   tr('Đã có ','Collected ')+Object.values(led.seals||{}).filter(Boolean).length+'/10 '+
   tr('Ấn Chứng Vương Miện.','Crown Seals.');
  const bracketEl=$('pkmsvv-champion-bracket');
  if(bracketEl)bracketEl.textContent=active?bracket.map((p,i)=>
   (i%2===0?'\n':' VS ')+(p.id==='you'?'⭐ ':'')+p.name).join(''):
   tr('Đã lưu ','Recorded ')+(led.history?.length||0)+tr(' giải đấu.',' tournaments.');
  const hall=$('pkmsvv-champion-hall');
  if(hall){const past=(led.history||[]).slice(-5).reverse();
   hall.textContent=past.length?tr('Sảnh Danh Vọng: ','Hall of Fame: ')+
    past.map(x=>'🏆 '+x.region+' · '+(G.DEX_BY?.[x.dex]?.name||'Pokémon')+
    ' · '+(x.wins||4)+tr(' trận thắng',' wins')).join(' | '):
    tr('Chưa có cúp Champion nào trong hồ sơ.','No recorded Champion titles yet.');
  }
  $('pkmsvv-champion-start').hidden=active;
  const regionName=REGIONS[region][0];
  const replayTitle=!active&&!!led.trophies?.[regionName]&&!led.seals?.[regionName];
  $('pkmsvv-champion-rematch').hidden=!replayTitle;
  $('pkmsvv-champion-rematch').textContent=tr('⚔️ Thách đấu lại Champion','⚔️ Rematch Champion');
  // Champion prep is mandatory; never expose a button that skips its timer.
  $('pkmsvv-champion-ready').hidden=true;
  $('pkmsvv-champion-ready').disabled=true;
  $('pkmsvv-champion-start').disabled=!G.PKMSVVStory?.arenaUnlocked?.()||(mode==='story'?!regionUnlocked(region):!storyCompleted());
  $('pkmsvv-champion-start').textContent=mode==='story'?tr('Bắt đầu Hành Trình Vương Miện','Start Crown Journey'):tr('Bắt đầu Giải Champion · AI','Start Champion League · AI');
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
  mode='story';region=nextStoryRegion(save);clearResult();updatePanel();return true;
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
  const power=region;
  const cadence=Math.max(.67,1-.035*power);
  const raw={dex,name:targetName,hp:320+22*power+5*round,spd:112,
    dmg:Math.round((11+.64*power+.15*round)*10)/10,xp:0,behavior:'champion',
    shotCd:(aiTier==='elite'?1.65:aiTier==='trained'?2.5:3.5)*cadence};
  target=G.EnemyMgr.add(new G.Enemy(raw,pl.x+Math.min(300,190+round*15),pl.y-35,
    {hp:1,spd:1,dmg:1},true));

  // Duel opponents still use boss combat mechanics, but MUST draw like normal
  // player Pokémon rather than the enlarged boss species artwork.
  if(target&&G.Sprites){
   const visualScale=G.Sprites.playerScale?.(dex);
   if(Number.isFinite(visualScale)&&visualScale>0){
    target.scale=visualScale;
    if(G.Sprites.Animator)target.anim=new G.Sprites.Animator(dex,visualScale,!!target.shiny);
    target.r=G.Sprites.bodyRadius?.(dex,visualScale)??target.r;
    target.bodyH=G.Sprites.bodyHeight?.(dex,visualScale)??target.bodyH;
   }
  }
  target.pkmsvvChampion=true;
  target.skillCd=(aiTier==='elite'?0.9:aiTier==='trained'?2.0:3.5)*cadence;
  stage='fight';elapsed=0;lastSecond=-1;
  panel().hidden=true;
  G.UI?.toast?.(tr('Arena · ','Arena · ')+(ROUNDS[round]||'')+' — '+opp.name,3000);
  return true;
 }
 function launch(championOnly=false){
  if(active||!G.PKMSVVStory?.arenaUnlocked?.()||G.Coop?.active)return false;
  if(mode==='story'&&!regionUnlocked(region)||mode==='league'&&!storyCompleted())return false;
  paid=false;round=0;elapsed=0;opp=null;target=null;semiLosers=[];lastPodium=null;
  bracket=makeBracket();
  duelType=mode==='story'?REGION_THEMES[region]:(mapChoice==='random'?REGION_THEMES[Math.floor(rand()*REGION_THEMES.length)]:REGION_THEMES[Math.max(0,Math.min(9,Number(mapChoice)||0))]);
  active=true;stage='prep';
  G.Game.startRun(null);
  const zoneType=mode==='league'?'normal':duelType;
  G.World?.setArena?.({tx:0,ty:0,r:22,type:zoneType});
  if(G.Tiles?.arenaBiome)G.World?.setBiome?.(G.Tiles.arenaBiome(duelType),true);
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
  G.World?.setBiome?.(0,true); // farm area reset after 1v1
  panel().hidden=true;
  // Previous builds created a floating skip button. Suppress it in timed Champion.
  const ready=$('pkmsvv-arena-ready-float');if(ready){ready.hidden=true;ready.disabled=true;}
  G.UI?.toast?.(tr('3 phút farm: quái ×2 và EXP ×2 trước trận!','3-minute preparation: 2x monsters and 2x EXP!'),2800);
 }
 function settle(rank,cup=false){
  if(paid)return;
  paid=true;
  const save=G.DB?.save;if(!save)return;
  const book=ledger(save);const name=REGIONS[region][0];
  const tickets=rank===1?10:rank===2?6:rank===3?3:0;
  if(mode==='league'){
   const points=G.PKMSVVMegaGacha?.grantTournament?.(save,'League',rank,false)||0;
   if(points)G.UI?.toast?.('✦ +'+points+' Điểm Arena · Giải Champion');
   G.DB.commit(true);return;
  }
  if(book.seals[name]===true)return; // No PokéCoins, tickets or Arena Points on story replay.
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
  if(mode!=='story')return; // Only Crown Journey can mint one-time regional seals.
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
  if(reason==='seal'&&mode==='story'){
   const book=ledger(G.DB?.save);
   if(book){book.history.push({region:REGIONS[region][0],dex:G.DB.save.partner,
    wins:4,rank:1,at:new Date().toISOString(),
    podium:lastPodium?.map(p=>({dex:p.dex,name:p.name}))||[]});
    if(book.history.length>75)book.history.shift();G.DB.commit(true);}
  }
  const label=reason==='seal'?(mode==='league'?tr('Hoàn thành Giải Champion!','Champion League complete!'):tr('Đăng quang Champion! Ấn Chứng đã lưu nếu lần đầu thắng.','Champion crowned! First-time Crown Seal recorded.')):
   reason==='title-loss'?tr('Thua Champion, nhưng vẫn giữ cúp vô địch.','Champion defeated you, but your cup is safe.'):
   tr('Kết thúc giải. Hạng ','Tournament over. Rank ')+rank;
  returnToMenu();
  updatePanel();
  $('pkmsvv-champion-progress').textContent=label;
  if(lastPodium)renderPodium(lastPodium);
  if(reason==='seal'&&mode==='story'&&G.DB?.save?.pkmsvvChapter7Pending&&
     !G.DB.save.pkmsvvChapter7Seen){
   panel().hidden=true;
   G.PKMSVVStory?.chapter7?.(()=>G.Flow?.goMenu?.());
  }
 }
 function nextDuel(){
  if(!active||stage!=='prep')return false;
  G.EnemyMgr?.clear?.();G.Pickups?.clear?.();G.Projectiles?.clear?.();G.Hazards?.clear?.();
  const surfaceType=mode==='league'?'normal':duelType;
  G.World?.setArena?.({tx:0,ty:0,r:20,type:surfaceType});
  if(G.Tiles?.arenaBiome)G.World?.setBiome?.(G.Tiles.arenaBiome(duelType),true);
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
    (stage==='fight'?' · '+clock(FIGHT_SECONDS-elapsed):' · '+tr('Vào trận sau ','Battle in ')+clock(PREP_SECONDS-elapsed));
   if(stage==='prep'){
    const label=$('pkmsvv-champion-progress');
    if(label)label.textContent=tr('Chuẩn bị trận tiếp theo: ','Next round in ')+
     clock(PREP_SECONDS-elapsed)+' · '+(ROUNDS[round]||'');
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
 function exit(){clearResult();if(active){returnToMenu();}const o=$('pkmsvv-champion-screen');if(o)o.hidden=true;}
 // Patch the live runtime rather than source js/game.js: Web/iOS and LAN builds
 // subsequently apply their own exact-code game patches. Wrappers compose safely.
 function guardUpdate(object,key,fn){
  const previous=object?.[key];if(typeof previous!=='function')return;
  object[key]=function(...args){return fn.call(this,previous,args);};
 }
 guardUpdate(G.Spawner,'update',function(original,args){
  if(!active)return original.apply(this,args);
  if(stage==='prep'){const copy=args.slice();if(copy.length>2)copy[2]=elapsed;
   if(copy.length>0)copy[0]=Math.max(0,Number(copy[0])||0)*FARM_SPAWN_MULT;
   return original.apply(this,copy);}
  return undefined;
 });
 // Double XP applies strictly to the farming phases, never boss kills.
 guardUpdate(G.Pickups,'dropXp',function(original,args){
  if(active&&stage==='prep'){
   const copy=args.slice();copy[2]=Math.max(0,Number(copy[2])||0)*FARM_XP_MULT;
   return original.apply(this,copy);
  }
  return original.apply(this,args);
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
 return {REGIONS,REGION_THEMES,regionUnlocked,storyCompleted,ROUNDS,PREP_SECONDS,FIGHT_SECONDS,makeBracket,aiWinner,open,start,rematch,exit,nextDuel,renderPodium,
  update,settle,claimSeal,ledger,get active(){return active},get stage(){return stage},get round(){return round},
  get opponent(){return opp}};
})();
