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
