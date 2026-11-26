'use strict';
/* Special Power Stage 3. QA only. One selection per owned species.
 * Required Notice: Copyright 2026 JPTER78 (https://github.com/JPTER78/pokesurvivor)
 * Noncommercial license: https://polyformproject.org/licenses/noncommercial/1.0.0
 * Dynamax and Z-Power mechanics ported from PokéSurvivor3DS by juanluismm521,
 * 188afd16929e9c67dc0aa45d42a8e328d1888657 src/core/power.cpp.
 * SVV retains proportional HP, unchanged collision radius, Chapter 7 loadout
 * and shared charge; use native Web enemy/prop APIs, not 3DS GPU code.
 * G-Max sprites, Tera and multiplayer power packets are not implemented.
 */
G.PKMSVVSpecialPowerQA=(()=>{
 const catalog=Object.freeze([
  Object.freeze({id:'mega',name:'Mega Evolution',device:'Mega Stone',duration:30,plannedDuration:40,cooldown:200,ready:true,summary:'Hệ Mega hiện tại · giữ nguyên đá và mở khóa'}),
  Object.freeze({id:'dynamax',name:'Dynamax',device:'Dynamax Band',duration:12,cooldown:80,ready:true,summary:'QA Solo · HP x2, công +40%, giẫm quái và sát thương lan'}),
  Object.freeze({id:'zmove',name:'Z-Power',device:'Z-Ring',duration:15,cooldown:60,ready:true,summary:'QA Solo · sóng mở đầu, chữ Z xuyên quái, tuyệt chiêu kết thúc'}),
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
  return ['dynamax','zmove'].includes(v)?v:'mega';
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
   r={id:save()?.pkmsvvChapter7Seen===true?selected(save(),Number(p.dex)):'mega',remaining:0,cooldown:0,bonusHp:0,atkApplied:false,aura:0,visual:null,crushClock:0,crushed:new WeakMap(),splashing:false,zClock:0,zShots:0};
   runs.set(p,r);
  }
  return r||null;
 }
 function allowsMega(p){const r=state(p);return !r||r.id==='mega';}
 function canActivate(p=player()){
  const r=state(p);
  return !!(r&&['dynamax','zmove'].includes(r.id)&&!p.dead&&G.Game?.state==='playing'&&!p._megaActive&&!p._pkmsvvSpecialPowerActive&&
   r.remaining<=0&&r.cooldown<=0&&Number(G.PKMSVVMegaPhase3?.energy?.(p))>=100&&
   Number.isFinite(p.maxHp)&&p.maxHp>0&&Number.isFinite(p.hp)&&p.hp>0&&Number.isFinite(p.atkMul)&&p.atkMul>0);
 }
 function activate(p=player()){
  if(!canActivate(p))return false;
  const r=state(p),fraction=Math.max(0,Math.min(1,p.hp/p.maxHp));
  if(r.id==='zmove'){
   const type=primaryType(p);
   r.remaining=15;r.zClock=.3;r.zShots=0;r.zType=type;
   p._pkmsvvSpecialPowerActive='zmove';p._megaEnergy=0;
   zWave(p,220,1,type);
   G.UI?.toast?.('Z-POWER · '+Z_NAMES[type]+'!');
   return true;
  }
  r.bonusHp=p.maxHp;
  p.maxHp+=r.bonusHp;p.hp=p.maxHp*fraction;
  p.atkMul*=1.4;r.atkApplied=true;
  // Original 3DS power_start: grow visual sprite x1.8, not the collider.
  if(p.anim&&Number.isFinite(p.anim.scale)&&p.anim.scale>0){
   r.visual={anim:p.anim,scale:p.anim.scale,bodyH:p.bodyH};
   p.anim.scale*=1.8;
   if(G.Sprites?.bodyHeight)p.bodyH=G.Sprites.bodyHeight(p.anim.dex??p.dex,p.anim.scale);
  }
  r.remaining=12;r.aura=0;r.crushClock=0;r.crushed=new WeakMap();p._pkmsvvSpecialPowerActive='dynamax';p._megaEnergy=0;
  G.FX?.ring?.(p.x,p.y,15,110,'#e883f8',.8,7);
  G.UI?.toast?.(tr('DYNAMAX · 12 giây · HP x2, công +40%','DYNAMAX · 12s · double HP, +40% attack'));
  return true;
 }
 function stop(p=player(),completed=false){
  const r=p&&runs.get(p);
  if(!r)return false;
  if(p._pkmsvvSpecialPowerActive==='zmove'){
   r.remaining=0;r.cooldown=60;
   delete p._pkmsvvSpecialPowerActive;
   // On natural expiry only. Death, quit, evolution and scene changes must
   // never trigger the finishing strike or leave projectiles in the next map.
   if(completed&&!p.dead&&soloExplore(p)&&G.Game?.state==='playing'){
    zWave(p,420,3.2,r.zType);
    G.UI?.toast?.(Z_NAMES[r.zType]+'!');
   }else{
    for(const shot of [...(G.Projectiles?.all?.()||[])])
     if(shot.pkmsvvZRoll&&shot.owner===p)G.Projectiles.remove?.(shot);
   }
   return true;
  }
  if(!r.atkApplied)return false;
  const fraction=Math.max(0,Math.min(1,p.hp/Math.max(1,p.maxHp)));
  // Remove only the owned bonus, not unrelated permanent or passive changes.
  p.maxHp=Math.max(1,p.maxHp-r.bonusHp);p.hp=p.dead?0:p.maxHp*fraction;
  p.atkMul/=1.4;r.atkApplied=false;r.bonusHp=0;r.remaining=0;r.cooldown=80;
  if(r.visual&&p.anim===r.visual.anim){p.anim.scale=r.visual.scale;p.bodyH=r.visual.bodyH;}
  r.visual=null;delete p._pkmsvvSpecialPowerActive;return true;
 }
 // Port of power_dmg, power_update (Dyna), power_after_hit from upstream.
 const COL='#ff3a5a';
 const validEnemy=e=>!!(e&&!e.dead&&!e.remote&&!e.friendly&&!e.pkmsvvFriendly&&!e.isSupport&&!e.arceus&&!e.judge&&typeof e.hurt==='function');
 const nearby=(x,y,r)=>Array.from(G.EnemyMgr?.queryCircle?.(x,y,r)||[]);
 const powerDmg=(p,k)=>60*(Number(p.atk)||0)*k*(1+(Number(p.level)||0)*.04);
 function deal(p,e,dmg,dx,dy,knock){
  if(!validEnemy(e)||!Number.isFinite(dmg)||dmg<=0)return false;
  e.hurt(dmg,COL,dx,dy,knock,null);
  if(Number.isFinite(p.dmgDealt))p.dmgDealt+=dmg;
  return true;
 }
 // Upstream kZMoveName: English official generic move names by type.
 const Z_NAMES=Object.freeze({normal:'Breakneck Blitz',fire:'Inferno Overdrive',water:'Hydro Vortex',grass:'Bloom Doom',electric:'Gigavolt Havoc',ice:'Subzero Slammer',fighting:'All-Out Pummeling',poison:'Acid Downpour',ground:'Tectonic Rage',flying:'Supersonic Skystrike',psychic:'Shattered Psyche',bug:'Savage Spin-Out',rock:'Continental Crush',ghost:'Never-Ending Nightmare',dragon:'Devastating Drake',dark:'Black Hole Eclipse',steel:'Corkscrew Crash',fairy:'Twinkle Tackle'});
 const primaryType=p=>Object.hasOwn(Z_NAMES,p.mon?.types?.[0])?p.mon.types[0]:'normal';
 const Z_COL='#ffd23f';
 function zWave(p,radius,k,type){
  G.FX?.ring?.(p.x,p.y,8,radius,Z_COL,.5,6);
  G.FX?.burst?.(p.x,p.y-(p.bodyH||0)*.5,Z_COL,30,260);
  G.Camera?.kick?.(.8);
  for(const e of nearby(p.x,p.y,radius)){
   if(!validEnemy(e))continue;
   const mult=G.Types?.mult?.(type,e.types)||0;
   const dmg=powerDmg(p,k)*(G.Types?.mult?mult:1);
   if(!Number.isFinite(dmg)||dmg<=0)continue;
   e.hurt(dmg,Z_COL,e.x-p.x,e.y-p.y,200,G.Types?.label?.(mult));
   if(Number.isFinite(p.dmgDealt))p.dmgDealt+=dmg;
  }
 }
 function zRoll(p,r){
  const targets=nearby(p.x,p.y,520).filter(validEnemy).sort((a,b)=>(a.x-p.x)**2+(a.y-p.y)**2-((b.x-p.x)**2+(b.y-p.y)**2));
  const t=targets[0],a=t?Math.atan2(t.y-p.y,t.x-p.x):Number(p.aim)||0,type=r.zType;
  const shot=G.Projectiles?.spawn?.({x:p.x,y:p.y,vx:Math.cos(a)*260,vy:Math.sin(a)*260,dmg:powerDmg(p,.6),r:18,life:2.4,pierce:999,color:G.U?.TYPE_COLOR?.[type]||Z_COL,mtype:type,mcat:null,owner:p,hits:new Set(),friendly:true,pkmsvvZRoll:true});
  if(shot)r.zShots++;
 }
 function crush(p,r){
  const radius=(p.r||18)*2.2;
  const t=r.crushClock;
  for(const e of nearby(p.x,p.y,radius)){
   if(!validEnemy(e)||e.boss||e.legend||e.legendary||e.eterna||e.ecore||e.pkmsvvFossilRotomBoss)continue;
   if(t-(r.crushed.get(e)??-Infinity)<.5)continue;
   r.crushed.set(e,t);
   deal(p,e,powerDmg(p,.8),e.x-p.x,e.y-p.y,300);
  }
  for(const prop of Array.from(G.World?.propsInCircle?.(p.x,p.y,radius)||[]).slice(0,32)){
   if(prop?.destructible&&!prop.gone&&prop.hp>0&&!prop.pkmsvvMission&&!prop.special)
    G.World.damageProp?.(prop,9999,COL);
  }
 }
 function afterHit(p,e,dmg){
  const r=state(p);
  if(!r?.atkApplied||r.splashing||!soloExplore(p)||p.dead||G.Game?.state!=='playing'||!e||!Number.isFinite(dmg)||dmg<=0)return 0;
  // Upstream snapshots the first six entries, including original target.
  // Native hit / projectile hook already excludes ghost attacks.
  r.splashing=true;let n=0;
  try{
   for(const other of nearby(e.x,e.y,70).slice(0,6)){
    if(other!==e&&deal(p,other,dmg*.4,other.x-e.x,other.y-e.y,0))n++;
   }
  }finally{r.splashing=false;}
  return n;
 }
 function tick(p,dt){
  const r=p&&runs.get(p)||state(p);
  if(!r)return;
  if(p.dead||!soloExplore(p)||['ui','over'].includes(G.Game?.state)){stop(p);return;}
  if(G.Game?.state!=='playing')return;
  const d=Number.isFinite(dt)?Math.max(0,dt):0;
  if(p._pkmsvvSpecialPowerActive==='zmove'){
   const live=Math.min(r.remaining,d);
   r.remaining=Math.max(0,r.remaining-d);
   r.zClock-=live;
   // Original first delay .3s, then 1.2s. Bound catch-up to prevent bursts
   // after tab suspension. Game pause never advances the clock.
   if(r.zClock<=0&&r.remaining>0){zRoll(p,r);r.zClock=1.2;}
   if(r.remaining<=0)stop(p,true);
  }else if(r.atkApplied){
   r.remaining=Math.max(0,r.remaining-d);r.aura+=d;r.crushClock+=d;
   if(r.remaining>0)crush(p,r);
   if(r.aura>=.5){r.aura=0;G.FX?.ring?.(p.x,p.y,8,Math.max(38,(p.r||18)*3),'#f191ef',.4,4);}
   if(r.remaining<=0)stop(p);
  }else r.cooldown=Math.max(0,r.cooldown-d);
 }
 let button=null;
 function sync(){
  if(!button)return;
  const p=player(),r=state(p);
  const show=!!(r&&['dynamax','zmove'].includes(r.id)&&p&&!p.dead&&G.Game?.state==='playing');
  button.style.display=show?'flex':'none';if(!show)return;
  const charge=Math.floor(G.PKMSVVMegaPhase3?.energy?.(p)||0);
  button.disabled=!canActivate(p);
  button.querySelector('span').textContent=r.remaining>0?Math.ceil(r.remaining)+'s':r.cooldown>0?Math.ceil(r.cooldown)+'s':charge<100?charge+'%':r.id==='zmove'?'Z-POWER':'DMAX';
  button.title=byId(r.id).name+' · '+tr('Nút sức mạnh (5 / L1)','Power input (5 / L1)');
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
  const hint=document.createElement('p');hint.textContent=(G.DEX_BY?.[dex]?.name||('Pokémon #'+dex))+' · '+tr('Mỗi Pokémon chọn một sức mạnh trước trận. Dynamax và Z-Power hiện chỉ thử nghiệm Khám phá Solo, cần Chương 7.','One power per Pokémon before a run. Dynamax and Z-Power are Chapter 7 Solo Explore trials.');panel.append(hint);
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
   if(r&&['dynamax','zmove'].includes(r.id)&&(G.Input?.tap?.('digit5')||G.Input?.tap?.('numpad5')||G.Input?.tap?.('pkmsvv-mega')))activate(this);
  }
  return oldUpdate.call(this,dt);
 };
 for(const name of ['startRun','toUI','quit']){
  const prev=G.Game?.[name];if(typeof prev!=='function')continue;
  G.Game[name]=function(...args){stop(player());return prev.apply(this,args);};
 }
 if(typeof document!=='undefined'){mount();setInterval(sync,250);}
 return {catalog,selected,equip,state,allowsMega,canActivate,activate,tick,stop,afterHit,open,close,Z_NAMES};
})();
