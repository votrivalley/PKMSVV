'use strict';
// Read-only audit of public release metadata. No account, source execution,
// protected endpoint, game bundle import or third-party asset redistribution.
const fs=require('node:fs'),crypto=require('node:crypto');
const ORIGIN='https://pokesurvivor.com';
const MAX=25*1024*1024;
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
function bundleUrls(html){
 const urls=new Set();
 for(const m of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi)){
  const raw=(m[1]||m[2]||m[3]).replace(/&amp;/g,'&');
  try{const u=new URL(raw,ORIGIN+'/');if(u.origin===ORIGIN&&/\/app(?:\.min)?\.js$/.test(u.pathname))urls.add(u.href);}catch(_){}
 }
 return [...urls];
}
function inspect(text){
 const counts={};
 for(const word of ['gigantamax','gigamax','g-max','gmax','wildfire','volt crash','reloaded','spritemeta','sprite_meta','stellar','eternamax']){
  const needle=word.toLowerCase();let i=0,n=0,hay=text.toLowerCase();while((i=hay.indexOf(needle,i))!==-1){n++;i+=needle.length;}counts[word]=n;
 }
 const refs=new Set();
 for(const m of text.matchAll(/["'`]([^"'\x60\s]{1,300}(?:gigantamax|gigamax|gmax|g-max|reloaded)[^"'\x60\s]{0,200}\.(?:png|webp|json|js))(?:\?[^"'\x60\s]{0,100})?["'`]/gi)){
  const v=m[1];try{const u=new URL(v,ORIGIN+'/');if(u.origin===ORIGIN&&/\.(png|webp|json|js)$/i.test(u.pathname))refs.add(u.pathname);}catch(_){}
 }
 return {counts,explicitLocalAssetReferences:[...refs].slice(0,100),note:'Literal-only audit; absence of a word in minified code is not proof of absence. No executable source or sprite bytes are exported.'};
}
async function read(url){
 const u=new URL(url);if(u.origin!==ORIGIN)throw Error('Off-origin '+u.origin);
 const res=await fetch(u,{redirect:'manual',signal:AbortSignal.timeout(45000)});
 if(!res.ok)throw Error(u.pathname+' HTTP '+res.status);
 const declared=Number(res.headers.get('content-length')||0);
 if(declared>MAX)throw Error('Response too large');
 const chunks=[];let size=0;
 for await(const chunk of res.body){size+=chunk.length;if(size>MAX)throw Error('Response too large');chunks.push(Buffer.from(chunk));}
 const b=Buffer.concat(chunks);return {body:b.toString('utf8'),bytes:b.length,sha256:sha256(b),contentType:res.headers.get('content-type'),lastModified:res.headers.get('last-modified')};
}
async function main(){
 const out='dist/pokesurvivor-web-gmax-audit';fs.mkdirSync(out,{recursive:true});
 const report={origin:ORIGIN,checkedAt:new Date().toISOString(),licenseStatus:'Code license per official legal page: PolyForm Noncommercial 1.0.0. Third-party G-Max sprite permissions require separate verification.',sourceReady:false,assetReady:false};
 try{
  const index=await read(ORIGIN+'/');
  report.index={bytes:index.bytes,sha256:index.sha256,lastModified:index.lastModified};
  try{const v=await read(ORIGIN+'/version.json');report.version={data:JSON.parse(v.body),sha256:v.sha256};}catch(e){report.versionError=String(e);}
  const urls=bundleUrls(index.body);report.bundleUrls=urls;
  if(urls.length!==1)throw Error('Expected one public app bundle reference; inspect index manually');
  const b=await read(urls[0]);
  if(!/javascript|ecmascript|text\/plain|application\/octet-stream/i.test(b.contentType||''))throw Error('Unexpected bundle content type '+b.contentType);
  report.bundle={url:urls[0],bytes:b.bytes,sha256:b.sha256,lastModified:b.lastModified,inspection:inspect(b.body)};
 }catch(e){report.error=String(e);process.exitCode=1;}
 fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');
 console.log('POKESURVIVOR_PUBLIC_WEB_AUDIT='+JSON.stringify(report));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={bundleUrls,inspect};
