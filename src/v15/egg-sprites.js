/* PKMSVV v1.5: shared SVG pixel sprites extracted/adapted from
 * Pedro Barretto's Pokémon Survivors (MIT source code):
 *   https://github.com/pedrobarretto/pokemon-survivors
 * Art: src/render/art.ts, src/render/fieldMissions.ts.
 * See src/v15/sprites/LICENSE-SOURCE.md for license/attribution.
 */
G.PKMSVVEggArt=(()=>{
 const urls={
  follow:'assets/eggs/egg_follow.svg',
  cracked:'assets/eggs/egg_crack.svg',
  nest:'assets/eggs/egg_nest.svg'
 };
 const imgs={};
 if(typeof Image==='function'){
  for(const [key,url] of Object.entries(urls)){
   const img=new Image();img.decoding='async';img.src=url;imgs[key]=img;
  }
 }
 function paint(ctx,key,x,y,w,h){
  const img=imgs[key];if(!img||!img.complete||!img.naturalWidth)return false;
  ctx.save();
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(img,Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  ctx.restore();return true;
 }
 function egg(ctx,x,y,scale=1,progress=0){
  const w=28*scale,h=32*scale;
  return paint(ctx,progress>=.76?'cracked':'follow',x-w/2,y-h/2,w,h);
 }
 function nest(ctx,x,y){
  return paint(ctx,'nest',x-32,y-35,64,48);
 }
 return {egg,nest,ready:(key)=>!!(imgs[key]?.complete&&imgs[key]?.naturalWidth)};
})();
