'use strict';
/**
 * Read-only exact-form audit for eight Champion Mega sprites.
 * DOES NOT download images, change game assets/save, or mark battle-ready.
 * Usage:
 * node scripts/audit-champion-mega-upstream.cjs --spritecollab ./tracker.json [--notcollab ./tracker-not.json]
 * node scripts/audit-champion-mega-upstream.cjs --fetch [--out /tmp/champion-mega-source-audit.json]
 */
const fs=require('node:fs');
const path=require('node:path');
const TARGETS=Object.freeze([
 ['Dragonite-Mega','0149','0001','Mega'],
 ['Scizor-Mega','0212','0001','Mega'],
 ['Swampert-Mega','0260','0001','Mega'],
 ['Garchomp-Mega','0445','0001','Mega'],
 ['Greninja-Mega','0658','0002','Mega'],
 ['Golisopod-Mega','0768','0001','Mega'],
 ['Falinks-Mega','0870','0001','Mega'],
 ['Baxcalibur-Mega','0998','0001','Mega']
]);
const URLS=Object.freeze({
 sprite:'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/tracker.json',
 unofficial:'https://raw.githubusercontent.com/marius851000/NotSpriteCollab/main/tracker.json'
});
function resolveVariant(tracker,dex,code){return tracker?.[dex]?.subgroups?.[code]||null;}
function evaluate(tracker,[form,dex,code,expected]){
 const exact=resolveVariant(tracker,dex,code);
 const declaredName=exact?.name||null;
 const count=Object.keys(exact?.sprite_files||{}).length;
 const complete=Number(exact?.sprite_complete||0);
 const trueForm=declaredName===expected;
 const status=!exact?'missing_form':
   !trueForm?'wrong_form_name':
   count===0||complete===0?'not_animated_in_source':'unverified_candidate';
 const related=Object.entries(tracker?.[dex]?.subgroups||{})
  .filter(([k,n])=>k!==code&&Number(n?.sprite_complete||0)>0)
  .map(([k,n])=>({code:k,formName:n.name||'base',animationEntries:Object.keys(n.sprite_files||{}).length}));
 return {form,dex,formCode:code,sourcePath:'sprite/'+dex+'/'+code,exactVariantName:declaredName,
  animatedEntries:count,completionLevel:complete,status,battleReady:false,
  note:'Folder name is authoritative: Altcolor/Cutscene is never a Mega substitute.',
  relatedDrawnVariants:related};
}
function searchUnofficial(tracker){
 const needles=new Set(TARGETS.flatMap(([name])=>{
  const base=name.replace('-Mega','').replace(/[^a-zA-Z]/g,'').toLowerCase();
  return [base+'mega','mega'+base];
 }));
 const matches=[];
 function walk(node,dir,depth){
  if(!node||depth>6)return;
  const n=String(node.name||'').toLowerCase().replace(/[^a-z]/g,'');
  if(needles.has(n))matches.push({path:dir,name:node.name,
   animatedEntries:Object.keys(node.sprite_files||{}).length,
   spriteComplete:Number(node.sprite_complete||0)});
  for(const [k,child] of Object.entries(node.subgroups||{}))walk(child,dir+'/'+k,depth+1);
 }
 for(const [k,v] of Object.entries(tracker||{}))walk(v,k,0);
 return matches;
}
function audit(primary,unofficial,meta={}){
 const results=TARGETS.map(t=>evaluate(primary,t));
 return {kind:'PKMSVV_CHAMPION_MEGA_SOURCE_AUDIT',schema:1,readOnly:true,
  generatedAt:new Date().toISOString(),source:meta.source||'local tracker.json',
  candidateIsNOTBattleReady:true,targetCount:results.length,
  readyToImportCount:0,
  note:'Even unverified_candidate requires live file bytes, 8-direction rows, Idle/Walk/Attack/Shoot/Charge/Hurt/Faint, credits and permission before import.',
  results,notSpriteCollabExactNameMatches:unofficial?searchUnofficial(unofficial):null};
}
async function main(){
 const args=process.argv.slice(2),has=s=>args.includes(s),arg=s=>args[args.indexOf(s)+1];
 const load=async(local,url)=>{
  if(has(local))return JSON.parse(fs.readFileSync(path.resolve(arg(local)),'utf8'));
  if(!has('--fetch'))return null;
  const r=await fetch(url,{signal:AbortSignal.timeout(60000)});
  if(!r.ok)throw Error('Source fetch failed: '+r.status+' '+url);
  return r.json();
 };
 const primary=await load('--spritecollab',URLS.sprite);
 if(!primary)throw Error('Provide --spritecollab path or --fetch');
 const secondary=await load('--notcollab',URLS.unofficial);
 const result=audit(primary,secondary,{source:has('--fetch')?'live GitHub tracker':'local upstream tracker'});
 const json=JSON.stringify(result,null,2);
 if(has('--out'))fs.writeFileSync(path.resolve(arg('--out')),json+'\n','utf8');
 else console.log(json);
 if(result.results.some(x=>x.status==='unverified_candidate'))
  console.error('New candidate detected; manual art/rights review required. NOT battle-ready.');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={TARGETS,resolveVariant,evaluate,searchUnofficial,audit};
