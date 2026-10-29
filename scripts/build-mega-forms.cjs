'use strict';
/**
 * PC-only Mega asset candidate pack. Do not enable gameplay unlocks here.
 * Downloads during CI from a pinned SpriteCollab revision. At runtime all art
 * is local and the normal Pokédex/save species IDs remain untouched.
 * License: CC BY-NC 4.0 with each contributor's original credits.txt.
 */
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const vendor=path.join(root,'vendor','pokesurvivor');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','mega-source-catalog.json'),'utf8'));
const REV='448d3af85e2cfa85a8c5ead076eddb145251b473';
const REMOTE='https://raw.githubusercontent.com/PMDCollab/SpriteCollab/'+REV+'/';
const META=path.join(vendor,'js','data','pkmsvv-mega-sprite-meta.js');
const TARGET=path.join(vendor,'assets','pokemon');
const WANT={
  Idle:['Idle'],
  Walk:['Walk'],
  Attack:['Attack','Strike','Swing'],
  Shoot:['Shoot','SpAttack','Attack'],
  Charge:['Charge','Idle'],
  Hurt:['Hurt'],
  Faint:['Faint','Fainted','Hurt']
};
function assert(cond,msg){if(!cond)throw Error('Mega asset pack: '+msg);}
function virtualId(form){
 const siblings=catalog.forms.filter(f=>f.dex===form.dex).map(f=>f.name).sort();
 const index=siblings.indexOf(form.name);
 assert(index>=0&&index<4,'invalid form key: '+form.name);
 // Key is purely visual: no new Pokémon/gacha/save species.
 return 10000+form.dex+index*10000;
}
function parseXml(xml){
 const all={};let m;
 const blocks=/<Anim>([\s\S]*?)<\/Anim>/g;
 while((m=blocks.exec(xml))){
  const block=m[1],get=k=>(block.match(new RegExp('<'+k+'>([^<]+)</'+k+'>'))||[])[1];
  const name=get('Name');if(!name)continue;
  const copy=get('CopyOf');if(copy){all[name]={copy};continue;}
  const w=Number(get('FrameWidth')),h=Number(get('FrameHeight'));
  const d=[...block.matchAll(/<Duration>(\d+)<\/Duration>/g)].map(v=>Number(v[1]));
  if(w>0&&h>0&&d.length)all[name]={w,h,d};
 }
 const sh=Number((xml.match(/<ShadowSize>(\d+)<\/ShadowSize>/)||[])[1])||1;
 return {all,sh};
}
function resolve(all,name,seen=new Set()){
 if(seen.has(name)||!all[name])return null;
 seen.add(name);
 const item=all[name];
 return item.copy?resolve(all,item.copy,seen):{name,...item};
}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchBytes(rel,optional=false){
 const url=REMOTE+rel;
 for(let retry=0;retry<3;retry++){
  try{
   const res=await fetch(url,{signal:AbortSignal.timeout(30000)});
   if(res.status===404&&optional)return null;
   if(!res.ok)throw Error('HTTP '+res.status);
   return Buffer.from(await res.arrayBuffer());
  }catch(err){
   if(retry===2)throw Error('SpriteCollab '+rel+': '+String(err.message||err));
   await pause(600*(retry+1));
  }
 }
}
async function shadowAnchor(bytes,w,h){
 if(!bytes)return [w/2,Math.round(h*.78*10)/10];
 try{
  const {data,info}=await sharp(bytes).ensureAlpha().extract({left:0,top:0,width:w,height:h}).raw().toBuffer({resolveWithObject:true});
  let x=0,y=0,n=0;
  for(let row=0;row<h;row++)for(let col=0;col<w;col++){
   if(data[(row*w+col)*info.channels+3]>40){x+=col;y+=row;n++;}
  }
  return n?[Math.round(x/n*10)/10,Math.round(y/n*10)/10]:[w/2,h*.78];
 }catch(err){throw Error('Invalid Shadow PNG: '+err.message);}
}
async function buildForm(form){
 const spriteId=virtualId(form),out=path.join(TARGET,String(spriteId));
 const prefix=form.sprite.folder+'/';
 const {all,sh}=parseXml((await fetchBytes(prefix+'AnimData.xml')).toString('utf8'));
 const anim={};
 fs.mkdirSync(out,{recursive:true});
 for(const [want,fallbacks] of Object.entries(WANT)){
  let selected=null;
  for(const candidate of fallbacks){
   const source=resolve(all,candidate);
   if(!source)continue;
   // Only try animations tracked by SpriteCollab or XML copies of them.
   if(!form.sprite.animations.includes(source.name)&&!form.sprite.animations.includes(candidate))continue;
   const file=await fetchBytes(prefix+source.name+'-Anim.png',true);
   if(file){selected={file,source};break;}
  }
  assert(selected,form.name+' has no animation for '+want);
  const {file,source}=selected;
  const info=await sharp(file).metadata();
  const cols=Math.floor(info.width/source.w),rows=Math.floor(info.height/source.h);
  const n=Math.min(cols,source.d.length);
  assert(cols>0&&n>0&&rows>=8,form.name+' bad directional grid '+want);
  const shadow=await fetchBytes(prefix+source.name+'-Shadow.png',true);
  const [ax,ay]=await shadowAnchor(shadow,source.w,source.h);
  anim[want]={w:source.w,h:source.h,n,r:rows,d:source.d.slice(0,n),ax,ay};
  fs.writeFileSync(path.join(out,want+'.png'),file);
 }
 for(const mandatory of ['Idle','Walk','Attack','Hurt','Faint'])
  assert(anim[mandatory]&&anim[mandatory].r>=8,form.name+' missing '+mandatory);
 const credits=await fetchBytes(prefix+'credits.txt');
 fs.writeFileSync(path.join(out,'CREDITS-MEGA.txt'),
  'PMDCollab/SpriteCollab '+REV+'\nCC BY-NC 4.0 — noncommercial, attribution required\n'+
  'https://github.com/PMDCollab/SpriteCollab/tree/'+REV+'/'+form.sprite.folder+'\n\n'+
  credits.toString('utf8'),'utf8');
 return {name:form.name,dex:form.dex,spriteId,megaStone:form.megaStone,
  megaStats:form.megaStats,megaAbility:form.megaAbility,
  source:form.sprite.folder,animationMeta:{s:sh,a:anim}};
}
async function main(){
 assert(catalog.sources.spriteSha===REV,'source revision drift');
 assert(fs.existsSync(META),'run Mega Lucario builder first');
 const ready=catalog.forms.filter(f=>f.sprite.state==='sprite-ready');
 assert(ready.length===36,'reviewed catalog must have 36 sprite candidates');
 const forms=ready.filter(f=>f.name!=='Lucario-Mega');
 assert(forms.length===35,'expected 35 new candidates');
 const ids=ready.map(virtualId);
 assert(new Set(ids).size===36,'virtual sprite key collision');
 assert(virtualId(ready.find(f=>f.name==='Lucario-Mega'))===10448,'keep Lucario key 10448');
 let next=0;
 const results=[];
 const workers=Array.from({length:4},async()=>{
  while(next<forms.length){
   const form=forms[next++];
   const result=await buildForm(form);
   results.push(result);
   console.log('Mega candidate '+results.length+'/'+forms.length+': '+form.name+' (#'+result.spriteId+')');
  }
 });
 await Promise.all(workers);
 const data=results.sort((a,b)=>a.spriteId-b.spriteId);
 let code='\n/* Candidate Mega art; per-form contributor credits in each sprite folder. */\n';
 for(const form of data)code+='G.SPRITE_META['+form.spriteId+']='+JSON.stringify(form.animationMeta)+';\n';
 const registry=ready.map(f=>{
  const imported=data.find(x=>x.name===f.name);
  return {name:f.name,dex:f.dex,spriteId:virtualId(f),megaStone:f.megaStone,
    megaStats:f.megaStats,megaAbility:f.megaAbility,source:f.sprite.folder,
    // An asset candidate is not automatically a gameplay unlock.
    assetOnly:true,qaRequired:true,imported:!!imported||f.name==='Lucario-Mega'};
 });
 assert(registry.every(x=>x.imported),'not every reviewed form was imported');
 code+='G.PKMSVV_MEGA_READY='+JSON.stringify(registry)+';\n';
 fs.appendFileSync(META,code,'utf8');
 console.log('Packed '+data.length+' additional Mega candidates; 36 visual sets including Lucario.');
 console.log('No stones, Dex species, Gacha entries, story unlocks or PvP powers granted.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
