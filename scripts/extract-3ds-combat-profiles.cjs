'use strict';
/* Audit only: generated 3DS v1.0.0 skill profiles, not the minified Web app. */
const fs=require('node:fs');
const src=fs.readFileSync(process.argv[2]||'vendor/3ds-source/src/gen/gamedata.cpp','utf8');
const TYPES=['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const STAT=['cd','dmg','speed','count','spread','pierce','life','size','radius','arc','width','knock','burn','poison','slow','homing','amount','dur','stacks','rate','range','hex','drain','pull','bounce','stun','charge','zap','shred','noItem','puddle','pr','splash','boost','critUp','minCd','cost','wx','shield'];
const {readNative}=require('./audit-3ds-native-moves.cjs');
const {kinds,moves}=readNative(src);
const lookup=new Map(moves.map(m=>[m.id,m]));
const requested=['fire-punch','ice-punch','thunder-punch','drain-punch','plasma-fists','fire-blast','seed-flare','thunder','judgment','protect','reflect','light-screen','rest','double-team','x-scissor','stone-axe','extreme-speed','acrobatics','shadow-force','explosion','sunny-day','rain-dance','sandstorm',
  // Stage6: all nine native projectile IDs, extracted before actual gameplay port.
  'dragon-pulse','sludge-bomb','scald','hurricane','water-pulse',
  'stone-edge','pyro-ball','snipe-shot','spirit-shackle',
  // Stage7 source-verified Dash and Meteor candidate IDs.
  'megahorn','dragon-ascent','volt-tackle','meteor-assault','sunsteel-strike',
  'sacred-fire','diamond-storm','doom-desire','glacial-lance','thousand-arrows',
  // Stage 8: native Beam / Nova / Charge source profiles and original rank ladders.
  'blue-flare','aeroblast','moongeist-beam',
  'lava-plume','psystrike','origin-pulse','sparkling-aria',
  'roar-of-time','photon-geyser','dynamax-cannon',
  // Stage 9 native source audit for the final 19 missing 3DS IDs.
  'moonblast','attack-order','flower-trick',
  'blizzard','silver-wind','crunch','behemoth-blade',
  'relic-song','clanging-scales','mortal-spin','darkest-lariat',
  'waterfall','dark-void','glaciate','secret-sword','psyshock',
  'geomancy','malignant-chain','precipice-blades'];
const start=src.indexOf('MoveDef kMoves[] = {'),end=src.indexOf('\n};',start);
const lines=src.slice(start+20,end).split('\n');
const found=[];
for(const id of requested){
 const m=lookup.get(id);
 if(!m)throw Error('Missing generated 3DS skill ID: '+id);
 const line=lines.find(x=>x.includes('{"'+id+'",'));
 if(!line)throw Error('Missing MoveDef row '+id);
 const p=line.match(/^\s*\{"([^"]+)",\s*"([^"]*)",\s*"([^"]*)",\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*0x([0-9a-f]+)ull,\s*\{([^}]*)\}/i);
 if(!p)throw Error('Unsupported native MoveDef syntax '+id+' '+line.slice(0,170));
 const values=p[9].split(',').map(s=>Number(s.replace(/f$/,'')));
 if(values.length!==STAT.length)throw Error('Unexpected move stat count: '+id+' '+values.length+' vs '+STAT.length);
 const bits=BigInt('0x'+p[8]);
 const stats=Object.fromEntries(STAT.filter((k,i)=>!!(bits&(1n<<BigInt(i)))).map(k=>[k,values[STAT.indexOf(k)]]));
 const tail=line.match(/\{(-?\d+),\s*(-?\d+),\s*(-?\d+)\}\s*\},?\s*$/);
 if(!tail)throw Error('Missing native exclusive list: '+id+' tail='+line.slice(-100));
 found.push({id,name:p[2],desc:p[3],type:TYPES[Number(p[4])],kind:kinds[Number(p[5])],buff:Number(p[6]),cat:Number(p[7]),...stats,only:tail.slice(1).map(Number).filter(Boolean)});
}
const ladderStart=src.indexOf('Ladder kLadder[K_COUNT][4] = {');
const ladderEnd=src.indexOf('\n};',ladderStart);
if(ladderStart<0||ladderEnd<0)throw Error('Generated 3DS ladders missing');
const ladderLines=src.slice(ladderStart+'Ladder kLadder[K_COUNT][4] = {'.length,ladderEnd)
 .split('\n').filter(x=>x.trim());
if(ladderLines.length!==kinds.length)throw Error('Ladder kinds mismatch: '+ladderLines.length+'/'+kinds.length);
console.log('PKMSVV_3DS_NATIVE_LADDERS');
for(const kind of ['projectile','dash','meteor','beam','nova','charge','punch','cross','storm','guard','screen','rest','decoy','scissor','blitz','leap','boom','weather',
 'homing','cone','melee','shove','spin','stun','tremor','boomerang','bounce','buff','chain','quake']) {
 const i=kinds.indexOf(kind);if(i<0)throw Error('Missing kind '+kind);
 console.log(kind+': '+ladderLines[i].slice(0,1800));
}
const o='dist/3ds-skill-audit/next-combat-profiles.json';
fs.mkdirSync('dist/3ds-skill-audit',{recursive:true});fs.writeFileSync(o,JSON.stringify(found,null,2));
console.log('PKMSVV_3DS_SOURCE_PROFILES_PASS');
console.log(JSON.stringify(found));
