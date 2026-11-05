/* Pokémon Chuyển Sinh — PokéBox Stage 1 (isolated QA).
 * Non-destructive migration of legacy species save; no gacha/rank logic yet.
 * CommonJS exports enable tests, browser attaches to G.PKMSVVBox.
 */
(function(root, factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.G)root.G.PKMSVVBox=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const SCHEMA=1,PAGE=30;
 const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
 const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const dexKey=k=>/^[1-9][0-9]{0,3}$/.test(String(k))&&Number(k)<=1025;
 const copy=x=>JSON.parse(JSON.stringify(x));
 const clean=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const tr=(vi,en)=>typeof G!=='undefined'&&G.I18n?.lang==='en'?en:vi;
 const getSave=()=>typeof G!=='undefined'?G.DB?.save:null;
 function legacyFavorite(save,dex){
   // Preserve a recognized old per-species favorite marker if present, but
   // do not invent favorites from an unrelated setting.
   for(const key of ['favorites','favs','fav','pfav']){
     const old=save?.[key];
     if(Array.isArray(old)&&old.some(v=>Number(v)===dex||v?.dex===dex))return true;
     if(record(old)&&(old[dex]===true||old[dex]===1||old[dex]?.favorite===true))return true;
   }
   return false;
 }
 function listLegacy(save,lookups={}){
   if(!record(save)||!record(save.owned)||!record(save.shiny))throw Error('Legacy save collection is invalid');
   const dexes=[...new Set([...Object.keys(save.owned),...Object.keys(save.shiny)]
     .filter(dexKey).map(Number))].sort((a,b)=>a-b);
   const box=[];
   for(const dex of dexes){
     const nature=typeof lookups.natureOf==='function'?lookups.natureOf(dex):null;
     const ability=typeof lookups.abilityOf==='function'?lookups.abilityOf(dex):null;
     const natureId=typeof nature==='string'?nature:nature?.id;
     const abilitySlot=Number.isInteger(ability?.slot)?ability.slot:0;
     const base={dex,natureId:natureId||'hardy',abilitySlot,rank:0,locked:false,favorite:legacyFavorite(save,dex)};
     if(own(save.owned,String(dex))&&save.owned[dex])box.push({...base,id:'b1-'+dex+'-n',shiny:false});
     if(own(save.shiny,String(dex))&&save.shiny[dex])box.push({...base,id:'b1-'+dex+'-s',shiny:true});
   }
   return box;
 }
 function selectedId(save,box){
   const dex=Number(save.partner);
   const wantShiny=!!save.partnerShiny;
   const matching=box.find(x=>x.dex===dex&&x.shiny===wantShiny)||box.find(x=>x.dex===dex)||box[0];
   return matching?.id||null;
 }
 function migrate(save,lookups={}){
   if(!record(save))throw Error('No save');
   if(save.pkmsvvBoxSchema!==undefined){
     if(save.pkmsvvBoxSchema!==SCHEMA||!Array.isArray(save.pkmsvvBox))throw Error('Unknown PokéBox schema: refusing overwrite');
     return {save:copy(save),changed:false,count:save.pkmsvvBox.length};
   }
   const next=copy(save);
   const box=listLegacy(save,lookups);
   next.pkmsvvBoxSchema=SCHEMA;
   next.pkmsvvBox=box;
   next.pkmsvvSelectedInstanceId=selectedId(save,box);
   next.pkmsvvTeam6=next.pkmsvvSelectedInstanceId?[next.pkmsvvSelectedInstanceId]:[];
   const lead=box.find(x=>x.id===next.pkmsvvSelectedInstanceId);if(lead)lead.favorite=true;
   return {save:next,changed:true,count:box.length};
 }
 function validBox(save){
   if(save?.pkmsvvBoxSchema!==SCHEMA||!Array.isArray(save.pkmsvvBox))return false;
   const ids=new Set();
   for(const x of save.pkmsvvBox){
     if(!record(x)||typeof x.id!=='string'||ids.has(x.id)||!dexKey(x.dex)||typeof x.shiny!=='boolean'||!Number.isInteger(x.rank)||x.rank<0||x.rank>5)return false;
     ids.add(x.id);
   }
   return true;
 }
 function lookups(){
   return {natureOf:dex=>G.Mons?.natureOf?.(dex),abilityOf:dex=>G.Mons?.abilityOf?.(dex)};
 }
 function snapshotFields(s){return ['pkmsvvBoxSchema','pkmsvvBox','pkmsvvSelectedInstanceId','pkmsvvTeam6','partner','partnerShiny'].map(k=>({k,exists:own(s,k),v:s[k]}));}
 function rollbackFields(s,values){for(const {k,exists,v} of values)if(exists)s[k]=v;else delete s[k];}
 function persistMigration(){
   const s=getSave();if(!s||!G.DB||G.DB.guest)throw Error(tr('Hãy đăng nhập hồ sơ offline trước.','Log into an offline profile first.'));
   const result=migrate(s,lookups());if(!result.changed)return result;
   const old=snapshotFields(s);
   try{
     for(const k of ['pkmsvvBoxSchema','pkmsvvBox','pkmsvvSelectedInstanceId','pkmsvvTeam6'])s[k]=result.save[k];
     if(!validBox(s))throw Error('Invalid migrated box');
     if(G.DB.commit(true)===false)throw Error('Save commit failed');
     return result;
   }catch(e){rollbackFields(s,old);throw e;}
 }
 function selectInstance(id){
   const s=getSave();if(!validBox(s))return false;
   const item=s.pkmsvvBox.find(x=>x.id===id);if(!item||!s.owned?.[item.dex])return false;
   if(item.shiny&&!s.shiny?.[item.dex])return false;
   const old=snapshotFields(s);
   try{
     s.pkmsvvSelectedInstanceId=item.id;s.partner=item.dex;s.partnerShiny=item.shiny;
     if(G.DB.commit(true)===false)throw Error('Save commit failed');
     return true;
   }catch(e){rollbackFields(s,old);return false;}
 }
 let pane=null,backupMade=false,page=0,filter='',shinyOnly=false,onlyFavorites=false;
 const getBox=()=>validBox(getSave())?getSave().pkmsvvBox:listLegacy(getSave(),lookups());
 function mountButton(){
   if(typeof document==='undefined')return;
   const dex=document.querySelector('#scr-menu [data-go="dex"]');if(!dex)return;
   dex.setAttribute('translate','no');
   const lab=dex.querySelector('.pkmsvv-menu-label');if(lab)lab.textContent='Pokédex';
   if(document.getElementById('pkmsvv-pokebox-button'))return;
   const b=document.createElement('button');b.type='button';b.id='pkmsvv-pokebox-button';b.className=dex.className;
   b.setAttribute('translate','no');b.textContent='📦 PokéBox';b.onclick=open;
   dex.insertAdjacentElement('afterend',b);
 }
 function mountOverlay(){
   if(pane?.isConnected)return;
   pane=document.createElement('div');pane.id='pkmsvv-pokebox-overlay';pane.setAttribute('translate','no');
   pane.innerHTML='<section class="pkmbx-panel" role="dialog" aria-modal="true" aria-label="PokéBox">'+
   '<header class="pkmbx-head"><h2>📦 PokéBox <small>Stage 1 QA</small></h2><button class="btn small" id="pkmbx-close"></button></header>'+
   '<p class="pkmbx-note" id="pkmbx-status"></p><div class="pkmbx-actions">'+
   '<input id="pkmbx-query" type="search" autocomplete="off" placeholder="Pokémon / #Dex"/>'+
   '<label><input type="checkbox" id="pkmbx-shiny"/> Shiny</label><label><input type="checkbox" id="pkmbx-favorite"/></label></div>'+
   '<div class="pkmbx-grid" id="pkmbx-grid"></div><nav class="pkmbx-page">'+
   '<button class="btn small" id="pkmbx-prev">◀</button><span id="pkmbx-pagenum"></span><button class="btn small" id="pkmbx-next">▶</button></nav>'+
   '<footer class="pkmbx-foot"><button class="btn small" id="pkmbx-export"></button><button class="btn small gold" id="pkmbx-migrate"></button></footer>'+
   '<p class="pkmbx-warning" id="pkmbx-warning"></p></section>';
   document.body.appendChild(pane);
   pane.querySelector('#pkmbx-close').onclick=close;
   pane.querySelector('#pkmbx-query').oninput=e=>{filter=e.target.value;page=0;render();};
   pane.querySelector('#pkmbx-shiny').onchange=e=>{shinyOnly=e.target.checked;page=0;render();};
   pane.querySelector('#pkmbx-favorite').onchange=e=>{onlyFavorites=e.target.checked;page=0;render();};
   pane.querySelector('#pkmbx-prev').onclick=()=>{page=Math.max(0,page-1);render();};
   pane.querySelector('#pkmbx-next').onclick=()=>{page++;render();};
   pane.querySelector('#pkmbx-export').onclick=backup;
   pane.querySelector('#pkmbx-migrate').onclick=()=>{
     if(!backupMade)return;
     if(!confirm(tr('Chuyển dữ liệu cũ sang PokéBox? Bản gốc vẫn được giữ trong save.','Migrate legacy collection to PokéBox? Legacy fields remain intact.')))return;
     try{persistMigration();render();}catch(e){pane.querySelector('#pkmbx-warning').textContent=tr('Lưu thất bại — không ghi đè save: ','Migration failed — save intact: ')+e.message;}
   };
   pane.addEventListener('click',e=>{if(e.target===pane)close();});
 }
 function backup(){
   try{
     const text=G.PKMSVVSaveUI?.backup?.();if(!text)throw Error('Backup function unavailable');
     const blob=new Blob([text],{type:'application/json'}),href=URL.createObjectURL(blob);
     const a=document.createElement('a');a.href=href;a.download='PKMSVV-before-PokeBox-stage1.json';document.body.append(a);a.click();a.remove();
     setTimeout(()=>URL.revokeObjectURL(href),30000);
     backupMade=true;render();
   }catch(e){pane.querySelector('#pkmbx-warning').textContent=tr('Không xuất được file save: ','Could not export save: ')+e.message;}
 }
 function render(){
   if(!pane)return;
   const s=getSave(),saved=validBox(s),items=getBox();
   const q=filter.trim().toLowerCase();
   const visible=items.filter(x=>{
     const mon=G.DEX_BY?.[x.dex];const name=String(mon?.name||'').toLowerCase();
     return (!shinyOnly||x.shiny)&&(!onlyFavorites||x.favorite)&&( !q||name.includes(q)||String(x.dex).includes(q));
   });
   const pages=Math.max(1,Math.ceil(visible.length/PAGE));page=Math.min(page,pages-1);
   pane.querySelector('#pkmbx-close').textContent=tr('✕ Đóng','✕ Close');
   pane.querySelector('#pkmbx-favorite').parentElement.lastChild.textContent=tr(' Yêu thích',' Favorites');
   pane.querySelector('#pkmbx-status').textContent=saved?
     tr('Đã chuyển save: ','Migrated: ')+items.length+tr(' cá thể · Chọn Pokémon ra trận tại đây.',' individuals · Select your fighter here.'):
     tr('Xem trước: ','Preview: ')+items.length+tr(' cá thể từ save cũ. Chưa chỉnh sửa dữ liệu.',' individuals from old save. No changes yet.');
   pane.querySelector('#pkmbx-warning').textContent=tr('Stage 1: Nature/Ability đã lưu theo cá thể nhưng chiến đấu và Gacha vẫn chạy theo hệ cũ.','Stage 1: Nature/Ability stored per individual; battle and Gacha still use legacy system.');
   const grid=pane.querySelector('#pkmbx-grid');grid.replaceChildren();
   const selected=s?.pkmsvvSelectedInstanceId;
   for(const x of visible.slice(page*PAGE,(page+1)*PAGE)){
     const mon=G.DEX_BY?.[x.dex];
     const b=document.createElement('button');b.type='button';b.className='pkmbx-slot'+(x.id===selected?' selected':'');
     b.setAttribute('translate','no');b.title=tr('Chọn Pokémon này ra trận','Select this Pokémon for battle');
     b.innerHTML='<canvas width="76" height="76" class="pkmbx-mon"></canvas><span class="pkmbx-name">'+clean(mon?.name||'#'+x.dex)+'</span>'+
       '<small>#'+x.dex+(x.shiny?' ✨ Shiny':'')+' · R'+x.rank+'</small>'+
       '<small>'+clean(x.natureId)+' · '+tr('Đặc tính','Ability')+' '+x.abilitySlot+'</small>';
     b.disabled=!saved;b.onclick=()=>{if(selectInstance(x.id)){render();G.MenuUI?.open?.();}};
     grid.appendChild(b);
     try{G.UI?.sprite?.(b.querySelector('canvas'),x.dex,{scale:2,shiny:x.shiny});}catch(_){/* icon fallback */}
   }
   pane.querySelector('#pkmbx-pagenum').textContent=(page+1)+' / '+pages;
   pane.querySelector('#pkmbx-prev').disabled=page===0;
   pane.querySelector('#pkmbx-next').disabled=page===pages-1;
   pane.querySelector('#pkmbx-export').textContent=tr('💾 Xuất save gốc','💾 Export original save');
   const mig=pane.querySelector('#pkmbx-migrate');mig.textContent=saved?tr('✓ Đã chuyển','✓ Migrated'):tr('Tạo PokéBox từ save cũ','Create PokéBox from legacy save');
   mig.disabled=saved||!backupMade||G.DB?.guest;
 }
 function open(){
   const s=getSave();if(!s)return;
   backupMade=false;page=0;filter='';shinyOnly=false;onlyFavorites=false;
   mountOverlay();pane.hidden=false;render();
 }
 function close(){if(pane)pane.remove();pane=null;backupMade=false;}
 function init(){
   if(typeof document==='undefined')return;
   const wrap=()=>{
     if(G.MenuUI?.open&&!G.MenuUI._pkmbxWrapped){
       const old=G.MenuUI.open;
       G.MenuUI.open=function(...args){const ret=old.apply(this,args);mountButton();return ret;};
       G.MenuUI._pkmbxWrapped=true;
     }
     mountButton();
   };
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wrap,{once:true});else wrap();
 }
 return {SCHEMA,PAGE,listLegacy,migrate,validBox,selectedId,selectInstance,persistMigration,init,open,close};
});
if(typeof window!=='undefined'&&window.G)window.G.PKMSVVBox?.init?.();