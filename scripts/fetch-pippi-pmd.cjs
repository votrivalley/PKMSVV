'use strict';
/* Pin official PMDCollab Clefairy #035 sprites by immutable commit AND
 * Git blob hash. Non-commercial fangame use requires attribution.
 * Provenance: CHUNSOFT (credited in SpriteCollab/sprite/0035/credits.txt).
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const https=require('node:https');
const root=path.resolve(__dirname,'..'),outDir=path.join(root,'assets','pippi-pmd');
const PIN='aab3eb6c7167b247a45f5c12c85515341d0c9895';
const ASSETS=Object.freeze({
 'Walk-Anim.png':'7d846d163eb4bf62a817abc83bea57e6f300729f',
 'Idle-Anim.png':'6188bdf3ad62f430981ace4e1e3d3bfddad17a2f',
 'Sleep-Anim.png':'638f62b383454f513b1f88125d9edf070d9f26c7'
});
function blobSha(bytes){
 const hdr=Buffer.from('blob '+bytes.length+'\0');
 return crypto.createHash('sha1').update(hdr).update(bytes).digest('hex');
}
function fetchBytes(url,redirects=4){
 return new Promise((resolve,reject)=>{
  if(redirects<0)return reject(new Error('Too many sprite redirects'));
  const req=https.get(url,{headers:{'User-Agent':'PKMSVV-Pippi-Asset-Pin/1.0'}},resp=>{
   if([301,302,303,307,308].includes(resp.statusCode)){
    const target=new URL(resp.headers.location,url);
    if(target.protocol!=='https:')return reject(new Error('Non-HTTPS sprite redirect'));
    resp.resume();return fetchBytes(target.toString(),redirects-1).then(resolve,reject);
   }
   if(resp.statusCode!==200){resp.resume();return reject(new Error('Sprite HTTP '+resp.statusCode));}
   const chunks=[];let length=0;
   resp.on('data',chunk=>{length+=chunk.length;if(length>400000){req.destroy(new Error('Oversized sprite'));return;}chunks.push(chunk);});
   resp.on('end',()=>resolve(Buffer.concat(chunks)));
   resp.on('error',reject);
  });req.on('error',reject);
 });
}
async function main(){
 fs.mkdirSync(outDir,{recursive:true});
 for(const [name,sha] of Object.entries(ASSETS)){
  const dest=path.join(outDir,name);
  const have=fs.existsSync(dest)?fs.readFileSync(dest):null;
  const bytes=have&&blobSha(have)===sha?have:await fetchBytes(
    'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/'+PIN+'/sprite/0035/'+name);
  if(blobSha(bytes)!==sha)throw Error('PMD asset content mismatched immutable Git blob: '+name);
  if(bytes.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error('Not a PNG: '+name);
  fs.writeFileSync(dest,bytes);
  console.log('Verified pinned Clefairy sprite:',name,bytes.length,sha);
 }
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={PIN,ASSETS,blobSha};
