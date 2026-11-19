/* PKMSVV QA: actual in-world Tháp Thiên Không terrain, not its menu cover.
 * Original pixel-painted marble/gold/sky-cloud stage inspired by the visual
 * language of PokéSurvivor Hall of Origin; no hidden game files or raster
 * sprites are copied. Art is rendered at the native 16-pixel tile grid.
 * This is scoped to Explore region 10. Other modes and native collisions
 * remain unchanged. */
(function(){
 'use strict';
 if(typeof G==='undefined'||!G.Tiles||!G.World||typeof document==='undefined')return;
 const nativePaint=G.Tiles.paintChunk,nativeProp=G.Tiles.propSprite;
 const nativeName=G.World.biomeName;
 if(typeof nativePaint!=='function'||nativePaint._pkmsvvSkyWorldQA)return;
 const T=G.Tiles.T||16;
 const COLORS=Object.freeze({
  marble:'#e8f3f9',bright:'#f8fcfd',ivory:'#e0ebef',shade:'#bacbd5',
  grout:'#b3c9d7',gold:'#e6c56d',goldLight:'#ffedaf',
  goldDark:'#997845',azure:'#6396c3',mist:'#b9ddf0',cloud:'#e9f8ff',
  cloudShade:'#96bed8',stone:'#cad9de',shadow:'#66819a'
 });
 const mod=(x,n)=>((x%n)+n)%n;
 function hash(x,y,seed=1){
  let h=(Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(seed,1442695041))|0;
  h=Math.imul(h^(h>>>13),1274126177);
  return ((h^(h>>>16))>>>0)/4294967296;
 }
 function active(){
  return G.PKMSVVQuickRegion?.selectedRegion===9&&
   !G.Coop?.active&&!G.Rift?.inArena&&
   !G.PKMSVVChampionArena?.active&&!G.PKMSVVArenaSolo?.active;
 }
 function correctBiome(bi){
  return active()&&bi===G.PKMSVVQuickRegion?.targetBiome?.(9)&&
   bi===G.World?.biome;
 }
 function marble(ctx,x,y,tx,ty){
  const r=hash(tx,ty,11),mx=tx+.5,my=ty+.5,d=Math.hypot(mx,my);
  const base=r>.8?COLORS.bright:r>.38?COLORS.marble:COLORS.ivory;
  ctx.fillStyle=base;ctx.fillRect(x,y,T,T);
  // Four-tile marble slabs, connected across chunk boundaries.
  ctx.fillStyle=mod(tx,4)===0?COLORS.gold:COLORS.grout;
  ctx.fillRect(x,y,1,T);
  ctx.fillStyle=mod(ty,4)===0?COLORS.gold:COLORS.grout;
  ctx.fillRect(x,y,T,1);
  ctx.fillStyle=COLORS.bright;ctx.fillRect(x+2,y+2,T-4,1);
  if(mod(tx,4)===0&&mod(ty,4)===0){
   ctx.fillStyle=COLORS.goldLight;ctx.fillRect(x+1,y+1,4,4);
   ctx.fillStyle=COLORS.goldDark;ctx.fillRect(x+2,y+2,2,2);
  }
  // A central consecrated ring marks the Rayquaza arena, not Arceus.
  if(d>=4.6&&d<5.6){
   ctx.fillStyle=COLORS.gold;ctx.fillRect(x+3,y+3,T-6,T-6);
   ctx.fillStyle=COLORS.goldLight;ctx.fillRect(x+5,y+5,T-10,T-10);
  }else if(d>=2.5&&d<3.1){
   ctx.fillStyle=COLORS.goldDark;ctx.fillRect(x+5,y+5,T-10,T-10);
   ctx.fillStyle=COLORS.gold;ctx.fillRect(x+6,y+6,T-12,T-12);
  }else if(d<2.5){
   ctx.fillStyle=r>.5?'#c7e8f2':'#d4ecf3';ctx.fillRect(x+2,y+2,T-4,T-4);
   if(mod(tx+ty,2)===0){
    ctx.fillStyle=COLORS.gold;ctx.fillRect(x+7,y+3,2,T-6);
    ctx.fillRect(x+3,y+7,T-6,2);
   }
  }else if(r>.96){
   // Sparse golden star inset, never a giant repeated pattern.
   ctx.fillStyle=COLORS.gold;
   ctx.fillRect(x+7,y+4,2,8);ctx.fillRect(x+4,y+7,8,2);
   ctx.fillStyle=COLORS.bright;ctx.fillRect(x+7,y+7,2,2);
  }else if(r<.14){
   ctx.fillStyle=COLORS.shade;ctx.fillRect(x+4,y+12,6,1);
   ctx.fillRect(x+6,y+10,4,1);
  }
 }
 function mist(ctx,x,y,tx,ty){
  // Native 'liquid' remains a real terrain hazard; render its white cloud
  // with a gold warning lip so apparent safety never hides dangerous tiles.
  const r=hash(tx,ty,17);
  ctx.fillStyle=COLORS.azure;ctx.fillRect(x,y,T,T);
  ctx.fillStyle=COLORS.mist;ctx.fillRect(x+1,y+4,T-2,6);
  ctx.fillStyle=COLORS.cloudShade;ctx.fillRect(x,y+11,T,4);
  const off=Math.floor(r*5);
  ctx.fillStyle=COLORS.cloud;ctx.fillRect(x+off,y+5,7,3);
  ctx.fillRect(x+7,y+2,8,4);
  ctx.fillRect(x+2,y+9,12,3);
  ctx.fillStyle=COLORS.goldLight;ctx.fillRect(x,y,T,1);
  ctx.fillStyle=COLORS.goldDark;ctx.fillRect(x,y+1,T,1);
 }
 function column(ctx,x,y,tx,ty){
  // Opaque marble-and-gold columns make native walls/cover visually obvious.
  const r=hash(tx,ty,29);
  ctx.fillStyle=COLORS.shadow;ctx.fillRect(x,y,T,T);
  ctx.fillStyle=COLORS.goldDark;ctx.fillRect(x,y,T,3);
  ctx.fillStyle=COLORS.gold;ctx.fillRect(x+1,y+2,T-2,3);
  ctx.fillStyle=COLORS.stone;ctx.fillRect(x+3,y+5,T-6,T-6);
  ctx.fillStyle=COLORS.bright;ctx.fillRect(x+4,y+6,3,T-9);
  ctx.fillStyle=COLORS.shade;ctx.fillRect(x+T-6,y+6,2,T-8);
  ctx.fillStyle=COLORS.goldLight;ctx.fillRect(x+2,y+T-4,T-4,2);
  ctx.fillStyle=COLORS.goldDark;ctx.fillRect(x+1,y+T-2,T-2,2);
  if(r>.64){ctx.fillStyle=COLORS.gold;ctx.fillRect(x+7,y+6,2,T-10);}
 }
 function skyChunk(cx,cy,n,at){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:false});
  canvas.width=n*T;canvas.height=n*T;
  if(!ctx)return nativePaint.apply(this,arguments);
  ctx.imageSmoothingEnabled=false;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
   const tx=cx*n+i,ty=cy*n+j,x=i*T,y=j*T;
   const kind=at(tx,ty);
   if(kind==='liquid')mist(ctx,x,y,tx,ty);
   else if(kind==='wall')column(ctx,x,y,tx,ty);
   else marble(ctx,x,y,tx,ty);
  }
  return canvas;
 }
 function paintChunk(cx,cy,n,at,dirtField,bi,seed){
  if(!correctBiome(bi))return nativePaint.apply(this,arguments);
  return skyChunk(cx,cy,n,at);
 }
 paintChunk._pkmsvvSkyWorldQA=true;
 const propCache=new Map();
 function pillarProp(type,variant=0){
  const key=type+':'+variant;
  if(propCache.has(key))return propCache.get(key);
  const c=document.createElement('canvas');c.width=26;c.height=44;
  const ctx=c.getContext('2d');
  if(!ctx)return nativeProp.call(G.Tiles,0,type,variant);
  ctx.imageSmoothingEnabled=false;
  const cr=variant%3;
  ctx.fillStyle='#617c98';ctx.fillRect(6,39,15,3);
  ctx.fillStyle=COLORS.goldDark;ctx.fillRect(2,38,22,4);
  ctx.fillStyle=COLORS.gold;ctx.fillRect(3,36,20,3);
  ctx.fillStyle=COLORS.stone;ctx.fillRect(7,10,12,26);
  ctx.fillStyle=COLORS.bright;ctx.fillRect(8,11,4,24);
  ctx.fillStyle=COLORS.shade;ctx.fillRect(16,11,2,24);
  ctx.fillStyle=COLORS.gold;ctx.fillRect(5,8,16,4);
  ctx.fillStyle=COLORS.goldLight;ctx.fillRect(4,5,18,3);
  ctx.fillStyle=COLORS.goldDark;ctx.fillRect(5,4,16,1);
  ctx.fillStyle=COLORS.ivory;ctx.fillRect(9,2+cr,8,3);
  ctx.fillStyle=COLORS.gold;ctx.fillRect(12,15,2,8);
  ctx.fillStyle=COLORS.goldLight;ctx.fillRect(11,17,4,2);
  propCache.set(key,c);return c;
 }
 G.Tiles.paintChunk=paintChunk;
 if(typeof nativeProp==='function'){
  G.Tiles.propSprite=function(bi,type,variant){
   if(correctBiome(bi)&&['crystal','tree','dead','rock'].includes(type))
    return pillarProp(type,Number(variant)||0);
   return nativeProp.apply(this,arguments);
  };
 }
 if(typeof nativeName==='function'){
  G.World.biomeName=function(){
   return active()?'Tháp Thiên Không':nativeName.apply(this,arguments);
  };
 }
 G.PKMSVVSkyTowerMapQA={active,correctBiome,paintChunk,colors:COLORS,
  get installed(){return G.Tiles.paintChunk===paintChunk;}};
})();
