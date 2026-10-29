'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),vendor=path.join(root,'vendor','pokesurvivor');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ready=JSON.parse(read('data/mega-source-catalog.json')).forms.filter(f=>f.sprite.state==='sprite-ready');
const missing=new Set(['Skarmory-Mega','Tyranitar-Mega','Medicham-Mega','Darkrai-Mega']);
test('authentic published Shiny Mega sources are pinned with per-form contributors',()=>{
 assert.equal(ready.length,36);
 const all=ready.filter(f=>!missing.has(f.name));
 assert.equal(all.length,32);
 const source=read('scripts/build-mega-shiny.cjs');
 assert.match(source,/448d3af85e2cfa85a8c5ead076eddb145251b473/);
 assert.match(source,/CC BY-NC 4.0/);
 assert.match(source,/\/0001\//);
 assert.match(source,/SHINY_READY/);
 assert.doesNotMatch(source,/hueRotate|tint\(|recolor|colorize|paletteSwap/i);
});
test('all shipped Shiny Mega animations are genuinely eight-direction offline PNGs',()=>{
 const g={SPRITE_META:{}};
 const meta=fs.readFileSync(path.join(vendor,'js','data','pkmsvv-mega-sprite-meta.js'),'utf8');
 vm.runInNewContext(meta,{G:g});
 const list=g.PKMSVV_MEGA_SHINY_READY;
 assert.ok(Array.isArray(list),'missing Shiny Mega pack');
 const pc=Array.isArray(g.PKMSVV_MEGA_READY);
 assert.equal(list.length,pc?32:1);
 assert.ok(list.some(f=>f.name==='Lucario-Mega'&&f.spriteId===10448));
 if(pc){
  assert.ok(list.some(f=>f.name==='Charizard-Mega-X'&&f.spriteId===10006));
  assert.ok(list.some(f=>f.name==='Excadrill-Mega'&&f.spriteId===10530));
 }
 assert.equal(new Set(list.map(f=>f.spriteId)).size,list.length);
 for(const form of list){
  const m=g.SPRITE_META[form.spriteId];
  assert.equal(m?.sh,true,form.name+' has no shiny metadata');
  for(const name of ['Idle','Walk','Attack','Shoot','Charge','Hurt','Faint']){
   const a=m.sa?.[name];
   assert.ok(a&&a.r>=8&&a.n>0,form.name+' lacks 8-direction Shiny '+name);
   const file=path.join(vendor,'assets','pokemon',String(form.spriteId),'s',name+'.png');
   assert.ok(fs.statSync(file).size>100,form.name+' missing local shiny '+name);
  }
  const credit=fs.readFileSync(path.join(vendor,'assets','pokemon',
    String(form.spriteId),'s','CREDITS-MEGA-SHINY.txt'),'utf8');
  assert.match(credit,/CC BY-NC 4.0/);
  assert.match(credit,/SpriteCollab/);
 }
 for(const name of missing)assert.ok(!list.some(f=>f.name===name),
  name+' must never receive a fake recolor');
 const sprites=fs.readFileSync(path.join(vendor,'js','core','sprites.js'),'utf8');
 assert.match(sprites,/hasShiny\(dex\)/);
 assert.match(sprites,/shiny \? 's\/'/);
});
test('Shiny Mega gameplay preserves original Shiny flag and solo-only isolation',()=>{
 const a=read('src/pkmsvv-mega-lucario.js'),b=read('src/pkmsvv-mega-phase3.js');
 assert.match(a,/G\.Sprites\.hasShiny\?\.\(SPRITE\)/);
 assert.match(a,/G\.Sprites\.preload\(\[SPRITE\],3500,!!p\.shiny\)/);
 assert.match(b,/G\.Sprites\.preload\(\[f\.spriteId\],3500,!!p\.shiny\)/);
 assert.match(b,/!G\.Coop\?\.active/);
 assert.match(a,/!p\.shiny\|\|/);
 assert.doesNotMatch(a,/G\.DB\.save\.shiny\s*=/);
 assert.doesNotMatch(b,/G\.DB\.save\.shiny\s*=/);
});
