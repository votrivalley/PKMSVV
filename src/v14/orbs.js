/* ============ orbs.js — esferas de Mundo Misterioso (de un solo uso, en la partida) ============
 * Se encuentran durante la partida (cofres, jefes, a veces al derrotar a un Pokémon)
 * y se pierden al acabarla: no se guardan ni tocan la nube.
 *
 *   4 huecos, hasta 3 de cada esfera. Si no te cabe, se queda en el suelo.
 *   Se usan con 5-8, tocando su casilla del HUD o con X (usar) / Y (cambiar) en el mando.
 *   5 s de recarga entre una y otra.
 *
 * Dos clases:
 *   foe   a los enemigos (dormir, frenar, empujar). En cooperativo las aplica el
 *         anfitrión, que es quien manda a los enemigos: el invitado le avisa ('ou').
 *   buff  a ti y a los compañeros a menos de media pantalla. Cada uno se las pone
 *         a sí mismo al recibir el aviso ('ob'), si está cerca.
 * A los jefes y legendarios les afectan menos.
 */
G.Orbs = (() => {
  const SLOTS = 4, STACK = 3, CD = 5;
  const NEAR = 384;                 // "media pantalla" (G.Camera.VIEW_W / 2)
  const PUSH = 1700, PUSH_R = 240;  // la Rafagaesfera los lleva a ~1/3 de pantalla

  const LIST = [
    { id: 'slumber', name: 'Soporesfera', kind: 'foe', col: '#b39bff',
      desc: 'Duerme a los enemigos 3 s (jefes 0,5 s).' },
    { id: 'slow', name: 'Ralentosfera', kind: 'foe', col: '#5fd0ff',
      desc: 'Enemigos 40 % más lentos 6 s (jefes 15 %).' },
    { id: 'blowback', name: 'Rafagaesfera', kind: 'foe', col: '#9ff0c0',
      desc: 'Lanza lejos a los enemigos que tienes cerca (a los jefes, la mitad).' },
    { id: 'focus', name: 'Focosfera', kind: 'buff', dur: 12, col: '#ff6f7d',
      desc: '+15 % de crítico durante 12 s, para ti y compañeros cercanos.' },
    { id: 'luminous', name: 'Luminosfera', kind: 'buff', dur: 15, col: '#ffe680',
      desc: 'Ves más campo (la cámara se aleja) durante 15 s, tú y los compañeros cercanos.' },
    { id: 'quick', name: 'Rapidosfera', kind: 'buff', dur: 8, col: '#ffb24d',
      desc: '+25 % de velocidad durante 8 s, para ti y compañeros cercanos.' }
  ];
  // SVV: original Mystery Dungeon Orbs, localized without Spanish fallback.
  const LABELS = {
    slumber:[['Cầu Ru Ngủ','Slumber Orb'],['Làm ngủ quái thường 3 giây; boss chỉ 0,5 giây.','Puts normal enemies to sleep for 3s and bosses for 0.5s.']],
    slow:[['Cầu Làm Chậm','Slow Orb'],['Giảm tốc độ quái 40% trong 6 giây; boss 15%.','Slows enemies by 40% for 6s, bosses by 15%.']],
    blowback:[['Cầu Đẩy Lùi','Blowback Orb'],['Đẩy lùi kẻ địch ở gần, boss bị giảm hiệu lực.','Pushes nearby enemies away; weaker against bosses.']],
    focus:[['Cầu Tập Trung','Focus Orb'],['Tăng 15 điểm % tỷ lệ chí mạng cho đồng đội gần trong 12 giây.','Adds 15 percentage points of critical chance to nearby teammates for 12s.']],
    luminous:[['Cầu Tầm Nhìn','Luminous Orb'],['Mở rộng góc nhìn 15 giây.','Increases camera view for 15s.']],
    quick:[['Cầu Tăng Tốc','Quick Orb'],['Tăng 25% tốc độ di chuyển trong 8 giây.','Adds 25% movement speed for 8s.']]
  };
  const tr=(id,kind=0)=>{const pair=(LABELS[id]||[])[kind];return pair?pair[G.I18n&&G.I18n.lang==='vi'?0:1]:id;};
  const BY = {};
  for (const o of LIST) BY[o.id] = o;

  let cd = 0, sel = 0;
  const seen = new Set();           // las que ya te han explicado en esta partida

  function roll() { return G.U.pick(LIST).id; }

  // ---------------- la bolsa de cada jugador (pl.orbs = 4 huecos: { id, n } o null) ----------------
  // Cada esfera se queda en su hueco (y en su tecla) aunque gastes las de al lado.

  const bag = p => p.orbs || (p.orbs = new Array(SLOTS).fill(null));

  function canTake(p, id) {
    const inv = bag(p), s = inv.find(o => o && o.id === id);
    return s ? s.n < STACK : inv.includes(null);
  }

  function add(p, id) {
    if (!BY[id] || !canTake(p, id)) return false;
    const inv = bag(p), s = inv.find(o => o && o.id === id);
    if (s) s.n++; else inv[inv.indexOf(null)] = { id, n: 1 };
    return true;
  }

  /** Quita una del hueco que la tenga. → true si la tenía. */
  function take(p, id) {
    const inv = bag(p), i = inv.findIndex(o => o && o.id === id);
    if (i < 0) return false;
    if (--inv[i].n <= 0) inv[i] = null;
    return true;
  }

  /** La has cogido tú: se ve y, la primera vez en la partida, te explica qué hace. */
  function got(pl, id) {
    if (!add(pl, id)) return;
    const o = BY[id];
    // Su casilla brilla y enseña el nombre unos segundos (hud.js).
    pl.orbNew = { i: bag(pl).findIndex(s => s && s.id === id), at: performance.now() };
    G.FX.dmgText(pl.x, pl.y - pl.bodyH - 8, tr(id), o.col, true);
    G.FX.ring(pl.x, pl.y, 6, 50, o.col, 0.4, 3);
    if (!seen.has(id)) {
      // La primera vez en la partida: qué hace y cómo se usa.
      seen.add(id);
      const i = bag(pl).findIndex(s => s && s.id === id);
      const how = G.Pad.name ? (G.I18n&&G.I18n.lang==='vi'?'X để dùng':'Press X') : G.Touch.active ? (G.I18n&&G.I18n.lang==='vi'?'chạm ô Orb':'tap an Orb slot') : ((G.I18n&&G.I18n.lang==='vi'?'phím ':'key ')+(i+5));
      G.Spawner.say(tr(id) + ' (' + how + '): ' + tr(id,1), 5);
    }
  }

  // ---------------- usar ----------------

  /** Usa la esfera del hueco i (0-3). */
  function use(pl, i) {
    const s = pl.orbs && pl.orbs[i];
    if (!s || cd > 0 || pl.dead || G.Game.state !== 'playing') {
      if (s && cd > 0) G.Audio.sfx('error');
      return;
    }
    cd = CD;
    const id = s.id, o = BY[id];
    take(pl, id);
    G.Audio.sfx('confirm');
    const z = G.Camera.zoom;
    if (o.kind === 'foe') {
      if (!G.Coop.active || G.Coop.isHost) foe(id, pl.x, pl.y, z);
      else ring(id, pl.x, pl.y);
    } else {
      buff(pl, id);
      ring(id, pl.x, pl.y, NEAR);
    }
    if (G.Coop.active && G.Coop.orbUsed) G.Coop.orbUsed(id, pl.x, pl.y, z);
  }

  /** Mando: Y pasa a la siguiente esfera que tengas, X usa la elegida. */
  function next(pl) {
    const inv = bag(pl);
    for (let k = 1; k <= SLOTS; k++) if (inv[(sel + k) % SLOTS]) { sel = (sel + k) % SLOTS; G.Audio.sfx('click'); return; }
  }
  function useSelected(pl) {
    const inv = bag(pl);
    if (!inv[sel]) next(pl);
    if (inv[sel]) use(pl, sel);
  }

  function ring(id, x, y, r = 260) { G.FX.ring(x, y, 10, r, BY[id].col, 0.6, 5); }

  /** A los enemigos que ve quien la usa (x, y con su zoom z). Sólo el anfitrión (o en solitario). */
  function foe(id, x, y, z = 1) {
    ring(id, x, y);
    const hw = G.Camera.VIEW_W / 2 * z + 60, hh = G.Camera.MIN_VIEW_H * 0.75 * z + 60;
    for (const e of G.EnemyMgr.all()) {
      if (e.dead || e.remote || e.arceus) continue;
      const dx = e.x - x, dy = e.y - y, big = e.boss || e.legend || e.judge;
      if (id === 'blowback') {
        if (dx * dx + dy * dy > PUSH_R * PUSH_R) continue;
        const [nx, ny] = G.U.norm(dx || 1, dy);
        e.kx += nx * PUSH * (big ? 0.5 : 1); e.ky += ny * PUSH * (big ? 0.5 : 1);
        continue;
      }
      if (Math.abs(dx) > hw || Math.abs(dy) > hh) continue;
      if (id === 'slumber') e.applySleep(big ? 0.5 : 3);
      else if (id === 'slow') e.applySlow(big ? 0.85 : 0.6, 6);
    }
  }

  // ---------------- mejoras con tiempo (pl.orbBuff = { id: segundos }) ----------------

  function buff(pl, id) {
    const o = BY[id];
    pl.orbBuff = pl.orbBuff || {};
    if (!(pl.orbBuff[id] > 0)) on(pl, id);
    pl.orbBuff[id] = o.dur;
    G.FX.dmgText(pl.x, pl.y - pl.bodyH - 8, tr(id), o.col, true);
  }
  function on(pl, id) {
    if (id === 'focus') pl.critChance += 0.15;
    else if (id === 'quick') pl.spdMul *= 1.25;
    else if (id === 'luminous') G.Camera.zoomTo = 1.35;
  }
  function off(pl, id) {
    if (id === 'focus') pl.critChance -= 0.15;
    else if (id === 'quick') pl.spdMul /= 1.25;
    else if (id === 'luminous') G.Camera.zoomTo = 1;
  }

  /** Cada fotograma, con tu jugador. */
  function update(dt, pl) {
    if (cd > 0) cd -= dt;
    const b = pl.orbBuff;
    if (b) for (const id in b) if (b[id] > 0 && (b[id] -= dt) <= 0) off(pl, id);
  }

  /** Al empezar o acabar una partida: fuera la cámara alejada y lo explicado. */
  function reset() {
    cd = 0; sel = 0; seen.clear();
    G.Camera.zoomTo = 1;
  }

  // ---------------- red ----------------

  /** Anfitrión: un invitado ha usado una esfera. Sólo si de verdad la tenía. */
  function onMateUse(mpl, id, x, y, z) {
    if (!BY[id] || !take(mpl, id)) return false;
    if (BY[id].kind === 'foe') foe(id, x, y, z);
    else nearBuff(id, x, y);
    return true;
  }

  /** Mejora de un compañero: si estás a menos de media pantalla, también para ti. */
  function nearBuff(id, x, y, pl = G.Game.player) {
    if (!BY[id] || BY[id].kind !== 'buff') { if (BY[id]) ring(id, x, y); return; }
    ring(id, x, y, NEAR);
    if (pl && !pl.dead && G.U.dist2(pl.x, pl.y, x, y) < NEAR * NEAR) buff(pl, id);
  }

  return { LIST, BY, SLOTS, STACK, roll, canTake, add, take, got, use, next, useSelected, update, reset,
           onMateUse, nearBuff, foe, get cd() { return cd; }, get sel() { return sel; } };
})();
