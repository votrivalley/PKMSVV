/* Explore-only Pokédex defeat and Recruitment gate — isolated QA only.
 * Encounters and victories outside Explore never reveal new species.
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
  // Old sighting flags remain in saves for backup compatibility, but NO LONGER unlock new entries.
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
 function inExplore(){
  const region=G.PKMSVVQuickRegion;
  return G.Game?.state==='playing'&&region?.active===true&&
   Number.isInteger(region.selectedRegion)&&region.selectedRegion>=0&&
   !G.Coop?.active&&!G.PKMSVVChampionArena?.active&&
   !G.PKMSVVArenaSolo?.active&&!G.PKMSVVArenaPvp?.active&&
   !G.Royale?.active&&!G.EggRush?.active;
 }
 function isDefeatable(e){
  return !!e&&!e.remote&&!e.pkmsvvBossGuard&&!e.def?.pkmsvvBossGuard&&
   e.pkmsvvGuardianOf===undefined&&e.def?.pkmsvvGuardianOf===undefined&&
   !e.pkmsvvFriendly&&!e.friendly&&!e.isSupport&&!e.isPlayer&&
   !e.def?.pkmsvvFriendly&&!e.def?.friendly;
 }
 function persistDefeat(s,dex){
  const id=dexId(dex),db=G.DB;
  if(!id||!G.DEX_BY?.[id]||!s||db?.guest||db?.save!==s)return false;
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

 function markDefeated(s,dex){return inExplore()&&persistDefeat(s,dex);}
 // Only the ACTUAL player's completed evolution history registers the new form.
 function markEvolved(s,from,to,pl){
  const source=dexId(from),target=dexId(to);
  if(!source||!target||source===target||!pl||pl.remote||
   pl!==G.Game?.player||Number(pl.dex)!==target)return false;
  const hist=pl.pkmEvoHistory;
  if(!Array.isArray(hist)||!hist.some(x=>Number(x?.from)===source&&Number(x?.to)===target))return false;
  return persistDefeat(s,target);
 }
 // Compiled 2.0 has closure-local evolve(); polling the engine's real tick
 // observes its authentic history without modifying the pinned game bundle.
 const seenEvolution=new WeakMap();
 function observeEvolution(pl){
  if(!pl||pl!==G.Game?.player||pl.remote)return false;
  const hist=pl.pkmEvoHistory;
  if(!Array.isArray(hist)||!hist.length)return false;
  const row=hist[hist.length-1];
  if(!row||Number(row.to)!==Number(pl.dex))return false;
  const stamp=hist.length+':'+row.from+':'+row.to+':'+row.at;
  if(seenEvolution.get(pl)===stamp)return false;
  seenEvolution.set(pl,stamp);
  return markEvolved(G.DB?.save,row.from,row.to,pl);
 }
 function installEvolution(){
  const evo=G.PKMSVVEvo;
  if(!evo||typeof evo.tick!=='function')return false;
  if(!evo.tick._pkmsvvDexEvolution){
   const previous=evo.tick;
   function tick(pl,...args){const result=previous.call(this,pl,...args);observeEvolution(pl);return result;}
   tick._pkmsvvDexEvolution=true;evo.tick=tick;
  }
  if(typeof evo.evolve==='function'&&!evo.evolve._pkmsvvDexEvolution){
   const previous=evo.evolve;
   function evolve(pl,r,...args){const result=previous.call(this,pl,r,...args);if(result)observeEvolution(pl);return result;}
   evolve._pkmsvvDexEvolution=true;evo.evolve=evolve;
  }
  return true;
 }

 // Sightings do not create progress. Do not hook EnemyMgr.add/update.

 function installEnemy(){
  const proto=G.Enemy?.prototype;
  if(!proto||typeof proto.die!=='function'||proto.die._pkmsvvDexDefeats)return false;
  const prior=proto.die;
  const wrapped=function(...args){
   const wasDead=!!this.dead;
   const validExploreKill=inExplore()&&isDefeatable(this);
   const dex=dexId(this.dex??this.def?.dex),profile=G.DB?.save;
   const result=prior.apply(this,args);
   // The last boss may synchronously end the run in die(). Trust the pre-death mode snapshot.
   if(validExploreKill&&!wasDead&&this.dead&&dex)persistDefeat(profile,dex);
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
   const gen=Number(args[1]);
   const selectedGen=Number.isInteger(gen)&&gen>=1&&gen<=9?gen:0;
   const allowed=originals.filter(p=>unlocked(s,p?.dex));
   // A Gen tab MUST NOT borrow an unlocked Pokémon from another generation.
   // Guard before the native paid pull, so tickets, pity and save are intact.
   const available=selectedGen?allowed.filter(p=>Number(p.gen??G.DEX_BY?.[p.dex]?.gen)===selectedGen):allowed;
   if(!available.length){
    const names=['','Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea'];
    const where=names[selectedGen]||'';
    G.UI?.toast?.(selectedGen?
     L('Bạn chưa có Pokémon nào thuộc '+where+' trong Pokédex. Hãy hạ gục hoặc tiến hóa để mở khóa!',
       'You have no '+where+' Pokémon unlocked in your Pokédex. Defeat or evolve one first!'):
     L('Chỉ Pokémon đã mở trong Pokédex mới có thể Chiêu mộ. Hãy hạ gục hoặc tiến hóa để mở!',
       'Only Pokédex-unlocked Pokémon can be recruited. Defeat or evolve one first!'),3400);
    return null;
   }
   if(!allowed.length){
    G.UI?.toast?.(L('Hãy hạ Pokémon trong Khám phá hoặc tiến hóa để mở Chiêu mộ!','Defeat Pokémon in Explore or evolve to unlock Recruitment!'),2600);
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
 function install(){const enemy=installEnemy(),gacha=installGacha();installEvolution();return enemy&&gacha;}
 install();
 G.PKMSVVDexDefeats={unlocked,markDefeated,markEvolved,observeEvolution,installEvolution,inExplore,isDefeatable,ensureLedger,install,legacyProfile};
})();