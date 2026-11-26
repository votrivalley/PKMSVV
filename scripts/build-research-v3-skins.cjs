'use strict';
// Generate separate alpha-preserving prototype PNGs from pinned V3.1 station art.
// No catalog changes or payment. Copper is a test palette, not final approved art.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require('sharp');
const {verify}=require('./import-research-v3.cjs');
const {validate}=require('./validate-research-station-skins.cjs');
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const ramp=(v,a,b)=>clamp((v-a)/(b-a),0,1);
async function main(){
 const source=path.resolve(__dirname,'../assets/coop-lab/research-v3');
 const target=path.resolve(process.argv[2]||'dist/research-v3-skins');
 const files=await verify(source),m=JSON.parse(files['manifest.json']);
 fs.mkdirSync(target,{recursive:true});
 const catalog=require('../data/pkmsvv-coop-lab-catalog.json').stationSkins;
 const report=[];
 for(const item of catalog.defaults){
  const name=path.basename(item.spritePath);
  // Prior authored artwork is now the free Basic tier. Source filename is
  // historical; the game package uses the new Basic filename.
  fs.copyFileSync(path.join(source,'skins',item.station+'-royal.png'),path.join(target,name));
  report.push({id:item.id,file:name,tier:'basic'});
 }
 for(const item of catalog.variants){
  assert.equal(item.variant,'advanced');
  const l=m.layers.find(x=>x.id===item.station);
  assert.ok(l&&files[l.file],'Missing pinned specialized art');
  const name=path.basename(item.spritePath);
  fs.writeFileSync(path.join(target,name),files[l.file]);
  report.push({id:item.id,file:name,tier:'advanced'});
 }
 // The old decorative chest is baked into the pinned backdrop outside
 // the companion sprite. Create a local, reversible underlay for Basic
 // companion only. Exact crop from the existing teal floor, feathered 8 px.
 const patch={x:925,y:670,w:146,h:102,sourceX:181,sourceY:666,file:'companion-basic-floor.png'};
 const {data:floor,info:floorInfo}=await sharp(files['backdrop.png']).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(floorInfo.width,1500);assert.equal(floorInfo.height,1049);assert.equal(floorInfo.channels,4);
 const pixels=Buffer.alloc(patch.w*patch.h*4);
 for(let y=0;y<patch.h;y++)for(let x=0;x<patch.w;x++){
  const dest=(y*patch.w+x)*4,source=((patch.sourceY+y)*1500+patch.sourceX+x)*4;
  const edge=Math.min(x,patch.w-1-x,y,patch.h-1-y),alpha=Math.round(255*Math.min(1,edge/8));
  floor.copy(pixels,dest,source,source+3);pixels[dest+3]=alpha;
 }
 await sharp(pixels,{raw:{width:patch.w,height:patch.h,channels:4}}).png().toFile(path.join(target,patch.file));
 const decodedPatch=await sharp(path.join(target,patch.file)).ensureAlpha().raw().toBuffer();
 assert.deepEqual(decodedPatch,pixels,'Unexpected underlay encoding change');
 assert.equal(decodedPatch[3],0);assert.equal(decodedPatch[(51*patch.w+73)*4+3],255);
 const validation=await validate(target);
 fs.writeFileSync(path.join(target,'preview-report.json'),JSON.stringify({status:'PASS',purchaseEnabled:validation.purchaseEnabled,variants:report,validation,basicCompanionUnderlay:patch},null,2));
 console.log('V3 Basic and Specialized independent station PNGs PASS');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
