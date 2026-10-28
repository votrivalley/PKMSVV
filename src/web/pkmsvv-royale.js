/* Votri Valley — Survival Royale beta, host-authoritative within WebRTC star. */
G.Royale=(()=>{
 let active=false,roster=[],fallen={},outcome=null,lastAlive=-1,avatars=new Map(),hudBounds=null,expanded=false;
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
  hudBounds=null;expanded=false;
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
  const standings=roster.map(m=>{const duration=alive.has(m.uid)?t:(fallen[m.uid]===undefined?t:fallen[m.uid]);return {uid:m.uid,name:m.name,dex:m.dex,time:duration,points:duration*10+(winner===m.uid?1000:0),win:winner===m.uid};})
   .sort((a,b)=>b.points-a.points||b.time-a.time||a.name.localeCompare(b.name)||a.uid.localeCompare(b.uid));
  return {winner,standings,finishedAt:t};
 }
 function check(players,time,callback){
  if(!active||outcome||roster.length<2)return false;
  const map=new Map(players.filter(Boolean).map(p=>[p.uid,p]));
  // Wait for full roster installation, not a fixed six-second warmup.
  if(roster.some(m=>!map.has(m.uid)))return false;
  for(const m of roster){const p=map.get(m.uid);if(p.dead&&fallen[m.uid]===undefined)fallen[m.uid]=sec(time);}
  const alive=roster.filter(m=>{const p=map.get(m.uid);return p&&!p.dead;});
  if(alive.length!==lastAlive){lastAlive=alive.length;if(G.UI&&G.UI.toast)G.UI.toast(L('Sống Còn: còn ','Survival: ')+alive.length+'/'+roster.length+L(' người',' alive'),1700);}
  if(alive.length>1)return false;
  outcome=results(players,time);callback(outcome);return true;
 }
 function finish(r){if(r&&Array.isArray(r.standings)){outcome=r;active=true;}}
 function html(r){
  if(!r||!Array.isArray(r.standings))return '';
  const champion=r.standings.find(p=>p.uid===r.winner);
  return '<section class="pkmsvv-results" data-pkmsvv-results="royale" style="grid-column:1/-1">'+
   '<h3>🏆 '+L('KẾT QUẢ SỐNG CÒN','SURVIVAL RESULTS')+'</h3>'+
   '<div class="pkmsvv-results-champion">'+(champion?'👑 '+L('Vô địch: ','Winner: ')+esc(champion.name):L('Hòa · Không còn ai sống','Draw · No survivors'))+'</div>'+
   '<div class="pkmsvv-results-list">'+r.standings.map((p,i)=>{
    const dex=dexOf(p.dex),local=p.uid===G.Social?.uid;
    const mm=Math.floor(p.time/60)+':'+String(p.time%60).padStart(2,'0');
    return '<div class="pkmsvv-result-row'+(local?' pkmsvv-result-me':'')+(p.win?' pkmsvv-result-winner':'')+'">'+
     '<strong class="pkmsvv-result-rank">#'+(i+1)+'</strong>'+
     '<canvas class="pkmsvv-result-mon" width="48" height="48" data-pkmsvv-result-dex="'+dex+'" aria-label="Pokémon #'+dex+'"></canvas>'+
     '<span class="pkmsvv-result-name">'+esc(p.name)+'</span>'+
     '<b class="pkmsvv-result-stat">'+mm+' · '+p.points+' '+L('đ','pts')+'</b></div>';
   }).join('')+'</div></section>';
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
  const x=Math.max(8,bounds.x),top=Math.max(8,Math.min(bounds.bottom+8,h-82));
  // One-row summary by default, on desktop and landscape mobile alike.
  // Expanded list uses the same 10 animated sprites as previous releases.
  const width=Math.min(Math.max(125,w-x-8),expanded?(w>=760?205:w>=460?185:160):(w>=760?188:170));
  const row=expanded?Math.max(11,Math.min(26,(h-top-126)/Math.max(1,board.length))):27;
  const height=26+row*(expanded?board.length:1);
  hudBounds={x,right:x+width,top,bottom:top+height};
  ctx.save();ctx.fillStyle='rgba(8,22,53,.67)';ctx.strokeStyle='rgba(128,207,196,.7)';ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(x,top,width,height,8);ctx.fill();ctx.stroke();
  ctx.textAlign='left';ctx.font='bold 11px sans-serif';ctx.fillStyle='#ffe089';
  ctx.fillText(L('SỐNG CÒN','SURVIVAL')+' · '+alive.size+'/'+roster.length,x+8,top+17,width-30);
  ctx.textAlign='right';ctx.fillText(expanded?'▴':'▾',x+width-8,top+17);
  const entries=expanded?board:[board.find(p=>p.uid===G.Social?.uid)||board[0]].filter(Boolean);
  entries.forEach((p,i)=>{
   const y=top+26+i*row,baseline=y+row*.69,local=p.uid===G.Social?.uid,isAlive=alive.has(p.uid);
   if(local){ctx.fillStyle='rgba(255,226,116,.12)';ctx.fillRect(x+3,y+1,width-6,Math.max(10,row-1));}
   ctx.textAlign='left';ctx.font='bold 10px sans-serif';
   ctx.fillStyle=local?'#ffe089':isAlive?'#effff6':'#9aabba';
   const position=board.findIndex(m=>m.uid===p.uid)+1;
   ctx.fillText(String(position),x+7,baseline);
   const member=roster.find(m=>m.uid===p.uid),live=liveByUid.get(p.uid),dex=dexOf(live?.dex||member?.dex),sprite=portrait(p.uid,dex);
   if(sprite){
    const scale=Math.min(1,Math.max(.55,row/25));
    ctx.save();ctx.translate(x+34,y+row*.5);ctx.scale(scale,scale);
    sprite.draw(ctx,0,3,{alpha:isAlive?1:.45});ctx.restore();
   }else{
    ctx.fillStyle=isAlive?'#ffe5a2':'#657789';ctx.beginPath();
    ctx.arc(x+34,y+row*.5,Math.max(2,row*.22),0,Math.PI*2);ctx.fill();
   }
   ctx.font='10px sans-serif';ctx.textAlign='left';
   ctx.fillStyle=local?'#ffe089':isAlive?'#effff6':'#9aabba';
   ctx.fillText(local?L('Bạn','You'):p.name,x+49,baseline,Math.max(20,width-49-43));
   ctx.textAlign='right';ctx.fillText(isAlive?L('Sống','Alive'):L('Ngủm','Out'),x+width-7,baseline);
  });
  ctx.restore();
  if(G.Game?.player?.dead&&!G.PKMSVVDeathHUD){
   ctx.save();ctx.textAlign='center';ctx.font='bold 17px sans-serif';
   ctx.lineWidth=4;ctx.strokeStyle='rgba(0,0,0,.75)';ctx.fillStyle='#ffb7be';
   const msg=L('Bạn đã bị loại!','You are eliminated!');
   ctx.strokeText(msg,w/2,h*.58,Math.max(100,w-80));
   ctx.fillText(msg,w/2,h*.58,Math.max(100,w-80));ctx.restore();
  }
  // Touch's existing canvas button system also supports a mouse click.
  // HUD clears registered buttons each frame, so this registers only once.
  G.Touch?.addButton?.(x,top,width,height,()=>{expanded=!expanded;},0);
 }
 return {begin,startPosition,intensity,check,finish,html,draw,get hudBounds(){return hudBounds;},get expanded(){return expanded;},get active(){return active;},get outcome(){return outcome;},get size(){return roster.length;}};
})();
