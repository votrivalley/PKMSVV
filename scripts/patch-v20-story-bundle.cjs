'use strict';
/* Fail-closed replacement of exactly one compiled Story module. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),assignment='G.PKMSVVStory=';
function findEnd(code,start,label){
 const re=/\}\)\(\)/g;re.lastIndex=start+assignment.length;
 let match,count=0;
 while((match=re.exec(code))){
  if(++count>30000||match.index-start>600000)break;
  const end=match.index+match[0].length;
  try{new vm.Script(code.slice(start,end)+';',{filename:label});return end;}catch(_){}
 }
 throw Error('Unsafe Story assignment boundary '+label);
}
function patchStoryBundle(bundle,source){
 if(typeof bundle!=='string'||typeof source!=='string')throw Error('Missing Story source');
 const a=bundle.indexOf(assignment),b=source.indexOf(assignment);
 if(a<0||b<0||bundle.indexOf(assignment,a+1)!==-1)
  throw Error('Expected precisely one compiled Story assignment');
 const end=findEnd(bundle,a,'old-story'),srcEnd=findEnd(source,b,'new-story');
 const next=bundle.slice(0,a)+source.slice(b,srcEnd)+bundle.slice(end);
 if(!next.includes('Fusion là dung hợp hai kỹ năng đã luyện MAX'))
  throw Error('Fusion source not installed');
 new vm.Script(next,{filename:'pkmsvv-story-v23.js'});
 return next;
}
function patchFile(filename){
 const dest=path.resolve(filename),rel=path.relative(root,dest).replace(/\\/g,'/');
 if(!['dist/cloudflare-v20-release/','dist/pokebox-stage4-qa/','decoded-android/']
   .some(prefix=>rel.startsWith(prefix))||!rel.endsWith('/js/app.min.js'))
  throw Error('Unsafe Story bundle output '+rel);
 const old=fs.readFileSync(dest,'utf8');
 const next=patchStoryBundle(old,fs.readFileSync(path.join(root,'src/pkmsvv-story.js'),'utf8'));
 fs.writeFileSync(dest,next,'utf8');
 console.log('PKMSVV_STORY_V23_COMPILED',rel,next.length);
 return next.length;
}
if(require.main===module){
 if(process.argv.length<3)throw Error('Provide validated Story bundle path');
 for(const file of process.argv.slice(2))patchFile(file);
}
module.exports={patchStoryBundle,patchFile};
