'use strict';
// Validate the pinned 3DS sprite sheets; no external artwork is committed,
// published or registered. Export only JSON evidence and hashes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const inv=require('../data/mega-upstream-3ds-candidates.json');
const BASE='https://raw.githubusercontent.com/'+inv.source+'/'+inv.revision+'/';
const ACTIONS=['Idle','Walk','Attack','Shoot','Charge','Hurt','Faint'];
function inspectPng(bytes,m){
 if(!bytes||bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.toString('ascii',12,16)!=='IHDR')return {ok:false,reason:'invalid PNG header'};
 const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
 if(!m||!Number.isInteger(m.w)||!Number.isInteger(m.h)||m.w<=0||m.h<=0||!Number.isInteger(m.n)||m.n<=0||m.r!==8||!Array.isArray(m.d)||m.d.length!==m.n||m.d.some(x=>!Number.isFinite(x)||x<=0)||!Number.isFinite(m.ax)||!Number.isFinite(m.ay)||m.ax<0||m.ax>m.w||m.ay<0||m.ay>m.h)return {ok:false,w,h,reason:'invalid frame metadata'};
 const ok=w%m.w===0&&w/m.w>=m.n&&h===m.h*8;
 return {ok,w,h,frames:m.n,rows:h/m.h,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}
function classify(variants){
 const report={};
 for(const [variant,a] of Object.entries(variants)){
  const valid=ACTIONS.every(k=>a[k]?.ok),distinct=valid&&a.Walk.sha256!==a.Idle.sha256&&a.Attack.sha256!==a.Idle.sha256&&a.Attack.sha256!==a.Walk.sha256;
  const aliases=valid?ACTIONS.filter((k,i)=>ACTIONS.slice(0,i).some(j=>a[j].sha256===a[k].sha256)):[];
  report[variant]={valid,distinctCore:!!distinct,aliases,strictFull:!!distinct&&aliases.length===0};
 }
 return report;
}
const cache=new Map();
async function fetchBytes(rel){
 if(!/^assets-src\/pokemon\/\d+\/(?:s\/)?(?:Idle|Walk|Attack|Shoot|Charge|Hurt|Faint)\.png$/.test(rel))throw Error('Invalid pinned sheet '+rel);
 if(cache.has(rel))return cache.get(rel);
 const promise=(async()=>{for(let i=0;i<3;i++){try{const r=await fetch(BASE+rel,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('HTTP '+r.status);const b=Buffer.from(await r.arrayBuffer());if(b.length>8*1024*1024)throw Error('Oversized sprite');return b;}catch(e){if(i===2)throw e;await new Promise(r=>setTimeout(r,500*(i+1)));}}})();
 cache.set(rel,promise);return promise;
}
async function audit(f){
 if(!['spritecollab','web-reloaded'].includes(f.source))return {key:f.key,name:f.name,source:f.source,status:'excluded',gameplayReady:false};
 const variants={};
 for(const [v,sheets] of Object.entries(f.variants)){
  const a=variants[v]={};
  for(const k of ACTIONS){
   const s=sheets[k];if(!s?.present){a[k]={ok:false,reason:'missing pinned tree path',path:s?.sheet};continue;}
   try{a[k]={...inspectPng(await fetchBytes(s.sheet),s.meta),path:s.sheet,alias:s.meta.f||null};}
   catch(e){a[k]={ok:false,path:s.sheet,reason:String(e)};}
  }
 }
 const summary=classify(variants);
 const rights=f.source==='spritecollab'?'CC BY-NC 4.0 source; verify contributor credits and exact form':'Web/Reloaded; separate reuse permission not established';
 return {key:f.key,name:f.name,dex:f.dex,visualId:f.visualId,source:f.source,credit:f.credit,rights,variants,summary,gameplayReady:false};
}
async function main(){
 const out=path.resolve('dist/mega-3ds-source-audit');fs.mkdirSync(out,{recursive:true});
 let next=0;const results=[];
 await Promise.all(Array.from({length:5},async()=>{while(next<inv.forms.length){const f=inv.forms[next++];const r=await audit(f);results.push(r);console.log('MEGA_SOURCE_CANDIDATE='+JSON.stringify({key:r.key,source:r.source,summary:r.summary}));}}));
 results.sort((a,b)=>a.key.localeCompare(b.key));
 const counts={total:results.length,normalValid:results.filter(r=>r.summary?.normal?.valid).length,normalDistinctCore:results.filter(r=>r.summary?.normal?.distinctCore).length,normalStrict:results.filter(r=>r.summary?.normal?.strictFull).length,shinyValid:results.filter(r=>r.summary?.shiny?.valid).length,shinyDistinctCore:results.filter(r=>r.summary?.shiny?.distinctCore).length,shinyStrict:results.filter(r=>r.summary?.shiny?.strictFull).length};
 const report={revision:inv.revision,counts,results,notice:'PNG geometry/hash audit only. Distinct hashes are not visual proof. No asset redistribution, game registry or save changes.'};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
 console.log('MEGA_3DS_SOURCE_AUDIT='+JSON.stringify({counts,revision:inv.revision}));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={inspectPng,classify,fetchBytes};
