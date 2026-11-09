'use strict';
/* Replace the embedded Kecleon Shop and Bag modules in an isolated staged
 * Web 2.0 bundle. No duplicate IIFEs, player-save edits or APK changes. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function endOf(code,start,label){
 const boundary=/\}\)\(\)/g;boundary.lastIndex=start+3;
 let m,checks=0;
 while((m=boundary.exec(code))){
  const end=m.index+m[0].length;
  if(++checks>30000||end-start>500000)break;
  try{new vm.Script(code.slice(start,end)+';',{filename:label});return end;}
  catch(_){}
 }
 throw Error('Could not isolate one compiled '+label+' module');
}
function installModule(bundle,label,source){
 const assignment='G.'+label+'=',old=bundle.indexOf(assignment),fresh=source.indexOf(assignment);
 if(old<0||fresh<0||bundle.indexOf(assignment,old+assignment.length)!==-1)
  throw Error('Expected one '+label+' assignment in compiled game');
 const oldEnd=endOf(bundle,old,'old-'+label),newEnd=endOf(source,fresh,'new-'+label);
 return bundle.slice(0,old)+source.slice(fresh,newEnd)+bundle.slice(oldEnd);
}
function patchItemsBundle(bundle,sources){
 let next=bundle;
 for(const [label,sourcePath] of [
  ['Shop','src/kecleon/upstream/data/shop.js'],
  ['KecleonUI','src/kecleon/pkmsvv-kecleon-ui.js']]){
  const source=sources?.[label]??fs.readFileSync(path.join(root,sourcePath),'utf8');
  next=installModule(next,label,source);
 }
 if(!next.includes("const ORDER = ['mint', 'cap', 'caph']"))
  throw Error('Event Hidden Capsule missing from Bag');
 if(!next.includes('G.PKMSVVBoxHub?.rollAbilitySlot'))
  throw Error('Weighted Hidden reroll missing from Bag');
 new vm.Script(next,{filename:'web-2.0-reroll-v28.js'});
 return next;
}
function patchFile(filename){
 const dest=path.resolve(filename),relative=path.relative(root,dest).replace(/\\/g,'/');
 if(!['dist/cloudflare-v20-release/game/js/app.min.js',
      'dist/cloudflare-v20-release/ai/game/js/app.min.js'].includes(relative))
  throw Error('Refusing non-Web staging bundle '+relative);
 const next=patchItemsBundle(fs.readFileSync(dest,'utf8'));
 fs.writeFileSync(dest,next,'utf8');
 console.log('PKMSVV_ITEMS_V28_COMPILED',relative,next.length);
}
if(require.main===module){
 if(process.argv.length<3)throw Error('Provide Web 2.0 staging bundle');
 for(const file of process.argv.slice(2))patchFile(file);
}
module.exports={installModule,patchItemsBundle,patchFile};
