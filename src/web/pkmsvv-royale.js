/* Votri Valley — Survival Royale beta, host-authoritative within WebRTC star. */
G.Royale=(()=>{
 let active=false,roster=[],fallen={},outcome=null,lastAlive=-1;
 const sec=v=>Math.max(0,Math.floor(Number(v)||0));
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const L=(vi,en)=>G.I18n&&G.I18n.lang==='vi'?vi:en;
 function startPosition(cfg,i){
  const angle=(Number(cfg.seed)||0)*.017+i*Math.PI*2/Math.max(2,cfg.members.length);
  const radius=Math.max(600,cfg.members.length*100);
  const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius;
  for(let step=0;step<80;step++){
   const a=step*2.39996,d=Math.sqrt(step)*24,px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;
   if(G.World.isFree(px,py,20))return [px,py];
  }
  return [x,y];
 }
 function begin(cfg){active=!!(cfg&&cfg.mode==='royale');roster=active?(cfg.members||[]).map(m=>({uid:m.uid,name:String(m.name||'Trainer').slice(0,32)})):[];fallen={};outcome=null;lastAlive=-1;}
 function intensity(time){const t=sec(time);return {density:Math.min(2.55,.50+Math.pow(Math.max(0,t-45)/240,1.1)*.38),hp:1+Math.min(2.5,Math.max(0,t-85)/270),dmg:1+Math.min(1.75,Math.max(0,t-90)/390)};}
 function results(players,time){
  const t=sec(time),alive=new Set(players.filter(p=>p&&!p.dead).map(p=>p.uid)),winner=alive.size===1?[...alive][0]:null;
  const standings=roster.map(m=>{const duration=alive.has(m.uid)?t:(fallen[m.uid]===undefined?t:fallen[m.uid]);return {uid:m.uid,name:m.name,time:duration,points:duration*10+(winner===m.uid?1000:0),win:winner===m.uid};})
   .sort((a,b)=>b.points-a.points||b.time-a.time||a.name.localeCompare(b.name));
  return {winner,standings,finishedAt:t};
 }
 function check(players,time,callback){
  if(!active||outcome||time<6)return false;
  const map=new Map(players.filter(Boolean).map(p=>[p.uid,p]));
  for(const m of roster){const p=map.get(m.uid);if((!p||p.dead)&&fallen[m.uid]===undefined)fallen[m.uid]=sec(time);}
  const alive=roster.filter(m=>{const p=map.get(m.uid);return p&&!p.dead;});
  if(alive.length!==lastAlive){lastAlive=alive.length;if(G.UI&&G.UI.toast)G.UI.toast(L('Sống Còn: còn ','Survival: ')+alive.length+'/'+roster.length+L(' người',' alive'),1700);}
  if(alive.length>1)return false;
  outcome=results(players,time);callback(outcome);return true;
 }
 function finish(r){if(r&&Array.isArray(r.standings)){outcome=r;active=true;}}
 function html(r){
  if(!r||!Array.isArray(r.standings))return '';
  return '<div style="grid-column:1/-1;line-height:1.6"><b class="gold">'+L('BẢNG XẾP HẠNG SỐNG CÒN','SURVIVAL RESULTS')+'</b>'+
  '<div style="font-size:12px;color:#dbe8fc">'+L('Điểm = giây sống sót × 10; người thắng +1.000. Trận beta chưa tính xếp hạng trực tuyến.','Score = seconds survived × 10; winner +1,000. Beta matches are not part of online rankings.')+'</div>'+
  r.standings.map((p,i)=>'<div style="display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #526589;padding:5px 0"><span>#'+(i+1)+' '+esc(p.name)+(p.win?' 🏆':'')+'</span><b>'+p.points+' '+L('điểm','pts')+'</b></div>').join('')+'</div>';
 }
 function draw(ctx,w,h,players){
  if(!active||!ctx)return;
  const alive=new Set(players.filter(p=>p&&!p.dead).map(p=>p.uid));
  const time=G.Game?.st?.time||0;
  const board=results(players,time).standings.sort((a,b)=>Number(alive.has(b.uid))-Number(alive.has(a.uid))||b.points-a.points||a.name.localeCompare(b.name));
  const bounds=G.HUD?.leftBounds||{x:16,bottom:70},x=bounds.x,top=bounds.bottom+8;
  ctx.save();ctx.font='10px sans-serif';
  const statusWidth=Math.max(ctx.measureText(L('Sống','Alive')).width,ctx.measureText(L('Ngủm','Out')).width);
  const nameWidth=Math.min(130,Math.max(70,...board.map((p,i)=>ctx.measureText((i+1)+'. '+p.name).width)));
  const width=Math.min(w-x-8,Math.max(150,nameWidth+statusWidth+26));ctx.restore();
  const row=Math.max(14,Math.min(20,(h-top-120-26)/Math.max(1,board.length)));
  const height=26+row*board.length;
  ctx.save();ctx.fillStyle='rgba(8,22,53,.86)';ctx.strokeStyle='#80cfc4';ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(x,top,width,height,8);ctx.fill();ctx.stroke();
  ctx.textAlign='left';ctx.font='bold 11px sans-serif';ctx.fillStyle='#ffe089';
  ctx.fillText(L('SỐNG CÒN','SURVIVAL')+' · '+alive.size+'/'+roster.length,x+8,top+17);
  board.forEach((p,i)=>{
   const y=top+26+i*row;ctx.fillStyle=p.uid===G.Social.uid?'#ffe089':alive.has(p.uid)?'#effff6':'#9aabba';
   ctx.font='10px sans-serif';ctx.textAlign='left';ctx.fillText((i+1)+'. '+p.name,x+8,y+row*.7,width-statusWidth-24);
   ctx.textAlign='right';ctx.fillText(alive.has(p.uid)?L('Sống','Alive'):L('Ngủm','Out'),x+width-8,y+row*.7);
  });ctx.restore();
 }
 return {begin,startPosition,intensity,check,finish,html,draw,get active(){return active;},get outcome(){return outcome;},get size(){return roster.length;}};
})();
