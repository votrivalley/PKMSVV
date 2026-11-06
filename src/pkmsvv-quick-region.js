/* Pokémon Chuyển Sinh: QA-only "Chơi ngay" Region chooser.
 * This is NORMAL free play, not the 16-player Champion tournament.
 * Only the current run uses a fixed biome and generation-filtered native waves.
 * No Crown Seal, chapter or save flag is ever changed here.
 */
(function(){
 'use strict';
 if(typeof document==='undefined'||typeof G==='undefined')return;
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const THEMES=['fire','steel','water','ground','rock','dark','bug','fighting','ice','dragon'];
 const NAMES=['Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea','Votri Valley'];
 const SYMBOLS=['🔥','🌳','🌊','❄️','⚙️','✨','🌴','🏟️','⛰️','🐉'];
 const REGION_COUNT=10;
 const title=(n)=>n===9?tr('Tháp Thiên Không','Sky Pillar'):NAMES[n];
 let overlay=null,armed=null,current=null,previousBiome=null,changing=false,bypass=false;
 const getChampion=()=>G.PKMSVVChampionArena;
 const getSave=()=>G.DB?.save;
 function unlocked(index,save=getSave()){
  if(!Number.isInteger(index)||index<0||index>=REGION_COUNT)return false;
  if(index===0)return true;
  const seals=save?.arenas?.pkmChampion?.seals||{};
  // Preserve existing Region/Crown Journey unlock logic and save keys.
  return seals[NAMES[index]]===true||
   NAMES.slice(0,index).every(name=>seals[name]===true);
 }
 function regionIndex(){return current?.index??-1;}
 function targetBiome(index){
  const n=G.Tiles?.arenaBiome?.(THEMES[index]);
  return Number.isFinite(n)?n:null;
 }
 function endRun(){
  if(changing)return;
  changing=true;
  try{
   const previous=previousBiome;
   current=null;armed=null;previousBiome=null;
   if(Number.isFinite(previous)&&typeof G.World?.setBiome==='function')
    G.World.setBiome(previous,true);
  }finally{changing=false;}
 }
 function choose(index){
  if(!unlocked(index)||getChampion()?.active||G.Coop?.active||G.Game?.state==='playing')return false;
  const native=document.querySelector('#scr-menu [data-go="play"]');
  if(!native)return false;
  close();
  armed=index;
  bypass=true;
  try{native.click();}finally{
   bypass=false;
   // If old menu no longer calls Game.startRun, don't leave a phantom session.
   if(armed!==null)armed=null;
  }
  return true;
 }
 function entries(){
  const save=getSave(),champ=getChampion(),regions=champ?.REGIONS||NAMES.map(n=>[n,0,'']);
  return NAMES.map((name,i)=>({
   index:i,name:title(i),
   gen:i===9?tr('Rồng · Nhiều Gen','Dragon · Mixed Gen'):'Gen '+(i+1),
   champion:regions[i]?.[2]||'',
   difficulty:Math.min(5,1+Math.floor(i/2)),
   unlocked:unlocked(i,save),
   complete:save?.arenas?.pkmChampion?.seals?.[name]===true,
   icon:SYMBOLS[i]
  }));
 }
 function build(){
  if(overlay?.isConnected)return overlay;
  overlay=document.createElement('section');overlay.id='pkmsvv-quick-region';
  overlay.className='pkmsvv-quick-region-overlay';overlay.hidden=true;
  overlay.setAttribute('aria-label',tr('Chọn Region','Choose Region'));
  overlay.innerHTML='<div class="pkmsvv-quick-region-panel" role="dialog" aria-modal="true">'+
   '<header><h2>'+tr('Chọn Region','Choose Region')+'</h2>'+
   '<button type="button" id="pkmsvv-quick-region-close" aria-label="'+tr('Đóng','Close')+'">×</button></header>'+
   '<div id="pkmsvv-quick-region-grid" class="pkmsvv-quick-region-grid"></div></div>';
  document.body.append(overlay);
  overlay.querySelector('#pkmsvv-quick-region-close').onclick=close;
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
  return overlay;
 }
 function render(){
  const panel=build(),grid=panel.querySelector('#pkmsvv-quick-region-grid');
  grid.replaceChildren();
  for(const x of entries()){
   const b=document.createElement('button');b.type='button';
   b.className='pkmsvv-quick-region-card region-'+x.index+
    (x.unlocked?'':' locked')+(x.complete?' cleared':'');
   b.disabled=!x.unlocked;
   b.setAttribute('aria-label',x.name+' '+(x.unlocked?tr('Đã mở','Unlocked'):tr('Chưa mở','Locked')));
   const label=document.createElement('span');label.className='region-gen';label.textContent=x.gen;
   const icon=document.createElement('span');icon.className='region-icon';icon.textContent=x.icon;
   const name=document.createElement('strong');name.textContent=x.name;
   const diff=document.createElement('small');diff.className='region-diff';
   diff.textContent=tr('Độ khó ','Difficulty ')+x.difficulty+'/5';
   const status=document.createElement('small');status.className='region-status';
   status.textContent=x.complete?'✓ '+tr('Đã hoàn thành','Completed'):
    x.unlocked?tr('Chọn để chơi','Select to play'):'🔒 '+tr('Cần Ấn Chứng vùng trước','Requires previous region Seal');
   b.append(label,icon,name,diff,status);
   if(x.unlocked)b.onclick=()=>choose(x.index);
   grid.append(b);
  }
 }
 function open(){
  if(G.Coop?.active||getChampion()?.active)return false;
  render();overlay.hidden=false;return true;
 }
 function close(){if(overlay)overlay.hidden=true;}
 function beginRun(index){
  if(!Number.isInteger(index)||!unlocked(index)||current)return false;
  const biome=targetBiome(index);
  current={index,biome};
  previousBiome=Number.isFinite(G.World?.biome)?G.World.biome:null;
  if(Number.isFinite(biome))G.World?.setBiome?.(biome,true);
  return true;
 }
 function intercept(event){
  if(bypass||event.defaultPrevented||G.Game?.state==='playing')return;
  const target=event.target?.closest?.('#scr-menu [data-go="play"]');
  if(!target)return;
  event.preventDefault();event.stopImmediatePropagation();
  open();
 }
 document.addEventListener('click',intercept,true);
 function wrap(obj,key,wrapper){
  if(!obj||typeof obj[key]!=='function')return;
  const prev=obj[key];obj[key]=function(...args){return wrapper.call(this,prev,args)};
 }
 // The native Play button is replayed only once after choosing an unlocked Region.
 // Other game modes still use the original startup and their own map policies.
 wrap(G.Game,'startRun',function(prev,args){
  if(current)endRun();
  const index=armed;armed=null;
  const out=prev.apply(this,args);
  if(index!==null&&index!==undefined&&!G.Coop?.active&&!getChampion()?.active)
   beginRun(index);
  return out;
 });
 wrap(G.World,'setBiome',function(prev,args){
  if(!current||!Number.isFinite(current.biome)||changing)return prev.apply(this,args);
  const copy=args.slice();copy[0]=current.biome;
  return prev.apply(this,copy);
 });
 wrap(G.Spawner,'update',function(prev,args){
  const index=regionIndex();
  if(index<0||getChampion()?.active||G.Coop?.active)return prev.apply(this,args);
  const enemies=G.Enemies,original=enemies?.bagAt;
  if(typeof original!=='function'||typeof getChampion()?.regionizeBag!=='function')
   return prev.apply(this,args);
  enemies.bagAt=function(...params){
   return getChampion().regionizeBag(original.apply(this,params),index);
  };
  try{return prev.apply(this,args);}
  finally{enemies.bagAt=original;}
 });
 for(const [obj,key] of [[G.Game,'toUI'],[G.Game,'quit'],[G.Flow,'goMenu']]){
  wrap(obj,key,function(prev,args){if(current)endRun();return prev.apply(this,args);});
 }
 if(typeof G.MenuUI?.open==='function')wrap(G.MenuUI,'open',function(prev,args){
  const out=prev.apply(this,args);
  if(current)endRun();
  return out;
 });
 G.PKMSVVQuickRegion={open,close,choose,entries,unlocked,beginRun,endRun,
  get active(){return regionIndex()>=0},get selectedRegion(){return regionIndex()}};
})();
