'use strict';
/* Special Power Stage 5. QA only. One selection per owned species.
 * Required Notice: Copyright 2026 JPTER78 (https://github.com/JPTER78/pokesurvivor)
 * Noncommercial license: https://polyformproject.org/licenses/noncommercial/1.0.0
 * Dynamax, Z-Power and Terastal mechanics ported from PokéSurvivor3DS by juanluismm521,
 * 188afd16929e9c67dc0aa45d42a8e328d1888657 src/core/power.cpp.
 * SVV retains proportional HP, unchanged collision radius, Chapter 7 loadout
 * and shared charge; use native Web enemy/prop APIs, not 3DS GPU code.
 * G-Max sprites, defensive Tera conversion and multiplayer power packets are not implemented.
 */
G.PKMSVVSpecialPowerQA=(()=>{
 const catalog=Object.freeze([
  Object.freeze({id:'mega',name:'Mega Evolution',device:'Mega Stone',duration:30,plannedDuration:40,cooldown:200,ready:true,summary:'Hệ Mega hiện tại · giữ nguyên đá và mở khóa'}),
  Object.freeze({id:'dynamax',name:'Dynamax',device:'Dynamax Band',duration:12,cooldown:80,ready:true,summary:'QA Solo · HP x2, công +40%, giẫm quái và sát thương lan'}),
  Object.freeze({id:'zmove',name:'Z-Power',device:'Z-Crystal',duration:15,cooldown:60,ready:true,summary:'QA Solo · sóng mở đầu, chữ Z xuyên quái, tuyệt chiêu kết thúc'}),
  Object.freeze({id:'terastal',name:'Terastal',device:'Tera Crystal',duration:30,cooldown:75,ready:true,summary:'QA Solo · kỹ năng theo hệ Tera đã chọn x1,8'})
 ]);
 const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const byId=id=>catalog.find(x=>x.id===id);
 const save=()=>G.DB?.save;
 const player=()=>G.Game?.player;
 const dexOK=d=>Number.isInteger(d)&&d>=1&&d<=1025;
 const runs=new WeakMap();
 const COST=100;
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
 const itemOwned=(s,key)=>Object.hasOwn(object(s?.pkmsvvPowerItems),key)&&s.pkmsvvPowerItems[key]===true;
 const itemKey=(id,type)=>id==='dynamax'?'dynamax':id+':'+type;
 const typesFor=dex=>Array.from(new Set((G.DEX_BY?.[dex]?.types||[]).filter(t=>Object.hasOwn(Z_NAMES,t))));
 const availableTypes=(s,id,dex)=>(id==='zmove'?typesFor(dex):id==='terastal'?Object.keys(Z_NAMES):[]).filter(t=>itemOwned(s,itemKey(id,t)));
 function chosenType(s,id,dex){
  const list=availableTypes(s,id,dex),stored=s?.pkmsvvPowerTypes?.[dex]?.[id];
  return list.includes(stored)?stored:typesFor(dex).find(t=>list.includes(t))||list[0]||null;
 }
 function unlocked(s,id,dex){
  if(id==='mega')return true; // Legacy stone, art and story checks remain authoritative.
  return id==='dynamax'?itemOwned(s,'dynamax'):!!chosenType(s,id,dex);
 }
 function selected(s,dex){
  const v=s?.pkmsvvPowerLoadout?.[String(dex)];
  return ['dynamax','zmove','terastal'].includes(v)&&unlocked(s,v,dex)?v:'mega';
 }
 function owns(s,dex){return !!(s&&dexOK(dex)&&(Number(s.partner)===dex||s.owned?.[dex]||s.shiny?.[dex]));}
 const balance=s=>{const v=Number(s?.arenaGacha?.points);return Number.isFinite(v)?Math.max(0,Math.floor(v)):0;};
 const pool=(s,id)=>id==='dynamax'?(itemOwned(s,'dynamax')?[]:['dynamax']):
  ['zmove','terastal'].includes(id)?Object.keys(Z_NAMES).map(t=>itemKey(id,t)).filter(k=>!itemOwned(s,k)):[];
 let saving=false;
 const busy=()=>saving;
 function canBuy(id,s=save()){return !!(s&&s.pkmsvvChapter7Seen===true&&!G.DB?.guest&&G.Game?.state==='ui'&&!saving&&balance(s)>=COST&&pool(s,id).length);}
 function restore(s,key,old,next){if(s[key]!==next)return;if(old===undefined)delete s[key];else s[key]=old;}
 async function buy(id,random=Math.random){
  const s=save();if(!canBuy(id,s))return null;
  const choices=pool(s,id),roll=id==='dynamax'?0:Number(random());
  if(!Number.isFinite(roll)||roll<0||roll>=1)return null;
  const key=choices[Math.floor(roll*choices.length)],oldItems=s.pkmsvvPowerItems,oldLedger=s.arenaGacha;
  const nextItems={...object(oldItems),[key]:true},nextLedger={...object(oldLedger),points:balance(s)-COST};
  saving=true;s.pkmsvvPowerItems=nextItems;s.arenaGacha=nextLedger;
  try{
   if(typeof G.DB?.commit!=='function'||await G.DB.commit(true)===false)throw Error('save');
   return {key,id,type:key.split(':')[1]||null,balance:nextLedger.points};
  }catch(_){restore(s,'pkmsvvPowerItems',oldItems,nextItems);restore(s,'arenaGacha',oldLedger,nextLedger);return null;}
  finally{saving=false;}
 }
 async function equip(id,dex=Number(save()?.partner),type){
  const s=save(),def=byId(id);
  if(saving||G.Game?.state!=='ui'||!def?.ready||!owns(s,dex)||G.DB?.guest||s.pkmsvvChapter7Seen!==true||!unlocked(s,id,dex))return false;
  const typed=id==='zmove'||id==='terastal';
  if(typed){type=type??chosenType(s,id,dex);if(!availableTypes(s,id,dex).includes(type))return false;}
  const old=s.pkmsvvPowerLoadout,oldTypes=s.pkmsvvPowerTypes;
  const next={...object(old),[dex]:id};
  const nextTypes=typed?{...object(oldTypes),[dex]:{...object(oldTypes?.[dex]),[id]:type}}:oldTypes;
  saving=true;s.pkmsvvPowerLoadout=next;if(typed)s.pkmsvvPowerTypes=nextTypes;
  try{
   if(typeof G.DB?.commit!=='function'||await G.DB.commit(true)===false)throw Error('save');
   return true;
  }catch(_){restore(s,'pkmsvvPowerLoadout',old,next);if(typed)restore(s,'pkmsvvPowerTypes',oldTypes,nextTypes);return false;}
  finally{saving=false;}
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
   r.powerType=chosenType(save(),r.id,Number(p.dex));
   runs.set(p,r);
  }
  return r||null;
 }
 function allowsMega(p){const r=state(p);return !r||r.id==='mega';}
 function canActivate(p=player()){
  const r=state(p);
  return !!(r&&['dynamax','zmove','terastal'].includes(r.id)&&!p.dead&&G.Game?.state==='playing'&&!p._megaActive&&!p._pkmsvvSpecialPowerActive&&
   r.remaining<=0&&r.cooldown<=0&&Number(G.PKMSVVMegaPhase3?.energy?.(p))>=100&&
   Number.isFinite(p.maxHp)&&p.maxHp>0&&Number.isFinite(p.hp)&&p.hp>0&&Number.isFinite(p.atkMul)&&p.atkMul>0);
 }
 function activate(p=player()){
  if(!canActivate(p))return false;
  const r=state(p),fraction=Math.max(0,Math.min(1,p.hp/p.maxHp));
  if(r.id==='zmove'){
   const type=r.powerType||primaryType(p);
   r.remaining=15;r.zClock=.3;r.zShots=0;r.zType=type;
   p._pkmsvvSpecialPowerActive='zmove';p._megaEnergy=0;
   zWave(p,220,1,type);
   G.UI?.toast?.('Z-POWER · '+Z_NAMES[type]+'!');
   return true;
  }
  if(r.id==='terastal'){
   r.remaining=30;r.aura=0;r.teraTypes=r.powerType?[r.powerType]:[];
   p._pkmsvvSpecialPowerActive='terastal';p._megaEnergy=0;
   G.FX?.ring?.(p.x,p.y,8,100,'#7fe8ff',.6,6);
   G.UI?.toast?.(tr('TERASTAL · kỹ năng cùng hệ +80%','TERASTAL · matching moves +80%'));
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
  if(p._pkmsvvSpecialPowerActive==='terastal'){
   r.remaining=0;r.cooldown=75;r.teraTypes=[];delete p._pkmsvvSpecialPowerActive;return true;
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
 // Native 3DS power_move_mul adapted to equipped crystal type.
 function damageMultiplier(p,type,owner=p){
  const r=p&&runs.get(p);
  return owner===p&&r?.id==='terastal'&&r.remaining>0&&p._pkmsvvSpecialPowerActive==='terastal'&&!p.dead&&soloExplore(p)&&G.Game?.state==='playing'&&r.teraTypes?.includes(type)?1.8:1;
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
  }else if(p._pkmsvvSpecialPowerActive==='terastal'){
   r.remaining=Math.max(0,r.remaining-d);r.aura+=d;
   if(r.aura>=.5){r.aura=0;G.FX?.ring?.(p.x,p.y,8,Math.max(35,(p.r||18)*2),'#7fe8ff',.4,4);}
   if(r.remaining<=0)stop(p);
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
  const show=!!(r&&['dynamax','zmove','terastal'].includes(r.id)&&p&&!p.dead&&G.Game?.state==='playing');
  button.style.display=show?'flex':'none';if(!show)return;
  const charge=Math.floor(G.PKMSVVMegaPhase3?.energy?.(p)||0);
  button.disabled=!canActivate(p);
  button.querySelector('span').textContent=r.remaining>0?Math.ceil(r.remaining)+'s':r.cooldown>0?Math.ceil(r.cooldown)+'s':charge<100?charge+'%':r.id==='zmove'?'Z-POWER':r.id==='terastal'?'TERA':'DMAX';
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
 function open(options={}){
  close();const s=save(),dex=Number(options.dex??s?.partner),current=selected(s,dex),fromBox=options.fromBox===true;
  const overlay=document.createElement('div');overlay.id='pkmsvv-special-power-overlay';overlay.className='pkmsvv-pc-overlay';overlay.style.zIndex='300001';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
  const panel=document.createElement('section');panel.className='pkmsvv-pc-panel';panel.style.maxWidth='760px';panel.style.maxHeight='85dvh';panel.style.overflowY='auto';
  const header=document.createElement('header');header.className='pkmsvv-pc-header';
  const title=document.createElement('h2');title.textContent=tr('SỨC MẠNH ĐẶC BIỆT','SPECIAL POWERS');
  const back=document.createElement('button');back.type='button';back.className='pkmsvv-pc-close';back.textContent=fromBox?tr('← PokéBox','← PokéBox'):tr('← Phòng nghiên cứu','← Research Lab');back.onclick=()=>{close();if(!fromBox)G.PKMSVVWiki?.open?.();};header.append(title,back);panel.append(header);
  const hint=document.createElement('p');hint.textContent=(G.DEX_BY?.[dex]?.name||('Pokémon #'+dex))+' · '+tr('Mỗi Pokémon chọn một sức mạnh trước trận. Dynamax, Z-Power và Terastal chỉ thử nghiệm Khám phá Solo, cần Chương 7.','One power per Pokémon before a run. Dynamax, Z-Power and Terastal are Chapter 7 Solo Explore trials.');panel.append(hint);
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;';
  for(const def of catalog){
   const card=document.createElement('div');card.style.cssText='border:1px solid #c4a970;border-radius:12px;padding:12px;background:#183643;display:grid;gap:7px;';
   const name=document.createElement('strong');name.textContent=def.name+' · '+def.device;
   const desc=document.createElement('span');desc.textContent=def.duration+'s / '+def.cooldown+'s · '+def.summary;
   const b=document.createElement('button');b.className='btn';b.type='button';b.dataset.powerEquip=def.id;
   const allowed=unlocked(s,def.id,dex),typed=def.id==='zmove'||def.id==='terastal',equippedType=chosenType(s,def.id,dex);
   let picker=null;
   card.append(name,desc);
   if(typed&&allowed){
    picker=document.createElement('select');picker.className='btn';picker.setAttribute('aria-label',def.name+' Type');
    for(const type of availableTypes(s,def.id,dex)){const opt=document.createElement('option');opt.value=type;opt.textContent=type.toUpperCase()+(def.id==='zmove'?' · '+Z_NAMES[type]:'');picker.append(opt);}
    picker.value=equippedType;card.append(picker);
   }
   function updateButton(){
    const active=current===def.id&&(!picker||picker.value===equippedType);
    b.textContent=!def.ready?tr('Đang phát triển','In development'):!allowed?tr('🔒 Cần vật phẩm Arena','🔒 Arena item required'):active?tr('Đang chọn','Selected'):tr('Trang bị','Equip');
    b.disabled=!def.ready||!allowed||active||s?.pkmsvvChapter7Seen!==true||!!G.DB?.guest||busy();
   }
   if(picker)picker.onchange=updateButton;updateButton();
   b.onclick=async()=>{b.disabled=true;if(await equip(def.id,dex,picker?.value)){options.onChange?.();open(options);}else{updateButton();G.UI?.toast?.(tr('Không lưu được lựa chọn.','Unable to save selection.'));}};
   card.append(b);
   if(def.id==='mega'&&!fromBox){const old=document.createElement('button');old.type='button';old.className='btn';old.textContent=tr('Mega Stone · Danh mục cũ','Mega Stones · Existing catalog');old.onclick=()=>{close();G.PKMSVVMegaEntry?.open?.({fromResearchLab:true});};card.append(old);}
   grid.append(card);
  }
  panel.append(grid);overlay.append(panel);document.body.append(overlay);back.focus?.({preventScroll:true});return true;
 }
 const oldUpdate=G.Player?.prototype?.update;
 if(typeof oldUpdate==='function')G.Player.prototype.update=function(dt){
  if(this===player()){
   const r=state(this);
   tick(this,dt);
   if(r&&['dynamax','zmove','terastal'].includes(r.id)&&(G.Input?.tap?.('digit5')||G.Input?.tap?.('numpad5')||G.Input?.tap?.('pkmsvv-mega')))activate(this);
  }
  return oldUpdate.call(this,dt);
 };
 for(const name of ['startRun','toUI','quit']){
  const prev=G.Game?.[name];if(typeof prev!=='function')continue;
  G.Game[name]=function(...args){stop(player());return prev.apply(this,args);};
 }
 if(typeof document!=='undefined'){mount();setInterval(sync,250);}
 return {catalog,COST,balance,pool,busy,canBuy,buy,itemOwned,availableTypes,chosenType,unlocked,selected,equip,state,allowsMega,canActivate,activate,tick,stop,afterHit,damageMultiplier,open,close,Z_NAMES};
})();
