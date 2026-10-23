/* PKMSVV v1.2 balance hotfix — responsive 103 auto-cast moves and useful cycle buffs.
 * Never changes names, damage, sprite data, move pool, or evolved attack bonuses.
 * Cooldown tuning runs AFTER game moves definitions and BEFORE a run begins.
 */
G.PKMSVVBalance = (() => {
  const profiles = {
    melee:      {base:0.46,scale:0.95,min:0.85,max:1.5,floor:0.48},
    projectile: {base:0.58,scale:0.9,min:0.94,max:1.58,floor:0.55},
    homing:     {base:0.66,scale:0.98,min:1.02,max:1.68,floor:0.62},
    bounce:     {base:0.75,scale:0.95,min:1.15,max:1.9,floor:0.68},
    cone:       {base:0.8,scale:0.95,min:1.2,max:2,floor:0.7},
    beam:       {base:0.78,scale:1.05,min:1.32,max:2.3,floor:0.8},
    nova:       {base:1.02,scale:1.08,min:1.65,max:2.7,floor:0.9},
    boomerang:  {base:0.8,scale:1.05,min:1.26,max:2,floor:0.75},
    chain:      {base:0.94,scale:1.05,min:1.6,max:2.55,floor:0.85},
    aura:       {base:0.45,scale:1,min:0.8,max:1.3,floor:0.45},
    orbit:      {base:0.34,scale:1,min:0.55,max:0.78,floor:0.45},
    mine:       {base:1.65,scale:0.85,min:2.1,max:3.4,floor:1.2},
    meteor:     {base:1.7,scale:0.95,min:2.4,max:3.65,floor:1.3},
    turret:     {base:3,scale:0.85,min:4.8,max:6.4,floor:2.2},
    trail:      {base:1.55,scale:0.9,min:2.1,max:3,floor:1.1},
    dash:       {base:1.35,scale:0.9,min:1.95,max:2.65,floor:1.1},
    charge:     {base:1.65,scale:0.95,min:2.5,max:3.6,floor:1.3},
    spin:       {base:0.9,scale:0.95,min:1.4,max:2.25,floor:0.85},
    quake:      {base:1.4,scale:1,min:2.25,max:3.3,floor:1.15},
    vortex:     {base:1.9,scale:1,min:2.9,max:4.5,floor:1.5},
    stun:       {base:1.65,scale:0.95,min:2.4,max:3.6,floor:1.2},
    shove:      {base:0.92,scale:1,min:1.45,max:2.4,floor:0.8},
    buff:       {base:8.5,scale:0,min:8.5,max:8.5,floor:7.8},
  };
  const moveDefs = Object.values(G.Moves.BY_ID);
  if (moveDefs.length !== 103 || Object.keys(profiles).length !== 23)
    throw Error('PKMSVV: unexpected upstream move pool; check rebalance before release.');
  const original = {};
  for (const m of moveDefs) {
    const p = profiles[m.kind];
    if (!p || !Number.isFinite(m.cd)) throw Error('PKMSVV: missing cooldown policy for ' + m.id);
    original[m.id] = m.cd;
    const initial = p.base + m.cd * p.scale;
    const volume = m.kind === 'nova' || m.kind === 'cone' ? Math.max(0, (m.count || 1) - 5) * 0.018 : 0;
    m.cd = Math.round(Math.max(p.min, Math.min(p.max, initial + volume)) * 100) / 100;
    if (m.kind === 'buff') {
      // A single non-stacking buff must be worthwhile in a six-move build.
      m.amount = Math.round(m.amount * 1.4 * 1000) / 1000;
      m.stacks = 1;
      m.ups = [
        { t:'Duy trì lâu hơn 25%',m:{dur:1.25} },
        { t:'Hiệu lực buff mạnh hơn 20%',m:{amount:1.20} },
        { t:'Duy trì lâu hơn 30%',m:{dur:1.30} },
        { t:'Duy trì vĩnh viễn (không cộng dồn)',m:{} }
      ];
      m.maxLvl = m.ups.length + 1;
    }
  }

  function effectiveCooldown(pl, m) {
    if (m.kind === 'buff') {
      // Most boosts begin at 7 s duration. Keep a short rest instead of
      // 9 seconds of downtime; upgrading duration still matters.
      // Honor moderate haste, but never recast before the effect expires.
      const haste = Math.max(0.75, Math.min(1.5, Number(pl.cdMul) || 1));
      return Math.max(m.dur + 0.8, m.cd * haste, profiles.buff.floor);
    }
    return Math.max(profiles[m.kind].floor, m.cd * Math.max(0.01, Number(pl.cdMul) || 1));
  }
  // Original Bond rewards collapse multiple moves into one active slot.
  // Votri Valley already auto-casts every learned move, so grant a capped
  // team resonance instead, while retaining bonus slots and a little haste.
  function rewardRift(pl) {
    if (!pl) return {stacks:0,slots:0};
    // Rift resonance buffs remain; slot capacity is controlled by permanent account milestones.
    pl.cdMul *= 0.96;
    const before = Math.min(3, Math.max(0, pl.pkmsvvResonance || 0));
    pl.pkmsvvResonance = Math.min(3, before + 1);
    if (before < 3) pl.atkMul *= 1.08;
    return {stacks:pl.pkmsvvResonance, slots:pl.maxMoves, strengthened:before < 3};
  }
  function refreshBuff(pl, m) {
    if (m.kind !== 'buff' || m.lvl < m.def.maxLvl) return false;
    const b = pl.buffs && pl.buffs[m.stat];
    if (!b) return false;
    if (b.n === 1 && b.amount >= m.amount && b.t === Infinity) return true;
    b.amount = Math.max(b.n > 0 ? b.amount : 0, m.amount);
    b.n = 1;
    b.t = Infinity;
    m.t = Infinity;
    return true;
  }
  const audit = () => moveDefs.map(m => ({
    id:m.id,name:m.name,kind:m.kind,originalCd:original[m.id],
    baseCd:m.cd,minEffective:profiles[m.kind].floor,
    duration:m.kind==='buff'?m.dur:null,
    uptime:m.kind==='buff'?Math.round(m.dur/m.cd*100):null,
    maxLvl:m.maxLvl
  }));
  return {profiles,effectiveCooldown,refreshBuff,rewardRift,audit};
})();
