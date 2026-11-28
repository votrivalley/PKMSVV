'use strict';
// Import only the five credited SpriteCollab-derived candidates. Source sheets
// are used unchanged. No Reloaded/Web assets or derived Lucario-Z are imported.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {inspectPng,classify,fetchBytes}=require('./audit-mega-3ds-source.cjs');
const inv=require('../data/mega-upstream-3ds-candidates.json'),catalog=require('../data/mega-source-catalog.json');
const ACTIONS=['Idle','Walk','Attack','Shoot','Charge','Hurt','Faint'];
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
const CC_REV='8e7588b720b3433198e8a25c7bd9c06732056702';
const creditsBase='https://raw.githubusercontent.com/PMDCollab/SpriteCollab/'+CC_REV+'/sprite/';
const selected=()=>inv.forms.filter(f=>f.source==='spritecollab'&&f.credit.length&&f.spritecollabPath&&f.previous!=='sprite-ready');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function credits(f,v){
 const rel=f.spritecollabPath+(v==='shiny'?'/0001':'')+'/credits.txt';
 const res=await fetch(creditsBase+rel,{signal:AbortSignal.timeout(30000)});
 if(!res.ok)throw Error('Missing original credits '+rel+' HTTP '+res.status);
 const s=await res.text();if(!s.trim())throw Error('Empty original credits '+rel);
 return 'CC BY-NC 4.0 — noncommercial fan work.\nOriginal: '+creditsBase+rel+'\nPackaged source: https://github.com/'+inv.source+'/tree/'+inv.revision+'/assets-src/pokemon/'+f.upstreamId+'\nUpstream named contributors: '+f.credit.join(', ')+'\n\n'+s;
}
async function build(out){
 const forms=selected();if(forms.length!==5)throw Error('Expected five exact credited SpriteCollab candidates');
 const registry={};
 for(const f of forms){
  const expected=catalog.forms.find(x=>x.showdownKey===f.key);
  const siblings=catalog.forms.filter(x=>x.dex===f.dex).map(x=>x.name).sort();
  if(!expected||expected.sprite.state==='sprite-ready'||f.visualId!==10000+f.dex+10000*siblings.indexOf(expected.name))throw Error('Existing form drift '+f.key);
  const folder=path.join(out,'assets','pokemon',String(f.visualId)),meta={},evidence={};
  for(const variant of ['normal','shiny']){
   const dir=variant==='shiny'?path.join(folder,'s'):folder;
   fs.mkdirSync(dir,{recursive:true});const data={},checks={};
   for(const k of ACTIONS){
    const s=f.variants[variant]?.[k];
    if(!s?.present)throw Error('Missing audited sheet '+f.key+' '+variant+' '+k);
    const b=await fetchBytes(s.sheet),result=inspectPng(b,s.meta);
    if(!result.ok)throw Error('Invalid sheet '+s.sheet);
    checks[k]=result;const {f:alias,...m}=s.meta;data[k]=m;
    fs.writeFileSync(path.join(dir,k+'.png'),b);
   }
   fs.writeFileSync(path.join(dir,'CREDITS.txt'),await credits(f,variant));
   meta[variant]=data;evidence[variant]=checks;
  }
  const summary=classify(evidence);
  if(!summary.normal.valid||!summary.shiny.valid)throw Error('Invalid variant '+f.key);
  registry[f.key]={key:f.key,name:f.name,dex:f.dex,spriteId:f.visualId,source:f.source,distinctCore:summary.normal.distinctCore&&summary.shiny.distinctCore,aliases:{normal:summary.normal.aliases,shiny:summary.shiny.aliases},gameplayReady:false,meta:{s:f.shadow||1,a:meta.normal,sh:true,sa:meta.shiny}};
 }
 return registry;
}
function install(out,registry){
 if(process.env.PKMSVV_MEGA_RECOVERY_PREVIEW_QA!=='1')throw Error('Explicit isolated QA flag required');
 const metaFile=path.join(game,'js','data','pkmsvv-mega-sprite-meta.js');
 if(!fs.existsSync(metaFile))throw Error('Existing Mega pack missing');
 const original=fs.readFileSync(metaFile,'utf8');
 if(original.includes('PKMSVV_MEGA_RECOVERY_PREVIEW'))throw Error('Duplicate recovery preview registry');
 // Fail rather than overwriting a sprite already present in the compiled game.
 for(const f of Object.values(registry)){
  const dest=path.join(game,'assets','pokemon',String(f.spriteId));
  if(fs.existsSync(dest))throw Error('Visual ID collision '+f.spriteId);
 }
 let code='\n/* Isolated recovered Mega previews only: artReady is unchanged. */\n';
 for(const f of Object.values(registry)){
  fs.cpSync(path.join(out,'assets','pokemon',String(f.spriteId)),path.join(game,'assets','pokemon',String(f.spriteId)),{recursive:true,errorOnExist:true,force:false});
  code+='G.SPRITE_META['+f.spriteId+']='+JSON.stringify(f.meta)+';\n';
 }
 code+='G.PKMSVV_MEGA_RECOVERY_PREVIEW='+JSON.stringify(Object.fromEntries(Object.entries(registry).map(([k,{meta,...r}])=>[k,r])))+';\n';
 if(process.env.PKMSVV_MEGA_RECOVERY_BATTLE_QA==='1')code+='G.PKMSVV_MEGA_RECOVERY_BATTLE_QA=true;\n';
 fs.appendFileSync(metaFile,code);
}
function html(registry){
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cards=Object.values(registry).map(f=>'<section><h2>'+esc(f.name)+'</h2><p>'+ (f.distinctCore?'Distinct Idle / Walk / Attack':'Idle / Walk only; Attack aliases Idle')+'</p><div class="row">'+['normal','shiny'].map(v=>'<div><b>'+v+'</b><canvas width="160" height="144" data-key="'+f.key+'" data-v="'+v+'"></canvas></div>').join('')+'</div></section>').join('');
 return '<!doctype html><meta charset="utf-8"><title>PKMSVV — recovered Mega QA</title><style>body{font:16px system-ui;background:#e8efe9;color:#173b34;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:12px}section{background:#fff;padding:14px;border:1px solid #adc5ba;border-radius:10px}h2{margin:0;font-size:18px}canvas{display:block;image-rendering:pixelated}.row{display:flex;justify-content:center;gap:8px}button{padding:8px;margin:4px}</style><h1>Recovered Mega sprite preview</h1><p>Five exact forms; original source sheets, not battle-ready. Credits in each sprite folder.</p><label>Animation <select id="act"><option>Idle</option><option>Walk</option><option>Attack</option><option>Hurt</option><option>Shoot</option><option>Charge</option><option>Faint</option></select></label> <label>Direction <select id="dir">'+Array.from({length:8},(_,i)=>'<option value="'+i+'">'+(i+1)+'</option>').join('')+'</select></label><main>'+cards+'</main><script>const forms='+JSON.stringify(registry).replace(/</g,'\\u003c')+';const imgs=new Map();function draw(t){for(const c of document.querySelectorAll("canvas")){const f=forms[c.dataset.key],v=c.dataset.v,a=document.querySelector("#act").value,d=+document.querySelector("#dir").value,m=(v==="shiny"?f.meta.sa:f.meta.a)[a],url="assets/pokemon/"+f.spriteId+(v==="shiny"?"/s/":"/")+a+".png";let img=imgs.get(url);if(!img){img=new Image();img.src=url;imgs.set(url,img)}const x=c.getContext("2d");x.clearRect(0,0,c.width,c.height);if(!img.complete||!img.naturalWidth)continue;const total=m.d.reduce((a,b)=>a+b,0);let beat=(t/16.667)%total,i=0;while(i<m.n-1&&beat>=m.d[i])beat-=m.d[i++];const scale=Math.max(1,Math.min(3,Math.floor(Math.min(152/m.w,136/m.h))));x.imageSmoothingEnabled=false;x.drawImage(img,i*m.w,d*m.h,m.w,m.h,Math.round((160-m.w*scale)/2),Math.round((144-m.h*scale)/2),m.w*scale,m.h*scale)}requestAnimationFrame(draw)}requestAnimationFrame(draw)</script>';
}
async function main(){
 const out=path.join(root,'dist','mega-recovery-preview');fs.mkdirSync(out,{recursive:true});
 const registry=await build(out);fs.writeFileSync(path.join(out,'registry.json'),JSON.stringify(registry,null,2));fs.writeFileSync(path.join(out,'index.html'),html(registry));
 if(process.argv.includes('--install-qa'))install(out,registry);
 console.log('MEGA_RECOVERY_PREVIEW='+JSON.stringify(Object.values(registry).map(({meta,...r})=>r)));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={selected,install,html};
