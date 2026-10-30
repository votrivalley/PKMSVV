'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const sharp=require('sharp'),vm=require('node:vm');
const qa=require('../scripts/patch-mega-4dir-pc-qa.cjs');
const ROOT=path.resolve(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'data','mega-source-catalog.json'),'utf8'));
async function fixtures(fn){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pkmsvv-mega4-'));
 const source=path.join(root,'private-png'),vendor=path.join(root,'vendor','pokesurvivor');
 fs.mkdirSync(source,{recursive:true});fs.mkdirSync(path.join(root,'data'),{recursive:true});
 fs.copyFileSync(path.join(ROOT,'data','mega-source-catalog.json'),path.join(root,'data','mega-source-catalog.json'));
 for(const p of ['js/data','js/core'])fs.mkdirSync(path.join(vendor,p),{recursive:true});
 const meta=path.join(vendor,'js/data/pkmsvv-mega-sprite-meta.js');
 const cat=path.join(vendor,'js/data/pkmsvv-mega-catalog.js');
 const sprites=path.join(vendor,'js/core/sprites.js');
 fs.writeFileSync(meta,'G.SPRITE_META={};\n');
 fs.writeFileSync(cat,'G.PKMSVV_MEGA_CATALOG='+JSON.stringify(catalog.forms.map(f=>({
   key:f.showdownKey,artReady:f.sprite.state==='sprite-ready'
 })))+';\n');
 fs.writeFileSync(sprites,'class Animator {draw(){const row = Math.min(this.dir, m.r - 1);return row;}}\n');
 try{await fn({root,vendor,source,meta,cat,sprites})}
 finally{fs.rmSync(root,{recursive:true,force:true})}
}
async function writeSources(source){
 for(const f of qa.FORMS)for(const variant of ['normal','shiny']){
  const name=qa.sourceName(f,variant);
  await sharp({create:{width:384,height:384,channels:4,background:{r:100,g:120,b:200,alpha:1}}})
   .png().toFile(path.join(source,name));
 }
}
test('four-way-to-eight-way lookup follows real [front,left,right,back] source rows',()=>{
 assert.deepEqual([...qa.EIGHT_TO_FOUR],[0,0,2,3,3,3,1,0]);
 assert.equal(qa.FORMS.length,4);
 assert.equal(new Set(qa.FORMS.map(f=>qa.virtualId(f,catalog))).size,4);
});
test('disabled by default; no private files and no source changes',async()=>{
 await fixtures(async x=>{
  const previous=process.env.PKMSVV_MEGA_4DIR_PC_QA;delete process.env.PKMSVV_MEGA_4DIR_PC_QA;
  try{assert.deepEqual(await qa.install({root:x.root,vendor:x.vendor,source:x.source}),{enabled:false});
   assert.doesNotMatch(fs.readFileSync(x.meta,'utf8'),/Mega/)}
  finally{if(previous===undefined)delete process.env.PKMSVV_MEGA_4DIR_PC_QA;else process.env.PKMSVV_MEGA_4DIR_PC_QA=previous}
 });
});
test('fail closed if even one of 8 local pngs is missing, before vendor edits',async()=>{
 await fixtures(async x=>{
  await writeSources(x.source);
  fs.rmSync(path.join(x.source,'dragonite-shiny.png'));
  await assert.rejects(qa.validateSource(x.source),/Missing private QA art/);
  assert.equal(fs.readFileSync(x.meta,'utf8'),'G.SPRITE_META={};\n');
 });
});
test('eight genuine private PNGs import into QA-only local visual IDs, never saves',async()=>{
 await fixtures(async x=>{
  await writeSources(x.source);
  const old=process.env.PKMSVV_MEGA_4DIR_PC_QA;process.env.PKMSVV_MEGA_4DIR_PC_QA='1';
  try{
   const result=await qa.install({root:x.root,vendor:x.vendor,source:x.source});
   assert.equal(result.forms.length,4);
   const sandbox={G:{}};
   vm.runInNewContext(fs.readFileSync(x.meta,'utf8'),sandbox);
   vm.runInNewContext(fs.readFileSync(x.cat,'utf8'),sandbox);
   assert.equal(sandbox.G.PKMSVV_MEGA_4DIR_QA.enabled,true);
   for(const {key,spriteId} of result.forms){
    const m=sandbox.G.SPRITE_META[spriteId];
    assert.equal(m.a.Idle.r,4);assert.equal(m.a.Walk.n,4);
    assert.equal(m.a.Walk.pkmsvv4dir,true);
    assert.equal(m.sh,true);
    const entry=sandbox.G.PKMSVV_MEGA_CATALOG.find(f=>f.key===key);
    assert.equal(entry.artReady,true);assert.equal(entry.qa4dir,true);
    for(const sub of ['', 's/'])for(const action of ['Idle','Walk']){
     const file=path.join(x.vendor,'assets/pokemon',String(spriteId),sub,action+'.png');
     const info=await sharp(file).metadata();
     assert.equal(info.width,384);assert.equal(info.height,384);
    }
   }
   assert.match(fs.readFileSync(x.sprites,'utf8'),/m\.pkmsvv4dir/);
   assert.doesNotMatch(fs.readFileSync(x.meta,'utf8'),/megaStones\s*=|save\s*=/);
  }finally{if(old===undefined)delete process.env.PKMSVV_MEGA_4DIR_PC_QA;else process.env.PKMSVV_MEGA_4DIR_PC_QA=old}
 });
});
test('reject distorted source dimensions',async()=>{
 await fixtures(async x=>{
  await writeSources(x.source);
  await sharp({create:{width:256,height:256,channels:4,background:'#ffffffff'}})
   .png().toFile(path.join(x.source,'scizor-normal.png'));
  await assert.rejects(qa.validateSource(x.source),/Expected PA2\.1 384x384/);
 });
});
test('opaque upgrade backdrop is forbidden; support and mega modal backdrops stay translucent',()=>{
 const css=fs.readFileSync(path.join(ROOT,'src/pkmsvv-phase1-pastel.css'),'utf8');
 const rule=css.match(/#scr-upgrade-select\.scr\.dim\s*\{([\s\S]*?)\}/);
 assert.ok(rule);
 assert.match(rule[1],/rgba\(/);
 assert.doesNotMatch(rule[1],/#ebf8f3|#c8e1dc|#b1d2cc/);
 for(const id of ['pkmsvv-support-catalog','pkmsvv-mega-phase1']){
  assert.match(css,new RegExp('#'+id+'[^{]+\\{\\s*background:rgba\\('));
 }
});
