/* SVV: unobtrusive mission awareness, no Cloud/Firestore requests.
 * All state is UI-only; read rewards and mission progress from the normal save.
 */
G.PKMSVVMissionCue=(()=>{
 const vi=()=>G.I18n&&G.I18n.lang==='vi';
 const label=(a,b)=>vi()?a:b;
 function data(){
  const s=G.DB&&G.DB.save;
  if(!s||!s.missions)return {ready:0,active:0,signature:''};
  const M=s.missions;
  const list=[...(M.daily||[]),...(M.weekly||[])];
  let ready=list.filter(m=>!m.claimed&&G.Progress.done(m)).length;
  let active=list.filter(m=>!m.claimed).length;
  if(s.pkmDaily){if(!s.pkmDaily.claimed){active++;if(s.pkmDaily.complete)ready++;}}
  if(s.pkmWeekly){if(!s.pkmWeekly.claimed){active++;if(s.pkmWeekly.dexes&&s.pkmWeekly.dexes.length && s.pkmWeekly.done.length>=s.pkmWeekly.dexes.length)ready++;}}
  const signature=[M.day,M.week,...list.map(m=>m.id+':'+m.goal)].join('|');
  return {ready,active,signature};
 }
 function key(){
  const s=G.DB&&G.DB.save;
  // Display-only acknowledgment; no save schema change or extra Cloud writes.
  return 'pkmsvv.missions.seen.'+String(s&&s.created||'guest');
 }
 function getSeen(){try{return localStorage.getItem(key())||'';}catch(e){return '';}}
 function markSeen(){const d=data();if(!d.signature)return;try{localStorage.setItem(key(),d.signature);}catch(e){}refresh();}
 function refresh(){
  const el=document.querySelector('#scr-menu [data-go="goals"]');
  if(!el)return;
  const d=data(),unseen=!!d.signature&&getSeen()!==d.signature;
  el.classList.toggle('pkmsvv-mission-ready-menu',d.ready>0);
  el.classList.toggle('pkmsvv-mission-new-menu',d.ready===0&&unseen);
  let badge=el.querySelector('.pkmsvv-mission-dot');
  if(!badge){badge=document.createElement('span');badge.className='pkmsvv-mission-dot';badge.setAttribute('aria-hidden','true');el.appendChild(badge);}
  badge.textContent=d.ready>0?String(d.ready):unseen?'!':'';
  badge.classList.toggle('hidden',!(d.ready>0||unseen));
  if(d.ready>0)el.title=label('Có '+d.ready+' nhiệm vụ chờ nhận thưởng',''+d.ready+' mission rewards ready to claim');
  else if(unseen)el.title=label('Có nhiệm vụ mới','New missions available');
  else el.removeAttribute('title');
 }
 return {data,markSeen,refresh};
})();