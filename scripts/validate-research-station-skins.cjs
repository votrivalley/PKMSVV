'use strict';
// Validation gate for actual authored station skins. Prototype PNGs remain preview-only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const catalog=require('../data/pkmsvv-coop-lab-catalog.json').stationSkins;
const manifest=require('../assets/coop-lab/research-v3/manifest.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function validate(dir,registry=catalog){
 const seen=new Set(),files=new Set(),report=[];
 const stations=new Map(manifest.layers.filter(l=>l.id!=='crest').map(l=>[l.id,l]));
 const defaults=registry.defaults||[];
 if(defaults.length){
  assert.equal(defaults.length,stations.size,'Every station needs one free Basic sprite');
  assert.equal(new Set(defaults.map(x=>x.station)).size,stations.size);
 }
 for(const item of [...defaults,...registry.variants]){
  const l=stations.get(item.station);
  assert.ok(l,'Unknown skin station '+item.id);
  assert.match(item.id,/^[a-z0-9_]+$/);assert.ok(!seen.has(item.id),'Duplicate skin ID');seen.add(item.id);
  assert.match(item.spritePath,/^images\/coop-lab\/research-v3\/skins\/[a-z0-9_-]+\.png$/);
  const name=path.basename(item.spritePath);assert.ok(!files.has(name),'Duplicate skin file');files.add(name);
  const data=fs.readFileSync(path.join(dir,name)),info=await sharp(data).metadata();
  assert.equal(info.format,'png');assert.equal(info.width,l.w);assert.equal(info.height,l.h);assert.equal(info.hasAlpha,true);
  const pixels=await sharp(data).ensureAlpha().raw().toBuffer();
  let visible=0,transparent=0;
  for(let i=3;i<pixels.length;i+=4){if(pixels[i]>0)visible++;else transparent++;}
  assert.ok(visible>l.w*l.h*.1&&transparent>l.w*l.h*.005,'Blank or flattened skin '+item.id);
  if(item.sha256!==undefined){assert.match(item.sha256,/^[a-f0-9]{64}$/,'Invalid skin fingerprint');assert.equal(sha(data),item.sha256,'Approved skin bytes changed');}
  if(item.artApproved===true){
   assert.ok(Number.isSafeInteger(item.price)&&item.price>0,'Approved item requires approved positive price');
   assert.match(item.sha256||'',/^[a-f0-9]{64}$/,'Approved item requires exact asset fingerprint');
   assert.equal(sha(data),item.sha256,'Approved skin bytes changed');
  }else{
   assert.equal(item.price,null,'Preview-only item cannot have a sale price');
  }
  report.push({id:item.id,file:name,width:l.w,height:l.h,sha256:sha(data),visiblePixels:visible,transparentPixels:transparent,approved:item.artApproved===true});
 }
 return {status:'PASS',purchaseEnabled:registry.purchaseEnabled===true,variants:report};
}
if(require.main===module)validate(path.resolve(process.argv[2]||path.join(root,'dist/research-v3-skins'))).then(report=>{
 console.log(JSON.stringify(report,null,2));
}).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={validate};
