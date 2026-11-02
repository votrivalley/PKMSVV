'use strict';
/* Release gate: Android, Cloudflare, iOS and Windows must ship the same
 * full licensed Mega pack, not the old three-form preview subset.
 * This inspects genuine offline PNGs and runtime sprite metadata,
 * never unlocks saved Pokémon or fakes missing four-direction sprites. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const platform=process.argv[2];
const folders={android:'mobile/www',web:'dist/cloudflare/game',ios:'dist/ios/game',pc:'dist/lan/game'};
if(!Object.hasOwn(folders,platform))
 throw Error('Choose platform: android, web, ios or pc');
const out=path.join(root,folders[platform]);
const vendor=path.join(root,'vendor/pokesurvivor');
function meta(){
 const text=fs.readFileSync(path.join(vendor,'js/data/pkmsvv-mega-sprite-meta.js'),'utf8');
 const G={SPRITE_META:{}};
 vm.runInNewContext(text,{G});
 return G;
}
test(platform+' ships exactly the 36 PC Mega animations with credits, plus 32 genuine Shiny sets',()=>{
 const g=meta();
 const forms=g.PKMSVV_MEGA_READY||[],shiny=g.PKMSVV_MEGA_SHINY_READY||[];
 assert.equal(forms.length,36,'Old three-sprite preview build was used');
 assert.equal(shiny.length,32,'Missing full authentic Shiny Mega pack');
 assert.equal(new Set(forms.map(x=>x.spriteId)).size,36,'duplicate Mega sprite IDs');
 assert.ok(fs.existsSync(path.join(out,'js/app.min.js')),'compiled game was not packaged');
 const app=fs.readFileSync(path.join(out,'js/app.min.js'),'utf8');
 assert.match(app,/PKMSVV_MEGA_READY/,'compiled game lost Mega sprite metadata');
 for(const form of forms){
  const md=g.SPRITE_META[form.spriteId];
  assert.ok(md?.a?.Idle,'missing sprite metadata '+form.name);
  assert.ok(md?.a?.Walk,'missing walking metadata '+form.name);
  const base=path.join(out,'assets/pokemon',String(form.spriteId));
  for(const anim of ['Idle','Walk','Attack','Shoot','Charge','Hurt','Faint']){
   const file=path.join(base,anim+'.png');
   assert.ok(fs.existsSync(file)&&fs.statSync(file).size>100,
    platform+' lacks '+form.name+'/'+anim+'.png');
  }
  assert.ok(fs.existsSync(path.join(base,form.name==='Lucario-Mega'?'CREDITS-MEGA-LUCARIO.txt':'CREDITS-MEGA.txt')),
   'missing credit: '+form.name);
 }
 for(const form of shiny){
  assert.equal(g.SPRITE_META[form.spriteId]?.sh,true,'Shiny meta missing '+form.name);
  const folder=path.join(out,'assets/pokemon',String(form.spriteId),'s');
  for(const anim of ['Idle','Walk','Attack','Shoot','Charge','Hurt','Faint']){
   const f=path.join(folder,anim+'.png');
   assert.ok(fs.existsSync(f)&&fs.statSync(f).size>100,
    platform+' lacks Shiny '+form.name+'/'+anim+'.png');
  }
  assert.ok(fs.existsSync(path.join(folder,'CREDITS-MEGA-SHINY.txt')),
   'missing Shiny credit '+form.name);
 }
 console.log('MEGA PARITY '+platform+': '+forms.length+' normal / '+shiny.length+' Shiny eight-direction sets');
});
