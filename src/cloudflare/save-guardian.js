'use strict';
/* PKMSVV local save protection: NO external upload, no cache-based save storage.
 * Keeps extra snapshots of the existing ps.save.* payload. Never auto-overwrites
 * a valid primary save with a backup from a different origin or profile.
 */
(function(){
 const PROFILE='pkmsvv_offline',SAVE='ps.save.'+PROFILE;
 const HEAD='pkmsvv.safe.v1.'+PROFILE;
 const PRIMARY=HEAD+'.latest',PREVIOUS=HEAD+'.previous';
 const now=()=>Date.now();
 const safeRead=k=>{try{return localStorage.getItem(k);}catch(_){return null;}};
 const safeWrite=(k,v)=>{try{localStorage.setItem(k,v);return true;}catch(_){return false;}};
 const good=text=>{
  if(typeof text!=='string'||text.length<30||text.length>8*1024*1024)return false;
  try{const s=JSON.parse(text);return !!s&&!Array.isArray(s)&&typeof s==='object'&&
   s.owned&&typeof s.owned==='object'&&s.stats&&typeof s.stats==='object'&&
   Number.isFinite(Number(s.coins));}catch(_){return false;}
 };
 // Only permanent achievements are monotonic. Quantities in bag, tms,
 // Berry bag and Arena Points legitimately decrease when players spend them.
 const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const keys=v=>record(v)?Object.keys(v):[];
 const earned=v=>v===true||v===1||Number(v)>0||
   (record(v)&&v.unlocked===true);
 const retained=(oldMap,newMap,valid=earned)=>keys(oldMap).every(k=>
   !valid(oldMap[k])||valid(record(newMap)?newMap[k]:undefined));
 const taught=s=>record(s?.ptm)?s.ptm:{};
 const learnedRetained=(a,b)=>keys(taught(a)).every(dex=>{
  const older=taught(a)[dex],newer=taught(b)[dex];
  return !Array.isArray(older)||older.every(id=>Array.isArray(newer)&&newer.includes(id));
 });
 const score=text=>{
  try{
   const s=JSON.parse(text),berry=s.pkmsvvBerry||{},arena=s.arenas?.pkmChampion||{};
   return {owned:keys(s.owned).length,shiny:keys(s.shiny).length,
    runs:Number(s.stats?.runs)||0,best:Number(s.stats?.bestTime)||0,
    mega:keys(s.megaStones).filter(k=>earned(s.megaStones[k])).length,
    megaForms:keys(s.megaForms).filter(k=>earned(s.megaForms[k])).length,
    berryUsed:keys(berry.used).filter(k=>earned(berry.used[k])).length,
    berryWins:Number(berry.rescueWins)||0,
    items:keys(s.itemsFound).length,learnedTms:keys(taught(s))
     .reduce((n,k)=>n+(Array.isArray(taught(s)[k])?taught(s)[k].length:0),0),
    championSeals:keys(arena.seals).filter(k=>earned(arena.seals[k])).length};
  }catch(_){return null;}
 };
 const regress=(oldText,next)=>{
  const a=score(oldText),b=score(next);
  if(!a||!b)return true;
  for(const key of ['owned','shiny','runs','best','mega','megaForms','berryUsed',
   'berryWins','items','learnedTms','championSeals'])
   if(b[key]<a[key])return true;
  const older=JSON.parse(oldText),newer=JSON.parse(next);
  // A swapped collection entry with the same count is still lost progress.
  for(const path of ['owned','shiny','itemsFound','evoMoves','ach','legends'])
   if(!keys(older[path]).every(k=>Object.hasOwn(newer[path]||{},k)))return true;
  for(const path of ['megaStones','megaForms','megaStoryCleared'])
   if(!retained(older[path],newer[path]))return true;
  for(const path of ['seals','trophies'])
   if(!retained(older.arenas?.pkmChampion?.[path],
                newer.arenas?.pkmChampion?.[path]))return true;
  if(!retained(older.pkmsvvBerry?.used,newer.pkmsvvBerry?.used))return true;
  if(!retained(older.arenaGacha?.championPaid,newer.arenaGacha?.championPaid))return true;
  if(!retained(older.arenaGacha?.trophyPaid,newer.arenaGacha?.trophyPaid))return true;
  if((Number(newer.arenaGacha?.pulls)||0)<(Number(older.arenaGacha?.pulls)||0))return true;
  if(older.pkmsvvBerryChapterDone===true&&newer.pkmsvvBerryChapterDone!==true)return true;
  for(const k of keys(older))if(/^pkmsvvChapter\\d+(?:Done|Seen)$/.test(k)&&
     older[k]===true&&newer[k]!==true)return true;
  if(!learnedRetained(older,newer))return true;
  // Removing an entire inventory field is a schema/data-loss regression,
  // unlike ordinary consumption that can reduce individual item counts.
  for(const name of ['bag','tms'])
   if(keys(older[name]).length&& !record(newer[name]))return true;
  if(keys(older.pkmsvvBerry?.bag).length&&
     !record(newer.pkmsvvBerry?.bag))return true;
  return false;
 };
 const backupEnvelope=(save)=>JSON.stringify({source:'pkmsvv-local',createdAt:now(),profile:PROFILE,save});
 function startRecovery(){
  const current=safeRead(SAVE);
  if(!good(current)){
   const main=safeRead(PRIMARY),fallback=safeRead(PREVIOUS);
   const candidate=good(main)?main:fallback;
   if(good(candidate)){
    safeWrite(SAVE,candidate);
    safeWrite('pkmsvv.safe.v1.restoredAt',String(now()));
   }
  }
  const existing=safeRead(SAVE);
  if(good(existing)){
   let accounts={};
   try{accounts=JSON.parse(safeRead('ps.accounts')||'{}')||{};}catch(_){}
   if(!accounts[PROFILE]){
    try{const s=JSON.parse(existing);accounts[PROFILE]={name:String(s.name||'Người chơi').slice(0,24),
     created:now(),localOnly:true};}catch(_){}
    safeWrite('ps.accounts',JSON.stringify(accounts));
   }
   let session=null;try{session=JSON.parse(safeRead('ps.session'));}catch(_){}
   // Never switch the active profile if another existing account was selected.
   if(!session)safeWrite('ps.session',JSON.stringify(PROFILE));
  }
 }
 let last='',lastSaved=0;
 function snapshot(){
  const save=safeRead(SAVE);if(!good(save))return;
  if(save===last)return;
  // Keep the previous strong save, never silently replace it with an empty/newer reset.
  const prior=safeRead(PRIMARY);
  if(prior&&good(prior)&&prior!==save){
   if(regress(prior,save)){
    safeWrite(PREVIOUS,prior);
    window.PKMSVV_SAVE_GUARD_WARNING=true;
    return;
   }
   safeWrite(PREVIOUS,prior);
  }
  if(safeWrite(PRIMARY,save)){last=save;lastSaved=now();}
 }
 try{startRecovery();snapshot();}catch(e){console.warn('PKMSVV save safety init:',e);}
 // Separate from the Cache API. Offline assets can be evicted independently.
 document.addEventListener('visibilitychange',()=>{if(document.hidden)snapshot();});
 window.addEventListener('pagehide',snapshot);
 setInterval(snapshot,15000);
 window.PKMSVVSaveGuardian={snapshot,good,score,regress,keys:[SAVE,PRIMARY,PREVIOUS],
  currentProfile:PROFILE,exportSnapshot:()=>backupEnvelope(safeRead(SAVE))};
})();
