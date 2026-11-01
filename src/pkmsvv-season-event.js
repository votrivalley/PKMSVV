/* E — Lễ Hội Sương Ký Ức (Nov 2026 UTC): visual-only event.
 * Uses host run seed and a host-stamped season ID; no loot, stats, save writes,
 * collisions, enemy pathing, Arena rings, Berry trees or sprite replacements. */
G.PKMSVVSeason=(()=>{
 const CONFIG=Object.freeze({
  enabled:true,id:'mist-memory-2026',
  starts:'2026-11-01T00:00:00Z',ends:'2026-12-01T00:00:00Z',
  activeModes:['solo','coop'],maxDraw:48
 });
 const VARIANTS=Object.freeze([
  {id:'amber-leaves',vi:'Lá Thu Ký Ức',en:'Amber Leaves',color:'#ffd27b'},
  {id:'blue-mist',vi:'Sương Lam',en:'Blue Mist',color:'#a6dffc'},
  {id:'firefly-dusk',vi:'Đom Đóm Hoàng Hôn',en:'Firefly Dusk',color:'#d5b2ff'}
 ]);
 const tr=(a,b)=>G.I18n?.lang==='en'?b:a;
 const nowActive=(utc=Date.now())=>CONFIG.enabled&&utc>=Date.parse(CONFIG.starts)&&utc<Date.parse(CONFIG.ends);
 const int=x=>(Number(x)||0)>>>0;
 const mix=(n)=>{n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return(n^(n>>>16))>>>0;};
 const hash=(seed,x,y)=>mix(int(seed)^Math.imul(x,0x9e3779b1)^Math.imul(y,0x85ebca6b));
 const skinFor=seed=>VARIANTS[mix(int(seed))%VARIANTS.length];
 let run=null,announced=false;
 function hostPacket(seed,mode='coop',date=Date.now()){
  if(!CONFIG.activeModes.includes(mode)||!nowActive(date))return {seasonId:null,weatherState:'clear'};
  return {seasonId:CONFIG.id,weatherState:skinFor(seed).id};
 }
 function begin({seed=0,mode='solo',seasonId,weatherState,utc=Date.now()}={}){
  const allowed=CONFIG.activeModes.includes(mode);
  const incoming=seasonId===CONFIG.id;
  // Normal host sends a stamp; solo and older local rooms derive the same
  // skin from the already-synchronized world seed. Reconnect repeats begin().
  const active=allowed&&(seasonId!==null)&&
   (incoming||(seasonId===undefined&&nowActive(utc)));
  const skin=skinFor(seed);
  const selected=VARIANTS.find(v=>v.id===weatherState)||skin;
  run=Object.freeze({seed:int(seed),mode,seasonId:active?CONFIG.id:null,
   weatherState:active?selected.id:'clear',skin:active?selected.id:null,
   visualOnly:true,active});
  return run;
 }
 function state(){return run?{...run}:null;}
 function draw(ctx,cam){
  if(!run?.active||!CONFIG.activeModes.includes(run.mode)||!ctx||!cam||
   typeof cam.left!=='function'||typeof cam.top!=='function')return;
  const scale=Number(cam.scale)||1;
  const width=Math.min(2600,Math.max(0,(ctx.canvas?.width||0)/scale));
  const height=Math.min(1800,Math.max(0,(ctx.canvas?.height||0)/scale));
  if(!width||!height)return;
  const cell=156,ox=cam.left(),oy=cam.top();
  const fromX=Math.floor(ox/cell)-1,toX=Math.ceil((ox+width)/cell)+1;
  const fromY=Math.floor(oy/cell)-1,toY=Math.ceil((oy+height)/cell)+1;
  const cap=CONFIG.maxDraw,style=run.skin;
  ctx.save();let drawn=0;
  for(let y=fromY;y<=toY&&drawn<cap;y++){
   for(let x=fromX;x<=toX&&drawn<cap;x++){
    const n=hash(run.seed,x,y);
    if(n%3!==0)continue;
    const px=x*cell+22+(n%106),py=y*cell+20+((n>>>9)%105);
    ctx.globalAlpha=style==='blue-mist'?.14:style==='amber-leaves'?.21:.26;
    ctx.fillStyle=style==='amber-leaves'?'#ebbc64':
      style==='blue-mist'?'#bedfea':'#d2b2f2';
    if(style==='amber-leaves'){
     ctx.fillRect(px,py,8,3);ctx.fillRect(px+2,py+3,4,2);
    }else if(style==='blue-mist'){
     ctx.fillRect(px,py,22,2);ctx.fillRect(px+7,py-2,11,2);
    }else{
     ctx.fillRect(px,py,4,4);ctx.fillRect(px+1,py-2,2,2);
    }
    drawn++;
   }
  }
  ctx.restore();
 }
 function attachMenu(){
  if(!nowActive())return;
  const menu=document.getElementById('scr-menu'),left=menu?.querySelector('.menu-left');
  if(!left)return;
  let badge=left.querySelector('.pkmsvv-season-banner');
  if(!badge){badge=document.createElement('p');badge.className='pkmsvv-season-banner';
   const bottom=left.querySelector('.pkmsvv-v15-bottom');
   if(bottom)left.insertBefore(badge,bottom);else left.append(badge);}
  badge.textContent=tr('✨ SỰ KIỆN · Sương Ký Ức (01–30/11) · 3 cảnh quan ngẫu nhiên theo seed · không cộng chỉ số',
   '✨ SEASON · Memory Mist (Nov 1–30) · 3 seed-based landscapes · no stat boosts');
 }
 function installMenu(){
  if(!G.MenuUI||typeof G.MenuUI.open!=='function'||G.MenuUI.__pkmsvvSeason)return false;
  G.MenuUI.__pkmsvvSeason=true;
  const orig=G.MenuUI.open;
  G.MenuUI.open=function(...args){const out=orig.apply(this,args);attachMenu();return out;};
  if(document.readyState!=='loading')attachMenu();
  else document.addEventListener('DOMContentLoaded',attachMenu,{once:true});
  return true;
 }
 installMenu();
 return {CONFIG,VARIANTS,nowActive,skinFor,hostPacket,begin,state,draw,attachMenu,installMenu,hash};
})();