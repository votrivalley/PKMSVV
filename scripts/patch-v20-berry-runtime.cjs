'use strict';
/* Replaces the actual compiled Berry Rescue and LAN AI IIFEs in staged Web 2.0.
 * The pinned QA game contains older copies inside app.min.js. Appending
 * standalone modules would double-initialize network/game loops.
 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const MODULES=[
 ['PKMSVVBerryRescue','src/pkmsvv-berry-rescue.js'],
 ['LanAI','src/lan/lan-ai.js']
];
function moduleEnd(code,start,label){
 const marker=/\}\)\(\)/g;marker.lastIndex=start;
 let m,tries=0;
 while((m=marker.exec(code))){
  const end=m.index+m[0].length;
  if(++tries>20000||end-start>300000)break;
  try{new vm.Script(code.slice(start,end)+';',{filename:label});return end;}
  catch(_){}
 }
 throw Error('Cannot safely isolate '+label+' IIFE');
}
function replaceModule(bundle,label,source){
 const assignment='G.'+label+'=';
 const at=bundle.indexOf(assignment);
 if(at<0||bundle.indexOf(assignment,at+assignment.length)>=0)
  throw Error('Exactly one native '+label+' module is required');
 const end=moduleEnd(bundle,at,'old-'+label);
 const fresh=source.indexOf(assignment);
 if(fresh<0||source.indexOf(assignment,fresh+assignment.length)>=0)
  throw Error('Exactly one reviewed '+label+' source is required');
 const sourceEnd=moduleEnd(source,fresh,'new-'+label);
 return bundle.slice(0,at)+source.slice(fresh,sourceEnd)+bundle.slice(end);
}
function patchBundle(bundle){
 let next=bundle;
 const hasLanAI=bundle.includes('G.LanAI=');
 for(const [name,src] of MODULES){
  // Standalone Cloudflare Web is a remote LAN CLIENT; its immutable game
  // bundle legitimately has no Host LanAI module. Desktop/Android Host
  // bundles DO carry it, and replaceModule remains fail-closed there.
  if(name==='LanAI'&&!hasLanAI)continue;
  next=replaceModule(next,name,fs.readFileSync(path.join(root,src),'utf8'));
 }
 if((hasLanAI&&!next.includes('function chooseBerryAxis('))||
    !next.includes('function rewardBerry(')||
    !next.includes('Math.round((h-95)/2)'))
  throw Error('Berry fix absent after compiled module replacement');
 new vm.Script(next,{filename:'berry-v2-compiled.js'});
 return next;
}
function patchFile(file){
 const filename=path.resolve(file),rel=path.relative(root,filename).replace(/\\/g,'/');
 if(!['dist/cloudflare-v20-release/game/js/app.min.js',
  'dist/cloudflare-v20-release/ai/game/js/app.min.js'].includes(rel))
  throw Error('Berry Web patch only permits staged Cloudflare 2.0 files: '+rel);
 const before=fs.readFileSync(filename,'utf8'),after=patchBundle(before);
 fs.writeFileSync(filename,after,'utf8');
 console.log('PKMSVV_BERRY_AI_COMPILED',rel,after.length);
}
if(require.main===module){
 if(process.argv.length<3)throw Error('Pass at least one staged Web file');
 for(const file of process.argv.slice(2))patchFile(file);
}
module.exports={patchBundle,replaceModule,patchFile};
