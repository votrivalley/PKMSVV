// PKMSVV Switch Native Tech Demo — original canvas simulation, no browser/WebApplet.
// This is NOT the full Pokémon Chuyển Sinh gameplay engine. No official Pokémon assets.
// Controller indices here follow nx.js / Switch ordering: B0 A1 Y2 X3 L4 R5.
const W=1280,H=720,ctx=screen.getContext('2d');
if(!ctx)throw new Error('Switch Canvas 2D unavailable');
let px=W/2,py=H/2,hp=100,kills=0,time=0,shots=[],enemies=[],last=0,spawnAt=0,fireAt=0,frames=0,fps=0,fpsAt=0,prevB=false,paused=false,spawnShield=1.5,deaths=0,lastError='';
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
 const b=button(p,0),toggle=b&&!prevB;prevB=b;
 if(toggle)paused=!paused;
 if(paused)return;
 time+=dt;spawnShield=Math.max(0,spawnShield-dt);
 let dx=Number(p?.axes?.[0])||0,dy=Number(p?.axes?.[1])||0;
 if(button(p,14))dx=-1;if(button(p,15))dx=1;
 if(button(p,12))dy=-1;if(button(p,13))dy=1;
 const mag=Math.hypot(dx,dy);if(mag>.15){dx/=Math.max(1,mag);dy/=Math.max(1,mag);px=clamp(px+dx*230*dt,30,W-30);py=clamp(py+dy*230*dt,82,H-40)}
 // Spawn budget deliberately caps actors; useful to validate sustained native FPS.
 if(time>=spawnAt&&enemies.length<90){
  spawnAt=time+Math.max(.15,.55-time*.005);
  const side=Math.floor(rng()*4),a=rng();
  const x=side===0?0:side===1?W:side===2?a*W:a*W;
  const y=side===2?75:side===3?H:75+a*(H-75);
  enemies.push({x,y,hp:2+(time>60?1:0),r:14+Math.floor(rng()*6),speed:35+rng()*28});
 }
 if(time>=fireAt&&enemies.length){
  fireAt=time+.21;
  let target=null,dist=Infinity;
  for(const e of enemies){const d=(e.x-px)**2+(e.y-py)**2;if(d<dist){dist=d;target=e}}
  if(target){const d=Math.sqrt(dist)||1;shots.push({x:px,y:py,vx:(target.x-px)/d*610,vy:(target.y-py)/d*610,ttl:1.3})}
 }
 for(let i=shots.length-1;i>=0;i--){
  const s=shots[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.ttl-=dt;
  let hit=false;
  for(let k=enemies.length-1;k>=0;k--){
   const e=enemies[k],d=(e.x-s.x)**2+(e.y-s.y)**2;
   if(d<(e.r+5)**2){e.hp--;hit=true;if(e.hp<=0){enemies.splice(k,1);kills++}break}
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
 ctx.fillStyle='#101a20';ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='#1c3038';ctx.lineWidth=1;
 for(let x=0;x<W;x+=64){ctx.beginPath();ctx.moveTo(x,70);ctx.lineTo(x,H);ctx.stroke()}
 for(let y=70;y<H;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 for(const s of shots){ctx.fillStyle='#ffce69';ctx.beginPath();ctx.arc(s.x,s.y,5,0,Math.PI*2);ctx.fill()}
 for(const e of enemies){ctx.fillStyle='#dc697e';ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#441e30';ctx.stroke()}
 ctx.fillStyle='#65d5c3';ctx.beginPath();ctx.arc(px,py,19,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#e6fff7';ctx.lineWidth=3;ctx.stroke();
 ctx.fillStyle='#0a1218';ctx.fillRect(0,0,W,70);
 ctx.fillStyle='#fff5de';ctx.font='bold 26px sans-serif';ctx.fillText('POKEMON CHUYEN SINH  -  SWITCH NATIVE TECH DEMO',24,43);
 ctx.font='20px sans-serif';ctx.fillStyle='#b9d3dc';
 ctx.fillText('HP '+Math.ceil(hp)+'   KO '+kills+'   QUAI '+enemies.length+'   FPS '+fps+'   '+Math.floor(time)+'s   HOI SINH '+deaths,25,110);
 ctx.fillText('Stick / D-Pad: Di chuyen      B: Tam dung   |  Native v0.0.2',25,H-23);
 if(spawnShield>0){ctx.fillStyle='#a5f7e6';ctx.fillText('BAT TU TAM THOI '+spawnShield.toFixed(1)+'s',25,142)}
 if(lastError){ctx.fillStyle='#ff9a8f';ctx.fillText('LOI: '+lastError.slice(0,100),25,170)}
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
