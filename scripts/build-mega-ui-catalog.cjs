'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','mega-source-catalog.json'),'utf8'));
if(catalog.forms.length!==96)throw Error('Mega audit drift: expected 96 forms');
const legends=new Set([150,380,381,384,485,491,718,719,801,807]),stones=new Map();
for(const f of catalog.forms)if(f.megaStone)stones.set(f.megaStone,(stones.get(f.megaStone)||0)+1);
const result=catalog.forms.map(f=>{
 const same=catalog.forms.filter(x=>x.dex===f.dex).map(x=>x.name).sort();
 const slot=same.indexOf(f.name);
 if(slot<0||slot>3)throw Error('Invalid visual form key: '+f.name);
 for(const stat of ['hp','atk','def','spa','spd','spe'])
  if(!Number.isFinite(f.megaStats?.[stat]))throw Error('Missing Mega stat '+f.name+'/'+stat);
 return {key:f.showdownKey,dex:f.dex,name:f.name,stone:f.megaStone||null,
  stoneKey:f.megaStone?f.megaStone.toLowerCase().replace(/[^a-z0-9]/g,''):null,
  sharedStone:!!f.megaStone&&stones.get(f.megaStone)>1,
  storyLocked:legends.has(f.dex),
  spriteId:10000+f.dex+slot*10000,artReady:f.sprite.state==='sprite-ready',
  stats:f.megaStats,ability:f.megaAbility||'—'};
}).sort((a,b)=>a.dex-b.dex||a.name.localeCompare(b.name,'en'));
if(new Set(result.map(f=>f.key)).size!==96||result.filter(f=>f.artReady).length!==36||
 result.find(f=>f.key==='lucariomega')?.spriteId!==10448)throw Error('Mega data validation failed');
const out=path.join(root,'vendor','pokesurvivor','js','data','pkmsvv-mega-catalog.js');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,'/* Offline read-only Mega encyclopedia. */\nG.PKMSVV_MEGA_CATALOG='+JSON.stringify(result)+';\n');
console.log('Phase 2: compiled 96 forms, 36 animation candidates, no save writes.');
