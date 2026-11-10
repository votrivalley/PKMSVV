// PKMSVV Switch Native Tech Demo — original canvas simulation, no browser/WebApplet.
// This is NOT the full Pokémon Chuyển Sinh gameplay engine. No official Pokémon assets.
// Controller indices here follow nx.js / Switch ordering: B0 A1 Y2 X3 L4 R5.
const W=1280,H=720,ctx=screen.getContext('2d');
const MAX_ENEMIES=32,MAX_SHOTS=32,MAX_SPRITES_PER_FRAME=18;
// Diagnostic: safe vector renderer is the default. Press L to toggle sprites.
let spritesEnabled=false,prevL=false,drawnSprites=0,wave='RATTATA/PIDGEY';
// Build matrix replaces DIAG_BOOT_MODE in ROMFS with 0, 1 or 2.
 // Each NRO boots directly into the requested renderer, with NO ZL mode
 // switching. This separates native render faults from gamepad input faults.
const DIAG_BOOT_MODE=0;
const DIAG_FIXED_MODE=true;
let renderMode=DIAG_BOOT_MODE,prevZL=false,drawCount=0;
// Render modes: 0=minimum Canvas rectangles, 1=static frame (only redraw every 3s),
// 2=full original Canvas paths/text. ZL cycles; sprite mode is independently toggled by L.
const RENDER_NAMES=['MIN','TINH','DAY'];
if(!ctx)throw new Error('Switch Canvas 2D unavailable');
let px=W/2,py=H/2,hp=100,kills=0,time=0,shots=[],enemies=[],last=0,spawnAt=0,fireAt=0,frames=0,fps=0,fpsAt=0,prevB=false,paused=false,spawnShield=1.5,deaths=0,lastError='';
const SPRITES={pikachu:null,rattata:null,pidgey:null,zubat:null};
const loaded={pikachu:false,rattata:false,pidgey:false,zubat:false};
const spriteFiles={pikachu:'25.png',rattata:'19.png',pidgey:'16.png',zubat:'41.png'};
let spriteLoadStarted=false;
function loadSprites(){
 if(spriteLoadStarted)return;
 spriteLoadStarted=true;
 if(typeof Image!=='function')return;
 for(const name of Object.keys(SPRITES)){
  try{
   const img=new Image();
   img.onload=()=>{SPRITES[name]=img;loaded[name]=true};
   img.onerror=()=>{loaded[name]=false};
   img.src='romfs:/sprites/'+spriteFiles[name];
  }catch(_){loaded[name]=false}
 }
}
let xp=0,level=1,attack=1,fireRate=.21,moveSpeed=230,skillPage=0,pickOpen=false,prevChoice=[false,false,false,false],skillChoices=[];
const SKILLS=[
 {name:'Tang sat thuong',description:'Dan manh hon',apply(){attack+=1}},
 {name:'Ban nhanh',description:'Toc do ban tang',apply(){fireRate=Math.max(.08,fireRate-.035)}},
 {name:'Chay nhanh',description:'Toc do di chuyen tang',apply(){moveSpeed+=27}},
 {name:'Hoi phuc',description:'Hoi 35 HP',apply(){hp=Math.min(100,hp+35)}},
 {name:'Xuyen pha',description:'Tang toc do dan',apply(){attack+=1;moveSpeed+=10}},
 {name:'Sinh luc',description:'Day HP len toi da',apply(){hp=100}}
];
function setChoices(){skillChoices=SKILLS.slice();skillPage=0;pickOpen=true}
function pickSkill(slot){
 if(!pickOpen||slot<0||slot>2)return false;
 const skill=skillChoices[skillPage*3+slot];
 if(!skill)return false;
 skill.apply();pickOpen=false;xp=0;return true;
}
function renderSprite(name,x,y,size,mirror=false){
 if(!spritesEnabled||drawnSprites>=MAX_SPRITES_PER_FRAME)return false;
 if(x+size<0||x-size>W||y+size<0||y-size>H)return false;
 const img=SPRITES[name];
 if(img&&loaded[name]){
  // Source art is 96x96 transparent pixel sprites. Keep a safe vector fallback.
  ctx.drawImage(img,x-size/2,y-size/2,size,size);
  drawnSprites++;
  return true;
 }
 return false;
}
const rng=(()=>{let v=0x13072026;return()=>((v=(Math.imul(v,1664525)+1013904223)>>>0)/4294967296)})();
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function button(p,n){return !!p?.buttons?.[n]?.pressed}
// Never replace actor arrays or reset the simulation while iterating them.
function respawn(){
 deaths++;
 px=W/2;py=H/2;hp=100;kills=0;time=0;
 enemies.length=0;shots.length=0;
 spawnAt=.8;fireAt=.3;spawnShield=2;
}
function update(dt){
 const p=navigator.getGamepads?.()?.find?.(x=>x?.connected)||navigator.getGamepads?.()?.[0];
 const r=button(p,5),b=button(p,0),toggle=b&&!prevB;prevB=b;
 const l=button(p,4),zl=button(p,6);
 if(l&&!prevL){spritesEnabled=!spritesEnabled;if(spritesEnabled)loadSprites();}
 if(!DIAG_FIXED_MODE&&zl&&!prevZL){renderMode=(renderMode+1)%3;drawCount=0;}
 prevL=l;prevZL=zl;
 const choice=[button(p,3),button(p,2),button(p,0),button(p,1)];
 const edges=choice.map((on,i)=>on&&!prevChoice[i]);prevChoice=choice;
 if(pickOpen){
  // Controller can still move during a level-up choice.
  if(edges[3])skillPage=(skillPage+1)%Math.ceil(skillChoices.length/3);
  if(r){const slot=edges.findIndex((on,i)=>i<3&&on);if(slot>=0)pickSkill(slot)}
 }else if(toggle&&!r)paused=!paused;
 if(paused)return;
 time+=dt;spawnShield=Math.max(0,spawnShield-dt);
 let dx=Number(p?.axes?.[0])||0,dy=Number(p?.axes?.[1])||0;
 if(button(p,14))dx=-1;if(button(p,15))dx=1;
 if(button(p,12))dy=-1;if(button(p,13))dy=1;
 const mag=Math.hypot(dx,dy);if(mag>.15){dx/=Math.max(1,mag);dy/=Math.max(1,mag);px=clamp(px+dx*moveSpeed*dt,30,W-30);py=clamp(py+dy*moveSpeed*dt,82,H-40)}
 // Spawn budget deliberately caps actors; useful to validate sustained native FPS.
 wave=time<25?'RATTATA/PIDGEY':'ZUBAT/GEN1';
 if(time>=spawnAt&&enemies.length<MAX_ENEMIES){
  spawnAt=time+Math.max(.15,.55-time*.005);
  const side=Math.floor(rng()*4),a=rng();
  const x=side===0?0:side===1?W:side===2?a*W:a*W;
  const y=side===2?75:side===3?H:75+a*(H-75);
  const species=time<25?(rng()<.52?'rattata':'pidgey'):(rng()<.32?'zubat':rng()<.56?'pidgey':'rattata');
  enemies.push({x,y,species,hp:2+(time>60?1:0),r:14+Math.floor(rng()*6),speed:35+rng()*28});
 }
 if(time>=fireAt&&enemies.length){
  fireAt=time+fireRate;
  let target=null,dist=Infinity;
  for(const e of enemies){const d=(e.x-px)**2+(e.y-py)**2;if(d<dist){dist=d;target=e}}
  if(target&&shots.length<MAX_SHOTS){const d=Math.sqrt(dist)||1;shots.push({x:px,y:py,vx:(target.x-px)/d*610,vy:(target.y-py)/d*610,ttl:1.3})}
 }
 for(let i=shots.length-1;i>=0;i--){
  const s=shots[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.ttl-=dt;
  let hit=false;
  for(let k=enemies.length-1;k>=0;k--){
   const e=enemies[k],d=(e.x-s.x)**2+(e.y-s.y)**2;
   if(d<(e.r+5)**2){e.hp-=attack;hit=true;if(e.hp<=0){enemies.splice(k,1);kills++;xp++;if(xp>=12&&!pickOpen){level++;setChoices()}}break}
  }
  if(hit||s.ttl<=0||s.x<0||s.x>W||s.y<0||s.y>H)shots.splice(i,1);
 }
 let touching=0;
 for(const e of enemies){
  const dx=px-e.x,dy=py-e.y,d=Math.hypot(dx,dy)||1;
  e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt;
  if(d<e.r+14)touching++;
 }
 // Cap stacked collision damage so a crowd cannot kill in a single frame.
 // Resolve death only AFTER finishing every iteration.
 if(touching>0&&spawnShield<=0)hp=Math.max(0,hp-Math.min(touching,4)*8*dt);
 if(hp<=0)respawn();
}
function draw(){
 drawCount++;
 if(renderMode===1&&drawCount>1&&drawCount%180!==0)return;
 if(renderMode!==2){
  // Diagnostics avoid font rasterization, beginPath/arc, Image, and stroke
  // in the default mode, so an engine crash can be isolated by subsystem.
  ctx.fillStyle='#091922';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#245563';ctx.fillRect(20,20,420,35);
  ctx.fillStyle='#67dac2';ctx.fillRect(20,20,Math.max(0,Math.min(420,hp/100*420)),35);
  ctx.fillStyle='#65d5c3';ctx.fillRect(px-15,py-15,30,30);
  ctx.fillStyle='#d36b7d';
  for(const e of enemies)ctx.fillRect(e.x-9,e.y-9,18,18);
  ctx.fillStyle='#ffd875';
  for(const s of shots)ctx.fillRect(s.x-3,s.y-3,6,6);
  // Mode 1 draws a static frame; the simulation and collision still run 60 Hz.
  // Small counter tiles show rendering works without font allocations.
  ctx.fillStyle=renderMode===0?'#6feab5':'#e7cf7d';
  ctx.fillRect(20,70,renderMode===0?80:160,9);
  return;
 }
 drawnSprites=0;
 ctx.fillStyle='#101a20';ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='#1c3038';ctx.lineWidth=1;
 for(let x=0;x<W;x+=64){ctx.beginPath();ctx.moveTo(x,70);ctx.lineTo(x,H);ctx.stroke()}
 for(let y=70;y<H;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 for(const s of shots){ctx.fillStyle='#ffce69';ctx.beginPath();ctx.arc(s.x,s.y,5,0,Math.PI*2);ctx.fill()}
 for(const e of enemies){if(!renderSprite(e.species||'rattata',e.x,e.y,60)){ctx.fillStyle='#dc697e';ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#441e30';ctx.stroke()}}
 if(!renderSprite('pikachu',px,py,78)){ctx.fillStyle='#65d5c3';ctx.beginPath();ctx.arc(px,py,19,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#e6fff7';ctx.lineWidth=3;ctx.stroke()}
 ctx.fillStyle='#0a1218';ctx.fillRect(0,0,W,70);
 ctx.fillStyle='#fff5de';ctx.font='bold 26px sans-serif';ctx.fillText('POKEMON CHUYEN SINH  -  SWITCH NATIVE TECH DEMO',24,43);
 ctx.font='20px sans-serif';ctx.fillStyle='#b9d3dc';
 ctx.fillText('HP '+Math.ceil(hp)+'  LV '+level+'  XP '+xp+'/12  KO '+kills+'  QUAI '+enemies.length+'  FPS '+fps+'  '+Math.floor(time)+'s  HOI SINH '+deaths,25,110);
 ctx.fillStyle=spritesEnabled?'#ffe39c':'#a7f4d4';
 ctx.fillText('HINH: '+(spritesEnabled?'SPRITE (L DE TAT)':'VECTOR AN TOAN (L BAT SPRITE)')+'  |  DOT: '+wave,25,168);
 ctx.fillText('B: Tam dung  L: Sprites  MODE '+RENDER_NAMES[renderMode]+'  |  Native v0.0.6',25,H-23);
 if(spawnShield>0){ctx.fillStyle='#a5f7e6';ctx.fillText('BAT TU TAM THOI '+spawnShield.toFixed(1)+'s',25,142)}
 if(lastError){ctx.fillStyle='#ff9a8f';ctx.fillText('LOI: '+lastError.slice(0,100),25,210)}
 if(pickOpen){
  ctx.fillStyle='rgba(8,18,35,.94)';ctx.fillRect(W-418,128,396,330);
  ctx.strokeStyle='#ffe2a0';ctx.strokeRect(W-418,128,396,330);
  ctx.fillStyle='#ffeab1';ctx.font='bold 25px sans-serif';ctx.fillText('LEN CAP '+level,W-395,166);
  for(let i=0;i<3;i++){
   const sk=skillChoices[skillPage*3+i];if(!sk)continue;
   const y=195+i*72;
   ctx.fillStyle='#294764';ctx.fillRect(W-395,y,350,64);
   ctx.fillStyle='#fff7c5';ctx.font='bold 17px sans-serif';
   ctx.fillText('R + '+['X','Y','B'][i]+'  '+sk.name,W-385,y+25);
   ctx.font='14px sans-serif';ctx.fillStyle='#cbdfe6';ctx.fillText(sk.description,W-385,y+47);
  }
  ctx.fillStyle='#ffeab1';ctx.font='16px sans-serif';
  ctx.fillText('A: Trang '+(skillPage+1)+'/'+Math.ceil(skillChoices.length/3),W-395,438);
 }
 if(paused){ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 56px sans-serif';ctx.fillText('TAM DUNG',W/2-170,H/2)}
}
function frame(now){
 const dt=last?clamp((now-last)/1000,0,.05):0;last=now;
 frames++;if(now-fpsAt>=1000){fps=Math.round(frames*1000/(now-fpsAt));fpsAt=now;frames=0}
 // A JS exception should remain visible for debugging instead of silently
 // ending the animation loop. Render a diagnostic overlay on following frames.
 try{if(!lastError)update(dt);draw()}catch(err){
  lastError=String(err?.stack||err?.message||err);
  try{console.error('[PKMSVV Switch native demo]',lastError)}catch(_){}
  try{ctx.fillStyle='#220c13';ctx.fillRect(0,0,W,H);
   ctx.fillStyle='#fff';ctx.font='24px sans-serif';
   ctx.fillText('PKMSVV NATIVE DEMO ERROR',30,65);
   ctx.fillText(lastError.slice(0,120),30,110)}catch(_){}
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
