'use strict';
// QA-only noncommercial asset import, no new artwork or national Dex entries.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const root=path.resolve(__dirname,'../vendor/pokesurvivor');
const REV='72b906e7dae9a4c2f1477e7c538c8f2fd8c225a5',DIR='sprite/0890/0001',ID=90890;
const HASH={
 'AnimData.xml':'2ab60098d7580223735738f15812aab0152a8c0f','credits.txt':'fe1f4aea156e415afbabbcc8dc55a45d45491cac',
 'Attack-Anim.png':'da00cdc8cb96f39665190cd60a683c75bc13291f','Attack-Shadow.png':'de9a91ae397c86e59529286a605ebf259d9cd6c7',
 'Charge-Anim.png':'bfe2de08e344da752c71b2b34f6d3d7fec053038','Charge-Shadow.png':'6d5c2023ae2577a0973d03a369c727958856ba8e',
 'Idle-Anim.png':'60141df81f9fe50c86ce4aadc12cf6f93a02e95a','Idle-Shadow.png':'8829010dde9a86e330d8b6d4f92086428431cf54',
 'Shoot-Anim.png':'bc90f08ed207002463be15f384a5f06e15390257','Shoot-Shadow.png':'4d14f3658e89f74c42323fe43f77679ae1425931',
 'Walk-Anim.png':'e78a4b76a85a7a4d86edb2edfc819702bbbda5d3','Walk-Shadow.png':'e8f992f49dda88b6615360c806c10e6e65843fd9'
};
const WANT=['Idle','Walk','Attack','Charge','Shoot'];
const ensure=(ok,msg)=>{if(!ok)throw Error('Eternamax source: '+msg);};
async function get(name){
 const url='https://raw.githubusercontent.com/PMDCollab/SpriteCollab/'+REV+'/'+DIR+'/'+name;
 let error;
 for(let j=0;j<3;j++)try{
  const res=await fetch(url,{signal:AbortSignal.timeout(20000)});ensure(res.ok,name+' HTTP '+res.status);
  const data=Buffer.from(await res.arrayBuffer());
  const sha=crypto.createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
  ensure(sha===HASH[name],name+' blob digest mismatch');return data;
 }catch(e){error=e;}
 throw error;
}
async function main(){
 const xml=(await get('AnimData.xml')).toString('utf8'),credits=(await get('credits.txt')).toString('utf8');
 ensure(credits.includes('CC_BY-NC_4'),'source credits or license missing');
 const a={},assets={};
 await Promise.all(WANT.map(async name=>{
  const block=[...xml.matchAll(/<Anim>([\s\S]*?)<\/Anim>/g)].map(m=>m[1]).find(x=>x.includes('<Name>'+name+'</Name>'));
  ensure(block,name+' absent in XML');
  const w=Number(block.match(/<FrameWidth>(\d+)<\/FrameWidth>/)?.[1]),h=Number(block.match(/<FrameHeight>(\d+)<\/FrameHeight>/)?.[1]);
  const d=[...block.matchAll(/<Duration>(\d+)<\/Duration>/g)].map(m=>+m[1]);
  ensure(w>0&&h>0&&d.length&&d.every(n=>n>0),name+' invalid frame metadata');
  const [bytes,shadow]=await Promise.all([get(name+'-Anim.png'),get(name+'-Shadow.png')]);
  const info=await sharp(bytes).metadata();
  ensure(info.format==='png'&&info.width===w*d.length&&info.height===h*8,name+' unexpected frame grid '+info.width+'x'+info.height);
  const pixels=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  // Require actual populated artwork in every animation/direction, not a stub.
  for(let row=0;row<8;row++){
   let visible=false;
   for(let y=row*h;y<(row+1)*h&&!visible;y++)for(let x=0;x<info.width;x++)if(pixels.data[(y*info.width+x)*4+3]){visible=true;break;}
   ensure(visible,name+' empty direction '+row);
  }
  const sh=await sharp(shadow).ensureAlpha().extract({left:0,top:0,width:w,height:h}).raw().toBuffer({resolveWithObject:true});
  let sx=0,sy=0,n=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(sh.data[(y*w+x)*4+3]>40){sx+=x;sy+=y;n++;}
  ensure(n>0,name+' missing shadow anchor');
  a[name]={w,h,n:d.length,r:8,d,ax:Math.round(sx/n*10)/10,ay:Math.round(sy/n*10)/10};assets[name]=bytes;
 }));
 const folder=path.join(root,'assets','pokemon',String(ID)),meta=path.join(root,'js','data','sprites-meta.js');
 ensure(fs.existsSync(meta),'native metadata unavailable');
 ensure(!fs.existsSync(folder),'visual ID already exists');
 fs.mkdirSync(folder,{recursive:true});for(const name of WANT)fs.writeFileSync(path.join(folder,name+'.png'),assets[name]);
 fs.writeFileSync(path.join(folder,'CREDITS-ETERNAMAX.txt'),'PMDCollab/SpriteCollab '+REV+'\nhttps://github.com/PMDCollab/SpriteCollab/tree/'+REV+'/'+DIR+'\nCC BY-NC 4.0 — noncommercial, attribution required.\nNative Hurt/Faint fallback: Idle with flash/fade, no invented animation.\n\n'+credits);
 fs.appendFileSync(meta,'\nif(G.SPRITE_META['+ID+'])throw Error("Eternamax visual key collision");\nG.SPRITE_META['+ID+']='+JSON.stringify({s:2,hv:true,a})+';\nG.PKMSVV_ETERNAMAX_ASSET='+JSON.stringify({id:ID,dex:890,rev:REV,source:DIR,animations:WANT})+';\n','utf8');
 console.log('ETERNAMAX_SOURCE_PACK_PASS='+JSON.stringify({id:ID,rev:REV,animations:a}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
