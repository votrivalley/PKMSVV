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
 {id:'support_shelf',name:'Kệ mẫu hóa thạch',rect:[43,191,286,214],
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
 for(const p of pieces){
  const [left,top,width,height]=p.rect;
  const mask=maskFor(p),file=p.id+'.png';
  const buff=await sharp(src).extract({left,top,width,height}).ensureAlpha()
   .composite([{input:mask,blend:'dest-in'}]).png({compressionLevel:9}).toBuffer();
  fs.writeFileSync(path.join(out,file),buff);
  manifest.layers.push({id:p.id,label:p.name,rectangle:p.rect,file,alphaMask:p.polygon,
   readyForFurnitureSwap:false,bytes:buff.length});
 }
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('Original research layers extracted: '+manifest.layers.length+
  ' source-preserving transparent PNGs to '+out+' (not yet equip-ready)');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={pieces,maskFor,canvas};
