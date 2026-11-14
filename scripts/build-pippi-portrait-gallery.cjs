'use strict';
/* One-file offline QA gallery using exact pinned PNG bytes; no raw.github CDN,
 * image hotlinks, external fonts or any network calls at viewing time.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PORTRAITS,PIN,blobSha}=require('./fetch-pippi-pmd.cjs');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'assets','pippi-pmd','portrait');
const out=path.join(root,'dist','pippi','Pippi-16-portraits-OFFLINE.html');
const names={
 'Normal':'Bình thường','Happy':'Vui vẻ','Joyous':'Hạnh phúc','Determined':'Quyết tâm',
 'Angry':'Tức giận','Crying':'Khóc nhè','Dizzy':'Chóng mặt','Inspired':'Lóe sáng',
 'Pain':'Đau đớn','Sad':'Buồn bã','Shouting':'La hét','Sigh':'Thở dài',
 'Stunned':'Đơ người','Surprised':'Giật mình','Teary-Eyed':'Rưng rưng','Worried':'Lo lắng'
};
const tiles=[];
for(const [filename,sha] of Object.entries(PORTRAITS)){
 const bytes=fs.readFileSync(path.join(dir,filename));
 if(blobSha(bytes)!==sha)throw Error('Portrait verification failed: '+filename);
 if(bytes.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error('Invalid PNG: '+filename);
 const en=filename.slice(0,-4);
 tiles.push('<article class="item"><div class="pic"><img width="40" height="40" alt="'+names[en]+
 '" src="data:image/png;base64,'+bytes.toString('base64')+'"></div>'+
 '<strong>'+names[en]+'</strong><small>'+en+'</small></article>');
}
if(tiles.length!==16)throw Error('Expected 16 Pippi portraits, got '+tiles.length);
const html=`<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pippi — 16 portrait gốc (offline)</title>
<style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#17151e;color:#ffeff8;
font:15px/1.5 system-ui,Arial,sans-serif}main{max-width:850px;margin:0 auto}
h1{color:#ffd7e9;font-size:clamp(22px,3.8vw,32px);margin:0 0 8px}
p{color:#c7bcca;margin:0 0 22px}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.item{background:#292330;border:1px solid #60485e;border-radius:14px;text-align:center;padding:15px 5px 12px}
.pic{height:118px;display:grid;place-items:center}
.pic img{width:100px;height:100px;object-fit:contain;image-rendering:pixelated}
strong,small{display:block}small{color:#cfacbf;margin-top:4px}
footer{color:#bda6b5;font-size:12px;margin-top:22px}
@media(max-width:520px){body{padding:14px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}}
</style></head><body><main><h1>Pippi / Clefairy — 16 biểu cảm</h1>
<p>Ảnh gốc thật từ PMDCollab #035. Tất cả dữ liệu ảnh được nhúng trực tiếp vào HTML,
mở offline trên điện thoại hoặc máy tính không cần kết nối mạng.</p>
<div class="grid">${tiles.join('\n')}</div>
<footer>Nguồn: PMDCollab / SpriteCollab, bản mã ${PIN}. Ghi công CHUNSOFT và ESTELSTARLIGHT.
Dùng theo điều kiện phi thương mại và ghi công của kho nguồn.</footer>
</main></body></html>`;
if(!html.includes('data:image/png;base64,'))throw Error('Expected embedded PNG data');
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html);
console.log('Verified offline portrait HTML gallery: 16/16 PNG; bytes='+Buffer.byteLength(html)+'; sha256='+crypto.createHash('sha256').update(html).digest('hex'));
