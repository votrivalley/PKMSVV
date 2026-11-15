'use strict';
/* Compose the 16 immutable PMDCollab Pippi portraits into ONE atlas at build
 * time. Runtime uses only one already-cached image, avoiding the Chromium
 * PNG churn that previously froze Mewtwo/Grieta during dialogue events. */
const fs=require('node:fs'),path=require('node:path');
const sharp=require('sharp');
const {PORTRAITS,blobSha}=require('./fetch-pippi-pmd.cjs');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'assets/pippi-pmd/portrait');
const tile=40,columns=4,names=Object.keys(PORTRAITS);
async function main(){
 if(names.length!==16)throw Error('Expected 16 pinned portraits');
 const parts=[];
 for(let i=0;i<names.length;i++){
  const name=names[i],bytes=fs.readFileSync(path.join(dir,name));
  if(blobSha(bytes)!==PORTRAITS[name])throw Error('Unverified Pippi portrait: '+name);
  const input=await sharp(bytes).resize(tile,tile,{fit:'contain',
   background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  parts.push({input,left:(i%columns)*tile,top:Math.floor(i/columns)*tile});
 }
 const out=path.join(dir,'atlas.png');
 await sharp({create:{width:tile*columns,height:tile*columns,channels:4,
  background:{r:0,g:0,b:0,alpha:0}}}).composite(parts).png().toFile(out);
 if(fs.statSync(out).size>200000)throw Error('Portrait atlas exceeds safe budget');
 console.log('Pippi one-texture portrait atlas',names.length,fs.statSync(out).size);
}
if(require.main===module)main().catch(err=>{console.error(err);process.exitCode=1;});
module.exports={main};
