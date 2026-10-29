'use strict';
/* Phase 1: an actual Mega Evolution entry alongside Support Pokémon in Upgrades.
 * No Pokédex reveals, persistent stones, upgrades or rewards are granted here.
 */
G.PKMSVVMegaEntry=(()=>{
 const $=id=>document.getElementById(id);
 const t=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 function close(){
  const overlay=$('pkmsvv-mega-phase1');
  if(overlay)overlay.hidden=true;
 }
 function ensure(){
  const back=$('pkmsvv-upgrade-back');
  if(!back||!back.parentElement)return false;
  // This button must ALWAYS be next to the Support Pokédex button.
  G.PKMSVVSupportCatalog?.ensure?.();
  let button=$('pkmsvv-mega-entry');
  if(!button){
   button=document.createElement('button');
   button.type='button';
   button.id='pkmsvv-mega-entry';
   button.className='btn small pkmsvv-mega-entry-btn';
   button.addEventListener('click',open);
  }
  const support=$('pkmsvv-support-entry');
  if(support&&support.parentElement===back.parentElement)
   back.parentElement.insertBefore(button,support.nextSibling||back);
  else back.parentElement.insertBefore(button,back);
  button.textContent=t('✧ Tiến hóa Mega','✧ Mega Evolution');
  button.setAttribute('aria-haspopup','dialog');
  button.setAttribute('aria-controls','pkmsvv-mega-phase1');
  return true;
 }
 function build(){
  let overlay=$('pkmsvv-mega-phase1');
  if(overlay)return overlay;
  overlay=document.createElement('div');
  overlay.id='pkmsvv-mega-phase1';
  overlay.className='pkmsvv-mega-phase1-overlay';
  overlay.hidden=true;
  const panel=document.createElement('section');
  panel.className='pkmsvv-mega-phase1-dialog';
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-modal','true');
  panel.setAttribute('aria-labelledby','pkmsvv-mega-phase1-title');
  const head=document.createElement('header');head.className='pkmsvv-mega-phase1-head';
  const title=document.createElement('h2');title.id='pkmsvv-mega-phase1-title';
  const exit=document.createElement('button');
  exit.type='button';exit.className='btn small ghost';
  exit.setAttribute('data-mega-close','');
  exit.addEventListener('click',close);
  head.append(title,exit);
  const locked=document.createElement('div');locked.className='pkmsvv-mega-phase1-locked';
  const symbol=document.createElement('strong');symbol.textContent='???';
  const hint=document.createElement('small');hint.id='pkmsvv-mega-phase1-lock';
  locked.append(symbol,hint);
  const note=document.createElement('p');note.id='pkmsvv-mega-phase1-note';
  panel.append(head,locked,note);overlay.append(panel);
  overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
  document.body.append(overlay);
  return overlay;
 }
 function open(){
  if(!ensure())return false;
  const overlay=build();
  $('pkmsvv-mega-phase1-title').textContent=t('Tiến hóa Mega','Mega Evolution');
  $('pkmsvv-mega-phase1-lock').textContent=t('Chưa mở khóa','Not unlocked');
  $('pkmsvv-mega-phase1-note').textContent=t(
   'Danh sách Mega đang được hoàn thiện. Pokémon chưa mở sẽ hiển thị bóng đen và ???; chưa có Mega Stone hoặc sức mạnh nào được cấp từ màn hình này.',
   'The Mega roster is being prepared. Undiscovered forms will appear as silhouettes and ???. This screen does not grant Mega Stones or power.');
  overlay.querySelector('[data-mega-close]').textContent=t('Đóng','Close');
  overlay.hidden=false;
  overlay.querySelector('[data-mega-close]').focus?.();
  return true;
 }
 const originalOpen=G.PKMSVVUpgradeChooser?.open;
 if(typeof originalOpen==='function'){
  G.PKMSVVUpgradeChooser.open=function(...args){
   const result=originalOpen.apply(this,args);
   ensure();
   return result;
  };
 }
 document.addEventListener('keydown',event=>{
  const overlay=$('pkmsvv-mega-phase1');
  if(!overlay||overlay.hidden||event.key!=='Escape')return;
  close();event.preventDefault();event.stopPropagation();
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure,{once:true});
 else ensure();
 return {open,close,ensure};
})();
