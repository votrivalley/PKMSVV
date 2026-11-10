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
let renderMode=0,prevZL=false,drawCount=0,lastDrawAt=-Infinity;
const SAFE_RENDER_MS=30; // target about 30 presented FPS, simulation stays at native RAF rate
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
 // Stable v0.0.8 intentionally never calls native drawImage; the asset
 // pipeline is kept for a future isolated texture stress test.
 return false;
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
 const pads=navigator.getGamepads?.();
 let p=null;
 if(pads)for(let i=0;i<pads.length;i++){if(pads[i]?.connected){p=pads[i];break}}

 const r=button(p,5),b=button(p,0),toggle=b&&!prevB;prevB=b;
 // No native texture decoding or mode changes: L/ZL stay unused.
 // Avoid allocating input arrays on every 60 Hz simulation tick.
 const x=button(p,3),y=button(p,2),bb=button(p,0),a=button(p,1);
 const ex=x&&!prevChoice[0],ey=y&&!prevChoice[1],eb=bb&&!prevChoice[2],ea=a&&!prevChoice[3];
 prevChoice[0]=x;prevChoice[1]=y;prevChoice[2]=bb;prevChoice[3]=a;
 if(pickOpen){
  if(ea)skillPage=(skillPage+1)%Math.ceil(skillChoices.length/3);
  if(r){if(ex)pickSkill(0);else if(ey)pickSkill(1);else if(eb)pickSkill(2)}
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
// Native-safe renderer: ONLY solid fillRect. No native font rasterizer,
// canvas paths, strokes or textures, even when a level-up opens.
// This is a temporary stable demo, not the full Pokémon UI.
function draw(){
 ctx.fillStyle='#081821';ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#183844';ctx.fillRect(16,16,450,37);
 ctx.fillStyle='#50d6b2';ctx.fillRect(16,16,Math.max(0,Math.min(450,hp*4.5)),37);
 ctx.fillStyle='#355169';ctx.fillRect(16,64,350,12);
 ctx.fillStyle='#f3c76c';ctx.fillRect(16,64,Math.max(0,Math.min(350,xp/12*350)),12);
 // Scene: keep fill calls bounded by the existing 32-enemy/32-bullet limits.
 ctx.fillStyle='#78dfc6';ctx.fillRect(px-17,py-17,34,34);
 ctx.fillStyle='#d86d80';
 for(let i=0;i<enemies.length;i++){
  const e=enemies[i];ctx.fillRect(e.x-10,e.y-10,20,20);
 }
 ctx.fillStyle='#ffd476';
 for(let i=0;i<shots.length;i++){
  const s=shots[i];ctx.fillRect(s.x-4,s.y-4,8,8);
 }
 // HUD: count bars instead of expensive changing text glyphs.
 ctx.fillStyle='#587f94';
 for(let i=0;i<Math.min(10,level);i++)ctx.fillRect(20+i*20,93,13,10);
 if(spawnShield>0){ctx.fillStyle='#8aecff';ctx.fillRect(px-22,py+22,44,4)}
 if(pickOpen){
  ctx.fillStyle='#11283a';ctx.fillRect(W-360,110,342,292);
  const start=skillPage*3;
  for(let i=0;i<3;i++){
   if(!skillChoices[start+i])continue;
   const y=131+i*79;
   ctx.fillStyle=i===0?'#335d76':i===1?'#476179':'#645374';
   ctx.fillRect(W-340,y,303,66);
   ctx.fillStyle='#ffcf66';ctx.fillRect(W-334,y+7,9,52);
   // One/two/three ticks mean R+X / R+Y / R+B.
   for(let k=0;k<=i;k++)ctx.fillRect(W-312+k*17,y+18,12,10);
  }
  ctx.fillStyle='#dfd386';ctx.fillRect(W-342,380,skillPage===0?100:220,9);
 }
 if(paused){ctx.fillStyle='#020e16';ctx.fillRect(220,270,840,185);
  ctx.fillStyle='#e7c97d';ctx.fillRect(260,312,760,8)}
 if(lastError){ctx.fillStyle='#ef557c';ctx.fillRect(0,0,W,18)}
}
function frame(now){
 const dt=last?clamp((now-last)/1000,0,.05):0;last=now;
 frames++;if(now-fpsAt>=1000){fps=Math.round(frames*1000/(now-fpsAt));fpsAt=now;frames=0}
 // A JS exception should remain visible for debugging instead of silently
 // ending the animation loop. Render a diagnostic overlay on following frames.
 try{
  if(!lastError)update(dt);
  // Keep simulation/controller input on native animation frames, while
  // throttling only the graphics submission (not game logic).
  if(now-lastDrawAt>=SAFE_RENDER_MS){lastDrawAt=now;draw()}
 }catch(err){
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
