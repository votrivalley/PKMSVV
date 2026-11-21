'use strict';
// Shared Web/Windows/Android patch. Applies to the exact pinned upstream
// *uncompiled* engine before tools/build.js. No 3DS binary assets copied.
// Keep off the published releases until QA on all 3 platforms.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const game = path.join(root, 'vendor', 'pokesurvivor');
function patch(rel, from, to) {
  const target = path.join(game, rel);
  const text = fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n');
  const count = text.split(from).length - 1;
  if (count !== 1) throw Error('3DS shared skill port anchor drift ' + rel + ': ' + count + ' for ' + from.slice(0, 110));
  fs.writeFileSync(target, text.replace(from, to), 'utf8');
}
if (!fs.existsSync(path.join(game,'dev.html'))) throw Error('3DS shared port requires real upstream sources before minification');
const target = path.join(game,'js','systems','pkmsvv-3ds-skill-port.js');
fs.copyFileSync(path.join(root,'src','pkmsvv-3ds-skill-port.js'), target);
patch('dev.html',
  '<script defer src="js/systems/levelup.js"></script>',
  '<script defer src="js/systems/levelup.js"></script>\n<script defer src="js/systems/pkmsvv-3ds-skill-port.js"></script>');

// Only the new 3DS passive milestone changes the number of cards.
// Existing 1/2/3 keys and R+X/Y/B + A paging stay in control of RunUI.
patch('js/systems/levelup.js',
  '  function offer(pl, n = 3) {\n    const pool = candidates(pl);',
  '  function offer(pl, n = 3) {\n    n = Math.max(n, G.PKMSVV3DSSkillPort?.offerCount(pl) || n);\n    const pool = candidates(pl);');
patch('js/systems/levelup.js',
  '    const used = new Set();\n    // Si hay una evolución lista',
  '    const used = new Set();\n    const minPassive = G.PKMSVV3DSSkillPort?.minimumPassiveCards(pl) || 0;\n    // Si hay una evolución lista');
patch('js/systems/levelup.js',
  '      const total = pool.reduce((a, c) => a + c.w, 0);\n      let r = Math.random() * total, idx = 0;\n      for (let i = 0; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) { idx = i; break; } }\n      const c = pool.splice(idx, 1)[0];',
  '      const need = Math.max(0, minPassive - picked.filter(c => c.type === "stat").length);\n' +
  '      const allowedStats = need ? pool.filter(c => c.type === "stat") : [];\n' +
  '      const weighted = allowedStats.length ? allowedStats : pool;\n' +
  '      const total = weighted.reduce((a, c) => a + c.w, 0);\n' +
  '      let r = Math.random() * total, idx = 0;\n' +
  '      for (let i = 0; i < weighted.length; i++) { r -= weighted[i].w; if (r <= 0) { idx = i; break; } }\n' +
  '      const c = pool.splice(pool.indexOf(weighted[idx]), 1)[0];');
patch('js/systems/levelup.js',
  "        icon: s.icon, color: evoFor ? '#ffd23f' : '#8fa3c4', tag: evoFor ? 'Evoluciona ' + evoFor.name : 'Mejora',",
  "        icon: s.icon, color: evoFor ? '#ffd23f' : s.pkmsvv3ds ? '#9ae6ff' : '#8fa3c4', tag: evoFor ? 'Evoluciona ' + evoFor.name : s.pkmsvv3ds ? 'PASSIVE' : 'Mejora',");

// Source already supports crits; extend only the actual successful hit paths.
// Boss bonus applies only if e.boss, never to ordinary enemies or world props.
patch('js/systems/combat.js',
  '    dmg *= k * (crit ? CRIT_MUL : 1);\n    e.hurt(dmg, col, dx, dy, knock,',
  '    dmg *= k * (crit ? G.PKMSVV3DSSkillPort.critMultiplier(pl) : 1) * G.PKMSVV3DSSkillPort.bossMultiplier(pl, e);\n' +
  '    if (crit) G.PKMSVV3DSSkillPort.onCrit(pl, e);\n    e.hurt(dmg, col, dx, dy, knock,');
patch('js/systems/combat.js',
  '        const k = (p.mtype ? typeK(p.mtype, e) : 1) * (crit ? CRIT_MUL : 1);\n        e.hurt(p.dmg * k,',
  '        const k = (p.mtype ? typeK(p.mtype, e) : 1) *\n' +
  '          (crit ? G.PKMSVV3DSSkillPort.critMultiplier(pl) : 1) * G.PKMSVV3DSSkillPort.bossMultiplier(pl, e);\n' +
  '        if (crit) G.PKMSVV3DSSkillPort.onCrit(pl, e);\n        e.hurt(p.dmg * k,');

// Preserve immunity, true-damage events, Focus Sash and the existing
// damage-triggered companion reaction; only incoming ordinary hits can dodge.
patch('js/entities/player.js',
  '    if (this.invuln > 0 || this.dead) return;',
  '    if (this.invuln > 0 || this.dead) return;\n' +
  '    if (!pure && G.PKMSVV3DSSkillPort?.rollDodge(this)) {\n' +
  '      this.invuln = 0.12; G.PKMSVV3DSSkillPort.onDodge(this); return;\n' +
  '    }');
console.log('PKMSVV_3DS_WEB_PC_ANDROID_SKILL_PASSIVES_PATCH_PASS shared FX only, no sprites/save changes');
