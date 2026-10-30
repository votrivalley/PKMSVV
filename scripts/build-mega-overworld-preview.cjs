'use strict';
/* Private QA only: inspect genuine 4-direction overworld sprites.
 * NEVER writes vendor assets, changes Mega unlocks, or marks sprites battle-ready. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const FORMS=['scizor','swampert','garchomp','dragonite'];
const VARIANTS=['normal','shiny'];
const DIRECTIONS=['front','left','right','back'];
function normalizeSpec(name,variant,width,height){
  if(width===256&&height===256)return {extendRight:0,sourceSize:[width,height]};
  if(name==='garchomp'&&variant==='shiny'&&width===254&&height===256)
    return {extendRight:2,sourceSize:[width,height]};
  throw Error('Unexpected PNG size for '+name+'/'+variant+': '+width+'x'+height);
}
async function inspectOne(file,out,name,variant){
  const info=await sharp(file).metadata();
  if(info.format!=='png')throw Error('Only PNG sources supported: '+file);
  const spec=normalizeSpec(name,variant,info.width,info.height);
  let pipeline=sharp(file).ensureAlpha();
  if(spec.extendRight)pipeline=pipeline.extend({top:0,bottom:0,left:0,right:spec.extendRight,background:'#00000000'});
  const png=await pipeline.png().toBuffer();
  const raw=await sharp(png).raw().toBuffer({resolveWithObject:true});
  if(raw.info.width!==256||raw.info.height!==256||raw.info.channels!==4)throw Error('Bad normalized RGBA sheet');
  const unique=[];
  for(let row=0;row<4;row++){
    const hashes=[];
    for(let col=0;col<4;col++){
      const cell=Buffer.alloc(64*64*4);
      for(let y=0;y<64;y++){
        const off=((row*64+y)*256+col*64)*4;
        raw.data.copy(cell,y*64*4,off,off+64*4);
      }
      hashes.push(crypto.createHash('sha256').update(cell).digest('hex'));
    }
    unique.push(new Set(hashes).size);
  }
  fs.mkdirSync(out,{recursive:true});
  const filename=name+'-'+variant+'.png';
  fs.writeFileSync(path.join(out,filename),png);
  return {file:filename,source:path.basename(file),sourceSize:spec.sourceSize,
    normalizedSize:[256,256],paddedTransparentRightPx:spec.extendRight,
    tileSize:64,rows:DIRECTIONS,framesPerRow:4,uniqueFramesPerRow:unique,
    gameplayReady:false,battleReady:false};
}
async function build(input,out){
  const result={format:'pkmsvv-mega-overworld-qa-only',version:1,
    source:'Willøw / Eevee Expo; original sprite authors in source Credits',
    permissionVerified:false,redistributionApproved:false,battleReady:false,
    missing:['4 diagonal walking directions','separate Idle','Attack','Shoot','Charge','Hurt','Faint'],
    forms:{}};
  for(const name of FORMS){
    result.forms[name]={};
    for(const variant of VARIANTS){
      const file=path.join(input,name+'_'+variant+'.png');
      if(!fs.existsSync(file))throw Error('Missing original source: '+file);
      result.forms[name][variant]=await inspectOne(file,out,name,variant);
    }
  }
  fs.writeFileSync(path.join(out,'qa-manifest.json'),JSON.stringify(result,null,2));
  return result;
}
if(require.main===module){
  const a=process.argv.indexOf('--input'),b=process.argv.indexOf('--out');
  if(a<0||b<0||!process.argv[a+1]||!process.argv[b+1]){
    console.error('Usage: node scripts/build-mega-overworld-preview.cjs --input <source_folder> --out <scratch_folder>');
    process.exitCode=2;
  }else build(path.resolve(process.argv[a+1]),path.resolve(process.argv[b+1]))
    .then(()=>console.log('4 four-direction preview candidates audited. No gameplay forms unlocked.'))
    .catch(e=>{console.error(e);process.exitCode=1;});
}
module.exports={FORMS,VARIANTS,DIRECTIONS,normalizeSpec,inspectOne,build};