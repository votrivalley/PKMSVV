// PKMSVV Switch Native Tech Demo — original canvas simulation, no browser/WebApplet.
// This is NOT the full Pokémon Chuyển Sinh gameplay engine. No official Pokémon assets.
// Controller indices here follow nx.js / Switch ordering: B0 A1 Y2 X3 L4 R5.
const W=1280,H=720,ctx=screen.getContext('2d');
// Native Kanto config is COMPILED from src/pkmsvv-quick-region.js by build-kanto.cjs.
// Fallback keeps Node gameplay tests executable before RomFS generation.
const KANTO_CONFIG=/*__PKMSVV_KANTO_CONFIG__*/{"region":"Kanto","gen":1,"nationalMin":1,"nationalMax":151,"waveSeconds":[0,120,240,360,480,600,720],"sealSeconds":900,"finalBossSeconds":1800,"mascotDex":150,"palette":["#5ba9e8","#bceef7","#348b63"],"trialSpecies":[{"name":"rattata","dex":19,"sprite":"19.png","minTier":0},{"name":"pidgey","dex":16,"sprite":"16.png","minTier":0},{"name":"zubat","dex":41,"sprite":"41.png","minTier":1}]};
let kantoTier=0;
function kantoWaveAt(seconds){
 let tier=0;
 for(let i=1;i<KANTO_CONFIG.waveSeconds.length;i++)
  if(seconds>=KANTO_CONFIG.waveSeconds[i])tier=i;
 return tier;
}
const MAX_ENEMIES=32,MAX_SHOTS=32,MAX_SPRITES_PER_FRAME=12;
const MAX_ENEMY_SPRITES=4;
// Diagnostic: safe vector renderer is the default. Press L to toggle sprites.
let spritesEnabled=false,prevL=false,drawnSprites=0,wave='RATTATA/PIDGEY';
// Build matrix replaces DIAG_BOOT_MODE in ROMFS with 0, 1 or 2.
 // Each NRO boots directly into the requested renderer, with NO ZL mode
 // switching. This separates native render faults from gamepad input faults.
const DIAG_BOOT_MODE=2;
const DIAG_FIXED_MODE=true;
const NO_NATIVE_FONTS=false; // v0.0.14 bridges source-derived Kanto generation and wave pacing
let renderMode=DIAG_BOOT_MODE,prevZL=false,drawCount=0;
// Render modes: 0=minimum Canvas rectangles, 1=static frame (only redraw every 3s),
// 2=full original Canvas paths/text. ZL cycles; sprite mode is independently toggled by L.
const RENDER_NAMES=['MIN','TINH','DAY'];
if(!ctx)throw new Error('Switch Canvas 2D unavailable');
let px=W/2,py=H/2,hp=100,kills=0,time=0,shots=[],enemies=[],last=0,spawnAt=0,fireAt=0,frames=0,fps=0,fpsAt=0,prevB=false,paused=false,spawnShield=1.5,deaths=0,lastError='';
const SPRITES={pikachu:null,rattata:null,pidgey:null,zubat:null};
const loaded={pikachu:false,rattata:false,pidgey:false,zubat:false};
const spriteFiles={pikachu:'25.png',rattata:'19.png',pidgey:'16.png',zubat:'41.png'};
let spriteLoadStarted=false,enemySpritesDrawn=0;
function loadSprites(){
 // Controlled two-image experiment: player Pikachu + Rattata only.
 // Pidgey/Zubat remain vector. Images are decoded once on first L.
 if(spriteLoadStarted)return;
 spriteLoadStarted=true;
 if(typeof Image!=='function')return;
 for(const name of ['pikachu','rattata']){
  try{
   const img=new Image();
   img.onload=()=>{SPRITES[name]=img;loaded[name]=true};
   img.onerror=()=>{loaded[name]=false};
   img.src='romfs:/sprites/'+spriteFiles[name];
  }catch(_){loaded[name]=false}
 }
}
// Switch-only bindings: dialog keys are direct and take precedence over combat.
const SWITCH_PAD_BINDINGS=Object.freeze({
 skill:[3,2,0],page:1,orb:[5,2],pause:[5,0],
 menu:9,menuBack:0,mega:7,sprites:4
});
let xp=0,level=1,attack=1,fireRate=.21,moveSpeed=230,skillPage=0,pickOpen=false,prevChoice=[false,false,false,false],skillChoices=[];
const SKILLS=[
 {name:'Tang sat thuong',description:'Dan manh hon',apply(){attack+=1}},
 {name:'Ban nhanh',description:'Toc do ban tang',apply(){fireRate=Math.max(.08,fireRate-.035)}},
 {name:'Chay nhanh',description:'Toc do di chuyen tang',apply(){moveSpeed+=27}},
 {name:'Hoi phuc',description:'Hoi 35 HP',apply(){hp=Math.min(100,hp+35)}},
 {name:'Xuyen pha',description:'Tang toc do dan',apply(){attack+=1;moveSpeed+=10}},
 {name:'Sinh luc',description:'Day HP len toi da',apply(){hp=100}}
];
function setChoices(){if(typeof alpha==='object'&&alpha.enabled)return alpha.offersForLevel();skillChoices=SKILLS.slice();skillPage=0;pickOpen=true}
function pickSkill(slot){
 if(typeof alpha==='object'&&alpha.enabled)return alpha.pickOffer(slot);
 if(!pickOpen||slot<0||slot>2)return false;
 const skill=skillChoices[skillPage*3+slot];
 if(!skill)return false;
 skill.apply();pickOpen=false;xp=0;return true;
}
function renderSprite(name,x,y,size,mirror=false,isPlayer=false){
 if(!spritesEnabled||drawnSprites>=MAX_SPRITES_PER_FRAME||(!isPlayer&&drawnSprites>=MAX_SPRITES_PER_FRAME-1))return false;
 if(name!=='pikachu'&&name!=='rattata'&&!(typeof alpha==='object'&&alpha.spriteNames.has(name)))return false;
 if(name!=='pikachu'&&enemySpritesDrawn>=MAX_ENEMY_SPRITES&&!(typeof alpha==='object'&&alpha.enabled))return false;
 if(x+size<0||x-size>W||y+size<0||y-size>H)return false;
 const img=SPRITES[name];
 if(img&&loaded[name]){
  // Source art is 96x96 transparent pixel sprites. Keep a safe vector fallback.
  ctx.drawImage(img,x-size/2,y-size/2,size,size);
  drawnSprites++;
  if(name==='rattata')enemySpritesDrawn++;
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
 if(typeof alpha==='object'&&alpha.enabled)alpha.onRespawn();
}
function update(dt){
 if(typeof alpha==='object'&&alpha.enabled&&alpha.preUpdate(dt))return;
 const p=navigator.getGamepads?.()?.find?.(x=>x?.connected)||navigator.getGamepads?.()?.[0];
 const r=button(p,5),b=button(p,0),toggle=r&&b&&!prevB;prevB=b;
 const l=button(p,4),zl=button(p,6);
 // L toggles Pikachu and up to 4 Rattata sprites. Vector mode stays default.
 if(l&&!prevL){spritesEnabled=!spritesEnabled;if(spritesEnabled)loadSprites();}
 if(!DIAG_FIXED_MODE&&zl&&!prevZL){renderMode=(renderMode+1)%3;drawCount=0;}
 prevL=l;prevZL=zl;
 const choice0=button(p,SWITCH_PAD_BINDINGS.skill[0]);
 const choice1=button(p,SWITCH_PAD_BINDINGS.skill[1]);
 const choice2=button(p,SWITCH_PAD_BINDINGS.skill[2]);
 const choice3=button(p,SWITCH_PAD_BINDINGS.page);
 const edge0=choice0&&!prevChoice[0],edge1=choice1&&!prevChoice[1],
  edge2=choice2&&!prevChoice[2],edge3=choice3&&!prevChoice[3];
 prevChoice[0]=choice0;prevChoice[1]=choice1;prevChoice[2]=choice2;prevChoice[3]=choice3;
 if(pickOpen){
  // X / Y / B directly select slots 1 / 2 / 3; A pages. No R modifier.
  if(edge3)skillPage=(skillPage+1)%Math.max(1,Math.ceil(skillChoices.length/3));
  else if(edge0)pickSkill(0);
  else if(edge1)pickSkill(1);
  else if(edge2)pickSkill(2);
 }else if(toggle)paused=!paused;
 if(paused)return;
 time+=dt*(typeof alpha==='object'&&alpha.enabled?alpha.clockScale:1);spawnShield=Math.max(0,spawnShield-dt);
 kantoTier=kantoWaveAt(time);
 let dx=Number(p?.axes?.[0])||0,dy=Number(p?.axes?.[1])||0;
 if(button(p,14))dx=-1;if(button(p,15))dx=1;
 if(button(p,12))dy=-1;if(button(p,13))dy=1;
 const mag=Math.hypot(dx,dy);if(mag>.15){dx/=Math.max(1,mag);dy/=Math.max(1,mag);const boost=typeof alpha==='object'&&alpha.enabled?alpha.moveMultiplier:1;px=clamp(px+dx*moveSpeed*boost*dt,30,W-30);py=clamp(py+dy*moveSpeed*boost*dt,82,H-40)}
 // Spawn budget deliberately caps actors; useful to validate sustained native FPS.
 wave=kantoTier===0?'KANTO: RATTATA/PIDGEY':'KANTO: GEN1 TIER '+(kantoTier+1);
 if(time>=spawnAt&&enemies.length<MAX_ENEMIES){
  spawnAt=time+Math.max(.20,.58-kantoTier*.055);
  const side=Math.floor(rng()*4),a=rng();
  const x=side===0?0:side===1?W:side===2?a*W:a*W;
  const y=side===2?75:side===3?H:75+a*(H-75);
  const selected=(typeof alpha==='object'&&alpha.enabled)?alpha.selectSpecies(kantoTier):null;
  const species=selected?selected.name.toLowerCase():(kantoTier===0?(rng()<.55?'rattata':'pidgey'):(rng()<.28?'zubat':rng()<.56?'pidgey':'rattata'));
  const realHp=selected?.hp?Math.max(2,Math.min(36,Math.round(selected.hp/26*(1+kantoTier*.35)))):2+Math.floor(kantoTier/2);
  const realSpeed=selected?.spd?clamp(selected.spd*.47+kantoTier*4,30,125):35+rng()*28+kantoTier*3;
  enemies.push({x,y,species,dex:selected?.dex||0,hp:realHp,r:14+Math.floor(rng()*6),speed:realSpeed});
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
   if(d<(e.r+5)**2){e.hp-=attack*(e.boss&&typeof alpha==='object'&&alpha.enabled?alpha.bossDamageMultiplier:1);hit=true;if(e.hp<=0){if(typeof alpha==='object'&&alpha.enabled)alpha.onKill(e);enemies.splice(k,1);kills++;xp++;if(xp>=12&&!pickOpen){level++;setChoices()}}break}
  }
  if(hit||s.ttl<=0||s.x<0||s.x>W||s.y<0||s.y>H)shots.splice(i,1);
 }
 let touching=0;
 for(const e of enemies){
  const dx=px-e.x,dy=py-e.y,d=Math.hypot(dx,dy)||1;
  const slow=e.sleepLeft>0?0:e.slowLeft>0?.6:1;
  e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;
  if(d<e.r+14)touching++;
 }
 // Cap stacked collision damage so a crowd cannot kill in a single frame.
 // Resolve death only AFTER finishing every iteration.
 if(touching>0&&spawnShield<=0)hp=Math.max(0,hp-Math.min(touching,4)*8*dt*(typeof alpha==='object'&&alpha.enabled?alpha.incomingDamageMultiplier:1));
 if(hp<=0)respawn();
 if(typeof alpha==='object'&&alpha.enabled)alpha.postUpdate(dt);
}
function draw(){
 // FULL 60Hz + official Kanto palette/wave timings, opt-in limited sprite trial.
 // Keep original grid/paths/arc visual treatment for honest comparison.
 ctx.fillStyle='#101a20';ctx.fillRect(0,0,W,H);
 // Native Kanto field: first survival biome palette from official QuickRegion.
 // Decorative rectangles only; no new path/texture memory pressure.
 ctx.fillStyle=KANTO_CONFIG.palette[0];ctx.fillRect(0,70,W,110);
 ctx.fillStyle=KANTO_CONFIG.palette[1];ctx.fillRect(0,170,W,22);
 ctx.fillStyle=KANTO_CONFIG.palette[2];ctx.fillRect(0,193,W,12);
 ctx.fillStyle='#17302e';ctx.fillRect(0,207,W,H-207);
 ctx.strokeStyle='#1c3038';ctx.lineWidth=1;
 for(let x=0;x<W;x+=64){ctx.beginPath();ctx.moveTo(x,70);ctx.lineTo(x,H);ctx.stroke()}
 for(let y=70;y<H;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 for(const shot of shots){ctx.fillStyle='#ffce69';ctx.beginPath();ctx.arc(shot.x,shot.y,5,0,Math.PI*2);ctx.fill()}
 drawnSprites=0;enemySpritesDrawn=0;
 for(const enemy of enemies){
  if(!renderSprite(enemy.species,enemy.x,enemy.y,60)){
   ctx.fillStyle='#dc697e';ctx.beginPath();ctx.arc(enemy.x,enemy.y,enemy.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#441e30';ctx.stroke();
  }
 }
 if(!renderSprite(typeof alpha==='object'&&alpha.enabled?alpha.chooseBattleSprite():'pikachu',px,py,78,false,true)){
  ctx.fillStyle='#65d5c3';ctx.beginPath();ctx.arc(px,py,19,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#e6fff7';ctx.lineWidth=3;ctx.stroke();
 }
 ctx.fillStyle='#0a1218';ctx.fillRect(0,0,W,70);
 // v0.0.11 dynamic HUD isolation: six changing text batches per frame.
 // Keep native geometry and game logic identical to known stable v0.0.10.
 ctx.fillStyle='#fff4cc';
 ctx.font='20px sans-serif';
 ctx.fillText('POKEMON CHUYEN SINH - NATIVE KANTO v0.2.0',24,105);
 ctx.fillText('HP: '+Math.ceil(hp),24,135);
 ctx.fillText('XP: '+xp+'/12   LEVEL: '+level,24,165);
 ctx.fillText('KO: '+kills+'   GEN '+KANTO_CONFIG.gen+'   WAVE '+(kantoTier+1)+'   ENEMIES: '+enemies.length,24,235);
 ctx.fillText('FPS: '+fps+'   TIME: '+Math.floor(time)+'s   SEAL: '+KANTO_CONFIG.sealSeconds+'s   FINAL: '+KANTO_CONFIG.finalBossSeconds+'s',24,265);
 ctx.fillText('L: SPRITES '+(spritesEnabled?(loaded.pikachu&&loaded.rattata?'ON':'LOADING'):'OFF')+'  KANTO 151  B: PAUSE',24,692);
 // Text-free health, XP and level bars. Avoid changing canvas.font per frame.
 ctx.fillStyle='#294963';ctx.fillRect(16,17,390,18);
 ctx.fillStyle='#7cdec4';ctx.fillRect(16,17,Math.max(0,Math.min(390,hp*3.9)),18);
 ctx.fillStyle='#415375';ctx.fillRect(16,42,390,12);
 ctx.fillStyle='#ffd277';ctx.fillRect(16,42,Math.max(0,Math.min(390,(xp/12)*390)),12);
 ctx.fillStyle='#556d86';
 for(let i=0;i<Math.min(10,level);i++)ctx.fillRect(430+i*18,25,12,15);
 if(spawnShield>0){ctx.fillStyle='#7cebdc';ctx.fillRect(px-25,py+26,50,5)}
 if(pickOpen){
  ctx.fillStyle='rgba(8,18,35,.94)';ctx.fillRect(W-418,128,396,330);
  ctx.strokeStyle='#ffe2a0';ctx.lineWidth=2;ctx.strokeRect(W-418,128,396,330);
  for(let i=0;i<3;i++){
   if(!skillChoices[skillPage*3+i])continue;
   const y=195+i*72;
   ctx.fillStyle='#294764';ctx.fillRect(W-395,y,350,64);
   ctx.fillStyle='#fff7c5';ctx.fillRect(W-390,y+8,10,48);
   for(let k=0;k<=i;k++)ctx.fillRect(W-370+k*15,y+15,10,10);
  }
  ctx.fillStyle='#ffeab1';ctx.fillRect(W-395,438,Math.min(360,(skillPage+1)*120),9);
 }
 if(paused){ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#fff';ctx.fillRect(W/2-100,H/2-15,200,30)}
 if(lastError){ctx.fillStyle='#f55';ctx.fillRect(0,0,W,10)}
 if(typeof alpha==='object'&&alpha.enabled)alpha.draw();
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
   ctx.fillStyle='#fff';ctx.fillRect(0,0,W,32)}catch(_){}
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
