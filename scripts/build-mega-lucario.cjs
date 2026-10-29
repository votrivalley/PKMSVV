'use strict';
// Licensed PMDCollab CC BY-NC 4.0 assets for a NONCOMMERCIAL prototype.
// Fetch the exact, reviewed upstream revision. No sprite files are loaded
// from the Internet while playing the packaged offline game.
const fs=require('node:fs'),path=require('node:path');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const vendor=path.join(root,'vendor','pokesurvivor');
const REV='448d3af85e2cfa85a8c5ead076eddb145251b473';
const REMOTE='https://raw.githubusercontent.com/PMDCollab/SpriteCollab/'+REV+'/sprite/0448/0001/';
const target=path.join(vendor,'assets','pokemon','10448');
const WANT=['Idle','Walk','Attack','Shoot','Charge','Hurt','Faint'];
const FALLBACK={Idle:['Walk'],Walk:['Idle'],Attack:['Strike','Swing','Idle'],
 Shoot:['Attack','Idle'],Charge:['Idle'],Hurt:['Idle'],Faint:['Hurt','Idle']};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function fetchBytes(name,optional=false){
 const file=REMOTE+name;
 for(let i=0;i<3;i++){
  try{
   const res=await fetch(file,{signal:AbortSignal.timeout(30000)});
   if(res.status===404&&optional)return null;
   if(!res.ok)throw Error('HTTP '+res.status+' '+file);
   return Buffer.from(await res.arrayBuffer());
  }catch(err){
   if(i===2){if(optional&&/404/.test(String(err)))return null;throw Error('SpriteCollab '+name+': '+err.message);}
   await pause(500*(i+1));
  }
 }
}
function parseXml(xml){
 const all={};let match;
 const blocks=/<Anim>([\s\S]*?)<\/Anim>/g;
 while((match=blocks.exec(xml))){
  const block=match[1], get=k=>(block.match(new RegExp('<'+k+'>([^<]+)</'+k+'>'))||[])[1];
  const name=get('Name');if(!name)continue;
  const copy=get('CopyOf');
  if(copy){all[name]={copy};continue;}
  const w=+get('FrameWidth'),h=+get('FrameHeight');
  const d=[...block.matchAll(/<Duration>(\d+)<\/Duration>/g)].map(v=>+v[1]);
  if(w>0&&h>0&&d.length)all[name]={w,h,d};
 }
 const sh=+(xml.match(/<ShadowSize>(\d+)<\/ShadowSize>/)||[])[1]||1;
 return {all,sh};
}
function resolve(anims,name,seen=new Set()){
 if(seen.has(name)||!anims[name])return null;
 seen.add(name);
 const a=anims[name];
 return a.copy?resolve(anims,a.copy,seen):{name,...a};
}
async function anchor(bytes,w,h){
 if(!bytes)return [w/2,Math.round(h*.78*10)/10];
 const image=sharp(bytes).ensureAlpha().extract({left:0,top:0,width:w,height:h});
 const {data,info}=await image.raw().toBuffer({resolveWithObject:true});
 let x=0,y=0,n=0;for(let row=0;row<h;row++)for(let col=0;col<w;col++){
  if(data[(row*w+col)*info.channels+3]>40){x+=col;y+=row;n++;}
 }
 return n?[Math.round(x/n*10)/10,Math.round(y/n*10)/10]:[w/2,h*.78];
}
async function main(){
 if(!fs.existsSync(path.join(vendor,'js','data','sprites-meta.js')))
  throw Error('Run prepare:game on pinned source, after restoring vendor');
 const xml=(await fetchBytes('AnimData.xml')).toString('utf8');
 const {all,sh}=parseXml(xml),a={};
 fs.mkdirSync(target,{recursive:true});
 for(const want of WANT){
  let found=null;
  for(const cand of [want,...(FALLBACK[want]||[])]){
   const source=resolve(all,cand);
   if(!source)continue;
   const file=await fetchBytes(source.name+'-Anim.png',true);
   if(file){found={source,file};break;}
  }
  if(!found)throw Error('Mega Lucario source animation missing: '+want);
  const {source,file}=found;
  const info=await sharp(file).metadata();
  const cols=Math.floor(info.width/source.w),rows=Math.floor(info.height/source.h);
  const n=Math.min(cols,source.d.length);
  if(n<1||rows<8)throw Error('Unexpected 8-direction sprite grid '+want);
  const shadow=await fetchBytes(source.name+'-Shadow.png',true);
  const [ax,ay]=await anchor(shadow,source.w,source.h);
  a[want]={w:source.w,h:source.h,n,r:rows,d:source.d.slice(0,n),ax,ay};
  fs.writeFileSync(path.join(target,want+'.png'),file);
 }
 const data={s:sh,a};
 fs.writeFileSync(path.join(vendor,'js','data','pkmsvv-mega-sprite-meta.js'),
  '/* Mega Lucario art: PMDCollab/SpriteCollab '+REV+' CC BY-NC 4.0 */\n'+
  'G.SPRITE_META[10448]='+JSON.stringify(data)+';\n');
 const credits=(await fetchBytes('credits.txt')).toString('utf8');
 fs.writeFileSync(path.join(target,'CREDITS-MEGA-LUCARIO.txt'),
  'Source PMDCollab SpriteCollab '+REV+'\nLicense CC BY-NC 4.0, noncommercial only\n'+
  'https://github.com/PMDCollab/SpriteCollab/tree/'+REV+'/sprite/0448/0001\n'+credits);
 if(!a.Idle||!a.Walk||!a.Attack||!a.Faint)throw Error('Missing critical Mega Lucario animation');
 console.log('Mega Lucario PMD sprites: '+WANT.join(', ')+'; all 8 directions, locally packed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
