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
 let active=false,stage='idle',prepTotal=0,elapsed=0,opponent=null,target=null,selected=null,enemyDex=null,lastSecond=-1,shrunk=0;
 const canEnter=()=>!!(G.PKMSVVStory?.arenaUnlocked?.()&&!G.Coop?.active);
 function owned(){
  const s=G.DB?.save||{},collection=s.owned||{},ids=Object.keys(collection)
   .map(Number).filter(d=>d>0&&G.DEX_BY?.[d]);
  if(s.partner&&!ids.includes(s.partner)&&G.DEX_BY?.[s.partner])ids.unshift(s.partner);
  return ids.slice(0,24);
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
   '<button class="btn gold" type="button" id="pkmsvv-arena-solo-play">Bắt đầu</button>'+
   '<button class="btn ghost" type="button" id="pkmsvv-arena-solo-close">Đóng</button></div></div>';
  document.body.append(screen);
  $('pkmsvv-arena-solo-play').onclick=start;
  $('pkmsvv-arena-solo-close').onclick=()=>{if(active)abort();else screen.hidden=true;};
  return screen;
 }
 function open(){
  if(!canEnter()){
   G.UI?.toast?.(tr('🔒 Hoàn thành Chương 6 để mở Arena.','🔒 Complete Chapter 6 to unlock Arena.'));
   return false;
  }
  const screen=frame();screen.hidden=false;
  $('pkmsvv-arena-solo-play').hidden=false;
  $('pkmsvv-arena-solo-info').textContent=tr(
   'Chuẩn bị trong bản đồ riêng từ 10–15 phút. Báo trước 30 giây, chọn Pokémon trong 10 giây, rồi đấu với AI có chỉ số cơ bản cân bằng.',
   'Train on your own map for 10–15 minutes, receive a 30-second warning, select a Pokémon for 10 seconds, then face a normalized AI opponent.');
  $('pkmsvv-arena-solo-picks').replaceChildren();
  $('pkmsvv-arena-solo-vs').textContent=tr('Đối thủ AI sẽ được bốc ngẫu nhiên.','AI opponent is chosen at random.');
  return true;
 }
 function reset(){
  active=false;stage='idle';target=null;opponent=null;lastSecond=-1;
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
  if(active||!canEnter()||!G.DB?.save?.partner)return false;
  selected=G.DB.save.partner;
  enemyDex=chooseEnemy(pool,random);
  prepTotal=Math.round(PREP_MIN+Math.max(0,Math.min(1,random()))*(PREP_MAX-PREP_MIN));
  elapsed=0;lastSecond=-1;active=true;stage='prep';target=null;
  G.Game.startRun(null);
  G.World?.setBiome?.(0,true); // isolated instance, no LAN room or remote player
  frame().hidden=true;hud();
  G.UI?.toast?.(tr('Solo 1v1: hãy săn quái và xây dựng kỹ năng trước khi quyết đấu!',
   'Solo 1v1: farm monsters and build skills before the duel!'),3800);
  return true;
 }
 function selection(){
  // The 10-second pick is a safe interval: no hostile mobs attack a player
  // behind a modal, and no farm rewards can be gained while selecting.
  G.EnemyMgr?.clear?.();G.Projectiles?.clear?.();G.Hazards?.clear?.();
  const p=G.Game?.player;if(p)p.invuln=Math.max(12,p.invuln||0);
  stage='select';elapsed=0;const screen=frame();screen.hidden=false;
  $('pkmsvv-arena-solo-play').hidden=true;
  const picks=$('pkmsvv-arena-solo-picks');picks.replaceChildren();
  const options=owned();
  if(!options.includes(selected))options.unshift(selected);
  for(const dex of options){
   const button=document.createElement('button');button.type='button';
   button.className='pkmsvv-arena-solo-pick';
   button.textContent=(dex===selected?'✓ ':'')+(G.DEX_BY?.[dex]?.name||'Pokémon '+dex);
   button.disabled=dex===enemyDex;
   button.onclick=()=>{if(stage!=='select'||dex===enemyDex)return;
    selected=dex;selectionPaint();};
   button.dataset.dex=String(dex);picks.append(button);
  }
  selectionPaint();
 }
 function selectionPaint(){
  const picks=$('pkmsvv-arena-solo-picks');
  if(!picks)return;
  for(const element of picks.children){
   const dex=Number(element.dataset?.dex);
   element.classList?.toggle?.('on',dex===selected);
  }
 }
 function normalize(p){
  const dex=selected,mon=G.DEX_BY?.[dex];
  if(mon&&p.dex!==dex){
   p.dex=dex;p.mon=mon;p.shiny=!!G.DB?.save?.partnerShiny&&G.DB?.ownsShiny?.(dex);
   const scale=G.Sprites?.playerScale?.(dex)||1;
   if(G.Sprites?.Animator){p.scale=scale;p.anim=new G.Sprites.Animator(dex,scale,p.shiny);}
   p.r=G.Sprites?.playerRadius?.(dex)||p.r;p.bodyH=G.Sprites?.bodyHeight?.(dex,scale)||p.bodyH;
   G.Sprites?.preload?.([dex],3500,!!p.shiny);
  }
  // Account upgrades do not determine PvP baseline; prepared move choices remain.
  p.mon={...p.mon,hp:320,pa:130,sa:130,atk:130,df:110,sd:110,spd:112};
  p.maxHp=320;p.hp=320;p.baseAtk=1.3;p.baseSpd=112;
  p.atkMul=1;p.spdMul=1;p.invuln=2;
 }
 function startIntro(){
  stage='intro';elapsed=0;
  const p=G.Game?.player;if(!p){abort();return;}
  normalize(p);
  G.EnemyMgr?.clear?.();G.Pickups?.clear?.();G.Projectiles?.clear?.();G.Hazards?.clear?.();
  G.World?.setArena?.({tx:0,ty:0,r:20,type:'normal'});
  p.x=0;p.y=95;p.invuln=4;
  const el=frame();el.hidden=false;
  $('pkmsvv-arena-solo-picks').replaceChildren();
  $('pkmsvv-arena-solo-vs').textContent=(G.DEX_BY?.[selected]?.name||selected)+'  ⚡ VS ⚡  '+
   (G.DEX_BY?.[enemyDex]?.name||enemyDex);
 }
 function beginDuel(){
  const p=G.Game?.player;if(!p||!G.Enemy||!G.EnemyMgr){abort();return;}
  stage='fight';elapsed=0;frame().hidden=true;
  const dex=enemyDex===selected?chooseEnemy():enemyDex;
  const def={dex,name:G.DEX_BY?.[dex]?.name||'AI',hp:320,spd:112,dmg:11,
   xp:0,behavior:'champion',shotCd:2.5};
  target=G.EnemyMgr.add(new G.Enemy(def,p.x+170,p.y-45,{hp:1,spd:1,dmg:1},true));

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
  target.pkmsvvArenaSolo=true;
  G.UI?.toast?.(tr('3 · 2 · 1 · CHIẾN ĐẤU!','3 · 2 · 1 · FIGHT!'),1500);
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
  if(stage==='intro'){if(elapsed>=INTRO)beginDuel();return;}
  if(stage!=='fight')return;
  if(target?.dead){finish(true);return;}
  if(elapsed>=SHRINK_FROM){
   const next=Math.max(9,20-Math.floor((elapsed-SHRINK_FROM)/15));
   if(next!==shrunk){shrunk=next;G.World?.setArena?.({tx:0,ty:0,r:next,type:'normal'});}
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
   return prev.apply(this,scoped);
  }
 });
 guard(G.Rift,'update',function(prev,args){if(!active)return prev.apply(this,args);});
 guard(G.Judgment,'update',function(prev,args){if(!active)return prev.apply(this,args);});
 guard(G.EnemyMgr,'update',function(prev,args){
  const output=prev.apply(this,args);update(args[0]);return output;
 });
 return {PREP_MIN,PREP_MAX,WARN,SELECT,INTRO,DUEL_LIMIT,SHRINK_FROM,
  open,start,abort,finish,owned,chooseEnemy,selection,beginDuel,update,
  get active(){return active},get stage(){return stage},get prepTotal(){return prepTotal},
  get chosen(){return selected},get rival(){return enemyDex}};
})();
