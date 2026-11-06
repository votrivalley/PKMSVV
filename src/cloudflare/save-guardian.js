'use strict';
/* PKMSVV local save protection: NO external upload, no cache-based save storage.
 * Keeps extra snapshots of the existing ps.save.* payload. Never auto-overwrites
 * a valid primary save with a backup from a different origin or profile.
 */
(function(){
 const PROFILE='pkmsvv_offline',SAVE='ps.save.'+PROFILE;
 const HEAD='pkmsvv.safe.v1.'+PROFILE;
 const PRIMARY=HEAD+'.latest',PREVIOUS=HEAD+'.previous';
 // Keep v1 backup slots, so a v1 player can still recover after an upgrade.
 // v2 adds only bounded, metadata-only transaction history.
 const JOURNAL='pkmsvv.safe.v2.'+PROFILE+'.journal';
 const MAX_JOURNAL=40;
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
  for(const k of keys(older))if(/^pkmsvvChapter\d+(?:Done|Seen|Unlocked|Cleared|Completed)$/.test(k)&&
     older[k]===true&&newer[k]!==true)return true;
  for(const flag of ['pkmsvvRayquazaDefeated','pkmsvvChapter10Done','pkmsvvChapter10Seen'])
   if(older[flag]===true&&newer[flag]!==true)return true;
  if(!learnedRetained(older,newer))return true;
  // Removing an entire inventory field is a schema/data-loss regression,
  // unlike ordinary consumption that can reduce individual item counts.
  for(const name of ['bag','tms'])
   if(keys(older[name]).length&& !record(newer[name]))return true;
  if(keys(older.pkmsvvBerry?.bag).length&&
     !record(newer.pkmsvvBerry?.bag))return true;
  return false;
 };

 // Comparisons distinguish permanent progression from expendable balances.
 // Never rank candidates by spendable item quantities. Do not store save payloads
 // inside the journal; only short summaries of completed snapshot transitions.
 const parse=text=>{try{return good(text)?JSON.parse(text):null;}catch(_){return null;}};
 const qty=v=>Number.isFinite(Number(v))?Number(v):0;
 const total=v=>keys(v).reduce((n,k)=>n+Math.max(0,qty(v[k])),0);
 const getAt=(o,path)=>path.reduce((x,k)=>x?.[k],o);
 const balancePaths=[
  ['PokéCoins',['coins']],['Vé x1',['tickets','t1']],
  ['Vé x10',['tickets','t10']],['Điểm Arena',['arenaGacha','points']],
  ['Berry trong túi',['pkmsvvBerry','bag']],['Đá Mega',['megaStones']]
 ];
 function compare(aText,bText){
  const a=parse(aText),b=parse(bText);
  if(!a||!b)return {compatible:false,reason:'Invalid or incompatible save',permanent:[],balances:[],warnings:['Save is damaged or incomplete']};
  const permanent=[];
  const note=(name,oldV,newV)=>{
   if(oldV===newV)return;
   permanent.push({name,before:oldV,after:newV,change:newV>oldV?'gain':'loss'});
  };
  const nameMaps=[
   ['Pokémon',['owned']],['Shiny',['shiny']],['Mega đã mở',['megaForms']],
   ['Vật phẩm đã tìm',['itemsFound']],['TM đã học',['ptm']],
   ['Berry đã sử dụng',['pkmsvvBerry','used']],
   ['Ấn Chứng',['arenas','pkmChampion','seals']],
   ['Cúp vô địch',['arenas','pkmChampion','trophies']]
  ];
  for(const [name,path] of nameMaps){
   const before=getAt(a,path),after=getAt(b,path);
   const list=path[0]==='ptm'?v=>keys(v).flatMap(k=>Array.isArray(v[k])?v[k].map(id=>k+':'+id):[]):
    v=>keys(v).filter(k=>earned(v[k])||path[0]==='owned'||path[0]==='shiny'||path[0]==='itemsFound');
   const older=new Set(list(before)),newer=new Set(list(after));
   const lost=[...older].filter(k=>!newer.has(k)),gained=[...newer].filter(k=>!older.has(k));
   if(lost.length||gained.length)permanent.push({name,before:older.size,after:newer.size,change:lost.length?'loss':'gain',lost:lost.slice(0,12),gained:gained.slice(0,12)});
  }
  const chapterFlags=[...new Set([...keys(a),...keys(b)].filter(k=>
   /^pkmsvvChapter\d+(?:Done|Seen|Unlocked|Cleared|Completed)$/.test(k)||
   k==='pkmsvvBerryChapterDone'||k==='pkmsvvRayquazaDefeated'))];
  const chapters={lost:chapterFlags.filter(k=>a[k]===true&&b[k]!==true),
   gained:chapterFlags.filter(k=>a[k]!==true&&b[k]===true)};
  for(const flag of chapters.lost)permanent.push({name:flag,before:1,after:0,change:'loss'});
  for(const flag of chapters.gained)permanent.push({name:flag,before:0,after:1,change:'gain'});
  for(const [name,path] of [['Số trận',['stats','runs']],['Kỷ lục',['stats','bestTime']],
   ['Số Berry cứu thành công',['pkmsvvBerry','rescueWins']],['Lượt Gacha',['arenaGacha','pulls']]])
   note(name,qty(getAt(a,path)),qty(getAt(b,path)));
  const balances=balancePaths.map(([name,path])=>{
   const before=getAt(a,path),after=getAt(b,path),asNumber=path.length===1||path[0]==='tickets'||path[0]==='arenaGacha';
   return {name,before:asNumber?qty(before):total(before),after:asNumber?qty(after):total(after)};
  }).filter(x=>x.before!==x.after).map(x=>({...x,delta:x.after-x.before}));
  const risk=permanent.some(x=>x.change==='loss');
  const warnings=[];
  if(risk)warnings.push('Permanent progress or chapter flags may be lost');
  if(balances.some(x=>x.delta<0))warnings.push('Spendable balance is lower; this can be a valid purchase');
  if(balances.some(x=>x.delta>0))warnings.push('Higher inventory is not proof this save is newer');
  return {compatible:true,permanent,chapters,balances,warnings,risk};
 }
 const fingerprint=text=>{
  // Lightweight change fingerprint, not a security signature.
  let n=2166136261;
  for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);
  return (n>>>0).toString(16).padStart(8,'0');
 };
 const readJournal=()=>{
  try{
   const data=JSON.parse(safeRead(JOURNAL)||'[]');
   return Array.isArray(data)?data.filter(x=>record(x)&&typeof x.id==='string').slice(-MAX_JOURNAL):[];
  }catch(_){return [];}
 };
 function addJournal(type,oldText,nextText,extra={}){
  if(!good(nextText))return false;
  const changes=good(oldText)?compare(oldText,nextText):null;
  const entry={id:now()+'-'+fingerprint(nextText),at:now(),type,
   before:good(oldText)?fingerprint(oldText):null,after:fingerprint(nextText),
   progress:score(nextText),permanent:changes?.permanent?.slice(0,20)||[],
   balances:changes?.balances||[],warnings:changes?.warnings||[],
   ...extra};
  // Oldest entries roll off; failure to persist journal NEVER mutates a save.
  return safeWrite(JOURNAL,JSON.stringify([...readJournal(),entry].slice(-MAX_JOURNAL)));
 }
 let pending=null;
 function beginTransaction(kind='save'){
  if(pending)return null;
  const token=now()+'-'+Math.random().toString(36).slice(2);
  pending={token,kind:String(kind).slice(0,48),startedAt:now()};
  return token;
 }
 function endTransaction(token,success=false){
  if(!pending||pending.token!==token)return false;
  const kind=pending.kind;pending=null;
  if(success)snapshot('transaction:'+kind);
  return true;
 }
 function previews(){
  const current=safeRead(SAVE);
  return [PRIMARY,PREVIOUS].map((key,i)=>{
   const value=safeRead(key);
   return {slot:i?'previous':'latest',available:good(value),
    comparison:good(value)&&good(current)?compare(current,value):null,
    fingerprint:good(value)?fingerprint(value):null};
  });
 }
 function restoreSnapshot(slot,confirmed=false){
  if(!confirmed||pending)return {ok:false,reason:'explicit confirmation required'};
  const key=slot==='latest'?PRIMARY:slot==='previous'?PREVIOUS:null;
  if(!key)return {ok:false,reason:'invalid snapshot slot'};
  const next=safeRead(key),current=safeRead(SAVE);
  if(!good(next))return {ok:false,reason:'snapshot missing or invalid'};
  // Do not overwrite the only good save if backup of current cannot persist.
  const safety='pkmsvv.safe.v2.'+PROFILE+'.prerestore';
  if(good(current)&&!safeWrite(safety,current))return {ok:false,reason:'unable to preserve current save'};
  if(!safeWrite(SAVE,next))return {ok:false,reason:'restore write failed'};
  addJournal('manual-restore',current,next,{slot});
  return {ok:true,comparison:good(current)?compare(current,next):null};
 }
 const backupEnvelope=(save)=>JSON.stringify({source:'pkmsvv-local',createdAt:now(),profile:PROFILE,save});
 function startRecovery(){
  const current=safeRead(SAVE);
  if(!good(current)){
   const main=safeRead(PRIMARY),fallback=safeRead(PREVIOUS);
   const candidate=good(main)?main:fallback;
   if(good(candidate)){
    if(safeWrite(SAVE,candidate)){
     safeWrite('pkmsvv.safe.v1.restoredAt',String(now()));
     addJournal('recovery-invalid-primary',current,candidate,{slot:candidate===main?'latest':'previous'});
    }
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
 function snapshot(reason='periodic'){
  if(pending)return false;
  const save=safeRead(SAVE);if(!good(save))return false;
  if(save===last)return;
  // Keep the previous strong save, never silently replace it with an empty/newer reset.
  const prior=safeRead(PRIMARY);
  if(prior&&good(prior)&&prior!==save){
   if(regress(prior,save)){
    safeWrite(PREVIOUS,prior);
    window.PKMSVV_SAVE_GUARD_WARNING=true;
    return false;
   }
   safeWrite(PREVIOUS,prior);
  }
  if(safeWrite(PRIMARY,save)){
   if(prior!==save)addJournal(reason,prior,save);
   last=save;lastSaved=now();return true;
  }
  return false;
 }
 try{startRecovery();snapshot();}catch(e){console.warn('PKMSVV save safety init:',e);}
 // Separate from the Cache API. Offline assets can be evicted independently.
 document.addEventListener('visibilitychange',()=>{if(document.hidden)snapshot();});
 window.addEventListener('pagehide',snapshot);
 setInterval(snapshot,15000);
 window.PKMSVVSaveGuardian={snapshot,good,score,regress,compare,
  journal:readJournal,beginTransaction,endTransaction,previewRecovery:previews,restoreSnapshot,
  keys:[SAVE,PRIMARY,PREVIOUS,JOURNAL],currentProfile:PROFILE,
  exportSnapshot:()=>backupEnvelope(safeRead(SAVE))};
})();
