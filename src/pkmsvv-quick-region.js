/* Pokémon Chuyển Sinh: QA-only "Chơi ngay" Region chooser.
 * This is NORMAL free play, not the 16-player Champion tournament.
 * Only the current run uses a fixed biome and generation-filtered native waves.
 * Exploration awards a Region Badge only for defeating the 15-minute area boss.
 * Keep legacy Explore/Champion Seal save keys readable without rewriting them.
 */
(function(){
 'use strict';
 if(typeof document==='undefined'||typeof G==='undefined')return;
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 // Kanto uses the same default starter battlefield as normal Survival (biome 0).
 // Fire belongs to late-game Paldea, not the first region for newcomers.
 // Ten UNIQUE native terrain profiles; Gen 1–9 must never reuse a biome.
 const THEMES=Object.freeze([null,'ground','water','ice','steel','rock','bug','fighting','fire','dragon']);
 const NAMES=['Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea','Votri Valley'];
 const SYMBOLS=['🌿','🏞️','🌊','❄️','⚙️','⛰️','🌴','🏟️','🔥','🐉'];
 const REGION_COUNT=10;
 const SEAL_SECONDS=15*60; // Badge at 15:00; a second legendary victory at 30:00 ends the run.
 const FINAL_BOSS_SECONDS=30*60;
 // National Dex mascots chosen for the nine exploration Gen covers.
 // Keep the tenth, mixed-generation Sky Pillar, using its existing Rayquaza art.
 const REGION_MASCOTS=Object.freeze([150,249,385,488,646,718,800,890,1024,384]);

 // No gameplay badge: the selected place and Gen are already clear in chooser.
 // Progressive wildlife is shared by all ten exploration maps, Sky included.
 const WAVE_SECONDS=[0,120,240,360,480,600,720];
 const GEN_BOUNDS=[[1,151],[152,251],[252,386],[387,493],[494,649],
  [650,721],[722,809],[810,905],[906,1025]];
 // Canonical National Pokédex: https://pokemondb.net/pokedex/national
 // The generation is the one in which the SPECIES was introduced, not the
 // generation of the current biome, its regional form or its latest sprite.
 // The ranges are immutable, contiguous and cover all 1025 National entries.
 function nationalGen(dex){
  const id=Number(dex);
  if(!Number.isInteger(id)||id<1||id>1025)return 0;
  for(let i=0;i<GEN_BOUNDS.length;i++)
   if(id>=GEN_BOUNDS[i][0]&&id<=GEN_BOUNDS[i][1])return i+1;
  return 0;
 }
 let poolDex=null,poolMeta=null,poolBy=null;
 const poolCache=new Map(),poolSetCache=new Map();
 function speciesFor(index){
  if(index<0||index>=REGION_COUNT)return [];
  const dex=G.DEX,meta=G.SPRITE_META,by=G.DEX_BY;
  if(dex!==poolDex||meta!==poolMeta||by!==poolBy){
   poolDex=dex;poolMeta=meta;poolBy=by;poolCache.clear();poolSetCache.clear();
  }
  if(poolCache.has(index))return poolCache.get(index);
  // Gacha eligibility (actual DEX entries plus sprites), with the canonical
  // National Dex number determining Gen regardless of incorrect .gen tags.
  const available=Array.isArray(dex)?dex.filter(p=>
    p&&!!meta?.[p.dex]&&(index===9||nationalGen(p.dex)===index+1)&&!!by?.[p.dex])
   .map(p=>Number(p.dex)):[];
  // The old test harness does not always provide G.DEX. Never use this
  // fallback when a real Gacha list is present; otherwise it can silently
  // re-introduce Pokémon not offered in the selected Gen.
  const fallback=!Array.isArray(dex)?Object.keys(by||{}).map(Number).filter(n=>
    !!by[n]&&(index===9||nationalGen(n)===index+1)):[];
  const list=[...new Set(Array.isArray(dex)?available:fallback)];
  poolCache.set(index,list);poolSetCache.set(index,new Set(list));
  return list;
 }
 function isAllowed(dex,index){
  if(index<0||index>=REGION_COUNT)return false;
  const id=Number(dex),pool=speciesFor(index);
  if(!Number.isInteger(id)||!(index===9||nationalGen(id)===index+1))return false;
  if(Array.isArray(G.DEX))return poolSetCache.get(index)?.has(id)===true;
  return pool.includes(id); // Minimal test registries use National range.
 }
 // Stages come from the game's existing evolution rules, not National Dex order.
 // Single-stage high-stat species (Kangaskhan, Lapras...) are gated by stats.
 let evolutionSource=null,evolutionParents=new Map(),evolutionMemo=new Map();
 function evolutionDepth(id,ancestors=new Set()){
  const rules=G.PKMSVV_EVOLUTION_DATA?.rules;
  if(rules!==evolutionSource){
   evolutionSource=rules;evolutionParents.clear();evolutionMemo.clear();
   for(const row of Array.isArray(rules)?rules:[])
    if(Number.isInteger(+row.from)&&Number.isInteger(+row.to)){
     const parents=evolutionParents.get(+row.to)||[];
     parents.push(+row.from);evolutionParents.set(+row.to,parents);
    }
  }
  if(evolutionMemo.has(id))return evolutionMemo.get(id);
  if(ancestors.has(id))return 0; // Corrupt cyclic evolution data must not hang.
  ancestors.add(id);
  const depth=Math.min(2,Math.max(0,...(evolutionParents.get(id)||[]).map(parent=>
   1+evolutionDepth(parent,ancestors))));
  ancestors.delete(id);evolutionMemo.set(id,depth);return depth;
 }
 function pokemonStrength(id){
  const mon=G.DEX_BY?.[id]||{};
  const stats=['hp','pa','df','sa','sd','spd'].map(k=>Number(mon[k]));
  const total=stats.every(x=>Number.isFinite(x)&&x>0)?
   stats.reduce((a,b)=>a+b,0):370;
  const depth=evolutionDepth(id);
  const rarity=Number(mon.rarity)||0;
  // Tiers use both true battle stats and evolutionary maturity, never Dex ID.
  const power=total+depth*28+(rarity>=5?90:rarity===4?25:0);
  return {id,total,depth,rarity,power};
 }
 function encounterSeconds(){
  // Berry's pending selection must always begin at time zero, even if
  // the previous run's Game.st.time was never reset until native startRun.
  if(preRunPending)return 0;
  const value=Number(G.Game?.st?.time??G.Game?.time??0);
  return Number.isFinite(value)?Math.max(0,value):0;
 }
 function encounterTier(time=encounterSeconds()){
  const t=Math.max(0,Number(time)||0);
  return Math.min(6,WAVE_SECONDS.reduce((n,at)=>t>=at?n+1:n,0)-1);
 }
 function eligibleByTime(id,index,time=encounterSeconds()){
  if(!isAllowed(id,index))return false;
  // Ordinary wilds, Rifts and minibosses may NEVER generate legendary-tier
  // Pokémon. Gen mascots enter only as the marked 15-minute Region Boss.
  const mon=G.DEX_BY?.[id];
  if(mon?.leg||mon?.legendary||Number(mon?.rarity)>=5)return false;
  if(G.Rift?.inArena)return Number(mon?.rarity)>=3&&Number(mon?.rarity)<=4;
  const {total,depth,rarity}=pokemonStrength(id);
  const tier=encounterTier(time);
  // The first TWO minutes: only unevolved, weak Pokémon. Progressive
  // ceilings unlock mid-stage, fully evolved and rare monsters in sequence.
  const levels=[
   {total:355,depth:0,rarity:3},
   {total:400,depth:0,rarity:3},
   {total:445,depth:1,rarity:4},
   {total:490,depth:1,rarity:4},
   {total:545,depth:2,rarity:4},
   {total:600,depth:2,rarity:5},
   {total:9999,depth:2,rarity:999}
  ];
  const rule=levels[tier];
  return total<=rule.total&&depth<=rule.depth&&rarity<=rule.rarity;
 }
 let pickCounter=0;
 function progressivePool(index,time=encounterSeconds(),isBoss=false){
  const all=speciesFor(index);
  if(!all.length)return [];
  // A boss may be a modestly stronger opponent at its scheduled time,
  // but never an unrestricted endgame evolution in minute one.
  const effectiveTime=Math.max(0,time+(isBoss?80:0));
  let eligible=all.filter(id=>eligibleByTime(id,index,effectiveTime));
  if(!eligible.length){
   // Sparse catalogues: use the weakest available in THIS Gen, never
   // jump to a mixed-Gen pool or let the enemy wave disappear.
   const weakest=all.map(pokemonStrength).sort((a,b)=>a.power-b.power||a.id-b.id)[0];
   eligible=weakest?[weakest.id]:[];
  }
  return eligible.sort((a,b)=>pokemonStrength(a).power-pokemonStrength(b).power||a-b);
 }
 function pickProgressive(index,time=encounterSeconds(),boss=false,offset=0){
  const pool=progressivePool(index,time,boss);
  if(!pool.length)return null;
  // Normal waves rotate within the current strength band. Bosses prefer
  // the stronger half of *currently available* species, not early legendaries.
  const start=boss?Math.floor(pool.length/2):0,span=pool.length-start;
  return pool[start+(Math.abs(pickCounter++ + offset)%span)];
 }
 // Boss guards are spawned from the canonical Egg-support roster, NOT from
 // native wild/mini-boss bags. Preserve the selected Pichu/Riolu/etc even in
 // Kanto. The metadata signature covers the native compiled module, where
 // pkmsvvBossGuard is set immediately AFTER new G.Enemy(...).
 const BOSS_GUARD_DEX=new Set([172,447,173,360,174]);
 function isBossGuardian(def){
  if(!def||typeof def!=='object')return false;
  if(def.pkmsvvBossGuard||def.pkmsvvGuardianOf!==undefined)return true;
  return def.xp===1&&def.behavior==='chase'&&BOSS_GUARD_DEX.has(Number(def.dex));
 }
 function bossLike(def,flag=false){
  return flag||!!(def.boss||def.isBoss||def.pkmsvvStoryBoss||def.elite||def.isElite);
 }
 function progressiveDefinition(def,index,time=encounterSeconds(),offset=0,forceBoss=false){
  if(!def||typeof def!=='object'||!Number.isInteger(Number(def.dex)))return def;
  if(isBossGuardian(def))return def;
  const id=Number(def.dex),boss=bossLike(def,forceBoss);
  const permitted=eligibleByTime(id,index,time);
  if(permitted&&!boss)return def;
  if(permitted&&boss){
   const pool=progressivePool(index,time,true);
   // A Ratatta-sized wild Pokémon can be a normal encounter, but a mini-
   // boss should use the stronger half of the current SAFE minute's roster.
   // No out-of-Gen species or opening legendaries are permitted.
   if(pool.length<3||
    pokemonStrength(id).power>=pokemonStrength(pool[Math.floor(pool.length/2)]).power)
    return def;
  }
  const target=pickProgressive(index,time,boss,offset);
  if(target===null)return null; // No eligible local species: fail closed.
  const mon=G.DEX_BY?.[target];
  return {...def,dex:target,name:mon?.name||('Pokémon '+target),
   ...(Array.isArray(mon?.types)?{types:mon.types}:{})};
 }
 function enforceGeneration(bag,index){
  if(!Array.isArray(bag)||index<0||index>=REGION_COUNT)return bag;
  if(!speciesFor(index).length){
   console.error('[Region] No sprite-backed Gacha species in '+NAMES[index]);
   return [];
  }
  return bag.map((def,i)=>progressiveDefinition(def,index,encounterSeconds(),i))
   .filter(Boolean);
 }
 // Fixed names; the WebP files are copied from assets/region-covers/ into each QA build.
 const COVER_FILES=[
  '01-kanto.webp','02-johto.webp','03-hoenn.webp','04-sinnoh.webp',
  '05-unova.webp','06-kalos.webp','07-alola.webp','08-galar.webp',
  '09-paldea.webp','10-sky-tower.webp'
 ];
 // Local SVG pixel scenery: original artwork; no PokéLit resources are copied.
 const SCENE_PALETTES=[
  ['#5ba9e8','#bceef7','#348b63'],['#7975b9','#e8ab75','#a65c53'],
  ['#296c9f','#a5dfde','#217ca0'],['#749bba','#e9f4fc','#607b9f'],
  ['#677ba7','#f0ad8d','#465a7a'],['#8d9cc5','#eec1c1','#9d6c98'],
  ['#56b4d0','#f9e3a4','#468f72'],['#6c85b3','#dbbdc6','#505d88'],
  ['#99a7ca','#efd1ab','#a38070'],['#6b85bb','#d6e7ff','#6d88b4']];
 const LANDMARKS=[
  '<rect x="110" y="51" width="43" height="35" fill="#f2f5e8"/><path d="M106 52l25-16 26 16" fill="#d34e55"/><rect x="127" y="68" width="11" height="18" fill="#5699ac"/><rect x="18" y="41" width="7" height="49" fill="#72503b"/><path d="M0 54L22 17 43 54z" fill="#428f62"/><rect x="61" y="42" width="7" height="48" fill="#74523b"/><path d="M44 53L64 18 85 53z" fill="#4d9a63"/>',
  '<rect x="86" y="35" width="23" height="51" fill="#d2b89e"/><path d="M70 36h56l-10-11H80zM75 51h47l-8-10H83zM78 66h41l-9-10H87z" fill="#924f4b"/><rect x="12" y="42" width="7" height="49" fill="#6e4b40"/><circle cx="16" cy="39" r="24" fill="#d57e4d"/><rect x="165" y="47" width="6" height="45" fill="#6e4b40"/><circle cx="168" cy="46" r="20" fill="#b55c57"/>',
  '<rect y="54" width="192" height="46" fill="#2784a4"/><path d="M2 61L31 32 58 58 99 29 130 59 162 33 190 57" fill="#376e6c"/><path d="M0 78q16-9 32 0t32 0t32 0t32 0t32 0t32 0" stroke="#c1f3f4" stroke-width="3" fill="none"/>',
  '<path d="M0 89L39 44 66 65 103 4 145 61 170 31 192 68v32H0" fill="#bdd9e7"/><path d="M68 60l35-56 42 57-25-17-11 7-6-23-14 23z" fill="#fff"/><path d="M0 85l37-15 35 12 75-17 45 15v20H0" fill="#637c9c"/>',
  '<rect x="9" y="43" width="25" height="52" fill="#43536d"/><rect x="44" y="21" width="32" height="74" fill="#53677d"/><rect x="86" y="36" width="29" height="59" fill="#405573"/><rect x="126" y="9" width="29" height="86" fill="#435674"/><rect x="167" y="34" width="24" height="61" fill="#374f69"/><path d="M0 87h192" stroke="#ebc98a" stroke-width="6"/><path d="M52 31h5v8h-5zm15 0h5v8h-5zm69-10h5v8h-5z" fill="#ffe0a9"/>',
  '<rect x="59" y="46" width="69" height="46" fill="#ecd1bc"/><path d="M52 46L94 15 136 46" fill="#b26f91"/><rect x="80" y="63" width="16" height="29" fill="#765875"/><rect x="149" y="17" width="13" height="71" fill="#e9d4b8"/><path d="M143 20L156 0 169 20" fill="#a96a8b"/><circle cx="25" cy="66" r="19" fill="#e493b1"/><circle cx="169" cy="65" r="16" fill="#e493b1"/>',
  '<rect x="0" y="70" width="192" height="30" fill="#eed69c"/><path d="M0 78q22-8 45 0t44 0t44 0t44 0" stroke="#4dafcc" stroke-width="6" fill="none"/><rect x="23" y="39" width="7" height="53" fill="#82634d"/><path d="M26 42q-25-30-40-10 19-6 40 12Q9 11 50 18L26 44q36-29 47-8l-47 8" fill="#3c9b6d"/><rect x="102" y="64" width="33" height="27" fill="#e0c49b"/><path d="M96 65l22-22 23 22" fill="#ba7c53"/>',
  '<rect x="36" y="38" width="119" height="56" fill="#d9ccbc"/><rect x="45" y="13" width="23" height="65" fill="#afafb4"/><rect x="122" y="10" width="23" height="70" fill="#a9a5af"/><path d="M42 14L56 0 70 14M120 11L134-3 147 11" fill="#82627c"/><rect x="77" y="50" width="36" height="44" fill="#e9dbbd"/><path d="M70 50l26-19 24 19" fill="#805c7e"/><rect x="20" y="39" width="7" height="46" fill="#c65d70"/><rect x="165" y="44" width="7" height="46" fill="#c65d70"/>',
  '<path d="M0 84L45 43 90 66 140 32 192 72v30H0" fill="#ba9580"/><rect x="64" y="40" width="82" height="54" fill="#dfc6a5"/><path d="M58 41l46-25 47 25" fill="#a36b59"/><rect x="78" y="59" width="21" height="18" fill="#719baf"/><rect x="112" y="55" width="19" height="39" fill="#795f70"/><rect x="160" y="23" width="6" height="64" fill="#9a775b"/><path d="M145 36l18-29 19 29" fill="#f7e4a8"/>',
  '<g fill="#e7f7ff"><ellipse cx="30" cy="79" rx="43" ry="13"/><ellipse cx="163" cy="84" rx="48" ry="16"/><ellipse cx="98" cy="34" rx="39" ry="13"/></g><path d="M11 69l82-28 88 26-53 14H59z" fill="#647bad"/><rect x="84" y="11" width="25" height="51" fill="#c6d1e7"/><path d="M75 13L96-5 117 13" fill="#928dbe"/><rect x="93" y="32" width="7" height="30" fill="#7c84bc"/>'
 ];
 function regionScene(i){
  const p=SCENE_PALETTES[i]||SCENE_PALETTES[0];
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 100" width="192" height="100" shape-rendering="crispEdges">'+
   '<defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="'+p[0]+'"/><stop offset="1" stop-color="'+p[1]+'"/></linearGradient></defs>'+
   '<rect width="192" height="100" fill="url(#s)"/><circle cx="165" cy="20" r="12" fill="#fff1cb" opacity=".8"/>'+
   '<path d="M0 77L36 49 68 68 116 42 152 63 192 44V100H0" fill="'+p[2]+'"/>'+
   LANDMARKS[i]+'</svg>';
  // Layer the user-provided WebP above the original built-in SVG fallback.
  const cover=COVER_FILES[i]||COVER_FILES[0];
  return 'background-image:url("images/regions/'+cover+'"),url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
 }

 const title=(n)=>n===9?tr('Tháp Thiên Không','Sky Pillar'):NAMES[n];
 let overlay=null,armed=null,current=null,previousBiome=null,changing=false,bypass=false,preRunPending=false;
 // No visible National Dex QA overlay in normal gameplay.
 function showRegionBadge(){const old=document.getElementById?.('pkmsvv-region-gen-badge');old?.remove?.();}
 const getChampion=()=>G.PKMSVVChampionArena;
 const getSave=()=>G.DB?.save;
 function hasSeal(index,save=getSave()){
  if(!Number.isInteger(index)||index<0||index>=REGION_COUNT)return false;
  const name=NAMES[index];
  // Existing Champion progress remains a valid unlock; never rewrite it.
  return save?.pkmsvvExploreSeals?.[name]===true||
   save?.arenas?.pkmChampion?.seals?.[name]===true;
 }
 function unlocked(index,save=getSave()){
  if(!Number.isInteger(index)||index<0||index>=REGION_COUNT)return false;
  if(index===0)return true;
  // All nine preceding regions are required for Sky; no Arena obligation.
  return hasSeal(index,save)||
   NAMES.slice(0,index).every((_,i)=>hasSeal(i,save));
 }
 // Keep the old pkmsvvExploreSeals save key for backward-compatible saves.
 // "Huy hiệu Vùng" / "Region Badge" is the player-visible terminology.
 function actualRunSeconds(run=current){
  if(!run||G.Game?.state!=='playing'||preRunPending)return null;
  const now=Number(G.Game?.st?.time??G.Game?.time);
  if(!Number.isFinite(now)||now<0)return null;
  if(run.startedAt===null)run.startedAt=now;
  return Math.max(0,now-run.startedAt);
 }
 function canFightRegionBoss(run=current){
  if(preRunPending&&G.Game?.state==='playing')preRunPending=false;
  return !!run&&G.Game?.state==='playing'&&!preRunPending&&
   !G.Coop?.active&&!getChampion()?.active&&
   !G.Game?.player?.dead&&!(Number(G.Game?.player?.hp)<=0);
 }

 function localEpic(index){
  const source=G.DEX||[];
  const allowed=source.filter(p=>p&&Number(p.rarity)===4&&
   G.SPRITE_META?.[p.dex]&&isAllowed(p.dex,index));
  return allowed.length?allowed[Math.floor(Math.random()*allowed.length)]:null;
 }
 function spawnRegionBoss(run=current,final=false){
  if(!canFightRegionBoss(run))return false;
  const elapsed=actualRunSeconds(run),threshold=final?FINAL_BOSS_SECONDS:SEAL_SECONDS;
  const key=final?'finalBoss':'badgeBoss';
  if(run[key]||elapsed===null||elapsed<threshold)return false;
  // 15:00: 30% Legendary and 70% Epic (rare region-specific species).
  // 30:00: guaranteed Legendary mascot from this Gen, a real killable actor.
  const mascot=REGION_MASCOTS[run.index];
  const epic=!final&&Math.random()>=.30?localEpic(run.index):null;
  const dex=final?mascot:(epic?.dex||mascot);
  const hero=G.Game?.player,mon=G.DEX_BY?.[dex];
  if(!hero||!mon||typeof G.Enemy!=='function'||typeof G.EnemyMgr?.add!=='function')return false;
  const source=G.Enemies?.BOSSES?.[0]||{};
  const hp=Math.round((final?62000:28000)+run.index*(final?14000:8000));
  const def={...source,dex,name:mon.name||('Pokémon '+dex),
   hp,dmg:Math.max((final?43:24)+run.index*4,Number(source.dmg)||0),
   spd:Math.max(70,Math.min(145,Number(source.spd)||90)),
   xp:0,behavior:source.behavior||'boss',pkmsvvExploreBoss:true};
  try{
   const enemy=new G.Enemy(def,Number(hero.x||0)+230,Number(hero.y||0)-95,
    {hp:1,dmg:1,spd:1},true);
   enemy.pkmsvvExploreBoss=true;enemy.pkmsvvExploreRegion=run.index;
   enemy.pkmsvvExploreFinal=final;enemy.hp=enemy.maxHp=hp;
   const created=G.EnemyMgr.add(enemy);
   if(created===false||created===null)throw Error('Region Boss add failed');
   run[key]=enemy;
   G.Sprites?.preload?.([dex],4000);
   G.Spawner?.say?.(tr(final?'👑 HUYỀN THOẠI CUỐI CÙNG!':'👑 THỬ THÁCH 15 PHÚT!',
    final?'👑 FINAL LEGENDARY!':'👑 15-MINUTE BOSS!'),4);
   G.UI?.toast?.(tr(final?'Hạ Boss Huyền Thoại 30 phút để hoàn thành vùng!':'Hạ Boss 15 phút để nhận Huy hiệu Vùng!',
    final?'Defeat the 30-minute Legendary to finish the region!':'Defeat the 15-minute boss to earn the Region Badge!'),4000);
   return true;
  }catch(err){console.warn('[Explore] timed boss failed',err);return false;}
 }
 // The original save.pkmsvvExploreSeals is retained as the Badge ledger;
 // only one successful save transaction earns it, no duplicate rewards.
 function tryEarnSeal(){
  const run=current,boss=run?.badgeBoss;
  if(!run||run.badgeClaimed||!boss||!boss.dead||Number(boss.hp)>0||
   !canFightRegionBoss(run)||actualRunSeconds(run)<SEAL_SECONDS)return false;
  const save=getSave(),name=NAMES[run.index];
  if(!save)return false;
  if(hasSeal(run.index,save)){
   run.badgeClaimed=true;
   G.UI?.toast?.(tr('🏅 Đã vượt Boss 15 phút! Hãy trụ đến phút 30.',
    '🏅 First boss defeated! Survive until minute 30.'),3300);
   return true;
  }
  const original=save.pkmsvvExploreSeals;
  if(original!==undefined&&(!original||Array.isArray(original)||typeof original!=='object'))return false;
  save.pkmsvvExploreSeals={...(original||{}),[name]:true};
  try{
   if(typeof G.DB?.commit!=='function'||G.DB.commit(true)===false)
    throw Error('Badge save failed');
  }catch(err){
   if(original===undefined)delete save.pkmsvvExploreSeals;
   else save.pkmsvvExploreSeals=original;
   console.warn('[Explore] Badge rollback',err);
   return false;
  }
  run.badgeClaimed=true;
  G.UI?.toast?.(tr('🏅 Huy hiệu Vùng '+name+'! Vùng mới đã mở. Tiếp tục đến phút 30.',
   '🏅 '+name+' Badge earned! Next region unlocked. Continue to minute 30.'),5000);
  return true;
 }
 function finishRegionMatch(run=current){
  if(!run||run.victoryScheduled||!run.finalBoss||
   !run.finalBoss.dead||Number(run.finalBoss.hp)>0)return false;
  run.victoryScheduled=true;
  const done=()=>{
   if(current!==run||G.Game?.state!=='playing')return;
   try{G.Game?.quit?.();}
   catch(error){console.warn('[Explore] Victory transition failed',error);return;}
   G.UI?.toast?.(tr('🏆 HOÀN THÀNH VÙNG '+NAMES[run.index]+'!',
    '🏆 '+NAMES[run.index]+' REGION COMPLETED!'),5200);
  };
  if(typeof setTimeout==='function')setTimeout(done,0);
  else done();
  return true;
 }
 function updateRegionBoss(){
  if(!canFightRegionBoss())return false;
  const run=current,elapsed=actualRunSeconds(run);
  if(elapsed===null)return false;
  if(elapsed>=SEAL_SECONDS&&!run.badgeBoss)spawnRegionBoss(run,false);
  if(run.badgeBoss?.dead)tryEarnSeal();
  // The 30-minute boss only starts AFTER the first boss has been defeated.
  // Prevent two giant bosses occupying the field simultaneously.
  if(run.badgeClaimed&&elapsed>=FINAL_BOSS_SECONDS&&!run.finalBoss)
   spawnRegionBoss(run,true);
  if(run.finalBoss?.dead)finishRegionMatch(run);
  return true;
 }
 function regionIndex(){
  if(current&&preRunPending&&G.Game?.state==='playing')preRunPending=false;
  return current?.index??-1;
 }
 function targetBiome(index){
  if(!Number.isInteger(index)||index<0||index>=REGION_COUNT)return null;
  if(index===0)return 0; // Native starting grassland map, NOT late-game Fire.
  const n=G.Tiles?.arenaBiome?.(THEMES[index]);
  return Number.isInteger(n)&&n>=0?n:null;
 }
 function distinctMapBiomes(){
  // Validate the REAL native arenaBiome IDs, not just ten different theme
  // names or the WebP covers. If an engine update collapses two terrains,
  // block the unsafe selection rather than silently repeating a map.
  const ids=NAMES.map((_,index)=>targetBiome(index));
  return ids.every(Number.isInteger)&&new Set(ids).size===REGION_COUNT;
 }
 function endRun(){
  if(changing)return;
  changing=true;
  try{
   const previous=previousBiome;
   current=null;armed=null;previousBiome=null;preRunPending=false;
   showRegionBadge(-1);
   if(Number.isFinite(previous)&&typeof G.World?.setBiome==='function')
    G.World.setBiome(previous,true);
  }finally{changing=false;}
 }
 function choose(index){
  if(!unlocked(index)||getChampion()?.active||G.Coop?.active||G.Game?.state==='playing')return false;
  if(!distinctMapBiomes()){
   console.error('[Explore maps] Duplicate or missing biome: all nine regions and Sky need separate terrain');
   G.UI?.toast?.(tr('Bản đồ vùng chưa đồng bộ; vui lòng cập nhật bản chơi thử.',
    'Region maps are not ready; update your QA build.'),3000);
   return false;
  }
  const native=document.querySelector('#scr-menu [data-go="play"]');
  if(!native)return false;
  close();
  // Arm BEFORE replaying native Play. Berry may wrap startRun after this
  // module and delay the real startup by 10 seconds; the old code discarded
  // "armed" after native.click(), causing a full-Gen mixed run.
  const beforeBiome=G.World?.biome;
  if(current)endRun();
  if(!beginRun(index,beforeBiome))return false;
  armed=index;
  bypass=true;
  try{native.click();}
  catch(error){endRun();throw error;}
  finally{
   bypass=false;
   // Keep the actual scoped Region across a deferred Berry choice.
   // The next startRun consumes "armed"; an explicit exit clears it.
  }
  return true;
 }
 function entries(){
  const save=getSave(),champ=getChampion(),regions=champ?.REGIONS||NAMES.map(n=>[n,0,'']);
  return NAMES.map((name,i)=>({
   index:i,name:title(i),
   gen:i===9?tr('Rồng · Nhiều Gen','Dragon · Mixed Gen'):'Gen '+(i+1),
   champion:regions[i]?.[2]||'',
   difficulty:Math.min(5,1+Math.floor(i/2)),
   unlocked:unlocked(i,save),
   complete:hasSeal(i,save),
   icon:SYMBOLS[i]
  }));
 }
 function build(){
  if(overlay?.isConnected)return overlay;
  overlay=document.createElement('section');overlay.id='pkmsvv-quick-region';
  overlay.className='pkmsvv-quick-region-overlay';overlay.hidden=true;
  overlay.setAttribute('aria-label',tr('Chọn nơi bạn khám phá','Choose where to explore'));
  overlay.innerHTML='<div class="pkmsvv-quick-region-panel" role="dialog" aria-modal="true">'+
   '<header><div class="region-heading"><h2>'+tr('Chọn nơi bạn khám phá','Choose where to explore')+'</h2>'+
   '<p>'+tr('Phút 15: hạ Boss để nhận Huy hiệu, mở vùng tiếp theo. Phút 30: hạ Boss Huyền Thoại để hoàn thành trận.','15 min: defeat the boss to unlock the next region. 30 min: defeat the Legendary to finish the run.')+'</p></div>' +
   '<button type="button" id="pkmsvv-quick-region-close" aria-label="'+tr('Đóng','Close')+'">×</button></header>'+
   '<div id="pkmsvv-quick-region-grid" class="pkmsvv-quick-region-grid"></div></div>';
  document.body.append(overlay);
  overlay.querySelector('#pkmsvv-quick-region-close').onclick=close;
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
  return overlay;
 }
 function render(){
  const panel=build(),grid=panel.querySelector('#pkmsvv-quick-region-grid');
  grid.replaceChildren();
  for(const x of entries()){
   const b=document.createElement('button');b.type='button';
   b.className='pkmsvv-quick-region-card region-'+x.index+
    (x.unlocked?'':' locked')+(x.complete?' cleared':'');
   b.disabled=!x.unlocked;
   b.setAttribute('aria-label',x.name+' '+(x.unlocked?tr('Đã mở','Unlocked'):tr('Chưa mở','Locked')));
   const art=document.createElement('div');art.className='region-art';
   art.setAttribute('style',regionScene(x.index));
   const label=document.createElement('span');label.className='region-gen';label.textContent=x.gen;
   art.append(label);
   if(!x.unlocked){
    const lock=document.createElement('span');lock.className='region-lock';
    lock.textContent='🔒';art.append(lock);
   }
   // Keep each generation's legendary/mascot sprite layered on the uploaded
   // WebP landscape. Locked regions reveal a dark silhouette until unlocked.
   const dex=REGION_MASCOTS[x.index];
   if(G.DEX_BY?.[dex]&&typeof G.UI?.sprite==='function'){
    const sprite=document.createElement('canvas');
    sprite.className='region-sprite';
    sprite.width=76;sprite.height=76;
    try{G.UI.sprite(sprite,dex,{scale:2,shiny:false});art.appendChild(sprite);}
    catch(err){console.warn('[Region cover sprite]',dex,err);}
   }
   const body=document.createElement('div');body.className='region-card-info';
   const name=document.createElement('strong');name.textContent=x.icon+' '+x.name;
   const diff=document.createElement('small');diff.className='region-diff';
   diff.textContent='▥ '+tr('Độ khó ','Difficulty ')+x.difficulty+'/5';
   const status=document.createElement('small');status.className='region-status';
   status.textContent=x.complete?'🏅 '+tr('Đã có Huy hiệu Vùng','Region Badge earned'):
    x.unlocked?tr('▶ Hạ Boss 15p để qua màn · Boss 30p để kết màn','▶ Defeat the 15m Boss to unlock next · 30m Boss to finish'):
    x.index===9?'🔒 '+tr('Cần đủ 9 Huy hiệu','Requires all 9 Badges'):
    '🔒 '+tr('Cần Huy hiệu ','Requires Badge of ')+NAMES[x.index-1];
   body.append(name,diff,status);
   b.append(art,body);
   if(x.unlocked)b.onclick=()=>choose(x.index);
   grid.append(b);
  }
 }
 function open(){
  if(G.Coop?.active||getChampion()?.active)return false;
  render();overlay.hidden=false;return true;
 }
 function close(){if(overlay)overlay.hidden=true;}
 function beginRun(index,formerBiome=null){
  if(!Number.isInteger(index)||!unlocked(index)||current)return false;
  const biome=targetBiome(index);
  current={index,biome,startedAt:null,badgeBoss:null,finalBoss:null,badgeClaimed:false,victoryScheduled:false};
  showRegionBadge(index);
  // Berry pre-match selection defers the underlying native startRun for 10s.
  // Keep the region armed across that entire pending period; menu overlays
  // must not silently turn Kanto back into ALL GEN.
  preRunPending=G.Game?.state!=='playing';
  previousBiome=Number.isFinite(formerBiome)?formerBiome:(Number.isFinite(G.World?.biome)?G.World.biome:null);
  if(Number.isFinite(biome))G.World?.setBiome?.(biome,true);
  return true;
 }
 function intercept(event){
  if(bypass||event.defaultPrevented||G.Game?.state==='playing')return;
  const target=event.target?.closest?.('#scr-menu [data-go="play"]');
  if(!target)return;
  event.preventDefault();event.stopImmediatePropagation();
  open();
 }
 document.addEventListener('click',intercept,true);
 function wrap(obj,key,wrapper){
  if(!obj||typeof obj[key]!=='function')return;
  const prev=obj[key];obj[key]=function(...args){return wrapper.call(this,prev,args)};
 }
 // The native Play button is replayed only once after choosing an unlocked Region.
 // Other game modes still use the original startup and their own map policies.
 wrap(G.Game,'startRun',function(prev,args){
  const priorBiome=G.World?.biome;
  const index=armed!==null?armed:(current&&preRunPending?current.index:null);
  armed=null;
  const chosen=index!==null&&index!==undefined&&!G.Coop?.active&&!getChampion()?.active;
  // Do not reset a region already pinned at the card click: startup may be
  // invoked after Berry's 10-second pre-run picker in either wrapper order.
  if(!chosen){
   if(current)endRun(); // A different mode must not inherit Kanto.
  }else if(current&&current.index!==index){
   endRun();beginRun(index,priorBiome);
  }else if(!current)beginRun(index,priorBiome);
  try{
   const out=prev.apply(this,args);
   if(chosen&&G.Game?.state==='playing'){
    preRunPending=false;
    if(current&&current.startedAt===null)
     current.startedAt=Number(G.Game?.st?.time??G.Game?.time??0)||0;
   }
   return out;
  }catch(err){
   if(chosen&&current)endRun();
   throw err;
  }
 });
 wrap(G.World,'setBiome',function(prev,args){
  if(!current||!Number.isFinite(current.biome)||changing)return prev.apply(this,args);
  const copy=args.slice();copy[0]=current.biome;
  return prev.apply(this,copy);
 });
 // The game has scripted encounters which instantiate Enemy directly,
 // bypassing the ordinary spawn bag. Filter their species at construction time
 // ONLY while normal Chơi ngay has an explicitly selected Region. Do not edit
 // original spawn definitions, save data, team Pokémon or other game modes.
 let constructed=0;
 function regionEnemyDefinition(def,index,forceBoss=false){
  if(!def||typeof def!=='object'||index<0||index>=REGION_COUNT)return def;
  // The explicitly summoned 15-minute mascot must never get transformed
  // into random tier wildlife, even if it has a lower/higher rarity.
  if(def.pkmsvvExploreBoss||isBossGuardian(def))return def;
  const dex=Number(def.dex);
  if(!Number.isInteger(dex))return def;
  return progressiveDefinition(def,index,encounterSeconds(),constructed++,forceBoss);
 }
 // Preserve native instanceof/class behavior through a constructor Proxy.
 // This also covers sources using new G.Enemy(...) instead of Enemies.bagAt().
 if(typeof G.Enemy==='function'&&typeof Proxy==='function'){
  try{
   const NativeEnemy=G.Enemy;
   G.Enemy=new Proxy(NativeEnemy,{construct(Target,args,newTarget){
    const index=regionIndex();
    if(index<0||getChampion()?.active||G.Coop?.active||!args.length)
     return Reflect.construct(Target,args,newTarget);
    const replacement=regionEnemyDefinition(args[0],index,!!args[4]);
    if(replacement===args[0])return Reflect.construct(Target,args,newTarget);
    const next=args.slice();next[0]=replacement;
    return Reflect.construct(Target,next,newTarget);
   }});
  }catch(err){console.warn('[Region QA] Native enemy constructor is not patchable',err);}
 }
 // Enforce the selected generation for the ENTIRE run, not merely during
 // Spawner.update. Other native spawn sources can call Enemies.bagAt between ticks.
 // The mode guards prevent leaking Region restrictions into Arena or Co-op.
 // Last-chance isolation for custom waves that captured Enemy BEFORE this
 // QA wrapper: refresh species and sprite at the manager boundary. Restrict
 // only normal Chơi ngay and never mutate global Gacha/boss catalogues.
 // The compiled game and scripted events do not all use bagAt() or the
 // exported G.Enemy constructor. Normal/mini-boss encounters can even enter
 // EnemyMgr via a previously captured constructor. Sanitize the LIVE actor
 // before adding it, and periodically check the manager for bypassing paths.
 // This is strictly scoped to the selected normal Region session.
 function enforceLiveEnemy(enemy,index){
  if(!enemy||enemy.dead||enemy.remote||enemy.pkmsvvExploreBoss||enemy.def?.pkmsvvExploreBoss||
   index<0||index>=REGION_COUNT)return false;
  // A real Region is strict for ALL hostile wildlife and bosses. Do not
  // exempt named bosses of other generations during normal exploration.
  if(enemy.pkmsvvFriendly||enemy.friendly||enemy.isPlayer||enemy.isSupport||
   enemy.pkmsvvBossGuard||enemy.pkmsvvGuardianOf!==undefined||isBossGuardian(enemy.def))return false;
  const old=Number(enemy.dex??enemy.def?.dex);
  if(!Number.isInteger(old))return false;
  const replacement=regionEnemyDefinition({dex:old,boss:bossLike(enemy)},index);
  if(!replacement||replacement.dex===old)return false;
  const next=replacement.dex,mon=G.DEX_BY?.[next];
  if(!mon)return false;
  // Never change damage/HP, biome, boss flags, rewards or player Pokémon.
  // Only the visible species identity and sprite are changed.
  enemy.dex=next;
  if(enemy.mon)enemy.mon=mon;
  if(enemy.def&&typeof enemy.def==='object')
   enemy.def={...enemy.def,dex:next,name:mon.name||('Pokémon '+next),
    ...(Array.isArray(mon.types)?{types:mon.types}:{})};
  if(G.Sprites?.Animator){
   try{
    enemy.anim=new G.Sprites.Animator(next,enemy.scale||1,!!enemy.shiny);
    if(typeof G.Sprites.bodyRadius==='function')
     enemy.r=G.Sprites.bodyRadius(next,enemy.scale||1)||enemy.r;
   }catch(err){console.warn('[Region QA] sprite correction failed',next,err);}
  }
  return true;
 }
 wrap(G.EnemyMgr,'add',function(prev,args){
  const index=regionIndex();
  if(index>=0&&!getChampion()?.active&&!G.Coop?.active)
   enforceLiveEnemy(args[0],index);
  return prev.apply(this,args);
 });
 // Late correction catches waves which bypass EnemyMgr.add() entirely.
 // Throttle to every ~10 ticks to avoid traversing large horde lists 60fps.
 let integrityTick=0,correctedSpawns=0;
 wrap(G.EnemyMgr,'update',function(prev,args){
  const out=prev.apply(this,args),index=regionIndex();
  if(index<0||getChampion()?.active||G.Coop?.active)return out;
  updateRegionBoss();
  if(++integrityTick%10!==0||typeof G.EnemyMgr?.all!=='function')return out;
  const all=G.EnemyMgr.all();
  // Map / Set may be instantiated in another JS realm (WebViews, VM tests).
  // instanceof fails cross-realm. Use the intrinsic collection tag and, for
  // Map, always take VALUES rather than [key,enemy] iterator entries.
  const collectionTag=Object.prototype.toString.call(all);
  const actors=Array.isArray(all)?all:
   collectionTag==='[object Map]'||collectionTag==='[object Set]'?
    Array.from(all.values()):
   all&&typeof all[Symbol.iterator]==='function'?Array.from(all):
   all&&typeof all==='object'?Object.values(all):[];
  for(const enemy of actors)
   if(enforceLiveEnemy(enemy,index))correctedSpawns++;
  return out;
 });
 wrap(G.Enemies,'bagAt',function(prev,args){
  const bag=prev.apply(this,args),index=regionIndex();
  if(index<0||getChampion()?.active||G.Coop?.active)return bag;
  // Do not map through Champion's regional bosses; it is an Arena system.
  // Exploration uses its own per-minute, sprite-backed local Gen tiers.
  return enforceGeneration(bag,index);
 });
 for(const [obj,key] of [[G.Game,'toUI'],[G.Game,'quit'],[G.Flow,'goMenu']]){
  wrap(obj,key,function(prev,args){
   if(current){tryEarnSeal();endRun();}
   return prev.apply(this,args);
  });
 }
 // Opening in-game overlays must NOT cancel the selected region. Only an
 // explicit return to the home menu clears the scoped Region policy.
 if(typeof G.MenuUI?.open==='function')wrap(G.MenuUI,'open',function(prev,args){
  const out=prev.apply(this,args);
  // During Berry's 10s pre-run choice, UI state is still 'ui'. An incidental
  // menu render is NOT an instruction to abandon the selected generation.
  if(current&&G.Game?.state==='ui'&&!preRunPending&&!G.PKMSVVBerry?.choosing)endRun();
  return out;
 });
 G.PKMSVVQuickRegion={open,close,choose,entries,unlocked,hasSeal,tryEarnSeal,
  spawnRegionBoss,finishRegionMatch,updateRegionBoss,beginRun,endRun,
  SEAL_SECONDS,FINAL_BOSS_SECONDS,THEMES,targetBiome,distinctMapBiomes,
  mascots:REGION_MASCOTS,nationalGen,speciesFor,isAllowed,pokemonStrength,encounterTier,eligibleByTime,
  progressivePool,enforceGeneration,regionEnemyDefinition,enforceLiveEnemy,
  get active(){return regionIndex()>=0},
  get selectedRegion(){return regionIndex()},
  get regionalBoss(){return current?.badgeBoss||null},
  get finalBoss(){return current?.finalBoss||null},
  get starting(){return !!preRunPending},
  get correctedSpawns(){return correctedSpawns}};
})();
