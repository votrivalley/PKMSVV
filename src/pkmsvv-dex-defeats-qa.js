/* Pokédex sighting and Recruitment gate — isolated QA only.
 * Current profile is never overwritten on failed Gacha or defeat save.
 * Old owned collections are grandfathered because historical defeated IDs
 * were not recorded; we never invent a fake enemy-kill history.
 */
(function(){
 'use strict';
 if(typeof G==='undefined')return;
 const own=(s,k)=>Object.prototype.hasOwnProperty.call(s||{},k);
 const dexId=n=>Number.isInteger(Number(n))&&Number(n)>0&&Number(n)<=1025?Number(n):null;
 const L=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 function legacyProfile(s){
  const count=Object.keys(s?.owned||{}).length;
  return count>5 || (Number(s?.stats?.runs)||0)>0;
 }
 function unlocked(s,dex){
  const id=dexId(dex);if(!id||!s)return false;
  // A visible encounter unlocks a species. Previously defeated ones stay valid.
  if(s.pkmsvvSeenDex?.[id])return true;
  if(own(s,'pkmsvvDefeatedDex'))return !!s.pkmsvvDefeatedDex?.[id];
  // Legacy migration: don't erase previously earned collection progress.
  return legacyProfile(s)&&!!(s.owned?.[id]||s.shiny?.[id]);
 }
 function ensureLedger(s){
  if(own(s,'pkmsvvDefeatedDex')){
   const value=s.pkmsvvDefeatedDex;
   if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid defeated Pokédex');
   return {...value};
  }
  const previous=legacyProfile(s);
  return previous?Object.fromEntries(Object.keys(s.owned||{}).concat(Object.keys(s.shiny||{}))
   .map(dexId).filter(Boolean).map(id=>[id,true])):{};
 }
 function markDefeated(s,dex){
  const id=dexId(dex),db=G.DB;
  if(!id||!G.DEX_BY?.[id]||!s||db?.guest)return false;
  if(unlocked(s,id))return false;
  const previous=s.pkmsvvDefeatedDex,had=own(s,'pkmsvvDefeatedDex');
  const next=ensureLedger(s);next[id]=true;
  s.pkmsvvDefeatedDex=next;
  try{
   if(db?.save===s&&db?.commit?.(true)===false)throw Error('Defeat ledger persistence failed');
   return true;
  }catch(err){
   if(had)s.pkmsvvDefeatedDex=previous;
   else delete s.pkmsvvDefeatedDex;
   console.warn('[Pokédex defeat ledger] save unchanged',err);
   return false;
  }
 }

 function markSeen(s,dex){
  const id=dexId(dex),db=G.DB;
  if(!id||!G.DEX_BY?.[id]||!s||db?.guest||unlocked(s,id))return false;
  const old=s.pkmsvvSeenDex,had=own(s,'pkmsvvSeenDex');
  if(had&&(!old||typeof old!=='object'||Array.isArray(old)))return false;
  s.pkmsvvSeenDex={...(old||{}),[id]:true};
  try{
   if(db?.save===s&&db?.commit?.(true)===false)throw Error('Sighting commit failed');
   return true;
  }catch(err){
   if(had)s.pkmsvvSeenDex=old;else delete s.pkmsvvSeenDex;
   console.warn('[Pokédex encounter rollback]',err);return false;
  }
 }
 function visible(e){
  if(!e||e.dead||e.remote||e.pkmsvvBossGuard||e.pkmsvvGuardianOf!==undefined||
   e.pkmsvvFriendly||e.isSupport||e.isPlayer||G.Game?.state!=='playing')return false;
  if(G.Camera?.sees)return !!G.Camera.sees(e.x,e.y,72);
  const pl=G.Game?.player;
  return !!pl&&Math.abs(e.x-pl.x)<=500&&Math.abs(e.y-pl.y)<=340;
 }
 function noteSight(e){return visible(e)&&markSeen(G.DB?.save,e.dex||e.def?.dex);}
 function installSight(){
  const mgr=G.EnemyMgr;
  if(typeof mgr?.add!=='function'||mgr.add._pkmsvvSight)return false;
  const old=mgr.add;
  function add(...args){const result=old.apply(this,args);if(result!==false&&args[0])noteSight(args[0]);return result;}
  add._pkmsvvSight=true;mgr.add=add;
  if(typeof mgr.update==='function'){
   const prior=mgr.update;let tick=0;
   mgr.update=function(...args){
    const result=prior.apply(this,args);
    if(++tick%30!==0||G.Game?.state!=='playing')return result;
    const all=mgr.all?.();if(!all)return result;
    let n=0;for(const enemy of all){if(++n>450)break;if(visible(enemy))noteSight(enemy);}
    return result;
   };
  }
  return true;
 }
 function installEnemy(){
  const proto=G.Enemy?.prototype;
  if(!proto||typeof proto.die!=='function'||proto.die._pkmsvvDexDefeats)return false;
  const prior=proto.die;
  const wrapped=function(...args){
   const wasDead=!!this.dead;
   const result=prior.apply(this,args);
   if(!wasDead&&this.dead&&!this.remote&&!this.pkmsvvBossGuard){
    const dex=dexId(this.dex||this.def?.dex);
    if(dex)markDefeated(G.DB?.save,dex);
   }
   return result;
  };
  wrapped._pkmsvvDexDefeats=true;
  proto.die=wrapped;return true;
 }
 function installGacha(){
  const gacha=G.Gacha;if(!gacha||typeof gacha.pull!=='function'||gacha.pull._pkmsvvDexDefeats)return false;
  const previous=gacha.pull,previousPool=gacha.pool;
  gacha.pool=function(...args){
   const all=previousPool?.apply(this,args)||[];
   return Array.isArray(all)?all.filter(m=>unlocked(G.DB?.save,m?.dex)):all;
  };
  const wrapped=function(s,...args){
   const originals=G.DEX;
   if(!s||!Array.isArray(originals))return previous.apply(this,arguments);
   const allowed=originals.filter(p=>unlocked(s,p?.dex));
   if(!allowed.length){
    G.UI?.toast?.(L('Hãy gặp Pokémon ngoài bản đồ để mở Chiêu mộ!','Encounter Pokémon on the map to unlock Recruitment!'),2600);
    return null;
   }
   // Native Gacha's private rarity pool reads G.DEX synchronously. Temporarily
   // scope that collection to defeated species; always restore, even on throw.
   try{
    G.DEX=allowed;
    if(G.DEX!==allowed)throw Error('Dex gate could not be installed');
    const res=previous.apply(this,arguments);
    if(res&&(!Array.isArray(res)||res.some(x=>!unlocked(s,x.dex))))
     throw Error('Gacha tried to award undiscovered Pokémon');
    if(!res)G.UI?.toast?.(L('Chưa có Pokémon đủ điều kiện cho lượt quay này; vé được giữ nguyên.',
     'No eligible Pokémon for this pull; your ticket was not spent.'),2700);
    return res;
   }catch(err){
    console.warn('[Pokédex Gacha gate] refusing unsafe purchase',err);
    G.UI?.toast?.(L('Không thể quay ở nhóm đã mở. Không trừ vé.',
     'No unlocked species in this rarity group. No ticket charged.'),2700);
    return null;
   }finally{G.DEX=originals;}
  };
  wrapped._pkmsvvDexDefeats=true;gacha.pull=wrapped;
  return true;
 }
 function install(){return installEnemy()&&installGacha()&&installSight();}
 install();
 G.PKMSVVDexDefeats={unlocked,markDefeated,markSeen,noteSight,ensureLedger,install,legacyProfile};
})();