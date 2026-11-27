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
  '  function offer(pl, n = 3) {\n    n = Math.min(3, Math.max(1, Number(n) || 3));\n    const pool = candidates(pl);');
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
// Official exact pinned PKMSVV source translates evolution names with
// G.T(evoFor.name, 'move'); the public QA mirror used plain evoFor.name.
 // Patch only invariant card styling/label portions. Preserve either
// evolution-title implementation byte-for-byte and fail on unexpected drift.
{
  const rel='js/systems/levelup.js';
  const original=fs.readFileSync(path.join(game,rel),'utf8').replace(/\r\n/g,'\n');
  const lines=original.split('\n');
  const candidates=lines.filter(line=>line.includes(
    "icon: s.icon, color: evoFor ? '#ffd23f' : '#8fa3c4', tag: evoFor ? "));
  if(candidates.length!==1 ||
     !candidates[0].includes(" : 'Mejora',") ||
     !/Evoluciona '.+evoFor\.name/.test(candidates[0]))
    throw Error('3DS Stage1 passive card source variant drift: '+candidates.length);
  const before=candidates[0];
  const after=before
   .replace("color: evoFor ? '#ffd23f' : '#8fa3c4'",
      "color: evoFor ? '#ffd23f' : s.pkmsvv3ds ? '#9ae6ff' : '#8fa3c4'")
   .replace(" : 'Mejora',"," : s.pkmsvv3ds ? 'PASSIVE' : 'Mejora',");
  patch(rel,before,after);
}

// Real PKMSVV retains native ability CritK/abilityK and Arceus Judgment.
// The 64-skill QA mirror still uses the upstream CRIT_MUL directly. Keep
// both source-specific branches fail-closed and never drop old multipliers.
{
  const file='js/systems/combat.js';
  const current=fs.readFileSync(path.join(game,file),'utf8').replace(/\r\n/g,'\n');
  const originalReal="    dmg *= k * (crit ? critK(pl) : 1) * (e.arceus?G.Judgment.dmgK():1);\n    e.hurt(dmg,";
  const originalMirror="    dmg *= k * (crit ? CRIT_MUL : 1);\n    e.hurt(dmg,";
  if(current.includes(originalReal)){
    patch(file,originalReal,
      "    dmg *= k * (crit ? critK(pl) * (G.PKMSVV3DSSkillPort.critMultiplier(pl)/CRIT_MUL) : 1) *\n"+
      "      (e.arceus?G.Judgment.dmgK():1) * G.PKMSVV3DSSkillPort.bossMultiplier(pl,e);\n"+
      "    if(crit)G.PKMSVV3DSSkillPort.onCrit(pl,e);\n    e.hurt(dmg,");
  }else if(current.includes(originalMirror)){
    patch(file,originalMirror,
      "    dmg *= k * (crit ? G.PKMSVV3DSSkillPort.critMultiplier(pl) : 1) * G.PKMSVV3DSSkillPort.bossMultiplier(pl, e);\n"+
      "    if (crit) G.PKMSVV3DSSkillPort.onCrit(pl, e);\n    e.hurt(dmg,");
  }else throw Error('3DS Stage1 real/mirror direct-hit multiplier source drift');
  const next=fs.readFileSync(path.join(game,file),'utf8').replace(/\r\n/g,'\n');
  const pReal="        const k = (p.mtype ? typeK(p.mtype, e) : 1) * G.Stats.taken(e.mon, p.mcat) * (crit ? critK(pl) : 1) * abilityK(pl,p.src,e);\n        e.hurt(p.dmg * k,";
  const pMirror="        const k = (p.mtype ? typeK(p.mtype, e) : 1) * (crit ? CRIT_MUL : 1);\n        e.hurt(p.dmg * k,";
  if(next.includes(pReal)){
    patch(file,pReal,
      "        const k = (p.mtype ? typeK(p.mtype, e) : 1) * G.Stats.taken(e.mon,p.mcat) *\n"+
      "          (crit ? critK(pl) * (G.PKMSVV3DSSkillPort.critMultiplier(pl)/CRIT_MUL) : 1) *\n"+
      "          abilityK(pl,p.src,e) * G.PKMSVV3DSSkillPort.bossMultiplier(pl,e);\n"+
      "        if(crit)G.PKMSVV3DSSkillPort.onCrit(pl,e);\n        e.hurt(p.dmg * k,");
  }else if(next.includes(pMirror)){
    patch(file,pMirror,
      "        const k = (p.mtype ? typeK(p.mtype, e) : 1) *\n"+
      "          (crit ? G.PKMSVV3DSSkillPort.critMultiplier(pl) : 1) * G.PKMSVV3DSSkillPort.bossMultiplier(pl, e);\n"+
      "        if (crit) G.PKMSVV3DSSkillPort.onCrit(pl, e);\n        e.hurt(p.dmg * k,");
  }else throw Error('3DS Stage1 real/mirror projectile multiplier source drift');
}

// Preserve immunity, true-damage events, Focus Sash and the existing
// damage-triggered companion reaction; only incoming ordinary hits can dodge.
patch('js/entities/player.js',
  '    if (this.invuln > 0 || this.dead) return;',
  '    if (this.invuln > 0 || this.dead) return;\n' +
  '    if (!pure && G.PKMSVV3DSSkillPort?.rollDodge(this)) {\n' +
  '      this.invuln = 0.12; G.PKMSVV3DSSkillPort.onDodge(this); return;\n' +
  '    }');
// Critical Beta 176 regression (Mewtwo at ~1:08): the original PKMSVV
// cooldown policy contains exactly 23 built-in families. Stage4 Light Screen
// registers a native kind='screen'; after its first cooldown G.Combat.tick
// used profiles[m.kind].floor and crashed every frame, force-ending Explore.
// Preserve all 103 original policies; new native 3DS move kinds get an
// explicit guarded policy with their authored cd/minCd, never a fake legacy
// kind. Unknown non-native kinds still throw an actionable error.
if(fs.existsSync(path.join(game,'js/data/pkmsvv-skill-balance.js'))){
patch('js/data/pkmsvv-skill-balance.js',
 '    return Math.max(profiles[m.kind].floor, m.cd * Math.max(0.01, Number(pl.cdMul) || 1));',
 '    const policy=profiles[m.kind];\n'+
 '    if(!policy && m.pkmsvv3dsNative){\n'+
 '      const cd=Number(m.cd);\n'+
 '      if(!Number.isFinite(cd)||cd<=0)throw Error("Invalid native 3DS cooldown: "+m.id);\n'+
 '      const haste=Math.max(0.01,Number(pl.cdMul)||1);\n'+
 '      const floor=Math.min(0.5,cd);\n'+
 '      return Math.max(floor,cd*haste);\n'+
 '    }\n'+
 '    if(!policy)throw Error("Unknown non-native move cooldown kind: "+m.kind);\n'+
 '    return Math.max(policy.floor,m.cd*Math.max(0.01,Number(pl.cdMul)||1));');
}else if(process.env.PKMSVV_BETA_176_SKILLS_QA==='1'){
 throw Error('Native Beta 176 must include original PKMSVV cooldown policy');
}else console.log('Public mirror has no PKMSVVBalance policy: keep its original cooldown engine');
console.log('PKMSVV_3DS_NATIVE_COOLDOWN_FAMILY_FALLBACK_FIX_PASS original 103 unchanged');
console.log('PKMSVV_3DS_WEB_PC_ANDROID_SKILL_PASSIVES_PATCH_PASS shared FX only, no sprites/save changes');
