'use strict';
/**
 * Opt-in, PRIVATE Windows PC QA for 4 genuine 4-direction OW Mega sheets.
 * Strictly disabled in every normal build. Images supplied by local tester,
 * NEVER committed to source control or fetched during public CI.
 *
 * Usage (after setting PKMSVV_MEGA_4DIR_PC_QA=1):
 * PKMSVV_MEGA_4DIR_SOURCE_DIR=<absolute folder with 8 PNGs>
 * node scripts/patch-mega-4dir-pc-qa.cjs
 */
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const ROOT=path.resolve(__dirname,'..');
const FORMS=Object.freeze([
 {key:'scizormega',dex:212,filename:'scizor'},
 {key:'swampertmega',dex:260,filename:'swampert'},
 {key:'garchompmega',dex:445,filename:'garchomp'},
 {key:'dragonitemega',dex:149,filename:'dragonite'}
]);
const EIGHT_TO_FOUR=Object.freeze([0,0,2,3,3,3,1,0]);
// PMD target dir: down,SE,E,NE,up,NW,W,SW.
// Source four rows: front,left,right,back. No fake diagonal drawings.
const sourceName=(form,variant)=>form.filename+'-'+variant+'.png';
function virtualId(form,catalog){
 const siblings=catalog.forms.filter(f=>f.dex===form.dex).map(f=>f.name).sort();
 const current=catalog.forms.find(f=>f.showdownKey===form.key);
 if(!current)throw Error('Missing Mega catalog form '+form.key);
 const n=siblings.indexOf(current.name);
 if(n<0||n>=4)throw Error('Bad virtual Mega slot '+form.key);
 return 10000+form.dex+n*10000;
}
async function validateSource(folder){
 const validated=[];
 for(const form of FORMS){
  for(const variant of ['normal','shiny']){
   const file=path.join(folder,sourceName(form,variant));
   if(!fs.existsSync(file))throw Error('Missing private QA art: '+file);
   const info=await sharp(file).metadata();
   if(info.format!=='png'||info.width!==384||info.height!==384)
    throw Error('Expected PA2.1 384x384 RGBA PNG: '+file);
   const {data,info:rawInfo}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   if(rawInfo.channels!==4)throw Error('Unexpected pixel channels '+file);
   for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    let visible=false;
    outer:for(let y=row*96;y<(row+1)*96;y++)for(let x=col*96;x<(col+1)*96;x++){
     if(data[(y*384+x)*4+3]>0){visible=true;break outer;}
    }
    if(!visible)throw Error('Empty source Walk frame '+form.key+'/'+variant+' row='+row+' col='+col);
   }
   validated.push({form,variant,file});
  }
 }
 return validated;
}
function replacement(metaFile,catalogFile,spritesFile,catalog,validated,artRoot){
 const meta={w:96,h:96,n:4,r:4,d:[8,8,8,8],ax:48,ay:79,pkmsvv4dir:true};
 const keyIds=FORMS.map(f=>({key:f.key,spriteId:virtualId(f,catalog)}));
 for(const {form,variant,file} of validated){
  const id=virtualId(form,catalog),dir=path.join(artRoot,String(id),variant==='shiny'?'s':'');
  fs.mkdirSync(dir,{recursive:true});
  // First-party game always asks for Walk and Idle; Idle temporarily uses
  // the original Walk sheet, NOT a newly invented standing animation.
  fs.copyFileSync(file,path.join(dir,'Walk.png'));
  fs.copyFileSync(file,path.join(dir,'Idle.png'));
  fs.writeFileSync(path.join(dir,'CREDITS-QA-NOT-FOR-REDISTRIBUTION.txt'),
   'QA-only 4 cardinal directions; no verified battle animation.\nOriginal: Willøw Eevee Expo OW pack and credited contributors.\nDo not distribute without original author permission.\n');
 }
 let ext='\n/* LOCAL PC QA ONLY: Four-direction Mega overworld previews. */\n';
 for(const {key,spriteId} of keyIds){
  const m={s:1,sh:true,a:{Idle:meta,Walk:meta},sa:{Idle:meta,Walk:meta},pkmsvv4dir:true};
  ext+='G.SPRITE_META['+spriteId+']='+JSON.stringify(m)+';\n';
 }
 ext+='G.PKMSVV_MEGA_4DIR_QA='+JSON.stringify({enabled:true,forms:FORMS.map(x=>x.key),
   label:'LOCAL PC QA ONLY — four cardinal directions; missing combat art'})+';\n';
 fs.appendFileSync(metaFile,ext,'utf8');
 fs.appendFileSync(catalogFile,'\n/* Four-direction PC QA artwork only, not certified battle-ready. */\n'+
  'for(const f of (G.PKMSVV_MEGA_CATALOG||[]))'+
  'if(G.PKMSVV_MEGA_4DIR_QA?.enabled&&G.PKMSVV_MEGA_4DIR_QA.forms.includes(f.key))'+
  '{f.artReady=true;f.qa4dir=true;}\n','utf8');
 const original=fs.readFileSync(spritesFile,'utf8');
 const anchor='const row = Math.min(this.dir, m.r - 1);';
 if(original.split(anchor).length!==2)throw Error('Sprite animator upstream changed; refusing 4-way patch');
 fs.writeFileSync(spritesFile,original.replace(anchor,
  'const row = m.pkmsvv4dir ? [0,0,2,3,3,3,1,0][((this.dir % 8) + 8) % 8] : Math.min(this.dir, m.r - 1);'),
  'utf8');
 return keyIds;
}
async function install(opts={}){
 if(process.env.PKMSVV_MEGA_4DIR_PC_QA!=='1')return {enabled:false};
 const root=opts.root||ROOT, vendor=opts.vendor||path.join(root,'vendor','pokesurvivor');
 const source=opts.source||process.env.PKMSVV_MEGA_4DIR_SOURCE_DIR;
 if(!source||!path.isAbsolute(source))
  throw Error('Set absolute PKMSVV_MEGA_4DIR_SOURCE_DIR to 8 private PA2.1 sheets');
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','mega-source-catalog.json'),'utf8'));
 const metaFile=path.join(vendor,'js','data','pkmsvv-mega-sprite-meta.js');
 const catalogFile=path.join(vendor,'js','data','pkmsvv-mega-catalog.js');
 const spritesFile=path.join(vendor,'js','core','sprites.js');
 for(const f of [metaFile,catalogFile,spritesFile])if(!fs.existsSync(f))throw Error('Prepare game first: '+f);
 const validated=await validateSource(source); // fail fully before touching vendor
 const result=replacement(metaFile,catalogFile,spritesFile,catalog,validated,path.join(vendor,'assets','pokemon'));
 console.log('LOCAL PC QA ONLY: imported 8 private original OW sheets, 4 Mega forms. No Gacha/save unlock changes.');
 return {enabled:true,forms:result};
}
if(require.main===module)install().catch(e=>{console.error(e);process.exitCode=1});
module.exports={FORMS,EIGHT_TO_FOUR,sourceName,virtualId,validateSource,install};
