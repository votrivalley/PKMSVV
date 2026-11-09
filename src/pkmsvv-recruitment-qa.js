/* QA UI: rename player-facing Gacha to Chiêu mộ / Recruitment.
 * Internal G.Gacha API, tickets, rates, save and reward logic are untouched. */
(function(){
 'use strict';
 if(typeof document==='undefined'||typeof G==='undefined')return;
 const roots=()=>[
  document.querySelector('#scr-menu [data-go="gacha"]'),
  document.getElementById('scr-gacha'),
  document.getElementById('pkmsvv-mega-gacha'),
  document.getElementById('pkmsvv-pokebox-overlay')
 ].filter(Boolean);
 let busy=false;
 function sync(){
  if(busy)return;busy=true;
  try{
   const target=G.I18n?.lang==='en'?'Recruitment':'Chiêu mộ';
   for(const root of roots()){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    for(let node;node=walker.nextNode();)nodes.push(node);
    for(const n of nodes){
     const old=n.nodeValue||'',updated=old
      .replace(/Gacha|Recruitment|Chiêu mộ/gi,target);
     if(updated!==old)n.nodeValue=updated;
    }
    if(root.title)root.title=root.title.replace(/Gacha|Recruitment|Chiêu mộ/gi,target);
   }
   // Keep the recruitment prerequisite visible even before a pull.
   // This is a note only; actual ticket/Gen safety is enforced by Gacha.pull.
   const screen=document.getElementById('scr-gacha');
   if(screen){
    let note=screen.querySelector('#pkmsvv-recruitment-rule');
    if(!note){
     note=document.createElement('p');
     note.id='pkmsvv-recruitment-rule';
     note.className='pkmsvv-recruitment-rule';
     note.setAttribute('role','note');
    }
    // The screen is a flex/overlay shell, not the Recruitment card. Appending
    // the note directly there creates a separate flex column and pushes the
    // entire Gacha panel to the right (visible on large Web screens).
    // Place it directly AFTER the real ALL GEN tab row within the panel.
    const tabs=[...screen.querySelectorAll('button,[role="tab"],[data-gen]')];
    const allGen=tabs.find(b=>/^(?:ALL GEN|ALL GENERATIONS|TẤT CẢ|ALL$)/i.test(
     String(b.textContent||'').replace(/\s+/g,' ').trim()))||
     screen.querySelector('[data-gen="0"],[data-gacha-gen="0"]');
    const tabRow=allGen?.closest('[role="tablist"],.gacha-regions,.gacha-gen-tabs,.gen-tabs,.pkmsvv-gen-tabs')||
     allGen?.parentElement;
    if(tabRow?.parentElement){
     if(note.previousElementSibling!==tabRow||note.parentElement!==tabRow.parentElement)
      tabRow.insertAdjacentElement('afterend',note);
    }else{
     const heading=[...screen.querySelectorAll('h1,h2,h3')].find(h=>
      /Chiêu mộ|Recruitment/i.test(h.textContent||''));
     if(heading?.parentElement&&note.previousElementSibling!==heading)
      heading.insertAdjacentElement('afterend',note);
    }
    const label=G.I18n?.lang==='en'?
     'Only Pokémon defeated in Explore and recorded in your Pokédex can be recruited. Empty generations cannot be drawn.':
     'Chỉ những Pokémon đã hạ trong Khám phá và có trong Pokédex mới có thể Chiêu mộ. Thế hệ chưa mở khóa không thể quay.';
    if(note.textContent!==label)note.textContent=label;
   }
  }finally{busy=false;}
 }
 function install(){
  sync();
  for(const id of ['scr-gacha','scr-menu']){
   const root=document.getElementById(id);
   if(root&&typeof MutationObserver==='function'){
    const ob=new MutationObserver(()=>sync());
    ob.observe(root,{subtree:true,childList:true});
   }
  }
  document.addEventListener('click',e=>{
   if(e.target?.closest?.('[data-go="gacha"],#scr-gacha,#pkmsvv-mega-gacha')){
    Promise.resolve().then(sync);
   }
  },true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
 G.PKMSVVRecruitmentQA={sync};
})();
