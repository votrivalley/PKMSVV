/* QA encounter rarity: all PvE modes, authoritative host only.
 * Outside: 96% ordinary (tier 1–2), 4% Rare (tier 3).
 * Native rifts: Rare (tier 3) or Epic (tier 4), no Legendary wilds.
 * Timed bosses, Champion, support guardians and partner actors are untouched.
 */
G.PKMSVVEncounterRarity=(()=>{
 const COMMON_RATE=.96,RIFT_EPIC_RATE=.25;
 const done=new WeakSet(),cache=new Map();
 const region=()=>G.PKMSVVQuickRegion?.active?G.PKMSVVQuickRegion.selectedRegion:-1;
 function pool(index,rarity,rift){
  const key=index+':'+rarity+':'+(rift?1:0);
  if(cache.has(key))return cache.get(key);
  const list=(G.DEX||[]).filter(p=>{
   if(Number(p.rarity)!==rarity||p.leg||!G.SPRITE_META?.[p.dex])return false;
   if(index>=0&&!G.PKMSVVQuickRegion?.isAllowed?.(p.dex,index))return false;
   return rift||index<0||G.PKMSVVQuickRegion?.eligibleByTime?.(p.dex,index);
  });
  cache.set(key,list.map(x=>Number(x.dex)));
  return cache.get(key);
 }
 function eligibleEnemy(e){
  if(!e||e.remote||e.dead||e.pkmsvvEncounterTiered||e.pkmsvvExploreBoss||
   e.pkmsvvMilestone||e.judge||e.arceus||e.pkmsvvBossGuard||
   e.pkmsvvGuardianOf!==undefined||e.pkmsvvFriendly||e.friendly||
   e.isPlayer||e.isSupport)return false; // Ordinary untimed minibosses also follow tier caps.
  if(G.Game?.state!=='playing'||G.PKMSVVChampionArena?.active||
   (G.Coop?.active&&!G.Coop.isHost))return false;
  return Number.isInteger(Number(e.dex??e.def?.dex));
 }
 function choose(index,rift,boss=false){
  // Untimed minibosses choose at least uncommon tier 2 (and Rare 4%)
  // rather than spawning a weak Rattata or leaking random Legendaries.
  const tier=rift?(Math.random()<RIFT_EPIC_RATE?4:3):
   boss?(Math.random()<COMMON_RATE?2:3):
   (Math.random()<COMMON_RATE?(Math.random()<.5?1:2):3);
  let options=pool(index,tier,rift);
  if(!options.length)options=pool(index,rift?(tier===4?3:4):(tier===1?2:1),rift);
  if(!options.length)return null;
  return options[Math.floor(Math.random()*options.length)];
 }
 function grade(e){
  if(!eligibleEnemy(e)||done.has(e))return false;
  done.add(e);e.pkmsvvEncounterTiered=true;
  const isRift=!!G.Rift?.inArena,index=region(),dex=choose(index,isRift,!!(e.boss||e.isBoss));
  // Every ordinary Rift enemy gets 2× HP, including a same-species roll.
  // Mark the instance so regrade / respawn hooks never double-multiply it.
  if(isRift&&!e.pkmsvvRiftDoubleHp&&Number.isFinite(e.maxHp)&&e.maxHp>0){
   const currentHp=Number.isFinite(e.hp)?e.hp:e.maxHp;
   e.maxHp=Math.max(1,Math.round(e.maxHp*2));
   e.hp=Math.min(e.maxHp,Math.max(0,Math.round(currentHp*2)));
   e.pkmsvvRiftDoubleHp=true;
  }
  if(!dex||dex===Number(e.dex))return false;
  const mon=G.DEX_BY?.[dex];if(!mon)return false;
  const rarity=Number(mon.rarity)||1;
  const previous=Number(e.dex??e.def?.dex);
  e.dex=dex;
  if(e.mon)e.mon=mon;
  if(e.def)e.def={...e.def,dex,name:mon.name||'Pokémon '+dex,
   ...(Array.isArray(mon.types)?{types:mon.types}:{})};
  e.name=mon.name||e.name;
  const factor=rarity===4?1.7:rarity===3?1.2:1;
  if(factor>1&&Number.isFinite(e.maxHp)&&e.maxHp>0){
   e.maxHp=Math.round(e.maxHp*factor);e.hp=Math.min(e.maxHp,Math.max(1,Math.round(e.hp*factor)));
   if(Number.isFinite(e.dmg))e.dmg=Math.max(1,e.dmg*(rarity===4?1.3:1.1));
  }
  if(G.Sprites?.Animator){
   try{e.anim=new G.Sprites.Animator(dex,e.scale||1,!!e.shiny);}
   catch(err){console.warn('[Rarity] sprite correction failed',dex,err);}
  }
  return previous!==dex;
 }
 function install(){
  if(typeof G.EnemyMgr?.add!=='function'||G.EnemyMgr.add._pkmsvvRarityQA)return false;
  const old=G.EnemyMgr.add;
  function wrapped(...args){
   if(args[0])grade(args[0]);
   return old.apply(this,args);
  }
  wrapped._pkmsvvRarityQA=true;
  G.EnemyMgr.add=wrapped;
  return true;
 }
 install();
 return {grade,choose,pool,install,COMMON_RATE,RIFT_EPIC_RATE};
})();
