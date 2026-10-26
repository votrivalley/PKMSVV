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
 const score=text=>{try{const s=JSON.parse(text);return {
  owned:Object.keys(s.owned||{}).length,runs:Number(s.stats?.runs)||0,
  best:Number(s.stats?.bestTime)||0};}catch(_){return {owned:0,runs:0,best:0}}};
 const regress=(oldText,next)=>{
  const a=score(oldText),b=score(next);
  return b.owned<a.owned||b.runs<a.runs||b.best<a.best;
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
 window.PKMSVVSaveGuardian={snapshot,good,keys:[SAVE,PRIMARY,PREVIOUS],
  currentProfile:PROFILE,exportSnapshot:()=>backupEnvelope(safeRead(SAVE))};
})();
