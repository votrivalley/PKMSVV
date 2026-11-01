'use strict';
/* Phase 3 — first 10 Champion roster and scarce Mega Stones. Never fake
 * tournament wins; only battle forms with authentic local sprite sheets.
 * Co-op Mega transforms propagate via Host-owned network events.
 */
G.PKMSVVMegaPhase3=(()=>{
 const CHAMPIONS=Object.freeze([
  {region:'Kanto',key:'charizardmegax'},{region:'Johto',key:'scizormega'},
  {region:'Hoenn',key:'swampertmega'},{region:'Sinnoh',key:'garchompmega'},
  {region:'Unova',key:'excadrillmega'},{region:'Kalos',key:'greninjamega'},
  {region:'Alola',key:'golisopodmega'},{region:'Galar',key:'falinksmega'},
  {region:'Paldea',key:'baxcaliburmega'},{region:'Votri Valley',key:'dragonitemega'}
 ]);
 const STONE_CHANCE=.01,DURATION=30,REUSE_COOLDOWN=200,CD_FACTOR=.7;
 const ENERGY_MAX=100,HIT_ENERGY=1,KILL_ENERGY=2,BOSS_ENERGY=3;
 const getSave=()=>G.DB?.save;
 const getForm=key=>(G.PKMSVV_MEGA_CATALOG||[]).find(f=>f.key===key);
 const stoneOwned=(s,key)=>{
  const v=s?.megaStones?.[key];
  return v===1||v===true||!!(v&&typeof v==='object'&&v.unlocked===true);
 };
 // Local, isolated Mega4 QA allows visual/gameplay preview of the four
 // imported genuine sprites without faking story completion or modifying saves.
 // Never active in public PC, Web, Android or ordinary LAN game builds.
 function privateQaPreview(f){
  return !!(f?.qa4dir===true&&f.artReady===true&&
   G.PKMSVV_MEGA_4DIR_QA?.enabled===true&&
   G.PKMSVV_MEGA_4DIR_QA.forms?.includes(f.key)&&
   G.SPRITE_META?.[f.spriteId]?.a?.Idle);
 }
 function isUnlocked(f){
  if(privateQaPreview(f))return true;
  const s=getSave();
  if(!f||!s?.owned?.[f.dex]||!s.pkmsvvChapter7Seen)return false;
  if(f.storyLocked&&s.megaStoryCleared?.[f.key]!==true)return false;
  if(f.sharedStone&&s.megaForms?.[f.key]!==true)return false;
  if(!f.stoneKey)return !!f.storyLocked&&s.megaStoryCleared?.[f.key]===true;
  if(!stoneOwned(s,f.stoneKey))return false;
  return f.storyLocked||s.pkmsvvChapter3Seen===true;
 }
 function progress(f){
  const s=getSave();
  return {
   pokemon:!!(f&&s?.owned?.[f.dex]),
   stone:!!(f&&(!f.stoneKey||stoneOwned(s,f.stoneKey))),
   story:!!(f&&s?.pkmsvvChapter7Seen===true&&
     (f.storyLocked?s?.megaStoryCleared?.[f.key]===true:
     s?.pkmsvvChapter3Seen===true)),
   form:!!(f&&(!f.sharedStone||s?.megaForms?.[f.key]===true))
  };
 }
 function isBattleReady(f){
  return !!(f&&(f.storyLocked||CHAMPIONS.some(c=>c.key===f.key))&&f.artReady&&
   G.SPRITE_META?.[f.spriteId]?.a?.Idle&&isUnlocked(f));
 }
 function rewardStone(save,results,random=Math.random){
  if(!save||!Array.isArray(results))return [];
  const bonuses=[];
  for(const result of results){
   if(random()>=STONE_CHANCE)continue;
   const pool=CHAMPIONS.map(c=>getForm(c.key)).filter(f=>f?.stoneKey&&!stoneOwned(save,f.stoneKey));
   if(!pool.length)break;
   const index=Math.min(pool.length-1,Math.floor(Math.max(0,random())*pool.length));
   const chosen=pool[index];save.megaStones=save.megaStones||{};
   save.megaStones[chosen.stoneKey]=1;
   result.megaStone=chosen.stone;bonuses.push(chosen.stone);
  }
  return bonuses;
 }
 // Mega Stones now use a dedicated Arena Point banner. Never silently
 // grant a Mega Stone from the regular Pokemon ticket Gacha.
 // Legacy helper rewardStone is retained solely for old test imports.
 // Ratio normalization uses the original species' official base stats.
 const BASE=Object.freeze({
  charizardmegax:{atk:84,def:78,spa:109,spd:85,spe:100},
  excadrillmega:{atk:135,def:60,spa:50,spd:65,spe:88},
  // Authenticated base stats; these four are only available when explicitly
  // loaded from private four-direction PC QA art, never in public builds.
  scizormega:{atk:130,def:100,spa:55,spd:80,spe:65},
  swampertmega:{atk:110,def:90,spa:85,spd:90,spe:60},
  garchompmega:{atk:130,def:95,spa:80,spd:85,spe:102},
  dragonitemega:{atk:134,def:95,spa:100,spd:100,spe:80}
 });
 const player=()=>G.Game?.player;
 const HOVER_MEGA=new Set(['charizardmegax','charizardmegay','dragonitemega','scizormega','pidgeotmega','salamencemega','latiasmega','latiosmega','rayquazamega']);
 const AURA={charizardmegax:'#43baff',charizardmegay:'#ffb356',scizormega:'#f77f98',swampertmega:'#6fe1ee',garchompmega:'#af87ff',dragonitemega:'#ffe69b'};
 const formFor=p=>p?(G.PKMSVV_MEGA_CATALOG||[]).find(f=>
  f.dex===p.dex&&f.stats&&f.artReady&&G.SPRITE_META?.[f.spriteId]?.a?.Idle&&
  (!p.shiny||G.Sprites.hasShiny?.(f.spriteId)===true)):null;
 function canActivate(p,ai=false){
  const f=formFor(p);
  return !!(p&&f&&!p.dead&&G.Game?.state==='playing'&&!p._megaActive&&
   !(p._megaCooldownRemaining>0)&&energy(p)>=ENERGY_MAX&&
   (ai?G.Coop?.isHost&&p.lanBot:isUnlocked(f)));
 }
 function netMega(p,sprite){
  if(!G.Coop?.active||!p?.uid)return;
  if(G.Coop.isHost)G.Coop.broadcast?.(['mg',p.uid,sprite||0]);
  else if(p===player())G.Coop.toHost?.(['mg',sprite||0]);
 }
 function remoteMega(uid,sprite){
  const p=G.Coop?.players?.().find(x=>x&&x.uid===uid);
  if(!p||p===player())return false;
  const f=(G.PKMSVV_MEGA_CATALOG||[]).find(x=>x.dex===p.dex&&x.spriteId===sprite&&
   x.artReady&&G.SPRITE_META?.[x.spriteId]?.a?.Idle);
  if(sprite&&(!f||p.shiny&&G.Sprites.hasShiny?.(sprite)!==true))return false;
  appearance(p,f?.spriteId||p.dex);p._megaRemoteSprite=f?.spriteId||0;
  p._pkmsvvMegaIgnoresWater=!!(f&&(f.ignoreWaterSlow||HOVER_MEGA.has(f.key)));
  p._pkmsvvMegaAuraColor=f?(AURA[f.key]||'#d4a0ff'):null;return true;
 }
 let button=null,busy=false;
 const controlHint=()=>G.Pad?.name?G.PKMSVVPadOrb?.describe?.('mega')||'LB / L1':
  (String(G.Input?.bound?.('mega')||'digit5').replace(/^(digit|key|numpad)/,'').toUpperCase());
 function energy(p){
  if(!p)return 0;
  if(!Number.isFinite(p._megaEnergy))p._megaEnergy=0;
  p._megaEnergy=Math.max(0,Math.min(ENERGY_MAX,p._megaEnergy));
  return p._megaEnergy;
 }
 function addEnergy(p,points){
  if(!p||p.dead||p._megaActive||G.Game?.state!=='playing')return 0;
  if(!Number.isFinite(points)||points<=0)return energy(p);
  p._megaEnergy=Math.min(ENERGY_MAX,energy(p)+points);
  return p._megaEnergy;
 }
 function eligible(){return canActivate(player(),false);}
 function appearance(p,dex){
  const scale=G.Sprites.playerScale(dex),dir=p.anim?.dir||0;
  p.scale=scale;p.anim=new G.Sprites.Animator(dex,scale,
   !!p.shiny&&(dex===p.dex||G.Sprites.hasShiny?.(dex)===true));
  p.anim.dir=dir;p.r=G.Sprites.playerRadius(dex);
  p.bodyH=G.Sprites.bodyHeight(dex,scale);
 }
 function stop(p){
  if(!p?._megaPhase3Backup||!p._megaActive)return false;
  const old=p._megaPhase3Backup;
  p.mon=old.mon;p.baseAtk=old.atk;p.baseSpd=old.spd;
  p._pkmsvvMegaIgnoresWater=!!old.ignoreWater;
  if(p._megaPhase3Cd){p.cdMul/=CD_FACTOR;p._megaPhase3Cd=false;}
  p._megaActive=false;p._megaRemaining=0;p._megaPhase3Backup=null;
  p._megaCooldownRemaining=REUSE_COOLDOWN; // Starts AFTER the 30-second transformation.
  appearance(p,p.dex);p._megaFormSprite=0;netMega(p,0);sync();return true;
 }
 function activate(p){
  const ai=!!p?.lanBot&&G.Coop?.isHost,f=formFor(p);
  if(!f||(!ai&&p!==player())||!canActivate(p,ai))return false;
  const mon=p.mon,stats=f.stats;
  const old=BASE[f.key]||{atk:mon.pa,def:mon.df,spa:mon.sa,spd:mon.sd,spe:mon.spd};
  if(!stats||!old.atk||!old.spa||!old.def||!old.spd||!old.spe)return false;
  p._megaPhase3Backup={mon,atk:p.baseAtk,spd:p.baseSpd,ignoreWater:p._pkmsvvMegaIgnoresWater};
  p._pkmsvvMegaIgnoresWater=!!(f.ignoreWaterSlow||HOVER_MEGA.has(f.key));
  const pa=mon.pa*stats.atk/old.atk,sa=mon.sa*stats.spa/old.spa;
  p.mon={...mon,pa,sa,atk:Math.max(pa,sa),df:mon.df*stats.def/old.def,
   sd:mon.sd*stats.spd/old.spd,spd:mon.spd*stats.spe/old.spe,
   types:f.key==='charizardmegax'?['fire','dragon']:mon.types};
  p.baseAtk=p.mon.atk;p.baseSpd=p.mon.spd;
  p.cdMul*=CD_FACTOR;p._megaPhase3Cd=true;
  for(const move of p.moves||[])if(Number.isFinite(move.t)&&move.t>0)move.t*=CD_FACTOR;
  p._megaRemaining=DURATION;p._megaActive=true;p._pkmsvvMegaAuraClock=0;p._pkmsvvMegaAuraColor=AURA[f.key]||'#d4a0ff';
  p._megaEnergy=0;p._megaKillsSeen=Number(p.kills)||0;p._megaBossesSeen=Number(p.bosses)||0;
  appearance(p,f.spriteId);p._megaFormSprite=f.spriteId;netMega(p,f.spriteId);
  G.FX?.ring?.(p.x,p.y,15,100,'#b49aff',.9,8);
  G.Audio?.sfx?.('shinyGet');
  G.UI?.toast?.('MEGA '+(G.DEX_BY?.[p.dex]?.name||'POKÉMON').toUpperCase()+'! 30 giây · Hồi chiêu -30%'+(f.qa4dir?' · QA sprite 4 hướng':''));
  sync();return true;
 }
 async function tryActivate(){
  if(busy||!eligible())return false;
  const p=player(),f=formFor(p);busy=true;
  try{
   await G.Sprites.preload([f.spriteId],3500,!!p.shiny);
   const frame=G.Sprites.sheet?.(f.spriteId,'Idle',!!p.shiny);
   if(frame&&!frame.ready)return false;
   return activate(p);
  }finally{busy=false;sync();}
 }
 function tick(p,dt){
  if(!p)return;
  const elapsed=Number.isFinite(dt)?Math.max(0,dt):0;
  if(p.dead||G.Game?.state!=='playing'){if(p._megaActive)stop(p);return;}
  if(p._megaActive){
   // Mega Lucario BETA owns its own timer; Phase 3 must not tick it twice.
   if(!p._megaPhase3Backup)return;
   p._megaRemaining=Math.max(0,p._megaRemaining-elapsed);
   p._pkmsvvMegaAuraClock=(p._pkmsvvMegaAuraClock||0)+elapsed;
   if(p._pkmsvvMegaAuraClock>=.33){
    p._pkmsvvMegaAuraClock=0;
    G.FX?.ring?.(p.x,p.y,5,Math.max(30,(p.r||18)*2.5),p._pkmsvvMegaAuraColor||'#d4a0ff',.32,5);
   }
   if(p._megaRemaining<=0)stop(p);
   return;
  }
  // Credited kills and boss defeats are tracked on Player by the engine.
  // Count only positive deltas; never write back to the save or global DEX.
  const kills=Math.max(0,Number(p.kills)||0),bosses=Math.max(0,Number(p.bosses)||0);
  const previousKills=Number.isFinite(p._megaKillsSeen)?p._megaKillsSeen:0;
  const previousBosses=Number.isFinite(p._megaBossesSeen)?p._megaBossesSeen:0;
  addEnergy(p,Math.max(0,kills-previousKills)*KILL_ENERGY+
   Math.max(0,bosses-previousBosses)*BOSS_ENERGY);
  p._megaKillsSeen=kills;p._megaBossesSeen=bosses;
  if(p._megaCooldownRemaining>0)
   p._megaCooldownRemaining=Math.max(0,p._megaCooldownRemaining-elapsed);
 }
 function mount(){
  if(button||!document.body)return;
  button=document.createElement('button');
  button.id='pkmsvv-mega-champion-btn';button.type='button';
  button.className='pkmsvv-mega-btn';button.title='Tiến hóa Mega · '+controlHint();
  button.style.display='none';
  button.innerHTML='<span class="pkmsvv-mega-champion-gem">✧</span><span class="pkmsvv-mega-btn__label">MEGA</span>';
  button.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();tryActivate();
  });
  document.body.append(button);
 }
 function sync(){
  if(!button)return;
  const p=player(),f=formFor(p);
  const visible=!!(p&&f&&!p.dead&&G.Game?.state==='playing'&&
   isBattleReady(f));
  document.body?.classList?.toggle?.('pkmsvv-mega-gamepad',!!G.Pad?.name);
  // Network peers also emit a subtle Mega aura; never mutate their stats.
  if(G.Game?.state==='playing'&&G.Coop?.active)for(const other of G.Coop.players?.()||[]){
   if(!other?._megaRemoteSprite||other===p||other.dead)continue;
   other._pkmsvvMegaRemoteAuraClock=(other._pkmsvvMegaRemoteAuraClock||0)+.25;
   if(other._pkmsvvMegaRemoteAuraClock<.75)continue;
   other._pkmsvvMegaRemoteAuraClock=0;
   G.FX?.ring?.(other.x,other.y,5,Math.max(30,(other.r||18)*2.5),
    other._pkmsvvMegaAuraColor||'#d4a0ff',.30,5);
  }
  button.style.display=visible?'flex':'none';
  if(!visible)return;
  const cooldown=Math.max(0,Math.ceil(p._megaCooldownRemaining||0));
  const charge=Math.floor(energy(p));
  button.disabled=busy||!!p._megaActive||cooldown>0||charge<ENERGY_MAX;
  button.className='pkmsvv-mega-btn'+(p._megaActive?' is-active':cooldown>0?' is-cooling':charge<ENERGY_MAX?' is-charging':' is-ready');
  const label=button.querySelector?.('.pkmsvv-mega-btn__label');
  if(label)label.textContent=p._megaActive?Math.max(0,Math.ceil(p._megaRemaining))+'s':
   cooldown>0?cooldown+'s':charge<ENERGY_MAX?charge+'%':'MEGA';
  button.title=p._megaActive?'Mega: '+Math.ceil(p._megaRemaining)+' giây':
   cooldown>0?'Mega hồi '+cooldown+' giây · Năng lượng '+charge+'%':
   charge<ENERGY_MAX?'Năng lượng Mega '+charge+'% / 100% · Đánh trúng và hạ quái để tích':'Mega đã sẵn sàng · '+controlHint();
  button.setAttribute?.('aria-label',button.title);
 }
 // Called from the pinned enemy.hurt patch; never credit invulnerable,
 // remote or competitive targets, and never alter their combat outcome.
 function onEnemyHurt(enemy,amount){
  if(enemy&&!enemy.dead&&!enemy.remote&&!enemy.arceus&&
   Number.isFinite(amount)&&amount>0)addEnergy(player(),HIT_ENERGY);
 }
 const update=G.Player?.prototype?.update;
 if(typeof update==='function')G.Player.prototype.update=function(dt){
  if(this===player()){
   tick(this,dt);
   if((G.Input?.tap?.('digit5')||G.Input?.tap?.('numpad5')||G.Input?.tap?.('pkmsvv-mega'))&&eligible())tryActivate();
  }else if(this.lanBot&&G.Coop?.isHost){
   tick(this,dt);
   if(formFor(this)&&!this._megaActive){
    addEnergy(this,dt*1.3);
    if(canActivate(this,true))activate(this);
   }
  }
  return update.call(this,dt);
 };
 for(const action of ['startRun','toUI','quit']){
  const original=G.Game?.[action];if(typeof original!=='function')continue;
  G.Game[action]=function(...args){
   stop(player());const result=original.apply(this,args);sync();return result;
  };
 }
 // Unified G.Input handles remappable keyboard 5 and controller Mega; touch uses on-screen button.
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
 setInterval(sync,250);
 return {CHAMPIONS,STONE_CHANCE,DURATION,REUSE_COOLDOWN,CD_FACTOR,ENERGY_MAX,
  HIT_ENERGY,KILL_ENERGY,BOSS_ENERGY,rewardStone,isUnlocked,isBattleReady,
  stoneOwned,privateQaPreview,progress,formFor,energy,addEnergy,onEnemyHurt,eligible,canActivate,activate,tryActivate,stop,tick,sync,remoteMega};
})();
