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
 const report=[];
 for(const l of m.layers.filter(l=>l.id!=='crest')){
  const {data,info}=await sharp(files[l.file]).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.channels,4);
  const pixels=Buffer.from(data);let changed=0;
  for(let i=0;i<pixels.length;i+=4){
   const r=data[i],g=data[i+1],b=data[i+2];if(!data[i+3])continue;
   // Soft material tint; maintain local shading, highlights and alpha.
   const w=ramp(r-b,12,80)*ramp(r-g,0,25)*ramp(g-b,0,24)*ramp(r,45,120)*(1-ramp(r-g,75,145));
   pixels[i]=clamp(Math.round(r+12*w),0,255);
   pixels[i+1]=clamp(Math.round(g-28*w),0,255);
   pixels[i+2]=clamp(Math.round(b+9*w),0,255);
   if(pixels[i]!==r||pixels[i+1]!==g||pixels[i+2]!==b)changed++;
  }
  const name=l.id+'-copper.png',out=path.join(target,name);
  await sharp(pixels,{raw:{width:l.w,height:l.h,channels:4}}).png().toFile(out);
  const decoded=await sharp(out).ensureAlpha().raw().toBuffer();
  for(let i=3;i<data.length;i+=4)assert.equal(decoded[i],data[i],'Alpha changed '+l.id);
  assert.ok(changed>500,'Invisible prototype '+l.id);
  report.push({id:l.id,file:name,width:l.w,height:l.h,changed,alphaPreserved:true});
 }
 // Authored skins, when approved or previewed, are distinct PNG files in
 // assets/coop-lab/research-v3/skins. Never overwrite the generated prototypes.
 const catalog=require('../data/pkmsvv-coop-lab-catalog.json').stationSkins;
 for(const item of catalog.variants.filter(x=>x.variant!=='copper')){
  const name=path.basename(item.spritePath);
  assert.match(name,/^[a-z0-9_-]+\.png$/);
  assert.ok(!report.some(x=>x.file===name),'Authored skin conflicts with prototype');
  fs.copyFileSync(path.join(source,'skins',name),path.join(target,name));
 }
 const validation=await validate(target);
 fs.writeFileSync(path.join(target,'preview-report.json'),JSON.stringify({status:'PASS',purchaseEnabled:validation.purchaseEnabled,variants:report,validation},null,2));
 console.log('V3 five independent prototype skin PNGs PASS');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
