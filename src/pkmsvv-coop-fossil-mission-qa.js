/* PKMSVV 2.2 QA — visible Co-op fossil mission card.
 * Discovery ONLY: the 6–8 minute native mission does not exist yet.
 * Do not fabricate rewards, call core.settle, or route players into Explore
 * and pretend it was Co-op. Both solo AI and multiplayer missions need a
 * verified objective resolver before this card can start a match.
 */
(function(){
 'use strict';
 if(typeof G==='undefined'||typeof document==='undefined')return;
 const vi=()=>G.I18n?.lang!=='en';
 const tr=(a,b)=>vi()?a:b;
 function detail(){
  if(document.getElementById('pkmsvv-coop-fossil-info'))return;
  const shade=document.createElement('div');shade.id='pkmsvv-coop-fossil-info';
  shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');
  shade.style.cssText='position:fixed;inset:0;z-index:30000;background:#061c26dc;display:grid;place-items:center;padding:16px';
  const panel=document.createElement('section');
  panel.style.cssText='width:min(580px,100%);max-height:85vh;overflow:auto;background:#17424e;border:2px solid #dcb877;border-radius:14px;padding:20px;color:#ffebbb;box-shadow:0 13px 38px #0009;line-height:1.6';
  const title=document.createElement('h2');title.textContent=tr('🦴 Khai quật hóa thạch','🦴 Fossil Expedition');title.style.margin='0 0 9px';
  const intro=document.createElement('p');
  intro.textContent=tr('Nhiệm vụ hợp tác dự kiến kéo dài 6–8 phút: thu thập mẫu vật, bảo vệ máy phục nguyên và rút lui an toàn. Có thể đi một mình với đồng đội do máy điều khiển.',
   'Planned 6–8 minute mission: collect specimens, defend the revival machine and extract safely. Solo with computer-controlled companions will be supported.');
  const reward=document.createElement('p');
  reward.textContent=tr('Lần đầu hoàn thành: mở khóa máy vĩnh viễn, tặng Kabuto miễn phí. Các trận tiếp theo nhận Xu Đồng Đội chung với mọi chế độ Co-op.',
   'First clear: permanent machine unlock and free Kabuto. Replays: shared Co-op Coins across all Co-op missions.');
  const state=document.createElement('p');state.style.color='#ffd586';
  state.textContent=tr('🔒 Chưa thể bắt đầu: bộ điều phối nhiệm vụ và xác minh phần thưởng chưa được phát hành. Đang xây dựng, không mất xu hoặc save.',
   '🔒 Not playable: the mission controller and validated rewards are not released. Work in progress; no coins or saves are changed.');
  const close=document.createElement('button');close.type='button';close.className='btn gold';
  close.textContent=tr('← Quay lại Co-op','← Return to Co-op');close.onclick=()=>shade.remove();
  panel.append(title,intro,reward,state,close);shade.append(panel);document.body.append(shade);
  close.focus({preventScroll:true});
 }
 function install(){
  const original=document.getElementById('pkmsvv-quick-coop');
  if(!original||document.getElementById('pkmsvv-quick-fossil-lab'))return false;
  const host=original.parentElement;if(!host)return false;
  const card=original.cloneNode(true);
  card.id='pkmsvv-quick-fossil-lab';
  for(const el of card.querySelectorAll('[id]'))el.removeAttribute('id');
  const icon=card.querySelector('canvas,.pkmsvv-mode-sprite,img');
  if(icon){
   const art=document.createElement('img');
   art.src='images/coop-lab/decor/machine_old_modular.svg';
   art.alt='';art.loading='lazy';
   art.style.cssText='display:block;width:88px;height:88px;object-fit:contain;margin:auto';
   icon.replaceWith(art);
  }
  const label=card.querySelector('.pkmsvv-mode-title');
  if(label)label.textContent=tr('Khai quật hóa thạch','Fossil Expedition');
  const cap=card.querySelector('.pkmsvv-mode-cap');
  if(cap)cap.textContent=tr('1–4 người · 6–8 phút · Đang phát triển','1–4 players · 6–8 min · In development');
  const desc=card.querySelector('.pkmsvv-mode-description');
  if(desc)desc.textContent=tr('Nhiệm vụ Phòng thí nghiệm thất lạc. Solo với đồng đội máy hoặc hợp tác cùng bạn bè khi hoàn thiện.',
   'Lost Laboratory mission: solo with computer allies or co-op with friends once completed.');
  const action=card.querySelector('.pkmsvv-mode-action');
  if(action)action.textContent=tr('Xem nhiệm vụ · Chưa mở','Preview mission · Locked');
  card.dataset.coopMission='fossil_lab';card.setAttribute('aria-label',tr('Xem trước nhiệm vụ Khai quật hóa thạch, chưa mở','Preview Fossil Expedition, not yet playable'));
  card.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();detail();};
  // The existing game modes remain untouched. Place the new mission
  // beside Berry Rescue when available; do not advertise an online lobby.
  const berry=[...host.children].find(x=>/Giải Cứu Berry|Berry Rescue/i.test(
   x.querySelector?.('.pkmsvv-mode-title')?.textContent||''));
  let missionHeading=host.querySelector('.pkmsvv-coop-mission-group');
  if(!missionHeading){
   missionHeading=document.createElement('h3');
   missionHeading.className='pkmsvv-coop-mission-group';
   missionHeading.textContent=tr('Nhiệm vụ hợp tác','Co-operative missions');
   missionHeading.style.cssText='grid-column:1/-1;margin:10px 0 2px;color:#ffe2a0;font-size:17px;text-align:left';
   if(berry)host.insertBefore(missionHeading,berry);else host.append(missionHeading);
  }
  host.append(card);
  return true;
 }
 function boot(){
  install();
  const ui=G.MultiplayerUI;
  if(ui&&typeof ui.open==='function'&&!ui.open._pkmsvvFossilMission){
   const old=ui.open;
   function wrapped(...args){const out=old.apply(this,args);install();return out;}
   wrapped._pkmsvvFossilMission=true;ui.open=wrapped;
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
 G.PKMSVVFossilMissionQA={install,detail,playable:false};
})();