'use strict';
const fs=require('node:fs'),path=require('node:path');
const IDS=Object.freeze([
 'ember-quick','water-tackle','grass-spin','spark-quick','mind-tackle',
 'fire-gust','bubble-ice','leaf-rock','shadow-mind','thunder-claw'
]);
function copyFusionIcons(target,root=path.resolve(__dirname,'..')){
 const from=path.join(root,'assets/fusion-icons');
 const to=path.join(target,'assets/fusion-icons');
 fs.mkdirSync(to,{recursive:true});
 for(const id of IDS){
  const source=path.join(from,id+'.webp');
  if(!fs.existsSync(source)||fs.statSync(source).size<1000)
   throw Error('Fusion icon asset missing/invalid: '+source);
  fs.copyFileSync(source,path.join(to,id+'.webp'));
 }
 return IDS.length;
}
module.exports={IDS,copyFusionIcons};
