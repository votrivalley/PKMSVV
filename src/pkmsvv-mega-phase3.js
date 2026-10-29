'use strict';
/* Phase 3 — first 10 Champion roster and scarce Mega Stones. Never fake
 * tournament wins; only battle forms with authentic local sprite sheets.
 * Not enabled in LAN, Royale or Egg Rush until Host replication exists.
 */
G.PKMSVVMegaPhase3=(()=>{
 const CHAMPIONS=Object.freeze([
  {region:'Kanto',key:'charizardmegax'},{region:'Johto',key:'scizormega'},
  {region:'Hoenn',key:'swampertmega'},{region:'Sinnoh',key:'garchompmega'},
  {region:'Unova',key:'excadrillmega'},{region:'Kalos',key:'greninjamega'},
  {region:'Alola',key:'golisopodmega'},{region:'Galar',key:'falinksmega'},
  {region:'Paldea',key:'baxcaliburmega'},{region:'Votri Valley',key:'dragonitemega'}
 ]);
 const STONE_CHANCE=.01,DURATION=30,CD_FACTOR=.7;
 const getSave=()=>G.DB?.save;
 const getForm=key=>(G.PKMSVV_MEGA_CATALOG||[]).find(f=>f.key===key);
 const stoneOwned=(s,key)=>{
  const v=s?.megaStones?.[key];
  return v===1||v===true||!!(v&&typeof v==='object'&&v.unlocked===true);
 };
 function isUnlocked(f){
  const s=getSave();
  if(!f||!s?.owned?.[f.dex])return false;
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
   story:!!(f&&(f.storyLocked?s?.megaStoryCleared?.[f.key]===true:
     s?.pkmsvvChapter3Seen===true)),
   form:!!(f&&(!f.sharedStone||s?.megaForms?.[f.key]===true))
  };
 }
 function isBattleReady(f){
  return !!(f&&!f.storyLocked&&CHAMPIONS.some(c=>c.key===f.key)&&f.artReady&&
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
 // Successful PAID pulls only. UI commits this exact save after G.Gacha.pull.
 const previousPull=G.Gacha?.pull;
 if(typeof previousPull==='function')G.Gacha.pull=function(save,n,...rest){
  const out=previousPull.call(this,save,n,...rest);
  if(Array.isArray(out)&&out.length===n)rewardStone(save,out);
  return out;
 };
 // Ratio normalization uses the original species' official base stats.
 const BASE=Object.freeze({
  charizardmegax:{atk:84,def:78,spa:109,spd:85,spe:100},
  excadrillmega:{atk:135,def:60,spa:50,spd:65,spe:88}
 });
 const player=()=>G.Game?.player;
 const formFor=p=>p?CHAMPIONS.map(c=>getForm(c.key)).find(f=>f?.dex===p.dex&&BASE[f.key]):null;
 let button=null,busy=false;
 function eligible(){
  const p=player(),f=formFor(p);
  return !!(p&&f&&!p.dead&&G.Game?.state==='playing'&&!G.Coop?.active&&
   !p._megaUsed&&!p._megaActive&&isBattleReady(f));
 }
 function appearance(p,dex){
  const scale=G.Sprites.playerScale(dex),dir=p.anim?.dir||0;
  p.scale=scale;p.anim=new G.Sprites.Animator(dex,scale,dex===p.dex&&p.shiny);
  p.anim.dir=dir;p.r=G.Sprites.playerRadius(dex);
  p.bodyH=G.Sprites.bodyHeight(dex,scale);
 }
 function stop(p){
  if(!p?._megaPhase3Backup||!p._megaActive)return false;
  const old=p._megaPhase3Backup;
  p.mon=old.mon;p.baseAtk=old.atk;p.baseSpd=old.spd;
  if(p._megaPhase3Cd){p.cdMul/=CD_FACTOR;p._megaPhase3Cd=false;}
  p._megaActive=false;p._megaRemaining=0;p._megaPhase3Backup=null;
  appearance(p,p.dex);sync();return true;
 }
 function activate(p){
  const f=formFor(p);
  if(!f||p!==player()||!eligible())return false;
  const old=BASE[f.key],stats=f.stats,mon=p.mon;
  if(!old||!stats)return false;
  p._megaPhase3Backup={mon,atk:p.baseAtk,spd:p.baseSpd};
  const pa=mon.pa*stats.atk/old.atk,sa=mon.sa*stats.spa/old.spa;
  p.mon={...mon,pa,sa,atk:Math.max(pa,sa),df:mon.df*stats.def/old.def,
   sd:mon.sd*stats.spd/old.spd,spd:mon.spd*stats.spe/old.spe,
   types:f.key==='charizardmegax'?['fire','dragon']:mon.types};
  p.baseAtk=p.mon.atk;p.baseSpd=p.mon.spd;
  p.cdMul*=CD_FACTOR;p._megaPhase3Cd=true;
  for(const move of p.moves||[])if(Number.isFinite(move.t)&&move.t>0)move.t*=CD_FACTOR;
  p._megaRemaining=DURATION;p._megaActive=true;p._megaUsed=true;
  appearance(p,f.spriteId);
  G.FX?.ring?.(p.x,p.y,15,100,'#b49aff',.9,8);
  G.Audio?.sfx?.('shinyGet');
  G.UI?.toast?.('MEGA '+(G.DEX_BY?.[p.dex]?.name||'POKÉMON').toUpperCase()+'! 30 giây · Hồi chiêu -30%');
  sync();return true;
 }
 async function tryActivate(){
  if(busy||!eligible())return false;
  const p=player(),f=formFor(p);busy=true;
  try{
   await G.Sprites.preload([f.spriteId],3500,false);
   const frame=G.Sprites.sheet?.(f.spriteId,'Idle',false);
   if(frame&&!frame.ready)return false;
   return activate(p);
  }finally{busy=false;sync();}
 }
 function tick(p,dt){
  if(!p?._megaPhase3Backup)return;
  if(p.dead||G.Game?.state!=='playing'){stop(p);return;}
  p._megaRemaining-=Math.max(0,dt);if(p._megaRemaining<=0)stop(p);
 }
 function mount(){
  if(button||!document.body)return;
  button=document.createElement('button');
  button.id='pkmsvv-mega-champion-btn';button.type='button';
  button.className='pkmsvv-mega-btn';button.title='Tiến hóa Mega · Phím M';
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
  const visible=!!(p&&f&&!G.Coop?.active&&G.Game?.state==='playing'&&
   (eligible()||p._megaPhase3Backup));
  button.style.display=visible?'flex':'none';
  if(!visible)return;
  button.disabled=busy||!!p._megaActive;
  button.className='pkmsvv-mega-btn'+(p._megaActive?' is-active':'');
  const label=button.querySelector?.('.pkmsvv-mega-btn__label');
  if(label)label.textContent=p._megaActive?Math.max(0,Math.ceil(p._megaRemaining))+'s':'MEGA';
 }
 const update=G.Player?.prototype?.update;
 if(typeof update==='function')G.Player.prototype.update=function(dt){
  if(this===player())tick(this,dt);
  return update.call(this,dt);
 };
 for(const action of ['startRun','toUI','quit']){
  const original=G.Game?.[action];if(typeof original!=='function')continue;
  G.Game[action]=function(...args){
   stop(player());const result=original.apply(this,args);sync();return result;
  };
 }
 document.addEventListener('keydown',event=>{
  if(event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.key?.toLowerCase()!=='m')return;
  if(event.target&&/INPUT|TEXTAREA|SELECT/.test(event.target.tagName||''))return;
  if(eligible()){event.preventDefault();tryActivate();}
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
 setInterval(sync,250);
 return {CHAMPIONS,STONE_CHANCE,DURATION,CD_FACTOR,rewardStone,isUnlocked,isBattleReady,
  stoneOwned,progress,formFor,eligible,activate,tryActivate,stop,tick,sync};
})();
