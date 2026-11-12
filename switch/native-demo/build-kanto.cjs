'use strict';
// Compile the real PKMSVV Quick Region configuration into the native Switch demo.
// No DOM/WebApplet engine is executed at runtime. Only verified data is copied.
// Any upstream Kanto rule changes must be reviewed; fail closed on drift.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'src/pkmsvv-quick-region.js'),'utf8');
const demoPath=path.join(__dirname,'main.js');
const sourceJs=fs.readFileSync(demoPath,'utf8');
function matchScalar(key){
 const m=source.match(new RegExp('\\bconst\\s+'+key+'\\s*=\\s*([^;]+);'));
 if(!m)throw Error('PKMSVV region source missing '+key);
 return m[1].trim();
}
function parseExpression(expr,key){
 if(!/^[0-9,\[\]\.\s*+-]+$/.test(expr))
  throw Error('Unexpected expression in '+key+': '+expr);
 if(expr.includes('*')){
  const x=expr.split('*').map(Number);
  if(x.length!==2||x.some(y=>!Number.isFinite(y)))throw Error('Unsafe numeric expression in '+key);
  return x[0]*x[1];
 }
 return JSON.parse(expr);
}
const waves=parseExpression(matchScalar('WAVE_SECONDS'),'WAVE_SECONDS');
const bounds=parseExpression(matchScalar('GEN_BOUNDS'),'GEN_BOUNDS');
const mascots=parseExpression(matchScalar('REGION_MASCOTS').replace(/^Object\.freeze\(/,'').replace(/\)$/,''),'REGION_MASCOTS');
const names=JSON.parse(matchScalar('NAMES').replace(/'([^']+)'/g,'"$1"'));
const palettes=JSON.parse(matchScalar('SCENE_PALETTES').replace(/'/g,'"'));
const seal=parseExpression(matchScalar('SEAL_SECONDS'),'SEAL_SECONDS');
const final=parseExpression(matchScalar('FINAL_BOSS_SECONDS'),'FINAL_BOSS_SECONDS');
if(names[0]!=='Kanto'||bounds[0][0]!==1||bounds[0][1]!==151||
 mascots[0]!==150||seal!==900||final!==1800||
 JSON.stringify(waves)!==JSON.stringify([0,120,240,360,480,600,720]))
 throw Error('Kanto game source changed: native adaptation requires review');
const data={
 region:names[0],gen:1,nationalMin:bounds[0][0],nationalMax:bounds[0][1],
 waveSeconds:waves,sealSeconds:seal,finalBossSeconds:final,
 mascotDex:mascots[0],palette:palettes[0],
 // Only backed-by-current-ROMFS trial sprites, all introduced in Gen 1.
 trialSpecies:[
  {name:'rattata',dex:19,sprite:'19.png',minTier:0},
  {name:'pidgey',dex:16,sprite:'16.png',minTier:0},
  {name:'zubat',dex:41,sprite:'41.png',minTier:1}
 ]
};
if(data.trialSpecies.some(p=>p.dex<data.nationalMin||p.dex>data.nationalMax))
 throw Error('Out-of-generation native trial species');
// Pull *actual* gameplay constants from PKMSVV source. Native implementations
// are narrower than the browser modules: no fabricated save unlocks.
const orbsSource=fs.readFileSync(path.join(root,'src/v14/orbs.js'),'utf8');
const balanceSource=fs.readFileSync(path.join(root,'src/pkmsvv-skill-balance.js'),'utf8');
const rankSource=fs.readFileSync(path.join(root,'src/pkmsvv-box-stage2.js'),'utf8');
const rankEffectSource=fs.readFileSync(path.join(root,'src/pkmsvv-box-stage4.js'),'utf8');
const fusionSource=fs.readFileSync(path.join(root,'src/pkmsvv-bond-fusion.js'),'utf8');
const megaSource=fs.readFileSync(path.join(root,'src/pkmsvv-mega-phase3.js'),'utf8');
const evolutions=JSON.parse(fs.readFileSync(path.join(root,'data/evolution-rules.json'),'utf8'));
const orbs=[...orbsSource.matchAll(/\{id:'([^']+)',col:'([^']+)',kind:'([^']+)'(?:,dur:(\d+))?/g)]
 .map(m=>({id:m[1],color:m[2],kind:m[3],duration:Number(m[4]||0)}));
const fusions=[...fusionSource.matchAll(/\{id:'([^']+)',ids:\['([^']+)','([^']+)'\],vi:'([^']+)',en:'([^']+)'/g)]
 .map(m=>({id:m[1],moves:[m[2],m[3]],name:m[4],en:m[5]}));
const megaMatch=megaSource.match(/const STONE_CHANCE=\.01,DURATION=(\d+),REUSE_COOLDOWN=(\d+),CD_FACTOR=([\d.]+);/);
const fusionRatesMatch=fusionSource.match(/const FUSION_OFFER_RATES=Object\.freeze\(\[([^\]]+)\]\)/);
if(!fusionRatesMatch)throw Error('Fusion offer rates missing from official source');
const fusionOfferRates=JSON.parse('['+fusionRatesMatch[1].replace(/(^|,)\s*\./g,(_,sep)=>sep+'0.')+']');
if(JSON.stringify(fusionOfferRates)!==JSON.stringify([.8,.7,.6,.5,.4,.3]))
 throw Error('Fusion rates changed: native adapter requires review');

if(orbs.length!==6||fusions.length!==10||!megaMatch)
 throw Error('PKMSVV source changed: orb/fusion/mega bridge needs review');
// Reuse documented cooldown floors for the 23 native move categories.
// These are *adapter* categories; the complete 103 Web move implementations
// are not available inside nx.js, so do not claim parity.
const profileMatch=balanceSource.match(/const profiles\s*=\s*\{([\s\S]*?)\n  \};/);
if(!profileMatch)throw Error('PKMSVV cooldown profile table missing');
const cooldownFloors={};
for(const m of profileMatch[1].matchAll(/^\s*(\w+):\s*\{([^}]+)\}/gm)){
 const floor=m[2].match(/\bfloor:([\d.]+)/);
 if(floor)cooldownFloors[m[1]]=Number(floor[1]);
}
if(Object.keys(cooldownFloors).length!==23||
 !Number.isFinite(cooldownFloors.projectile)||
 !Number.isFinite(cooldownFloors.nova))
 throw Error('PKMSVV cooldown profiles changed: review Switch adaptation');
// Native Rank follows original Box Stage2: extra ordinary copies 1,2,3,4,5
// per next level; per rank +6% HP/damage and one-time -5% cooldown at Rank4.
if(!/MAX_RANK=5/.test(rankSource)||
 !/const cost=progress\.rank\+1/.test(rankSource)||
 !/factor=1\+item\.rank\*0\.06/.test(rankSource)||
 !/cooldown:n>=4\?5:0/.test(rankSource))
 throw Error('Source Rank mechanics changed: Switch adapter needs review');
const nativeRank={max:5,perRankStatBonus:.06,rank4CooldownReduction:.05,
 nextRankCost:'rank+1',legendaryMaterialRestricted:true,shinyExcluded:true};
// Keep the Rank3 / Rank5 mechanics synchronized with original Stage 2/4.
const branchMatch=rankSource.match(/function branches\(dex\)\{([\s\S]*?)\n  \}/);
if(!branchMatch||!branchMatch[1].includes("['offense','defense']")||
 !branchMatch[1].includes('slice(0,2)'))throw Error('Box Rank branch rules changed');
const traitsMatch=rankEffectSource.match(/const ST=\{([\s\S]*?)\};/);
const timingMatch=rankEffectSource.match(/const HIT_PROC=([\d.]+),HIT_LOCK_MS=(\d+),HYBRID_LOCK_MS=(\d+),HYBRID_MAX=(\d+);/);
if(!traitsMatch||!timingMatch||!rankEffectSource.includes('queryCircle?.(e.x,e.y,140)'))
 throw Error('Box Rank 3/5 combat constants changed');
const rankStatuses={};
for(const match of traitsMatch[1].matchAll(/(\w+):'(\w+)'/g))
 rankStatuses[match[1]]=match[2];
if(Object.keys(rankStatuses).length<20||
 Number(timingMatch[1])!==.16||Number(timingMatch[2])!==3500||
 Number(timingMatch[3])!==12000||Number(timingMatch[4])!==6)
 throw Error('Invalid original Rank traits');
nativeRank.traits={
 branchStatuses:rankStatuses,
 hitChance:+timingMatch[1],hitCooldownMs:+timingMatch[2],
 hybridCooldownMs:+timingMatch[3],hybridMaxTargets:+timingMatch[4],
 hybridRadius:140
};
const nativeMoves=[
 ['thunder-shock','chain'],['quick-attack','melee'],
 ['ember','projectile'],['water-gun','projectile'],
 ['vine-whip','cone'],['tackle','melee'],
 ['thunderbolt','chain'],['spark','chain'],['gust','cone'],
 ['ice-shard','projectile'],['razor-leaf','projectile'],
 ['rock-tomb','mine'],['confusion','nova'],['shadow-ball','homing'],
 ['flamethrower','beam'],['metal-claw','melee'],
 ['psychic','nova'],['bubble-beam','projectile']
].map(([id,kind])=>({id,kind,cooldown:cooldownFloors[kind]}));
if(nativeMoves.length!==18)throw Error('Invalid native move subset');

const evolutionRows=evolutions.rules.filter(row=>row.from>=1&&row.from<=151&&
 row.to>=1&&row.to<=151&&row.trigger==='1'&&Number.isInteger(row.level)&&
 Object.keys(row).every(key=>['from','to','trigger','level'].includes(key)))
 .map(row=>({from:row.from,to:row.to,level:row.level}));
if(evolutionRows.length!==52||
 evolutionRows.some(row=>row.level<2||row.level>100||row.from===row.to))
 throw Error('Kanto level-evolution source changed: review nx.js adapter');
// Original conditional branches are MANUAL: one boss-earned shard, no auto-evolution.
const specialEvolutionRows=evolutions.rules.filter(row=>row.from>=1&&row.from<=151&&
 row.to>=1&&row.to<=151&&
 ((row.trigger==='3'&&typeof row.item==='string'&&row.item.endsWith('-stone'))||
 (row.trigger==='2'&&!row.held&&!row.item)))
 .map(row=>({from:row.from,to:row.to,trigger:row.trigger,
  item:row.trigger==='2'?'link-cable':row.item}));
const counts={};
for(const row of specialEvolutionRows)counts[row.item]=(counts[row.item]||0)+1;
if(specialEvolutionRows.length!==20||
 JSON.stringify(counts)!==JSON.stringify({'thunder-stone':2,'moon-stone':4,
  'fire-stone':3,'leaf-stone':3,'water-stone':4,'link-cable':4})||
 specialEvolutionRows.filter(row=>row.from===133).length!==3)
 throw Error('Kanto stone/link data drift: adapter requires review');
// Stone, trading and other conditional evolutions must not be auto-triggered.
data.nativeAlpha={
 orbs, fusions, fusionOfferRates, cooldownFloors, nativeMoves, rankRules:nativeRank, mega:{duration:+megaMatch[1],cooldown:+megaMatch[2],cdFactor:+megaMatch[3]},
 evolutions:evolutionRows,
 specialEvolutions:specialEvolutionRows,
 testOnly:true,
 // Native Alpha battle subset; do not represent this as the official full engine.
 trialRoster:[
  {dex:25,name:'Pikachu',sprite:'25.png'},
  {dex:4,name:'Charmander',sprite:'4.png'},
  {dex:1,name:'Bulbasaur',sprite:'1.png'},
  {dex:7,name:'Squirtle',sprite:'7.png'}
 ],
 evolutionSprites:[
  {dex:2,name:'Ivysaur',sprite:'2.png'},
  {dex:3,name:'Venusaur',sprite:'3.png'},
  {dex:5,name:'Charmeleon',sprite:'5.png'},
  {dex:6,name:'Charizard',sprite:'6.png'},
  {dex:8,name:'Wartortle',sprite:'8.png'},
  {dex:9,name:'Blastoise',sprite:'9.png'}
 ],
 trialEnemies:[
  {dex:19,name:'Rattata',sprite:'19.png',minTier:0},
  {dex:16,name:'Pidgey',sprite:'16.png',minTier:0},
  {dex:41,name:'Zubat',sprite:'41.png',minTier:1},
  {dex:10,name:'Caterpie',sprite:'10.png',minTier:2},
  {dex:21,name:'Spearow',sprite:'21.png',minTier:3},
  {dex:43,name:'Oddish',sprite:'43.png',minTier:4}
 ]
};

const catalogPath=path.join(__dirname,'romfs/real-game-catalog.json');
if(fs.existsSync(catalogPath)){
 const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
 if(catalog.format!=='pkmsvv-switch-native-real-catalog-v1'||
  catalog.moves.length!==103||catalog.pokemon.length!==151||
  catalog.pokemon.some((p,i)=>p.dex!==i+1))
  throw Error('Real game catalog incomplete; native bundle MUST fail closed');
 if(!catalog.recruitment||catalog.recruitment.rates.length!==5||
  !Number.isInteger(catalog.recruitment.pity5))
  throw Error('Real-game Kanto recruitment rules missing; refuse native build');
 if(catalog.movePoolSource!=='js/data/moves.js:Moves.poolFor'||
  !catalog.movePools||Object.keys(catalog.movePools).length!==151||
  Object.values(catalog.movePools).some(pool=>!Array.isArray(pool)||
   pool.some(id=>!catalog.moves.some(move=>move.id===id))))
  throw Error('Original Moves.poolFor source data absent or invalid');
 data.nativeAlpha.realMovePools=catalog.movePools;
 data.nativeAlpha.realMoves=catalog.moves;
 data.nativeAlpha.realPokedex=catalog.pokemon;
 data.nativeAlpha.recruitment=catalog.recruitment;
 data.nativeAlpha.realSource=catalog.originalGame;
 console.log('Bundling actual PKMSVV data',catalog.moves.length,'moves',catalog.pokemon.length,'Kanto Pokémon');
}

const marker='/*__PKMSVV_KANTO_CONFIG__*/';
if(!sourceJs.includes(marker))throw Error('Native Kanto insertion anchor missing');
const start=sourceJs.indexOf('const KANTO_CONFIG='+marker);
if(start<0)throw Error('Native config declaration missing');
const end=sourceJs.indexOf(';',start);
if(end<0)throw Error('Native config declaration is unterminated');
const output=sourceJs.slice(0,start)+'const KANTO_CONFIG='+JSON.stringify(data)+';'+sourceJs.slice(end+1);
const outPath=path.join(__dirname,'romfs/main.js');
fs.mkdirSync(path.dirname(outPath),{recursive:true});
const alphaSource=fs.readFileSync(path.join(__dirname,'alpha-runtime.js'),'utf8');
fs.writeFileSync(outPath,output+'\n'+alphaSource);
fs.writeFileSync(path.join(__dirname,'romfs/kanto-config.json'),JSON.stringify(data,null,2));
console.log('PKMSVV Kanto native bridge:',data.region,'Gen',data.gen,'wave tiers',waves.length,
 'boss markers',seal,final,'source',path.relative(root,path.join(root,'src/pkmsvv-quick-region.js')));
