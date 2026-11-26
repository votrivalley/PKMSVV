'use strict';
/* Special Power Stage 1. QA only. One selection per owned species.
 * Legacy Mega ownership, gacha, Pippi and Co-op remain untouched.
 * Dynamax trial: native HP and attack factors, no invented G-Max sprite,
 * collision/prop destruction, or unverified new net packets.
 */
G.PKMSVVSpecialPowerQA=(()=>{
 const catalog=Object.freeze([
  Object.freeze({id:'mega',name:'Mega Evolution',device:'Mega Stone',duration:30,plannedDuration:40,cooldown:200,ready:true,summary:'Hệ Mega hiện tại · giữ nguyên đá và mở khóa'}),
  Object.freeze({id:'dynamax',name:'Dynamax',device:'Dynamax Band',duration:12,cooldown:80,ready:true,summary:'QA Solo · HP x2, sát thương +40%'}),
  Object.freeze({id:'zmove',name:'Z-Power',device:'Z-Ring',duration:15,cooldown:60,ready:false,summary:'Đang phát triển · tuyệt chiêu kết thúc'}),
  Object.freeze({id:'terastal',name:'Terastal',device:'Tera Orb',duration:30,cooldown:75,ready:false,summary:'Đang phát triển · chuyển hệ và tăng STAB'})
 ]);
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const byId=id=>catalog.find(x=>x.id===id);
 const save=()=>G.DB?.save;
 const player=()=>G.Game?.player;
 const dexOK=d=>Number.isInteger(d)&&d>=1&&d<=1025;
 const runs=new WeakMap();
 function selected(s,dex){
  const v=s?.pkmsvvPowerLoadout?.[String(dex)];
  return v==='dynamax'?'dynamax':'mega';
 }
 function owns(s,dex){return !!(s&&dexOK(dex)&&(Number(s.partner)===dex||s.owned?.[dex]||s.shiny?.[dex]));}
 let saving=false;
 async function equip(id,dex=Number(save()?.partner)){
  const s=save(),def=byId(id);
  if(saving||G.Game?.state!=='ui'||!def?.ready||!owns(s,dex)||G.DB?.guest||s.pkmsvvChapter7Seen!==true)return false;
  const old=s.pkmsvvPowerLoadout;
  const next={...(old&&typeof old==='object'&&!Array.isArray(old)?old:{}),[dex]:id};
  saving=true;s.pkmsvvPowerLoadout=next;
  try{
   if(typeof G.DB?.commit!=='function'||await G.DB.commit(true)===false)throw Error('save');
   return true;
  }catch(_){
   if(s.pkmsvvPowerLoadout===next){if(old===undefined)delete s.pkmsvvPowerLoadout;else s.pkmsvvPowerLoadout=old;}
   return false;
  }finally{saving=false;}
 }
 function soloExplore(p){
  return !!(p&&p===player()&&G.PKMSVVQuickRegion?.active===true&&!G.Coop?.active&&
   !G.PKMSVVArenaSolo?.active&&!G.PKMSVVChampionArena?.active&&!G.PKMSVVArenaPvp?.active);
 }
 function state(p){
  if(!p||!soloExplore(p))return null;
  let r=runs.get(p);
  if(!r&&G.Game?.state==='playing'){
   r={id:save()?.pkmsvvChapter7Seen===true?selected(save(),Number(p.dex)):'mega',remaining:0,cooldown:0,bonusHp:0,atkApplied:false,aura:0};
   runs.set(p,r);
  }
  return r||null;
 }
 function allowsMega(p){return state(p)?.id!=='dynamax';}
 function canActivate(p=player()){
  const r=state(p);
  return !!(r&&r.id==='dynamax'&&!p.dead&&G.Game?.state==='playing'&&!p._megaActive&&!p._pkmsvvSpecialPowerActive&&
   r.remaining<=0&&r.cooldown<=0&&Number(G.PKMSVVMegaPhase3?.energy?.(p))>=100&&
   Number.isFinite(p.maxHp)&&p.maxHp>0&&Number.isFinite(p.hp)&&p.hp>0&&Number.isFinite(p.atkMul)&&p.atkMul>0);
 }
 function activate(p=player()){
  if(!canActivate(p))return false;
  const r=state(p),fraction=Math.max(0,Math.min(1,p.hp/p.maxHp));
  r.bonusHp=p.maxHp;
  p.maxHp+=r.bonusHp;p.hp=p.maxHp*fraction;
  p.atkMul*=1.4;r.atkApplied=true;
  r.remaining=12;r.aura=0;p._pkmsvvSpecialPowerActive='dynamax';p._megaEnergy=0;
  G.FX?.ring?.(p.x,p.y,15,110,'#e883f8',.8,7);
  G.UI?.toast?.(tr('DYNAMAX · 12 giây · HP x2, công +40%','DYNAMAX · 12s · double HP, +40% attack'));
  return true;
 }
 function stop(p=player()){
  const r=p&&runs.get(p);
  if(!r||!r.atkApplied)return false;
  const fraction=Math.max(0,Math.min(1,p.hp/Math.max(1,p.maxHp)));
  // Remove only the owned bonus, not unrelated permanent or passive changes.
  p.maxHp=Math.max(1,p.maxHp-r.bonusHp);p.hp=p.dead?0:p.maxHp*fraction;
  p.atkMul/=1.4;r.atkApplied=false;r.bonusHp=0;r.remaining=0;r.cooldown=80;
  delete p._pkmsvvSpecialPowerActive;return true;
 }
 function tick(p,dt){
  const r=p&&runs.get(p)||state(p);
  if(!r)return;
  if(p.dead||!soloExplore(p)||['ui','over'].includes(G.Game?.state)){stop(p);return;}
  if(G.Game?.state!=='playing')return;
  const d=Number.isFinite(dt)?Math.max(0,dt):0;
  if(r.atkApplied){
   r.remaining=Math.max(0,r.remaining-d);r.aura+=d;
   if(r.aura>=.5){r.aura=0;G.FX?.ring?.(p.x,p.y,8,Math.max(38,(p.r||18)*3),'#f191ef',.4,4);}
   if(r.remaining<=0)stop(p);
  }else r.cooldown=Math.max(0,r.cooldown-d);
 }
 let button=null;
 function sync(){
  if(!button)return;
  const p=player(),r=state(p);
  const show=!!(r?.id==='dynamax'&&p&&!p.dead&&G.Game?.state==='playing');
  button.style.display=show?'flex':'none';if(!show)return;
  const charge=Math.floor(G.PKMSVVMegaPhase3?.energy?.(p)||0);
  button.disabled=!canActivate(p);
  button.querySelector('span').textContent=r.remaining>0?Math.ceil(r.remaining)+'s':r.cooldown>0?Math.ceil(r.cooldown)+'s':charge<100?charge+'%':'DMAX';
  button.title=tr('Dynamax thử nghiệm · dùng nút Mega (5 / L1)','Dynamax trial · same Mega input (5 / L1)');
 }
 function mount(){
  if(button||!document.body)return;
  button=document.createElement('button');button.id='pkmsvv-special-power-button';button.type='button';button.className='pkmsvv-mega-btn';
  button.style.display='none';button.style.zIndex='12020';
  button.innerHTML='<span class="pkmsvv-mega-btn__label">DMAX</span>';
  button.onclick=e=>{e.preventDefault();e.stopPropagation();activate();sync();};document.body.append(button);
 }
 function close(){document.getElementById('pkmsvv-special-power-overlay')?.remove();}
 function open(){
  close();const s=save(),dex=Number(s?.partner),current=selected(s,dex);
  const overlay=document.createElement('div');overlay.id='pkmsvv-special-power-overlay';overlay.className='pkmsvv-pc-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
  const panel=document.createElement('section');panel.className='pkmsvv-pc-panel';panel.style.maxWidth='760px';
  const header=document.createElement('header');header.className='pkmsvv-pc-header';
  const title=document.createElement('h2');title.textContent=tr('SỨC MẠNH ĐẶC BIỆT','SPECIAL POWERS');
  const back=document.createElement('button');back.type='button';back.className='pkmsvv-pc-close';back.textContent=tr('← Phòng nghiên cứu','← Research Lab');back.onclick=()=>{close();G.PKMSVVWiki?.open?.();};header.append(title,back);panel.append(header);
  const hint=document.createElement('p');hint.textContent=(G.DEX_BY?.[dex]?.name||('Pokémon #'+dex))+' · '+tr('Mỗi Pokémon chọn một sức mạnh trước trận. Dynamax hiện chỉ thử nghiệm Khám phá Solo, cần Chương 7.','One power per Pokémon before a run. Dynamax is a Chapter 7 Solo Explore trial.');panel.append(hint);
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;';
  for(const def of catalog){
   const card=document.createElement('div');card.style.cssText='border:1px solid #c4a970;border-radius:12px;padding:12px;background:#183643;display:grid;gap:7px;';
   const name=document.createElement('strong');name.textContent=def.name+' · '+def.device;
   const desc=document.createElement('span');desc.textContent=def.duration+'s / '+def.cooldown+'s · '+def.summary;
   const b=document.createElement('button');b.className='btn';b.type='button';b.dataset.powerEquip=def.id;
   b.textContent=!def.ready?tr('Đang phát triển','In development'):current===def.id?tr('Đang chọn','Selected'):tr('Chọn sức mạnh','Select power');
   b.disabled=!def.ready||current===def.id||s?.pkmsvvChapter7Seen!==true;
   b.onclick=async()=>{b.disabled=true;if(await equip(def.id,dex)){open();}else{b.disabled=false;G.UI?.toast?.(tr('Không lưu được lựa chọn.','Unable to save selection.'));}};
   card.append(name,desc,b);
   if(def.id==='mega'){const old=document.createElement('button');old.type='button';old.className='btn';old.textContent=tr('Mega Stone · Danh mục cũ','Mega Stones · Existing catalog');old.onclick=()=>{close();G.PKMSVVMegaEntry?.open?.({fromResearchLab:true});};card.append(old);}
   grid.append(card);
  }
  panel.append(grid);overlay.append(panel);document.body.append(overlay);back.focus?.({preventScroll:true});return true;
 }
 const oldUpdate=G.Player?.prototype?.update;
 if(typeof oldUpdate==='function')G.Player.prototype.update=function(dt){
  if(this===player()){
   const r=state(this);
   tick(this,dt);
   if(r?.id==='dynamax'&&(G.Input?.tap?.('digit5')||G.Input?.tap?.('numpad5')||G.Input?.tap?.('pkmsvv-mega')))activate(this);
  }
  return oldUpdate.call(this,dt);
 };
 for(const name of ['startRun','toUI','quit']){
  const prev=G.Game?.[name];if(typeof prev!=='function')continue;
  G.Game[name]=function(...args){stop(player());return prev.apply(this,args);};
 }
 if(typeof document!=='undefined'){mount();setInterval(sync,250);}
 return {catalog,selected,equip,state,allowsMega,canActivate,activate,tick,stop,open,close};
})();
