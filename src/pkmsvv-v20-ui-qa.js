/* QA-only polish: equalize Recruitment card size without replacing buttons,
 * losing their click handlers, ticket prices or language-switch behavior. */
(function(){
 'use strict';
 if(typeof document==='undefined')return;
 let busy=false;
 function sync(){
  if(busy)return;busy=true;
  try{
   const root=document.getElementById('scr-gacha');
   if(!root)return;
   const matches=[...root.querySelectorAll('button')].filter(el=>{
    const label=String(el.textContent||'').trim();
    return /(?:Quay|Chiêu mộ|Recruit|Pull|Draw)/i.test(label)&&
     /(?:1|10|100|vé|ticket|×|x)/i.test(label)&&
     !/Đóng|Close|Bỏ qua|Skip/i.test(label);
   });
   for(const btn of matches)btn.classList.add('pkmsvv-v20-gacha-card');
   if(matches.length>=3){
    const p=matches[0].parentElement;
    if(p&&matches.every(x=>x.parentElement===p))
     p.classList.add('pkmsvv-v20-gacha-actions');
   }
  }finally{busy=false;}
 }
 function install(){
  sync();
  const root=document.getElementById('scr-gacha');
  if(root&&typeof MutationObserver==='function'){
   const observer=new MutationObserver(sync);
   observer.observe(root,{subtree:true,childList:true,characterData:true});
  }
 }
 if(document.readyState==='loading')
  document.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
 G.PKMSVV20UIPolish={sync};
})();
