'use strict';
// Read-only pinned-source G-Max audit. No assets are registered in gameplay.
const fs=require('node:fs'),path=require('node:path');
const REV='8e7588b720b3433198e8a25c7bd9c06732056702';
const BASE='https://raw.githubusercontent.com/PMDCollab/SpriteCollab/'+REV+'/';
const TARGETS=[['0006','Charizard'],['0025','Pikachu']];
const ACTIONS=['Idle','Walk','Attack','Hurt','Shoot','Charge','Faint'];
const isGmax=n=>/^(gigantamax|gmax|g-max)$/i.test(String(n||'').trim());
function forms(tracker,dex){return Object.entries(tracker?.[dex]?.subgroups||{}).filter(([,v])=>isGmax(v.name));}
function parse(xml){const out={};for(const [,b] of xml.matchAll(/<Anim>([\s\S]*?)<\/Anim>/g)){const tag=n=>b.match(new RegExp('<'+n+'>([^<]+)</'+n+'>'))?.[1];const n=tag('Name');if(n)out[n]={name:n,copy:tag('CopyOf'),w:Number(tag('FrameWidth')),h:Number(tag('FrameHeight')),dur:[...b.matchAll(/<Duration>(\d+)<\/Duration>/g)].map(m=>Number(m[1]))};}return out;}
function resolve(all,n,seen=new Set()){if(seen.has(n)||!all[n])return null;seen.add(n);return all[n].copy?resolve(all,all[n].copy,seen):all[n];}
async function fetchFile(rel,optional=false){const res=await fetch(BASE+rel,{signal:AbortSignal.timeout(60000)});if(optional&&res.status===404)return null;if(!res.ok)throw Error(rel+' HTTP '+res.status);return Buffer.from(await res.arrayBuffer());}
function pngSize(b){if(!b||b.length<24||b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||b.toString('ascii',12,16)!=='IHDR')return null;return [b.readUInt32BE(16),b.readUInt32BE(20)];}
async function inspect(folder,node,outDir){
 const xml=await fetchFile(folder+'/AnimData.xml',true),credits=await fetchFile(folder+'/credits.txt',true);
 const all=xml?parse(xml.toString('utf8')):{},result=[];
 for(const action of ACTIONS){
  const a=resolve(all,action);
  if(!a||!a.w||!a.h||!a.dur.length){result.push({action,ok:false,reason:'missing XML frames'});continue;}
  const file=await fetchFile(folder+'/'+a.name+'-Anim.png',true),size=pngSize(file);
  const cols=size?size[0]/a.w:0,rows=size?size[1]/a.h:0;
  const ok=!!size&&Number.isInteger(cols)&&cols>=a.dur.length&&rows===8&&a.dur.every(d=>d>0);
  if(ok){fs.mkdirSync(outDir,{recursive:true});fs.writeFileSync(path.join(outDir,action+'.png'),file);}
  result.push({action,source:a.name,frame:[a.w,a.h],sheet:size,rows,cols,durations:a.dur,ok});
 }
 const creditText=credits?.toString('utf8')||'';
 if(credits&&creditText.trim()){fs.mkdirSync(outDir,{recursive:true});fs.writeFileSync(path.join(outDir,'credits.txt'),creditText);}
 if(xml){fs.mkdirSync(outDir,{recursive:true});fs.writeFileSync(path.join(outDir,'AnimData.xml'),xml);}
 return {folder,declaredName:node?.name,spriteComplete:node?.sprite_complete||0,animations:result,credits:creditText,structuralCandidate:result.every(r=>r.ok)&&!!creditText.trim(),battleReady:false};
}
async function main(){
 const out=path.resolve('dist/gmax-source-audit');fs.mkdirSync(out,{recursive:true});
 const tracker=JSON.parse((await fetchFile('tracker.json')).toString('utf8')),results=[];
 for(const [dex,name] of TARGETS){
  const exact=forms(tracker,dex);if(exact.length!==1){results.push({dex,name,status:exact.length?'ambiguous':'missing exact Gigantamax form',availableForms:Object.entries(tracker?.[dex]?.subgroups||{}).map(([id,v])=>({id,name:v.name,complete:v.sprite_complete})),battleReady:false});continue;}
  const [code,node]=exact[0],folder='sprite/'+dex+'/'+code;
  const normal=await inspect(folder,node,path.join(out,dex,'normal'));
  const shinyNodes=Object.entries(node.subgroups||{}).filter(([,v])=>/^shiny$/i.test(String(v.name||'')));
  const shiny=shinyNodes.length===1?await inspect(folder+'/'+shinyNodes[0][0],shinyNodes[0][1],path.join(out,dex,'shiny')):null;
  results.push({dex,name,status:'exact form found',normal,shiny,battleReady:false});
 }
 const report={source:'PMDCollab/SpriteCollab',revision:REV,license:'CC BY-NC 4.0; check contributor credit and original rights before use',results,notice:'Structural checks only: requires manual pixel/alpha/offset review, attribution and game engine QA; no manifest or gameplay unlock written.'};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
 console.log('GMAX_SOURCE_AUDIT='+JSON.stringify(report));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={forms,parse,resolve,pngSize,isGmax};
