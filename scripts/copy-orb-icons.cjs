'use strict';
/* Reuse the six original, offline Mystery Orb HUD/pickup sprites in PC guides.
 * QA-only packaging; fail closed when an icon is missing.
 */
const fs=require('node:fs'),path=require('node:path');
const IDS=Object.freeze(['slumber','slow','blowback','focus','luminous','quick']);
function copyOrbIcons(gameRoot){
 const dir=path.join(gameRoot,'assets/orbs');
 const source=path.resolve(__dirname,'../src/v14/orb-art');
 fs.mkdirSync(dir,{recursive:true});
 for(const id of IDS){
  const from=path.join(source,id+'.svg'),to=path.join(dir,id+'.svg');
  if(!fs.existsSync(from)||fs.statSync(from).size===0)
   throw Error('Missing actual Mystery Orb icon: '+from);
  fs.copyFileSync(from,to);
 }
 return IDS.map(id=>path.join(dir,id+'.svg'));
}
module.exports={copyOrbIcons,IDS};
