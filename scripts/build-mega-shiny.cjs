'use strict';
/* Authentic Shiny Mega PMD art, NOT a generated palette.
 * SpriteCollab form's /0001/ variant is its artist-published Shiny.
 * All animation sheets bundled offline; CC BY-NC 4.0 credits in each /s/.
 */
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','mega-source-catalog.json'),'utf8'));
const REV='448d3af85e2cfa85a8c5ead076eddb145251b473';
const BASE='https://raw.githubusercontent.com/PMDCollab/SpriteCollab/'+REV+'/';
const META=path.join(game,'js','data','pkmsvv-mega-sprite-meta.js');
const ART=path.join(game,'assets','pokemon');
const WANT={Idle:['Idle'],Walk:['Walk','Idle'],Attack:['Attack','Strike','Swing','Idle'],
 Shoot:['Shoot','SpAttack','Attack','Idle'],Charge:['Charge','Idle'],
 Hurt:['Hurt','Idle'],Faint:['Faint','Fainted','Hurt','Idle']};
const KNOWN_MISSING=new Set(['Skarmory-Mega','Tyranitar-Mega','Medicham-Mega','Darkrai-Mega']);
function fail(s){throw Error('Shiny Mega source audit: '+s);}
function spriteId(f){
 const names=catalog.forms.filter(x=>x.dex===f.dex).map(x=>x.name).sort();
 const slot=names.indexOf(f.name);
 if(slot<0||slot>=4)fail('visual alias collision '+f.name);
 return 10000+f.dex+10000*slot;
}
function parseXml(xml){
 const all={};let match;
 for(const m of xml.matchAll(/<Anim>([\s\S]*?)<\/Anim>/g)){
  const body=m[1],get=k=>(body.match(new RegExp('<'+k+'>([^<]+)</'+k+'>'))||[])[1];
  const name=get('Name');if(!name)continue;
  const copy=get('CopyOf');if(copy){all[name]={copy};continue;}
  const w=+get('FrameWidth'),h=+get('FrameHeight');
  const d=[...body.matchAll(/<Duration>(\d+)<\/Duration>/g)].map(v=>+v[1]);
  if(w>0&&h>0&&d.length)all[name]={w,h,d};
 }
 return {all,shadow:Number((xml.match(/<ShadowSize>(\d+)<\/ShadowSize>/)||[])[1])||1};
}
function resolve(all,name,seen=new Set()){
 if(seen.has(name)||!all[name])return null;seen.add(name);
 const x=all[name];return x.copy?resolve(all,x.copy,seen):{name,...x};
}
async function fetchBytes(url,optional=false){
 for(let i=0;i<3;i++){
  try{
   const r=await fetch(url,{signal:AbortSignal.timeout(30000)});
   if(optional&&r.status===404)return null;
   if(!r.ok)throw Error('HTTP '+r.status);
   return Buffer.from(await r.arrayBuffer());
  }catch(err){
   if(i===2)fail('request '+url+' '+err.message);
   await new Promise(done=>setTimeout(done,400*(i+1)));
  }
 }
}
async function shadowAnchor(bytes,w,h){
 if(!bytes)return [w/2,Math.round(h*.78*10)/10];
 const {data,info}=await sharp(bytes).ensureAlpha().extract({left:0,top:0,width:w,height:h})
  .raw().toBuffer({resolveWithObject:true});
 let x=0,y=0,count=0;
 for(let r=0;r<h;r++)for(let c=0;c<w;c++){
  if(data[(r*w+c)*info.channels+3]>40){x+=c;y+=r;count++;}
 }
 return count?[Math.round(x/count*10)/10,Math.round(y/count*10)/10]:[w/2,h*.78];
}
async function importForm(f){
 const id=spriteId(f),folder=path.join(ART,String(id),'s');
 const prefix=BASE+f.sprite.folder+'/0001/';
 const xmlBytes=await fetchBytes(prefix+'AnimData.xml');
 const {all,shadow}=parseXml(xmlBytes.toString('utf8'));
 const animation={};const files={};
 for(const [action,options] of Object.entries(WANT)){
  let selected=null;
  for(const option of options){
   const a=resolve(all,option);if(!a)continue;
   const bytes=await fetchBytes(prefix+a.name+'-Anim.png',true);
   if(!bytes)continue;
   const info=await sharp(bytes).metadata();
   if(info.width%a.w||info.height%a.h)continue;
   const cols=info.width/a.w,rows=info.height/a.h,n=Math.min(cols,a.d.length);
   if(n<1||rows<8)continue;
   const sh=await fetchBytes(prefix+a.name+'-Shadow.png',true);
   const [ax,ay]=await shadowAnchor(sh,a.w,a.h);
   animation[action]={w:a.w,h:a.h,n,r:rows,d:a.d.slice(0,n),ax,ay};
   selected=bytes;break;
  }
  if(!selected)fail('missing 8-direction Shiny '+f.name+' / '+action);
  files[action]=selected;
 }
 // Never mark a Mega Shiny-ready until every animation is verified.
 const credits=await fetchBytes(prefix+'credits.txt');
 fs.mkdirSync(folder,{recursive:true});
 for(const [action,bytes] of Object.entries(files))
  fs.writeFileSync(path.join(folder,action+'.png'),bytes);
 fs.writeFileSync(path.join(folder,'CREDITS-MEGA-SHINY.txt'),
  'PMDCollab/SpriteCollab Shiny '+REV+'\nLicense CC BY-NC 4.0 (noncommercial), contributor attribution:\n'+
  'https://github.com/PMDCollab/SpriteCollab/tree/'+REV+'/'+f.sprite.folder+'/0001\n\n'+
  credits.toString('utf8'),'utf8');
 return {name:f.name,dex:f.dex,spriteId:id,folder:f.sprite.folder+'/0001',sa:animation,shadow};
}
async function main(){
 if(catalog.sources.spriteSha!==REV)fail('source revision changed');
 if(!fs.existsSync(META))fail('normal Mega sprites must be built first');
 const ready=catalog.forms.filter(f=>f.sprite.state==='sprite-ready');
 if(ready.length!==36)fail('normal source count drift');
 const pc=process.env.PKMSVV_MEGA_SPRITE_PACK==='1';
 const candidates=ready.filter(f=>(pc||f.name==='Lucario-Mega')&&!KNOWN_MISSING.has(f.name));
 if(candidates.length!==(pc?32:1))fail('expected '+(pc?32:1)+' audited Shiny source folders');
 let cursor=0;const results=[];
 await Promise.all(Array.from({length:pc?4:1},async()=>{
  while(cursor<candidates.length){
   const f=candidates[cursor++],out=await importForm(f);
   results.push(out);
   console.log('Authentic Shiny Mega '+results.length+'/'+candidates.length+': '+f.name);
  }
 }));
 if(new Set(results.map(x=>x.spriteId)).size!==results.length)fail('duplicate alias');
 const listing=results.sort((a,b)=>a.spriteId-b.spriteId);
 let script='\n/* Genuine SpriteCollab Shiny Mega animation metadata; no palette transforms. */\n';
 for(const form of listing){
  script+='G.SPRITE_META['+form.spriteId+'].sh=true;\n';
  script+='G.SPRITE_META['+form.spriteId+'].sa='+JSON.stringify(form.sa)+';\n';
 }
 script+='G.PKMSVV_MEGA_SHINY_READY='+JSON.stringify(listing.map(({name,dex,spriteId,folder})=>({name,dex,spriteId,folder})))+';\n';
 fs.appendFileSync(META,script,'utf8');
 console.log('Verified '+listing.length+' real Shiny Mega sets, all seven animations and eight directions. No guessed colors.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
