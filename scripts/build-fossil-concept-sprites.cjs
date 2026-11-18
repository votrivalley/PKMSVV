'use strict';
/* Assemble in-game assets from the PRE-APPROVED research painting, not a new concept.
 * Extract the exact original restoration chamber. The three site SVG artworks
 * are rasterized as native-scale pixels rather than drawn with browser scaling.
 * Beta QA only; never mutate production assets, profile data or gameplay rules.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('sharp');
const {pieces,maskFor,canvas}=require('./extract-research-layers.cjs');
const root=path.resolve(__dirname,'..');
const sourceFile=path.join(root,'assets/coop-lab/room_art_qa_v2.webp');
const excavationFile=path.join(root,'assets/coop-lab/fossil-excavation-atlas.svg');
const output=path.resolve(process.argv[2]||path.join(root,'dist/fossil-concept-sprites'));
const expected='2b3e5295ae0a291dfc21fa6741eebf72d69ba05c1614f128545b1e750a1b6b44';
async function main(){
 const original=fs.readFileSync(sourceFile);
 if(crypto.createHash('sha256').update(original).digest('hex')!==expected)
  throw Error('Research concept image changed: refusing to use the wrong artwork');
 const metadata=await sharp(original).metadata();
 if(metadata.width!==canvas.width||metadata.height!==canvas.height)
  throw Error('Approved concept coordinates no longer match source');
 const chamber=pieces.find(p=>p.id==='restoration_chamber');
 if(!chamber)throw Error('Original machine mask missing');
 const [left,top,width,height]=chamber.rect;
 const exactCutout=await sharp(original).extract({left,top,width,height})
  .ensureAlpha().composite([{input:maskFor(chamber),blend:'dest-in'}])
  .png().toBuffer();
 async function cell(active){
  const input=active?await sharp(exactCutout)
   .modulate({brightness:1.08,saturation:1.07}).png().toBuffer():exactCutout;
  const scaled=await sharp(input).resize(120,120,{fit:'contain',
   background:{r:0,g:0,b:0,alpha:0},kernel:sharp.kernel.nearest})
   .png().toBuffer();
  return sharp({create:{width:128,height:128,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
   .composite([{input:scaled,left:4,top:4}]).png().toBuffer();
 }
 const off=await cell(false),on=await cell(true);
 const machines=await sharp({create:{width:256,height:128,channels:4,
  background:{r:0,g:0,b:0,alpha:0}}})
  .composite([{input:off,left:0,top:0},{input:on,left:128,top:0}])
  .png({compressionLevel:9}).toBuffer();
 // Preserve the previously chosen three dig-site forms, plus 3 real hit
 // states each. Bake to their final 96px cell size so there is no fractional
 // SVG resampling on each gameplay frame.
 const sites=await sharp(fs.readFileSync(excavationFile),{density:96})
  .resize(288,288,{kernel:sharp.kernel.nearest})
  .png({compressionLevel:9}).toBuffer();
 fs.mkdirSync(output,{recursive:true});
 fs.writeFileSync(path.join(output,'rotom-restorer-concept-atlas.png'),machines);
 fs.writeFileSync(path.join(output,'fossil-excavation-concept-atlas.png'),sites);
 const manifest={
  approvedImage:'assets/coop-lab/room_art_qa_v2.webp',approvedSHA256:expected,
  method:'actual chamber crop + alpha polygon + native nearest-neighbor pixels',
  machine:{asset:'rotom-restorer-concept-atlas.png',cell:[128,128],states:2},
  sites:{asset:'fossil-excavation-concept-atlas.png',cell:[96,96],
   names:['mossy-ammonite','ancient-bone-ruins','amber'],
   states:['intact','damaged','exhausted']},
  newConcept:false,betaQAOnly:true
 };
 fs.writeFileSync(path.join(output,'source-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 const machineSize=await sharp(machines).metadata(),sitesSize=await sharp(sites).metadata();
 if(machineSize.width!==256||machineSize.height!==128||
    sitesSize.width!==288||sitesSize.height!==288)
  throw Error('Sprite atlas dimensions changed');
 console.log('ORIGINAL_CONCEPT_FOSSIL_SPRITES_READY',output);
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={main};
