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
 // Local SVG pixel scenery: original artwork; no PokéLit resources are copied.
 const SCENE_PALETTES=[
  ['#5ba9e8','#bceef7','#348b63'],['#7975b9','#e8ab75','#a65c53'],
  ['#296c9f','#a5dfde','#217ca0'],['#749bba','#e9f4fc','#607b9f'],
  ['#677ba7','#f0ad8d','#465a7a'],['#8d9cc5','#eec1c1','#9d6c98'],
  ['#56b4d0','#f9e3a4','#468f72'],['#6c85b3','#dbbdc6','#505d88'],
  ['#99a7ca','#efd1ab','#a38070'],['#6b85bb','#d6e7ff','#6d88b4']];
 const LANDMARKS=[
  '<rect x="110" y="51" width="43" height="35" fill="#f2f5e8"/><path d="M106 52l25-16 26 16" fill="#d34e55"/><rect x="127" y="68" width="11" height="18" fill="#5699ac"/><rect x="18" y="41" width="7" height="49" fill="#72503b"/><path d="M0 54L22 17 43 54z" fill="#428f62"/><rect x="61" y="42" width="7" height="48" fill="#74523b"/><path d="M44 53L64 18 85 53z" fill="#4d9a63"/>',
  '<rect x="86" y="35" width="23" height="51" fill="#d2b89e"/><path d="M70 36h56l-10-11H80zM75 51h47l-8-10H83zM78 66h41l-9-10H87z" fill="#924f4b"/><rect x="12" y="42" width="7" height="49" fill="#6e4b40"/><circle cx="16" cy="39" r="24" fill="#d57e4d"/><rect x="165" y="47" width="6" height="45" fill="#6e4b40"/><circle cx="168" cy="46" r="20" fill="#b55c57"/>',
  '<rect y="54" width="192" height="46" fill="#2784a4"/><path d="M2 61L31 32 58 58 99 29 130 59 162 33 190 57" fill="#376e6c"/><path d="M0 78q16-9 32 0t32 0t32 0t32 0t32 0t32 0" stroke="#c1f3f4" stroke-width="3" fill="none"/>',
  '<path d="M0 89L39 44 66 65 103 4 145 61 170 31 192 68v32H0" fill="#bdd9e7"/><path d="M68 60l35-56 42 57-25-17-11 7-6-23-14 23z" fill="#fff"/><path d="M0 85l37-15 35 12 75-17 45 15v20H0" fill="#637c9c"/>',
  '<rect x="9" y="43" width="25" height="52" fill="#43536d"/><rect x="44" y="21" width="32" height="74" fill="#53677d"/><rect x="86" y="36" width="29" height="59" fill="#405573"/><rect x="126" y="9" width="29" height="86" fill="#435674"/><rect x="167" y="34" width="24" height="61" fill="#374f69"/><path d="M0 87h192" stroke="#ebc98a" stroke-width="6"/><path d="M52 31h5v8h-5zm15 0h5v8h-5zm69-10h5v8h-5z" fill="#ffe0a9"/>',
  '<rect x="59" y="46" width="69" height="46" fill="#ecd1bc"/><path d="M52 46L94 15 136 46" fill="#b26f91"/><rect x="80" y="63" width="16" height="29" fill="#765875"/><rect x="149" y="17" width="13" height="71" fill="#e9d4b8"/><path d="M143 20L156 0 169 20" fill="#a96a8b"/><circle cx="25" cy="66" r="19" fill="#e493b1"/><circle cx="169" cy="65" r="16" fill="#e493b1"/>',
  '<rect x="0" y="70" width="192" height="30" fill="#eed69c"/><path d="M0 78q22-8 45 0t44 0t44 0t44 0" stroke="#4dafcc" stroke-width="6" fill="none"/><rect x="23" y="39" width="7" height="53" fill="#82634d"/><path d="M26 42q-25-30-40-10 19-6 40 12Q9 11 50 18L26 44q36-29 47-8l-47 8" fill="#3c9b6d"/><rect x="102" y="64" width="33" height="27" fill="#e0c49b"/><path d="M96 65l22-22 23 22" fill="#ba7c53"/>',
  '<rect x="36" y="38" width="119" height="56" fill="#d9ccbc"/><rect x="45" y="13" width="23" height="65" fill="#afafb4"/><rect x="122" y="10" width="23" height="70" fill="#a9a5af"/><path d="M42 14L56 0 70 14M120 11L134-3 147 11" fill="#82627c"/><rect x="77" y="50" width="36" height="44" fill="#e9dbbd"/><path d="M70 50l26-19 24 19" fill="#805c7e"/><rect x="20" y="39" width="7" height="46" fill="#c65d70"/><rect x="165" y="44" width="7" height="46" fill="#c65d70"/>',
  '<path d="M0 84L45 43 90 66 140 32 192 72v30H0" fill="#ba9580"/><rect x="64" y="40" width="82" height="54" fill="#dfc6a5"/><path d="M58 41l46-25 47 25" fill="#a36b59"/><rect x="78" y="59" width="21" height="18" fill="#719baf"/><rect x="112" y="55" width="19" height="39" fill="#795f70"/><rect x="160" y="23" width="6" height="64" fill="#9a775b"/><path d="M145 36l18-29 19 29" fill="#f7e4a8"/>',
  '<g fill="#e7f7ff"><ellipse cx="30" cy="79" rx="43" ry="13"/><ellipse cx="163" cy="84" rx="48" ry="16"/><ellipse cx="98" cy="34" rx="39" ry="13"/></g><path d="M11 69l82-28 88 26-53 14H59z" fill="#647bad"/><rect x="84" y="11" width="25" height="51" fill="#c6d1e7"/><path d="M75 13L96-5 117 13" fill="#928dbe"/><rect x="93" y="32" width="7" height="30" fill="#7c84bc"/>'
 ];
 function regionScene(i){
  const p=SCENE_PALETTES[i]||SCENE_PALETTES[0];
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 100" width="192" height="100" shape-rendering="crispEdges">'+
   '<defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="'+p[0]+'"/><stop offset="1" stop-color="'+p[1]+'"/></linearGradient></defs>'+
   '<rect width="192" height="100" fill="url(#s)"/><circle cx="165" cy="20" r="12" fill="#fff1cb" opacity=".8"/>'+
   '<path d="M0 77L36 49 68 68 116 42 152 63 192 44V100H0" fill="'+p[2]+'"/>'+
   LANDMARKS[i]+'</svg>';
  return 'background-image:url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
 }

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
   '<header><div class="region-heading"><h2>'+tr('Chọn Region','Choose Region')+'</h2>'+
   '<p>'+tr('Nhận Ấn Chứng từng vùng để mở khóa vùng kế tiếp. Vùng sau khó hơn và thử thách đa dạng hơn.','Earn Seals to unlock the next region. Challenges get tougher as you progress.')+'</p></div>' +
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
   const art=document.createElement('div');art.className='region-art';
   art.setAttribute('style',regionScene(x.index));
   const label=document.createElement('span');label.className='region-gen';label.textContent=x.gen;
   art.append(label);
   if(!x.unlocked){
    const lock=document.createElement('span');lock.className='region-lock';
    lock.textContent='🔒';art.append(lock);
   }
   const avatarDex=[150,250,384,483,643,716,791,889,1007,384][x.index];
   if(G.UI?.sprite&&G.DEX_BY?.[avatarDex]){
    const sprite=document.createElement('canvas');
    sprite.width=76;sprite.height=76;sprite.className='region-sprite';
    try{G.UI.sprite(sprite,avatarDex,{scale:2,shiny:false});art.append(sprite);}catch(_){}
   }
   const body=document.createElement('div');body.className='region-card-info';
   const name=document.createElement('strong');name.textContent=x.icon+' '+x.name;
   const diff=document.createElement('small');diff.className='region-diff';
   diff.textContent='▥ '+tr('Độ khó ','Difficulty ')+x.difficulty+'/5';
   const status=document.createElement('small');status.className='region-status';
   status.textContent=x.complete?'✓ '+tr('Đã hoàn thành · Có Ấn Chứng','Completed · Seal earned'):
    x.unlocked?tr('▶ Chọn để chơi','▶ Select to play'):
    x.index===9?'🔒 '+tr('Cần đủ 9 Ấn Chứng','Requires all 9 Seals'):
    '🔒 '+tr('Cần Ấn Chứng ','Requires Seal of ')+NAMES[x.index-1];
   body.append(name,diff,status);
   b.append(art,body);
   if(x.unlocked)b.onclick=()=>choose(x.index);
   grid.append(b);
  }
 }
 function open(){
  if(G.Coop?.active||getChampion()?.active)return false;
  render();overlay.hidden=false;return true;
 }
 function close(){if(overlay)overlay.hidden=true;}
 function beginRun(index,formerBiome=null){
  if(!Number.isInteger(index)||!unlocked(index)||current)return false;
  const biome=targetBiome(index);
  current={index,biome};
  previousBiome=Number.isFinite(formerBiome)?formerBiome:(Number.isFinite(G.World?.biome)?G.World.biome:null);
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
  const priorBiome=G.World?.biome;
  const out=prev.apply(this,args);
  if(index!==null&&index!==undefined&&!G.Coop?.active&&!getChampion()?.active)
   beginRun(index,priorBiome);
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
