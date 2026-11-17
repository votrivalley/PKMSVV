/* PKMSVV Co-op Fossil Lab — honest, visible native selector preview.
 * A native 6–8 minute mission does NOT exist yet: no fake survival run,
 * no fake reward, no spoofed Co-op room or fossil machine unlock.
 * This module only adds the clear fifth entry to the REAL LAN/AI Co-op
 * selection at #pkmsvv-coop-modes, not to the obsolete quick-match hub.
 */
(function(){
 'use strict';
 if(typeof document==='undefined'||typeof G==='undefined')return;
 const id='pkmsvv-fossil-lab-mode';
 const tr=(vn,en)=>G.I18n?.lang==='en'?en:vn;
 const asset='images/coop-lab/decor/machine_old_modular.svg';
 let observer=null;
 function closeDetail(){document.getElementById('pkmsvv-coop-fossil-info')?.remove();}
 function detail(){
  closeDetail();
  const shade=document.createElement('div');shade.id='pkmsvv-coop-fossil-info';
  shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');
  shade.style.cssText='position:fixed;inset:0;z-index:30000;background:#061c26dc;display:grid;place-items:center;padding:16px';
  const panel=document.createElement('section');
  panel.style.cssText='width:min(580px,100%);max-height:85vh;overflow:auto;background:#17424e;border:2px solid #dcb877;border-radius:14px;padding:20px;color:#ffebbb;box-shadow:0 13px 38px #0009;line-height:1.6';
  const title=document.createElement('h2');title.textContent=tr('🦴 Khai quật hóa thạch','🦴 Fossil Expedition');title.style.margin='0 0 9px';
  const intro=document.createElement('p');
  intro.textContent=tr('Nhiệm vụ Co-op mới dự kiến kéo dài 6–8 phút: tìm mẫu hóa thạch, bảo vệ máy nghiên cứu rồi rút lui. Một người chơi cùng đồng đội do máy điều khiển vẫn sẽ nhận thưởng.',
   'Planned 6–8 minute Co-op mission: find fossils, defend the lab and extract. Solo with computer-controlled companions will also earn rewards.');
  const reward=document.createElement('p');
  reward.textContent=tr('Lần đầu hoàn thành: mở khóa máy phục nguyên vĩnh viễn và nhận Kabuto miễn phí. Những lần sau kiếm Xu Đồng Đội dùng chung trong Co-op.',
   'First completion: permanently unlock the revival machine and receive a free Kabuto. Replay to earn shared Co-op Coins.');
  const state=document.createElement('p');state.style.color='#ffd586';
  state.textContent=tr('🔒 Chưa thể bắt đầu: nhiệm vụ 6–8 phút chưa được tích hợp vào gameplay. Đây là mục giới thiệu, không phải trận chơi và không phát thưởng.',
   '🔒 Not playable yet: the 6–8 minute mission has not been integrated into gameplay. This is a preview, not a playable match, and no rewards can be earned.');
  const close=document.createElement('button');close.type='button';close.className='btn gold';
  close.textContent=tr('← Quay lại Co-op','← Return to Co-op');close.onclick=closeDetail;
  panel.append(title,intro,reward,state,close);shade.append(panel);document.body.append(shade);
  shade.addEventListener('click',e=>{if(e.target===shade)closeDetail();});
  close.focus({preventScroll:true});
 }
 function install(){
  const host=document.getElementById('pkmsvv-coop-modes');
  if(!host)return false;
  if(host.querySelector('[data-coop-mission="fossil_lab"]'))return true;
  const card=document.createElement('button');card.type='button';
  card.id=id;card.className='pkmsvv-mode-card fossil-lab';
  card.dataset.coopMission='fossil_lab';card.setAttribute('aria-pressed','false');
  card.setAttribute('aria-label',tr('Khai quật hóa thạch — Chưa mở, xem thông tin',
    'Fossil Expedition — Coming soon, view details'));
  const art=document.createElement('span');art.className='pkmsvv-mode-art';
  const img=document.createElement('img');img.src=asset;img.alt='';img.loading='lazy';
  img.style.cssText='width:92px;height:92px;object-fit:contain;display:block;margin:auto';
  art.append(img);
  const copy=document.createElement('span');copy.className='pkmsvv-mode-copy';
  const title=document.createElement('strong');title.className='pkmsvv-mode-title';
  title.textContent=tr('Khai quật hóa thạch','Fossil Expedition');
  const cap=document.createElement('small');cap.className='pkmsvv-mode-cap';
  cap.textContent=tr('1–4 người · 6–8 phút','1–4 players · 6–8 min');
  const short=document.createElement('small');short.className='pkmsvv-coop-pokemon';
  short.textContent=tr('Phòng thí nghiệm thất lạc','Lost Laboratory');
  const desc=document.createElement('small');desc.className='pkmsvv-mode-description';
  desc.textContent=tr('Tìm hóa thạch, bảo vệ máy và hoàn thành thử thách. Có thể chơi cùng đồng đội máy khi mở.',
    'Collect fossils, defend the machine and complete objectives. Computer companions supported when released.');
  const state=document.createElement('small');state.className='pkmsvv-mode-action';
  state.style.cssText='color:#8a4419;background:#ffe49c;border-radius:6px;padding:4px 7px;margin-top:7px;font-weight:800';
  state.textContent=tr('🔒 Xem trước · Chưa chơi được','🔒 Preview · Not playable');
  copy.append(title,cap,short,desc,state);card.append(art,copy);
  card.addEventListener('click',e=>{
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();detail();
  });
  // Keep the existing four native modes, their selection and lobby actions.
  // Add the preview beside Berry Rescue, within the exact same grid.
  const berry=host.querySelector('[data-mode="berry"]');
  if(berry&&berry.nextSibling)host.insertBefore(card,berry.nextSibling);
  else host.append(card);
  return true;
 }
 function boot(){
  install();
  // The native LAN modal is often rebuilt when opening Co-op. Watch that
  // exact DOM subtree being created, rather than the unrelated online hub.
  if(!observer&&document.body&&typeof MutationObserver==='function'){
   observer=new MutationObserver(()=>{if(!document.getElementById(id))install();});
   observer.observe(document.body,{childList:true,subtree:true});
  }
  // Native menu can be opened after the startup script has run.
  document.addEventListener('click',e=>{
   if(e.target?.closest?.('[data-go="multiplayer"]')){
    queueMicrotask(install);
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(install);
   }
  },true);
 }
 if(document.readyState==='loading')
  document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
 G.PKMSVVFossilMissionQA={install,detail,closeDetail,playable:false,selector:'#pkmsvv-coop-modes'};
})();