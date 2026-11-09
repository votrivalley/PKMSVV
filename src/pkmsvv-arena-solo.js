'use strict';
/* Arena Solo 1v1 OFFLINE AI beta.
 * Prep phase is a separate solo map with its own simulated AI preparation.
 * Real LAN PvP requires host-authenticated remote player damage replication:
 * do NOT mislabel an Enemy AI as a connected human.
 */
G.PKMSVVArenaSolo=(()=>{
 const PREP_MIN=600,PREP_MAX=900,WARN=30,SELECT=10,INTRO=3,DUEL_LIMIT=240,SHRINK_FROM=150;
 const $=id=>document.getElementById(id);
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const pool=[6,25,94,149,212,260,282,445,448,475,530,658,768,778,870,998];
 // Use built-in neutral biomes; no unlicensed third-party map assets.
 const DUEL_TYPES=['normal','fighting','psychic','steel','rock','ghost'];
 const FARM_SPAWN_MULT=2,FARM_XP_MULT=2;
 let startingOwnRun=false,fightCue=0;
 let active=false,stage='idle',prepTotal=0,elapsed=0,opponent=null,target=null,selected=null,selectedInstanceId=null,selectedShiny=false,enemyDex=null,lastSecond=-1,shrunk=0,duelType='normal',aiFactor=1;
 const canEnter=()=>!!(G.PKMSVVStory?.arenaUnlocked?.()&&!G.Coop?.active);
 function owned(){
  // Only the six individual slots explicitly assembled in PokéBox qualify.
  return G.PKMSVVBoxHub?.arenaReady?.(G.DB?.save)||[];
 }
 function preferredReady(choices=owned()){
  const s=G.DB?.save||{};
  return choices.find(x=>x.id===s.pkmsvvSelectedInstanceId)||
   choices.find(x=>x.dex===Number(s.partner)&&x.shiny===!!s.partnerShiny)||
   choices[0]||null;
 }
 function selectReady(item){
  if(!item||!owned().some(x=>x.id===item.id))return false;
  selected=item.dex;selectedInstanceId=item.id;selectedShiny=!!item.shiny;return true;
 }
 function chooseEnemy(choices=pool,random=Math.random){
  const possibilities=choices.filter(d=>d!==selected&&G.DEX_BY?.[d]);
  return possibilities[Math.min(possibilities.length-1,Math.floor(random()*possibilities.length))]||25;
 }
 function frame(){
  let screen=$('pkmsvv-arena-solo-screen');
  if(screen)return screen;
  screen=document.createElement('section');screen.id='pkmsvv-arena-solo-screen';
  screen.className='pkmsvv-arena-solo-screen';screen.hidden=true;
  screen.innerHTML='<div class="pkmsvv-arena-solo-card" role="dialog" aria-modal="true">'+
   '<h2>⚔ Arena · Solo 1v1</h2>'+
   '<p id="pkmsvv-arena-solo-info"></p>'+
   '<div id="pkmsvv-arena-solo-picks" class="pkmsvv-arena-solo-picks"></div>'+
   '<div id="pkmsvv-arena-solo-vs" class="pkmsvv-arena-solo-vs"></div>'+
   '<div class="pkmsvv-arena-solo-controls">'+
   '<button class="btn gold" type="button" id="pkmsvv-arena-solo-play">🤖 Random AI</button>'+ 
   '<button class="btn ghost" type="button" id="pkmsvv-arena-solo-invite">🤝 Mời người chơi</button>'+
   '<button class="btn gold" type="button" id="pkmsvv-arena-solo-confirm" hidden>'+tr('✓ Xác nhận Pokémon','✓ Confirm Pokémon')+'</button>'+ 
   '<button class="btn ghost" type="button" id="pkmsvv-arena-solo-close">Đóng</button></div></div>';
  document.body.append(screen);
  $('pkmsvv-arena-solo-play').onclick=()=>start(); // click handler must not pass PointerEvent as the RNG function
  $('pkmsvv-arena-solo-invite').onclick=()=>{
   if(active)return;
   screen.hidden=true;
   if(typeof window!=='undefined'&&window.PKMSVVCoop?.open)window.PKMSVVCoop.open('arena');
   else G.UI?.toast?.(tr('Mời bạn qua Arena Solo trên PC Host / Wi-Fi.','Invite a friend via Arena Solo on PC Host / Wi-Fi.'));
  };
  $('pkmsvv-arena-solo-close').onclick=()=>{if(active)abort();else screen.hidden=true;};
  $('pkmsvv-arena-solo-confirm').onclick=()=>{if(active&&stage==='select')startIntro();};
  return screen;
 }
 function open(){
  if(!canEnter()){
   G.UI?.toast?.(tr('🔒 Hoàn thành Chương 7 để mở Arena.','🔒 Complete Chapter 7 to unlock Arena.'));
   return false;
  }
  const screen=frame();screen.hidden=false;
  $('pkmsvv-arena-solo-play').hidden=false;
  $('pkmsvv-arena-solo-invite').hidden=false;
  $('pkmsvv-arena-solo-confirm').hidden=true;
  $('pkmsvv-arena-solo-info').textContent=tr(
   'Chọn Random AI (90–120% chỉ số của bạn) hoặc Mời người chơi qua Wi-Fi. AI: chuẩn bị 10–15 phút, cảnh báo 30 giây, chọn Pokémon 10 giây.',
   'Choose Random AI (90–120% of your stats) or Invite a real player via Wi-Fi. AI: 10–15-minute preparation, 30-second warning and 10-second Pokémon pick.');
  $('pkmsvv-arena-solo-picks').replaceChildren();
  $('pkmsvv-arena-solo-vs').textContent=tr('Đối thủ AI sẽ được bốc ngẫu nhiên.','AI opponent is chosen at random.');
  return true;
 }
 function countView(value){
  let el=$('pkmsvv-arena-solo-countdown');
  if(!el){el=document.createElement('div');el.id='pkmsvv-arena-solo-countdown';
   el.className='pkmsvv-arena-solo-countdown';document.body.append(el);}
  el.hidden=false;el.textContent=value;return el;
 }
 function hideCountView(){const el=$('pkmsvv-arena-solo-countdown');if(el)el.hidden=true;}
 function reset(){
  active=false;stage='idle';target=null;opponent=null;lastSecond=-1;fightCue=0;
  selectedInstanceId=null;selectedShiny=false;
  hideCountView();
  G.World?.setArena?.(null);
  const hud=$('pkmsvv-arena-solo-hud');if(hud)hud.hidden=true;
  const screen=$('pkmsvv-arena-solo-screen');if(screen)screen.hidden=true;
 }
 function finish(win){
  if(!active)return;
  const result=win?tr('🏆 Bạn thắng Solo 1v1!','🏆 You won Solo 1v1!'):
   tr('Trận Solo 1v1 kết thúc.','Solo 1v1 match ended.');
  reset();
  if(G.Game?.state!=='ui')G.Game?.toUI?.();
  G.Flow?.goMenu?.();G.UI?.toast?.(result,4500);
 }
 function abort(){
  if(!active){frame().hidden=true;return;}
  reset();G.Game?.toUI?.();G.Flow?.goMenu?.();
 }
 function hud(){
  let el=$('pkmsvv-arena-solo-hud');
  if(!el){el=document.createElement('div');el.id='pkmsvv-arena-solo-hud';
   el.className='pkmsvv-arena-solo-hud';document.body.append(el);}
  el.hidden=false;return el;
 }
 function start(random=Math.random){
  if(active||!canEnter())return false;
  if(!selectReady(preferredReady())){
   G.UI?.toast?.(tr('Vào PokéBox và chọn ít nhất 1 Pokémon trong Đội hình 6 sẵn sàng.',
    'Choose at least one Pokémon in PokéBox Ready Team of 6.'),3100);
   return false;
  }
  enemyDex=chooseEnemy(pool,random);
  prepTotal=Math.round(PREP_MIN+Math.max(0,Math.min(1,random()))*(PREP_MAX-PREP_MIN));
  aiFactor=.9+Math.max(0,Math.min(1,Number(random())||0))*.3;
  elapsed=0;lastSecond=-1;active=true;stage='prep';target=null;
  startingOwnRun=true;
  try{G.Game.startRun(null);}finally{startingOwnRun=false;}
  // Arena must inherit the account's permanent 3–8 Skill Awakening capacity.
  // Native room setup and evolution must never reset a fully awakened Pokémon
  // to the default three slots. Do not create free moves or change old saves.
  const fighter=G.Game?.player,skillSave=G.DB?.save;
  const unlocked=Number(G.PKMSVVSkillTrack?.progress?.(skillSave,fighter?.kills)?.count);
  if(fighter&&Number.isFinite(unlocked)&&unlocked>=3&&unlocked<=8)
   fighter.maxMoves=Math.max(Number(fighter.maxMoves)||3,unlocked);
  G.World?.setBiome?.(0,true); // isolated instance, no LAN room or remote player
  frame().hidden=true;hud();
  G.UI?.toast?.(tr('Solo 1v1: quái ×2 và EXP ×2 khi farm trước trận!',
   'Solo 1v1: 2x monsters and 2x EXP during preparation!'),3800);
  return true;
 }
 function selection(){
  // The 10-second pick is a safe interval: no hostile mobs attack a player
  // behind a modal, and no farm rewards can be gained while selecting.
  G.EnemyMgr?.clear?.();G.Projectiles?.clear?.();G.Hazards?.clear?.();
  const p=G.Game?.player;if(p)p.invuln=Math.max(12,p.invuln||0);
  stage='select';elapsed=0;const screen=frame();screen.hidden=false;
  $('pkmsvv-arena-solo-play').hidden=true;
  $('pkmsvv-arena-solo-invite').hidden=true;
  $('pkmsvv-arena-solo-confirm').hidden=false;
  const picks=$('pkmsvv-arena-solo-picks');picks.replaceChildren();
  const options=owned();
  const current=options.find(x=>x.id===selectedInstanceId)||preferredReady(options);
  if(!current){abort();return;}
  selectReady(current);
  const label=$('pkmsvv-arena-solo-info');
  if(label)label.textContent=tr('Chọn 1 trong Đội hình 6 Pokémon sẵn sàng · 10 giây',
   'Choose 1 from PokéBox Ready Team of 6 · 10 seconds');
  for(const item of options){
   const button=document.createElement('button');button.type='button';
   button.className='pkmsvv-arena-solo-pick';
   button.dataset.dex=String(item.dex);button.dataset.readyId=item.id;
   button.textContent=(item.id===selectedInstanceId?'✓ ':'')+
    (G.DEX_BY?.[item.dex]?.name||'Pokémon '+item.dex)+(item.shiny?' ✨ Shiny':'');
   if(G.UI?.sprite){
    const sprite=document.createElement('canvas');sprite.width=56;sprite.height=56;
    sprite.className='pkmsvv-arena-ready-art';
    try{G.UI.sprite(sprite,item.dex,{shiny:item.shiny});button.append(sprite);}catch(_){}
   }
   button.onclick=()=>{if(stage!=='select'||!selectReady(item))return;selectionPaint();};
   picks.append(button);
  }
  selectionPaint();
  G.PKMSVVModalNavQA?.first?.(screen); // D-pad/Enter selects among the six Ready slots
 }
 function selectionPaint(){
  const picks=$('pkmsvv-arena-solo-picks');
  if(!picks)return;
  for(const element of picks.children){
   const on=element.dataset?.readyId===selectedInstanceId;
   element.classList?.toggle?.('on',on);
   element.setAttribute?.('aria-pressed',String(on));
  }
 }
 function normalize(p){
  const dex=selected,mon=G.DEX_BY?.[dex];
  if(mon&&(p.dex!==dex||p.shiny!==selectedShiny)){
   p.dex=dex;p.mon=mon;p.shiny=selectedShiny;
   const scale=G.Sprites?.playerScale?.(dex)||1;
   if(G.Sprites?.Animator){p.scale=scale;p.anim=new G.Sprites.Animator(dex,scale,p.shiny);}
   p.r=G.Sprites?.playerRadius?.(dex)||p.r;p.bodyH=G.Sprites?.bodyHeight?.(dex,scale)||p.bodyH;
   G.Sprites?.preload?.([dex],3500,!!p.shiny);
  }
  p.pkmsvvArenaReadyInstanceId=selectedInstanceId; // Exact PokéBox slot; do not mutate lineup
  // Account upgrades do not determine PvP baseline; prepared move choices remain.
  p.mon={...p.mon,hp:320,pa:130,sa:130,atk:130,df:110,sd:110,spd:112};
  p.maxHp=320;p.hp=320;p.baseAtk=1.3;p.baseSpd=112;
  p.atkMul=1;p.spdMul=1;p.invuln=2;
 }
 function startIntro(){
  stage='intro';elapsed=0;countView('3');
  $('pkmsvv-arena-solo-confirm').hidden=true;
  const p=G.Game?.player;if(!p){abort();return;}
  normalize(p);
  G.EnemyMgr?.clear?.();G.Pickups?.clear?.();G.Projectiles?.clear?.();G.Hazards?.clear?.();
  duelType=DUEL_TYPES[Math.abs(Number(enemyDex)||0)%DUEL_TYPES.length];
  G.World?.setArena?.({tx:0,ty:0,r:20,type:duelType});
  if(G.Tiles?.arenaBiome)G.World?.setBiome?.(G.Tiles.arenaBiome(duelType),true);
  p.x=0;p.y=95;p.invuln=4;
  const el=frame();el.hidden=true; // show world map behind the center 3-2-1, not the selection modal
  $('pkmsvv-arena-solo-picks').replaceChildren();
  $('pkmsvv-arena-solo-vs').textContent=(G.DEX_BY?.[selected]?.name||selected)+'  ⚡ VS ⚡  '+
   (G.DEX_BY?.[enemyDex]?.name||enemyDex);
 }
 // All opponent combat factors use the SAME random multiplier so no hidden
 // 2× boss scale defeats the promised 90–120% AI stat range.
 function balanceAi(p,ratio=aiFactor){
  const scale=Math.max(.9,Math.min(1.2,Number(ratio)||1));
  return {hp:Math.round(Math.max(1,Number(p?.maxHp)||320)*scale),
   spd:Math.round(Math.max(1,Number(p?.baseSpd)||112)*scale),
   dmg:Math.round(11*Math.max(.1,Number(p?.baseAtk)||1.3)/1.3*scale*10)/10,
   shotCd:Math.round(2.5/scale*100)/100};
 }
 function beginDuel(){
  const p=G.Game?.player;if(!p||!G.Enemy||!G.EnemyMgr){abort();return;}
  stage='fight';elapsed=0;frame().hidden=true;fightCue=.65;countView(tr('⚔ BẮT ĐẦU!','⚔ FIGHT!'));
  const dex=enemyDex===selected?chooseEnemy():enemyDex;
  const level=Math.min(255,Math.max(1,Math.floor(Number(p.level)||1)+10));
  const def={dex,name:G.DEX_BY?.[dex]?.name||'AI',level,...balanceAi(p),
   xp:0,behavior:'champion'};
  target=G.EnemyMgr.add(new G.Enemy(def,p.x+170,p.y-45,{hp:1,spd:1,dmg:1},true));
  // Native boss constructor may apply its own run scaling. The chosen Solo
  // rival MUST stay within 90–120% of the player's normalized duel stats.
  if(target){target.maxHp=def.hp;target.hp=def.hp;target.spd=def.spd;
   target.dmg=def.dmg;if(Number.isFinite(target.shotCd))target.shotCd=def.shotCd;}


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
  target.pkmsvvArenaSolo=true;target.level=level;target.pkmsvvArenaLevel=level;
  target.skillCd=Math.max(.45,1.4/Math.max(.9,aiFactor));
  if(target.ai&&Number.isFinite(target.ai.cd))
   target.ai.cd=Math.min(target.ai.cd,1.25);
  G.UI?.toast?.(tr('⚔ BẮT ĐẦU!','⚔ FIGHT!')+' · AI Lv.'+level,850);
 }
 function update(dt){
  if(!active||G.Game?.state!=='playing')return;
  const p=G.Game.player;if(!p)return;
  if(p.dead){finish(false);return;}
  elapsed+=Math.max(0,Number(dt)||0);
  const sec=Math.floor(elapsed);
  if(sec!==lastSecond){
   lastSecond=sec;const h=hud();
   if(stage==='prep'||stage==='warn'){
    const left=Math.max(0,Math.ceil(prepTotal-elapsed));
    h.textContent='⚔ Solo 1v1 · '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0')+
     (left<=WARN?' · '+tr('⚠ CÒN 30 GIÂY!','⚠ 30-SECOND WARNING!'):'');
    if(left===WARN)G.UI?.toast?.(tr('⚠ Đấu trường mở sau 30 giây!','⚠ The arena opens in 30 seconds!'),3000);
   }else if(stage==='select'){
    $('pkmsvv-arena-solo-info').textContent=tr('Chọn Pokémon · ','Choose Pokémon · ')+
     Math.max(0,Math.ceil(SELECT-elapsed))+'s';
   }else if(stage==='intro'){
    $('pkmsvv-arena-solo-info').textContent=tr('⚡ Quyết đấu sau ','⚡ Fight in ')+
     Math.max(0,Math.ceil(INTRO-elapsed))+'s';
   }else if(stage==='fight')h.textContent='⚔ SOLO VS AI · '+Math.max(0,Math.ceil(DUEL_LIMIT-elapsed))+'s';
  }
  if(stage==='prep'){if(elapsed>=prepTotal-WARN)stage='warn';return;}
  if(stage==='warn'){
   // Warning lasts until the last 10s; keep farming real monsters.
   if(elapsed>=prepTotal-SELECT)selection();
   return;
  }
  if(stage==='select'){if(elapsed>=SELECT)startIntro();return;}
  if(stage==='intro'){
   if(elapsed>=INTRO)beginDuel();
   else countView(String(Math.max(1,Math.ceil(INTRO-elapsed))));
   return;
  }
  if(stage!=='fight')return;
  if(fightCue>0){
   fightCue=Math.max(0,fightCue-Math.max(0,Number(dt)||0));
   if(!fightCue)hideCountView();
  }
  if(target?.dead){finish(true);return;}
  if(elapsed>=SHRINK_FROM){
   const next=Math.max(9,20-Math.floor((elapsed-SHRINK_FROM)/15));
   if(next!==shrunk){shrunk=next;G.World?.setArena?.({tx:0,ty:0,r:next,type:duelType});}
  }
  if(elapsed>=DUEL_LIMIT){
   finish(p.hp/Math.max(1,p.maxHp)>(target?.hp||0)/Math.max(1,target?.maxHp||1));
  }
 }
 function guard(obj,key,fn){const prev=obj?.[key];if(typeof prev!=='function')return;
  obj[key]=function(...args){return fn.call(this,prev,args);};}
 guard(G.Spawner,'update',function(prev,args){
  if(!active)return prev.apply(this,args);
  if(stage==='prep'||stage==='warn'){
   const scoped=args.slice();if(scoped.length>2)scoped[2]=Math.min(179,elapsed%180);
   if(scoped.length>0)scoped[0]=Math.max(0,Number(scoped[0])||0)*FARM_SPAWN_MULT;
   return prev.apply(this,scoped);
  }
 });
 // Farm XP bonus ends before select, intro and duel; no 1v1 exploitation.
 guard(G.Pickups,'dropXp',function(prev,args){
  if(active&&(stage==='prep'||stage==='warn')){
   const copy=args.slice();copy[2]=Math.max(0,Number(copy[2])||0)*FARM_XP_MULT;
   return prev.apply(this,copy);
  }
  return prev.apply(this,args);
 });
 guard(G.Rift,'update',function(prev,args){if(!active)return prev.apply(this,args);});
 guard(G.Judgment,'update',function(prev,args){if(!active)return prev.apply(this,args);});
 guard(G.EnemyMgr,'update',function(prev,args){
  const output=prev.apply(this,args);update(args[0]);return output;
 });
 // An external Berry/Champion/new-game start must end a retired Solo run.
 function guardSession(obj,key,fn){
  const previous=obj?.[key];if(typeof previous!=='function')return;
  obj[key]=function(...args){return fn.call(this,previous,args);};
 }
 guardSession(G.Game,'startRun',function(previous,args){
  if(active&&!startingOwnRun)reset();return previous.apply(this,args);
 });
 guardSession(G.Game,'toUI',function(previous,args){
  if(active)reset();return previous.apply(this,args);
 });
 guardSession(G.Game,'quit',function(previous,args){
  if(active)reset();return previous.apply(this,args);
 });
 guardSession(G.Flow,'goMenu',function(previous,args){
  if(active)reset();return previous.apply(this,args);
 });
 return {PREP_MIN,PREP_MAX,WARN,SELECT,INTRO,DUEL_LIMIT,SHRINK_FROM,
  open,start,abort,finish,owned,preferredReady,selectReady,chooseEnemy,selection,beginDuel,balanceAi,update,
  get active(){return active},get stage(){return stage},get prepTotal(){return prepTotal},
  get chosen(){return selected},get chosenInstance(){return selectedInstanceId},get chosenShiny(){return selectedShiny},get rival(){return enemyDex},get aiFactor(){return aiFactor}};
})();
