/* Votri Valley — Survival Royale beta, host-authoritative within WebRTC star. */
G.Royale=(()=>{
 let active=false,roster=[],fallen={},outcome=null,lastAlive=-1,avatars=new Map();
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
 function dexOf(value){
  const dex=Number(value);
  return Number.isInteger(dex)&&dex>0&&dex<=1025?dex:25;
 }
 function portrait(uid,dex){
  const existing=avatars.get(uid);
  if(existing&&existing.dex===dex)return existing.anim;
  if(!G.Sprites?.Animator)return null;
  const anim=new G.Sprites.Animator(dex,.32,false); // same thumbnail animator as Egg Rush
  avatars.set(uid,{dex,anim});
  return anim;
 }
 function begin(cfg){
  active=!!(cfg&&cfg.mode==='royale');
  roster=active?(cfg.members||[]).map(m=>({uid:m.uid,name:String(m.name||'Trainer').slice(0,32),dex:dexOf(m.dex)})):[];
  fallen={};outcome=null;lastAlive=-1;avatars=new Map();
  if(active){
   G.Sprites?.preload?.([...new Set(roster.map(m=>m.dex))],7500);
   roster.forEach(m=>portrait(m.uid,m.dex));
  }
 }
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
  const livePlayers=(players||[]).filter(Boolean);
  const alive=new Set(livePlayers.filter(p=>!p.dead).map(p=>p.uid));
  const liveByUid=new Map(livePlayers.map(p=>[p.uid,p]));
  const time=G.Game?.st?.time||0;
  const board=results(livePlayers,time).standings.sort((a,b)=>
   Number(alive.has(b.uid))-Number(alive.has(a.uid))||b.points-a.points||a.name.localeCompare(b.name));
  const bounds=G.HUD?.leftBounds||{x:16,bottom:70};
  const x=Math.max(8,bounds.x),top=bounds.bottom+8;
  // Egg Rush proportions, widened just enough for a Pokémon sprite column.
  // Reduce row height on landscape phones to avoid covering touch controls.
  const width=Math.min(Math.max(125,w-x-8),w>=760?210:w>=460?185:160);
  const row=Math.max(13,Math.min(26,(h-top-105-26)/Math.max(1,board.length)));
  const height=26+row*board.length;
  const nameX=x+53,statusX=x+width-8;
  ctx.save();ctx.fillStyle='rgba(8,22,53,.86)';ctx.strokeStyle='#80cfc4';ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(x,top,width,height,8);ctx.fill();ctx.stroke();
  ctx.textAlign='left';ctx.font='bold 11px sans-serif';ctx.fillStyle='#ffe089';
  ctx.fillText(L('SỐNG CÒN','SURVIVAL')+' · '+alive.size+'/'+roster.length,x+8,top+17);
  board.forEach((p,i)=>{
   const y=top+26+i*row,baseline=y+row*.69,local=p.uid===G.Social?.uid;
   const isAlive=alive.has(p.uid);
   if(local){ctx.fillStyle='rgba(255,226,116,.12)';ctx.fillRect(x+3,y+1,width-6,Math.max(10,row-1));}
   ctx.textAlign='left';ctx.font='bold 10px sans-serif';
   ctx.fillStyle=local?'#ffe089':isAlive?'#effff6':'#9aabba';
   ctx.fillText(String(i+1),x+7,baseline);
   const member=roster.find(m=>m.uid===p.uid),live=liveByUid.get(p.uid);
   const dex=dexOf(live?.dex||member?.dex);
   const sprite=portrait(p.uid,dex);
   if(sprite){
    // Keep the original Egg Rush animated sprite; shrink it only when
    // ten rows must fit a short screen. Never mutate the game's real sprites.
    const scale=Math.min(1,Math.max(.55,row/25));
    ctx.save();ctx.translate(x+34,y+row*.5);ctx.scale(scale,scale);
    sprite.draw(ctx,0,3,{alpha:isAlive?1:.45});
    ctx.restore();
   }else{
    ctx.fillStyle=isAlive?'#ffe5a2':'#657789';
    ctx.beginPath();ctx.arc(x+34,y+row*.5,Math.max(2,row*.22),0,Math.PI*2);ctx.fill();
   }
   ctx.font='10px sans-serif';ctx.textAlign='left';
   ctx.fillStyle=local?'#ffe089':isAlive?'#effff6':'#9aabba';
   ctx.fillText(p.name,nameX,baseline,Math.max(20,width-53-43));
   ctx.textAlign='right';ctx.fillText(isAlive?L('Sống','Alive'):L('Ngủm','Out'),statusX,baseline);
  });
  ctx.restore();
 }
 return {begin,startPosition,intensity,check,finish,html,draw,get active(){return active;},get outcome(){return outcome;},get size(){return roster.length;}};
})();
