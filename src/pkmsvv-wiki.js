/* Pokémon Chuyển Sinh: PC hub for Support Pokémon, Mega and Berry.
 * No network dependencies: use the already bundled in-game Pokémon sprite system.
 */
G.PKMSVVWiki=(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 function close(){const el=$('pkmsvv-wiki-overlay');el?.remove?.();}
 function megaMewtwoArt(){
  const f=(G.PKMSVV_MEGA_CATALOG||[]).find(f=>f.dex===150&&
   f.artReady&&G.SPRITE_META?.[f.spriteId]?.a?.Idle&&/mewtwo/i.test(f.key||''));
  return f?.spriteId||150; // Fallback preserves a recognizable Mewtwo, never a fake Mega sprite.
 }
 function installStyle(){
  if($('pkmsvv-pc-style'))return;
  const css=document.createElement('style');css.id='pkmsvv-pc-style';
  css.textContent=`
  #pkmsvv-wiki-overlay.pkmsvv-pc-overlay{position:fixed;inset:0;z-index:20000;
   display:flex;align-items:center;justify-content:center;padding:16px;
   background:rgba(2,15,27,.82);overflow:auto}
  .pkmsvv-pc-overlay .pkmsvv-pc-panel{width:min(810px,100%);max-height:min(90vh,880px);
   overflow:auto;color:#effbf8;border:2px solid #a2e5db;border-radius:15px;
   box-shadow:0 18px 46px #0009;background:linear-gradient(145deg,#174952,#102b42);padding:17px}
  .pkmsvv-pc-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
  .pkmsvv-pc-header h2{margin:0;font-size:clamp(19px,3vw,28px);color:#ffe28a}
  .pkmsvv-pc-close{border:2px solid #f0d485;background:#ffe084;color:#163847;font-weight:900;
   padding:8px 13px;border-radius:9px;cursor:pointer}
  .pkmsvv-pc-hint{margin:0 0 13px;color:#c0e5e1;font-size:13px}
  .pkmsvv-pc-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
  .pkmsvv-pc-card{border:2px solid #88c9c3;background:linear-gradient(180deg,#235b64,#174450);
   border-radius:13px;padding:10px 9px 13px;cursor:pointer;color:#faffff;
   display:flex;align-items:center;flex-direction:column;text-align:center;gap:6px;
   min-width:0;transition:border-color .15s,transform .15s}
  .pkmsvv-pc-card:hover,.pkmsvv-pc-card:focus-visible{border-color:#ffe18e;transform:translateY(-2px)}
  .pkmsvv-pc-card canvas{width:118px;height:118px;max-width:100%;image-rendering:pixelated}
  .pkmsvv-pc-card strong{font-size:clamp(14px,2.1vw,18px);color:#ffdf89}
  .pkmsvv-pc-card small{font-size:12px;line-height:1.4;color:#d8eeeb}
  .pkmsvv-pc-guide{margin-top:14px;border:1px solid #84c6bc;border-radius:12px;padding:12px;background:#123640}
  .pkmsvv-pc-guide h3{color:#ffe6a0;margin:0 0 9px;font-size:17px}
  .pkmsvv-pc-berry-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-height:55vh;overflow-y:auto}
  .pkmsvv-pc-berry-row{display:flex;align-items:center;gap:9px;padding:8px;border:1px solid #5b8e91;border-radius:9px;background:#1b4951}
  .pkmsvv-pc-berry-row img{width:38px;height:38px;object-fit:contain;image-rendering:pixelated;flex-shrink:0}
  .pkmsvv-pc-berry-row strong{color:#ffdf8c;display:block}
  .pkmsvv-pc-berry-row span{font-size:12px;line-height:1.5;color:#e4f5f2}
  .pkmsvv-pc-learn{margin-top:9px;border:1px solid #80bbb2;background:#204e55;border-radius:9px;padding:10px}
  .pkmsvv-pc-learn summary{cursor:pointer;color:#ffe3a3;font-weight:bold}
  .pkmsvv-pc-learn p{color:#d8efeb;font-size:13px;line-height:1.65}
  .pkmsvv-pc-card .pkmsvv-pc-action{margin-top:auto;border-radius:8px;background:#ffdc68;
    color:#103841;padding:7px 12px;font-weight:900;font-size:13px}
  @media(max-width:580px){.pkmsvv-pc-grid{grid-template-columns:1fr;gap:8px}
   .pkmsvv-pc-card{flex-direction:row;justify-content:flex-start;text-align:left;flex-wrap:wrap}
   .pkmsvv-pc-card canvas{width:76px;height:76px;flex:0 0 76px}
   .pkmsvv-pc-card small{max-width:calc(100% - 88px)}.pkmsvv-pc-card .pkmsvv-pc-action{margin-left:auto}
  }`;
  document.head.append(css);
 }
 function installMenu(){
  const list=document.querySelector('#scr-menu .menu-right .menu-list');
  if(!list)return;
  let b=$('pkmsvv-menu-wiki');
  if(!b){
   b=document.createElement('button');b.type='button';b.id='pkmsvv-menu-wiki';
   b.className='menu-item pkmsvv-menu-wiki';
   const upgrade=list.querySelector('[data-go="upgrades"]');
   if(upgrade)list.insertBefore(b,upgrade);else list.append(b);
  }
  b.innerHTML='<span class="mi-ico">💻</span><span class="pkmsvv-menu-copy"><span class="pkmsvv-menu-label">PC</span><small>Pokémon hỗ trợ · Mega · Berry</small></span>';
  b.onclick=e=>{e.preventDefault();e.stopPropagation();open();};
 }
 function makeCard(grid,{title,desc,action,dex,onClick}){
  const b=document.createElement('button');b.type='button';b.className='pkmsvv-pc-card';
  b.setAttribute('aria-label',title+' — '+action);
  const canvas=document.createElement('canvas');canvas.width=144;canvas.height=144;
  canvas.setAttribute('aria-hidden','true');b.append(canvas);
  const name=document.createElement('strong');name.textContent=title;b.append(name);
  const detail=document.createElement('small');detail.textContent=desc;b.append(detail);
  const go=document.createElement('span');go.className='pkmsvv-pc-action';go.textContent=action;b.append(go);
  grid.append(b);
  try{
   if(G.UI?.sprite)G.UI.sprite(canvas,dex,{lively:true,scale:2,hero:true});
   else if(G.UI?.spriteCanvas){const art=G.UI.spriteCanvas(dex,144,144,{lively:true,scale:2,hero:true});canvas.replaceWith(art);}
  }catch(_e){/* UI sprite not initialized yet; card remains usable */ }
  b.onclick=()=>{close();onClick();};
  return b;
 }
 function berryGuide(){
  close();installStyle();
  const shade=document.createElement('div');shade.id='pkmsvv-wiki-overlay';
  shade.className='pkmsvv-pc-overlay';shade.setAttribute('role','dialog');
  shade.setAttribute('aria-modal','true');
  const box=document.createElement('section');box.className='pkmsvv-pc-panel';
  const head=document.createElement('header');head.className='pkmsvv-pc-header';
  const h=document.createElement('h2');h.textContent=tr('🍓 CẨM NANG BERRY','🍓 BERRY GUIDE');
  const back=document.createElement('button');back.type='button';back.className='pkmsvv-pc-close';
  back.textContent=tr('← Quay lại PC','← Back to PC');back.onclick=open;
  head.append(h,back);box.append(head);
  const intro=document.createElement('p');intro.className='pkmsvv-pc-hint';
  intro.textContent=tr('Berry dùng một lần, tối đa 2 quả mỗi trận; chọn trong 4 giây trước trận. Chương 6 cần sử dụng 5 loại khác nhau.',
  'Berries are single-use: up to two per match, selected in four seconds. Chapter 6 requires five distinct kinds.');
  box.append(intro);
  const grid=document.createElement('div');grid.className='pkmsvv-pc-berry-list';
  for(const item of G.PKMSVVBerry?.TYPES||[]){
   const tile=document.createElement('div');tile.className='pkmsvv-pc-berry-row';
   const image=document.createElement('img');image.src='assets/berry/'+encodeURIComponent(item.id)+'.png';
   image.alt=item.name;image.loading='lazy';
   const text=document.createElement('div');const title=document.createElement('strong');
   title.textContent=item.name+' Berry';
   const effect=document.createElement('span');effect.textContent=item.desc?.[G.I18n?.lang==='en'?1:0]||'';
   text.append(title,effect);tile.append(image,text);grid.append(tile);
  }
  box.append(grid);
  const note=document.createElement('p');note.className='pkmsvv-pc-hint';
  note.textContent=tr('Berry hiếm nhận từ Giải Cứu Berry. Mua Berry tại Kecleon Shop → Berry.',
   'Rare berries drop in Rescue Berry. Purchase berries in Kecleon Shop → Berry.');
  box.append(note);shade.append(box);document.body.append(shade);
  shade.addEventListener('click',e=>{if(e.target===shade)open();});
  back.focus();G.Pad?.focusFirst?.();return true;
 }
 function open(){
  close();installStyle();
  const overlay=document.createElement('div');overlay.id='pkmsvv-wiki-overlay';
  overlay.className='pkmsvv-pc-overlay';overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','PC');
  const box=document.createElement('section');box.className='pkmsvv-pc-panel';
  const head=document.createElement('header');head.className='pkmsvv-pc-header';
  const title=document.createElement('h2');title.textContent='💻 PC · POKÉMON CHUYỂN SINH';
  const x=document.createElement('button');x.type='button';x.className='pkmsvv-pc-close';x.textContent=tr('✕ Đóng','✕ Close');x.onclick=close;
  head.append(title,x);box.append(head);
  const hint=document.createElement('p');hint.className='pkmsvv-pc-hint';
  hint.textContent=tr('Chọn một mục để vào thẳng tính năng, không cần mở Wiki trung gian.','Select a feature directly.');box.append(hint);
  const grid=document.createElement('div');grid.className='pkmsvv-pc-grid';box.append(grid);
  makeCard(grid,{title:tr('Pokémon hỗ trợ','Support Pokémon'),dex:175,
   desc:tr('Togepi · Xem, chọn và quản lý tối đa 2 Pokémon hỗ trợ.','Togepi · Manage up to two supports.'),
   action:tr('Mở hỗ trợ','Open Supports'),onClick:()=>G.PKMSVVSupportCatalog?.open?.()});
  makeCard(grid,{title:tr('Tiến Hóa Mega','Mega Evolution'),dex:megaMewtwoArt(),
   desc:tr('Mega Mewtwo · Xem các dạng Mega và điều kiện mở khóa.','Mega Mewtwo · Review forms and unlock requirements.'),
   action:tr('Mở Mega','Open Mega'),onClick:()=>G.PKMSVVMegaEntry?.open?.()});
  makeCard(grid,{title:'Berry',dex:420,
   desc:tr('Cherubi · Tra cứu công dụng 10 loại Berry.','Cherubi · Learn the effects of all ten Berries.'),
   action:tr('Xem cẩm nang','View guide'),onClick:berryGuide});
  const help=document.createElement('section');help.className='pkmsvv-pc-guide';
  const sub=document.createElement('h3');sub.textContent=tr('Kiến thức Pokémon','Pokémon knowledge');
  help.append(sub);
  const articles=[
   [tr('Mystery Orb','Mystery Orb'),
    tr('Nhận Orb trong trận để tăng sức mạnh; giữ đúng loại Orb cho chiến thuật, với nút Orb riêng trên PC/controller.',
       'Collect Mystery Orbs in battle to enhance your abilities. A separate Orb control is available on keyboard and controller.')],
   [tr('Thức tỉnh & Quên kỹ năng','Awakening & Forgetting Skills'),
    tr('Kỹ năng được nâng trong trận; khi học đầy ô, có thể thay thế kỹ năng cũ. Các nâng cấp lâu dài không bị mất khi quên một kỹ năng.',
       'Level skills during runs and replace an old skill when your slots fill. Permanent upgrades remain intact.')]
  ];
  for(const [name,description] of articles){
   const detail=document.createElement('details');detail.className='pkmsvv-pc-learn';
   const summary=document.createElement('summary');summary.textContent=name;
   const p=document.createElement('p');p.textContent=description;
   detail.append(summary,p);help.append(detail);
  }
  box.append(help);
  overlay.append(box);document.body.append(overlay);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
  x.focus();G.Pad?.focusFirst?.();return true;
 }
 function install(){
  installStyle();installMenu();
  const old=G.MenuUI?.open;
  if(typeof old==='function'&&!G.MenuUI.__pkmsvvWiki){
   G.MenuUI.__pkmsvvWiki=true;
   G.MenuUI.open=function(...args){const out=old.apply(this,args);installMenu();return out;};
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('pkmsvv-wiki-overlay')){close();e.stopPropagation();}});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 return {open,close,berryGuide,installMenu};
})();
