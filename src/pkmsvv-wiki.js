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
   display:flex;align-items:center;justify-content:center;box-sizing:border-box;
   width:100vw;height:100dvh;padding:max(6px,env(safe-area-inset-top))
   max(6px,env(safe-area-inset-right)) max(6px,env(safe-area-inset-bottom))
   max(6px,env(safe-area-inset-left));background:rgba(2,15,27,.82);
   overflow:hidden;overscroll-behavior:contain;touch-action:none}
  .pkmsvv-pc-overlay .pkmsvv-pc-panel{
   box-sizing:border-box;width:min(810px,100%);min-width:0;max-width:100%;
   height:auto;max-height:min(92dvh,880px);min-height:0;
   overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;
   touch-action:pan-y;-webkit-overflow-scrolling:touch;scrollbar-width:thin;
   scrollbar-gutter:stable;overflow-anchor:none;scroll-behavior:auto;
   color:#effbf8;border:2px solid #a2e5db;border-radius:15px;
   box-shadow:0 18px 46px #0009;background:linear-gradient(145deg,#174952,#102b42);
   padding:clamp(8px,2vh,17px)}
  .pkmsvv-pc-header{position:sticky;top:0;z-index:2;
   display:flex;align-items:center;justify-content:space-between;
   gap:12px;margin-bottom:12px;padding:7px 5px;
   background:#17434e;border-radius:8px}
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
  .pkmsvv-pc-berry-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
   gap:8px;max-height:none;overflow:visible}
  .pkmsvv-pc-berry-row{display:flex;align-items:center;gap:9px;padding:8px;border:1px solid #5b8e91;border-radius:9px;background:#1b4951}
  .pkmsvv-pc-berry-row img{width:38px;height:38px;object-fit:contain;image-rendering:pixelated;flex-shrink:0}
  .pkmsvv-pc-berry-row strong{color:#ffdf8c;display:block}
  .pkmsvv-pc-berry-row span{font-size:12px;line-height:1.5;color:#e4f5f2}
  .pkmsvv-pc-learn{margin-top:9px;border:1px solid #80bbb2;background:#204e55;border-radius:9px;padding:10px}
  .pkmsvv-pc-learn button{cursor:pointer;color:#ffe3a3;font-weight:bold;border:0;background:transparent;text-align:left;width:100%;padding:5px}
  .pkmsvv-pc-learn p{color:#d8efeb;font-size:13px;line-height:1.65}
  .pkmsvv-fusion-recipes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0}
  .pkmsvv-fusion-recipe{display:grid;grid-template-columns:52px minmax(0,1fr);
    gap:4px 10px;align-items:center;padding:9px;border:1px solid #82b9b5;
    border-radius:9px;background:#173c4c;color:#f4faf8;min-width:0}
  .pkmsvv-fusion-recipe .pkmsvv-fusion-icon{grid-row:1/5;width:52px;height:52px;
    object-fit:contain;filter:drop-shadow(0 0 4px #ffe68c44)}
  .pkmsvv-fusion-recipe .pkmsvv-fusion-move{display:inline-flex;align-items:center;
    gap:5px;min-width:0;color:#d7eeeb;font-size:11px;overflow-wrap:anywhere}
  .pkmsvv-fusion-recipe .pkmsvv-fusion-move svg,
  .pkmsvv-fusion-recipe .pkmsvv-fusion-move img{width:19px;height:19px}
  .pkmsvv-fusion-recipe .pkmsvv-fusion-result{color:#ffe19a;font-size:13px;line-height:1.3}
  .pkmsvv-fusion-recipe .pkmsvv-fusion-benefit{margin:2px 0!important;
    color:#f3fffb!important;font-size:12px!important;line-height:1.48!important}
  @media(max-width:630px){.pkmsvv-fusion-recipes{grid-template-columns:1fr}}
  
  .pkmsvv-pc-orb-details p{margin:7px 0;color:#e4f1ee;font-size:13px;line-height:1.6}
  .pkmsvv-pc-orb-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0;min-width:0}
  .pkmsvv-pc-orb-item{display:flex;align-items:center;gap:10px;min-width:0;padding:9px;
   border:1px solid #5f959d;border-radius:10px;background:#163d4e}
  .pkmsvv-pc-orb-art{display:block;width:48px;height:48px;flex:0 0 48px;
   object-fit:contain;image-rendering:pixelated;filter:drop-shadow(0 2px 4px #061724aa)}
  .pkmsvv-pc-orb-copy{display:flex;flex-direction:column;gap:3px;min-width:0}
  .pkmsvv-pc-orb-item strong{color:#ffe29a;font-size:13px}
  .pkmsvv-pc-orb-copy span{color:#e4f1ee;font-size:12px;line-height:1.5;overflow-wrap:anywhere}
  @media(max-width:570px){.pkmsvv-pc-orb-list{grid-template-columns:1fr}
   .pkmsvv-pc-orb-art{width:42px;height:42px;flex-basis:42px}}

  .pkmsvv-pc-card .pkmsvv-pc-action{margin-top:auto;border-radius:8px;background:#ffdc68;
    color:#103841;padding:7px 12px;font-weight:900;font-size:13px}
  @media(orientation:landscape) and (max-height:500px){
   .pkmsvv-pc-overlay .pkmsvv-pc-panel{max-height:calc(100dvh - 12px)}
   .pkmsvv-pc-grid{gap:7px}
   .pkmsvv-pc-header{margin-bottom:7px}
   .pkmsvv-pc-card canvas{width:72px;height:72px;flex:0 0 72px}
   .pkmsvv-pc-card small{font-size:11px}
  }
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
  // Do not rebuild the same button on every MenuUI.open: Android and PC may
  // scroll-jump when focused descendants are replaced during navigation.
  if(!b.dataset.pkmsvvWikiReady){
   b.innerHTML='<span class="mi-ico">💻</span><span class="pkmsvv-menu-copy"><span class="pkmsvv-menu-label">PC</span><small>Pokémon hỗ trợ · Mega · Berry</small></span>';
   b.dataset.pkmsvvWikiReady='1';
  }
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
  back.textContent=tr('← Quay lại PC','← Back to PC');back.setAttribute('data-back','');back.onclick=open;
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
  // Focus must never drag the scrollable guide back to the first item.
  back.focus({preventScroll:true});
  // D-pad gets a highlighted button, but touch/mouse must not auto-scroll.
  if(G.Pad?.name)G.Pad?.focusFirst?.();return true;
 }
 function open(){
  close();installStyle();
  const overlay=document.createElement('div');overlay.id='pkmsvv-wiki-overlay';
  overlay.className='pkmsvv-pc-overlay';overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','PC');
  const box=document.createElement('section');box.className='pkmsvv-pc-panel';
  const head=document.createElement('header');head.className='pkmsvv-pc-header';
  const title=document.createElement('h2');title.textContent='💻 PC · POKÉMON CHUYỂN SINH';
  const x=document.createElement('button');x.type='button';x.className='pkmsvv-pc-close';x.textContent=tr('✕ Đóng','✕ Close');x.setAttribute('data-back','');x.onclick=close;
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
   [tr('Mystery Orb','Mystery Orb'),null],
   [tr('Thức tỉnh kỹ năng','Skill Awakening'),
    tr('Kỹ năng được mở và nâng cấp khi Pokémon lên cấp trong trận. Hãy chọn kỹ năng phù hợp để phát huy sức mạnh; các nâng cấp vĩnh viễn vẫn được giữ nguyên.',
       'Unlock and improve skills as your Pokémon levels up during a run. Choose skills that fit your play style; permanent upgrades remain intact.')],
   [tr('✨ Fusion — Tiến hóa tuyệt kỹ','✨ Fusion — Evolved Skills'),
    tr('Chọn 1 trong 10 công thức. Cả hai chiêu gốc phải MAX, sau đó Fusion thay 2 chiêu bằng 1 tuyệt kỹ MAX, giải phóng một ô kỹ năng. Mỗi trận Fusion chỉ 1 lần; Bond nhận từ khe nứt vẫn là hệ thống liên kết riêng.',
       'Choose one of ten recipes. Both source moves must be MAX. Fusion replaces them with one evolved MAX skill and frees one slot. One Fusion per match; Rift-earned Bonds remain a separate link system.')],

  ];
  // The completed Skill Awakening chapter does not need a permanent guide row.
  const skillAwakeningDone=!!G.DB?.save?.pkmsvvChapter2Seen ||
   (G.PKMSVVSkillTrack?.progress?.(G.DB?.save)?.count||0)>=8 ||
   (G.Game?.player?.moves?.length||0)>=8;
  // Put Fusion recipes above Mystery Orb in the knowledge accordion.
  for(const [name,description] of articles.filter(([name])=>
   !skillAwakeningDone||name!==tr('Thức tỉnh kỹ năng','Skill Awakening')).sort((a,b)=>(b[0].includes('Fusion')?1:0)-(a[0].includes('Fusion')?1:0))){
   const detail=document.createElement('div');detail.className='pkmsvv-pc-learn';
   const toggle=document.createElement('button');toggle.type='button';toggle.textContent='▸ '+name;
   toggle.setAttribute('aria-expanded','false');
   const p=document.createElement('div');p.hidden=true;p.className='pkmsvv-pc-orb-details';
   if(description!==null){
    const paragraph=document.createElement('p');paragraph.textContent=description;p.append(paragraph);
    if(name.includes('Fusion')){
     const recipes=document.createElement('div');recipes.className='pkmsvv-fusion-recipes';
     for(const formula of G.PKMSVVFusionPilot?.RECIPES||[]){
      const row=document.createElement('div');row.className='pkmsvv-fusion-recipe';
      for(const id of formula.ids){
       const pair=document.createElement('span');pair.className='pkmsvv-fusion-move';
       const icon=document.createElement('span');icon.innerHTML=G.Icons?.html?.('move:'+id,20)||'✦';
       const label=document.createElement('span');label.textContent=G.T?.(G.Moves?.BY_ID?.[id]?.name||id,'move')||id;
       pair.append(icon,label);row.append(pair);
      }
      const fusionIcon=document.createElement('img');
      fusionIcon.className='pkmsvv-fusion-icon';fusionIcon.src='assets/fusion-icons/'+formula.id+'.webp';
      fusionIcon.alt='';fusionIcon.width=52;fusionIcon.height=52;fusionIcon.loading='lazy';
      row.prepend(fusionIcon);
      const result=document.createElement('strong');result.className='pkmsvv-fusion-result';
      result.textContent='▶ '+tr(formula.vi,formula.en)+' · MAX + MAX';row.append(result);
      const effect=document.createElement('p');effect.className='pkmsvv-fusion-benefit';
      effect.textContent=tr(formula.viEffect||'',formula.enEffect||'')||
       tr('Hiệu ứng tùy theo kỹ năng Fusion.','Effect depends on the Fusion skill.');
      row.append(effect);recipes.append(row);
     }
     p.append(recipes);
    }
   }else{
    const intro=document.createElement('p');
    intro.textContent=tr('Mystery Orb xuất hiện ngay từ đầu mỗi trận, không cần đầy kỹ năng. Hàng đợi tối đa 10 Orb; dùng đúng thứ tự đã nhặt (FIFO), hồi 5 giây giữa hai lần kích hoạt. Kẻ địch boss chịu hiệu ứng khống chế yếu hơn.',
      'Mystery Orbs appear from the start of each run without a skill requirement. Hold up to 10 in first-in-first-out order, with 5 seconds between uses. Bosses resist crowd-control effects.');
    p.append(intro);
    // Use the exact six bundled Mystery Orb sprites already used for
    // in-world pickups and the HUD (G.OrbSprites). Never substitute emojis.
    const orbGrid=document.createElement('div');orbGrid.className='pkmsvv-pc-orb-list';
    const officialOrbIds=new Set(G.OrbSprites?.ids||['slumber','slow','blowback','focus','luminous','quick']);
    for(const orb of G.Orbs?.LIST||[]){
     if(!officialOrbIds.has(orb.id))continue;
     const item=document.createElement('div');item.className='pkmsvv-pc-orb-item';
     const art=document.createElement('img');art.className='pkmsvv-pc-orb-art';
     art.src='assets/orbs/'+encodeURIComponent(orb.id)+'.svg';
     art.alt=orb.name?.[G.I18n?.lang==='en'?1:0]||orb.id;
     art.loading='lazy';art.decoding='async';art.width=48;art.height=48;
     const copy=document.createElement('div');copy.className='pkmsvv-pc-orb-copy';
     const name=document.createElement('strong');name.textContent=art.alt;
     const effect=document.createElement('span');
     effect.textContent=orb.desc?.[G.I18n?.lang==='en'?1:0]||'';
     copy.append(name,effect);item.append(art,copy);orbGrid.append(item);
    }
    p.append(orbGrid);
    const note=document.createElement('p');note.textContent=tr('Chương Orb: sử dụng đủ 6 loại khác nhau. Phím Orb theo thiết lập tay cầm/bàn phím hiện tại; không tự thêm cơ chế Orb mới.',
      'Orb chapter: use all 6 distinct types. The Orb shortcut follows current controls; no new Orb mechanics added.');
    p.append(note);
   }
   toggle.onclick=()=>{p.hidden=!p.hidden;toggle.textContent=(p.hidden?'▸ ':'▾ ')+name;toggle.setAttribute('aria-expanded',String(!p.hidden));};
   detail.append(toggle,p);help.append(detail);
  }
  box.append(help);
  overlay.append(box);document.body.append(overlay);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
  // Avoid browser scrollIntoView repositioning the entire PC/Android panel.
  x.focus({preventScroll:true});
  // Only a connected controller may auto-select a focusable menu item.
  if(G.Pad?.name)G.Pad?.focusFirst?.();return true;
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
