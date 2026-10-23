'use strict';
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.join(__dirname,'..');
async function main(){
 const icon=fs.readFileSync(path.join(root,'build','icon.png'));
 const res=path.join(root,'android','app','src','main','res');
 for(const [density,size] of Object.entries({mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192})){
  const dir=path.join(res,'mipmap-'+density);fs.mkdirSync(dir,{recursive:true});
  const png=await sharp(icon).resize(size,size).png().toBuffer();
  fs.writeFileSync(path.join(dir,'ic_launcher.png'),png);
  fs.writeFileSync(path.join(dir,'ic_launcher_round.png'),png);
  const fgSize=Math.round(size*2.25),inner=Math.round(fgSize*0.74);
  const small=await sharp(icon).resize(inner,inner).png().toBuffer(),ofs=Math.floor((fgSize-inner)/2);
  const fg=await sharp({create:{width:fgSize,height:fgSize,channels:4,background:'#00000000'}})
   .composite([{input:small,left:ofs,top:ofs}]).png().toBuffer();
  fs.writeFileSync(path.join(dir,'ic_launcher_foreground.png'),fg);
 }
 console.log('Installed Pokémon Sống Sót launcher icons in five densities');
}
main().catch(e=>{console.error(e);process.exitCode=1});
