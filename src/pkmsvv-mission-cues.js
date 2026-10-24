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
 function decorate(box){
  const save=G.DB&&G.DB.save, M=save&&save.missions;
  if(!box||!M)return;
  const rows=Array.from(box.children).filter(el=>el.classList.contains('mission'));
  const definitions=[
   ...(M.daily||[]).map((m,i)=>({m,index:i,weekly:false})),
   ...(M.weekly||[]).map((m,i)=>({m,index:i,weekly:true}))
  ];
  const priority=document.createElement('section');priority.className='pkmsvv-missions-priority';
  let count=0;
  definitions.forEach((entry,i)=>{
    const row=rows[i],m=entry.m;if(!row)return;
    const claimable=!m.claimed&&G.Progress.done(m);
    row.classList.toggle('pkmsvv-mission-priority',claimable);
    row.classList.toggle('pkmsvv-mission-active',!claimable&&!m.claimed);
    row.classList.toggle('pkmsvv-mission-claimed',!!m.claimed);
    if(claimable){
      count++;const label=document.createElement('span');
      label.className='pkmsvv-ready-label';
      label.textContent=labelText('✓ HOÀN THÀNH · NHẬN THƯỞNG','✓ COMPLETE · CLAIM REWARD');
      row.prepend(label);
      priority.appendChild(row); // Original button handlers/index are preserved.
    }
  });
  const col=box.querySelector('.pkm-collection-goals');
  if(col){
    const cards=Array.from(col.children).filter(el=>el.classList.contains('pkm-guide'));
    const d=save.pkmDaily,w=save.pkmWeekly;
    const stat=[
      {ready:!!(d&&d.complete&&!d.claimed),claimed:!!(d&&d.claimed)},
      {ready:!!(w&&w.dexes&&w.dexes.length&&w.done&&w.done.length>=w.dexes.length&&!w.claimed),
       claimed:!!(w&&w.claimed)}
    ];
    stat.forEach((s,i)=>{
      const el=cards[i];if(!el)return;
      el.classList.toggle('pkmsvv-collection-priority',s.ready);
      el.classList.toggle('pkmsvv-collection-claimed',s.claimed);
      if(s.ready){count++;priority.appendChild(el);}
    });
  }
  if(count){
    const header=document.createElement('h3');
    header.textContent=labelText('🎁 NHIỆM VỤ HOÀN THÀNH · CHỜ NHẬN','🎁 COMPLETED MISSIONS · CLAIM REWARDS');
    priority.prepend(header);box.prepend(priority);
  }
  markSeen();
 }
 const labelText=(v,en)=>vi()?v:en;
 return {data,markSeen,refresh,decorate};
})();