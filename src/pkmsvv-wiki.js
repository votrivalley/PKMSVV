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
    const info=document.createElement('p');info.textContent=key==='cousin'&&
     window.PKMSVV_PIPPI_COUSIN_QA_100===true?
     tr('🧪 BETA TEST: Pikachu gọi em họ 100% mỗi lần mất HP thật trong Khám phá (kể cả chưa học skill). Không áp dụng trong Co-op/Arena. Sau test sẽ trở lại tỉ lệ thông thường.',
      '🧪 BETA TEST: Pikachu triggers on every real HP loss in Explore (even without learning the skill). Not in Co-op/Arena. Normal rates return after QA.'):
     description;
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
  G.PKMSVVPippiGuide?.openFeature?.('companion');
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
  // Fossils are tangible rocks until restored; never expose undiscovered
  // Pokémon silhouettes or species names as the primary list artwork.
  const motifs={
   helix_fossil:'M23 34c0-12 21-16 30-4 9 15-8 26-20 18-10-6-3-16 6-11 13 5 9 17-2 16-13',
   dome_fossil:'M14 43Q32 9 51 43M21 42V50M29 34V51M38 34V51M46 42V50',
   old_amber:'M32 12L51 26L48 52L31 59L14 43L18 24ZM27 28L37 41M38 26L27 45',
   root_fossil:'M30 15V34L17 48M30 34L44 47M30 32L47 23M17 48L12 55M44 47L51 54',
   claw_fossil:'M16 47L24 19L29 46L37 14L40 47L51 22L49 52',
   skull_fossil:'M19 43V26Q32 11 45 26V43L39 48V53H25V48Z M25 32h4m8 0h4m-9 8v6',
   armor_fossil:'M32 14L49 23L51 42L40 53L23 52L14 36L19 23ZM32 22V51M21 32H44',
   cover_fossil:'M16 43Q24 15 35 19Q51 22 52 44L39 54L22 51ZM27 35L43 42M35 22L31 48',
   plume_fossil:'M17 51Q48 9 49 16Q49 48 17 51ZM20 50L45 20M27 38L42 37M34 27L48 27',
   jaw_fossil:'M15 23L27 17L44 23L52 35L47 50L34 56L20 47ZM19 39L25 44L31 41L37 48L43 41L49 43',
   sail_fossil:'M17 53L25 17L32 37L39 15L45 40L52 25L55 54ZM21 48H52',
   fossilized_bird:'M14 31L29 27L38 17L42 31L53 38L40 46L23 42ZM30 34L45 42',
   fossilized_fish:'M13 36L29 23L44 28L49 35L57 25V49L48 41L29 48ZM24 33H28',
   fossilized_drake:'M19 49L24 23L37 16L45 28L54 32L41 41L38 54ZM30 31L39 38',
   fossilized_dino:'M13 46L21 28L34 23L43 30L51 27L54 50L38 53L28 44ZM31 33L40 38'
  };
  function fossilStone(id,found){
   const holder=document.createElement('span');holder.className='pkmsvv-fossil-stone'+(found?'':' undiscovered');
   holder.dataset.fossilMaterial=id;holder.setAttribute('aria-hidden','true');
   // Only known, fixed material IDs can contribute SVG paths.
   const safePath=motifs[id]||motifs.dome_fossil;
   holder.innerHTML='<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
    '<path d="M13 18L24 10L42 10L54 22L58 41L47 55L27 57L11 47L7 32Z" fill="#a98d69" stroke="#514435" stroke-width="4"/>'+
    '<path d="M15 21L24 14L42 14L52 23" fill="none" stroke="#e5cb96" stroke-width="3"/>'+
    '<path d="'+safePath+'" fill="none" stroke="#493629" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>'+
    '</svg>';
   return holder;
  }
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
   const progress=F.collectionProgress?.(s)||{revived:0,recipes:F.recipes.length,collected:0,total:25,complete:false};
   const medal=document.createElement('p');medal.className='pkmsvv-fossil-medal';
   medal.dataset.fossilAchievement=String(progress.collected);
   medal.dataset.fossilRevived=String(progress.revived);
   medal.textContent=progress.complete?
    tr('🏅 Nhà khảo cổ vĩ đại — Đã sưu tầm đủ 25 Pokémon hóa thạch!',
       '🏅 Great Archaeologist — All 25 fossil Pokémon collected!'):
    tr('🏅 Nhà khảo cổ vĩ đại · Đã sưu tầm '+progress.collected+'/'+progress.total+' Pokémon',
       '🏅 Great Archaeologist · Collected '+progress.collected+'/'+progress.total+' Pokémon');
   const explain=document.createElement('small');explain.className='pkmsvv-fossil-collection-hint';
   explain.textContent=tr('Có 15 loài hồi sinh trực tiếp từ hóa thạch và 10 dạng tiến hóa. Đã phục nguyên '+progress.revived+'/'+progress.recipes+' loài gốc.',
    '15 Pokémon revive directly from fossils; 10 are evolutions. Revived '+progress.revived+'/'+progress.recipes+' base species.');
   list.append(medal,explain);
   for(const formula of F.recipes){
    const restored=s?.pkmsvvFossils?.restored?.[formula.dex]===true;
    const own=!!s?.owned?.[formula.dex];
    const found=formula.materialIds.some(id=>!!s?.pkmsvvFossils?.discovered?.[id]||(Number(bag[id])||0)>0)||restored;
    const can=unlocked&&!!G.DEX_BY?.[formula.dex]&&!!G.SPRITE_META?.[formula.dex]&&
     !own&&formula.materialIds.every(id=>(Number(bag[id])||0)>=formula.materialIds.filter(x=>x===id).length);
    const row=document.createElement('article');row.className='pkmsvv-fossil-row';
    row.dataset.fossilState=restored?'restored':found?'found':'unknown';
    const art=document.createElement('div');art.className='pkmsvv-fossil-art';
    if(restored){
     const canvas=document.createElement('canvas');canvas.width=72;canvas.height=72;
     canvas.setAttribute('aria-label',formula.name);
     try{G.UI?.sprite?.(canvas,formula.dex,{hero:true,scale:1.2});}catch(_){}
     art.append(canvas);
    }else{
     const rocks=document.createElement('div');rocks.className='pkmsvv-fossil-rocks';
     for(const materialId of formula.materialIds){
      const seen=!!s?.pkmsvvFossils?.discovered?.[materialId]||(Number(bag[materialId])||0)>0;
      rocks.append(fossilStone(materialId,seen));
     }
     art.append(rocks);
    }
    const detail=document.createElement('div');detail.className='pkmsvv-fossil-detail';
    const name=document.createElement('strong');
    name.textContent=restored?formula.name+' · Gen '+formula.generation:
     found?formula.materialIds.map(id=>F.materials.find(m=>m.id===id)?.nameVi||id).join(' + ')+' · Gen '+formula.generation:
     tr('??? · Hóa thạch chưa phát hiện','??? · Undiscovered fossil')+' · Gen '+formula.generation;
    const ingredients=document.createElement('small');
    ingredients.textContent=found||restored?
     formula.materialIds.map(id=>(F.materials.find(m=>m.id===id)?.nameVi||id)+' ×'+(bag[id]||0)).join(' + '):
     tr('Chưa tìm thấy hóa thạch này trong Khám phá.','This fossil has not been found in Explore.');
    const status=document.createElement('small');
    status.textContent=restored?tr('Đã hồi sinh · Hiện Pokémon','Restored · Pokémon revealed'):
     own?tr('Đã sở hữu Pokémon (chưa phục nguyên tại máy)','Already owns Pokémon (not restored at machine)'):
     !unlocked?tr('Máy khóa · Hoàn thành Co-op lần đầu','Machine locked · Complete first Co-op mission'):
     can?tr('Đủ vật liệu · Có thể hồi sinh','Materials ready · Can restore'):
     tr('Cần tìm đủ hóa thạch','Find required fossils');
    detail.append(name,ingredients,status);
    // The 10 evolved species are collectible separately, not independent
    // fossil fragments. Never reveal a species name before base restoration.
    if(restored&&Array.isArray(formula.evolutionDexIds)&&formula.evolutionDexIds.length){
     const evolution=document.createElement('small');evolution.className='pkmsvv-fossil-evolution';
     evolution.textContent=formula.evolutionDexIds.map(dex=>
      s?.owned?.[dex]?
       tr('✓ Đã sưu tầm tiến hóa #','✓ Evolution collected #')+dex:
       tr('◇ Chưa sưu tầm tiến hóa #','◇ Evolution missing #')+dex).join(' · ');
     detail.append(evolution);
    }
    const button=document.createElement('button');button.type='button';button.className='pkmsvv-pc-close pkmsvv-fossil-revive';
    button.dataset.fossilDex=String(formula.dex);button.disabled=!can;
    button.textContent=restored?tr('Đã hồi sinh','Restored'):own?tr('Đã sở hữu','Owned'):
     !unlocked?tr('🔒 Chưa mở','🔒 Locked'):tr('Hồi sinh','Restore');
    button.onclick=()=>{
     if(button.disabled)return;
     const result=F.restore(formula.dex);
     if(!result.ok){G.UI?.toast?.(tr('Không thể phục nguyên. Hóa thạch vẫn được giữ.','Could not restore. Materials preserved.'),2600);return;}
     draw();list.querySelector('[data-fossil-dex="'+formula.dex+'"]')?.focus({preventScroll:true});
    };
    row.append(art,detail,button);list.append(row);
   }
  }
  draw();shade.append(box);document.body.append(shade);
  back.focus({preventScroll:true});
  G.PKMSVVPippiGuide?.openFeature?.('fossil');
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
  if(G.Pad?.name)G.Pad?.focusFirst?.();
  G.PKMSVVPippiGuide?.openFeature?.('berry');return true;
 }
 // "Xây dựng" is a separate interaction mode. The room composition is still
 // a concept image, not a set of detachable sprites. Never fake owned decor.
 // Shop is a display/read-only storefront until its Co-op mission adapters
 // and separate decoration/costume sprites are verified. The weekly exchange
 // is a real atomic wallet transaction and uses the SAME Co-op coin balance.
 function coopShop(){
  close();installStyle();
  const E=G.PKMSVVCoopEconomy;
  const overlay=document.createElement('div');overlay.id='pkmsvv-wiki-overlay';
  overlay.className='pkmsvv-pc-overlay';overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  const panel=document.createElement('section');panel.className='pkmsvv-pc-panel pkmsvv-coop-shop-panel';
  const head=document.createElement('header');head.className='pkmsvv-pc-header';
  const title=document.createElement('h2');title.textContent=tr('🛒 Kho Hậu Cần Co-op','🛒 Co-op Supply Depot');
  const back=document.createElement('button');back.type='button';back.className='pkmsvv-pc-close';
  back.setAttribute('data-back','');back.textContent=tr('← Phòng nghiên cứu','← Research Lab');
  back.onclick=open;head.append(title,back);panel.append(head);
  const talk=document.createElement('p');talk.className='pkmsvv-coop-shop-talk';
  talk.textContent=tr('Đây là Kho Hậu Cần. Xem số Xu Đồng Đội và trạng thái từng món trước khi bấm nha.',
   'Welcome to Director Pippi’s Royal Laboratory! I own the shop. You do the hard work. Fair deal!');
  panel.append(talk);
  const state=document.createElement('div');state.className='pkmsvv-coop-shop-wallet';panel.append(state);
  const exchangePanel=document.createElement('section');exchangePanel.className='pkmsvv-coop-shop-exchange';panel.append(exchangePanel);
  const note=document.createElement('p');note.className='pkmsvv-pc-hint';
  note.textContent=tr('Xu Đồng Đội dùng chung cho các nhiệm vụ Co-op. Một số món trang trí vẫn là bản xem trước, chưa mua được; chỉ giao dịch có nút hoạt động mới dùng được.',
   'Co-op Coins are shared across missions. Some décor is preview-only; only enabled exchanges are available.');
  panel.append(note);
  const groups=document.createElement('div');groups.className='pkmsvv-coop-shop-groups';panel.append(groups);
  const cfg=E?.config;
  function renderWallet(){
   state.replaceChildren();exchangePanel.replaceChildren();
   const player=G.DB?.save;
   const balance=E?.normal?.(player);
   const left=document.createElement('strong');
   left.textContent=tr('Xu Đồng Đội: ','Co-op Coins: ')+(balance?.coopCoins??0);
   const right=document.createElement('strong');
   right.textContent='PokéCoins: '+(Number.isSafeInteger(player?.coins)?player.coins:0);
   state.append(left,right);
   if(!cfg?.currency?.exchange)return;
   const e=cfg.currency.exchange;
   const heading=document.createElement('strong');
   heading.textContent=tr('Quy đổi có giới hạn tuần','Weekly limited exchange');
   const text=document.createElement('small');
   const nowWeek=E.weekKey(Date.now());
   const used=balance.lastExchangeWeek===nowWeek?balance.weeklyPokeCoins:0;
   text.textContent=e.costCoopCoins+' '+tr('Xu Đồng Đội','Co-op Coins')+
    ' → '+e.earnPokeCoins+' PokéCoins · '+used+'/'+e.weeklyPokeCoinCap+
    tr(' PokéCoins tuần này',' PokéCoins this week');
   const action=document.createElement('button');action.type='button';
   action.className='pkmsvv-pc-close';action.dataset.coopExchange='1';
   action.textContent=tr('Đổi xu','Exchange coins');
   action.disabled=!E||!!G.DB?.guest||typeof G.DB?.commit!=='function'||
    balance.coopCoins<e.costCoopCoins||used+e.earnPokeCoins>e.weeklyPokeCoinCap;
   action.onclick=()=>{
    if(action.disabled)return;
    const result=E.exchange(G.DB.save,()=>G.DB.commit(true));
    if(result.ok){
     G.UI?.toast?.(tr('Đã đổi +'+result.awarded+' PokéCoins!','Exchanged +'+result.awarded+' PokéCoins!'),2200);
     talk.textContent=tr('Ô kìa, khách chịu chi! Nhớ để dành xu cho quầy Pippi nữa nghen!',
      'Such a big spender! Save a few coins for Pippi’s shop, okay?');
     renderWallet();
    }else{
     talk.textContent=tr('Đổi xu chưa được. Kiểm tra số dư, giới hạn tuần và dữ liệu lưu nhé.',
      'Exchange unavailable. Check balance, weekly cap and save.');
    }
   };
   exchangePanel.append(heading,text,action);
  }
  renderWallet();
  for(const group of cfg?.shop?.sections||[]){
   const block=document.createElement('section');block.className='pkmsvv-coop-shop-section';
   const h=document.createElement('h3');h.textContent=tr(group.nameVi,group.id);block.append(h);
   const items=group.catalogRef==='items'?cfg.items.filter(x=>x.price!==0):(group.items||[]);
   for(const item of items){
    const row=document.createElement('div');row.className='pkmsvv-coop-shop-item';
    const details=document.createElement('div');
    const name=document.createElement('strong');name.textContent=item.nameVi;
    const desc=document.createElement('small');
    desc.textContent=item.descriptionVi||tr('Nội dung đang hoàn thiện.','More content coming soon.');
    details.append(name,desc);
    const action=document.createElement('button');action.type='button';
    action.className='pkmsvv-pc-close';action.disabled=true;
    action.dataset.coopShopItem=item.id;
    action.textContent=item.price===null?tr('Phần thưởng hiếm','Rare reward'):
     item.price+' '+tr('xu · Chưa mở','coins · Unavailable');
    row.append(details,action);block.append(row);
   }
   groups.append(block);
  }
  overlay.append(panel);document.body.append(overlay);
  back.focus({preventScroll:true});
  G.PKMSVVPippiGuide?.openFeature?.('depot');return true;
 }
 // Research Lab modular furnishing renderer: no painted-in purchases.
 // Each owned object is its own alpha asset, positioned by the shared catalog.
 // A screenshot of the original furnished room is reference art only.
 // Approved V3 artwork defaults on only in the packaged isolated QA build, not a release.
 function approvedLabV3Preview(){
  if(typeof window==='undefined'||!['localhost','127.0.0.1','beta.pkmsvv-web.pages.dev','research-ui-qa.pkmsvv-web.pages.dev'].includes(window.location.hostname))return false;
  const q=new URLSearchParams(window.location.search);
  if(q.get('pkmsvvLabV3')==='1')return true;
  if(q.get('pkmsvvLabV3')==='0'||q.has('pkmsvvLabLayers'))return false;
  return window.PKMSVV_RESEARCH_V3_QA===true;
 }
 async function renderApprovedLabV3(stage,revision){
  const base='images/coop-lab/research-v3/';
  try{
   const response=await fetch(base+'manifest.json',{cache:'no-store'});
   if(!response.ok)return;
   const m=await response.json();
   if(m.version!==3||m.canvas?.width!==1500||m.canvas?.height!==1049||
    m.background!=='backdrop.png'||m.readyForFurnitureSwap!==false||
    !Array.isArray(m.layers)||m.layers.length!==6||!Array.isArray(m.labels)||m.labels.length!==5)return;
   const ids=['crest','support','fossil','mega','berry','companion'];
   const slots={crest:'decor',support:'shelf_left',fossil:'center',mega:'shelf_right',berry:'garden',companion:'trophy'};
   const rect=p=>['x','y','w','h'].every(k=>Number.isInteger(p[k]))&&p.x>=0&&p.y>=0&&p.w>0&&p.h>0&&p.x+p.w<=1500&&p.y+p.h<=1049;
   if(!ids.every(id=>m.layers.filter(p=>p.id===id&&p.file===id+'.png'&&p.slot===slots[id]&&rect(p)).length===1)||
     !ids.slice(1).every(id=>m.labels.filter(p=>p.id===id&&rect(p)).length===1))return;
   const load=(file)=>new Promise((resolve,reject)=>{
    const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=base+file;
   });
   const preview=stage.classList.contains('pkmsvv-build-stage')&&window.PKMSVV_RESEARCH_SKIN_QA===true;
   const previewFiles=m.layers.map(p=>preview&&p.id!=='crest'&&stage.dataset['skin'+p.id]==='copper'?'skins/'+p.id+'-copper.png':p.file);
   const [background,...images]=await Promise.all([load(m.background),...m.layers.map((p,i)=>load(previewFiles[i]).catch(()=>load(p.file)))]);
   if(background.naturalWidth!==1500||background.naturalHeight!==1049||
      images.some((img,i)=>img.naturalWidth!==m.layers[i].w||img.naturalHeight!==m.layers[i].h))return;
   if(stage.dataset.labRenderRevision!==revision||!stage.isConnected)return;
   stage.querySelectorAll('.pkmsvv-lab-furniture,.pkmsvv-lab-source-layer,.pkmsvv-lab-station-prop,.pkmsvv-lab-v3-layer').forEach(x=>x.remove());
   const place=(el,p)=>{el.style.left=p.x/1500*100+'%';el.style.top=p.y/1049*100+'%';el.style.width=p.w/1500*100+'%';el.style.height=p.h/1049*100+'%';};
   for(let i=0;i<m.layers.length;i++){
    const p=m.layers[i],img=images[i];img.className='pkmsvv-lab-v3-layer';img.dataset.labLayer=p.id;img.dataset.labSlot=p.slot;img.dataset.labSkin=img.src.endsWith('-copper.png')?'copper':'default';
    img.alt='';img.draggable=false;img.setAttribute('aria-hidden','true');
    Object.assign(img.style,{position:'absolute',objectFit:'fill',pointerEvents:'none',zIndex:'1',maxWidth:'none',margin:'0',padding:'0',border:'0'});
    place(img,p);stage.prepend(img);
   }
   stage.style.setProperty('background-image','url("'+base+m.background+'")','important');
   stage.style.setProperty('background-size','100% 100%','important');
   stage.style.setProperty('aspect-ratio','1500 / 1049','important');
   for(const label of m.labels){
    const part=m.layers.find(p=>p.id===label.id),button=stage.querySelector('[data-research-hotspot="'+label.id+'"]');
    if(button){
     const x=Math.min(part.x,label.x),y=Math.min(part.y,label.y);
     const w=Math.max(part.x+part.w,label.x+label.w)-x,h=Math.max(part.y+part.h,label.y+label.h)-y;
     place(button,{x,y,w,h});button.style.zIndex='4';
     button.querySelectorAll('.pkmsvv-research-scene-object').forEach(n=>n.style.setProperty('display','none','important'));
     const tag=button.querySelector('.pkmsvv-research-hotspot-tag');
     if(tag){Object.assign(tag.style,{position:'absolute',left:(label.x-x)/w*100+'%',top:(label.y-y)/h*100+'%',width:label.w/w*100+'%',height:label.h/h*100+'%',margin:'0',padding:'0',boxSizing:'border-box'});}
    }
    const spot=stage.querySelector('[data-build-slot="'+part.slot+'"]');if(spot)place(spot,part);
   }
   stage.dataset.researchArtMode='approved-v3';
  }catch(error){console.warn('[Research V3 QA] Asset load failed; retaining original room',String(error));}
 }
 function modularLabPreview(){
  if(approvedLabV3Preview())return false;
  if(typeof window==='undefined'||!window.location)return false;
  const host=String(window.location.hostname||'');
  if(!['localhost','127.0.0.1','beta.pkmsvv-web.pages.dev','research-ui-qa.pkmsvv-web.pages.dev'].includes(host))return false;
  // Existing QA hosts opt into the original-art layer scene by default.
  // Explicit 0 returns to the unchanged classic backdrop for comparison.
  const query=String(window.location.search||'');
  if(/(?:^|[?&])pkmsvvLabLayers=1(?:&|$)/.test(query))return true;
  return !/(?:^|[?&])pkmsvvLabLayers=0(?:&|$)/.test(query);
 }
 function renderFurnitureLayers(stage){
  if(!stage)return;
  stage.querySelectorAll('.pkmsvv-lab-furniture,.pkmsvv-lab-source-layer,.pkmsvv-lab-station-prop,.pkmsvv-lab-v3-layer').forEach(x=>x.remove());
  const modular=modularLabPreview();
  const revision=String((Number(stage.dataset.labRenderRevision)||0)+1);
  stage.dataset.labRenderRevision=revision;
  stage.dataset.researchArtMode='classic';
  const layerLoads=[];
  // Artwork must never require a wallet adapter or unlocked save.
  if(approvedLabV3Preview())renderApprovedLabV3(stage,revision);
  const E=G.PKMSVVCoopEconomy,conf=E?.config,save=G.DB?.save;
  const art=window.PKMSVV_RESEARCH_ART_QA||conf?.roomArt;
  if(!art?.slots)return;
  if(modular)for(const part of art.sourceLayers||[]){
   const img=document.createElement('img');
   img.className='pkmsvv-lab-source-layer';
   img.src='images/coop-lab/source-cutouts-qa/'+part.file;
   img.alt='';img.draggable=false;img.loading='eager';
   img.dataset.labLayer=part.id;
   img.dataset.labStation=part.station;
   img.dataset.labSlot=part.slot;
   img.style.left=part.x/960*100+'%';
   img.style.top=part.y/672*100+'%';
   img.style.width=part.w/960*100+'%';
   img.style.height=part.h/672*100+'%';
   img.setAttribute('aria-hidden','true');
   layerLoads.push(new Promise(resolve=>{
    img.addEventListener('load',()=>resolve(true),{once:true});
    img.addEventListener('error',()=>resolve(false),{once:true});
    if(img.complete)resolve(img.naturalWidth>0);
   }));
   stage.prepend(img);
  }
  if(modular&&layerLoads.length){
   const bg=new Image();
   layerLoads.push(new Promise(resolve=>{
    bg.onload=()=>resolve(true);bg.onerror=()=>resolve(false);
    bg.src='images/coop-lab/source-cutouts-qa/clean-backdrop.png';
   }));
   Promise.all(layerLoads).then(ok=>{
    if(stage.dataset.labRenderRevision===revision&&ok.every(Boolean))
     stage.dataset.researchArtMode='modular';
   });
  }
  // Real scenery props, independent from machine skins and clickable labels.
  // A missing QA asset simply leaves the original room and label usable.
  if(modular)for(const prop of art.stationProps||[]){
   const img=document.createElement('img');
   img.className='pkmsvv-lab-station-prop';img.dataset.labProp=prop.id;
   img.src='images/coop-lab/source-cutouts-qa/'+prop.file;
   img.alt='';img.draggable=false;img.setAttribute('aria-hidden','true');
   img.style.left=prop.x/960*100+'%';img.style.top=prop.y/672*100+'%';
   img.style.width=prop.w/960*100+'%';img.style.height=prop.h/672*100+'%';
   img.addEventListener('error',()=>img.remove(),{once:true});
   stage.append(img);
  }
  if(!E?.normal||!conf?.items)return;
  const owned=E.normal(save);
  for(const [slot,coords] of Object.entries(conf.roomArt.slots)){
   const itemId=owned.equippedDecorBySlot?.[slot];
   const item=conf.items.find(it=>it.id===itemId);
   if(!item?.artReady||!item.spritePath||!item.slots.includes(slot))continue;
   // The original center machine has its own alpha-cutout in preview mode.
   if(modular&&item.id==='machine_old')continue;
   const image=document.createElement('img');image.className='pkmsvv-lab-furniture';
   image.src=item.spritePath;image.alt='';image.loading='eager';
   image.dataset.furniture=item.id;image.dataset.furnitureSlot=slot;
   image.style.left=coords.x/320*100+'%';image.style.top=coords.y/224*100+'%';
   image.style.width=coords.w/320*100+'%';image.style.height=coords.h/224*100+'%';
   image.setAttribute('aria-hidden','true');image.draggable=false;stage.prepend(image);
  }
 }
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
  const E=G.PKMSVVCoopEconomy;
  const unlocked=E?.isMachineUnlocked?.(G.DB?.save)===true;
  const skinQA=approvedLabV3Preview()&&window.PKMSVV_RESEARCH_SKIN_QA===true;
  const current=()=>E?.normal?.(G.DB?.save)||G.DB?.save?.pkmsvvCoopLab||{};
  const note=document.createElement('p');note.className='pkmsvv-pc-hint';
  note.textContent=unlocked?
   tr('Đã giữ lại bối cảnh nghiên cứu cũ. Chọn từng vị trí để xem đồ trang trí; các món chưa bóc tách khỏi tranh vẫn chỉ là bản xem trước.',
      'The original detailed room is restored. Select a furnishing slot; unseparated objects remain previews.'):
   tr('🔒 Xây dựng cần nhiệm vụ Co-op hóa thạch lần đầu. Đây là bối cảnh cũ đẹp đã khôi phục, không phải nền trống phác thảo; hiện chỉ xem được các vị trí.',
      '🔒 Building requires the first fossil Co-op mission. The detailed original room is back, with placement previews only.');
  box.append(note);
  const area=document.createElement('div');area.className='pkmsvv-build-layout';
  const stage=document.createElement('div');stage.className='pkmsvv-build-stage';
  stage.dataset.researchArtMode='classic';
  renderFurnitureLayers(stage);
  const info=document.createElement('section');info.className='pkmsvv-build-info';
  const h=document.createElement('h3'),desc=document.createElement('p'),
   items=document.createElement('div');items.className='pkmsvv-build-items';
  info.append(h,desc,items);
  let slots=[
   ['wall_left',43,31,63,32,'Tường trái','Left wall'],
   ['wall_right',213,31,63,32,'Tường phải','Right wall'],
   ['center',111,62,91,82,'Máy phục nguyên','Revival machine'],
   ['shelf_left',18,75,100,62,'Kệ bên trái','Left shelf'],
   ['shelf_right',220,74,96,59,'Kệ bên phải','Right shelf'],
   ['garden',6,146,87,66,'Góc cây cảnh','Garden'],
   ['desk',235,132,79,34,'Bàn nghiên cứu','Research desk'],
   ['trophy',250,124,29,47,'Bệ danh dự','Trophy pedestal']
  ];
  const v3Station={center:'fossil',shelf_left:'support',shelf_right:'mega',garden:'berry',trophy:'companion'};
  if(skinQA){
   slots=slots.filter(s=>Object.hasOwn(v3Station,s[0]));
   const namesBySlot={center:['Máy phục nguyên','Restoration machine'],shelf_left:['Pokémon hỗ trợ','Supports'],shelf_right:['Mega','Mega'],garden:['Berry','Berries'],trophy:['Bạn đồng hành','Companions']};
   slots=slots.map(s=>[...s.slice(0,5),...namesBySlot[s[0]]]);
   note.textContent=tr('Thử skin từng máy ngay trong phòng. Bản QA này chỉ xem thử, không trừ Xu Đồng Đội và không lưu thay đổi.','Preview each station skin in the room. This QA preview never charges coins or saves changes.');
  }
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
   gold_pippi_statue:['Tượng Vàng Giáo sư Pippi','Golden Professor Pippi',9999]
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
   const save=current();
   desc.textContent=tr('Đang trang bị: ','Equipped: ')+
    (names[save.equippedDecorBySlot?.[slot]]?.[G.I18n?.lang==='en'?1:0]||
    tr('Chưa có vật phẩm','Empty'))+
    ' · '+tr('Xu Đồng Đội: ','Co-op Coins: ')+(save.coopCoins||0);
   items.replaceChildren();
   if(skinQA){
    const station=v3Station[slot];if(!station)return;
    const selected=stage.dataset['skin'+station]||'default';
    desc.textContent=tr('Đang xem thử: ','Preview: ')+(selected==='copper'?tr('Đồng đỏ (QA)','Copper (QA)'):tr('Mặc định','Default'))+' · '+tr('Xu Đồng Đội: ','Co-op Coins: ')+(save.coopCoins||0);
    for(const variant of ['default','copper']){
     const row=document.createElement('div');row.className='pkmsvv-build-item';
     const label=document.createElement('span');label.textContent=variant==='default'?tr('Mặc định','Default'):tr('Đồng đỏ — mẫu thử','Copper — prototype');
     const state=document.createElement('small');state.textContent=variant===selected?tr('Đang xem','Previewed'):tr('Chỉ xem thử · 0 xu','Preview only · 0 coins');
     const b=document.createElement('button');b.type='button';b.className='pkmsvv-pc-close';b.dataset.buildPreview=variant;
     b.disabled=variant===selected;b.textContent=tr('Xem thử','Preview');
     b.onclick=()=>{stage.dataset['skin'+station]=variant;renderFurnitureLayers(stage);inspect(slot);};
     row.append(label,state,b);items.append(row);
    }
    const reset=document.createElement('button');reset.type='button';reset.className='pkmsvv-pc-close';reset.dataset.buildPreviewReset='1';
    reset.textContent=tr('Khôi phục tất cả mặc định','Reset all defaults');
    reset.onclick=()=>{for(const id of Object.values(v3Station))delete stage.dataset['skin'+id];renderFurnitureLayers(stage);inspect(slot);};
    items.append(reset);return;
   }
   for(const id of available[slot]){
    const n=names[id],item=E?.config?.items?.find(x=>x.id===id);
    const owned=!!save?.ownedDecor?.[id]||id==='machine_old';
    const equipped=save.equippedDecorBySlot?.[slot]===id;
    const ready=item?.artReady===true&&item.sceneSwapReady===true&&!!item.spritePath;
    const row=document.createElement('div');row.className='pkmsvv-build-item';
    const label=document.createElement('span');label.textContent=tr(n[0],n[1]);
    const state=document.createElement('small');
    state.textContent=!ready?tr('Đang bóc tách khỏi tranh gốc · Chưa bán','Extracting from the original artwork · Not for sale yet'):
     equipped?tr('Đang trưng bày','Equipped'):
     owned?tr('Đã sở hữu · Có thể trang bị','Owned · Ready to equip'):
     tr('Giá '+n[2]+' Xu Đồng Đội','Price '+n[2]+' Co-op Coins');
    const btn=document.createElement('button');btn.type='button';
    btn.className='pkmsvv-pc-close';btn.dataset.buildEquip=id;
    btn.disabled=approvedLabV3Preview()||!ready||!unlocked||equipped||G.DB?.guest||typeof G.DB?.commit!=='function'||
     (!owned&&(Number(save.coopCoins)||0)<Number(item?.price));
    btn.textContent=approvedLabV3Preview()?tr('Chỉ xem thử V3','V3 preview only'):!ready?tr('Chưa có sprite','No sprite'):
     !unlocked?tr('🔒 Cần Co-op','🔒 Co-op required'):equipped?tr('Đang đặt','Equipped'):
     owned?tr('Trưng bày','Equip'):tr('Mua · '+n[2]+' xu','Buy · '+n[2]+' coins');
    btn.onclick=()=>{
     if(btn.disabled)return;
     const commit=()=>G.DB.commit(true);
     const result=owned?E.equip(G.DB.save,slot,id,commit):
      E.buy(G.DB.save,id,commit);
     if(!result.ok){G.UI?.toast?.(tr('Chưa giao dịch được, kiểm tra save và số xu.','Transaction unavailable; check your save and wallet.'),2400);return;}
     renderFurnitureLayers(stage);
     inspect(slot);
     G.UI?.refreshCoins?.();
    };
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
  footer.textContent=tr('Ảnh gốc là tranh ghép một lớp: hiện giữ nguyên để bảo toàn chất lượng. Việc tách từng món và phục dựng phần tường/sàn bị che sẽ cần kiểm định mỹ thuật riêng; không tự trừ xu cho đồ chưa hoàn chỉnh.',
    'The original room is one flattened image, preserved for visual quality. Extracted furnishings and obscured background still require art validation; unfinished items cannot charge coins.');
  if(skinQA)footer.textContent=tr('Skin thử nghiệm dùng PNG riêng, không thay đổi tính năng của máy. Chưa mở mua hoặc trang bị vĩnh viễn.','Prototype skins use separate PNGs without changing station functions. Permanent purchases and equips remain disabled.');
  box.append(footer);overlay.append(box);document.body.append(overlay);
  inspect('center');back.focus({preventScroll:true});
  G.PKMSVVPippiGuide?.openFeature?.('construction');return true;
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
  room.dataset.researchArtMode='classic';
  renderFurnitureLayers(room);
  room.setAttribute('role','group');
  room.setAttribute('aria-label',tr('Bản đồ tương tác Phòng nghiên cứu','Interactive Research Lab'));
  const invoke=(kind)=>{
   switch(kind){
    case 'support':close();G.PKMSVVSupportCatalog?.open?.({fromResearchLab:true});
     G.PKMSVVPippiGuide?.openFeature?.('support');return;
    case 'mega':close();G.PKMSVVMegaEntry?.open?.({fromResearchLab:true});
     G.PKMSVVPippiGuide?.openFeature?.('mega');return;
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
   {id:'berry',x:10,y:150,w:92,h:65,vi:'Berry',en:'Berries',
    tip:'Berry thì ăn được. Còn mẫu cây tiền sử kia? Đừng có hái nấu canh!'},
   // The Pippi sprite identifies the companion pedestal; the egg belongs to Support.
   {id:'companion',x:213,y:151,w:96,h:64,vi:'Bạn đồng hành',en:'Companions',
    tip:'Mèn ơi, chỗ này là để chăm sóc bạn đồng hành. Tui có giành cái bệ đâu nghen!'},
   {id:'fossil',x:115,y:62,w:91,h:82,vi:'Phục nguyên',en:'Restore fossils',
    tip:'Máy phục nguyên chưa tự chạy bằng niềm tin đâu nha. Hoàn thành Co-op lần đầu trước!'}
  ];
  // Four pixel-art furnishings belong INSIDE the illustrated room, each on
  // its own clickable station. The central fossil machine already exists in
  // the background artwork, so its hit area remains visually unobstructed.
  // SVG stays inline: PC/Android/Web QA need no new network image requests.
  const stationArt={
   support:`<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true">
    <ellipse cx="40" cy="72" rx="27" ry="5" fill="#0e1d29" opacity=".48"/>
    <path d="M18 25H62V63H18Z" fill="#122c39" stroke="#0b1827" stroke-width="4"/>
    <path d="M23 29H57V52H23Z" fill="#6ac1b5" stroke="#c8f0db" stroke-width="3"/>
    <rect x="28" y="34" width="10" height="12" rx="4" fill="#fff2bd"/>
    <rect x="41" y="35" width="12" height="11" rx="4" fill="#ffb3c6"/>
    <rect x="35" y="37" width="3" height="3" fill="#5b7280"/>
    <rect x="45" y="37" width="3" height="3" fill="#5b7280"/>
    <path d="M37 18H43V10H49V18H57V24H49V31H43V24H37Z" fill="#b5f394" stroke="#133a38" stroke-width="2"/>
    <path d="M26 57H54V64H26Z" fill="#b58a58" stroke="#0e1d29" stroke-width="3"/>
    <rect x="33" y="60" width="14" height="4" fill="#f8da91"/>
   </svg>`,
   mega:`<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true">
    <ellipse cx="40" cy="73" rx="25" ry="5" fill="#0e1d29" opacity=".45"/>
    <path d="M20 61H60V70H20Z" fill="#805b45" stroke="#172731" stroke-width="4"/>
    <path d="M28 53H52V61H28Z" fill="#caa46c" stroke="#172731" stroke-width="3"/>
    <path d="M40 9L58 27L53 48L40 58L27 48L22 27Z" fill="#cc7eed" stroke="#251b47" stroke-width="4"/>
    <path d="M40 13L40 54L27 45L26 28Z" fill="#b1a4f5"/>
    <path d="M43 15L54 28L49 45L43 53Z" fill="#7137b2"/>
    <path d="M40 19L49 29L42 37L32 30Z" fill="#f5c9ff"/>
    <path d="M14 25H21V20H25V25H32V29H25V35H21V29H14Z" fill="#f9e39a"/>
    <path d="M59 15H64V20H70V24H64V30H59V24H54V20H59Z" fill="#f9e39a"/>
   </svg>`,
   berry:`<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true">
    <ellipse cx="40" cy="74" rx="27" ry="5" fill="#101d29" opacity=".4"/>
    <path d="M26 56H54L49 70H31Z" fill="#b5764f" stroke="#2b2b32" stroke-width="4"/>
    <rect x="35" y="39" width="9" height="19" fill="#587e4e"/>
    <path d="M40 39C17 37 13 25 21 18C33 17 41 25 40 39Z" fill="#80bd63" stroke="#214f43" stroke-width="3"/>
    <path d="M42 34C44 16 58 12 65 18C66 29 54 35 42 34Z" fill="#94d36b" stroke="#214f43" stroke-width="3"/>
    <path d="M33 45C17 44 12 52 15 59C24 63 34 55 33 45Z" fill="#68a55b" stroke="#214f43" stroke-width="3"/>
    <path d="M44 46C57 41 66 44 67 54C60 61 50 57 44 46Z" fill="#68a55b" stroke="#214f43" stroke-width="3"/>
    <rect x="27" y="36" width="15" height="15" rx="5" fill="#d75592" stroke="#512c5a" stroke-width="3"/>
    <rect x="44" y="37" width="15" height="15" rx="5" fill="#8063cc" stroke="#423069" stroke-width="3"/>
    <rect x="34" y="49" width="15" height="13" rx="5" fill="#ef7d4f" stroke="#683d45" stroke-width="3"/>
    <rect x="30" y="39" width="4" height="4" fill="#ffe7c4"/>
    <rect x="48" y="40" width="4" height="4" fill="#ddd2ff"/>
    <rect x="38" y="51" width="4" height="4" fill="#fff0b6"/>
   </svg>`,
   companion:`<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true">
    <ellipse cx="40" cy="74" rx="29" ry="5" fill="#111f2d" opacity=".4"/>
    <path d="M15 57L23 68H57L65 57L55 50H25Z" fill="#ae8858" stroke="#28323a" stroke-width="4"/>
    <path d="M25 54C25 32 29 15 40 13C54 13 59 32 57 54C53 63 30 65 25 54Z" fill="#fff0d4" stroke="#493e62" stroke-width="4"/>
    <path d="M30 31L37 28L42 36L36 42L29 39Z" fill="#d989b8"/>
    <path d="M45 23L52 27L54 35L46 36L42 29Z" fill="#d989b8"/>
    <path d="M34 49L42 44L49 51L45 56H37Z" fill="#f5c6dc"/>
    <path d="M24 58H55" stroke="#ffd995" stroke-width="4"/>
    <path d="M61 12L64 18L70 20L64 24L61 30L58 24L52 20L58 18Z" fill="#ffe9a1" stroke="#ad7957" stroke-width="2"/>
   </svg>`
  };
  const speech=document.createElement('p');speech.className='pkmsvv-research-pippi-line';
  speech.setAttribute('aria-live','polite');
  const hotspotButtons=[];
  for(const z of zones){
   const b=document.createElement('button');b.type='button';
   b.className='pkmsvv-research-hotspot';b.dataset.researchHotspot=z.id;
   b.style.left=z.x/320*100+'%';b.style.top=z.y/224*100+'%';
   b.style.width=z.w/320*100+'%';b.style.height=z.h/224*100+'%';
   b.setAttribute('aria-label',tr('Mở '+z.vi,'Open '+z.en));
   // The artwork is scenery, not an icon attached to a UI chip.
   // The whole furnishing (including its small caption) remains tappable.
   if(!modularLabPreview()&&stationArt[z.id]){
    const prop=document.createElement('span');prop.className='pkmsvv-research-scene-object';
    prop.dataset.researchObject=z.id;prop.setAttribute('aria-hidden','true');
    prop.innerHTML=stationArt[z.id];
    // The original pixel-art sprite sheet is sharper than the temporary
    // SVG doodles; this element is visually used in the modular room.
    const pixel=document.createElement('span');pixel.className='pkmsvv-research-pixel-art';
    pixel.dataset.researchPixel=z.id;prop.append(pixel);b.append(prop);
   }
   const tag=document.createElement('span');tag.className='pkmsvv-research-hotspot-tag';
   const label=document.createElement('span');label.className='pkmsvv-research-tag-copy';
   label.textContent=tr(z.vi,z.en);tag.append(label);b.append(tag);
   b.title=tr('Nhấn vào '+z.vi,'Open '+z.en);
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
  const store=document.createElement('button');store.type='button';store.className='pkmsvv-pc-close';
  store.dataset.researchStore='1';store.textContent=tr('🛒 Kho Hậu Cần','🛒 Supply Depot');
  store.onclick=coopShop;
  // No crude empty-room toggle: preserve the approved original artwork.
  // Unfinished layout geometry remains an internal asset, not a user-facing room.
  toolbar.append(store,build,knowledge);
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
   tr('Chào mừng tới Phòng nghiên cứu! Tui phụ trách hướng dẫn, bạn phụ trách bấm nút. Ai làm hư máy tự sửa nha!','Welcome to my lab! I am the director, and you are the unpaid assistant. Perfect!'),
   tr('Máy giữa phòng phục nguyên hóa thạch. Nếu nó đang khóa thì qua Co-op làm nhiệm vụ, bấm mãi cũng không mở đâu.','See the central machine? Fossils only. Last time someone tried to cook in it…')
  ];
  lines.push(
   tr('Hỗ trợ, Mega, Berry, Bạn đồng hành và Phục nguyên nằm ở từng máy. Chạm máy nào là mở đúng mục đó.','Supports, Mega, Berries, Companions and Fossils: tap each station directly.'),
   tr('Muốn xem hoặc đổi nội thất thì bấm Xây dựng. Món nào chưa mở sẽ có ghi rõ nha.','To replace furniture, use Build. Clicking the wrong thing incurs consultation fees!'),
   tr('PokéBox và Pokédex vẫn ở nút Pokémon ngoài menu. Lỡ đi lạc thì quay ra đó nhé.','PokéBox and Pokédex stay in the separate Pokémon menu. My lab is not a warehouse!'),
   tr('Thấy cái bệ danh dự kia không? Để dành tượng vàng Pippi. Đề nghị không ai tranh chỗ!','See that trophy pedestal? Reserved for golden Pippi. No competitors!')
  );
  let speechIndex=0;speech.textContent=lines[0];
  const actions=document.createElement('div');actions.className='pkmsvv-research-pippi-actions';
  const talk=document.createElement('button');talk.type='button';talk.className='pkmsvv-pc-close';
  talk.dataset.researchPippiTalk='1';talk.textContent=tr('Pippi cà khịa','Pippi roasts');
  talk.onclick=()=>{speechIndex=(speechIndex+1)%lines.length;speech.textContent=lines[speechIndex];};
  const tour=document.createElement('button');tour.type='button';tour.className='pkmsvv-pc-close';
  tour.dataset.researchPippiTour='1';tour.textContent=tr('Pippi dẫn tour','Guided tour');
  tour.onclick=()=>{if(!G.PKMSVVPippiGuide?.open?.('laboratory',{replay:true}))
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
  knowledge.onclick=()=>{help.hidden=!help.hidden;knowledge.setAttribute('aria-expanded',String(!help.hidden));
   if(!help.hidden)G.PKMSVVPippiGuide?.openFeature?.('knowledge');};
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
  // Keep the native knowledge cleanup when old PC handlers are bypassed by
  // the capture-phase Research Lab launcher; never erase the Lab lock hint.
  G.PKMSVVMenuCleanQA?.mountPC?.();
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
  // Avoid browser scrollIntoView repositioning the entire PC/Android panel.
  x.focus({preventScroll:true});
  // Run the introduction AT ROOM ENTRY, never after leaving the room.
  // Guide.queue opens immediately if no other dialogue is active, or stores
  // the Lab tour behind the current starter dialogue without overlaying it.
  if(G.DB?.save&&!G.DB.save.pkmsvvPippiGuide?.laboratory)
   G.PKMSVVPippiGuide?.queue?.('laboratory');
  // Only a connected controller may auto-select a focusable menu item.
  if(G.Pad?.name&&!G.PKMSVVPippiGuide?.isOpen)G.Pad?.focusFirst?.();return true;
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
 return {open,close,berryGuide,pippiCorner,fossilRestoration,construction,coopShop,installMenu};
})();
