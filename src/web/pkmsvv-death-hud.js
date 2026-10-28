'use strict';
// One mutually exclusive, read-only downed-state overlay for all LAN/AI modes.
// Never changes HP, revive timers, winner logic, team ownership or save data.
G.PKMSVVDeathHUD=(()=>{
 const L=(vi,en)=>G.I18n?.lang==='vi'?vi:en;
 function mode(){
  if(G.Royale?.active)return 'royale';
  if(G.EggRush?.active)return 'eggrush';
  if(G.Coop?.active)return 'coop';
  return null;
 }
 function message(m,player){
  if(!player?.dead)return null;
  if(m==='coop')return {
   title:L('Bạn đã gục!','You have fallen!'),
   subtitle:L('Chờ đồng đội đến cứu.','Wait for your teammates to revive you.')
  };
  if(m==='royale')return {
   title:L('Bạn đã bị loại!','You are eliminated!'),
   subtitle:L('Theo dõi trận đấu và chờ kết quả.','Watch the match and await the results.')
  };
  if(m==='eggrush'){
   const elapsed=Number(player.lanEggDeath);
   const remaining=Math.max(0,Math.ceil(8-(Number.isFinite(elapsed)?elapsed:0)));
   return {
    title:L('Hồi sinh sau ','Respawn in ')+remaining+'s',
    subtitle:L('Chuẩn bị trở lại cuộc đua!','Get ready to rejoin the race!')
   };
  }
  return null;
 }
 function draw(ctx,w,h,player){
  if(!ctx||!player?.dead||!w||!h||
   (G.Game?.state&&G.Game.state!=='playing'&&G.Game.state!=='held'))return;
  const copy=message(mode(),player);if(!copy)return;
  const y=Math.min(h-110,Math.max(120,h*.55));
  ctx.save();
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineJoin='round';ctx.lineWidth=4;ctx.strokeStyle='rgba(0,0,0,.85)';
  ctx.font='bold '+Math.round(Math.max(15,Math.min(22,w/34)))+'px sans-serif';
  ctx.fillStyle='#ffb9be';
  ctx.strokeText(copy.title,w/2,y,Math.max(90,w-48));
  ctx.fillText(copy.title,w/2,y,Math.max(90,w-48));
  ctx.font='bold '+Math.round(Math.max(11,Math.min(14,w/55)))+'px sans-serif';
  ctx.fillStyle='#fff2d5';ctx.lineWidth=3;
  ctx.strokeText(copy.subtitle,w/2,y+25,Math.max(90,w-42));
  ctx.fillText(copy.subtitle,w/2,y+25,Math.max(90,w-42));
  ctx.restore();
 }
 return {draw,message,mode};
})();
