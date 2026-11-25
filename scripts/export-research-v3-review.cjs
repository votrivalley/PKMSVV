'use strict';
// QA only: verify the approved pack, export true V3 art and omission previews.
// A pixel/geometry PASS is NOT approval of the reconstructed empty room.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require('sharp');
const {verify}=require('./import-research-v3.cjs');
async function main(){
 const source=path.resolve(__dirname,'../assets/coop-lab/research-v3');
 const dest=path.resolve(process.argv[2]||'dist/research-v3-art-review');
 const files=await verify(source),m=JSON.parse(files['manifest.json']);
 const {width,height}=m.canvas;
 fs.mkdirSync(dest,{recursive:true});
 for(const [name,bytes] of Object.entries(files))fs.writeFileSync(path.join(dest,name),bytes);
 const occupancy=new Uint8Array(width*height),masks=new Map();
 let overlap=0;
 for(const l of m.layers){
  const {data,info}=await sharp(files[l.file]).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.channels,4);assert.equal(info.width,l.w);assert.equal(info.height,l.h);
  let count=0;const mask=new Uint8Array(width*height);
  for(let y=0;y<l.h;y++)for(let x=0;x<l.w;x++){
   if(!data[(y*l.w+x)*4+3])continue;
   const i=(y+l.y)*width+x+l.x;
   if(occupancy[i]++)overlap++;
   mask[i]=1;count++;
  }
  assert.ok(count>0,'Empty sprite: '+l.id);
  masks.set(l.id,{mask,count});
 }
 assert.equal(overlap,0,'V3 sprite overlap');
 const render=omit=>sharp(files[m.background]).ensureAlpha().composite(m.layers.filter(l=>l.id!==omit).map(l=>({input:files[l.file],left:l.x,top:l.y}))).png().toBuffer();
 const all=await render(null);
 fs.writeFileSync(path.join(dest,'all.png'),all);
 const raw=b=>sharp(b).ensureAlpha().raw().toBuffer();
 const baseline=await raw(all),checks=[];
 for(const l of m.layers){
  const omitted=await render(l.id);
  fs.writeFileSync(path.join(dest,'without-'+l.id+'.png'),omitted);
  const bytes=await raw(omitted),{mask,count}=masks.get(l.id);
  let changed=0,outside=0;
  for(let i=0;i<mask.length;i++){
   const j=i*4;
   if(bytes[j]===baseline[j]&&bytes[j+1]===baseline[j+1]&&bytes[j+2]===baseline[j+2]&&bytes[j+3]===baseline[j+3])continue;
   changed++;if(!mask[i])outside++;
  }
  assert.equal(outside,0,'Omission changes another area: '+l.id);
  assert.ok(changed>0,'Omission has no visual effect: '+l.id);
  checks.push({id:l.id,alphaPixels:count,changedPixels:changed,outsideChangedPixels:outside});
 }
 const report={status:'PASS',scope:'asset identity, alpha separation and independent omission only',visualBackdropReview:'REQUIRED',readyForFurnitureSwap:false,overlap,checks};
 fs.writeFileSync(path.join(dest,'art-review.json'),JSON.stringify(report,null,2));
 const options=[['all.png','Đầy đủ nội thất'],['backdrop.png','Nền trống'],...m.layers.map(l=>['without-'+l.id+'.png','Tháo '+l.label])];
 const html='<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PKMSVV V3 — QA nền phòng</title><style>body{margin:20px auto;padding:0 16px;max-width:1100px;background:#102a35;color:#f4e2bd;font:16px system-ui}img{display:block;width:100%;height:auto;border:1px solid #a58a52;border-radius:8px}button{font:inherit;padding:9px 12px;margin:3px;cursor:pointer}p{line-height:1.5}</style><h1>Phòng nghiên cứu V3 — QA nội thất</h1><p>Ảnh dựng từ PNG thực tế, không dùng concept. Nền trống chưa được duyệt; không mở mua hoặc thay skin.</p><nav>'+options.map(([f,t])=>'<button type="button" data-file="'+f+'">'+t+'</button>').join('')+'</nav><p id="caption">Đầy đủ nội thất</p><img id="preview" src="all.png" alt="Ảnh phòng nghiên cứu V3"><script>document.querySelectorAll("button[data-file]").forEach(b=>b.onclick=()=>{document.getElementById("preview").src=b.dataset.file;document.getElementById("caption").textContent=b.textContent;});</script></html>';
 fs.writeFileSync(path.join(dest,'index.html'),html);
 console.log('V3 exact asset identity and independent omission PASS; visual background approval remains blocked');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
