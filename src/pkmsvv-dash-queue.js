/* PKMSVV: shared manual dash selection between controller, HUD and mobile touch.
 * Round-robin among READY dash moves, skip cooldowns; show shortest wait if none ready.
 * State belongs to each player so subsequent runs start cleanly.
 */
G.PKMSVVDash = (() => {
  const cursor = new WeakMap();
  const motions = new WeakMap();
  const locks = new WeakMap();
  const LOCK_MS = 650; // two separate dash skills cannot chain invulnerability
  const PROFILES = Object.freeze({
    'quick-attack': { speed: 1260, range: .94, bonus: null },
    'aerial-ace':  { speed: 1050, range: 1.04, bonus: null },
    'flame-charge':{ speed: 820,  range: 1.00, bonus: null },
    'u-turn':      { speed: 980,  range: 1.00, bonus: 'reposition' }
  });
  function now(){return typeof performance!=='undefined'?performance.now():Date.now();}
  // MOVE vector always wins. Enemy lock-on aim MUST NEVER steer an evasive dash.
  function direction(pl,axis){
    const x=Number(axis&&axis[0])||0,y=Number(axis&&axis[1])||0;
    if(Math.hypot(x,y)>.15)return Math.atan2(y,x);
    return Number.isFinite(pl&&pl.moveAngle)?pl.moveAngle:0;
  }
  function readyIn(pl){return Math.max(0,((locks.get(pl)||0)-now())/1000);}
  function canUse(pl){return !!pl&&readyIn(pl)<=0;}
  function profile(m){return PROFILES[m&&m.id]||{speed:940,range:1,bonus:null};}
  function begin(pl,m,angle,length){
    if(!pl||!Number.isFinite(angle)||!Number.isFinite(length)||length<=0)return;
    const p=profile(m);
    motions.set(pl,{angle,left:length,speed:p.speed,bonus:p.bonus});
  }
  function advance(pl,dt){
    const a=motions.get(pl);if(!a)return false;
    const step=Math.min(a.left,Math.max(0,dt)*a.speed);
    const dx=Math.cos(a.angle),dy=Math.sin(a.angle);
    let travelled=0,blocked=false;
    for(let d=Math.min(8,step);d<=step+.0001;d=Math.min(step,d+8)){
      if(!G.World.isFree(pl.x+dx*(d-travelled),pl.y+dy*(d-travelled),pl.r*.8,true)){blocked=true;break;}
      const inc=d-travelled;pl.x+=dx*inc;pl.y+=dy*inc;travelled=d;
      if(d>=step-.0001)break;
    }
    a.left-=travelled;
    if(travelled>0){
      G.World.collide(pl);
      pl.invuln=Math.max(pl.invuln||0,Math.min(.22,dt+.09));
      pl.moveAngle=a.angle;
    }
    if(blocked||a.left<=.25||step<=0){
      motions.delete(pl);
      if(a.bonus==='reposition')pl.pkmsvvUTurnUntil=now()+900;
    }
    return true;
  }
  function preview(pl) {
    if (!pl || !Array.isArray(pl.moves)) return null;
    const moves = pl.moves.filter(m => m.kind === 'dash');
    const total = moves.length;
    if (!total) return null;
    const start = (cursor.get(pl) || 0) % total;
    for (let step = 0; step < total; step++) {
      const index = (start + step) % total;
      const move = moves[index];
      if (!(move.t > 0)) {
        const rest=readyIn(pl);
        return {move,index,total,ready:rest<=0,remaining:rest};
      }
    }
    let index = start;
    for (let step = 1; step < total; step++) {
      const i = (start + step) % total;
      if (moves[i].t < moves[index].t) index = i;
    }
    return {move:moves[index],index,total,ready:false,remaining:Math.max(0,moves[index].t)};
  }
  function consume(pl,selected) {
    if (!selected || !selected.ready || !pl) return false;
    if(!canUse(pl))return false;
    cursor.set(pl,(selected.index + 1) % selected.total);
    locks.set(pl,now()+LOCK_MS);
    return true;
  }
  return {preview,consume,direction,begin,advance,profile,canUse,readyIn,LOCK_MS,PROFILES};
})();
