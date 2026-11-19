'use strict';
/* Immutable real PNG cut from the user-approved Pokémon Chuyển Sinh concept.
 * No more fake SVG rock sites or a machine from an unrelated room painting.
 * QA-only, no production modification.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const input=path.join(root,'assets/coop-lab/approved-fossil-source-atlas.png');
const out=path.resolve(process.argv[2]||path.join(root,'dist/fossil-concept-sprites'));
const EXPECTED='3f26919b9ef09aafd1ca5a75eacfed5e5552bbe660c9218be34f3615a483019d';
const V3_EXPECTED='50cd2aa757d1e15b19d5015f74f4290a2e106ae95c95bdef93a81a2002569286';
const v3Source=path.join(root,'assets/coop-lab/approved-fossil-v3-atlas.png');
const MACHINE_EXPECTED='c776587550e8d3774833208cc813046a21fdb68dccceb5254e2f70884464da6c';
const machineSource=path.join(root,'assets/coop-lab/approved-fossil-machine-full-v4.png');
async function main(){
 const bytes=fs.readFileSync(input);
 const digest=crypto.createHash('sha256').update(bytes).digest('hex');
 if(digest!==EXPECTED)throw Error('Approved concept PNG changed: '+digest);
 const meta=await sharp(bytes).metadata();
 if(meta.width!==384||meta.height!==192||!meta.hasAlpha)
  throw Error('Approved sprites must be transparent 384x192 PNG');
 // Fail before packaging any wrong (or previously clipped) artwork.
 const v3Bytes=fs.readFileSync(v3Source);
 const v3Hash=crypto.createHash('sha256').update(v3Bytes).digest('hex');
 if(v3Hash!==V3_EXPECTED)throw Error('Approved V3 sprite content changed: '+v3Hash);
 const v3Meta=await sharp(v3Bytes).metadata();
 if(v3Meta.width!==464||v3Meta.height!==144||!v3Meta.hasAlpha)
  throw Error('V3 atlas must be 464x144 with transparent alpha');
 // Verify genuine transparent padding on all three V3 source cells.
 for(const [left,width,label] of [[0,176,'amber'],[176,144,'sos'],[320,144,'beacon']]){
  const {data,info}=await sharp(v3Bytes).extract({left,top:0,width,height:144})
   .ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let minX=width,minY=144,maxX=-1,maxY=-1;
  for(let y=0;y<144;y++)for(let x=0;x<width;x++){
   if(data[(y*width+x)*info.channels+3]>0){
    minX=Math.min(minX,x);minY=Math.min(minY,y);
    maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
   }
  }
  if(minX<12||minY<12||maxX>width-13||maxY>131)
   throw Error('V3 '+label+' clipped or missing safe margins');
 }
 const machineBytes=fs.readFileSync(machineSource);
 const machineHash=crypto.createHash('sha256').update(machineBytes).digest('hex');
 if(machineHash!==MACHINE_EXPECTED)throw Error('Full machine PNG content changed '+machineHash);
 const mm=await sharp(machineBytes).metadata();
 if(mm.width!==256||mm.height!==128||!mm.hasAlpha)
  throw Error('Complete machine atlas must be RGBA 256x128');
 const {data:rgba,info}=await sharp(machineBytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(const [left,label] of [[0,'OFF'],[128,'ON']]){
  let minX=128,minY=128,maxX=-1,maxY=-1;
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
   if(!rgba[(y*256+x+left)*info.channels+3])continue;
   minX=Math.min(minX,x);minY=Math.min(minY,y);
   maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
  }
  if(minX<6||minY<6||maxX>121||maxY>120)
   throw Error('Full machine '+label+' touches its cell: '+[minX,minY,maxX,maxY]);
 }
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'approved-fossil-machine-full-v4.png'),machineBytes);
 fs.writeFileSync(path.join(out,'approved-fossil-source-atlas.png'),bytes);
 fs.writeFileSync(path.join(out,'approved-fossil-v3-atlas.png'),v3Bytes);
 const manifest={source:'user-supplied approved concept image 2026-11-18',sha256:EXPECTED,
  kind:'genuine-source-extracted-pixels',spriteCell:[96,96],grid:[4,2],
  machineOff:[0,0],machineOn:[1,0],mossFossilWall:[2,0],boneDigSite:[3,0],
  amberDeposit:[0,1],rotomSosPortrait:[1,1,48,48],rotomRescueBeacon:[2,1,48,48],
  fallbackSVG:false,production:false,
  approvedV3:{sha256:V3_EXPECTED,atlas:'approved-fossil-v3-atlas.png',size:[464,144],
   amber:[0,0,176,144],sos:[176,0,144,144],rescueMarker:[320,0,144,144],
   normalRotomFollowDex:479},
  approvedMachine:{sha256:MACHINE_EXPECTED,atlas:'approved-fossil-machine-full-v4.png',
   size:[256,128],off:[0,0,128,128],on:[128,0,128,128]}};
 fs.writeFileSync(path.join(out,'source-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('APPROVED_FOSSIL_SOURCE_PNG_READY',meta.width,meta.height,digest);
 return manifest;
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={main,EXPECTED};
