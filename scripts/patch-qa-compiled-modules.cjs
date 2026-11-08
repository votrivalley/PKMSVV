'use strict';
/* Fail-closed QA-only replacement of six stale compiled v1.5.93 modules.
 * Never operate on a production build, versioned baseline, or player saves.
 * The minified bundle already embeds these modules: adding standalone scripts
 * at the end would DOUBLE-INSTALL them, so replace the original assignment
 * expression in-place and verify the entire resulting bundle compiles.
 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const mods=[
 ['Judgment','src/v14/judgment.js'],
 ['PKMSVV14','src/v14/milestones.js'],
 ['PKMSVVEggs','src/v15/eggs.js'],
 ['PKMSVVSupportCatalog','src/pkmsvv-support-catalog.js'],
 ['PKMSVVBossSupport','src/v15/boss-support.js'],
 ['EggRush','src/web/pkmsvv-egg-rush.js'],
 ['PKMSVVBerry','src/pkmsvv-berry.js'],
 ['PKMSVVArenaSolo','src/pkmsvv-arena-solo.js'],
 ['PKMSVVChampionArena','src/pkmsvv-champion-arena.js'],
 ['PKMSVVArenaPvp','src/lan/arena-pvp.js'],
 ['PKMSVVFusionPilot','src/pkmsvv-bond-fusion.js'],
 ['PKMSVVEvo','src/pkmsvv-evolution.js'],
 ['Royale','src/web/pkmsvv-royale.js']
];
const targets=process.argv.slice(2).map(p=>path.resolve(p));
if(!targets.length)throw Error('Pass one or more isolated QA app.min.js paths');
function targetAllowed(filename){
 const rel=path.relative(root,filename).replace(/\\/g,'/');
 const pathKey='/'+rel;
 const isQa=pathKey.includes('/pokebox-stage4-qa/')||
  pathKey.includes('/pokebox-stage4-pc-qa/')||
  pathKey.includes('/decoded-android/')||
  pathKey.includes('/pokebox-stage4-android-qa/');
 if(!isQa||!filename.endsWith('app.min.js'))
  throw Error('Refusing non-QA or non-bundle target: '+filename);
}
function replaceModule(bundle,label,filename){
 const assignment='G.'+label+'=';
 const index=bundle.indexOf(assignment);
 if(index<0||bundle.indexOf(assignment,index+assignment.length)>=0)
  throw Error('Expected exactly one compiled '+label+' assignment in baseline');
 // Terser compresses the original IIFE as G.Module=(()=>{...})().
 // Do not guess a length. Probe candidate IIFE end tokens and allow the JS
 // parser to reject truncated nested code; protect against string/comments.
 const boundary=/\}\)\(\)/g;boundary.lastIndex=index+assignment.length;
 let matched=-1,checks=0,m;
 while((m=boundary.exec(bundle))){
  const end=m.index+m[0].length;
  if(++checks>25000||end-index>300000)break;
  try{new vm.Script(bundle.slice(index,end)+';',{filename:'legacy-'+label});
   matched=end;break;
  }catch(_){}
 }
 if(matched<0)throw Error('Could not safely isolate compiled '+label+' module');
 // Replace ONLY the expression, never append a standalone statement.
 // Terser may combine assignments into one comma sequence. Also preserve the
 // embedded Berry .install() side-effect that follows this assignment.
 let source=fs.readFileSync(path.join(root,filename),'utf8');
 // The standard prepare-game build resolves this token before minification.
 // Isolated QA reuses a signed baseline, so supply its tested 1.15 factor.
 if(label==='PKMSVVEvo')source=source.replace('__PKMSVV_HP_FACTOR__','1.15').replace(/G\.PKMSVVEvo\s*=\s*/, 'G.PKMSVVEvo=');
 if(label==='Judgment')source=source.replace(/G\.Judgment\s*=\s*/, 'G.Judgment=');
 const sourceAt=source.indexOf(assignment);
 if(sourceAt<0)throw Error('Source module assignment missing: '+label);
 const srcBoundary=/\}\)\(\)/g;srcBoundary.lastIndex=sourceAt+assignment.length;
 let sourceEnd=-1,sm;
 while((sm=srcBoundary.exec(source))){
  const end=sm.index+sm[0].length;
  try{new vm.Script(source.slice(sourceAt,end)+';',{filename:'new-'+label});
   sourceEnd=end;break;
  }catch(_){}
 }
 if(sourceEnd<0)throw Error('New source is not a self-contained assignment: '+label);
 const replacement=source.slice(sourceAt,sourceEnd);
 return bundle.slice(0,index)+replacement+bundle.slice(matched);
}
for(const filename of targets){
 targetAllowed(filename);
 if(!fs.existsSync(filename))throw Error('Missing isolated QA compiled bundle '+filename);
 const original=fs.readFileSync(filename,'utf8');
 let next=original;
 for(const [label,src] of mods)next=replaceModule(next,label,src);
 // Diagnose exactly which compiled competitive clauses remain after the
 // safe module swaps; QA Web, PC and Android all run this single patcher.
 for(const phrase of ['G.PKMSVVArenaSolo?.active','G.Royale?.active||G.EggRush?.active',
  'G.Coop?.active&&(G.Royale?.active||G.EggRush?.active)']){
  console.log('QA_COMPETITIVE_NATIVE_SIGNATURE',phrase,next.split(phrase).length-1);
 }
 // This baseline embeds the original pickup IIFE with minified per-run Orb
 // counter "e". Patch BOTH verified exact native Orb rolls (and only those).
 // 45% -> 22.5% boss, 6% -> 3% normal. The 150s stagger prevents the
 // former 10-drop run cap being exhausted before a MAX+MAX Fusion mid-run.
 // Guaranteed starter Orb and the player's FIFO bag are untouched.
 // Both real bundle variants (game, ai/game) have different minifier
 // counter names. Match only the TWO native orb rolls, not other odds.
 const orbRoll=/([a-zA-Z_$][\w$]*)<10&&Math\.random\(\)<\.(45|06)/g;
 let patchedOrbRolls=0;
 next=next.replace(orbRoll,(source,counter,odds,offset)=>{
  if(!next.slice(offset,offset+210).includes('G.Orbs.roll()')||
   !next.slice(Math.max(0,offset-130),offset).includes('G.Orbs.ready(G.Game.player)'))
   return source;
  patchedOrbRolls++;
  const reduced='.02'; // unified 2% Orb chance from any eligible drop
  return counter+'<10&&Number(G.Game?.st?.time??0)>='+counter+
   '*150&&Math.random()<'+reduced;
 });
 if(patchedOrbRolls!==2)throw Error('Expected exact two original native Orb rolls, got '+patchedOrbRolls);
 new vm.Script(next,{filename:'patched-qa-app.min.js'});
 fs.writeFileSync(filename,next,'utf8');
 const stat=fs.statSync(filename);
 console.log('Replaced stale embedded Berry/Arena/Fusion modules in ISOLATED QA bundle:',filename,stat.size,'bytes');
}
