'use strict';
/* Stage9 source patch AFTER Stage8, before Web mirror build.
 * Native 3DS Homing/Cone/Melee/Boomerang/Chain: reuse original swept projectile,
 * wall/props, melee hit, type/weather and status logic. No production mutation.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(rel,from,to){
 const p=path.join(game,rel),s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 const n=s.split(from).length-1;
 if(n!==1)throw Error('Stage9 Web source anchor drift: '+rel+' matches='+n+' '+from.slice(0,100));
 fs.writeFileSync(p,s.replace(from,to),'utf8');
}
fs.copyFileSync(path.join(root,'src','pkmsvv-3ds-stage9-homing-cone-melee.js'),
 path.join(game,'js','systems','pkmsvv-3ds-stage9-homing-cone-melee.js'));
const anchor='<script defer src="js/systems/pkmsvv-3ds-charge-stage8.js"></script>';
patch('dev.html',anchor,anchor+
 '\n<script defer src="js/systems/pkmsvv-3ds-stage9-homing-cone-melee.js"></script>');
// Stage8 already routes five original Web engine families. Reuse those same
// execution pipelines for all Stage9 source kinds; only Homing needs a switch alias.
patch('js/systems/combat.js',
 '&& ["projectile","dash","meteor","beam","nova"].includes(m.kind) &&',
 '&& ["projectile","dash","meteor","beam","nova","homing","cone","melee","boomerang","chain"].includes(m.kind) &&');
patch('js/systems/combat.js',
 '!["projectile","dash","meteor","beam","nova"].includes(m.kind)',
 '!["projectile","dash","meteor","beam","nova","homing","cone","melee","boomerang","chain"].includes(m.kind)');
patch('js/systems/combat.js',
 "      case 'projectile': fireProjectiles(pl, m); break;",
 "      case 'projectile': fireProjectiles(pl, m); break;\n"+
 "      case 'homing':     fireProjectiles(pl, m); break;");
patch('js/systems/combat.js',
 "const TARGETED = ['melee', 'beam', 'projectile', 'boomerang', 'chain', 'meteor', 'dash', 'cone'];",
 "const TARGETED = ['melee', 'beam', 'projectile', 'homing', 'boomerang', 'chain', 'meteor', 'dash', 'cone'];");
// Native-only extras. Do not expose these attributes on existing 103 legacy IDs.
patch('js/systems/combat.js',
 'return { burn: m.burn || 0, poison: m.poison || 0, slow: m.slow || 0, knock: m.knock || 0, mtype: m.type };',
 'return { burn: m.burn || 0, poison: m.poison || 0, slow: m.slow || 0, knock: m.knock || 0, mtype: m.type,'+
 ' pkmsvv3dsNative: !!m.pkmsvv3dsNative, critUp: m.pkmsvv3dsNative ? (m.critUp || 0) : 0,'+
 ' splash: m.pkmsvv3dsNative ? (m.splash || 0) : 0 };');
// Native Silver Wind: 15% chance on CAST, +8% ATK/+8% SPD for 6 s, three stacks.
patch('js/systems/combat.js',
 '    pl.cast(m);\n',
 '    pl.cast(m);\n'+
 '    if(m.pkmsvv3dsNative && m.id==="silver-wind" && !ghost && Math.random()<(m.boost||0)){\n'+
 '      pl.addBuff("atk",.08,6,3);pl.addBuff("spd",.08,6,3);\n'+
 '      G.FX.dmgText?.(pl.x,pl.y-(pl.bodyH||20)-8,"ATK + SPD",G.U.TYPE_COLOR.bug,false);\n'+
 '    }\n');
// Crunch native shred: the target takes 25% extra from direct attacks for 4s.
// Use dt-based enemy status, not wall-clock time (pause and x1.5 safe).
patch('js/entities/enemy.js',
 '      if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slow = 0; }',
 '      if(this.pkmsvv3dsShredT>0)this.pkmsvv3dsShredT=Math.max(0,this.pkmsvv3dsShredT-dt);\n'+
 '      if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slow = 0; }');
patch('js/systems/combat.js',
 '    const k = typeK(m.type, e);\n',
 '    const k = typeK(m.type, e)*(e.pkmsvv3dsShredT>0?1.25:1);\n');
patch('js/systems/combat.js',
 '    if (m.slow) e.applySlow(m.slow);\n',
 '    if (m.slow) e.applySlow(m.slow);\n'+
 '    if(m.pkmsvv3dsNative && m.shred>0 && !e.dead)e.pkmsvv3dsShredT=m.shred;\n');
// Flower Trick: +50% attack-local crit chance; cannot affect legacy bullets.
patch('js/systems/combat.js',
 '        const crit = isCrit(pl);\n        const k = ',
 '        const crit = isCrit(pl) || (p.pkmsvv3dsNative && p.critUp>0 && Math.random()<p.critUp);\n        const k = ');
patch('js/systems/combat.js',
 '        const k = (p.mtype ? typeK(p.mtype, e) : 1) * (crit ? CRIT_MUL : 1);',
 '        const k = (p.mtype ? typeK(p.mtype, e) : 1) * (crit ? CRIT_MUL : 1) * (e.pkmsvv3dsShredT>0?1.25:1);');
// Moonblast on projectile impact: a single radial splash at 60% of PRIMARY
// final hit damage, no recursion, no duplicate damage on the primary target.
patch('js/systems/combat.js',
 '        pl.onDealt(p.dmg * k);\n',
 '        pl.onDealt(p.dmg * k);\n'+
 '        if(p.pkmsvv3dsNative && p.splash>0){\n'+
 '          const sx=e.x,sy=e.y,sr=p.splash;\n'+
 '          G.FX.ring?.(sx,sy,4,sr,p.color,.25,3);\n'+
 '          for(const other of G.EnemyMgr.queryCircle(sx,sy,sr)){\n'+
 '            if(other.id===e.id||other.dead)continue;\n'+
 '            const splashDamage=p.dmg*k*.6;\n'+
 '            other.hurt(splashDamage,p.color,other.x-sx,other.y-sy,0);\n'+
 '            pl.dmgDealt+=splashDamage;pl.onDealt(splashDamage);\n'+
 '          }\n'+
 '        }\n');
console.log('PKMSVV_3DS_STAGE9_HOMING_CONE_MELEE_SOURCE_PATCH_PASS');
