'use strict';

/**
 * Patch a clean, pinned upstream checkout. Exact-match anchors fail closed.
 * Added Pokemon evolution uses independently catalogued offline PokeAPI rules.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const project = path.join(__dirname, '..');
const game = path.join(project, 'vendor', 'pokesurvivor');
const cfg = JSON.parse(fs.readFileSync(path.join(project, 'config', 'gameplay.json'), 'utf8'));

if (!fs.existsSync(path.join(game, 'dev.html')) || !fs.existsSync(path.join(game, 'LICENSE-NONCOMMERCIAL.md'))) {
  throw new Error('Chưa có mã nguồn gốc tại vendor/pokesurvivor. Hãy clone upstream theo README.');
}
function num(value, min, max, label, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new Error('Cấu hình không hợp lệ: ' + label + ' (phải trong khoảng ' + min + '–' + max + ')');
  }
  return value;
}
const hp = num(cfg.player.hpMultiplier, .5, 3, 'player.hpMultiplier');
const atk = num(cfg.player.damageMultiplier, .5, 4, 'player.damageMultiplier');
const speed = num(cfg.player.speedMultiplier, .5, 2, 'player.speedMultiplier');
const cap = num(cfg.enemies.maxAlive, 16, 300, 'enemies.maxAlive', true);
const density = num(cfg.enemies.density, .05, 1, 'enemies.density');
const enemyDmg = num(cfg.enemies.damageMultiplier, .2, 5, 'enemies.damageMultiplier');
const xp = num(cfg.enemies.xpMultiplier, .2, 12, 'enemies.xpMultiplier');
const coins = num(cfg.progression.startingCoins, 0, 100000, 'progression.startingCoins', true);
const wild = num(cfg.shiny.wildDenominator, 1, 20000, 'shiny.wildDenominator', true);
const gacha = num(cfg.shiny.gachaDenominator, 1, 10000, 'shiny.gachaDenominator', true);

function patch(rel, before, after) {
  const file = path.join(game, rel);
  const original = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const parts = original.split(before);
  if (parts.length !== 2) throw new Error('Không tìm thấy chính xác một vị trí cần chỉnh trong ' + rel + ': ' + before);
  fs.writeFileSync(file, parts.join(after), 'utf8');
}
patch('js/entities/player.js', 'this.atkMul = perks.atkMul || 1;', 'this.atkMul = (perks.atkMul || 1) * ' + atk + ';');
patch('js/entities/player.js', 'this.spdMul = perks.spdMul || 1;', 'this.spdMul = (perks.spdMul || 1) * ' + speed + ';');
patch('js/entities/player.js', 'this.maxHp = mon.hp + (perks.hp || 0);', 'this.maxHp = Math.round((mon.hp + (perks.hp || 0)) * ' + hp + ');');
patch('js/systems/spawner.js', 'const CAP = 64, ELITE_FROM = 0.85;', 'const CAP = ' + cap + ', ELITE_FROM = 0.90;');
patch('js/systems/spawner.js', 'const DENSITY = 0.24, DMG_K = 2.4, XP_K = 5.6;', 'const DENSITY = ' + density + ', DMG_K = ' + enemyDmg + ', XP_K = ' + xp + ';');
patch('js/systems/spawner.js', 'const SHINY_RATE = 1 / 4096;', 'const SHINY_RATE = 1 / ' + wild + ';');

// PKMSVV v1.2 accessibility retune: no sudden difficulty cliff at 03:00.
// First three minutes remain 2/3 of the normal enemy rate. Gently restore
// from 03:00 to 10:00, including waves and event bursts. Later play is intact.
patch('js/systems/spawner.js',
  '  function rate(t) {\n    return (1.6 + t * 0.028 + Math.pow(t / 60, 1.6) * 0.5) * DENSITY;\n  }',
  '  const openingSpawnFactor = t => t <= 180 ? 2 / 3 : t >= 600 ? 1 : 2 / 3 + (t - 180) / 1260;\n' +
  '  function rate(t) {\n    return (1.6 + t * 0.028 + Math.pow(t / 60, 1.6) * 0.5) * DENSITY * openingSpawnFactor(t);\n  }');
patch('js/systems/spawner.js',
  'Math.round((14 + Math.floor(t / 22)) * G.Coop.scaleRate(players.length) * 0.4)',
  'Math.round((14 + Math.floor(t / 22)) * G.Coop.scaleRate(players.length) * 0.4 * openingSpawnFactor(t))');
patch('js/systems/spawner.js',
  'for (let i = 0; i < n && G.EnemyMgr.count < CAP + 10; i++) spawnOne(target, t, base + G.U.rand(-0.6, 0.6));',
  'for (let i = 0, amount = Math.round(n * openingSpawnFactor(t)); i < amount && G.EnemyMgr.count < CAP + 10; i++) spawnOne(target, t, base + G.U.rand(-0.6, 0.6));');

// Reduce excessively high mob HP (previously x3.3->x5 on top of run scaling).
// Enemy tiers, XP rewards, boss spawn schedule and meta upgrades are preserved.
patch('js/systems/spawner.js',
  '  const hpK = t => 3.3 + Math.min(1.7, t / 210);',
  '  const hpK = t => 1.65 + Math.min(1.55, Math.max(0, t) / 360);');
patch('js/systems/spawner.js',
  'const SUPPORT_MAX = 3, SUPPORT =',
  'const SUPPORT_MAX = 2, SUPPORT =');
patch('js/systems/spawner.js',
  'e.maxHp = e.hp = Math.round(e.maxHp * 1.6); e.dmg *= 1.25; e.xp = Math.round(e.xp * 1.6);',
  'const p = Math.min(1, Math.max(0, t / 600)); e.maxHp = e.hp = Math.round(e.maxHp * (1.2 + 0.4 * p)); e.dmg *= 1.1 + 0.15 * p; e.xp = Math.round(e.xp * (1.2 + 0.4 * p));');
patch('js/systems/spawner.js',
  'G.Coop.scaleHp(players.length) * (players.length > 1 ? 1.4 : 1)), true);',
  'G.Coop.scaleHp(players.length) * (players.length > 1 ? 1.4 : 1) * (t < 600 ? 0.8 + 0.2 * Math.max(0, t) / 600 : 1)), true);');
patch('js/systems/spawner.js',
  '    if (rollShiny(b.dex)) e.makeShiny();',
  '    if (t < 600) e.dmg *= 0.8 + 0.2 * Math.max(0, t) / 600;\n    if (rollShiny(b.dex)) e.makeShiny();');

patch('js/systems/gacha.js', 'const SHINY_RATE = 1 / 100;', 'const SHINY_RATE = 1 / ' + gacha + ';');
patch('js/core/db.js', 'const START_COINS = 500;', 'const START_COINS = ' + coins + ';');
// All learned attacks now tick together, each keeping its independent cooldown.
patch('js/systems/combat.js',
  'for (const m of pl.activeGroup()) tickMove(dt, pl, m, now);',
  'for (const m of pl.moves) tickMove(dt, pl, m, now);');
patch('js/entities/player.js', 'this.maxMoves = 4;         // huecos',
  'this.maxMoves = 6;         // PKMSVV: all six skills automatically fire');
patch('js/game.js',
  "    for (let i = 0; i < 4; i++) {\n" +
  "      if (G.Input.tap('digit' + (i + 1)) || G.Input.tap('numpad' + (i + 1))) pl.setActive(i);\n" +
  "    }\n" +
  "    if (G.Input.tap('keyq')) pl.cycle(-1);\n" +
  "    if (G.Input.tap('keye') || G.Input.tap('tab')) pl.cycle(1);",
  '    // PKMSVV: all learned abilities autocast, with no manual switching.');
patch('js/ui/hud.js', 'const on = i === pl.active;', 'const on = Boolean(m);');
patch('js/ui/hud.js',
  "if (m) G.Touch.addButton(x, y, S, S, () => { if (G.Game.state === 'playing' && pl.active !== i) { pl.setActive(i); G.Audio.sfx('click'); } }, GAP / 2 + 3);",
  '// PKMSVV: all ability icons are passive cooldown indicators.');
patch('js/ui/hud.js', 'ctx.fillText(String(i + 1), x + 3, y + 10);',
  "ctx.fillText('AUTO', x + 3, y + 10);");
patch('js/ui/hud.js', '      if (on) {\n        ctx.font = F(700, 10);',
  '      if (on && i === 0) {\n        ctx.font = F(700, 10);');
// Legendary resonance rewards multi-autocast builds: independent CDR,
// up to 8 learned moves, and +8% damage per rift for the first three wins.
patch('js/systems/rift.js',
  "      pl.bonds++;\n      G.FX.dmgText(pl.x, pl.y - pl.bodyH - 10, '¡Vínculo!', '#ff8ad8', true);",
  "      const reward = G.PKMSVVBalance.rewardRift(pl);\n" +
  "      G.FX.dmgText(pl.x, pl.y - pl.bodyH - 10, (G.I18n && G.I18n.lang === 'vi' ? 'Cộng hưởng huyền thoại ' : 'Legendary Resonance ') + reward.stacks + '/3', '#ff8ad8', true);");
// Six independently auto-casting moves must not drain six Life Orb fees
// in the same second. One 1% max-HP cost every 2 seconds of game time.
patch('js/entities/player.js',
  "    if (this.hasItem('lifeorb') && m.kind !== 'orbit' && m.kind !== 'trail' && !this.remote) {\n" +
  "      this.hp = Math.max(1, this.hp - Math.max(1, this.maxHp * 0.01));\n" +
  "    }",
  "    if (this.hasItem('lifeorb') && m.kind !== 'orbit' && m.kind !== 'trail' && m.kind !== 'buff' && !this.remote) {\n" +
  "      const now = G.Game.st.time;\n" +
  "      if (now >= (this._pkmsvvLifeOrbNext || 0)) {\n" +
  "        this.hp = Math.max(1, this.hp - Math.max(1, this.maxHp * 0.01));\n" +
  "        this._pkmsvvLifeOrbNext = now + 2;\n" +
  "      }\n" +
  "    }");

// Choice Band's old no-switch penalty no longer applies; rebalance.
patch('js/data/items.js',
  "desc: '+40% de daño, pero no puedes cambiar de movimiento.',\n" +
  "      on: p => { p.atkMul *= 1.4; }, off: p => { p.atkMul /= 1.4; }",
  "desc: '+25% sát thương, -15% tốc độ di chuyển.',\n" +
  "      on: p => { p.atkMul *= 1.25; p.spdMul *= 0.85; },\n" +
  "      off: p => { p.atkMul /= 1.25; p.spdMul /= 0.85; }");

// Keep the Life Orb tooltip truthful in Spanish and both supported languages.
patch('js/data/items.js',
  "desc: '+30% de daño, pero cada ataque te quita un poco de vida.'",
  "desc: '+30% de daño; pierde hasta un 1% de PS cada 2 s cuando ataca.'");

// Seven optional licensed songs, otherwise keep the composer's synthesized score.
const musicNames = ['village','forest','cave','volcano','boss','rift','judgment'];
const musicFiles = {};
const outMusic = path.join(game, 'assets', 'music-custom');
for (const name of musicNames) {
  for (const ext of ['.mp3', '.ogg', '.wav']) {
    const src = path.join(project, 'custom-music', name + ext);
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(outMusic, { recursive: true });
    fs.copyFileSync(src, path.join(outMusic, name + ext));
    musicFiles[name] = name + ext;
    console.log('PKMSVV custom music bundled: '+name+' -> '+name+ext);
    break;
  }
}
patch('js/core/audio.js',
  "let settings = { music: 0.55, sfx: 0.7, muted: false };",
  "let settings = { music: 0.55, sfx: 0.7, muted: false };\n" +
  "  const PKMSVV_CUSTOM_MUSIC = " + JSON.stringify(musicFiles) + ";\n" +
  "  let customAudio = null;");
patch('js/core/audio.js',
  "    if (wanted && !current) startSong(wanted);",
  "    if (wanted && !current && !customAudio) {\n" +
  "      if (PKMSVV_CUSTOM_MUSIC[wanted]) startCustomMusic(wanted);\n" +
  "      else startSong(wanted);\n" +
  "    }");
patch('js/core/audio.js',
  "  function applyVolumes() {\n    if (!ctx) return;",
  "  function applyVolumes() {\n" +
  "    if (customAudio) customAudio.volume = settings.muted ? 0 : Math.min(1, settings.music * 0.7);\n" +
  "    if (!ctx) return;");
patch('js/core/audio.js',
  "  /** Cambia de tema (con fundido). null = silencio. */\n  function music(name) {",
  "  function stopCustomMusic() {\n" +
  "    if (!customAudio) return;\n" +
  "    customAudio.pause(); customAudio.removeAttribute('src'); customAudio.load();\n" +
  "    customAudio = null;\n" +
  "  }\n" +
  "  function startCustomMusic(name) {\n" +
  "    const el = new Audio('assets/music-custom/' + PKMSVV_CUSTOM_MUSIC[name]);\n" +
  "    el.loop = true; el.preload = 'auto'; el.pkmsvvName = name;\n" +
  "    el.volume = settings.muted ? 0 : Math.min(1, settings.music * 0.7);\n" +
  "    customAudio = el;\n" +
  "    el.addEventListener('error', () => {\n" +
  "      if (customAudio === el) { console.warn('PKMSVV: custom music missing or unsupported:', el.src); stopCustomMusic(); if (wanted === name) startSong(name); }\n" +
  "    }, { once: true });\n" +
  "    el.play().catch((err) => {\n" +
  "      if (customAudio !== el || (err && (err.name === 'NotAllowedError' || err.name === 'AbortError'))) return;\n" +
  "      console.warn('PKMSVV: custom music playback error:', err);\n" +
  "    });\n" +
  "  }\n" +
  "  /** Cambia de tema (con fundido). null = silencio. */\n  function music(name) {");
patch('js/core/audio.js',
  "    stopCurrent();\n    if (name) startSong(name);",
  "    stopCurrent(); stopCustomMusic();\n" +
  "    if (name) { if (PKMSVV_CUSTOM_MUSIC[name]) startCustomMusic(name); else startSong(name); }");
patch('js/core/audio.js',
  "get track() { return current && current.name; }",
  "get track() { return customAudio ? customAudio.pkmsvvName : current && current.name; }");


// Help new runs find a damaging second/third move before the first boss.
// Readying a golden evolution still takes priority over the early guarantee.
patch('js/systems/levelup.js',
  "    if (evo >= 0) { const c = pool.splice(evo, 1)[0]; used.add(c.key); picked.push(c); }",
  "    if (evo >= 0) { const c = pool.splice(evo, 1)[0]; used.add(c.key); picked.push(c); }\n" +
  "    if (pl.level <= 6 && pl.moves.filter(m => m.kind !== 'buff').length < 3 && picked.length < n) {\n" +
  "      const early = pool.findIndex(c => c.type === 'new' && G.Moves.BY_ID[c.key.slice(4)] && G.Moves.BY_ID[c.key.slice(4)].kind !== 'buff');\n" +
  "      if (early >= 0) { const card = pool.splice(early, 1)[0]; used.add(card.key); picked.push(card); }\n" +
  "    }");

// Rebalance all 103 simultaneous attacks AFTER source moves define G.Moves,
// before any run starts.  Buff duration/cooldown is upgraded explicitly.
const combatBalance = fs.readFileSync(path.join(project, 'src', 'pkmsvv-skill-balance.js'), 'utf8');
fs.writeFileSync(path.join(game, 'js','data','pkmsvv-skill-balance.js'), combatBalance, 'utf8');
patch('dev.html', '<script defer src="js/data/moves.js"></script>',
  '<script defer src="js/data/moves.js"></script>\n<script defer src="js/data/pkmsvv-skill-balance.js"></script>');
patch('js/systems/combat.js',
  "    if (m.kind === 'orbit') { orbit(pl, m, dt, now); return; }",
  "    if (m.kind === 'buff' && m.lvl >= m.def.maxLvl) {\n" +
  "      G.PKMSVVBalance.refreshBuff(pl, m);\n" +
  "      return;\n" +
  "    }\n" +
  "    if (m.kind === 'orbit') { orbit(pl, m, dt, now); return; }");
patch('js/systems/combat.js',
  'm.t = Math.max(0.05, m.cd * pl.cdMul);',
  'm.t = G.PKMSVVBalance.effectiveCooldown(pl, m);');
patch('js/entities/player.js',
  'b.n = Math.min(maxStacks, b.n + 1);',
  'b.n = 1; // PKMSVV: refreshed effect, never accumulated by auto-casting');
patch('js/systems/levelup.js',
  'apply: () => G.Moves.levelUp(m)',
  "apply: p => { G.Moves.levelUp(m); if (m.kind === 'buff') G.PKMSVVBalance.refreshBuff(p, m); }");
patch('js/ui/hud.js',
  "const cdOf = m => m.kind === 'orbit' ? 0 : G.U.clamp(m.t / (m.cd * pl.cdMul), 0, 1);",
  "const cdOf = m => m.kind === 'orbit' || (m.kind === 'buff' && m.lvl >= m.def.maxLvl) ? 0 :\n" +
  "      G.U.clamp(m.t / G.PKMSVVBalance.effectiveCooldown(pl, m), 0, 1);");
patch('js/ui/hud.js',
  "ctx.fillText('AUTO', x + 3, y + 10);",
  "if (m.kind === 'buff') ctx.fillText(m.lvl >= m.def.maxLvl ? 'MAX' : 'BUFF', x + 3, y + 10);\n" +
  "      else ctx.fillText('AUTO', x + 3, y + 10);\n" +
  "      if (m.kind === 'buff' && m.lvl < m.def.maxLvl) {\n" +
  "        const active = pl.buffs[m.stat] && pl.buffs[m.stat].n > 0;\n" +
  "        const seconds = active ? pl.buffs[m.stat].t : m.t;\n" +
  "        ctx.font = F(700, 8); ctx.textAlign = 'center';\n" +
  "        ctx.fillStyle = active ? '#a9ffbc' : '#ffce8a';\n" +
  "        ctx.fillText((active ? 'ON ' : 'OFF ') + Math.ceil(Math.max(0, seconds)) + 's', x + S / 2, y + S - 15);\n" +
  "      }");

// v0.6: active dash skills (never move the player without a deliberate press).
// Xbox X / PC F / mobile dedicated button. Other 99 skills stay fully automatic.
patch('js/systems/combat.js',
  "    if (m.kind === 'orbit') { orbit(pl, m, dt, now); return; }",
  "    if (m.kind === 'dash') { m.t = Math.max(0, (m.t || 0) - dt); return; }\n" +
  "    if (m.kind === 'orbit') { orbit(pl, m, dt, now); return; }");
patch("js/systems/combat.js",
  "  return { tick, resolve, ghostCast, ghostOrbit, updateFields, drawGroundFields, drawAirFields, clearFields,",
  "  function manualDash(pl) {\n    if (!pl || pl.dead || G.Game.state !== 'playing') return false;\n    const pick = G.PKMSVVDash.preview(pl);\n    if (!pick || !pick.ready) return false;\n    G.PKMSVVDash.consume(pl,pick);\n    const m=pick.move;\n    m.t = G.PKMSVVBalance.effectiveCooldown(pl,m);\n    pl.cast(m);\n    if (G.Coop.active) G.Coop.cast(pl,m);\n    m.castAt = performance.now();\n    run(pl,m);\n    return true;\n  }\n  return { tick, manualDash, resolve, ghostCast, ghostOrbit, updateFields, drawGroundFields, drawAirFields, clearFields,");
const dashQueueSrc=fs.readFileSync(path.join(project,'src','pkmsvv-dash-queue.js'),'utf8');
fs.writeFileSync(path.join(game,'js','systems','pkmsvv-dash-queue.js'),dashQueueSrc,'utf8');
patch("dev.html",
  "<script defer src=\"js/systems/combat.js\"></script>",
  "<script defer src=\"js/systems/pkmsvv-dash-queue.js\"></script>\n<script defer src=\"js/systems/combat.js\"></script>");
patch('js/game.js',
  "    if (state !== 'playing' || !pl) return;\n    // PKMSVV: all learned abilities autocast, with no manual switching.",
  "    if (state !== 'playing' || !pl) return;\n" +
  "    if (G.Input.tap('keyf')) G.Combat.manualDash(pl);\n" +
  "    // PKMSVV: all learned abilities autocast, with no manual switching.");
patch('js/core/gamepad.js',
  "  return {\n    poll, rumble,",
  "  return {\n    poll, rumble,\n    focusFirst() { const opts = candidates(); if (opts.length) setFocus(firstOf(opts)); },");
patch('js/core/gamepad.js',
  "      if (hit(BT.LB) || hit(BT.LT)) G.Input.virtual('keyq');\n" +
  "      if (hit(BT.RB) || hit(BT.RT)) G.Input.virtual('keye');",
  "      // PKMSVV: X activates a learned dash. LB/RB no longer cycle attacks.\n" +
  "      if (hit(BT.X)) G.Input.virtual('keyf');");
patch("js/ui/hud.js",
  "    // ---------- vínculo guardado (aún no hay dos movimientos sueltos) ----------",
  "    // PKMSVV manual skill: preview uses the SAME queue as the F/X activation.\n    const manual = G.PKMSVVDash.preview(pl);\n    if (manual) {\n      const x = w - 90 - sa.right, y = h - 174 - sa.bottom, size = 64;\n      const m = manual.move, ready = manual.ready;\n      roundRect(ctx, x, y, size, size, 14);\n      ctx.fillStyle = ready ? '#1b6590' : 'rgba(13,29,54,.87)'; ctx.fill();\n      ctx.lineWidth = 2; ctx.strokeStyle = ready ? '#53e1ff' : '#59718f'; ctx.stroke();\n      G.Icons.draw(ctx, 'move:' + m.id, x + 14, y + 7, 36);\n      ctx.textAlign = 'center'; ctx.fillStyle = '#fff';\n      ctx.font = F(700, 10);\n      const moveName=G.T(m.name, 'move');\n      ctx.fillText(moveName.length > 12 ? moveName.slice(0, 11) + '…' : moveName,x + size / 2,y - 7);\n      ctx.font = F(800, 10);\n      ctx.fillText(ready ? 'F / X' : manual.remaining.toFixed(1)+'s',x+size/2,y+57);\n      if (manual.total > 1) {\n        ctx.font=F(700, 10);ctx.fillStyle='#a8eefe';\n        ctx.fillText((manual.index+1)+'/'+manual.total,x+size/2,y+size+13);\n      }\n      if(touch) G.Touch.addButton(x,y,size,size,()=>G.Combat.manualDash(pl),4);\n    }\n    // ---------- vínculo guardado (aún no hay dos movimientos sueltos) ----------");
patch("js/ui/hud.js",
  "      if (m.kind === 'buff') ctx.fillText(m.lvl >= m.def.maxLvl ? 'MAX' : 'BUFF', x + 3, y + 10);",
  "      if (m.kind === 'dash') { ctx.font = F(800, 7); ctx.fillText(G.T('Activa'), x + 3, y + 10); }\n      else if (m.kind === 'buff') ctx.fillText(m.lvl >= m.def.maxLvl ? 'MAX' : 'BUFF', x + 3, y + 10);");
patch("js/ui/hud.js",
  "ctx.strokeStyle = fused ? BOND : m && m.evolved ? '#ffd23f' : on ? col : 'rgba(140,170,210,.22)';",
  "ctx.strokeStyle = m && m.kind === 'dash' ? '#53e1ff' : fused ? BOND : m && m.evolved ? '#ffd23f' : on ? col : 'rgba(140,170,210,.22)';");
patch("js/systems/levelup.js",
  "tag: G.U.TYPE_NAME[d.type] + (d.cat ? ' · ' + G.Stats.NAME[d.cat] : ''),",
  "tag: G.U.TYPE_NAME[d.type] + ' · ' + (d.kind === 'dash' ? G.T('Habilidad activa') + ' (F/X)' : d.kind === 'buff' ? G.T('Potenciador automático') : G.T('Habilidad automática')) + (d.cat ? ' · ' + G.Stats.NAME[d.cat] : ''),");
patch("js/ui/run-ui.js",
  "const cat = m.cat ? `<span class=\"tag-chip\" style=\"background:${col}\">${G.Stats.NAME[m.cat]}</span>` : '<span class=\"sub\">Mejora</span>';",
  "const cat = `<span class=\"tag-chip\" style=\"background:${m.kind === 'dash' ? '#168bc0' : col}\">${G.T(m.kind === 'dash' ? 'Habilidad activa' : m.kind === 'buff' ? 'Potenciador automático' : 'Habilidad automática')}</span>`;");
patch('js/ui/settings-ui.js',
  "        + toggle('gamepad', 'Usar mando', 'Moverte, cambiar de ataque y manejar los menús con el mando.')",
  "        + toggle('gamepad', 'Usar mando', 'Moverte, activar habilidades especiales y manejar los menús con el mando.')");
patch('js/ui/settings-ui.js',
  '             <div><span class="padkey">LB</span> / <span class="padkey">RB</span></div><span>ataque anterior / siguiente</span>',
  '             <div><span class="padkey">X (Xbox) / □ (PlayStation)</span></div><span>activar movimiento especial (si lo has aprendido)</span>');
patch('js/ui/settings-ui.js',
  'Toca un ataque de abajo para cambiarlo y el botón de arriba a la derecha para pausar.',
  'Todos los ataques se lanzan automáticamente; el botón especial aparece si aprendes una embestida. Pulsa el botón de arriba a la derecha para pausar.');
patch('js/ui/settings-ui.js',
  '             <div><kbd>1</kbd>–<kbd>4</kbd> o clic en el icono</div><span>elegir ataque</span>\n' +
  '             <div><kbd>Q</kbd> / <kbd>E</kbd></div><span>ataque anterior / siguiente</span>',
  '             <div><kbd>F</kbd></div><span>activar movimiento especial (si lo has aprendido)</span>');
// The owner approved these v1.1 release notes in both languages.
patch('js/data/changelog.js', 'G.CHANGELOG = [', 'G.CHANGELOG = [');
fs.copyFileSync(path.join(project, 'src', 'pkmsvv-changelog-v11.js'),
  path.join(game, 'js', 'data', 'changelog.js'));
// Prepend the additive v1.2 entry. The full owner-approved v1.1 source is intact.
fs.appendFileSync(path.join(game,'js','data','changelog.js'),
  '\n' + fs.readFileSync(path.join(project,'src','pkmsvv-changelog-v12.js'),'utf8'),'utf8');
fs.appendFileSync(path.join(game,'js','data','changelog.js'),
  '\n' + fs.readFileSync(path.join(project,'src','pkmsvv-changelog-v121.js'),'utf8'),'utf8');
// Upstream news renderer assumes its first language is Spanish. PKMSVV release
// entries are explicitly [Vietnamese, English]; choose the correct text instead
// of feeding approved release notes through automatic fragment translation.
patch('js/ui/news-ui.js',
  "    const text = pair => G.I18n.lang === 'es' ? pair[0]\n" +
  "      : G.I18n.lang === 'en' || !G.I18n.has(pair[0]) ? pair[1] : G.T(pair[0]);",
  "    const text = pair => G.I18n.lang === 'vi' ? pair[0] : pair[1];");
// v1.2 title credit and changelog button are bilingual, not i18n fragments.
patch('js/ui/news-ui.js', "    b.innerHTML = G.Icons.html('book', 18) + ' <span>Novedades</span><i class=\"dot\"></i>';",
  "    b.innerHTML = G.Icons.html('book', 18) + ' <span translate=\"no\">' + (G.I18n.lang === 'vi' ? 'Có gì mới: 1.2.1' : \"What's New: 1.2.1\") + '</span><i class=\"dot\"></i>';\n    const splash = typeof document === 'undefined' ? null : document.querySelector('#scr-menu .splash');\n    if (splash) splash.textContent = G.I18n.lang === 'vi' ? 'Việt hóa và Mod điều chỉnh bởi Votri Valley' : 'Localized and modded by Votri Valley';");
// Same-date releases still show the unread indicator after an earlier version.
patch('js/ui/news-ui.js', "  const latest = () => (G.CHANGELOG[0] || {}).d || '';",
  "  const latest = () => { const v = G.CHANGELOG[0] || {}; return (v.d || '') + '|' + ((v.title || [])[1] || ''); };");
patch('js/ui/news-ui.js',
  "    const PARTS = [['new', ['Nuevo', 'New']], ['chg', ['Cambios', 'Changes']], ['fix', ['Arreglos', 'Fixes']]];",
  "    const PARTS = [['new', ['TÍNH NĂNG MỚI', 'NEW FEATURES']], ['chg', ['THAY ĐỔI GAMEPLAY', 'GAMEPLAY CHANGES']], ['fix', ['CẢI TIẾN & SỬA LỖI', 'IMPROVEMENTS & FIXES']]];");
patch('js/ui/news-ui.js',
  "`<div class=\"news-day\" translate=\"no\"><h3>${esc(v.title ? text(v.title) : '')}<small>${fmt(v.d)}</small></h3>` +",
  "`<div class=\"news-day\" translate=\"no\"><h3>${esc(v.title ? text(v.title) : '')}<small>${fmt(v.d)}</small></h3>` +" +
  "\n      (v.subtitle ? `<p class=\"pkmsvv-news-subtitle\">${esc(text(v.subtitle))}</p>` : '') +");
patch('js/ui/news-ui.js',
  "        `<div class=\"news-part\"><span class=\"news-tag ${k}\">${text(lbl)}</span><ul>${v[k].map(t => `<li>${esc(text(t))}</li>`).join('')}</ul></div>`).join('') +\n      '</div>').join('');",
  "        `<div class=\"news-part\"><span class=\"news-tag ${k}\">${esc(text(lbl))}</span><ul>${v[k].map(t => `<li>${esc(text(t))}</li>`).join('')}</ul></div>`).join('') +\n      (v.credit ? `<p class=\"pkmsvv-news-credit\">${esc(text(v.credit))}</p>` : '') +\n      '</div>').join('');");


// Loginless PC profile: keep a currently restored local save; if none exists,
// generate a dedicated offline profile (NOT a guest, so G.DB.commit works).
// Existing ps.accounts and ps.save.* are never replaced or deleted.
patch('js/core/db.js', "if (mode === 'local') { setSync('local'); return restoreLocal(); }",
  "if (mode === 'local') {\n" +
  "        setSync('local');\n" +
  "        if (restoreLocal()) return true;\n" +
  "        const k = 'pkmsvv_offline';\n" +
  "        const accounts = read(K_ACC) || {};\n" +
  "        if (!accounts[k]) accounts[k] = { name: 'Người chơi', created: Date.now(), localOnly: true };\n" +
  "        if (!write(K_ACC, accounts)) throw new Error('Không thể tạo hồ sơ offline: bộ nhớ không ghi được');\n" +
  "        beginLocal(k, accounts[k].name);\n" +
  "        if (!commit()) throw new Error('Không thể lưu hồ sơ offline');\n" +
  "        return true;\n" +
  "      }");

// Never route back to the login form after initialization.
patch('js/game.js',
  'setTimeout(() => this.tapToStart(() => { if (restored) this.afterLogin(); else this.toLogin(); }), 0);',
  'setTimeout(() => this.afterLogin(), 0);');
patch('js/game.js',
  "toLogin() { G.Audio.music('village'); G.LoginUI.open(); },",
  "toLogin() { this.afterLogin(); },");


// Evolution: data are versioned with PKMSVV rather than fetched during play.
const evolution = JSON.parse(fs.readFileSync(path.join(project, 'data', 'evolution-rules.json'), 'utf8'));
if (!Array.isArray(evolution.rules) || evolution.rules.length < 400) throw new Error('Thiếu dữ liệu tiến hóa Pokédex');
fs.writeFileSync(path.join(game, 'js', 'data', 'pkmsvv-evolution-data.js'),
  '/* Offline PokeAPI evolutionary routes for PKMSVV */\nG.PKMSVV_EVOLUTION_DATA = ' + JSON.stringify(evolution) + ';\n', 'utf8');
const evoSource = fs.readFileSync(path.join(project, 'src', 'pkmsvv-evolution.js'), 'utf8');
if (!evoSource.includes('__PKMSVV_HP_FACTOR__')) throw new Error('Sai placeholder HP của evolution engine');
fs.writeFileSync(path.join(game, 'js', 'systems', 'pkmsvv-evolution.js'),
  evoSource.replace('__PKMSVV_HP_FACTOR__', String(hp)), 'utf8');

// Track attacks and damage without overwriting any of the upstream hooks.
patch('js/entities/player.js', '  cast(m) {\n', '  cast(m) {\n    G.PKMSVVEvo.onCast(this, m);\n');
patch('js/entities/player.js', '    this.hp -= d;\n', '    this.hp -= d;\n    G.PKMSVVEvo.onHurt(this, d);\n');
patch('js/game.js', '    pl = new G.Player(mon, perks, !!save.partnerShiny && G.DB.ownsShiny(mon.dex));',
  '    pl = new G.Player(mon, perks, !!save.partnerShiny && G.DB.ownsShiny(mon.dex));\n    G.PKMSVVEvo.reset(pl);');
patch('js/game.js', '    G.Weather.update(dt, time, pl);\n    G.FX.update(dt);',
  '    G.Weather.update(dt, time, pl);\n    if (!coop) G.PKMSVVEvo.tick(pl, time);\n    G.FX.update(dt);');
patch('js/game.js', '    if (!coop || G.Coop.isHost) maybeLevelUp();',
  '    if (!coop && pendingLevels === 0 && !G.Judgment.active && G.PKMSVVEvo.tryOpen(pl, time, () => { state = "playing"; })) state = "choice";\n    if (!coop || G.Coop.isHost) maybeLevelUp();');

// Noncommercial derivative attribution; keep original JPTER78 and SpriteCollab credits.
const pkmsvvCredit = 'Việt hóa và Mod điều chỉnh bởi Votri Valley';
patch('dev.html',
  '      <div class="t1">PokéSurvivor<span class="splash">Folagor, Sekiam, PokeAlex: ¿un hueco?</span></div>\n' +
  '      <div class="t2">Mundo Misterioso</div>',
  '      <div class="t1" translate="no">Pokémon Sống Sót<span class="splash" translate="no">' + pkmsvvCredit + '</span></div>\n' +
  '      <div class="t2">Mundo Misterioso</div>');
patch('dev.html',
  '    <p class="boot-ld">Cargando…</p>',
  '    <p class="pkmsvv-boot-credit" translate="no" lang="vi">' + pkmsvvCredit + '</p>\n' +
  '    <p class="boot-ld">Cargando…</p>');

// The sign-out button is part of the original UI, but this build has one
// passwordless persistent local profile. Keep the element so upstream init
// bindings remain valid while hiding the obsolete affordance.
patch('dev.html', '<button id="btn-logout" class="btn small ghost">Salir</button>',
  '<button id="btn-logout" class="btn small ghost hidden" aria-hidden="true" tabindex="-1">Salir</button>');

// Insert before source game.js, after all dependencies are loaded.
// Translate the original Spanish strings before JS minification. The game's
// own i18n engine updates DOM, HUD canvas, dynamically created buttons and
// popups without altering the original combat/UI logic.
const vietnamese = require(path.join(project, 'src', 'vi-translations.cjs'));
const enSource = fs.readFileSync(path.join(game, 'js', 'data', 'lang-en.js'), 'utf8');
const dictionary = {};
const vm = require('node:vm');
vm.runInNewContext(enSource, { G: { I18n: { add(d) { Object.assign(dictionary, d); } } } }, { timeout: 3000 });
if (Object.keys(dictionary).length < 1200) throw new Error('Từ điển nguồn không đầy đủ');
const viDict = Object.fromEntries(Object.entries(dictionary).map(([es, en]) => [es, vietnamese.translate(en)]));
// Keep familiar official English move names even with Vietnamese UI.
// The Vietnamese community reference distinguishes English move names from
// Vietnamese explanations. Do not translate whole names through fragment rules.
const upstreamMoves = fs.readFileSync(path.join(game,'js','data','moves.js'),'utf8');
const spanishMoveNames = new Set(
  [...upstreamMoves.matchAll(/\bname:\s*'([^']+)'/g)].map(m=>m[1])
);
const evoStart = upstreamMoves.indexOf('const EVO = {'), evoEnd = upstreamMoves.indexOf('const EVO_MODS',evoStart);
if(evoStart<0||evoEnd<0) throw new Error('Upstream move evolutions changed.');
for(const m of upstreamMoves.slice(evoStart,evoEnd).matchAll(/:\s*\['([^']+)'/g))spanishMoveNames.add(m[1]);
for(const [es,en] of Object.entries(dictionary)) {
  if(spanishMoveNames.has(es))viDict[es]=en;
}
// Prevent partial Vietnamese conversion of skill-name text inside dynamically
// constructed UI. Add a dedicated move context for original Spanish names.
const moveMap = Object.fromEntries([...spanishMoveNames].filter(k=>dictionary[k]).map(k=>[k,dictionary[k]]));
if(Object.keys(moveMap).length < 90) throw new Error('Missing source English skill names: '+Object.keys(moveMap).length);
fs.writeFileSync(path.join(game,'js','data','pkmsvv-move-names.js'),
  'G.I18n.add('+JSON.stringify(moveMap)+',"vi","move");\n','utf8');



fs.writeFileSync(path.join(game, 'js', 'data', 'lang-vi.js'),
  '/* PKMSVV: Vietnamese dictionary (built from pinned original) */\nG.I18n.add(' + JSON.stringify(viDict) + ', "vi");\n', 'utf8');
const equal = Object.entries(dictionary).filter(([es,en]) => viDict[es] === en && /[A-Za-z]{4}/.test(en));
console.log('[VI] '+ Object.keys(viDict).length +' mục, còn '+equal.length+' mục trùng bản tiếng Anh cần QA.');

// Do not request a missing js/lang/vi.js: vi translations are packaged inline.
patch('js/core/locales.js', "['es', 'Español', 'es-ES'], ['en', 'English', 'en-GB'],",
  "['vi', 'Tiếng Việt', 'vi-VN'], ['en', 'English', 'en-GB'],");
patch('js/core/locales.js',
  "const lang = normalize(saved) || (/\\/en(\\/|$)/.test(location.pathname) ? 'en' : null)",
  "const lang = normalize(saved) || 'vi'");
patch('js/core/locales.js',
  "if (lang !== 'es' && lang !== 'en') {",
  "if (lang !== 'es' && lang !== 'en' && lang !== 'vi') {");
// Browser pixel-font has no guaranteed Vietnamese glyph coverage. Use a
// native UTF-8 capable Windows font for canvas HUD, menus and battle texts.
fs.writeFileSync(path.join(game, 'js', 'core', 'pkmsvv-vi-font.js'),
  "/* PKMSVV Vietnamese accent-safe canvas font */\n" +
  "(() => { const P = CanvasRenderingContext2D.prototype;\n" +
  "  const fd = Object.getOwnPropertyDescriptor(P, 'font');\n" +
  "  if (!fd || !fd.set || !fd.get) return;\n" +
  "  Object.defineProperty(P, 'font', { configurable: true, enumerable: fd.enumerable,\n" +
  "    get() { return fd.get.call(this); },\n" +
  "    set(v) { const value = typeof v === 'string' ? v.replace(/\\bPixelify\\b/g, '\"Segoe UI\"') : v;\n" +
  "      return fd.set.call(this, value); } });\n" +
  "})();\n", 'utf8');
patch('dev.html', '<script defer src="js/core/i18n.js"></script>',
  '<script defer src="js/core/i18n.js"></script>\n<script defer src="js/core/pkmsvv-vi-font.js"></script>');

// Include Vietnamese after English fallback, before game systems execute.
patch('dev.html', '<script defer src="js/data/lang-en.js"></script>',
  '<script defer src="js/data/lang-en.js"></script>\n<script defer src="js/data/lang-vi.js"></script>');
patch('dev.html',
  '<script defer src="js/data/lang-vi.js"></script>',
  '<script defer src="js/data/lang-vi.js"></script>\n<script defer src="js/data/pkmsvv-move-names.js"></script>');

// Newly added gamepad hints are bilingual as well. Keep upstream Spanish
// source keys for i18n's text-node scanning, without introducing mixed UI.
const freshLabels = [
  ['+30% de daño; pierde hasta un 1% de PS cada 2 s cuando ataca.',
   '+30% damage; lose up to 1% max HP once every 2 seconds while attacking.',
   '+30% sát thương; tối đa mất 1% HP mỗi 2 giây khi tấn công.'],
  ['Habilidad activa','Active skill','Kỹ năng chủ động'],
  ['Habilidad automática','Automatic skill','Kỹ năng tự động'],
  ['Potenciador automático','Automatic buff','Buff tự động'],
  ['Activa','MANUAL','CHỦ ĐỘNG'],
  ['Moverte, activar habilidades especiales y manejar los menús con el mando.',
   'Move, activate special skills and navigate menus with the controller.',
   'Di chuyển, kích hoạt kỹ năng chủ động và điều khiển menu bằng tay cầm.'],
  ['activar movimiento especial (si lo has aprendido)',
   'use special skill (if learned)',
   'kích hoạt kỹ năng chủ động (nếu đã học)'],
  ['Todos los ataques se lanzan automáticamente; el botón especial aparece si aprendes una embestida. Pulsa el botón de arriba a la derecha para pausar.',
   'All moves attack automatically. The special button appears when you learn a dash. Tap the upper-right button to pause.',
   'Mọi chiêu thức tự tấn công. Nút kỹ năng đặc biệt xuất hiện khi bạn học chiêu lao tới. Nhấn nút góc trên phải để tạm dừng.']
];
const extraEn = Object.fromEntries(freshLabels.map(([es,en])=>[es,en]));
const extraVi = Object.fromEntries(freshLabels.map(([es,en,vi])=>[es,vi]));
fs.writeFileSync(path.join(game,'js','data','pkmsvv-ux-languages.js'),
  'G.I18n.add('+JSON.stringify(extraEn)+',"en");\n' +
  'G.I18n.add('+JSON.stringify(extraVi)+',"vi");\n', 'utf8');
patch('dev.html',
  '<script defer src="js/data/pkmsvv-move-names.js"></script>',
  '<script defer src="js/data/pkmsvv-move-names.js"></script>\n<script defer src="js/data/pkmsvv-ux-languages.js"></script>');


patch('dev.html', '<script defer src="js/data/pokedex.js"></script>',
  '<script defer src="js/data/pokedex.js"></script>\n<script defer src="js/data/pkmsvv-evolution-data.js"></script>');
patch('dev.html', '<script defer src="js/game.js"></script>',
  '<script defer src="js/systems/pkmsvv-evolution.js"></script>\n<script defer src="js/game.js"></script>');

fs.writeFileSync(path.join(game, 'js/core/firebase-config.js'),
  '/* PKMSVV: forced local saves, Firebase deliberately disabled. */\nG.FIREBASE_CONFIG = null;\n', 'utf8');

// Persistent account-wide powerups are installed on the pinned source before compilation.
execFileSync(process.execPath,[path.join(project,'scripts','patch-global-upgrades.cjs')],{cwd:project,stdio:'inherit'});
// v0.9.6: flying water traversal and two actual move-scaling global upgrades.
execFileSync(process.execPath,[path.join(project,'scripts','patch-power015.cjs')],{cwd:project,stdio:'inherit'});
// Gacha ALL GEN, Pokédex milestones, daily/weekly Pokemon missions and manual backup.
execFileSync(process.execPath,[path.join(project,'scripts','patch-collection.cjs')],{cwd:project,stdio:'inherit'});
// v0.9.1: Switch/Android/PC controller navigation and one-press play from Pokedex.
execFileSync(process.execPath,[path.join(project,'scripts','patch-controller.cjs')],{cwd:project,stdio:'inherit'});
// v0.9.2: restore WebAudio music after focus/sleep and gamepad-only input.
execFileSync(process.execPath,[path.join(project,'scripts','patch-music.cjs')],{cwd:project,stdio:'inherit'});
// v0.9.4: move Pokémon partner action, expose quick Save, repair fullscreen.
execFileSync(process.execPath,[path.join(project,'scripts','patch-ui094.cjs')],{cwd:project,stdio:'inherit'});
// v1.1.2: Safe mobile topbar geometry and separate tappable action row.
execFileSync(process.execPath,[path.join(project,'scripts','patch-mobile-header.cjs')],{cwd:project,stdio:'inherit'});
/* v0.9.5: English coverage for ALL added Votri Valley gameplay features.
   Use the original I18n engine rather than a second mutation observer. */
fs.copyFileSync(path.join(project,'src','pkmsvv-extended-en.js'),
  path.join(game,'js','data','pkmsvv-extended-en.js'));
patch('dev.html',
  '<script defer src="js/data/pkmsvv-ux-languages.js"></script>',
  '<script defer src="js/data/pkmsvv-ux-languages.js"></script>\n<script defer src="js/data/pkmsvv-extended-en.js"></script>');

// Minimal styling for the approved What's New subtitle and attribution;
 // content remains sourced from the bilingual release note data.
fs.appendFileSync(path.join(game,'css','style.css'),
  '\n.pkmsvv-news-subtitle{margin:8px 0 14px;color:#e2eaf7;line-height:1.55;font-size:14px}\n' +
  '.pkmsvv-news-credit{font-size:12px;color:#cad7ef;line-height:1.5;border-top:1px solid #50658d;padding-top:12px;margin-top:15px}\n',
  'utf8');
// Visible product branding only. Preserve author credit, package identifiers and save location.
const brandHtmlPath = path.join(game, 'dev.html');
let brandHtml = fs.readFileSync(brandHtmlPath, 'utf8');
if (!brandHtml.includes('<div class="t1">PokéSurvivor</div>') ||
    !brandHtml.includes('<h1>PokéSurvivor</h1>')) throw new Error('Upstream brand UI changed');
brandHtml = brandHtml.replace('<div class="t1">PokéSurvivor</div>',
  '<div class="t1" translate="no">Pokémon Sống Sót</div>');
brandHtml = brandHtml.replace(/<h1>PokéSurvivor<\/h1>/g,
  '<h1 translate="no">Pokémon Sống Sót</h1>');
fs.writeFileSync(brandHtmlPath, brandHtml, 'utf8');

// Integrate October 21 upstream Kecleon gameplay into the PINNED Votri Valley base.
// Approved v1.1 What's New remains unchanged pending owner review of new release notes.
execFileSync(process.execPath,[path.join(project,'scripts','patch-kecleon.cjs')],{cwd:project,stdio:'inherit'});
// Mobile button placement and midgame pressure shared by native and Web clients.
execFileSync(process.execPath,[path.join(project,'scripts','patch-layout-midgame.cjs')],{cwd:project,stdio:'inherit'});
// Rebindable keyboard controls and a two-line title on every platform.
execFileSync(process.execPath,[path.join(project,'scripts','patch-keybind-title.cjs')],{cwd:project,stdio:'inherit'});
execFileSync(process.execPath,[path.join(project,'scripts','patch-double-items.cjs')],{cwd:project,stdio:'inherit'});
// Unified high-contrast retro UI shared by Web, Windows and Android.
execFileSync(process.execPath,[path.join(project,'scripts','patch-retro-ui.cjs')],{cwd:project,stdio:'inherit'});
execFileSync(process.execPath,[path.join(project,'scripts','patch-skill-track.cjs')],{cwd:project,stdio:'inherit'});
// First-release chapter zero and replayable character introduction.
execFileSync(process.execPath,[path.join(project,'scripts','patch-story.cjs')],{cwd:project,stdio:'inherit'});
// Keep nature/buff UI patch last, after all native and Web menu patches.
execFileSync(process.execPath,[path.join(project,'scripts','patch-nature-buff.cjs')],{cwd:project,stdio:'inherit'});
// Native-only choice; hosted Web builds are not affected.
if(process.env.PKMSVV_BUILD_TARGET!=='web')execFileSync(process.execPath,[path.join(project,'scripts','patch-native-online.cjs')],{cwd:project,stdio:'inherit'});
execFileSync(process.execPath, [path.join(game, 'tools', 'build.js'), '--sin-seo', '--expose'], { cwd: game, stdio: 'inherit' });

const indexPath = path.join(game, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes('</head>')) throw new Error('index.html không có thẻ head');
html = html.replace(/<title>[^<]*<\/title>/, '<title>Pokémon Sống Sót — Votri Valley</title>');
html = html.replace('</head>', '<style>\n' +
  'body,button,input,select{font-family:"Segoe UI",Tahoma,Arial,sans-serif!important;}\n' +
  '.menu-left .logo .t1 .splash{max-width:13em;overflow-wrap:normal;white-space:normal;}\n' +
  '.pkmsvv-attribution{font-family:"Segoe UI",Tahoma,sans-serif;color:#ffe3a0;font-size:clamp(11px,1.25vw,14px);line-height:1.45;margin:8px auto 0;text-align:center;max-width:min(420px,90vw);text-shadow:0 1px 3px #111c37;}\n' +
  '.pkmsvv-boot-credit{font-family:"Segoe UI",Tahoma,sans-serif;color:#ffe3a0;font-size:14px;margin:12px auto 0;text-align:center;}\n' +
  '#scr-menu [data-go="friends"], #scr-menu [data-go="rank"], #btn-google, #btn-logout, #set-tabs [data-t="acc"], #btn-support { display: none !important; }\n' +
  '.pkmsvv-evo{position:fixed;inset:0;z-index:9999;background:rgba(5,9,24,.88);display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto}\n' +
  '.pkmsvv-evo-panel{background:#172645;border:2px solid #f5d16a;border-radius:14px;padding:20px;width:min(570px,96vw);max-height:90vh;overflow-y:auto;box-shadow:0 18px 70px #000}\n' +
  '.pkmsvv-evo-panel h2{color:#ffde72;text-align:center;margin:0 0 12px;font-size:25px}\n' +
  '.pkmsvv-evo-panel p{color:#d8e8fc;margin:8px 0 14px;line-height:1.45}\n' +
  '.pkmsvv-evo-option,.pkmsvv-evo-skip{display:block;width:100%;padding:12px;border-radius:8px;font-family:inherit;font-size:16px;cursor:pointer;margin:8px 0;text-align:left}\n' +
  '.pkmsvv-evo-option{background:#304c7c;color:#fff;border:1px solid #8ebcfb}.pkmsvv-evo-option:hover{background:#42669e}\n' +
  '.pkmsvv-evo-skip{background:#151f35;color:#c3cede;border:1px solid #536b90;text-align:center}\n' +
  '.pkmsvv-evo-panel{overscroll-behavior:contain;scrollbar-width:thin;}\n' +
  '.pkmsvv-evo-option:disabled{opacity:.47;cursor:not-allowed;background:#182846;color:#a6bad4;border-color:#415577;box-shadow:none;}\n' +
  '.pkmsvv-evo-option{line-height:1.5;white-space:normal;overflow-wrap:anywhere;}\n' +
  '.pkmsvv-evo-transform{display:flex;align-items:flex-start;gap:10px;padding:11px;margin:7px 0 12px;background:#10253c;border:1px solid #6384a9;border-radius:9px;font-size:13px;line-height:1.5;color:#e8efff;}\n' +
  '.pkmsvv-evo-transform input{flex:none;width:21px;height:21px;accent-color:#ffdb66;margin:0;}\n' +
  '@media(max-width:600px){.pkmsvv-evo-panel{padding:14px}.pkmsvv-evo-panel h2{font-size:21px}.pkmsvv-evo-option{font-size:14px;padding:10px}.pkmsvv-evo-transform{font-size:12px}}\n' +
  '</style>\n</head>');
html = html.replace('Web oficial: pokesurvivor.com · si alguien te pide pagar, no somos nosotros',
  'PKMSVV: edición offline no oficial · solo uso personal sin fines comerciales');
fs.writeFileSync(indexPath, html, 'utf8');
// PWA manifest follows the installed application display name on all platforms.
const manifestPath=path.join(game,'manifest.webmanifest');
if(fs.existsSync(manifestPath)){
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  manifest.name='Pokémon Sống Sót — Votri Valley';
  manifest.short_name='Sống Sót';
  manifest.lang='vi';
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n','utf8');
}

const notice = fs.readFileSync(path.join(project, 'NOTICE.md'), 'utf8');
fs.writeFileSync(path.join(game, 'NOTICE-PKMSVV.txt'), notice, 'utf8');
console.log('PKMSVV READY: local source, offline cloud disabled, evolution rules (' + evolution.rules.length + ') and tuning applied.');
