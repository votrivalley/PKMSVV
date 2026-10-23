/* Votri Valley — Survival Royale beta, host-authoritative within WebRTC star. */
G.Royale=(()=>{
 let active=false,roster=[],fallen={},outcome=null,lastAlive=-1;
 const sec=v=>Math.max(0,Math.floor(Number(v)||0));
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const L=(vi,en)=>G.I18n&&G.I18n.lang==='vi'?vi:en;
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
  if(alive.length!==lastAlive){lastAlive=alive.length;if(G.UI&&G.UI.toast)G.UI.toast(L('Sinh tồn: còn ','Survival: ')+alive.length+'/'+roster.length+L(' người',' alive'),1700);}
  if(alive.length>1)return false;
  outcome=results(players,time);callback(outcome);return true;
 }
 function finish(r){if(r&&Array.isArray(r.standings)){outcome=r;active=true;}}
 function html(r){
  if(!r||!Array.isArray(r.standings))return '';
  return '<div style="grid-column:1/-1;line-height:1.6"><b class="gold">'+L('BẢNG XẾP HẠNG SINH TỒN','SURVIVAL RESULTS')+'</b>'+
  '<div style="font-size:12px;color:#dbe8fc">'+L('Điểm = giây sống sót × 10; người thắng +1.000. Trận beta chưa tính xếp hạng trực tuyến.','Score = seconds survived × 10; winner +1,000. Beta matches are not part of online rankings.')+'</div>'+
  r.standings.map((p,i)=>'<div style="display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #526589;padding:5px 0"><span>#'+(i+1)+' '+esc(p.name)+(p.win?' 🏆':'')+'</span><b>'+p.points+' '+L('điểm','pts')+'</b></div>').join('')+'</div>';
 }
 function draw(ctx,w,h,players){
  if(!active||!ctx)return;
  const str=L('SINH TỒN','SURVIVAL')+'  '+players.filter(p=>p&&!p.dead).length+'/'+roster.length;
  ctx.save();ctx.font='bold 14px sans-serif';ctx.textAlign='right';ctx.fillStyle='rgba(8,22,53,.86)';
  ctx.fillRect(Math.max(0,w-205),83,190,29);ctx.fillStyle='#ffe089';ctx.fillText(str,w-26,103);ctx.restore();
 }
 return {begin,intensity,check,finish,html,draw,get active(){return active;},get outcome(){return outcome;},get size(){return roster.length;}};
})();
