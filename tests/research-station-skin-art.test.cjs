'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('sharp');
const {validate}=require('../scripts/validate-research-station-skins.cjs');
const l=require('../assets/coop-lab/research-v3/manifest.json').layers.find(x=>x.id==='mega');
const fixture={purchaseEnabled:false,variants:[{id:'mega_royal',station:'mega',variant:'royal',price:null,artApproved:false,spritePath:'images/coop-lab/research-v3/skins/mega-royal.png'}]};
test('validate new authored sprites and refuse bad art or unapproved prices',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lab-art-'));
 try{
  const f=path.join(dir,'mega-royal.png');
  await assert.rejects(validate(dir,fixture),/ENOENT/);
  const data=Buffer.alloc(l.w*l.h*4);
  for(let i=0;i<data.length;i+=4){data[i]=200;data[i+1]=150;data[i+2]=60;if(i<data.length*.7)data[i+3]=255;}
  await sharp(data,{raw:{width:l.w,height:l.h,channels:4}}).png().toFile(f);
  assert.equal((await validate(dir,fixture)).status,'PASS');
  const item=fixture.variants[0];
  await assert.rejects(validate(dir,{...fixture,variants:[{...item,price:100}]}),/Preview-only/);
  await assert.rejects(validate(dir,{...fixture,variants:[{...item,artApproved:true,price:100}]}),/fingerprint/);
  const approved={...item,artApproved:true,price:100,sha256:crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')};
  assert.equal((await validate(dir,{purchaseEnabled:true,variants:[approved]})).status,'PASS');
  await assert.rejects(validate(dir,{purchaseEnabled:true,variants:[{...approved,sha256:'0'.repeat(64)}]}),/bytes changed/);
  await assert.rejects(validate(dir,{...fixture,variants:[item,item]}),/Duplicate skin ID/);
  await sharp({create:{width:16,height:16,channels:4,background:'#00000000'}}).png().toFile(f);
  await assert.rejects(validate(dir,fixture),/Expected values/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
