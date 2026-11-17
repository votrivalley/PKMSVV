/* Pokémon Chuyển Sinh: Research Lab hub for the former PC utilities.
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
  .pkmsvv-pc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
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
  .pkmsvv-pc-orb-item{display:flex;align-items:flex-start;gap:12px;
   border:1px solid #568a94;border-radius:9px;background:#153c4a;padding:7px 9px}
  .pkmsvv-pc-orb-item img.pkmsvv-orb-guide-icon{
   width:44px;height:44px;flex:0 0 44px;object-fit:contain;
   image-rendering:pixelated;filter:drop-shadow(0 2px 5px #031e38b0)}
  .pkmsvv-pc-orb-item .pkmsvv-orb-guide-copy{flex:1;min-width:0;line-height:1.5}
  .pkmsvv-pc-orb-item strong{color:#ffe29a;display:block;margin-bottom:2px}
  @media(max-width:540px){.pkmsvv-pc-orb-item img.pkmsvv-orb-guide-icon{
   width:37px;height:37px;flex-basis:37px}}


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
   b.innerHTML='<span class="mi-ico">🔬</span><span class="pkmsvv-menu-copy"><span class="pkmsvv-menu-label">Phòng nghiên cứu</span><small>Hóa thạch · Mega · Hỗ trợ · Pippi</small></span>';
   b.dataset.pkmsvvWikiReady='1';
  }
  if(window.__PKMSVV_PIPPI_QA){
   const detail=b.querySelector('.pkmsvv-menu-copy small');
   if(detail)detail.textContent=tr('Hóa thạch · Mega · Hỗ trợ · Pippi','Fossils · Mega · Supports · Pippi');
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
   if(!grid.hidden&&G.UI?.sprite)G.UI.sprite(canvas,dex,{lively:true,scale:2,hero:true});
   else if(G.UI?.spriteCanvas){const art=G.UI.spriteCanvas(dex,144,144,{lively:true,scale:2,hero:true});canvas.replaceWith(art);}
  }catch(_e){/* UI sprite not initialized yet; card remains usable */ }
  b.onclick=()=>{close();onClick();};
  return b;
 }
 // New fourth PC tile uses the already-persistent Bond save.
 function pippiCorner(){
  close();installStyle();
  const P=G.PKMSVVPippi,save=G.DB?.save;
  const shade=document.createElement('div');shade.id='pkmsvv-wiki-overlay';
  shade.className='pkmsvv-pc-overlay';shade.setAttribute('role','dialog');
  shade.setAttribute('aria-modal','true');
  shade.setAttribute('aria-label',tr('Bạn đồng hành','Companions'));
  const box=document.createElement('section');box.className='pkmsvv-pc-panel pkmsvv-pippi-corner';
  const head=document.createElement('header');head.className='pkmsvv-pc-header';
  const title=document.createElement('h2');title.textContent=tr('Bạn đồng hành','Companions');
  const back=document.createElement('button');back.type='button';
  back.className='pkmsvv-pc-close';back.textContent=tr('← Phòng nghiên cứu','← Research Lab');
  back.setAttribute('data-back','');back.onclick=open;head.append(title,back);box.append(head);
  const body=document.createElement('div');body.className='pkmsvv-pippi-training';
  box.append(body);shade.append(box);document.body.append(shade);
  const specs=[
   ['heal',1,tr('Hồi máu','Healing'),tr('Mỗi cấp tăng 2% HP hồi phục.','+2% max HP healed per level.')],
   ['buff',2,tr('Cổ vũ','Cheer'),tr('Mỗi cấp tăng 1,5% sức tấn công khi buff.','+1.5% attack during buff per level.')],
   ['slow',3,tr('Làm chậm & Tăng tốc','Slow + Haste'),tr('Làm chậm tối đa 6 quái gần đó, đồng thời tăng tốc chạy 10%. Mỗi cấp huấn luyện tăng thêm 5% tốc độ, cùng hiệu lực làm chậm mạnh và lâu hơn.','Slow up to 6 enemies and boost movement speed by 10%; each training level adds 5% more speed plus stronger, longer slows.')],
   ['shield',7,tr('Khiên trăng','Moon Shield'),tr('Mỗi cấp tăng 0,35 giây bảo vệ nguy cấp.','+0.35 seconds emergency protection per level.')],
   ['cousin',4,tr('Em họ Pikachu','Cousin Pikachu'),
    tr('Khi mất HP thật: Lv1 4% / 4 quái · Lv2 6% / 8 quái · Lv3 8% / 16 quái. Pikachu từ trời đáp xuống, giáng sét trắng gây tê liệt rồi bay đi. Chưa học thì không triệu hồi.',
       'On actual HP loss: Lv1 4% / 4 foes · Lv2 6% / 8 foes · Lv3 8% / 16 foes. Pikachu drops from the sky, calls down white stun lightning, then disappears.')]
  ];
  function draw(focusKey){
   body.replaceChildren();
   if(!P?.bondProgress||!save){
    const note=document.createElement('p');note.className='pkmsvv-pc-hint';
    note.textContent=tr('Chưa tải dữ liệu Pippi. Vào game rồi mở lại PC nhé.',
     'Pippi data is not ready. Enter the game and reopen PC.');
    body.append(note);return;
   }
   const state=P.data(save),progress=P.bondProgress(save),training=state.training;
   const hero=document.createElement('div');hero.className='pkmsvv-pippi-training-hero';
   const image=document.createElement('img');image.src='images/pippi/portrait/Happy.png';
   image.alt=tr('Pippi vui vẻ','Happy Pippi');image.width=64;image.height=64;
   image.className='pkmsvv-pippi-training-face';
   const summary=document.createElement('div');summary.className='pkmsvv-pippi-training-summary';
   const level=document.createElement('strong');level.textContent=tr('Pippi · Thân thiết ','Pippi · Bond ')+progress.bond+'/10';
   const points=document.createElement('span');points.className='pkmsvv-pippi-training-points';
   points.textContent=tr('Điểm huấn luyện: ','Training points: ')+progress.points;
   const next=document.createElement('span');next.textContent=progress.to===null?
    tr('Thân thiết tối đa · đã mở Moon Miracle','Max Bond · Moon Miracle unlocked'):
    tr('Tiến độ: ','Progress: ')+progress.xp+'/'+progress.to+' XP';
   const bar=document.createElement('progress');
   bar.max=progress.to===null?1:Math.max(1,progress.to-progress.from);
   bar.value=progress.to===null?1:Math.min(bar.max,Math.max(0,progress.xp-progress.from));
   bar.setAttribute('aria-label',tr('Tiến độ Thân thiết','Bond progress'));
   summary.append(level,points,next,bar);hero.append(image,summary);body.append(hero);
   const hint=document.createElement('p');hint.className='pkmsvv-pc-hint';
   hint.textContent=tr('Mỗi cấp Thân thiết nhận 1 điểm. Sống sót, nhặt rương và để Pippi hỗ trợ để thân thiết hơn (mỗi việc thưởng tối đa 1 lần/trận).',
    'Each Bond level grants 1 point. Train Pippi’s abilities; unused points carry over.');
   body.append(hint);
   const passive=document.createElement('h3');passive.className='pkmsvv-pippi-train-section';
   passive.textContent=tr('Kỹ năng nội tại · học và nâng cấp','Passive skills · learn and upgrade');
   body.append(passive);
   const grid=document.createElement('div');grid.className='pkmsvv-pippi-training-grid';
   for(const [key,gate,name,description] of specs){
    const lv=training[key]||0,unlocked=state.bond>=gate;
    const item=document.createElement('section');item.className='pkmsvv-pippi-training-row';
    item.dataset.pippiSkill=key;
    item.dataset.pippiSkillState=!unlocked?'locked':lv>=3?'max':lv>0?'trained':'ready';
    const heading=document.createElement('div');heading.className='pkmsvv-pippi-skill-heading';
    const frame=document.createElement('span');frame.className='pkmsvv-pippi-skill-icon-frame';
    const art=document.createElement('span');art.className='pkmsvv-pippi-skill-icon';
    art.dataset.pippiSkillIcon=key;art.setAttribute('role','img');art.setAttribute('aria-label',name);
    frame.append(art);
    const details=document.createElement('span');details.className='pkmsvv-pippi-skill-details';
    const nameEl=document.createElement('strong');nameEl.textContent=name;
    const rank=document.createElement('span');rank.className='pkmsvv-pippi-skill-rank';
    rank.textContent=lv>=3?'MAX':lv+'/3';
    const tiers=document.createElement('span');tiers.className='pkmsvv-pippi-skill-tiers';
    tiers.setAttribute('aria-hidden','true');
    for(let n=0;n<3;n++){
     const gem=document.createElement('span');gem.className=n<lv?'filled':'';tiers.append(gem);
    }
    details.append(nameEl,rank,tiers);heading.append(frame,details);
    const info=document.createElement('p');info.textContent=description;
    const button=document.createElement('button');button.type='button';
    button.className='pkmsvv-pippi-train-btn';button.dataset.pippiTrain=key;
    button.disabled=!unlocked||lv>=3||progress.points<1||typeof G.DB?.commit!=='function';
    button.textContent=!unlocked?tr('Mở ở Thân thiết ','Unlock at Bond ')+gate:
     lv>=3?tr('Đã MAX','MAX'):progress.points<1?tr('Chưa có điểm','No points'):
     tr('Nâng cấp +1','Train +1');
    const note=document.createElement('small');note.className='pkmsvv-pippi-train-status';
    note.textContent=unlocked?tr('Dùng 1 điểm huấn luyện','Spend 1 training point'):
     tr('Chưa mở khóa','Not yet unlocked');
    button.onclick=()=>{
     if(button.disabled)return;
     if(button.dataset.confirm!=='1'){
      button.dataset.confirm='1';button.textContent=tr('Xác nhận nâng cấp','Confirm training');return;
     }
     const result=P.train(save,key,()=>G.DB.commit(true));
     if(!result.ok){
      button.dataset.confirm='';button.textContent=tr('Thử lại','Retry');
      note.textContent=tr('Không lưu được hoặc không đủ điểm.','Save failed or insufficient points.');
      return;
     }
     draw(key);
    };
    item.append(heading,info,note,button);grid.append(item);
   }
   body.append(grid);
   const active=document.createElement('section');active.className='pkmsvv-pippi-active-skill';
   const activeName=document.createElement('strong');
   activeName.textContent=tr('Kỹ năng đặc biệt · Moon Miracle','Special skill · Moon Miracle');
   const activeStatus=document.createElement('p');
   activeStatus.textContent=state.bond>=10?
    tr('Đã mở ở Thân thiết 10: Clefairy → Clefable (2 giây) → thức tỉnh, hồi sinh và ngủ kiệt sức.',
       'Bond 10 unlocked: Clefairy → Clefable (2s) → awakening, revival, then exhaustion.'):
    tr('Mở tự động tại Thân thiết 10. Không tiêu tốn điểm huấn luyện.',
       'Automatically unlocks at Bond 10; requires no training points.');
   active.append(activeName,activeStatus);body.append(active);
   const candy=document.createElement('section');candy.className='pkmsvv-pippi-active-skill';
   const candyCount=Number(save.bag?.pippiReset)||0;
   const spent=Object.values(training).reduce((n,v)=>n+v,0);
   const candyName=document.createElement('strong');
   candyName.textContent=tr('Kẹo Tái Huấn Luyện','Training Reset Candy')+' ×'+candyCount;
   const candyDesc=document.createElement('p');
   candyDesc.textContent=tr('Hoàn lại tất cả điểm kỹ năng đã phân. Giữ nguyên cấp Thân thiết và kinh nghiệm. Mua ở Kecleon.',
    'Refund all spent training points. Keep friendship level and XP. Buy it from Kecleon.');
   const reset=document.createElement('button');reset.type='button';
   reset.dataset.pippiReset='1';reset.className='pkmsvv-pippi-train-btn';
   reset.disabled=!candyCount||!spent||typeof G.DB?.commit!=='function';
   reset.textContent=tr('Dùng 1 kẹo · Đặt lại kỹ năng','Use 1 candy · Reset training');
   reset.onclick=()=>{
    if(reset.disabled)return;
    if(reset.dataset.confirm!=='1'){
     reset.dataset.confirm='1';reset.textContent=tr('Xác nhận dùng kẹo','Confirm candy use');return;
    }
    const result=P.resetTraining(save,()=>G.DB.commit(true));
    if(!result.ok){reset.dataset.confirm='';reset.textContent=tr('Lưu lỗi · Thử lại','Save failed · Retry');return;}
    G.UI?.toast?.(tr('Pippi đã nhận lại '+result.refundedPoints+' điểm huấn luyện!',
       'Pippi recovered '+result.refundedPoints+' training points!'),2800);
    draw();body.querySelector('[data-pippi-reset]')?.focus({preventScroll:true});
   };
   candy.append(candyName,candyDesc,reset);body.append(candy);
   if(focusKey)body.querySelector('[data-pippi-train="'+focusKey+'"]')?.focus({preventScroll:true});
  }
  draw();shade.addEventListener('click',e=>{if(e.target===shade)open();});
  back.focus({preventScroll:true});if(G.Pad?.name)G.Pad?.focusFirst?.();
  return true;
 }
 function fossilRestoration(){
  close();installStyle();
  const shade=document.createElement('div');shade.id='pkmsvv-wiki-overlay';
  shade.className='pkmsvv-pc-overlay';shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');
  const box=document.createElement('section');box.className='pkmsvv-pc-panel pkmsvv-fossil-panel';
  const head=document.createElement('header');head.className='pkmsvv-pc-header';
  const title=document.createElement('h2');title.textContent=tr('🦴 Hồi sinh hóa thạch','🦴 Fossil Restoration');
  const back=document.createElement('button');back.type='button';back.className='pkmsvv-pc-close';
  back.textContent=tr('← Phòng nghiên cứu','← Research Lab');back.setAttribute('data-back','');back.onclick=open;
  head.append(title,back);box.append(head);
  const note=document.createElement('p');note.className='pkmsvv-pc-hint';
  note.textContent=tr('Đập đá đúng thế hệ để tìm hóa thạch. Lần đầu phải hoàn thành nhiệm vụ Co-op Phòng thí nghiệm thất lạc để mở máy vĩnh viễn. Vật liệu vẫn được giữ khi máy khóa.',
   'Find fossils in the right region. First complete the Lost Laboratory Co-op mission to unlock the restoration machine forever. Collected materials are safe.');
  box.append(note);
  // Read-only QA ART preview V2 — composite painting avoids the previous low-res
  // 320×224 blocky placeholder. Furnishings in this image are NOT owned decor;
  // real decorating requires separate transparent sprites and saved slot choices.
  const artArea=document.createElement('section');artArea.className='pkmsvv-lab-art-review';
  artArea.dataset.pkmsvvLabArtPreview='2';
  const artTitle=document.createElement('h3');
  artTitle.textContent=tr('Phòng nghiên cứu · bản phối cảnh chi tiết','Fossil Lab · detailed room preview');
  const artHint=document.createElement('p');artHint.className='pkmsvv-pc-hint';
  artHint.textContent=tr('Đây là phối cảnh mỹ thuật, chưa phải nội thất bạn sở hữu. Chọn một trong tám vị trí để xem. Máy phục nguyên vẫn khóa cho đến khi vượt nhiệm vụ Co-op lần đầu.',
    'This is an art mock-up, NOT your owned furniture. Choose one of eight fixed placements. Restoration stays locked until the first Co-op mission clear.');
  const stage=document.createElement('div');stage.className='pkmsvv-lab-art-stage';
  stage.dataset.labArtVersion='2';
  stage.setAttribute('role','group');
  stage.setAttribute('aria-label',tr('Bản phối cảnh phòng thí nghiệm chi tiết','Detailed laboratory room scene'));
  const detail=document.createElement('p');detail.className='pkmsvv-pc-hint pkmsvv-lab-art-detail';
  detail.textContent=tr('Máy phục nguyên ở trung tâm. Các vật thể đang thấy là minh họa, chưa phải đồ đã mở khóa.',
    'Central fossil machine. Visible furnishings are illustrative, not unlocked or purchased.');
  // These are v2 scene-specific click regions, NOT the final decoration layout.
  // Source coordinates are in normalized 320×224 room space.
  const spots=[
   ['wall_left',43,31,63,32,'Bảng khảo cổ bên trái','Left archaeology board'],
   ['wall_right',213,31,63,32,'Bảng khảo cổ bên phải','Right archaeology board'],
   ['center',111,44,97,98,'Máy phục nguyên','Restoration machine'],
   ['shelf_left',21,70,85,60,'Kệ mẫu hóa thạch','Fossil specimen shelf'],
   ['shelf_right',212,68,89,59,'Bàn nghiên cứu chính','Main research bench'],
   ['garden',5,131,82,70,'Vườn cổ sinh','Prehistoric garden'],
   ['desk',242,134,65,30,'Bàn máy tính khảo cổ','Archaeology computer desk'],
   ['trophy',236,165,64,39,'Bệ danh dự Tượng Vàng Pippi','Gold Pippi trophy pedestal']
  ];
  for(const [id,x,y,w,h,vi,en] of spots){
   const btn=document.createElement('button');btn.type='button';
   btn.className='pkmsvv-lab-art-hotspot';btn.dataset.labSlot=id;
   btn.style.left=x/320*100+'%';btn.style.top=y/224*100+'%';
   btn.style.width=w/320*100+'%';btn.style.height=h/224*100+'%';
   btn.setAttribute('aria-label',tr('Xem vị trí: '+vi,'View spot: '+en));
   btn.onclick=()=>{
    stage.querySelectorAll('.pkmsvv-lab-art-hotspot').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    detail.textContent=tr(vi,en)+' · '+tr(
     'Đây mới là vị trí minh họa, không tự mua đồ và không thay đổi save.',
     'Illustrative placement only; no purchases, no saved changes.');
   };stage.append(btn);
  }
  artArea.append(artTitle,artHint,stage,detail);box.append(artArea);
  const list=document.createElement('div');list.className='pkmsvv-fossil-list';box.append(list);
  function draw(){
   list.replaceChildren();
   const F=G.PKMSVVFossils,bag=F?.inventory?.()||{},s=G.DB?.save;
   const unlocked=s?.pkmsvvCoopLab?.machineUnlocked===true;
   if(!unlocked){
    const locked=document.createElement('p');locked.className='pkmsvv-pc-hint';
    locked.dataset.fossilLabLocked='1';
    locked.textContent=tr('🔒 Máy phục nguyên chưa mở! Pippi đang tìm đội khảo cổ. Nhiệm vụ Co-op hóa thạch sẽ xuất hiện ở bản cập nhật nhiệm vụ; bạn cứ giữ hóa thạch đã nhặt.',
      '🔒 Restoration machine locked! The Fossil Co-op mission is not playable in this QA yet. Keep your collected fossils.');
    list.append(locked);
   }
   if(!F?.recipes?.length){
    const waiting=document.createElement('p');waiting.textContent=tr('Dữ liệu hóa thạch chưa tải. Vào game rồi thử lại.', 'Fossil data not loaded. Enter the game and try again.');
    list.append(waiting);return;
   }
   const stock=document.createElement('p');stock.className='pkmsvv-pc-hint';
   const pieces=F.materials.filter(m=>(Number(bag[m.id])||0)>0).map(m=>m.nameVi+' ×'+bag[m.id]);
   stock.textContent=tr('Túi hóa thạch: ','Fossils: ')+(pieces.join(' · ')||tr('Trống trơn. Đá còn cứng hơn đầu bạn đó.','Empty! Try breaking some rocks.'));
   list.append(stock);
   for(const formula of F.recipes){
    const own=!!s?.owned?.[formula.dex];
    const can=unlocked&&!!G.DEX_BY?.[formula.dex]&&!!G.SPRITE_META?.[formula.dex]&&
     !own&&formula.materialIds.every(id=>(Number(bag[id])||0)>=formula.materialIds.filter(x=>x===id).length);
    const row=document.createElement('article');row.className='pkmsvv-fossil-row';
    const canvas=document.createElement('canvas');canvas.width=72;canvas.height=72;
    canvas.setAttribute('aria-label',formula.name);
    try{G.UI?.sprite?.(canvas,formula.dex,{hero:true,scale:1.2});}catch(_){}
    const detail=document.createElement('div');detail.className='pkmsvv-fossil-detail';
    const name=document.createElement('strong');name.textContent=formula.name+' · Gen '+formula.generation;
    const ingredients=document.createElement('small');
    ingredients.textContent=formula.materialIds.map(id=>(F.materials.find(m=>m.id===id)?.nameVi||id)+' ('+(bag[id]||0)+')').join(' + ');
    const status=document.createElement('small');status.textContent=own?tr('Đã sở hữu','Already owned'):
     !unlocked?tr('Máy khóa · Chưa hoàn thành Co-op lần đầu','Locked · Complete your first Co-op mission'):
     can?tr('Đủ vật liệu · Có thể hồi sinh','Ready to restore'):tr('Chưa đủ hóa thạch','Missing fossils');
    detail.append(name,ingredients,status);
    const button=document.createElement('button');button.type='button';button.className='pkmsvv-pc-close pkmsvv-fossil-revive';
    button.dataset.fossilDex=String(formula.dex);button.disabled=!can;
    button.textContent=own?tr('Đã có','Owned'):!unlocked?tr('🔒 Chưa mở','🔒 Locked'):tr('Hồi sinh','Restore');
    button.onclick=()=>{
     if(button.disabled)return;
     const result=F.restore(formula.dex);
     if(!result.ok){G.UI?.toast?.(tr('Không thể phục nguyên. Hóa thạch vẫn được giữ.','Could not restore. Materials preserved.'),2600);return;}
     draw();list.querySelector('[data-fossil-dex="'+formula.dex+'"]')?.focus({preventScroll:true});
    };
    row.append(canvas,detail,button);list.append(row);
   }
  }
  draw();shade.append(box);document.body.append(shade);
  back.focus({preventScroll:true});
  return true;
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
  back.textContent=tr('← Phòng nghiên cứu','← Research Lab');back.setAttribute('data-back','');back.onclick=open;
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
 // "Xây dựng" is a separate interaction mode. The room composition is still
 // a concept image, not a set of detachable sprites. Never fake owned decor.
 function construction(){
  close();installStyle();
  const overlay=document.createElement('div');overlay.id='pkmsvv-wiki-overlay';
  overlay.className='pkmsvv-pc-overlay';overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label',tr('Xây dựng Phòng nghiên cứu','Build Research Lab'));
  const box=document.createElement('section');box.className='pkmsvv-pc-panel pkmsvv-build-panel';
  const head=document.createElement('header');head.className='pkmsvv-pc-header';
  const title=document.createElement('h2');title.textContent=tr('🛠 XÂY DỰNG','🛠 BUILD MODE');
  const back=document.createElement('button');back.type='button';back.className='pkmsvv-pc-close';
  back.textContent=tr('← Phòng nghiên cứu','← Research Lab');back.onclick=open;
  back.dataset.back='1';head.append(title,back);box.append(head);
  const save=G.DB?.save?.pkmsvvCoopLab;
  const unlocked=save?.machineUnlocked===true;
  const note=document.createElement('p');note.className='pkmsvv-pc-hint';
  note.textContent=unlocked?
   tr('Chọn một trong tám vị trí cố định. Các món chưa có sprite độc lập vẫn chỉ được xem, không trừ xu hoặc ghi save.',
      'Select one of eight fixed slots. Unfinished sprites are preview-only; no coins or saves are changed.'):
   tr('🔒 Xây dựng cần hoàn thành nhiệm vụ Co-op hóa thạch lần đầu. Bạn vẫn có thể xem tám vị trí, giá và vật phẩm dự kiến.',
      '🔒 Build unlocks after the first Fossil Co-op mission. You can preview eight slots, items and planned prices.');
  box.append(note);
  const area=document.createElement('div');area.className='pkmsvv-build-layout';
  const stage=document.createElement('div');stage.className='pkmsvv-build-stage';
  const info=document.createElement('section');info.className='pkmsvv-build-info';
  const h=document.createElement('h3'),desc=document.createElement('p'),
   items=document.createElement('div');items.className='pkmsvv-build-items';
  info.append(h,desc,items);
  const slots=[
   ['wall_left',43,31,63,32,'Tường trái','Left wall'],
   ['wall_right',213,31,63,32,'Tường phải','Right wall'],
   ['center',111,62,91,82,'Máy phục nguyên','Revival machine'],
   ['shelf_left',18,75,100,62,'Kệ bên trái','Left shelf'],
   ['shelf_right',220,74,96,59,'Kệ bên phải','Right shelf'],
   ['garden',6,146,87,66,'Góc cây cảnh','Garden'],
   ['desk',235,132,79,34,'Bàn nghiên cứu','Research desk'],
   ['trophy',236,166,72,45,'Bệ danh dự','Trophy pedestal']
  ];
  const names={
   machine_old:['Máy phục nguyên nguyên mẫu','Original restoration machine',0],
   machine_future:['Máy phục nguyên tối tân','Advanced restoration machine',1300],
   kabuto_skeleton:['Bộ xương Kabuto','Kabuto skeleton',320],
   amber_aerodactyl:['Hổ phách Aerodactyl','Aerodactyl amber',750],
   omanyte_model:['Mô hình Omanyte','Omanyte model',280],
   archaeology_certificate:['Chứng nhận khảo cổ','Archaeology certificate',200],
   prehistoric_poster:['Bản đồ sinh vật cổ','Prehistoric poster',420],
   prehistoric_fern:['Chậu dương xỉ tiền sử','Ancient fern',360],
   research_terminal:['Máy tính khảo cổ','Research terminal',540],
   glowing_sample_tube:['Ống mẫu phát sáng','Glowing specimen tube',700],
   gold_pippi_statue:['Tượng Vàng Giáo sư Pippi','Golden Professor Pippi',null]
  };
  const available={
   wall_left:['archaeology_certificate','prehistoric_poster'],
   wall_right:['archaeology_certificate','prehistoric_poster'],
   center:['machine_old','machine_future'],
   shelf_left:['kabuto_skeleton','amber_aerodactyl','omanyte_model'],
   shelf_right:['kabuto_skeleton','amber_aerodactyl','omanyte_model'],
   garden:['prehistoric_fern'],
   desk:['research_terminal','glowing_sample_tube'],
   trophy:['gold_pippi_statue']
  };
  function inspect(slot){
   const record=slots.find(x=>x[0]===slot);if(!record)return;
   stage.querySelectorAll('.pkmsvv-build-spot').forEach(b=>b.classList.toggle('selected',b.dataset.buildSlot===slot));
   h.textContent=tr(record[5]==='Revival machine'?'Máy phục nguyên':record[4],record[5]);
   desc.textContent=tr('Đang trang bị: ','Equipped: ')+
    (names[save?.equippedDecorBySlot?.[slot]]?.[G.I18n?.lang==='en'?1:0]||
    tr('Chưa có vật phẩm','Empty'));
   items.replaceChildren();
   for(const id of available[slot]){
    const n=names[id],owned=!!save?.ownedDecor?.[id]||id==='machine_old';
    const row=document.createElement('div');row.className='pkmsvv-build-item';
    const label=document.createElement('span');
    label.textContent=tr(n[0],n[1]);
    const state=document.createElement('small');
    state.textContent=owned?tr('Đã có · Chờ art hoàn thiện','Owned · Artwork pending'):
     n[2]===null?tr('Rương Co-op siêu hiếm','Ultra-rare Co-op chest'):
     tr('Chưa mua · '+n[2]+' Xu Đồng Đội','Not owned · '+n[2]+' Co-op Coins');
    const btn=document.createElement('button');btn.type='button';
    btn.className='pkmsvv-pc-close';btn.disabled=true;btn.dataset.buildEquip=id;
    btn.textContent=unlocked?tr('Chưa thể thay','Not ready'):tr('🔒 Chưa mở','🔒 Locked');
    row.append(label,state,btn);items.append(row);
   }
  }
  for(const [id,x,y,w,ht,vi,en] of slots){
   const spot=document.createElement('button');spot.type='button';
   spot.className='pkmsvv-build-spot';spot.dataset.buildSlot=id;
   spot.style.left=x/320*100+'%';spot.style.top=y/224*100+'%';
   spot.style.width=w/320*100+'%';spot.style.height=ht/224*100+'%';
   spot.setAttribute('aria-label',tr('Chọn vị trí '+vi,'Select '+en));
   spot.onclick=()=>inspect(id);stage.append(spot);
  }
  area.append(stage,info);box.append(area);
  const footer=document.createElement('p');footer.className='pkmsvv-pc-hint';
  footer.textContent=tr('Đây là bản dựng UI: chưa có đủ sprite có thể tháo lắp, chưa mở bán và không trừ xu.',
    'UI preview: detachable décor sprites are unfinished; no purchases or coin deductions.');
  box.append(footer);overlay.append(box);document.body.append(overlay);
  inspect('center');back.focus({preventScroll:true});return true;
 }
 function open(){
  close();installStyle();
  const overlay=document.createElement('div');overlay.id='pkmsvv-wiki-overlay';
  overlay.className='pkmsvv-pc-overlay';overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',tr('Phòng nghiên cứu','Research Lab'));
  const box=document.createElement('section');box.className='pkmsvv-pc-panel pkmsvv-research-panel';
  const head=document.createElement('header');head.className='pkmsvv-pc-header';
  const title=document.createElement('h2');
  title.textContent=tr('🔬 PHÒNG NGHIÊN CỨU','🔬 RESEARCH LAB');
  const x=document.createElement('button');x.type='button';x.className='pkmsvv-pc-close';x.textContent=tr('✕ Đóng','✕ Close');x.setAttribute('data-back','');x.onclick=close;
  head.append(title,x);box.append(head);
  const hint=document.createElement('p');hint.className='pkmsvv-pc-hint';
  hint.textContent=tr('Căn cứ của Pippi · Hỗ trợ, Mega, Berry, Bạn đồng hành và Phục nguyên hóa thạch.','Pippi’s base · Supports, Mega, Berries, Companions and Fossil restoration.');box.append(hint);
  // Research Lab is now a DIRECT visual hub. Every click target is a real
  // native button on top of the room illustration, not the old PC card UI.
  const hero=document.createElement('section');hero.className='pkmsvv-research-hero pkmsvv-research-interactive';
  hero.dataset.pkmsvvResearchHub='2';
  const room=document.createElement('div');room.className='pkmsvv-research-room';
  room.setAttribute('role','group');
  room.setAttribute('aria-label',tr('Bản đồ tương tác Phòng nghiên cứu','Interactive Research Lab'));
  const invoke=(kind)=>{
   switch(kind){
    case 'support':close();G.PKMSVVSupportCatalog?.open?.({fromResearchLab:true});return;
    case 'mega':close();G.PKMSVVMegaEntry?.open?.({fromResearchLab:true});return;
    case 'berry':berryGuide();return;
    case 'companion':pippiCorner();return;
    case 'fossil':fossilRestoration();return;
   }
  };
  const zones=[
   {id:'support',x:21,y:75,w:94,h:58,vi:'Pokémon hỗ trợ',en:'Supports',
    tip:'Ủa, muốn có trợ lý Pokémon? Tui là trưởng phòng nhưng không nhận thêm việc đâu nha!'},
   {id:'mega',x:224,y:75,w:89,h:54,vi:'Mega',en:'Mega',
    tip:'Mega thì mạnh đó. Nhưng nhớ nha: biến hình không chữa được tật bấm loạn nút!'},
   {id:'berry',x:8,y:145,w:90,h:61,vi:'Berry',en:'Berries',
    tip:'Berry thì ăn được. Còn mẫu cây tiền sử kia? Đừng có hái nấu canh!'},
   {id:'companion',x:235,y:133,w:78,h:42,vi:'Bạn đồng hành',en:'Companions',
    tip:'Bấm vào đây mà chăm sóc giám đốc Pippi. Tui muốn tăng lương bằng kẹo!'},
   {id:'fossil',x:115,y:62,w:91,h:82,vi:'Phục nguyên',en:'Restore fossils',
    tip:'Máy phục nguyên chưa tự chạy bằng niềm tin đâu nha. Hoàn thành Co-op lần đầu trước!'}
  ];
  const speech=document.createElement('p');speech.className='pkmsvv-research-pippi-line';
  speech.setAttribute('aria-live','polite');
  const hotspotButtons=[];
  for(const z of zones){
   const b=document.createElement('button');b.type='button';
   b.className='pkmsvv-research-hotspot';b.dataset.researchHotspot=z.id;
   b.style.left=z.x/320*100+'%';b.style.top=z.y/224*100+'%';
   b.style.width=z.w/320*100+'%';b.style.height=z.h/224*100+'%';
   b.setAttribute('aria-label',tr('Mở '+z.vi,'Open '+z.en));
   const tag=document.createElement('span');tag.className='pkmsvv-research-hotspot-tag';
   const glyph=document.createElement('span');glyph.className='pkmsvv-research-glyph';
   glyph.dataset.researchGlyph=z.id;glyph.setAttribute('aria-hidden','true');
   const label=document.createElement('span');label.className='pkmsvv-research-tag-copy';
   label.textContent=tr(z.vi,z.en);tag.append(glyph,label);b.append(tag);
   b.addEventListener('mouseenter',()=>{if(G.I18n?.lang!=='en')speech.textContent=z.tip;});
   b.addEventListener('focus',()=>{speech.textContent=tr(z.tip,'Select '+z.en+' to open this research station.');});
   b.onclick=()=>invoke(z.id);
   room.append(b);hotspotButtons.push(b);
  }
  const toolbar=document.createElement('div');toolbar.className='pkmsvv-research-toolbar';
  const build=document.createElement('button');build.type='button';build.className='pkmsvv-pc-close';
  build.dataset.researchBuild='1';build.textContent=tr('🛠 Xây dựng','🛠 Build / Decorate');
  build.onclick=construction;
  const knowledge=document.createElement('button');knowledge.type='button';knowledge.className='pkmsvv-pc-close';
  knowledge.dataset.researchKnowledge='1';knowledge.textContent=tr('📖 Kiến thức','📖 Knowledge');
  toolbar.append(build,knowledge);
  const fast=document.createElement('nav');fast.className='pkmsvv-research-quick-actions';
  fast.setAttribute('aria-label',tr('Chọn khu nghiên cứu','Research stations'));
  for(const z of zones){
   const btn=document.createElement('button');btn.type='button';
   btn.className='pkmsvv-research-quick';btn.dataset.researchQuick=z.id;
   const glyph=document.createElement('span');glyph.className='pkmsvv-research-glyph';
   glyph.dataset.researchGlyph=z.id;glyph.setAttribute('aria-hidden','true');
   btn.append(glyph,document.createTextNode(tr(z.vi,z.en)));
   btn.onclick=()=>invoke(z.id);fast.append(btn);
  }
  const companion=document.createElement('div');companion.className='pkmsvv-research-pippi';
  const face=document.createElement('div');face.className='pkmsvv-research-pippi-head';
  const portrait=document.createElement('img');portrait.src='images/pippi/portrait/Happy.png';
  portrait.alt=tr('Pippi — Giám đốc Phòng nghiên cứu','Pippi — Research Director');
  portrait.width=52;portrait.height=52;portrait.loading='lazy';
  const lead=document.createElement('div');
  const name=document.createElement('strong');name.textContent=tr('Giáo sư Pippi','Professor Pippi');
  const position=document.createElement('small');
  position.textContent=tr('Tự phong giám đốc · Bạn làm thực tập sinh','Self-appointed director · You are the intern');
  lead.append(name,position);face.append(portrait,lead);
  const save=G.DB?.save,unlocked=save?.pkmsvvCoopLab?.machineUnlocked===true;
  const hasFossil=!!(save?.pkmsvvFossils?.guaranteedKabuto||
   Object.values(save?.pkmsvvFossils?.inventory||{}).some(v=>(Number(v)||0)>0));
  const lines=unlocked?[
   tr('Máy chạy rồi! Công lao thuộc về Pippi. Còn bạn… được lên ảnh tập thể.','The machine works! Full credit to Pippi. You may appear in the group photo.'),
   tr('Đừng tiêu sạch Xu Đồng Đội nha. Bệ vàng kia đang chờ một hiện vật cực kỳ xứng đáng với nhan sắc tui.','Save your Co-op Coins. That trophy pedestal deserves someone as gorgeous as me.')
  ]:hasFossil?[
   tr('Đào được hóa thạch rồi, nhưng máy vẫn khóa! Nhiệm vụ Co-op đầu tiên đâu? Đừng nhìn tui, tui đâu có biết sửa điện!','Fossil found, machine still locked! Finish the first Co-op mission; I do not fix wiring!'),
   tr('Một cục đá cổ mà bạn mừng như trúng số. Rồi ai phải làm báo cáo? Đương nhiên là… bạn!','One old rock and you are celebrating? Guess who writes the report. You!')
  ]:[
   tr('Chào mừng tới Phòng nghiên cứu Pippi! Tui là giám đốc, bạn là nhân viên khuân vác không lương. Hợp lý ghê!','Welcome to my lab! I am the director, and you are the unpaid assistant. Perfect!'),
   tr('Nhìn máy ở giữa chưa? Cái đó dành cho hóa thạch. Đừng bỏ đồ ăn vô, lần trước suýt nổ cả phòng!','See the central machine? Fossils only. Last time someone tried to cook in it…')
  ];
  lines.push(
   tr('Hỗ trợ, Mega, Berry, Đồng hành và Phục nguyên: mỗi góc một việc. Bấm thẳng vào máy đi, tui không phát bản đồ giấy!','Supports, Mega, Berries, Companions and Fossils: tap each station directly.'),
   tr('Muốn đổi nội thất hả? Bấm Xây dựng. Bấm sai chỗ tui tính phí tư vấn đó!','To replace furniture, use Build. Clicking the wrong thing incurs consultation fees!'),
   tr('PokéBox và Pokédex vẫn ở nút Pokémon ngoài menu. Phòng tui không phải kho chứa tất cả đâu nha!','PokéBox and Pokédex stay in the separate Pokémon menu. My lab is not a warehouse!'),
   tr('Thấy cái bệ danh dự kia không? Để dành tượng vàng Pippi. Đề nghị không ai tranh chỗ!','See that trophy pedestal? Reserved for golden Pippi. No competitors!')
  );
  let speechIndex=0;speech.textContent=lines[0];
  const actions=document.createElement('div');actions.className='pkmsvv-research-pippi-actions';
  const talk=document.createElement('button');talk.type='button';talk.className='pkmsvv-pc-close';
  talk.dataset.researchPippiTalk='1';talk.textContent=tr('Pippi cà khịa','Pippi roasts');
  talk.onclick=()=>{speechIndex=(speechIndex+1)%lines.length;speech.textContent=lines[speechIndex];};
  const tour=document.createElement('button');tour.type='button';tour.className='pkmsvv-pc-close';
  tour.dataset.researchPippiTour='1';tour.textContent=tr('Pippi dẫn tour','Guided tour');
  tour.onclick=()=>{if(!G.PKMSVVPippiGuide?.open?.('laboratory'))
   speech.textContent=tr('Tui dẫn tour rồi! Còn muốn nghe tui cà khịa thì nhấn nút bên cạnh.','Tour completed! Use the roast button for more.');};
  actions.append(talk,tour);
  const status=document.createElement('small');status.className='pkmsvv-research-machine-state';
  status.dataset.machineUnlocked=String(unlocked);
  status.textContent=unlocked?tr('Máy phục nguyên: ĐÃ MỞ','Restoration: UNLOCKED'):
   tr('Máy phục nguyên: KHÓA · cần Co-op hóa thạch lần đầu','Restoration: LOCKED · first Fossil Co-op required');
  companion.append(face,speech,actions,status);
  hero.append(room,fast,toolbar,companion);box.append(hero);
  const grid=document.createElement('div');grid.className='pkmsvv-pc-grid';
  if(window.__PKMSVV_PIPPI_QA)grid.dataset.pippiQaRevision=window.__PKMSVV_PIPPI_QA;
  grid.hidden=true;grid.setAttribute('aria-hidden','true');box.append(grid);
  makeCard(grid,{title:tr('Pokémon hỗ trợ','Support Pokémon'),dex:175,
   desc:tr('Togepi · Xem, chọn và quản lý tối đa 2 Pokémon hỗ trợ.','Togepi · Manage up to two supports.'),
   action:tr('Mở hỗ trợ','Open Supports'),onClick:()=>G.PKMSVVSupportCatalog?.open?.()});
  makeCard(grid,{title:tr('Tiến Hóa Mega','Mega Evolution'),dex:megaMewtwoArt(),
   desc:tr('Mega Mewtwo · Xem các dạng Mega và điều kiện mở khóa.','Mega Mewtwo · Review forms and unlock requirements.'),
   action:tr('Mở Mega','Open Mega'),onClick:()=>G.PKMSVVMegaEntry?.open?.()});
  makeCard(grid,{title:'Berry',dex:420,
   desc:tr('Cherubi · Tra cứu công dụng 10 loại Berry.','Cherubi · Learn the effects of all ten Berries.'),
   action:tr('Xem cẩm nang','View guide'),onClick:berryGuide});
   makeCard(grid,{title:tr('Bạn đồng hành','Companions'),dex:35,
    desc:tr('Thân thiết · Nâng cấp hồi máu, cổ vũ, khống chế và bảo vệ.','Bond · Healing, buff, control and defense.'),
    action:tr('Chăm sóc Pippi','Train Pippi'),onClick:pippiCorner});
  makeCard(grid,{title:tr('Hồi sinh hóa thạch','Fossil Restoration'),dex:140,
   desc:tr('Sưu tầm hóa thạch · Mở máy sau nhiệm vụ Co-op lần đầu.','Collect fossils · Unlock the machine on your first Co-op lab clear.'),
   action:tr('Xem máy phục nguyên','View restoration machine'),onClick:fossilRestoration});
  const help=document.createElement('section');help.className='pkmsvv-pc-guide';help.hidden=true;
  knowledge.setAttribute('aria-expanded','false');
  knowledge.onclick=()=>{help.hidden=!help.hidden;knowledge.setAttribute('aria-expanded',String(!help.hidden));};
  const sub=document.createElement('h3');sub.textContent=tr('Kiến thức Pokémon','Pokémon knowledge');
  help.append(sub);
  const articles=[
   [tr('Thức tỉnh kỹ năng','Skill Awakening'),
    tr('Bắt đầu với 3 ô kỹ năng. Mở thêm 5 ô vĩnh viễn bằng cách hạ tổng 50, 100, 200 quái và đạt tổng 10, 20 cấp Nâng cấp. Tiến độ cộng dồn qua nhiều trận và áp dụng cho MỌI Pokémon. Khi lên cấp trong trận, bạn chọn chiêu để học/nâng cấp; mở ô không tự tặng chiêu.',
       'Start with 3 move slots. Permanently unlock 5 more by defeating 50, 100 and 200 enemies in total and earning 10 and 20 combined Upgrade ranks. Progress carries across runs for ALL Pokémon. Choose moves on level-up; unlocking a slot does not grant a free move.')],
   [tr('✨ Fusion — Dung hợp kỹ năng','✨ Fusion — Skill Fusion'),
    tr('Cả hai chiêu gốc phải đạt MAX. Hãy chọn công thức Fusion để dung hợp chúng thành một kỹ năng MỚI đạt MAX. Hai chiêu gốc được thay bằng một chiêu mới, giải phóng một ô kỹ năng. Mỗi trận chỉ Fusion một lần; Bond từ Khe Nứt là cơ chế riêng.',
       'Choose a Fusion recipe, train both source moves to MAX and merge them into an entirely NEW MAX-level move. This replaces two moves with one and frees a slot. One Fusion per run; Rift Bonds are separate.')],
   [tr('Mystery Orb','Mystery Orb'),null]
  ];
  // The permanent Skill Awakening achievement is 8/8 shared move SLOTS.
  // A completed story chapter or eight temporarily learned run moves must
  // never hide this beginner guide before permanent unlock is complete.
  const skillAwakeningDone=!!G.DB?.save&&
    (G.PKMSVVSkillTrack?.progress?.(G.DB.save)?.count||0)>=8;
  for(const [name,description] of articles.filter(([name])=>
   !skillAwakeningDone||name!==tr('Thức tỉnh kỹ năng','Skill Awakening'))){
   const detail=document.createElement('div');detail.className='pkmsvv-pc-learn';
   const awakening=name===tr('Thức tỉnh kỹ năng','Skill Awakening');
   if(awakening)detail.dataset.pkmsvvKnowledge='awakening';
   const toggle=document.createElement('button');toggle.type='button';toggle.textContent=(awakening?'▾ ':'▸ ')+name;
   toggle.setAttribute('aria-expanded',String(awakening));
   const p=document.createElement('div');p.hidden=!awakening;p.className='pkmsvv-pc-orb-details';
   if(description!==null){
    const paragraph=document.createElement('p');paragraph.textContent=description;p.append(paragraph);
    if(awakening){
     const guide=G.PKMSVVSkillTrack?.guide?.(G.DB?.save,G.I18n?.lang);
     if(guide){
      const title=document.createElement('strong');title.className='pkmsvv-awakening-progress';title.textContent=guide.headline;p.append(title);
      const note=document.createElement('p');note.textContent=guide.note;p.append(note);
      const list=document.createElement('ul');list.className='pkmsvv-awakening-milestones';
      for(const line of guide.lines){const item=document.createElement('li');item.textContent=line;list.append(item);}
      p.append(list);
     }
    }
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
    const spriteIds=new Set(['slumber','slow','blowback','focus','luminous','quick']);
    for(const orb of G.Orbs?.LIST||[]){
     const item=document.createElement('p');item.className='pkmsvv-pc-orb-item';
     const label=orb.name?.[G.I18n?.lang==='en'?1:0]||orb.id;
     if(spriteIds.has(orb.id)){
      // Same six offline SVG sprites used by the real in-game Orb renderer.
      const art=document.createElement('img');art.className='pkmsvv-orb-guide-icon';
      art.src='assets/orbs/'+orb.id+'.svg';art.alt=label;art.loading='lazy';
      item.append(art);
     }
     const copy=document.createElement('span');copy.className='pkmsvv-orb-guide-copy';
     const strong=document.createElement('strong');strong.textContent=label;
     copy.append(strong,document.createTextNode(orb.desc?.[G.I18n?.lang==='en'?1:0]||''));
     item.append(copy);p.append(item);
    }
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
  // A cached legacy PC handler can overwrite the button's onclick during
  // MenuUI.open. Intercept in WINDOW CAPTURE before legacy document/target
  // handlers. Do not replace Pokémon's native fast button or modify save.
  if(!window.__pkmsvvResearchEntryCapture){
   window.__pkmsvvResearchEntryCapture=true;
   window.addEventListener('click',e=>{
    const launch=e.target?.closest?.('#pkmsvv-menu-wiki');
    if(!launch||!document.querySelector('#scr-menu')?.contains(launch))return;
    e.preventDefault();e.stopImmediatePropagation();open();
   },true);
  }
  const old=G.MenuUI?.open;
  if(typeof old==='function'&&!G.MenuUI.__pkmsvvWiki){
   G.MenuUI.__pkmsvvWiki=true;
   G.MenuUI.open=function(...args){const out=old.apply(this,args);installMenu();return out;};
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('pkmsvv-wiki-overlay')){close();e.stopPropagation();}});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 return {open,close,berryGuide,pippiCorner,fossilRestoration,construction,installMenu};
})();
