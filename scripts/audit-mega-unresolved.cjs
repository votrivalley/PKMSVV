'use strict';
// Read-only pinned tracker review; never substitute genders, colors or variants.
const fs=require('node:fs'),path=require('node:path');
const catalog=require('../data/mega-source-catalog.json'),inv=require('../data/mega-upstream-3ds-candidates.json');
const REV='72b906e7dae9a4c2f1477e7c538c8f2fd8c225a5';
const targets=inv.forms.filter(f=>f.source==='missing'||f.source==='derived-rejected'||f.key==='sceptilemega');
function list(node,codes=[],names=[],out=[]){
 if(!node||typeof node!=='object'||codes.length>7)return out;
 const n=String(node.name||''),all=[...names,n].filter(Boolean);
 if(codes.length&&/mega/i.test(n)){
  const shiny=Object.entries(node.subgroups||{}).filter(([,s])=>/^shiny$/i.test(s.name||'')).map(([code,s])=>({code,animations:Object.keys(s.sprite_files||{}),completion:s.sprite_complete||0}));
  out.push({name:all.join(' / '),codes:[...codes],animations:Object.keys(node.sprite_files||{}),completion:node.sprite_complete||0,shiny});
 }
 for(const [code,child] of Object.entries(node.subgroups||{}))list(child,[...codes,code],all,out);
 return out;
}
async function main(){
 const r=await fetch('https://raw.githubusercontent.com/PMDCollab/SpriteCollab/'+REV+'/tracker.json',{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('tracker HTTP '+r.status);const data=await r.json();
 const report=targets.map(f=>{
  const dex=String(f.dex).padStart(4,'0'),local=catalog.forms.find(c=>c.showdownKey===f.key);
  const candidates=list(data[dex]).map(c=>({...c,folder:'sprite/'+dex+'/'+c.codes.join('/'),core:['Idle','Walk','Attack'].every(k=>c.animations.includes(k))}));
  return {key:f.key,name:f.name,previousFolder:local?.sprite?.folder||null,previousState:f.previous,candidates,note:'Exact variant and real sheets require review; no automatic promotion',gameplayReady:false};
 });
 const out=path.resolve('dist/mega-unresolved-audit');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({revision:REV,report},null,2));console.log('MEGA_UNRESOLVED_SOURCE='+JSON.stringify(report));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={list};
