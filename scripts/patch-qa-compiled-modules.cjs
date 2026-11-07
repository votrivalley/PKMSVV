'use strict';
/* Fail-closed QA-only replacement of four stale compiled v1.5.93 modules.
 * Never operate on a production build, versioned baseline, or player saves.
 * The minified bundle already embeds these modules: adding standalone scripts
 * at the end would DOUBLE-INSTALL them, so replace the original assignment
 * expression in-place and verify the entire resulting bundle compiles.
 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const mods=[
 ['PKMSVVBerry','src/pkmsvv-berry.js'],
 ['PKMSVVArenaSolo','src/pkmsvv-arena-solo.js'],
 ['PKMSVVChampionArena','src/pkmsvv-champion-arena.js'],
 ['PKMSVVArenaPvp','src/lan/arena-pvp.js']
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
 const source=fs.readFileSync(path.join(root,filename),'utf8');
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
 new vm.Script(next,{filename:'patched-qa-app.min.js'});
 fs.writeFileSync(filename,next,'utf8');
 const stat=fs.statSync(filename);
 console.log('Replaced stale embedded Berry/Arena modules in ISOLATED QA bundle:',filename,stat.size,'bytes');
}
