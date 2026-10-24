/* Six distinct pixel-style Mystery Orb sprites.
 * Static SVG assets are bundled offline, NOT loaded from a third-party URL.
 * The renderer gracefully falls back to a colored gemstone until ready.
 */
G.OrbSprites=(()=>{
 const ids=['slumber','slow','blowback','focus','luminous','quick'];
 const images=Object.create(null);
 if(typeof Image!=='undefined')for(const id of ids){
  const img=new Image();img.decoding='async';
  img.src='assets/orbs/'+id+'.svg';
  images[id]=img;
 }
 function draw(ctx,id,x,y,size=24){
  const img=images[id];
  if(img&&img.complete&&img.naturalWidth>0){
   const old=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
   ctx.drawImage(img,Math.round(x),Math.round(y),Math.round(size),Math.round(size));
   ctx.imageSmoothingEnabled=old;
   return;
  }
  const o=G.Orbs&&G.Orbs.BY[id];
  ctx.fillStyle=o?o.col:'#85c9f6';
  ctx.beginPath();ctx.arc(x+size/2,y+size/2,size*.43,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.fillRect(x+size*.30,y+size*.24,Math.max(2,size*.12),Math.max(2,size*.12));
 }
 return {draw,ids};
})();