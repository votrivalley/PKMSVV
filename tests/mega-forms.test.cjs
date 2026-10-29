'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const vendor=path.join(root,'vendor','pokesurvivor');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','mega-source-catalog.json'),'utf8'));
test('Mega source pack pins CC BY-NC 4.0, 36 unique candidate forms and no runtime network',()=>{
 const code=fs.readFileSync(path.join(root,'scripts','build-mega-forms.cjs'),'utf8');
 assert.match(code,/448d3af85e2cfa85a8c5ead076eddb145251b473/);
 assert.match(code,/CC BY-NC 4.0/);
 assert.match(code,/buildForm\(form\)/);
 assert.match(code,/await Promise.all\(workers\)/);
 assert.match(code,/assetOnly:true,qaRequired:true/);
 assert.equal(catalog.forms.filter(x=>x.sprite.state==='sprite-ready').length,36);
});
test('PC candidate pack has all 36 8-direction local sprite sets with source credits',()=>{
 const g={SPRITE_META:{}};
 const meta=fs.readFileSync(path.join(vendor,'js','data','pkmsvv-mega-sprite-meta.js'),'utf8');
 vm.runInNewContext(meta,{G:g});
 const forms=g.PKMSVV_MEGA_READY;
 assert.ok(Array.isArray(forms),'PC Mega registry is missing; compile with PKMSVV_MEGA_SPRITE_PACK=1');
 assert.equal(forms.length,36);
 assert.equal(new Set(forms.map(f=>f.spriteId)).size,36);
 assert.ok(forms.every(f=>f.assetOnly&&f.qaRequired&&f.imported));
 assert.equal(forms.find(f=>f.name==='Lucario-Mega').spriteId,10448);
 for(const form of forms){
  const meta=g.SPRITE_META[form.spriteId];
  assert.ok(meta,form.name+' lacks metadata');
  for(const action of ['Idle','Walk','Attack','Shoot','Charge','Hurt','Faint']){
   const sprite=meta.a[action];
   assert.ok(sprite&&sprite.n>0&&sprite.r>=8,form.name+' missing '+action+' in 8 directions');
   const image=path.join(vendor,'assets','pokemon',String(form.spriteId),action+'.png');
   assert.ok(fs.statSync(image).size>100,form.name+' missing packaged '+action);
  }
  const credits=form.spriteId===10448?'CREDITS-MEGA-LUCARIO.txt':'CREDITS-MEGA.txt';
  const creditPath=path.join(vendor,'assets','pokemon',String(form.spriteId),credits);
  assert.match(fs.readFileSync(creditPath,'utf8'),/SpriteCollab/);
 }
});
test('Mega pack does not modify save species IDs, Gacha or protected Android identity',()=>{
 const code=fs.readFileSync(path.join(root,'scripts','build-mega-forms.cjs'),'utf8');
 assert.equal(/G\.DB\.save|G\.Gacha|G\.DEX_BY\s*\[/.test(code),false);
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 assert.match(pkg.scripts['test:mega:pack'],/mega-forms\.test/);
 assert.match(pkg.version,/^\d+\.\d+\.\d+$/,'valid semantic version; do not freeze Android update version');
});
