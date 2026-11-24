'use strict';
/* Art restoration workbench — extract ORIGINAL painted furniture pixels.
 *
 * 960x672 hand-painted WebP is FLATTENED. This process creates real separate
 * transparent furniture layers, using masks traced against that exact image.
 * It deliberately does not invent the wall/floor behind those objects.
 *
 * Extracted layers are SOURCE MATERIAL, not ready-to-equip assets until the
 * occluded wall/floor has been reconstructed and an art QA has approved it.
 * The actual playable QA room keeps the original beautiful composition.
 *
 * Usage: node scripts/extract-research-layers.cjs [output directory]
 * Dependencies: sharp already in package.json; no network or AI required.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const input=path.join(root,'assets/coop-lab/room_art_qa_v2.webp');
const out=path.resolve(process.argv[2]||path.join(root,'dist/research-source-layers'));
const canvas={width:960,height:672};
const pieces=[
 {id:'restoration_chamber',name:'Máy phục nguyên',rect:[329,135,304,305],
  polygon:[[418,143],[543,143],[566,168],[600,179],[624,245],[620,334],
   [633,378],[617,411],[580,424],[550,439],[404,439],[355,420],
   [337,383],[341,309],[341,231],[368,184]]},
 {id:'support_shelf',name:'Kệ mẫu hóa thạch',rect:[43,189,286,216],
  polygon:[[69,190],[122,192],[134,202],[304,199],[319,216],
   [321,335],[310,382],[66,391],[59,343],[60,290],[47,273],[43,234]]},
 {id:'mega_desk',name:'Bàn nghiên cứu Mega',rect:[628,177,303,218],
  polygon:[[665,188],[755,185],[834,195],[912,190],[925,242],
   [930,374],[907,386],[658,392],[631,356],[636,289],[634,228]]},
 {id:'berry_garden',name:'Góc cây Berry',rect:[18,373,261,247],
  polygon:[[46,405],[35,389],[58,377],[115,398],[146,430],
   [187,444],[222,459],[251,497],[263,568],[250,602],
   [211,618],[58,619],[29,601],[21,545],[25,473]]},
 {id:'companion_pedestal',name:'Bệ Bạn đồng hành',rect:[681,470,226,150],
  polygon:[[733,479],[835,478],[864,493],[891,509],[903,570],
   [882,604],[720,614],[685,582],[689,504]]},
 {id:'fossil_display',name:'Khay hóa thạch',rect:[165,380,182,107],
  polygon:[[181,401],[207,389],[320,389],[336,408],[337,456],
   [317,479],[184,481],[166,459],[170,413]]},
 {id:'right_terminal',name:'Máy tính phụ',rect:[724,387,192,111],
  polygon:[[739,399],[867,393],[904,404],[916,426],[899,478],
   [869,489],[746,489],[730,469],[728,420]]},
 {id:'plaque_left',name:'Khung tranh trái',rect:[116,72,216,136],
  polygon:[[137,90],[174,86],[208,85],[279,84],[315,105],
   [321,161],[305,182],[142,185],[120,171],[119,119]]},
 {id:'plaque_right',name:'Khung tranh phải',rect:[617,70,215,139],
  polygon:[[643,90],[688,86],[735,84],[805,88],[823,104],
   [829,166],[811,190],[642,187],[620,166],[620,113]]}
];
function maskFor(spec){
 const [left,top,width,height]=spec.rect;
 const vertices=spec.polygon.map(([x,y])=>(x-left)+','+(y-top)).join(' ');
 return Buffer.from('<svg width="'+width+'" height="'+height+'" xmlns="http://www.w3.org/2000/svg">'+
  '<polygon points="'+vertices+'" fill="white" />'+'</svg>');
}
async function main(){
 const src=fs.readFileSync(input);
 const meta=await sharp(src).metadata();
 if(meta.width!==canvas.width||meta.height!==canvas.height)
  throw Error('Source art changed; masks need retracing: '+meta.width+'x'+meta.height);
 if(crypto.createHash('sha256').update(src).digest('hex')!==
    '2b3e5295ae0a291dfc21fa6741eebf72d69ba05c1614f128545b1e750a1b6b44')
  throw Error('Unexpected original source hash: refusing to cut wrong artwork');
 fs.mkdirSync(out,{recursive:true});
 const manifest={source:'room_art_qa_v2.webp',sourceSha256:crypto.createHash('sha256').update(src).digest('hex'),
  canvas,kind:'original-source-alpha-cutouts',
  readyForFurnitureSwap:false,requires:'manual restoration of occluded background, alpha-edge art QA',
  layers:[]};
 // Assign each original pixel to exactly one foreground layer. Frontmost
 // masks win; no duplicate edge pixels remain on neighboring sprites.
 const count=canvas.width*canvas.height;
 const owner=new Int16Array(count).fill(-1),removed=new Uint8Array(count);
 const {data:raw,info:ri}=await sharp(src).removeAlpha().raw()
  .toBuffer({resolveWithObject:true});
 if(ri.channels!==3)throw Error('Unexpected room RGB channels');
 for(const [index,part] of pieces.entries()){
  const [left,top,w,h]=part.rect;
  const {data:mask,info:mi}=await sharp(maskFor(part)).ensureAlpha().raw()
   .toBuffer({resolveWithObject:true});
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)
   if(mask[(y*w+x)*mi.channels+mi.channels-1]>127){
    const at=(top+y)*canvas.width+left+x;
    owner[at]=index;removed[at]=1;
   }
 }
 for(const [index,p] of pieces.entries()){
  const [left,top,width,height]=p.rect,file=p.id+'.png';
  const rgba=Buffer.alloc(width*height*4);
  let pixels=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const at=(top+y)*canvas.width+left+x;
   if(owner[at]!==index)continue;
   const dst=(y*width+x)*4;
   rgba[dst]=raw[at*3];rgba[dst+1]=raw[at*3+1];rgba[dst+2]=raw[at*3+2];rgba[dst+3]=255;pixels++;
  }
  if(!pixels)throw Error('Empty furniture layer '+p.id);
  const buff=await sharp(rgba,{raw:{width,height,channels:4}}).png({compressionLevel:9}).toBuffer();
  fs.writeFileSync(path.join(out,file),buff);
  manifest.layers.push({id:p.id,label:p.name,rectangle:p.rect,file,alphaMask:p.polygon,
   readyForFurnitureSwap:false,pixels,bytes:buff.length});
 }
 // Reconstruct ONLY obscured pixels of the background, still draft art.
 const nearest=new Int32Array(count).fill(-1),queue=new Int32Array(count);
 let head=0,tail=0;
 for(let i=0;i<count;i++)if(!removed[i]){nearest[i]=i;queue[tail++]=i;}
 while(head<tail){
  const i=queue[head++],x=i%canvas.width,y=(i-x)/canvas.width;
  const add=n=>{if(nearest[n]===-1){nearest[n]=nearest[i];queue[tail++]=n;}};
  if(x>0)add(i-1);
  if(x+1<canvas.width)add(i+1);
  if(y>0)add(i-canvas.width);
  if(y+1<canvas.height)add(i+canvas.width);
 }
 const clean=Buffer.from(raw),channels=ri.channels;
 for(let i=0;i<count;i++)if(removed[i]){
  const a=nearest[i]*channels,b=i*channels;
  for(let c=0;c<channels;c++)clean[b+c]=raw[a+c];
 }
 const smooth=await sharp(clean,{raw:{width:canvas.width,height:canvas.height,channels}})
  .blur(8).raw().toBuffer();
 for(let i=0;i<count;i++)if(removed[i]){
  const offset=i*channels;
  for(let c=0;c<channels;c++)clean[offset+c]=smooth[offset+c];
 }
 // Five independently replaceable semantic props from the original game atlas.
 // Trim transparent gutters before placement; preserve the original pixels.
 const atlas=path.join(root,'assets/research-station-icons.png');
 const am=await sharp(atlas).metadata();
 if(am.width%5!==0||am.width/5!==am.height)throw Error('Unexpected five-cell station atlas');
 manifest.stationProps=[];
 for(const [index,id] of ['support','mega','berry','companion','fossil'].entries()){
  const cell=await sharp(atlas).extract({left:index*am.height,top:0,width:am.height,height:am.height})
   .ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let x0=am.height,y0=am.height,x1=-1,y1=-1;
  for(let y=0;y<am.height;y++)for(let x=0;x<am.height;x++)
   if(cell.data[(y*am.height+x)*4+3]>0){
    x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
   }
  if(x1<x0)throw Error('Empty research prop '+id);
  const file='prop-'+id+'.png';
  const buf=await sharp(cell.data,{raw:cell.info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1})
   .png().toBuffer();
  fs.writeFileSync(path.join(out,file),buf);
  manifest.stationProps.push({id,file,width:x1-x0+1,height:y1-y0+1});
 }
 const backdrop='clean-backdrop.png';
 fs.writeFileSync(path.join(out,backdrop),await sharp(clean,{raw:{
  width:canvas.width,height:canvas.height,channels}}).png().toBuffer());
 // Decode and recomposite actual emitted PNG bytes, verifying no overlaps
 // and no visual changes in the complete original composition.
 const rebuilt=Buffer.from(clean),covered=new Uint8Array(count);
 for(const part of manifest.layers){
  const [left,top,w,h]=part.rectangle;
  const layer=await sharp(path.join(out,part.file)).ensureAlpha().raw().toBuffer();
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const at=(top+y)*canvas.width+left+x,k=(y*w+x)*4;
   if(!layer[k+3])continue;
   if(layer[k+3]!==255||covered[at])throw Error('Overlapping or nonbinary layer '+part.id);
   covered[at]=1;
   for(let c=0;c<3;c++)rebuilt[at*3+c]=layer[k+c];
  }
 }
 if(!rebuilt.equals(raw))throw Error('Original room reconstruction is not pixel exact');
 manifest.pixelExactReassembly=true;
 manifest.overlappingLayerPixels=0;
 fs.writeFileSync(path.join(out,'room-reference.webp'),src);
 manifest.originalRoom='room-reference.webp';
 manifest.cleanBackdrop=backdrop;
 manifest.readyForLayerPreview=true;
 manifest.readyForFurnitureSwap=false;
 manifest.backgroundRepair='Approximate original-scene inpaint: painter review required before swapping furniture';

 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('Original research layers extracted: '+manifest.layers.length+
  ' source-preserving transparent PNGs to '+out+' (not yet equip-ready)');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={pieces,maskFor,canvas};
