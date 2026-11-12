// PKMSVV Switch Native ALPHA — playable native subset, not the browser engine.
// Source-backed data is injected from Kanto, Orbs, Fusion, Mega and Evolution.
// Never write/overwrite Android, Web or PC saves. This is an isolated NRO save.
const alpha=(()=>{
 'use strict';
 const data=KANTO_CONFIG.nativeAlpha;
 if(!data)throw Error('Native Alpha compiled game data absent');
 const roster=data.trialRoster,rosterNames=roster.map(p=>p.name.toLowerCase());
 const realDex=Array.isArray(data.realPokedex)&&data.realPokedex.length===151?data.realPokedex:null;
 const foes=realDex?realDex.filter(p=>p.rarity<=3&&!p.legendary).map(p=>({
  ...p,sprite:p.dex+'.png',minTier:p.rarity<=1?1:p.rarity<=2?2:4
 })):data.trialEnemies;
 const foeNames=foes.map(p=>p.name.toLowerCase());
 const species=new Map([...roster,...foes].map(p=>[p.name.toLowerCase(),p]));
 const byDex=new Map([...(realDex||[]),...roster,...foes].map(p=>[p.dex,p]));
 const spriteNames=new Set([...rosterNames,...foeNames,...(realDex||[]).map(p=>p.name.toLowerCase()),...data.evolutionSprites.map(p=>p.name.toLowerCase()),'mewtwo']);
 const SAVE_PATH='sdmc:/switch/pkmsvv-native-alpha/';
const SAVE_PREFIX='progress-v030-';
 const PREVIOUS_SAVE_PREFIX='progress-v029-';
 const OLDER_SAVE_PREFIX='progress-v028-';
 const OLDEST_SAVE_PREFIX='progress-v027-';
 const ANCIENT_SAVE_PREFIX='progress-v026-';
 const ANTIQUE_SAVE_PREFIX='progress-v025-';
 const LEGACY_PREVIOUS_SAVE_PREFIX='progress-v024-';
 const LEGACY_SAVE_PREFIX='progress-';
 const MOVE_MAX=5,MAX_MOVES=8;
 const RANK_RULES=data.rankRules||{max:5,perRankStatBonus:.06,rank4CooldownReduction:.05};
 let profile={version:1,seq:0,pokedex:{},box:{25:1},bestKO:0,badges:{},selected:25,kantoClears:0,bestSurvivalSec:0,bestKantoClearSec:0,recruitTickets:0,recruitKO:0,recruitPity:0,ranks:{},rankBranches:{}};
 let saveStatus='UNAVAILABLE',saveDirty=false,lastSaveAt=0,saveSlot=0;
 let menu=false,menuTab=0,menuIndex=0,started=false,clockScale=1,accelerated=false,runUsedQA=false,fastMode=false;
 let lastStart=false,lastA=false,lastB=false,lastY=false,lastX=false,lastZR=false,lastZL=false;
 let lastLeft=false,lastRight=false,lastL=false,lastR=false;
 let orbQueue=[],orbCooldown=0,activeBuffs={},moveList=[],offers=[],fusionUsed=false,fusionName='';
 let effects=[],megEnergy=0,megaActive=0,megaCooldown=0,megaPreview=false;
 // Bounded persistent native skill effects (no DOM/canvas object allocation per tick).
 let zones=[],zoneSeq=0;
 const MAX_SKILL_ZONES=12,MAX_ZONE_HITS_PER_TICK=6;
 let boss15=false,boss30=false,badgeWon=false,gameWon=false,bossMessage='',matchResult=null,runEndTime=0,runEndKOs=0;
 let skillClock=0,killAward=0,spriteLoadTick=0;
 const spriteRequested=new Set();
 let fusionOfferLevel=-1,fusionOfferAttempts=0,fusionOfferRecipe=null;
 let lastRecruitOutcome='',recruitTotalPulls=0;
 const name=p=>p?.name||'Unknown';
 const getMon=dex=>roster.find(x=>x.dex===dex)||byDex.get(dex);
 const orbById=id=>data.orbs.find(o=>o.id===id);
 function fnv(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}
 function readSlot(i,prefix=SAVE_PREFIX){
  if(typeof Switch==='undefined'||typeof Switch.readFileSync!=='function'||typeof TextDecoder!=='function')return null;
  try{
   const bytes=Switch.readFileSync(SAVE_PATH+prefix+i+'.json');
   if(!bytes)return null;
   const row=JSON.parse(new TextDecoder().decode(bytes));
   if(row?.app!=='pkmsvv-switch-alpha'||row?.schema!==1||!row.data||
    fnv(JSON.stringify(row.data))!==row.checksum)return null;
   return row.data;
  }catch(_){return null}
 }
 function load(){
  const groups=[
    [readSlot(1),readSlot(2)],
    [readSlot(1,PREVIOUS_SAVE_PREFIX),readSlot(2,PREVIOUS_SAVE_PREFIX)],
    [readSlot(1,OLDER_SAVE_PREFIX),readSlot(2,OLDER_SAVE_PREFIX)],
[readSlot(1,OLDEST_SAVE_PREFIX),readSlot(2,OLDEST_SAVE_PREFIX)],
    [readSlot(1,ANCIENT_SAVE_PREFIX),readSlot(2,ANCIENT_SAVE_PREFIX)],
    [readSlot(1,ANTIQUE_SAVE_PREFIX),readSlot(2,ANTIQUE_SAVE_PREFIX)],
    [readSlot(1,LEGACY_PREVIOUS_SAVE_PREFIX),readSlot(2,LEGACY_PREVIOUS_SAVE_PREFIX)],
    [readSlot(1,LEGACY_SAVE_PREFIX),readSlot(2,LEGACY_SAVE_PREFIX)]
   ];
   const chosen=groups.find(g=>g[0]||g[1])||groups[0],migrating=chosen!==groups[0];
   // Keep v029/v028/v027/v026/v025/v024/legacy saves intact as rollback backups.
   const [a,b]=chosen,saved=(!a?b:!b?a:a.seq>b.seq?a:b);
  if(saved&&Number.isInteger(saved.seq)&&saved.seq>=0){
   const found=saved.pokedex&&typeof saved.pokedex==='object'?saved.pokedex:{};
   const kept={};
   for(const key of Object.keys(found))if(+key>=1&&+key<=151&&found[key]===1)kept[key]=1;
   profile={version:1,seq:saved.seq,pokedex:kept,
    box:Object.fromEntries(Object.entries(saved.box&&typeof saved.box==='object'?saved.box:{25:1})
      .filter(([key,count])=>Number.isInteger(+key)&&+key>=1&&+key<=151&&
        Number.isFinite(+count)&&+count>=1)
      .map(([key,count])=>[key,Math.min(9999,Math.floor(+count))])),
    bestKO:Math.max(0,Math.min(1000000,+saved.bestKO||0)),
    badges:saved.badges&&typeof saved.badges==='object'?saved.badges:{},
    selected:(roster.some(r=>r.dex===saved.selected)||
      Number(saved.box?.[saved.selected]||0)>=1&&Number(saved.selected)>=1&&Number(saved.selected)<=151)
      ?saved.selected:25,
     kantoClears:Math.max(0,Math.min(100000,Math.floor(+saved.kantoClears||0))),
     bestSurvivalSec:Math.max(0,Math.min(86400,Math.floor(+saved.bestSurvivalSec||0))),
     bestKantoClearSec:Math.max(0,Math.min(86400,Math.floor(+saved.bestKantoClearSec||0))),
     recruitTickets:Math.max(0,Math.min(9999,Math.floor(+saved.recruitTickets||0))),
     recruitKO:Math.max(0,Math.min(1000000,Math.floor(+saved.recruitKO||0))),
     recruitPity:Math.max(0,Math.min(99,Math.floor(+saved.recruitPity||0))),
     ranks:Object.fromEntries(Object.entries(saved.ranks&&typeof saved.ranks==='object'?saved.ranks:{})
      .filter(([k,v])=>Number.isInteger(+k)&&+k>=1&&+k<=151&&Number.isInteger(+v)&&+v>=0)
      .map(([k,v])=>[k,Math.min(5,v)])),
     rankBranches:Object.fromEntries(Object.entries(saved.rankBranches&&typeof saved.rankBranches==='object'?saved.rankBranches:{})
      .filter(([k,v])=>Number.isInteger(+k)&&+k>=1&&+k<=151&&
       Number(saved.ranks?.[k]||0)>=3&&typeof v==='string'&&branchOptions(+k).includes(v)))};
   saveSlot=migrating?0:a&&a.seq===saved.seq?1:2;
   saveStatus=migrating?'LEGACY FOUND':'RESTORED';
   if(migrating){
    markDirty();
    if(persist())saveStatus='MIGRATED';
   }
  }else saveStatus=typeof Switch==='undefined'?'TEST ONLY':'NEW';
 }
 function persist(){
  if(!saveDirty)return false;
  if(typeof Switch==='undefined'||typeof Switch.writeFileSync!=='function')return false;
  const next=saveSlot===1?2:1,p={...profile,seq:profile.seq+1};
  const text=JSON.stringify(p);
  const payload=JSON.stringify({app:'pkmsvv-switch-alpha',schema:1,checksum:fnv(text),data:p});
  try{
   Switch.writeFileSync(SAVE_PATH+SAVE_PREFIX+next+'.json',payload);
   // Read back and validate before declaring the rotating backup committed.
   const verify=readSlot(next);
   if(!verify||verify.seq!==p.seq)throw Error('Read-back failed');
   profile=p;saveSlot=next;saveDirty=false;saveStatus='SAVED';
   return true;
  }catch(err){saveStatus='SAVE FAILED';return false}
 }
 function markDirty(){saveDirty=true}
 // Pokémon Rank stage2 native adapter: the first ordinary copy is never
 // consumed. Rank 0->1 needs one duplicate, Rank1->2 two, etc.
 // Shiny skins are not represented by box[] and can NEVER be materials.
 let lastRankOutcome='',branchPromptDex=0;
 const RANK_TRAITS=RANK_RULES.traits||{branchStatuses:{fire:'burn',water:'slow',offense:'strike',defense:'guard'},hitChance:.16,hitCooldownMs:3500,hybridCooldownMs:12000,hybridMaxTargets:6,hybridRadius:140};
 const rankOf=dex=>Math.max(0,Math.min(RANK_RULES.max,Math.floor(+profile.ranks[dex]||0)));
 function branchOptions(dex){
  const raw=getMon(Number(dex))?.types||[];
  const types=[...new Set(raw.filter(x=>typeof x==='string').map(x=>x.toLowerCase()))];
  return types.length>=2?types.slice(0,2):['offense','defense'];
 }
 function rankBranch(dex){return profile.rankBranches[Number(dex)]||null}
 function chooseRankBranch(dex,branch){
  dex=Number(dex);
  const options=branchOptions(dex);
  if(!Number.isInteger(dex)||rankOf(dex)<3||!profile.box[dex]||
   rankBranch(dex)||!options.includes(branch)){
   lastRankOutcome='BRANCH LOCKED OR INVALID';return false;
  }
  const oldDirty=saveDirty;
  profile.rankBranches[dex]=branch;markDirty();
  if(!persist()){
   delete profile.rankBranches[dex];saveDirty=oldDirty;
   lastRankOutcome='SAVE FAILED - BRANCH NOT CHANGED';return false;
  }
  branchPromptDex=0;
  lastRankOutcome='RANK 3 BRANCH: '+branch.toUpperCase();
  return true;
 }
 function rankPlan(dex){
  if(!Number.isInteger(+dex)||+dex<1||+dex>151)return {dex:Number(dex)||0,rank:0,cost:0,available:0,eligible:false,reason:'INVALID DEX'};
  dex=+dex;
  const count=Math.floor(+profile.box[dex]||0),rank=rankOf(dex);
  const mon=getMon(dex),legend=!!(mon?.legendary||mon?.leg||mon?.rarity>=5);
  const cost=rank>=RANK_RULES.max?0:rank+1;
  const available=Math.max(0,count-1);
  const reason=count<1?'NOT OWNED':legend?'LEGENDARY LOCKED':rank>=RANK_RULES.max?'RANK MAX':available<cost?'NEED '+cost+' DUPLICATES':'READY';
  return {dex,rank,cost,available,eligible:reason==='READY',reason};
 }
 function upgradeRank(dex){
  const plan=rankPlan(dex);
  if(!plan.eligible){lastRankOutcome=plan.reason;return false}
  // Save before surfacing success. If the commit fails, restore all changed
  // fields; never consume a duplicate or fake a rank-up on disk error.
  const oldCount=profile.box[plan.dex],oldRank=profile.ranks[plan.dex],oldDirty=saveDirty;
  profile.box[plan.dex]=oldCount-plan.cost;
  profile.ranks[plan.dex]=plan.rank+1;markDirty();
  if(!persist()){
   profile.box[plan.dex]=oldCount;
   if(oldRank===undefined)delete profile.ranks[plan.dex];else profile.ranks[plan.dex]=oldRank;
   saveDirty=oldDirty;
   lastRankOutcome='SAVE FAILED - MATERIALS KEPT';
   return false;
  }
  lastRankOutcome=(getMon(plan.dex)?.name||('#'+plan.dex))+' RANK '+(plan.rank+1)+' / '+RANK_RULES.max;
  if(plan.rank+1>=3&&!rankBranch(plan.dex))branchPromptDex=plan.dex;
  return true;
 }
 function currentRank(){return rankOf(profile.selected)}
 function rankMaxHp(){return 100*(1+currentRank()*RANK_RULES.perRankStatBonus)*statsAtEvolution(evolvedDex()).hp}
 function rankDamageMultiplier(){return (1+currentRank()*RANK_RULES.perRankStatBonus)*statsAtEvolution(evolvedDex()).damage}
 function rankCooldownMultiplier(){return currentRank()>=4?1-RANK_RULES.rank4CooldownReduction:1}
 // Only pure level-based Gen1 evolutions are handled automatically.
 // Stone/trade/friendship branches cannot be inferred from a player level.
let battleEvolutionDex=25,evolutionNotice='',evolutionNoticeLeft=0,evolutionEvents=0;
 // Per-evolution optional move swap, in-memory only. Never mutate PokéBox or Rank.
 let evoQueue=[],evoStage='',evoOldMove='',evoChoices=[],evoStep=null;
 let evolutionShards=0,lastSpecialEvolutionOutcome='',shardBossMilestones=new Set();
 let levelOffersAfterEvolution=null,evoSwapCount=0;
 const realByDex=new Map((realDex||[]).map(p=>[p.dex,p]));
 const evolutionStatCache=new Map();
 function statsAtEvolution(dex){
  const key=profile.selected+':'+dex;
  const cached=evolutionStatCache.get(key);
  if(cached)return cached;
  const base=realByDex.get(profile.selected),current=realByDex.get(dex);
  if(!base||!current)return {hp:1,damage:1,speed:1};
  const ratio=(from,to,power,ceiling)=>{
   if(!Number.isFinite(from)||!Number.isFinite(to)||from<=0||to<=0)return 1;
   return Math.min(ceiling,Math.max(1,Math.pow(to/from,power)));
  };
  const atk=p=>Math.max(1,Number(p?.pa)||0,Number(p?.sa)||0,Number(p?.atk)||0);
  const mods={hp:ratio(base.hp,current.hp,.55,1.50),
   damage:ratio(atk(base),atk(current),.45,1.45),
   speed:ratio(base.spd,current.spd,.25,1.15)};
  if(evolutionStatCache.size>151)evolutionStatCache.clear();
  evolutionStatCache.set(key,mods);
  return mods;
 }
 function evolutionChainAt(dex,atLevel){
  let current=dex;
  const visited=new Set([current]);
  for(let i=0;i<3;i++){
   const rule=data.evolutions.find(e=>e.from===current&&e.level<=atLevel);
   if(!rule||visited.has(rule.to)||rule.to<1||rule.to>151)break;
   current=rule.to;visited.add(current);
  }
  return current;
 }
 function onLevelUp(){
  // Merely previewing an evolved sprite cannot create Pokédex ownership.
  const next=evolutionChainAt(battleEvolutionDex,level);
  if(next===battleEvolutionDex)return false;
  const before=statsAtEvolution(battleEvolutionDex),after=statsAtEvolution(next);
  const rankFactor=100*(1+currentRank()*RANK_RULES.perRankStatBonus);
  const oldMax=rankFactor*before.hp,newMax=rankFactor*after.hp;
  hp=Math.min(newMax,Math.max(0,hp/Math.max(1,oldMax)*newMax));
  const old=battleEvolutionDex;
  let stage=old;
  const visited=new Set([stage]);
  for(let i=0;i<3;i++){
   const step=data.evolutions.find(e=>e.from===stage&&e.level<=level);
   if(!step||visited.has(step.to)||step.to<1||step.to>151)break;
const previous=stage;
    stage=step.to;visited.add(stage);evolutionEvents++;
    evoQueue.push({from:previous,to:stage});
   if(!runUsedQA&&!profile.pokedex[stage]){
    profile.pokedex[stage]=1;markDirty();
   }
   if(stage===next)break;
  }
  battleEvolutionDex=next;
  evolutionNotice=(realByDex.get(old)?.name||getMon(old)?.name||'#'+old)+
   ' > '+(realByDex.get(next)?.name||getMon(next)?.name||'#'+next);
  evolutionNoticeLeft=5;
  // PokéBox, Rank and Rank3 branch stay attached to the original dex.
  return true;
 }
 function naturalMovePool(dex){
  const pool=data.realMovePools?.[dex];
  return Array.isArray(pool)?pool:[];
 }
 function specialEvolutionOptions(){
  return (data.specialEvolutions||[]).filter(e=>e.from===battleEvolutionDex);
 }
 function chooseSpecialEvolution(toDex){
  if(matchResult||pickOpen||evolutionShards<1){
   lastSpecialEvolutionOutcome='NEED ONE BOSS SHARD / ACTIVE MATCH';return false;
  }
  const rule=specialEvolutionOptions().find(e=>e.to===Number(toDex));
  if(!rule||rule.to<1||rule.to>151||!realByDex.has(rule.to)){
   lastSpecialEvolutionOutcome='NO VALID EVOLUTION FOR CURRENT FORM';return false;
  }
  const from=battleEvolutionDex,before=statsAtEvolution(from),after=statsAtEvolution(rule.to);
  const factor=100*(1+currentRank()*RANK_RULES.perRankStatBonus);
  hp=Math.min(factor*after.hp,Math.max(0,hp/Math.max(1,factor*before.hp)*factor*after.hp));
  evolutionShards--;battleEvolutionDex=rule.to;evolutionEvents++;
  evoQueue.push({from,to:rule.to});
  const target=realByDex.get(rule.to)?.name||('#'+rule.to);
  evolutionNotice=(realByDex.get(from)?.name||'#'+from)+' > '+target;
  evolutionNoticeLeft=5;lastSpecialEvolutionOutcome=rule.item.toUpperCase()+' > '+target;
  if(!runUsedQA&&!profile.pokedex[rule.to]){
   profile.pokedex[rule.to]=1;markDirty();
  }
  // No extra level-up reward; use the standard optional skill exchange.
  levelOffersAfterEvolution=null;beginNextEvoSwap();
  return true;
 }
 function resetBattle(){
level=1;battleEvolutionDex=profile.selected;evolutionNotice='';evolutionNoticeLeft=0;evolutionEvents=0;
   evoQueue=[];evoStage='';evoOldMove='';evoChoices=[];evoStep=null;
   levelOffersAfterEvolution=null;evoSwapCount=0;
   evolutionShards=0;shardBossMilestones=new Set();lastSpecialEvolutionOutcome='';
  px=W/2;py=H/2;hp=rankMaxHp();kills=0;time=0;xp=0;
  enemies.length=0;shots.length=0;
  spawnAt=0;fireAt=.2;spawnShield=2;
  attack=1;fireRate=.21;moveSpeed=230;
  paused=false;pickOpen=false;skillChoices=[];
  orbQueue.length=0;orbCooldown=0;activeBuffs={};moveList=[];
  const starterMoves={
   25:['thunder-shock','quick-attack'],
   4:['ember','quick-attack'],
   1:['vine-whip','tackle'],
   7:['water-gun','tackle']
  }[profile.selected]||(()=>{
    // Real game move pool for an owned Kanto species (trial starter presets stay fixed).
    const picked=naturalMovePool(profile.selected)
     .filter(id=>sourceMoves.some(m=>m.id===id&&m.kind!=='buff')).slice(0,2);
    while(picked.length<2)picked.push(picked.length?'quick-attack':'tackle');
    return picked;
   })();
  moveList.push(...starterMoves.map(id=>({id,lvl:1})));
  offers=[];fusionUsed=false;fusionName='';
  effects.length=0;zones.length=0;megEnergy=0;megaActive=0;megaCooldown=0;
  boss15=false;boss30=false;badgeWon=false;gameWon=false;bossMessage='';matchResult=null;runEndTime=0;runEndKOs=0;
  skillClock=0;killAward=0;fusionOfferLevel=-1;fusionOfferAttempts=0;fusionOfferRecipe=null;branchPromptDex=0;rankCombatSeconds=0;rankHitReadyAt=0;rankHybridReadyAt=0;rankProcCount=0;rankHybridCount=0;runUsedQA=false;accelerated=false;clockScale=1;fastMode=false;started=true;
 }
 function selectSpecies(index){
  // Kanto's opening remains safe; at later waves draw from REAL Gen1 catalog.
  // Rare/legendary Pokémon are not silently added to ordinary mobs.
  if(index===0){
   const opening=data.trialEnemies.filter(p=>p.minTier===0);
   const entry=opening[Math.floor(rng()*opening.length)]||data.trialEnemies[0];
   return byDex.get(entry.dex)||entry;
  }
  const rarityCeiling=index<3?2:3;
  const pool=foes.filter(p=>p.rarity<=rarityCeiling&&p.minTier<=index);
  return pool[Math.floor(rng()*pool.length)]||byDex.get(19)||foes[0];
 }
 function evolvedDex(){return evolutionChainAt(battleEvolutionDex,level)}
 function chooseBattleSprite(){
  const id=evolvedDex();
  return (realByDex.get(id)?.name||getMon(id)?.name||
   getMon(profile.selected)?.name||'Pikachu').toLowerCase();
 }
 const artByName=new Map([...roster,...foes,...(realDex||[]).map(p=>({name:p.name,sprite:p.dex+'.png'})),...data.evolutionSprites,
  {name:'Mewtwo',sprite:'150.png'}].map(p=>[p.name.toLowerCase(),p.sprite]));
 const spriteOrder=[];
 const MAX_CACHED_EXTRA_SPRITES=18;
 function loadExtraSprites(){
  // Load at most one new tiny sprite per ~12 input ticks. No decode burst.
  // Unseen starters and evolved forms are loaded only when first needed.
  if(!spritesEnabled||typeof Image!=='function')return;
  if(++spriteLoadTick%12!==0)return;
  const needed=[chooseBattleSprite()];
  for(const e of enemies)if(needed.length<14&&!needed.includes(e.species))needed.push(e.species);
  for(const key of needed){
   if(key==='pikachu'||key==='rattata'||spriteRequested.has(key))continue;
   const file=artByName.get(key);
   if(!file)continue;
   spriteRequested.add(key);
   try{
    const img=new Image();
    img.onload=()=>{
     SPRITES[key]=img;loaded[key]=true;
     spriteOrder.push(key);
     while(spriteOrder.length>MAX_CACHED_EXTRA_SPRITES){
      const old=spriteOrder.shift();
      if(old&&old!==chooseBattleSprite()){SPRITES[old]=null;loaded[old]=false;spriteRequested.delete(old)}
     }
    };
    img.onerror=()=>{loaded[key]=false};
    img.src='romfs:/sprites/'+file;
   }catch(_){loaded[key]=false}
   break;
  }
 }
 function newOrb(){
  if(orbQueue.length>=10)return false;
  const entry=data.orbs[Math.floor(rng()*data.orbs.length)];
  orbQueue.push(entry.id);return true;
 }
 function orbUse(){
  if(!orbQueue.length||orbCooldown>0)return false;
  const id=orbQueue.shift(),orb=orbById(id);
  if(!orb)return false;
  orbCooldown=5;
  if(id==='slumber')for(const e of enemies)e.sleepLeft=Math.max(e.sleepLeft||0,e.boss?.5:3);
  if(id==='slow')for(const e of enemies)e.slowLeft=Math.max(e.slowLeft||0,6);
  if(id==='blowback')for(const e of enemies){
   const dx=e.x-px,dy=e.y-py,dist=Math.hypot(dx,dy)||1;
   if(dist<215){e.x=clamp(e.x+(dx/dist)*(e.boss?40:120),15,W-15);e.y=clamp(e.y+(dy/dist)*90,80,H-18)}
  }
  if(id==='focus'||id==='quick'||id==='luminous')activeBuffs[id]=orb.duration;
  markDirty();return true;
 }
 // Switch-native recruitment adapter. Odds/pity use the actual compiled
 // PKMSVV gacha constants, while tickets are earned only in native Kanto.
 // Discovery alone never grants ownership.
 const recruitRules=data.recruitment||{rates:[[1,45.5],[2,30],[3,17],[4,6.5],[5,1]],pity5:100};
 function discoveredPool(){
  if(!realDex)return [];
  return realDex.filter(p=>profile.pokedex[p.dex]===1&&p.rarity>=1&&p.rarity<=5);
 }
 function ownedIds(){
  return Object.keys(profile.box).map(Number)
   .filter(dex=>Number.isInteger(dex)&&dex>=1&&dex<=151&&profile.box[dex]>=1)
   .sort((a,b)=>a-b);
 }
 function teamOptions(){
  const trial=roster.map(p=>p.dex);
  return trial.concat(ownedIds().filter(id=>!trial.includes(id)));
 }
 function recruitOne(guaranteeHigh=false){
  if(profile.recruitTickets<1)return null;
  const pool=discoveredPool();
  if(!pool.length){lastRecruitOutcome='DISCOVER A POKEMON FIRST';return null}
  const starPool=pool.filter(p=>p.rarity>=4);
  const legendPool=pool.filter(p=>p.rarity===5);
  const rateRows=recruitRules.rates
   .map(([star,weight])=>({star,weight,pool:pool.filter(p=>p.rarity===star)}))
   .filter(row=>row.pool.length>0&&row.weight>0);
  if(!rateRows.length)return null;
  // Hard pity is meaningful only after a 5-star species is actually
  // discoverable. An undiscovered legendary can never leak into the pool.
  const pityEligible=legendPool.length>0;
  let star=5;
  if(!(pityEligible&&profile.recruitPity+1>=recruitRules.pity5)){
   let choices=rateRows;
   if(guaranteeHigh&&starPool.length)choices=rateRows.filter(row=>row.star>=4);
   let sum=0;for(const row of choices)sum+=row.weight;
   let roll=rng()*sum;
   star=choices[choices.length-1].star;
   for(const row of choices){roll-=row.weight;if(roll<0){star=row.star;break}}
  }
  const targets=pool.filter(p=>p.rarity===star);
  if(!targets.length)return null;
  const mon=targets[Math.floor(rng()*targets.length)];
  profile.recruitTickets--;
  if(pityEligible)profile.recruitPity=star===5?0:Math.min(recruitRules.pity5-1,profile.recruitPity+1);
  else profile.recruitPity=0;
  const old=profile.box[mon.dex]||0;
  profile.box[mon.dex]=Math.min(9999,old+1);
  recruitTotalPulls++;
  lastRecruitOutcome=(old?'DUPLICATE ':'NEW ')+mon.name+' #'+mon.dex+' '+star+' STAR'+
    (old?' / COPY '+profile.box[mon.dex]:'');
  markDirty();
  return {dex:mon.dex,star,isNew:!old,remaining:profile.recruitTickets};
 }
 function recruitMany(requested){
  const count=Math.floor(requested);
  if(!Number.isInteger(count)||count<1||count>10)return [];
  const pool=discoveredPool();
  if(!pool.length){lastRecruitOutcome='NO DISCOVERED POKEMON';return []}
  if(profile.recruitTickets<count){lastRecruitOutcome='NOT ENOUGH TICKETS';return []}
  const pulled=[];
  const hasRare=pool.some(p=>p.rarity>=4);
  for(let i=0;i<count;i++){
   const force= count===10&&hasRare&&i===9&&!pulled.some(p=>p.star>=4);
   const result=recruitOne(force);
   if(result)pulled.push(result);
  }
  if(pulled.length){
   const fresh=pulled.filter(p=>p.isNew).length;
   lastRecruitOutcome=(count===10?'TEN PULL':'SINGLE PULL')+
    ': '+fresh+' NEW / '+(pulled.length-fresh)+' DUPLICATE; LAST #'+pulled[pulled.length-1].dex;
   persist();
  }
  return pulled;
 }
 function onKill(e){
  if(!e)return;
  // Same 1 boss => 1 shard rule as src/pkmsvv-evolution.js.
  if((e.boss===15||e.boss===30)&&!shardBossMilestones.has(e.boss)){
   shardBossMilestones.add(e.boss);evolutionShards=Math.min(9,evolutionShards+1);
  }
  const dex=Number(e.dex||species.get(e.species)?.dex);
  if(!runUsedQA){
   if(Number.isInteger(dex)&&dex>=1&&dex<=151&&!profile.pokedex[dex]){
    profile.pokedex[dex]=1;
    // Dex discovery only in normal play, never after QA mode used.
    markDirty();
   }
   if(kills+1>profile.bestKO){profile.bestKO=kills+1;markDirty()}
   profile.recruitKO=(profile.recruitKO||0)+1;
   // One native trial ticket for every 30 real Kanto KOs.
   if(profile.recruitKO%30===0){
    profile.recruitTickets=Math.min(9999,profile.recruitTickets+1);
    markDirty();
   }
   if(e.boss===15||e.boss===30){
    profile.recruitTickets=Math.min(9999,profile.recruitTickets+(e.boss===15?2:3));
    markDirty();
   }
  }
  megEnergy=Math.min(100,megEnergy+(e.boss?3:2));
  killAward++;
  if(killAward===1||rng()<.02)newOrb();
  if(e.boss===15){badgeWon=true;if(!runUsedQA){profile.badges.kanto=1;markDirty()}bossMessage=runUsedQA?'QA REGION BOSS CLEAR':'KANTO REGION BADGE'}
  if(e.boss===30&&!matchResult){
   gameWon=true;bossMessage=runUsedQA?'KANTO QA COMPLETE':'KANTO CLEAR';
   finishRun('victory');
  }
 }
 function finishRun(outcome){
  if(matchResult)return false;
  if(outcome!=='victory'&&outcome!=='defeat')return false;
  matchResult=outcome;runEndTime=Math.floor(time);runEndKOs=kills+(outcome==='victory'?1:0);
pickOpen=false;skillChoices=[];paused=false;
   evoQueue=[];evoStage='';evoOldMove='';evoChoices=[];evoStep=null;
   levelOffersAfterEvolution=null;
   // The debug clock is a test convenience, never a source of unlocks.
  if(!runUsedQA){
   profile.bestSurvivalSec=Math.max(profile.bestSurvivalSec||0,runEndTime);
   if(outcome==='victory'){
    profile.kantoClears=(profile.kantoClears||0)+1;
    const old=profile.bestKantoClearSec||0;
    profile.bestKantoClearSec=old?Math.min(old,runEndTime):runEndTime;
   }
   markDirty();
  }
  persist();
  return true;
 }
 function onDefeat(){return finishRun('defeat')}
function evoCandidateMoves(fromDex,toDex){
  const learned=new Set(moveList.map(m=>m.id));
  const oldPool=new Set(naturalMovePool(fromDex));
  // Exactly the game source's moves for the newly evolved species.
  const pool=naturalMovePool(toDex).filter(id=>
   !learned.has(id)&&sourceMoves.some(m=>m.id===id&&m.kind!=='buff'));
  const exclusive=pool.filter(id=>!oldPool.has(id));
  const shared=pool.filter(id=>oldPool.has(id));
  function shuffle(values){
   const list=values.slice();
   for(let i=list.length-1;i>0;i--){
    const j=Math.floor(rng()*(i+1));
    [list[i],list[j]]=[list[j],list[i]];
   }
   return list;
  }
  // Fixed one-to-three cards per evolution, prioritizing new form-only skills.
  return shuffle(exclusive).concat(shuffle(shared)).slice(0,3);
 }
 function showEvoCards(cards){
  offers=cards;skillChoices=cards.map(o=>({name:o.name,description:o.kind}));
  skillPage=0;pickOpen=true;
 }
 function beginNextEvoSwap(){
  while(evoQueue.length){
   const step=evoQueue.shift();
   const current=moveList.filter(m=>!m.id.startsWith('fusion:'));
   const options=evoCandidateMoves(step.from,step.to);
   if(!current.length||!options.length)continue;
   evoStep=step;evoChoices=options;evoStage='old';evoOldMove='';
   showEvoCards(current.map(m=>({kind:'evo-old',id:m.id,
    name:'REPLACE '+(nativeMoveById.get(m.id)?.name||m.id)+' LV '+m.lvl
   })).concat([{kind:'evo-keep',id:'keep',name:'KEEP CURRENT MOVES'}]));
   return true;
  }
  evoStep=null;evoStage='';evoOldMove='';evoChoices=[];
  if(levelOffersAfterEvolution){
   showEvoCards(levelOffersAfterEvolution);levelOffersAfterEvolution=null;
  }else{offers=[];skillChoices=[];pickOpen=false}
  return false;
 }
 function moveCooldownAt(move){
  const def=nativeMoveById.get(move.id),mods=levelMods(move);
  return Math.max(data.cooldownFloors[def?.kind]||.55,(def?.cd||.7)*mods.cd);
 }
 function pickEvoCard(slot){
  if(!pickOpen||!evoStage||slot<0||slot>2)return false;
  const card=offers[skillPage*3+slot];
  if(!card)return false;
  if(card.kind==='evo-keep'){beginNextEvoSwap();return true}
  if(evoStage==='old'&&card.kind==='evo-old'){
   if(!moveList.some(m=>m.id===card.id&&!m.id.startsWith('fusion:')))return false;
   evoOldMove=card.id;evoStage='new';
   showEvoCards(evoChoices.map(id=>({kind:'evo-new',id,
    name:nativeMoveById.get(id)?.name||id
   })).concat([{kind:'evo-keep',id:'keep',name:'KEEP ORIGINAL MOVE'}]));
   return true;
  }
  if(evoStage!=='new'||card.kind!=='evo-new'||!evoChoices.includes(card.id))return false;
  const index=moveList.findIndex(m=>m.id===evoOldMove),def=nativeMoveById.get(card.id);
  if(index<0||!def||moveList.some(m=>m.id===card.id))return false;
  const old=moveList[index];
  const next={id:card.id,lvl:Math.max(1,Math.min(MOVE_MAX,def.maxLvl||MOVE_MAX,old.lvl||1))};
  const formerCd=moveCooldownAt(old),nextCd=moveCooldownAt(next);
  next.cooldown=Math.min(nextCd,Math.max(0,old.cooldown||0)/Math.max(.01,formerCd)*nextCd);
  moveList[index]=next;evoSwapCount++;beginNextEvoSwap();
  return true;
 }

 function offersForLevel(){
  const maxed=id=>moveList.some(m=>m.id===id&&m.lvl>=MOVE_MAX);
  const canFuse=data.fusions.find(r=>!fusionUsed&&r.moves.every(maxed));
  // Exactly one roll per NEW level while both source moves are MAX.
  // These probabilities are compiled from the production Fusion module.
  if(fusionOfferLevel!==level){
   fusionOfferLevel=level;
   fusionOfferRecipe=null;
   if(canFuse){
    const rate=data.fusionOfferRates[Math.min(fusionOfferAttempts,data.fusionOfferRates.length-1)];
    fusionOfferAttempts++;
    if(rng()<rate)fusionOfferRecipe=canFuse.id;
   }
  }
  offers=[];
  if(canFuse&&fusionOfferRecipe===canFuse.id)
   offers.push({kind:'fusion',id:canFuse.id,name:canFuse.name});
  for(const m of moveList)if(m.lvl<MOVE_MAX&&offers.length<6)
   offers.push({kind:'upgrade',id:m.id,name:m.id+' LV '+(m.lvl+1)});
  const ids=naturalMovePool(evolvedDex()).filter(id=>
   sourceMoves.some(m=>m.id===id&&m.kind!=='buff'));
  const offset=Math.floor(rng()*ids.length);
  for(let i=0;i<ids.length&&offers.length<6;i++){
   const id=ids[(offset+i)%ids.length];
   if(moveList.length<MAX_MOVES&&!moveList.some(m=>m.id===id)){
    const source=data.realMoves?.find(m=>m.id===id);
    offers.push({kind:'new',id,name:source?.name||id});
   }
  }
  while(offers.length<6)offers.push({kind:'heal',id:'heal',name:'HEAL 35 HP'});
skillChoices=offers.map(o=>({name:o.name,description:o.kind}));
   skillPage=0;pickOpen=true;
   if(evoQueue.length){
    levelOffersAfterEvolution=offers.slice();
    beginNextEvoSwap();
   }
  }
  function pickOffer(slot){
   if(evoStage)return pickEvoCard(slot);
   if(!pickOpen||slot<0||slot>2)return false;
  const o=offers[skillPage*3+slot];if(!o)return false;
  if(o.kind==='fusion'){
   if(fusionUsed)return false;
   const recipe=data.fusions.find(f=>f.id===o.id);
   if(!recipe||!recipe.moves.every(id=>moveList.some(m=>m.id===id&&m.lvl>=MOVE_MAX)))return false;
   moveList=moveList.filter(m=>!recipe.moves.includes(m.id));
   moveList.push({id:'fusion:'+recipe.id,lvl:MOVE_MAX});
   fusionUsed=true;fusionName=recipe.name;fusionOfferRecipe=null;
  }else if(o.kind==='upgrade'){
   const move=moveList.find(m=>m.id===o.id);if(move)move.lvl=Math.min(MOVE_MAX,move.lvl+1);
  }else if(o.kind==='new'){
   if(moveList.length>=MAX_MOVES)return false;
   moveList.push({id:o.id,lvl:1});
  }else hp=Math.min(rankMaxHp(),hp+35);
  pickOpen=false;xp=0;return true;
 }
 function spawnBoss(which){
  const mon={x:W/2,y:90,species:'mewtwo',dex:KANTO_CONFIG.mascotDex,
   hp:which===15?360:950,r:35,speed:32,boss:which,slowLeft:0,sleepLeft:0};
  if(enemies.length>=MAX_ENEMIES)enemies.shift();
  enemies.push(mon);bossMessage=which===15?'REGION BOSS 15:00':'FINAL BOSS 30:00';
 }
 function activateMega(){
  // No fake official Mega unlock. Native preview requires explicit TEST mode,
  // a Charizard-compatible evolutionary line and 100 energy.
  if(!accelerated||evolvedDex()!==6||
     megEnergy<100||megaCooldown>0||megaActive>0)return false;
  megEnergy=0;megaActive=data.mega.duration;megaCooldown=data.mega.cooldown;
  megaPreview=true;return true;
 }
 function advanceRankClock(dt){if(Number.isFinite(dt)&&dt>=0&&dt<=60)rankCombatSeconds+=dt}
 function updateEffects(dt){
  evolutionNoticeLeft=Math.max(0,evolutionNoticeLeft-dt);
  advanceRankClock(dt);
  for(const key of Object.keys(activeBuffs)){
   activeBuffs[key]-=dt;if(activeBuffs[key]<=0)delete activeBuffs[key];
  }
  for(const e of enemies.slice()){
   e.sleepLeft=Math.max(0,(e.sleepLeft||0)-dt);
   e.slowLeft=Math.max(0,(e.slowLeft||0)-dt);
   if(e.rankDotLeft>0&&e.hp>0){
    e.rankDotLeft=Math.max(0,e.rankDotLeft-dt);
    e.rankDotTick=(e.rankDotTick||.5)-dt;
    if(e.rankDotTick<=0){
     e.hp-=Math.max(1,e.rankDotDps||3)*Math.min(2,Math.max(1,Math.ceil(dt/.5)));
     e.rankDotTick=.5;
     removeRankKilledEnemy(e);
    }
   }
  }
  for(let i=effects.length-1;i>=0;i--){
   effects[i].ttl-=dt;if(effects[i].ttl<=0)effects.splice(i,1);
  }
  orbCooldown=Math.max(0,orbCooldown-dt);
  megaActive=Math.max(0,megaActive-dt);
  megaCooldown=Math.max(0,megaCooldown-dt);
 }
 // Native adapter: 18 move names from the PKMSVV move pool, class cooldown
 // floors from the 23-kind balance source. Different cast geometry per kind;
 // not a claim of parity with the 103 web-engine moves.
 const sourceMoves=Array.isArray(data.realMoves)&&data.realMoves.length===103?data.realMoves:data.nativeMoves;
 const nativeMoveById=new Map(sourceMoves.map(m=>[m.id,m]));
 function levelMods(move){
  const source=nativeMoveById.get(move.id);
  const mods={dmg:1,cd:1,radius:1,count:0};
  if(!source?.upgrades)return mods;
  for(const upgrade of source.upgrades.slice(0,Math.min(4,Math.max(0,(move.lvl||1)-1)))){
   const u=upgrade.mods||{};
   if(Number.isFinite(u.dmg))mods.dmg*=Math.max(.1,Math.min(3,u.dmg));
   if(Number.isFinite(u.cd))mods.cd*=Math.max(.3,Math.min(2,u.cd));
   if(Number.isFinite(u.radius))mods.radius*=Math.max(.5,Math.min(2,u.radius));
   if(Number.isFinite(u.count))mods.count+=Math.max(0,Math.min(6,u.count));
  }
  return mods;
 }
 const fusionKind={
  'ember-quick':'projectile','water-tackle':'cone','grass-spin':'nova',
  'spark-quick':'chain','mind-tackle':'cone','fire-gust':'nova',
  'bubble-ice':'chain','leaf-rock':'mine','shadow-mind':'nova',
  'thunder-claw':'melee'
 };
 let castCount=0,damageCount=0;
 let rankCombatSeconds=0,rankHitReadyAt=0,rankHybridReadyAt=0,rankProcCount=0,rankHybridCount=0;
 // Native Rank3/5 adapter uses the original Box Stage4 proc, lock and area rules.
 // Does not execute the browser Ability hook on Switch.
 function rankStatus(e,kind){
  if(!e||e.hp<=0||e.remote||e.arceus)return false;
  if(kind==='burn'||kind==='poison'){
   e.rankDotLeft=Math.max(e.rankDotLeft||0,kind==='burn'?3:4);
   e.rankDotTick=Math.max(.01,e.rankDotTick||.5);
   e.rankDotDps=kind==='burn'?4:3;
   return true;
  }
  if(kind==='slow'){e.slowLeft=Math.max(e.slowLeft||0,e.boss?1.25:2.8);return true}
  if(kind==='heal'){hp=Math.min(rankMaxHp(),hp+Math.max(1,rankMaxHp()*.015));return true}
  if(kind==='guard'||kind==='evade')return true;
  e.hp-=Math.min(75,7+level*1.3)*(e.boss?.4:1);
  return true;
 }
 function removeRankKilledEnemy(e){
  if(!e||e.hp>0)return false;
  const index=enemies.indexOf(e);if(index<0)return false;
  onKill(e);enemies.splice(index,1);
  kills++;xp++;if(xp>=12&&!pickOpen){level++;onLevelUp();offersForLevel()}
  return true;
 }
 function onRankHit(e){
  const rank=currentRank(),branch=rankBranch(profile.selected);
  if(rank<3||!branch||!e)return {proc:false,hybrid:0};
  const statuses=RANK_TRAITS.branchStatuses||{},effect=statuses[branch]||'strike';
  let proc=false,hybrid=0;
  if(e.hp>0&&rankCombatSeconds>=rankHitReadyAt&&rng()<RANK_TRAITS.hitChance){
   rankHitReadyAt=rankCombatSeconds+RANK_TRAITS.hitCooldownMs/1000;
   proc=rankStatus(e,effect);
   if(proc)rankProcCount++;
  }
  // Original Rank5 hybrid also triggers on fatal blows, up to six nearby enemies.
  if(rank>=5&&rankCombatSeconds>=rankHybridReadyAt){
   rankHybridReadyAt=rankCombatSeconds+RANK_TRAITS.hybridCooldownMs/1000;
   const types=getMon(profile.selected)?.types||[];
   const secondary=types.find(t=>String(t).toLowerCase()!==branch);
   const otherEffect=statuses[secondary]||effect,radius=RANK_TRAITS.hybridRadius;
   for(const target of enemies.slice()){
    if(hybrid>=RANK_TRAITS.hybridMaxTargets)break;
    if(target===e||target.hp<=0||target.remote||target.arceus||
       target._pkmsvvBossSupport||target.pkmsvvBossGuard)continue;
    if((target.x-e.x)**2+(target.y-e.y)**2>radius*radius)continue;
    target.hp-=Math.min(100,8+level*1.5)*(target.boss?.35:1);
    if(target.hp>0)rankStatus(target,otherEffect);
    removeRankKilledEnemy(target);
    hybrid++;
   }
   if(hybrid){
    rankHybridCount+=hybrid;
    effects.push({x:e.x,y:e.y,r:Math.min(radius,110),ttl:.2});
    if(effects.length>14)effects.splice(0,effects.length-14);
   }
  }
  return {proc,hybrid};
 }
 function strike(e,power,kind){
  if(!e||e.hp<=0)return false;
  e.hp-=power*rankDamageMultiplier()*(e.boss&&accelerated?6:1);
  onRankHit(e);
  megEnergy=Math.min(100,megEnergy+1);
  damageCount++;
  if(kind==='mine'||kind==='cone')e.slowLeft=Math.max(e.slowLeft||0,.35);
  if(kind==='chain'&&rng()<.1)e.sleepLeft=Math.max(e.sleepLeft||0,.2);
  if(e.hp<=0){
   onKill(e);
   const index=enemies.indexOf(e);
   if(index>=0)enemies.splice(index,1);
   kills++;xp++;
   if(xp>=12&&!pickOpen){level++;onLevelUp();offersForLevel()}
   return true;
  }
  return false;
 }
 function addZone(kind,x,y,power,params={}){
  // Ring buffer: keep at most 12 active persistent effects on weak hardware.
  if(zones.length>=MAX_SKILL_ZONES)zones.shift();
  const z={id:++zoneSeq,kind,x,y,power,ttl:params.ttl||3,
   delay:params.delay||0,interval:params.interval||.4,
   tick:0,radius:params.radius||110,range:params.range||260,
   dx:params.dx||0,dy:params.dy||0,step:0};
  zones.push(z);
  return z;
 }
 function advanceZones(dt){
  // Maximum ~12 effects * 32 enemies and 6 hit operations per effect per tick.
  if(!dt||paused||menu||pickOpen)return;
  for(let i=zones.length-1;i>=0;i--){
   const z=zones[i];z.ttl-=dt;
   if(z.delay>0){z.delay-=dt;if(z.delay>0)continue}
   z.tick-=dt;
   if(z.tick>0&&z.ttl>0)continue;
   z.tick=z.interval;
   let hits=0,finished=false;
   const nearby=e=>(e.x-z.x)**2+(e.y-z.y)**2<=z.radius*z.radius;
   const hit=e=>{
    if(hits>=MAX_ZONE_HITS_PER_TICK||!enemies.includes(e))return;
    strike(e,z.power,z.kind);hits++;
   };
   if(z.kind==='meteor'||z.kind==='stun'||z.kind==='charge'){
    // Telegraph first; then deliver the impact once.
    for(const e of enemies.slice()){
     if(z.kind==='charge'){
      const ex=e.x-z.x,ey=e.y-z.y,d=Math.hypot(ex,ey)||1;
      if(d<=460&&(ex*z.dx+ey*z.dy)/d>.94)hit(e);
     }else if(nearby(e))hit(e);
    }
    if(z.kind==='stun')for(const e of enemies)if(nearby(e))
     e.sleepLeft=Math.max(e.sleepLeft||0,1.25);
    finished=true;
   }else if(z.kind==='mine'){
    const victim=enemies.find(nearby);
    if(victim){for(const e of enemies.slice())if(nearby(e))hit(e);finished=true}
   }else if(z.kind==='turret'){
    let best=null,dist=Infinity;
    for(const e of enemies){
     const d=(e.x-z.x)**2+(e.y-z.y)**2;
     if(d<dist&&d<=z.range*z.range){dist=d;best=e}
    }
    if(best)hit(best);
   }else if(z.kind==='vortex'){
    for(const e of enemies.slice()){
     if(!nearby(e))continue;
     const d=Math.hypot(e.x-z.x,e.y-z.y)||1;
     // Safe bounded suction. Does not alter hitbox count or physics step rate.
     e.x=clamp(e.x+(z.x-e.x)/d*Math.min(16,d*.15),15,W-15);
     e.y=clamp(e.y+(z.y-e.y)/d*Math.min(16,d*.15),80,H-18);
     hit(e);
    }
   }else if(z.kind==='quake'){
    z.step++;
    const centerX=z.x+z.dx*z.step*65,centerY=z.y+z.dy*z.step*65;
    for(const e of enemies.slice()){
     if((e.x-centerX)**2+(e.y-centerY)**2<=z.radius*z.radius)hit(e);
    }
    if(z.step>=5)finished=true;
   }else{
    // Aura/orbit/trail are real persistent area attacks, not single-frame nova.
    const cx=(z.kind==='aura'||z.kind==='orbit')?px:z.x;
    const cy=(z.kind==='aura'||z.kind==='orbit')?py:z.y;
    for(const e of enemies.slice()){
     if((e.x-cx)**2+(e.y-cy)**2<=z.radius*z.radius)hit(e);
    }
   }
   if(hits){effects.push({x:z.x,y:z.y,r:Math.min(110,z.radius),ttl:.16});
    if(effects.length>14)effects.splice(0,effects.length-14)}
   if(finished||z.ttl<=0)zones.splice(i,1);
  }
 }
 function castMove(m){
  const fusion=m.id.startsWith('fusion:');
  const source=nativeMoveById.get(m.id);
  const mods=levelMods(m);
  const kind=fusion?fusionKind[m.id.slice(7)]||'nova':source?.kind||'projectile';
  let target=null,min=Infinity;
  for(const e of enemies){
   const dx=e.x-px,dy=e.y-py,d=dx*dx+dy*dy;
   if(d<min){min=d;target=e}
  }
  if(kind==='buff'){
   activeBuffs.focus=Math.max(activeBuffs.focus||0,5);
   castCount++;
   return true;
  }
  if(!target)return false;
  const distance=Math.sqrt(min);
  const shortRange=new Set(['melee','spin','shove','aura']);
  const area=new Set(['nova','spin','shove']);
  const persistent=new Set(['mine','meteor','trail','orbit','quake','vortex','stun','turret','aura','charge']);
  const conical=new Set(['cone','beam','charge','dash']);
  const chaining=new Set(['chain','bounce']);
  const longTargetZones=new Set(['meteor','vortex','stun','charge','quake','turret']);
  const radius=Math.min(700,Math.round((shortRange.has(kind)?120:longTargetZones.has(kind)?470:area.has(kind)||persistent.has(kind)?170:570)*mods.radius));
  if(distance>radius)return false;
  // Scaled real move damage, with safety ceiling for Switch crowded battles.
  const base= fusion?9:source?Math.max(.8,Math.min(16,Number(source.dmg||6)/6)):2;
  const skillBoost=source?.upgrades?.length?mods.dmg:1+(Math.max(1,m.lvl)-1)*.24;
  const mult=(megaActive>0?1.5:1)*(activeBuffs.focus>0?1.15:1);
  const power=base*skillBoost*mult;
  let hits=0;
  const hit=e=>{strike(e,power,kind);hits++};
  if(persistent.has(kind)){
   const dx=(target.x-px)/(distance||1),dy=(target.y-py)/(distance||1);
   const originAtPlayer=new Set(['mine','trail','aura','orbit','turret','quake','charge']);
   const cx=originAtPlayer.has(kind)?px:target.x,cy=originAtPlayer.has(kind)?py:target.y;
   const delay=kind==='meteor'?.48:kind==='stun'?.25:kind==='charge'?.6:0;
   const interval=kind==='orbit'?.35:kind==='turret'?.55:kind==='quake'?.23:.45;
   const ttl=kind==='mine'?7:kind==='turret'?5:kind==='trail'?4:kind==='vortex'?3:kind==='meteor'||kind==='charge'||kind==='stun'?1.2:kind==='quake'?1.5:4;
   const zoneRadius=kind==='mine'?95:kind==='meteor'?95:kind==='turret'?60:kind==='quake'?58:kind==='stun'?115:kind==='orbit'?130:Math.min(220,Math.round(145*mods.radius));
   addZone(kind,cx,cy,power,{delay,interval,ttl,radius:zoneRadius,dx,dy});
   effects.push({x:cx,y:cy,r:kind==='meteor'?95:25,ttl:.24});
   if(effects.length>14)effects.splice(0,effects.length-14);
   castCount++;
   return true;
  }
  if(kind==='shove'){
   for(const e of enemies.slice()){
    const dx=e.x-px,dy=e.y-py,d=Math.hypot(dx,dy)||1;
    if(d>radius)continue;
    e.x=clamp(e.x+dx/d*95,15,W-15);
    e.y=clamp(e.y+dy/d*95,80,H-18);
    hit(e);
   }
   if(hits)effects.push({x:px,y:py,r:radius,ttl:.18});
  }else if(area.has(kind)){
   const r=Math.min(270,Math.round((shortRange.has(kind)?120:170)*mods.radius));
   for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    if((e.x-px)**2+(e.y-py)**2<=r*r)hit(e);
   }
   if(hits)effects.push({x:px,y:py,r,ttl:.20});
  }else if(conical.has(kind)){
   const dx=(target.x-px)/(distance||1),dy=(target.y-py)/(distance||1);
   // Cone: 0.65 radians half width; beam: narrow 0.22.
   const width=kind==='beam'?.98:.74;
   for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i],ex=e.x-px,ey=e.y-py,d=Math.hypot(ex,ey)||1;
    if(d<=460&&(ex*dx+ey*dy)/d>=width)hit(e);
    if(hits>=5)break;
   }
   if(hits)effects.push({x:px+dx*120,y:py+dy*120,r:kind==='beam'?32:70,ttl:.18});
  }else if(chaining.has(kind)){
   const ordered=enemies.slice().sort((a,b)=>
    (a.x-target.x)**2+(a.y-target.y)**2-
    ((b.x-target.x)**2+(b.y-target.y)**2));
   const limit=Math.max(2,Math.min(6,(source?.count||2)+mods.count));
   for(const e of ordered){
    if((e.x-target.x)**2+(e.y-target.y)**2>145*145)continue;
    hit(e);if(hits>=limit)break;
   }
   if(hits)effects.push({x:target.x,y:target.y,r:58,ttl:.20});
  }else{
   // Projectile/homing/melee: focused nearest target rather than full circle.
   hit(target);
   effects.push({x:target.x,y:target.y,r:kind==='melee'?38:27,ttl:.16});
  }
  if(effects.length>14)effects.splice(0,effects.length-14);
  if(hits)castCount++;
  return hits>0;
 }
 function extraCombat(dt){
  if(!moveList.length||pickOpen||paused||menu)return;
  const faster=(megaActive>0?data.mega.cdFactor:1)*rankCooldownMultiplier();
  // Each learned skill owns its own cooldown, rather than a single circle
  // cast that overpowers all move kinds. Clamp work per frame.
  let budget=2;
  for(const move of moveList){
   const fusion=move.id.startsWith('fusion:');
   const kind=fusion?fusionKind[move.id.slice(7)]||'nova':nativeMoveById.get(move.id)?.kind||'projectile';
   const source=nativeMoveById.get(move.id);
   const mods=levelMods(move);
   const cd=fusion?1.65:Math.max(data.cooldownFloors[kind]||.55,(source?.cd||.7)*mods.cd);
   move.cooldown=Math.max(0,(move.cooldown||0)-dt);
   if(move.cooldown>0||budget<=0)continue;
   const fired=castMove(move);
   // Missing/out-of-range targets do not waste a complete skill cooldown.
   if(fired){move.cooldown=cd*faster;budget--}
  }
 }
 function input(dt){
  const pad=navigator.getGamepads?.()?.find?.(p=>p?.connected)||navigator.getGamepads?.()?.[0];
  const btn=n=>!!pad?.buttons?.[n]?.pressed;
  const plus=btn(9),a=btn(1),b=btn(0),y=btn(2),x=btn(3),zr=btn(7),zl=btn(6),
   left=btn(14),right=btn(15),r=btn(5),l=btn(4);
  if(plus&&!lastStart&&!pickOpen&&!branchPromptDex){menu=!menu;menuIndex=0;if(menu){persist()}}
  if(zl&&r&&!lastZL&&!pickOpen&&!menu){
   accelerated=!accelerated;clockScale=accelerated?12:1;
   if(accelerated)runUsedQA=true;
  }
  let consumedMenuClose=false;
  if(matchResult&&!menu){
   if(a&&!r&&!lastA)resetBattle();
   lastStart=plus;lastA=a;lastB=b;lastY=y;lastX=x;lastZR=zr;lastZL=zl;
   lastLeft=left;lastRight=right;lastL=l;lastR=r;
   return true;
  }
  if(menu&&branchPromptDex){
   const choices=branchOptions(branchPromptDex);
   // A branch modal consumes X/Y, never moves menu focus or triggers skill UI.
   if(x&&!lastX)chooseRankBranch(branchPromptDex,choices[0]);
   else if(y&&!lastY)chooseRankBranch(branchPromptDex,choices[1]);
   else if(b&&!lastB)branchPromptDex=0;
   lastStart=plus;lastA=a;lastB=b;lastY=y;lastX=x;lastZR=zr;lastZL=zl;
   lastLeft=left;lastRight=right;lastL=l;lastR=r;
   return true;
  }
  if(menu){
   const previousTab=menuTab;
   if((left&&!lastLeft)||(l&&!lastL))menuTab=(menuTab+9)%10;
   if((right&&!lastRight)||(r&&!lastR))menuTab=(menuTab+1)%10;
   if(menuTab!==previousTab)menuIndex=0;
   if(menuTab===0){
    const choices=teamOptions();
    if(a&&!lastA&&choices.length){
     profile.selected=choices[menuIndex%choices.length];
     markDirty();resetBattle();menu=false;
    }
    if(y&&!lastY)menuIndex=(menuIndex+1)%Math.max(1,choices.length);
   }
   if(menuTab===1){
    const ids=ownedIds();
    if(y&&!lastY)menuIndex=(menuIndex+1)%Math.max(1,ids.length);
    if(a&&!lastA&&ids.length){
     profile.selected=ids[menuIndex%ids.length];
     markDirty();resetBattle();menu=false;
    }
   }
   if(menuTab===2){
    const ids=ownedIds();
    if(y&&!lastY)menuIndex=(menuIndex+1)%Math.max(1,ids.length);
    if(a&&!lastA&&ids.length){
     const dex=ids[menuIndex%ids.length];
     if(rankOf(dex)>=3&&!rankBranch(dex))branchPromptDex=dex;
     else upgradeRank(dex);
    }
   }
   if(menuTab===3&&y&&!lastY){
    const pages=Math.max(1,Math.ceil(Object.keys(profile.pokedex).length/18));
    menuIndex=(menuIndex+1)%pages;
   }
   if(menuTab===4){
    if(a&&!lastA)recruitMany(1);
    if(y&&!lastY)recruitMany(10);
   }
   if(menuTab===9){
    const opts=specialEvolutionOptions();
    if(y&&!lastY)menuIndex=(menuIndex+1)%Math.max(1,opts.length);
    if(a&&!lastA&&opts.length&&chooseSpecialEvolution(opts[menuIndex%opts.length].to)){
     menu=false;consumedMenuClose=true;
    }
   }
   if(b&&!lastB){menu=false;consumedMenuClose=true}
  }else{
   if(!pickOpen){
    // Outside level-up dialogs R+Y uses Orb; R+B pause is in main.js.
    if(r&&y&&!(lastR&&lastY)&&!zl)orbUse();
    if(zr&&!lastZR&&!r)activateMega();
   }
   if(spritesEnabled)loadExtraSprites();
  }
  lastStart=plus;lastA=a;lastB=b;lastY=y;lastX=x;lastZR=zr;lastZL=zl;
  lastLeft=left;lastRight=right;lastL=l;lastR=r;
  return menu||consumedMenuClose||!!matchResult||(!pickOpen&&plus);
 }
 function preUpdate(dt){return input(dt)}
 function onRespawn(){
  boss15=false;boss30=false;bossMessage='';
  orbQueue.length=0;orbCooldown=0;activeBuffs={};effects.length=0;zones.length=0;
  megaActive=0;megaCooldown=0;megEnergy=0;
 }
 function postUpdate(dt){
  if(paused||menu||!started||matchResult)return;
  updateEffects(dt);
  advanceZones(dt);
  extraCombat(dt);
  if(!boss15&&time>=KANTO_CONFIG.sealSeconds){boss15=true;spawnBoss(15)}
  // At 30:00 the final boss waits until the 15:00 boss is defeated.
  if(!boss30&&time>=KANTO_CONFIG.finalBossSeconds&&!enemies.some(e=>e.boss===15)){
   boss30=true;spawnBoss(30);
  }
  if(saveDirty&&time-lastSaveAt>30){persist();lastSaveAt=time}
 }
 function text(x,y,value,color='#eaf9f0',font='19px sans-serif'){
  ctx.fillStyle=color;ctx.font=font;ctx.fillText(String(value),x,y)
 }
 function draw(){
  text(820,44,'PKMSVV SWITCH NATIVE 0.3.0','#ffe39d');
  text(820,74,'KANTO • GEN 1 • '+(runUsedQA?(accelerated?'QA x12':'QA - CLOCK NORMAL'):'REAL TIME'),'#a7e7f6');
  text(820,103,'TEAM: '+name(getMon(profile.selected))+' R'+currentRank()+
   '  ACTIVE '+(realByDex.get(evolvedDex())?.name||name(getMon(profile.selected)))+
   '  SKILL '+moveList.length+'/8');
  text(820,132,'ORB: '+orbQueue.length+'/10   CD '+orbCooldown.toFixed(1)+'s   SHARD '+evolutionShards);
  text(820,161,'MEGA: '+megEnergy+'/100  CD '+Math.ceil(megaCooldown)+'s');
  text(820,190,'DEX: '+Object.keys(profile.pokedex).length+'  BADGE: '+(badgeWon?'YES':'NO'));
  text(820,218,'SAVE: '+saveStatus+'  KANTO CLEARS: '+(profile.kantoClears||0),'#acc7ff');
  text(820,251,'R+Y ORB  R+B PAUSE  ZR MEGA  + MENU','#ffe0ad','17px sans-serif');
  text(820,277,'ZL SPEED '+(fastMode?'x1.5':'x1')+'  ZL+R QA x12   L SPRITE','#ffe0ad','17px sans-serif');
  if(moveList.length){
   const list=moveList.map(m=>m.id+(m.lvl<5?' '+m.lvl:' MAX')+' '+Math.ceil(m.cooldown||0)+'s');
   for(let i=0;i<list.length;i++)text(840,322+i*25,list[i],'#caefcc','16px sans-serif');
  }
  for(const z of zones){
   ctx.strokeStyle=z.kind==='meteor'?'#ef8b70':z.kind==='mine'?'#fce07b':'#77c8de';
   ctx.lineWidth=2;ctx.beginPath();
   ctx.arc(z.kind==='aura'||z.kind==='orbit'?px:z.x,
    z.kind==='aura'||z.kind==='orbit'?py:z.y,
    Math.min(110,z.radius),0,Math.PI*2);ctx.stroke();
  }
  for(const fx of effects){ctx.strokeStyle='#f9d977';ctx.lineWidth=2;
   ctx.beginPath();ctx.arc(fx.x,fx.y,fx.r,0,Math.PI*2);ctx.stroke()}
if(pickOpen){
    if(evoStage){
     text(W-390,158,'EVOLUTION - MOVE SWAP','#ffe39d','bold 19px sans-serif');
     text(W-390,180,evoStage==='old'?'1/2 SELECT OLD MOVE':'2/2 CHOOSE NEW MOVE','#bbf4ec','17px sans-serif');
    }
    const start=skillPage*3;
   for(let i=0;i<3;i++){
    const offer=offers[start+i];if(!offer)continue;
    text(W-390,210+i*72,['X','Y','B'][i]+'  '+offer.name,'#ffe7b0','17px sans-serif');
   }
   text(W-390,420,'A: NEXT PAGE '+(skillPage+1)+'/'+Math.ceil(offers.length/3),
    '#f9d9a0','17px sans-serif');
  }
  if(bossMessage)text(455,123,bossMessage,'#fff0a2','bold 28px sans-serif');
  if(evolutionNoticeLeft>0&&!menu&&!matchResult){
   ctx.fillStyle='rgba(8,29,33,.93)';ctx.fillRect(355,93,560,72);
   ctx.strokeStyle='#ffe39d';ctx.lineWidth=2;ctx.strokeRect(355,93,560,72);
   text(386,139,'EVOLVED: '+evolutionNotice,'#ffe39d','bold 22px sans-serif');
  }
  if(menu)drawMenu();
  else if(matchResult)drawResult();
 }
 function drawResult(){
  ctx.fillStyle='rgba(4,14,25,.96)';ctx.fillRect(215,120,850,475);
  ctx.strokeStyle=matchResult==='victory'?'#f4da83':'#d4a6a6';
  ctx.lineWidth=3;ctx.strokeRect(215,120,850,475);
  text(275,178,matchResult==='victory'?'KANTO COMPLETE':'RUN ENDED',
   matchResult==='victory'?'#fff1a7':'#ffb9b9','bold 34px sans-serif');
  text(275,228,runUsedQA?'QA USED - NO OFFICIAL CLEAR RECORD':'NORMAL SURVIVAL RUN','#b9e2f3');
  text(275,270,'TIME: '+Math.floor(runEndTime/60)+'m '+runEndTime%60+'s   KO: '+runEndKOs+'   LEVEL: '+level);
  text(275,312,'POKEDEX FOUND: '+Object.keys(profile.pokedex).length+'/151');
  text(275,354,'KANTO RECORDS: '+(profile.kantoClears||0)+'   SAVE: '+saveStatus);
  text(275,402,matchResult==='victory'?'Kanto cleared. Johto is not yet ported.':'Try another build or starter.');
  text(275,464,'A: RESTART KANTO   +: TEAM / POKEDEX MENU','#f4dda4','22px sans-serif');
  text(275,510,'No automatic restart. Your native save remains separate.','#b9c9d2','17px sans-serif');
 }
 function drawMenu(){
  ctx.fillStyle='rgba(6,17,29,.97)';ctx.fillRect(95,65,1080,590);
  ctx.strokeStyle='#92dccb';ctx.strokeRect(95,65,1080,590);
  const tabs=['TEAM','BOX','RANK','POKEDEX','RECRUIT','ORB','FUSION','CONTROLLER','INFO','EVOLVE'];
  for(let i=0;i<tabs.length;i++)text(103+i*110,110,(i===menuTab?'[':'')+tabs[i]+(i===menuTab?']':''),
   i===menuTab?'#fff0a2':'#b8d5d6','17px sans-serif');
  if(menuTab===0){
   text(135,170,'Y NEXT • A TRIAL SELECT • L/R TABS • B BACK','#cfeadf');
   const choices=teamOptions();
   const offset=Math.max(0,Math.min(choices.length-7,menuIndex-3));
   for(let i=offset;i<Math.min(offset+7,choices.length);i++){
    const mon=getMon(choices[i]),trial=roster.some(r=>r.dex===choices[i]);
    text(160,220+(i-offset)*57,(i===menuIndex?'▶ ':'   ')+(mon?.name||'#'+choices[i])+' #'+choices[i]+
     (trial?' [TRIAL]':' [OWNED]')+(choices[i]===profile.selected?' ACTIVE':''),
     i===menuIndex?'#ffdc94':'#dce9e7','21px sans-serif');
   }
  }
  if(menuTab===1){
   text(135,164,'POKEBOX  Y NEXT  A USE  (duplicates stored as copies)','#d6ede4');
   const owned=ownedIds(),offset=Math.max(0,Math.min(owned.length-8,menuIndex-3));
   for(let i=offset;i<Math.min(owned.length,offset+8);i++){
    const dex=owned[i];
    text(165,207+(i-offset)*53,(i===menuIndex?'▶ ':'   ')+
     '#'+dex+' '+(getMon(dex)?.name||'Unknown')+'   x'+profile.box[dex]+
     '  R'+rankOf(dex)+(rankBranch(dex)?' '+rankBranch(dex).toUpperCase():'')+
     (profile.selected===dex?'  IN BATTLE':''),
     i===menuIndex?'#ffe4a8':'#d9ebde','21px sans-serif');
   }
  }
  if(menuTab===2){
   text(135,157,'NANG RANK / UPGRADES  Y NEXT  A UPGRADE (no confirmation)','#ffe3a0','22px sans-serif');
   const ids=ownedIds(),offset=Math.max(0,Math.min(ids.length-7,menuIndex-3));
   for(let i=offset;i<Math.min(ids.length,offset+7);i++){
    const dex=ids[i],plan=rankPlan(dex);
    text(155,214+(i-offset)*51,(i===menuIndex?'▶ ':'  ')+
     '#'+dex+' '+(getMon(dex)?.name||'')+' R'+plan.rank+'/5  '+
     plan.available+'/'+plan.cost+' COPIES  '+(rankOf(dex)>=3&&!rankBranch(dex)?'CHOOSE BRANCH':plan.eligible?'READY':plan.reason)+
     (rankBranch(dex)?' ['+rankBranch(dex)+']':''),
     i===menuIndex?(plan.eligible?'#ffe28d':'#d3d4d6'):'#d4e6e0','18px sans-serif');
   }
   if(branchPromptDex){
    const choices=branchOptions(branchPromptDex),mon=getMon(branchPromptDex);
    ctx.fillStyle='rgba(5,16,29,.98)';ctx.fillRect(223,218,820,310);
    ctx.strokeStyle='#ffd77e';ctx.lineWidth=3;ctx.strokeRect(223,218,820,310);
    text(270,276,'RANK 3: '+(mon?.name||'#'+branchPromptDex)+' - CHOOSE BRANCH','#ffe9a4','bold 26px sans-serif');
    text(270,339,'X: '+choices[0].toUpperCase()+'       Y: '+choices[1].toUpperCase(),'#bcffe5','24px sans-serif');
    text(270,402,'B: LATER (NO MATERIALS CONSUMED)','#c9deec','18px sans-serif');
    text(270,455,'Branch is permanent; Rank 5 inherits the same choice.','#ffdfa0','17px sans-serif');
   }
   text(150,598,'R0>1 costs 1 duplicate; R1>2 costs 2 ... R4>5 costs 5. Base copy protected.','#c0efd8','17px sans-serif');
   text(150,626,'Last: '+(lastRankOutcome||'NONE YET')+'  |  Shiny never counts as a duplicate.','#ffeca8','16px sans-serif');
  }
  if(menuTab===3){
   let ids=Object.keys(profile.pokedex).sort((a,b)=>Number(a)-Number(b));
   const pages=Math.max(1,Math.ceil(ids.length/18));
   text(135,170,'POKEDEX: discovered by defeating Kanto Pokemon. Y NEXT PAGE '+(menuIndex+1)+'/'+pages,'#d6ede4');
   ids=ids.slice(menuIndex*18,menuIndex*18+18);
   for(let i=0;i<ids.length;i++)text(165+(i%3)*330,220+Math.floor(i/3)*60,'#'+ids[i]+' '+(getMon(+ids[i])?.name||'DISCOVERED'));
   if(!Object.keys(profile.pokedex).length)text(165,235,'Defeat a Pokemon in normal Kanto mode first','#fff0ad');
  }
  if(menuTab===4){
   text(135,162,'CHIEU MO / RECRUITMENT — Pokédex-discovered species only','#ffe5ad','23px sans-serif');
   text(145,209,'Native tickets: '+profile.recruitTickets+'   KO Progress: '+(profile.recruitKO%30)+'/30');
   text(145,249,'5-Star pity: '+profile.recruitPity+'/'+recruitRules.pity5+' (when 5-Star unlocked)');
   text(145,289,'Available discovered species: '+discoveredPool().length+'   Box owned: '+ownedIds().length);
   text(145,329,'A: RECRUIT x1 (1 ticket)       Y: RECRUIT x10 (10 tickets)','#a9ffe0');
   text(145,373,'Duplicates become extra copies in PokéBox. No automatic rank upgrade.');
   text(145,412,'Last: '+(lastRecruitOutcome||'NONE YET'),'#ffe9ad','18px sans-serif');
   text(145,455,'Earn 1 ticket per 30 normal KOs; bosses award 2 / 3 tickets.');
   text(145,494,'Trial native economy. Original star rates, not original save/wallet.');
   text(145,534,'Undiscovered Pokémon cannot be rolled, including Legendary Pokémon.');
  }
  if(menuTab===5){
   text(135,170,'Orb queue (FIFO, max 10, 5s cooldown) • R+Y uses first');
   for(let i=0;i<orbQueue.length;i++)text(165,213+i*37,(i+1)+'. '+orbQueue[i],'#ffe5b2');
  }
  if(menuTab===6){
   text(135,170,'Fusion: 2 source moves MAX, once per match','#ffdfa4');
   for(let i=0;i<data.fusions.length;i++){
    const f=data.fusions[i],known=id=>moveList.some(m=>m.id===id&&m.lvl>=MOVE_MAX);
    text(145+(i%2)*510,220+Math.floor(i/2)*72,f.name+(f.moves.every(known)?' READY':' LOCKED'),
     f.moves.every(known)?'#a3ffc7':'#c5ccd1','16px sans-serif');
   }
  }
  if(menuTab===7){
   text(145,169,'CONTROLLER BINDINGS - Nintendo Switch only','#fff0a2','23px sans-serif');
   text(155,219,'LEVEL UP: X = SKILL 1     Y = SKILL 2     B = SKILL 3');
   text(155,259,'LEVEL UP: R+A = NEXT PAGE (3 skills per page)');
   text(155,299,'BATTLE: A = DASH     R+Y = USE ORB     R+B = PAUSE');
   text(155,339,'BATTLE: ZL = SPEED x1 / x1.5   ZR = MEGA (QA)');
   text(155,379,'MENU: + = OPEN     L/R = TABS     B = BACK');
   text(155,419,'TEAM/BOX: Y NEXT, A USE  |  RANK: Y NEXT, A UPGRADE');
   text(155,453,'RECRUIT: A x1, Y x10. Rank3 branch: X / Y; B later.','#d8ffe1','17px sans-serif');
   text(155,480,'EVOLUTION: X/Y/B choose old/new; R+A next page','#c1ffd5','17px sans-serif');
   text(155,506,'EVOLVE TAB: Y NEXT BRANCH / A USE SHARD','#ffe9b1','17px sans-serif');
   text(155,551,'CONTROLS: L = SPRITES     ZL+R = QA x12 (test only)','#bacfe4','17px sans-serif');
  }
  if(menuTab===8){
   text(145,175,'Native Alpha QA: real Kanto waves, six source Orbs, 10 Fusion recipes');
   text(145,216,'Partial battle adapter: not yet the production browser gameplay engine.');
   text(145,257,'Save: sdmc:/switch/pkmsvv-native-alpha/ (two independent copies)');
   text(145,298,'Rank3 branch + Rank5 hybrid native adapter; no PC/Web import.');
   text(145,339,'Modes not ported: Co-op, Arena, Berry Rescue, 10 chapters.');
   text(145,380,'ZL+R: x12 clock, 99% less damage, 6x boss damage. QA badges not saved.');
   text(145,421,'Fusion MAX+MAX offer: 80/70/60/50/40/30%, 1 roll per level.');
  }
  if(menuTab===9){
   text(140,176,'EVOLVE - STONE / LINK CABLE    SHARDS: '+evolutionShards,'#ffe3a3','24px sans-serif');
   text(150,218,'Boss 15:00 grants one Evolution Shard. Shards do not save.','#bcebdd','18px sans-serif');
   text(150,253,'Y: NEXT BRANCH    A: USE 1 SHARD    B: BACK','#ffe0a0','18px sans-serif');
   const options=specialEvolutionOptions();
   text(150,298,'CURRENT: '+(realByDex.get(battleEvolutionDex)?.name||'#'+battleEvolutionDex)+
    '   Original PokéBox slot / Rank kept','#d5f8e2','19px sans-serif');
   if(!options.length)text(150,358,'No stone/link evolution for current form.','#ffe7b0','20px sans-serif');
   for(let i=0;i<options.length;i++){
    const ev=options[i],active=i===menuIndex%options.length;
    text(160,355+i*66,(active?'▶ ':'  ')+(realByDex.get(ev.to)?.name||'#'+ev.to)+
     '  ['+(ev.item==='link-cable'?'LINK CABLE':ev.item.toUpperCase())+']  '+
     (evolutionShards>0?'READY':'BOSS SHARD REQUIRED'),
     active?'#ffe39d':'#cadfe2','20px sans-serif');
   }
   text(145,584,'Last: '+(lastSpecialEvolutionOutcome||'NONE'),'#d0f5ee','18px sans-serif');
   text(145,623,'Eevee: 3 branches. Haunter / Kadabra: Link Cable.','#bcd8d1','18px sans-serif');
  }
 }
 // Keep persistent progress isolated; no automatic ownership grants.
 load();resetBattle();
 return {enabled:true,data,spriteNames,preUpdate,postUpdate,onKill,offersForLevel,
  pickOffer,selectSpecies,draw,persist,loadExtraSprites,chooseBattleSprite,onRespawn,resetBattle,onDefeat,
  get profile(){return profile},get menu(){return menu},get accelerated(){return accelerated},get runUsedQA(){return runUsedQA},
   get matchResult(){return matchResult},get runEndTime(){return runEndTime},get runEndKOs(){return runEndKOs},
  get orbQueue(){return orbQueue},get moves(){return moveList},
  get rankRules(){return RANK_RULES},get lastRankOutcome(){return lastRankOutcome},
  get branchPromptDex(){return branchPromptDex},get rankTraits(){return RANK_TRAITS},
  branchOptions,rankBranch,chooseRankBranch,
  rankPlan,upgradeRank,rankOf,
  get rankMaxHp(){return rankMaxHp()},get rankDamageMultiplier(){return rankDamageMultiplier()},
  get rankCooldownMultiplier(){return rankCooldownMultiplier()},
  onRankHit,
  get rankProcCount(){return rankProcCount},get rankHybridCount(){return rankHybridCount},
  get rankCombatSeconds(){return rankCombatSeconds},
  advanceRankClock,
  get lastRecruitOutcome(){return lastRecruitOutcome},
  get recruitmentOdds(){return recruitRules},
  get recruitableCount(){return discoveredPool().length},
  recruitMany,ownedIds,teamOptions,
  get boss15(){return boss15},get boss30(){return boss30},get gameWon(){return gameWon},
  get fusionUsed(){return fusionUsed},get megaPreview(){return megaPreview},
  get fusionOfferAttempts(){return fusionOfferAttempts},get fusionOfferRecipe(){return fusionOfferRecipe},
  get evolvedDex(){return evolvedDex()},onLevelUp,evolutionChainAt,statsAtEvolution,
   get battleEvolutionDex(){return battleEvolutionDex},
   get evolutionEvents(){return evolutionEvents},
get evolutionNotice(){return evolutionNotice},
    get evolutionSwapStage(){return evoStage},get evolutionSwapCount(){return evoSwapCount},
    get evolutionSwapQueue(){return evoQueue},get evolutionSwapChoices(){return evoChoices},
    get levelOffersAfterEvolution(){return levelOffersAfterEvolution},
    naturalMovePool,specialEvolutionOptions,chooseSpecialEvolution,
   get evolutionShards(){return evolutionShards},
   get lastSpecialEvolutionOutcome(){return lastSpecialEvolutionOutcome},
  get menuTab(){return menuTab},get menuIndex(){return menuIndex},
  get orbCooldown(){return orbCooldown},
  get offers(){return offers},
  get saveStatus(){return saveStatus},get clockScale(){return clockScale},
  get incomingDamageMultiplier(){
   const rank=currentRank(),branch=rankBranch(profile.selected);
   const effect=RANK_TRAITS.branchStatuses?.[branch];
   let factor=accelerated?.01:1;
   if(rank>=3&&effect==='guard')factor*=rank>=5?.90:.94;
   if(rank>=3&&effect==='evade'&&rng()<(rank>=5?.12:.08))return 0;
   return factor;
  },
  get bossDamageMultiplier(){return accelerated?6:1},
  get moveMultiplier(){return (activeBuffs.quick>0?1.25:1)*statsAtEvolution(evolvedDex()).speed},
  get castCount(){return castCount},get damageCount(){return damageCount},
  get availableMoveCount(){return sourceMoves.length},get availablePokemonCount(){return realDex?.length||0},
  get realDexLength(){return realDex?.length||0},
  get effectCount(){return effects.length},
  get zoneCount(){return zones.length},get zones(){return zones},
  get zoneLimit(){return MAX_SKILL_ZONES},advanceZones,
  castMove
 };
})();