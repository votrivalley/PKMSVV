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
const fusionSource=fs.readFileSync(path.join(root,'src/pkmsvv-bond-fusion.js'),'utf8');
const megaSource=fs.readFileSync(path.join(root,'src/pkmsvv-mega-phase3.js'),'utf8');
const evolutions=JSON.parse(fs.readFileSync(path.join(root,'data/evolution-rules.json'),'utf8'));
const orbs=[...orbsSource.matchAll(/\{id:'([^']+)',col:'([^']+)',kind:'([^']+)'(?:,dur:(\d+))?/g)]
 .map(m=>({id:m[1],color:m[2],kind:m[3],duration:Number(m[4]||0)}));
const fusions=[...fusionSource.matchAll(/\{id:'([^']+)',ids:\['([^']+)','([^']+)'\],vi:'([^']+)',en:'([^']+)'/g)]
 .map(m=>({id:m[1],moves:[m[2],m[3]],name:m[4],en:m[5]}));
const megaMatch=megaSource.match(/const STONE_CHANCE=\.01,DURATION=(\d+),REUSE_COOLDOWN=(\d+),CD_FACTOR=([\d.]+);/);
if(orbs.length!==6||fusions.length!==10||!megaMatch)
 throw Error('PKMSVV source changed: orb/fusion/mega bridge needs review');
const evolutionRows=evolutions.rules.filter(row=>row.from>=1&&row.from<=151&&
 row.to>=1&&row.to<=151&&row.trigger==='1'&&Number.isInteger(row.level))
 .map(row=>({from:row.from,to:row.to,level:row.level}));
if(!evolutionRows.length)throw Error('No Kanto evolution rules were read');
data.nativeAlpha={
 orbs, fusions, mega:{duration:+megaMatch[1],cooldown:+megaMatch[2],cdFactor:+megaMatch[3]},
 evolutions:evolutionRows,
 testOnly:true,
 // Native Alpha battle subset; do not represent this as the official full engine.
 trialRoster:[
  {dex:25,name:'Pikachu',sprite:'25.png'},
  {dex:4,name:'Charmander',sprite:'4.png'},
  {dex:1,name:'Bulbasaur',sprite:'1.png'},
  {dex:7,name:'Squirtle',sprite:'7.png'}
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
