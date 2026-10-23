/* PKMSVV: shared manual dash selection between controller, HUD and mobile touch.
 * Round-robin among READY dash moves, skip cooldowns; show shortest wait if none ready.
 * State belongs to each player so subsequent runs start cleanly.
 */
G.PKMSVVDash = (() => {
  const cursor = new WeakMap();
  function preview(pl) {
    if (!pl || !Array.isArray(pl.moves)) return null;
    const moves = pl.moves.filter(m => m.kind === 'dash');
    const total = moves.length;
    if (!total) return null;
    const start = (cursor.get(pl) || 0) % total;
    for (let step = 0; step < total; step++) {
      const index = (start + step) % total;
      const move = moves[index];
      if (!(move.t > 0)) return {move,index,total,ready:true,remaining:0};
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
    cursor.set(pl,(selected.index + 1) % selected.total);
    return true;
  }
  return {preview,consume};
})();
