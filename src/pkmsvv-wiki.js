/* Unified in-game Wiki, independent of permanent Upgrade menus. */
G.PKMSVVWiki=(()=>{
 'use strict';
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const $=id=>document.getElementById(id);
 function close(){const el=$('pkmsvv-wiki-overlay');el?.remove?.();}
 function installMenu(){
  const list=document.querySelector('#scr-menu .menu-right .menu-list');
  if(!list||$('pkmsvv-menu-wiki'))return;
  const b=document.createElement('button');b.type='button';b.id='pkmsvv-menu-wiki';
  b.className='menu-item pkmsvv-menu-wiki';b.dataset.pkmsvvWiki='1';
  b.innerHTML='<span class="mi-ico">📖</span><span class="pkmsvv-menu-copy"><span class="pkmsvv-menu-label">Wiki</span><small>Hướng dẫn · Berry · Mega</small></span>';
  const upgrade=list.querySelector('[data-go="upgrades"]');
  if(upgrade)upgrade.insertAdjacentElement('afterend',b);else list.append(b);
  b.onclick=e=>{e.preventDefault();e.stopPropagation();open();};
 }
 function action(parent,label,fn){
  const b=document.createElement('button');b.type='button';b.textContent=label;b.className='pkmsvv-wiki-action';
  b.onclick=fn;parent.append(b);return b;
 }
 function section(root,name,text){
  const d=document.createElement('details');d.className='pkmsvv-wiki-section';
  const s=document.createElement('summary');s.textContent=name;
  const c=document.createElement('div');c.className='pkmsvv-wiki-content';
  if(text){const p=document.createElement('p');p.textContent=text;c.append(p);}
  d.append(s,c);root.append(d);return c;
 }
 function open(){
  close();
  const overlay=document.createElement('div');overlay.id='pkmsvv-wiki-overlay';overlay.className='pkmsvv-wiki-overlay';
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Wiki');
  const box=document.createElement('section');box.className='pkmsvv-wiki-panel';
  const head=document.createElement('header');const title=document.createElement('h2');title.textContent='📖 WIKI · POKÉMON CHUYỂN SINH';
  head.append(title);action(head,'✕ Đóng',close);box.append(head);
  const orb=section(box,tr('Mystery Orb','Mystery Orb'),
   tr('Nhặt ngay từ đầu trận, tối đa 10 Orb, xài theo thứ tự nhặt. Phím Orb có thể đổi trong Cài đặt.',
      'Collect from the start. Up to 10 Orbs; use in pickup order via your mapped Orb key.'));
  for(const o of G.Orbs?.LIST||[]){
   const p=document.createElement('p');p.textContent=(o.name?.[G.I18n?.lang==='en'?1:0]||'Orb')+' — '+(o.desc?.[G.I18n?.lang==='en'?1:0]||'');
   orb.append(p);
  }
  const skill=section(box,tr('Thức tỉnh & Quên kỹ năng','Skills & Forgetting'),
   tr('Mở đủ ô kỹ năng theo tiến trình. Mua Quên Kỹ Năng riêng cho từng Pokémon trong Nâng lẻ. Khi đủ ô trong trận, bạn có một lần chọn quên 1 trong 2 chiêu ngẫu nhiên.',
      'Unlock skill slots by progressing; buy Forget Skill for each Pokémon separately.'));
  const guide=G.PKMSVVSkillTrack?.guide?.(G.DB?.save,G.I18n?.lang==='en'?'en':'vi');
  for(const line of guide?.lines||[]){const p=document.createElement('p');p.textContent=line;skill.append(p);}
  const support=section(box,tr('Pokémon hỗ trợ','Support Pokémon'),
   tr('Mỗi người chơi có tối đa 2 Pokémon hỗ trợ. Xem danh sách và chi tiết tại đây.','Maximum two supports per trainer.'));
  action(support,'✦ Pokémon hỗ trợ',()=>{close();G.PKMSVVSupportCatalog?.open?.();});
  const mega=section(box,tr('Tiến hóa Mega','Mega Evolution'),
   tr('Mega chỉ khả dụng khi đúng Pokémon, đủ điều kiện, có sprite chiến đấu và hoàn tất các yêu cầu mở khóa.','Mega requires a valid form, combat art and its unlocks.'));
  action(mega,'✧ Danh sách Mega',()=>{close();G.PKMSVVMegaEntry?.open?.();});
  const berry=section(box,'Berry',
   tr('Mang tối đa 2 Berry mỗi trận, chọn trong 4 giây trước khi bắt đầu. Berry hiếm chỉ nhận qua Giải Cứu Berry.','Select up to two Berries during the four-second countdown.'));
  for(const t of G.PKMSVVBerry?.TYPES||[]){
   const p=document.createElement('p');p.textContent=t.name+' Berry — '+t.desc[G.I18n?.lang==='en'?1:0];
   berry.append(p);
  }
  action(berry,'🍓 Xem Berry trong shop',()=>{close();G.KecleonUI?.open?.('berry');});
  action(berry,'🌿 Vào Giải Cứu Berry',()=>{close();G.PKMSVVBerry?.rescue?.();});
  overlay.append(box);document.body.append(overlay);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
  return true;
 }
 function install(){
  installMenu();
  const old=G.MenuUI?.open;
  if(typeof old==='function'&&!G.MenuUI.__pkmsvvWiki){
   G.MenuUI.__pkmsvvWiki=true;
   G.MenuUI.open=function(...args){const result=old.apply(this,args);installMenu();return result;};
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('pkmsvv-wiki-overlay')){close();e.stopPropagation();}});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 return {open,close,installMenu};
})();
