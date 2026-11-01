/* Pokémon Sống Sót v1.4 — Mystery Orbs FIFO
 * Mystery Orbs are collectible from the beginning of EVERY match for every player.
 * 10-orb queue, consume in pickup order, 5s between uses, never saved to Cloud.
 * All enemy control effects are weaker on bosses; Arceus always immune.
 */
G.Orbs=(()=>{
 const MAX=10,CD=5,NEAR=384,PUSH=1200,PUSH_R=215;
 const LIST=[
  {id:'slumber',col:'#b39bff',kind:'foe',name:['Cầu Ru Ngủ','Slumber Orb'],desc:['Ru ngủ quái 3 giây, boss 0,5 giây.','Sleep normal enemies 3s, bosses 0.5s.']},
  {id:'slow',col:'#5fd0ff',kind:'foe',name:['Cầu Làm Chậm','Slow Orb'],desc:['Làm chậm quái 40% trong 6 giây, boss 15%.','Slow normal enemies 40% for 6s, bosses 15%.']},
  {id:'blowback',col:'#9ff0c0',kind:'foe',name:['Cầu Đẩy Lùi','Blowback Orb'],desc:['Đẩy quái quanh bạn, boss chịu tác dụng yếu hơn.','Push nearby enemies away, weaker against bosses.']},
  {id:'focus',col:'#ff6f7d',kind:'buff',dur:12,name:['Cầu Tập Trung','Focus Orb'],desc:['Tăng 15 điểm % chí mạng trong 12 giây.','Increase critical chance by 15 percentage points for 12s.']},
  {id:'luminous',col:'#ffe680',kind:'buff',dur:15,name:['Cầu Tầm Nhìn','Luminous Orb'],desc:['Mở rộng tầm nhìn trong 15 giây.','Widen the camera view for 15s.']},
  {id:'quick',col:'#ffb24d',kind:'buff',dur:8,name:['Cầu Tăng Tốc','Quick Orb'],desc:['Tăng 25% tốc độ di chuyển trong 8 giây.','Move 25% faster for 8s.']}
 ];
 const BY=Object.fromEntries(LIST.map(o=>[o.id,o]));
 const vi=()=>G.I18n&&G.I18n.lang==='vi',tr=p=>p[vi()?0:1];
 let cd=0,seen=new Set(),unlockedRun=false,firstDrops=new WeakSet();
 let visionBase=null;
 // Unlike zoomTo (which the pinned game's Camera never consumes), resize()
 // actually changes the visible world area on PC, mobile and Switch.
 function vision(mult){
  const c=G.Camera;
  if(!c||!Number.isFinite(c.VIEW_W)||!Number.isFinite(c.MIN_VIEW_H))return;
  if(!visionBase)visionBase={w:c.VIEW_W,h:c.MIN_VIEW_H};
  const cssW=c.w*c.scale,cssH=c.h*c.scale;
  c.VIEW_W=visionBase.w*mult;
  c.MIN_VIEW_H=visionBase.h*mult;
  if(typeof c.resize==='function'&&Number.isFinite(cssW)&&cssW>0&&Number.isFinite(cssH)&&cssH>0)
   c.resize(cssW,cssH,c.dpr||1);
  c.zoomTo=mult;
 }
 const queue=p=>p.orbs||(p.orbs=[]);
 const hasEightSkills=p=>!!(p&&p.slots&&p.maxMoves>=8&&p.slots.length>=8);
 const ready=p=>!!p; // Orb collection/use no longer requires maxed-out moves.
 const eligible=p=>!!p;
 function canTake(p,id){return !!BY[id]&&eligible(p)&&queue(p).length<MAX;}
 function add(p,id){if(!canTake(p,id))return false;queue(p).push(id);return true;}
 function take(p,id){const q=queue(p);if(q[0]!==id)return false;q.shift();return true;}
 const roll=()=>G.U.pick(LIST).id;
 function notifyUnlock(p){
  if(!hasEightSkills(p)||unlockedRun)return;
  unlockedRun=true;
  if(G.DB&&G.DB.save){
   const stats=G.DB.save.stats||(G.DB.save.stats={});
   stats.pkmsvvEightSkills=1;
   if(G.Progress&&G.Progress.checkAch)G.Progress.checkAch();
  }
  if(G.PKMSVVStory&&G.PKMSVVStory.markChapter2)G.PKMSVVStory.markChapter2();
  if(G.Spawner&&G.Spawner.say)G.Spawner.say(vi()?'Đã học đủ 8 kỹ năng!':'All 8 skills learned!',4,true);
 }
 function got(p,id){
  if(!add(p,id))return false;
  if(G.DB&&G.DB.save&&p===G.Game.player){
   const stats=G.DB.save.stats||(G.DB.save.stats={});
   stats.pkmsvvOrbsPicked=Math.min(1000000,(stats.pkmsvvOrbsPicked||0)+1);
   if(G.Progress&&G.Progress.checkAch)G.Progress.checkAch();
  }
  const o=BY[id],hint=G.Pad&&G.Pad.name&&G.PKMSVVPadOrb?G.PKMSVVPadOrb.describe('use'):vi()?'phím '+String(G.Input?.bound?.('orb')||'digit4').replace(/^(digit|key|numpad)/,'').toUpperCase()+' / chạm ô Orb':'key '+String(G.Input?.bound?.('orb')||'digit4').replace(/^(digit|key|numpad)/,'').toUpperCase()+' / tap Orb';
  if(G.FX){G.FX.dmgText(p.x,p.y-(p.bodyH||0)-8,tr(o.name),o.col,true);G.FX.ring(p.x,p.y,6,40,o.col,.35,3);}
  if(!seen.has(id)&&G.Spawner){seen.add(id);G.Spawner.say(tr(o.name)+' ('+hint+'): '+tr(o.desc),5);}
  return true;
 }
 function ring(id,x,y,r=240){if(G.FX)G.FX.ring(x,y,10,r,BY[id].col,.6,5);}
 function foe(id,x,y,z=1){
  ring(id,x,y);
  const zoom=Number.isFinite(z)&&z>0?Math.min(z,2):1;
  const cw=Number.isFinite(G.Camera.w)&&G.Camera.w>0?G.Camera.w:G.Camera.VIEW_W;
  const ch=Number.isFinite(G.Camera.h)&&G.Camera.h>0?G.Camera.h:G.Camera.MIN_VIEW_H;
  const hw=(cw||768)/2*zoom+60,hh=(ch||420)/2*zoom+60;
  for(const e of G.EnemyMgr.all()){
   if(e.dead||e.remote||e.arceus)continue;
   const dx=e.x-x,dy=e.y-y,big=e.boss||e.legend||e.judge;
   if(id==='blowback'){
    if(dx*dx+dy*dy>PUSH_R*PUSH_R)continue;
    const [nx,ny]=G.U.norm(dx||1,dy);
    e.kx+=nx*PUSH*(big?.4:1);e.ky+=ny*PUSH*(big?.4:1);
   }else if(Math.abs(dx)<=hw&&Math.abs(dy)<=hh){
    if(id==='slumber')e.applySleep(big?.5:3);
    else if(id==='slow')e.applySlow(big?.15:.4,6);
   }
  }
 }
 function buff(pl,id){
  const o=BY[id];pl.orbBuff=pl.orbBuff||{};
  if(!(pl.orbBuff[id]>0)){
   if(id==='focus')pl.critChance+=.15;
   else if(id==='quick')pl.spdMul*=1.25;
   else if(id==='luminous')vision(1.35);
  }
  // Refresh a buff rather than stacking bonuses on a second use.
  pl.orbBuff[id]=o.dur;
  if(G.FX)G.FX.dmgText(pl.x,pl.y-(pl.bodyH||0)-8,tr(o.name),o.col,true);
 }
 function useNext(pl){
  if(!eligible(pl)||!queue(pl).length||cd>0||pl.dead||G.Game.state!=='playing')return false;
  const id=queue(pl).shift(),o=BY[id];if(!o)return false;
  if(G.DB&&G.DB.save&&pl===G.Game.player){
   const stats=G.DB.save.stats||(G.DB.save.stats={});
   stats.pkmsvvOrbsUsed=Math.min(1000000,(stats.pkmsvvOrbsUsed||0)+1);
   const idx=LIST.findIndex(v=>v.id===id);
   if(idx>=0)stats.pkmsvvOrbTypeMask=((stats.pkmsvvOrbTypeMask||0)|(1<<idx))&63;
   if((stats.pkmsvvOrbTypeMask&63)===63&&G.PKMSVVStory&&G.PKMSVVStory.markChapter3)G.PKMSVVStory.markChapter3();
   if(G.Progress&&G.Progress.checkAch)G.Progress.checkAch();
  }
  cd=CD;if(G.Audio)G.Audio.sfx('confirm');
  const z=Number.isFinite(G.Camera.zoom)&&G.Camera.zoom>0?G.Camera.zoom:1;
  if(o.kind==='foe'){
   if(!G.Coop.active||G.Coop.isHost)foe(id,pl.x,pl.y,z);
   else ring(id,pl.x,pl.y);
  }else{buff(pl,id);ring(id,pl.x,pl.y,NEAR);}
  if(G.Coop.active&&G.Coop.orbUsed)G.Coop.orbUsed(id,pl.x,pl.y,z);
  return true;
 }
 function update(dt,pl){
  cd=Math.max(0,cd-dt);
  // Every participant can receive an Orb from the very start. In Co-op
  // only the host drops it; spawn is counted toward the shared 10-drop cap.
  if(!G.Coop.active||G.Coop.isHost){
   const members=G.Coop.active?G.Coop.players():[pl];
   if(Array.isArray(members)&&G.Pickups&&G.Pickups.dropFirstOrb)
    for(const member of members){
     if(!member||member.dead||!eligible(member)||firstDrops.has(member))continue;
     if(G.Pickups.dropFirstOrb(member.x+38,member.y,roll()))firstDrops.add(member);
    }
  }
  if(pl){notifyUnlock(pl);const b=pl.orbBuff;if(b)for(const id in b)if(b[id]>0&&(b[id]-=dt)<=0){
   if(id==='focus')pl.critChance-=.15;
   else if(id==='quick')pl.spdMul/=1.25;
   else if(id==='luminous')vision(1);
   b[id]=0;
  }}
 }
 function reset(){cd=0;seen.clear();unlockedRun=false;firstDrops=new WeakSet();vision(1);}
 function onMateUse(p,id,x,y,z){
  if(!eligible(p)||!BY[id]||!take(p,id))return false;
  if(BY[id].kind==='foe')foe(id,x,y,z);else nearBuff(id,x,y);
  return true;
 }
 function nearBuff(id,x,y,pl=G.Game.player){
  if(!BY[id])return;
  ring(id,x,y,BY[id].kind==='buff'?NEAR:240);
  if(BY[id].kind==='buff'&&pl&&!pl.dead&&G.U.dist2(pl.x,pl.y,x,y)<NEAR*NEAR)buff(pl,id);
 }
 return {LIST,BY,MAX,roll,ready,eligible,hasEightSkills,canTake,add,take,got,useNext,update,reset,foe,onMateUse,nearBuff,
  get cd(){return cd;},get unlockedRun(){return unlockedRun;}};
})();