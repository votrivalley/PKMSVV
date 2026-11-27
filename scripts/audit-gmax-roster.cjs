'use strict';
// Pinned, read-only source discovery. Never installs art or enables gameplay.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {parse,resolve,pngSize}=require('./audit-gmax-source.cjs');
const REV='8e7588b720b3433198e8a25c7bd9c06732056702';
const BASE='https://raw.githubusercontent.com/PMDCollab/SpriteCollab/'+REV+'/';
const ROSTER=[[3,'Venusaur'],[6,'Charizard'],[9,'Blastoise'],[12,'Butterfree'],[25,'Pikachu'],[52,'Meowth'],[68,'Machamp'],[94,'Gengar'],[99,'Kingler'],[131,'Lapras'],[133,'Eevee'],[143,'Snorlax'],[569,'Garbodor'],[809,'Melmetal'],[812,'Rillaboom'],[815,'Cinderace'],[818,'Inteleon'],[823,'Corviknight'],[826,'Orbeetle'],[834,'Drednaw'],[839,'Coalossal'],[841,'Flapple'],[842,'Appletun'],[844,'Sandaconda'],[849,'Toxtricity'],[851,'Centiskorch'],[858,'Hatterene'],[861,'Grimmsnarl'],[869,'Alcremie'],[879,'Copperajah'],[884,'Duraludon'],[892,'Urshifu']];
const ACTIONS=['Idle','Walk','Attack','Hurt','Shoot','Charge','Faint'];
const key=id=>String(id).padStart(4,'0');
const isShiny=n=>/^shiny$/i.test(String(n||'').trim());
const isForm=n=>/^(?:(?:gigantamax|gmax|g-max)(?:[ -]+(?:single strike|rapid strike|amped|low key)(?: form| style)?)?|(?:single strike|rapid strike|amped|low key)(?: form| style)?[ -]+(?:gigantamax|gmax|g-max))$/i.test(String(n||'').trim());
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const children=node=>Object.entries(node?.subgroups||{}).filter(([k,v])=>/^\d{4}$/.test(k)&&v&&typeof v==='object').sort(([a],[b])=>a.localeCompare(b));
function findForms(node,parts=[],ancestors=[]){
  const out=[];
  for(const [id,child] of children(node)){
    if(isShiny(child.name))continue;
    const p=[...parts,id],names=[...ancestors,child.name||''];
    if(isForm(child.name))out.push({parts:p,names,node:child});
    // Never infer a form from a numeric ID or from an ambiguous substring.
    out.push(...findForms(child,p,names));
  }
  return out;
}
function checkSheet(anim,b){
  const sheet=pngSize(b);
  if(!anim||!Number.isInteger(anim.w)||!Number.isInteger(anim.h)||anim.w<=0||anim.h<=0||!anim.dur?.length||!anim.dur.every(d=>Number.isInteger(d)&&d>0))return {ok:false,reason:'invalid animation metadata',sheet};
  if(!sheet||!sheet[0]||!sheet[1])return {ok:false,reason:'missing or invalid PNG header',sheet};
  const cols=sheet[0]/anim.w,rows=sheet[1]/anim.h;
  const ok=Number.isInteger(cols)&&cols>=anim.dur.length&&rows===8;
  return {ok,reason:ok?null:'sheet does not match declared frames and eight rows',frame:[anim.w,anim.h],sheet,cols,rows,durations:anim.dur,sha256:hash(b)};
}
async function get(rel){
  for(let attempt=0;attempt<3;attempt++){
    const r=await fetch(BASE+rel,{signal:AbortSignal.timeout(30000)});
    if(r.status===404)return null;
    if(r.ok)return Buffer.from(await r.arrayBuffer());
    if((r.status===429||r.status>=500)&&attempt<2){await new Promise(f=>setTimeout(f,1000*(attempt+1)));continue;}
    throw Error(rel+' HTTP '+r.status);
  }
}
async function inspect(folder,node,read=get){
  const [xml,credits]=await Promise.all([read(folder+'/AnimData.xml'),read(folder+'/credits.txt')]);
  const all=xml?parse(xml.toString('utf8')):{};
  const animations=[],cache=new Map();
  for(const action of ACTIONS){
    const a=resolve(all,action);
    if(!a||!a.name||!/^[-_a-z0-9 ]+$/i.test(a.name)){animations.push({action,ok:false,reason:'missing or invalid XML frames'});continue;}
    const file=folder+'/'+a.name+'-Anim.png';
    if(!cache.has(file))cache.set(file,await read(file));
    animations.push({action,source:a.name,file,...checkSheet(a,cache.get(file))});
  }
  const creditText=credits?.toString('utf8')||'';
  return {folder,name:node?.name||null,declaredCompleteness:node?.sprite_complete??null,xmlSha256:xml?hash(xml):null,credits:creditText,creditsSha256:credits?hash(credits):null,animations,structuralCandidate:animations.every(a=>a.ok)&&!!creditText.trim(),battleReady:false};
}
async function auditSpecies(tracker,id,name,read=get){
  const dex=key(id),node=tracker?.[dex];
  const forms=findForms(node);
  const result={dex,name,status:!node?'species-not-in-tracker':!forms.length?'no-exact-form-label':forms.length===1?'exact-form-found':'multiple-exact-form-labels',forms:[],battleReady:false};
  for(const f of forms){
    const folder=['sprite',dex,...f.parts].join('/');
    const normal=await inspect(folder,f.node,read);
    const shinyNodes=children(f.node).filter(([,v])=>isShiny(v.name));
    const shiny=shinyNodes.length===1?await inspect(folder+'/'+shinyNodes[0][0],shinyNodes[0][1],read):null;
    result.forms.push({folder,labels:f.names,normal,shiny,shinyStatus:shinyNodes.length===1?'exact-shiny-label':shinyNodes.length?'ambiguous-shiny-labels':'no-exact-shiny-label',bothStructural:normal.structuralCandidate&&!!shiny?.structuralCandidate,battleReady:false});
  }
  return result;
}
function summarize(results){
  return {species:results.length,exactLabelSpecies:results.filter(x=>x.forms.length).length,missingExactLabelSpecies:results.filter(x=>!x.forms.length).length,
    forms:results.reduce((n,x)=>n+x.forms.length,0),
    normalStructural:results.flatMap(x=>x.forms).filter(f=>f.normal.structuralCandidate).length,
    shinyStructural:results.flatMap(x=>x.forms).filter(f=>f.shiny?.structuralCandidate).length,
    bothStructural:results.flatMap(x=>x.forms).filter(f=>f.bothStructural).length,battleReady:0};
}
async function main(){
  const bytes=await get('tracker.json');if(!bytes)throw Error('Pinned tracker unavailable');
  const tracker=JSON.parse(bytes.toString('utf8'));
  if(!tracker||typeof tracker!=='object'||Array.isArray(tracker)||!tracker['0006'])throw Error('Unexpected tracker structure');
  const results=new Array(ROSTER.length);let cursor=0;
  await Promise.all(Array.from({length:4},async()=>{for(;;){const i=cursor++;if(i>=ROSTER.length)return;results[i]=await auditSpecies(tracker,...ROSTER[i]);}}));
  const report={schema:1,source:'PMDCollab/SpriteCollab',revision:REV,trackerSha256:hash(bytes),scope:'32 Gigantamax-capable species, nested exact form labels; not an official catalogue of every variant',license:'CC BY-NC 4.0; retain individual credits; no grant of Pokemon IP rights',summary:summarize(results),results,
    notice:'PNG header, metadata, and credits are structural evidence only. No exact label is not proof of absence in any other source. No visual/offset/animation QA, no gameplay registration, no deployment.'};
  const out=path.resolve('dist/gmax-roster-audit');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  const compact=results.map(r=>({dex:r.dex,name:r.name,status:r.status,forms:r.forms.map(f=>({folder:f.folder,normal:f.normal.animations.filter(a=>a.ok).map(a=>a.action),shiny:f.shiny?.animations.filter(a=>a.ok).map(a=>a.action)??null,normalCredits:!!f.normal.credits.trim(),shinyCredits:!!f.shiny?.credits.trim(),bothStructural:f.bothStructural}))}));
  console.log('GMAX_ROSTER_SUMMARY='+JSON.stringify(report.summary));console.log('GMAX_ROSTER_RESULTS='+JSON.stringify(compact));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={ROSTER,ACTIONS,isForm,findForms,checkSheet,inspect,auditSpecies,summarize};
