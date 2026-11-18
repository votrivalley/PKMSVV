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
async function main(){
 const bytes=fs.readFileSync(input);
 const digest=crypto.createHash('sha256').update(bytes).digest('hex');
 if(digest!==EXPECTED)throw Error('Approved concept PNG changed: '+digest);
 const meta=await sharp(bytes).metadata();
 if(meta.width!==384||meta.height!==192||!meta.hasAlpha)
  throw Error('Approved sprites must be transparent 384x192 PNG');
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'approved-fossil-source-atlas.png'),bytes);
 const manifest={source:'user-supplied approved concept image 2026-11-18',sha256:EXPECTED,
  kind:'genuine-source-extracted-pixels',spriteCell:[96,96],grid:[4,2],
  machineOff:[0,0],machineOn:[1,0],mossFossilWall:[2,0],boneDigSite:[3,0],
  amberDeposit:[0,1],rotomSosPortrait:[1,1,48,48],rotomRescueBeacon:[2,1,48,48],
  fallbackSVG:false,production:false};
 fs.writeFileSync(path.join(out,'source-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('APPROVED_FOSSIL_SOURCE_PNG_READY',meta.width,meta.height,digest);
 return manifest;
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={main,EXPECTED};
