'use strict';
// QA build asset copy. Fixed allowlist: uploaded scenes are decorative covers only.
// The generated SVG background remains a fallback until the corresponding WebP exists.
const fs=require('node:fs');
const path=require('node:path');
const REGION_COVERS=Object.freeze([
 '01-kanto.webp','02-johto.webp','03-hoenn.webp','04-sinnoh.webp',
 '05-unova.webp','06-kalos.webp','07-alola.webp','08-galar.webp',
 '09-paldea.webp','10-sky-tower.webp'
]);
function copyRegionCovers(gameDir){
 const source=path.join(__dirname,'..','assets','region-covers');
 const dest=path.join(gameDir,'images','regions');
 let count=0;
 for(const filename of REGION_COVERS){
  const input=path.join(source,filename);
  if(!fs.existsSync(input))continue;
  const size=fs.statSync(input).size;
  if(size<16||size>2*1024*1024)throw Error('Invalid Region cover WebP size: '+filename);
  fs.mkdirSync(dest,{recursive:true});
  fs.copyFileSync(input,path.join(dest,filename));
  count++;
 }
 console.log('QA Region covers copied:',count,'/',REGION_COVERS.length,'to',dest);
 return count;
}
module.exports={REGION_COVERS,copyRegionCovers};
