'use strict';
/* Mega Stone icon atlas from Pokémon Showdown's public battle UI.
 * Download at BUILD TIME only; the released PC/Web/Android game reads local assets.
 * This source contains fan-game artwork owned by its respective rights holders.
 */
const fs=require('node:fs'),path=require('node:path'),https=require('node:https');
const root=path.join(__dirname,'..');
const meta=JSON.parse(fs.readFileSync(path.join(root,'src','mega-stone-sprite-map.json'),'utf8'));
const target=path.join(root,'vendor','pokesurvivor','assets','mega-items','itemicons-sheet.png');
const mirrors=[
 'https://play.pokemonshowdown.com/sprites/itemicons-sheet.png',
 'https://pandora.psim.us/sprites/itemicons-sheet.png'
];
const requiredHeight=24*(Math.floor(Math.max(...Object.values(meta.icons))/16)+1);
function verify(buffer){
 if(!Buffer.isBuffer(buffer)||buffer.length<30000||buffer.length>400000)throw Error('Mega item atlas has unexpected size');
 if(buffer.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Mega item atlas is not PNG');
 const w=buffer.readUInt32BE(16),h=buffer.readUInt32BE(20);
 if(w!==384||h<requiredHeight)throw Error('Mega item sheet changed: '+w+'x'+h+' vs 384x'+requiredHeight);
 return buffer;
}
function download(url,redirects=0){
 return new Promise((resolve,reject)=>{
  if(redirects>2)return reject(Error('Too many Mega sprite redirects'));
  const req=https.get(url,{headers:{'User-Agent':'PKMSVV-noncommercial-build/1.0'},timeout:10000},res=>{
   if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){
    res.resume();return resolve(download(new URL(res.headers.location,url).href,redirects+1));
   }
   if(res.statusCode!==200){res.resume();return reject(Error('Mega sprite HTTP '+res.statusCode));}
   const chunks=[];let length=0;
   res.on('data',buf=>{length+=buf.length;if(length>400000){req.destroy(Error('Mega sprite size limit'));return;}chunks.push(buf);});
   res.on('end',()=>{try{resolve(verify(Buffer.concat(chunks)));}catch(error){reject(error);}});
   res.on('error',reject);
  });
  req.on('timeout',()=>req.destroy(Error('Mega item sprite timed out')));
  req.on('error',reject);
 });
}
async function run(){
 if(fs.existsSync(target)){
  try{verify(fs.readFileSync(target));console.log('Mega Stone pixel atlas cached');return;}
  catch{fs.rmSync(target,{force:true});}
 }
 let last;
 for(const url of mirrors){
  try{
   const img=await download(url);
   fs.mkdirSync(path.dirname(target),{recursive:true});
   fs.writeFileSync(target,img);
   console.log('Mega Stone atlas:',Object.keys(meta.icons).length,'pixel icons; local offline asset',img.length,'bytes');
   return;
  }catch(e){last=e;console.warn('Mega Stone sprite source unavailable:',url,String(e.message||e));}
 }
 throw Error('Could not package real Mega Stone sprites: '+String(last?.message||last));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
