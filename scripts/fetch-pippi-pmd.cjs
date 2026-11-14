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
const PORTRAITS=Object.freeze({
 'Normal.png':'694b0976b7eafed607ff746d99383af16056eed9',
 'Happy.png':'509ed42f3ce594f6e05c1cc42f5d866d36701164',
 'Joyous.png':'eb4be3554ca2a8f62e230c77a6e1b0069fa30271',
 'Determined.png':'b73d509329a861541ff42a7f1321e9c9089282f4',
 'Angry.png':'ea7fb8918a0de6ecc34286aa99f5af0a27480abd',
 'Crying.png':'9ad5c5bbc2548cf304b61208284be58dc4e80edb',
 'Dizzy.png':'e4ffe4e897cee09dba39d36a4f8847c739f14249',
 'Inspired.png':'c1f520bdba88a580d2e93c2120a945964a08c4d5',
 'Pain.png':'19b1c73d0280a0d295c576b226b27a5eed059122',
 'Sad.png':'64085e9e63a8fa57075c292c4c524e150aeefd89',
 'Shouting.png':'d6589751e99d181c6170e016fa9ddec9971aa95f',
 'Sigh.png':'e86c09636c999fe8309e2792c372403154fe7f72',
 'Stunned.png':'bb51026f9548bb1b775f6cc5cb68f42b33f47ac8',
 'Surprised.png':'e7cf2575719769e48e385bcfdea66ee30875aa0a',
 'Teary-Eyed.png':'3f135fb1da8132b4cb2b8d2031577a0b884b812b',
 'Worried.png':'cd0a773a590a5b2d74d7bec74fcbbb54062413b2'
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
 const portraitsDir=path.join(outDir,'portrait');
 fs.mkdirSync(portraitsDir,{recursive:true});
 for(const [name,sha] of Object.entries(PORTRAITS)){
  const dest=path.join(portraitsDir,name);
  const have=fs.existsSync(dest)?fs.readFileSync(dest):null;
  const bytes=have&&blobSha(have)===sha?have:await fetchBytes(
   'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/'+PIN+'/portrait/0035/'+name);
  if(blobSha(bytes)!==sha)throw Error('PMD Clefairy portrait SHA mismatch: '+name);
  if(bytes.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error('Not a portrait PNG: '+name);
  fs.writeFileSync(dest,bytes);
  console.log('Verified Pippi portrait:',name);
 }
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={PIN,ASSETS,PORTRAITS,blobSha};
