'use strict';
// Verify the exact V3.1 QA pack (six unchanged V3 sprites and repaired backdrop) before copying into the repository.
// Usage: node scripts/import-research-v3.cjs <extracted ZIP directory>
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('sharp');
const expected={
 'berry.png':['5b12bffbe90ec108217771feace21084c1323b9f14afe77c86c3c74009e24117',476,330],
 'crest.png':['c35696d54cd30bc383d55f044374a86795311f32fb9c8c176ad1a59fb99e94b4',175,115],
 'companion.png':['a3a90ba5e5856ad9ef17f787fea09979a4aebec48f7b08569257d15447e54dbd',452,305],
 'mega.png':['9ee78d08c4a553b767353423707db3659f0cfab13615bfb47bc23d80f7974d36',453,328],
 'manifest.json':['d2acb0743ef469efd75691825a0787fab491e3512f4351476e08d368d391f724'],
 'fossil.png':['8f0dcff9691f4b4b0b9302f3d3a5f57217ee8e27c879fbd15249a07ab8f3afc4',457,415],
 'support.png':['dcd3441fc32abd34f7c15500ccd7324dffeca5318de12c4c18266ab7e17c485a',451,303],
 'backdrop.png':['b4ecaa52975ca1351b9812ced36a335bbeaa0a8eb71622c46433b8c31248528b',1500,1049]
};
async function verify(dir){
 const files={};
 for(const [name,[hash,w,h]] of Object.entries(expected)){
  const data=fs.readFileSync(path.join(dir,name));
  if(crypto.createHash('sha256').update(data).digest('hex')!==hash)throw Error('Unapproved asset: '+name);
  if(w){const m=await sharp(data).metadata();if(m.width!==w||m.height!==h||m.format!=='png')throw Error('Invalid image: '+name);}
  files[name]=data;
 }
 const m=JSON.parse(files['manifest.json']);
 if(m.readyForFurnitureSwap!==false||m.layers.length!==6||m.labels.length!==5)throw Error('Invalid V3 registry');
 return files;
}
async function main(){
 const arg=process.argv[2];if(!arg)throw Error('Provide extracted ZIP folder');
 const source=path.resolve(arg,'assets/coop-lab/research-v3'),dest=path.resolve(__dirname,'../assets/coop-lab/research-v3');
 const files=await verify(source);
 fs.mkdirSync(dest,{recursive:true});
 for(const [name,data] of Object.entries(files))fs.writeFileSync(path.join(dest,name),data);
 console.log('Approved V3 pack imported: 6 layers + backdrop + manifest; QA only');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={verify,expected};
