'use strict';
const fs=require('node:fs'),path=require('node:path');
const sharp=require('sharp'),pngToIco=require('png-to-ico').default;
const root=path.join(__dirname,'..');
async function main(){
 const svg=fs.readFileSync(path.join(root,'assets','icon-survivor.svg'));
 const png=await sharp(svg,{density:192}).resize(512,512).png().toBuffer();
 const dest=path.join(root,'build');fs.mkdirSync(dest,{recursive:true});
 fs.writeFileSync(path.join(dest,'icon.png'),png);
 const icon256=path.join(dest,'icon-256.png');
 fs.writeFileSync(icon256,await sharp(png).resize(256,256).png().toBuffer());
 fs.writeFileSync(path.join(dest,'icon.ico'),await pngToIco(icon256));
 const game=path.join(root,'vendor','pokesurvivor');
 if(fs.existsSync(path.join(game,'assets','icons'))){
  fs.copyFileSync(path.join(dest,'icon.ico'),path.join(game,'favicon.ico'));
  for(const n of [48,96,144,180,192,512]){
   const file=path.join(game,'assets','icons','icon-'+n+'.png');
   fs.writeFileSync(file,await sharp(png).resize(n,n).png().toBuffer());
  }
  fs.writeFileSync(path.join(game,'assets','icons','icon-maskable-512.png'),png);
 }
 console.log('Generated Pokémon Sống Sót icon assets for Windows, Android and Web');
}
main().catch(e=>{console.error(e);process.exitCode=1});
