/* PKMSVV Web/Android/PC: first non-destructive 3DS skill/effect parity pass.
 * Adapted from PokéSurvivor3DS v1.0.0 levelup.cpp and fx.cpp.
 * © original PokéSurvivor JPTER78; 3DS port juanluismm521.
 * PolyForm Noncommercial 1.0.0; keep original notices and credits.
 *
 * The older shared Web engine ALREADY has ring/slash/beam/VFX. Do not copy
 * 3DS GPU sprites or replace G.FX; reuse those pixel-effect primitives.
 * Register six missing in-run passive cards, with the native numerical
 * deltas and capped visual confirmation. No permanent save changes.
 */
G.PKMSVV3DSSkillPort = (() => {
  'use strict';
  const api = {};
  const stats = G.LevelUp && G.LevelUp.STATS;
  const cards = Array.isArray(stats) ? stats : null;
  const T = (vi, en) => (G.I18n && G.I18n.lang === 'vi') ? vi : en;
  const safeFx = () => G.FX || null;
  const fxPick = (p, color, tag) => {
    const fx = safeFx();
    if (!fx || !p) return;
    const x = Number(p.x) || 0, y = Number(p.y) || 0;
    fx.ring?.(x, y, 5, 42, color, 0.34, 2.5);
    fx.burst?.(x, y - (Number(p.bodyH) || 20) * 0.5, color, 5, 65);
    fx.dmgText?.(x, y - (Number(p.bodyH) || 20) - 8, tag, color, false);
  };
  function add(def) {
    if (!cards || cards.some(card => card.id === def.id)) return false;
    cards.push({
      id: def.id, icon: def.icon, max: def.max, pkmsvv3ds: true,
      get title() { return T(def.vi, def.en); },
      get desc() { return T(def.descVi, def.descEn); },
      apply(p) {
        if (!p) return;
        def.apply(p);
        fxPick(p, def.color, T('PASSIVE', 'PASSIVE'));
      }
    });
    return true;
  }
  const cap = (v, hi) => Math.min(hi, Math.max(0, Number(v) || 0));
  const stack = (p, key, factor) => {
    const n = Math.max(0, Number(p.statsTaken?.[key]) || 0);
    // Like 3DS stack(): additive 1 + factor*n, not an exponential loop.
    const before = 1 + factor * n, after = 1 + factor * (n + 1);
    return before > 0 ? after / before : 1;
  };
  const defs = [
    { id:'crit', icon:'fist', max:10, color:'#ffb34d',
      vi:'Mắt Chí Mạng', en:'Critical Eye',
      descVi:'+2% tỉ lệ chí mạng trong trận.', descEn:'+2% critical hit chance this run.',
      apply:p=>{p.critChance=cap((p.critChance||0)+0.02,0.50);} },
    { id:'critd', icon:'fist', max:10, color:'#ff8d6c',
      vi:'Đòn Hiểm', en:'Brutal Hit',
      descVi:'+5% sát thương đòn chí mạng.', descEn:'+5% critical damage.',
      apply:p=>{p.pkmsvv3dsCritDmg=cap((p.pkmsvv3dsCritDmg||0)+0.05,0.50);} },
    { id:'hunt', icon:'book', max:10, color:'#ffe188',
      vi:'Thợ Săn Boss', en:'Hunter',
      descVi:'+6% sát thương lên boss trong trận.', descEn:'+6% damage against bosses this run.',
      apply:p=>{p.pkmsvv3dsBossDmg=cap((p.pkmsvv3dsBossDmg||0)+0.06,0.60);} },
    { id:'dodge', icon:'shield', max:5, color:'#8de4ff',
      vi:'Né Tránh', en:'Evasion',
      descVi:'+3% xác suất né đòn, tối đa 15%.', descEn:'+3% chance to dodge, maximum 15%.',
      apply:p=>{p.pkmsvv3dsDodge=cap((p.pkmsvv3dsDodge||0)+0.03,0.15);} },
    { id:'luck', icon:'magnet', max:10, color:'#fff0a4',
      vi:'Lộc May Mắn', en:'Lucky Streak',
      descVi:'+10% Pokémonedas nhặt được (cộng dồn tuyến tính).',
      descEn:'+10% collected PokéCoins (additive stacking).',
      apply:p=>{p.coinMul=(Number(p.coinMul)||1)*stack(p,'luck',0.10);} },
    { id:'coin', icon:'book', max:5, color:'#ffda72',
      vi:'Túi Pokémonedas', en:'Coin Pouch',
      descVi:'Nhận ngay 60 Pokémonedas trong trận.', descEn:'Immediately gain 60 PokéCoins this run.',
      apply:p=>{p.coins=(Number(p.coins)||0)+60;} }
  ];
  api.register = () => cards ? defs.reduce((n, d) => n + Number(add(d)), 0) : 0;
  api.offerCount = p => (p && (p.level >= 25 || (p.moves && p.moves.length >= 8))) ? 4 : 3;
  api.minimumPassiveCards = p => api.offerCount(p) === 4 ? 2 : 0;
  api.rollDodge = (p, roll = Math.random) =>
    !!p && (Number(p.pkmsvv3dsDodge) || 0) > 0 && roll() < cap(p.pkmsvv3dsDodge,0.15);
  api.onDodge = p => {
    const fx = safeFx();
    if (!fx || !p) return;
    fx.ring?.(p.x, p.y, 4, 38, '#8de4ff', 0.22, 2);
    fx.sp?.('streak', 'flying', p.x, p.y - (p.bodyH || 20) * 0.5,
      { life:0.17, scale:1.15 });
    fx.dmgText?.(p.x, p.y - (p.bodyH || 20) - 4, T('NÉ!', 'DODGE!'), '#8de4ff', false);
  };
  api.onCrit = (p, e) => {
    const fx = safeFx();
    if (!fx || !p || !e) return;
    const now = (typeof performance !== 'undefined' && performance.now)
      ? performance.now() : Date.now();
    // No per-projectile particle storms when eight skills are auto-casting.
    if (now - (p.pkmsvv3dsLastCritFxAt || -1000) < 140) return;
    p.pkmsvv3dsLastCritFxAt = now;
    fx.sp?.('impact', 'fighting', e.x, e.y - (e.bodyH || 20) * 0.5,
      { life:0.17, scale:1.2, frameRate:12 });
    fx.spark?.(e.x, e.y, '#ffb34d', e.x - p.x, e.y - p.y, 3);
  };
  api.bossMultiplier = (p, e) =>
    (e && e.boss) ? 1 + cap(p?.pkmsvv3dsBossDmg,0.60) : 1;
  api.critMultiplier = p => 1.5 + cap(p?.pkmsvv3dsCritDmg,0.50);
  api.register();
  return api;
})();
