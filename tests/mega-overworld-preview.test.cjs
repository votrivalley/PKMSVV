'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),sharp=require('sharp');
const {FORMS,normalizeSpec,inspectOne}=require('../scripts/build-mega-overworld-preview.cjs');
test('Only four true four-direction preview candidates; strict dimension validation',()=>{
  assert.deepEqual(FORMS,['scizor','swampert','garchomp','dragonite']);
  assert.equal(normalizeSpec('garchomp','shiny',254,256).extendRight,2);
  assert.throws(()=>normalizeSpec('scizor','shiny',254,256));
  assert.throws(()=>normalizeSpec('garchomp','shiny',255,256));
});
test('Garchomp Shiny preview only pads right 2 transparent pixels, never invents battle readiness',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pkmsvv-mega-ow-'));
  try{
    const input=path.join(dir,'source.png'),out=path.join(dir,'scratch');
    await sharp({create:{width:254,height:256,channels:4,background:'#ffffffff'}}).png().toFile(input);
    const result=await inspectOne(input,out,'garchomp','shiny');
    assert.deepEqual(result.sourceSize,[254,256]);
    assert.equal(result.paddedTransparentRightPx,2);
    assert.equal(result.battleReady,false);
    assert.deepEqual(result.normalizedSize,[256,256]);
    const rgba=await sharp(path.join(out,result.file)).raw().ensureAlpha().toBuffer();
    for(let y=0;y<256;y++)for(const x of [254,255])assert.equal(rgba[(y*256+x)*4+3],0);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});