'use strict';
/* Stage10 source patch AFTER Stage9 / BEFORE Web build.
 * Fail-closed on source-anchor drift. Do not bypass prepare-game.cjs
 * pinned upstream identity or enable native skills in networked Co-op.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(rel,from,to){
 const p=path.join(game,rel),s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 const n=s.split(from).length-1;
 if(n!==1)throw Error('Stage10 Web source anchor drift: '+rel+' matches='+n+' '+from.slice(0,110));
 fs.writeFileSync(p,s.replace(from,to),'utf8');
}
for(const name of ['pkmsvv-3ds-stage10-final-moves','pkmsvv-3ds-combat-stage10'])
 fs.copyFileSync(path.join(root,'src',name+'.js'),
  path.join(game,'js','systems',name+'.js'));
const anchor='<script defer src="js/systems/pkmsvv-3ds-stage9-homing-cone-melee.js"></script>';
patch('dev.html',anchor,anchor+
 '\n<script defer src="js/systems/pkmsvv-3ds-stage10-final-moves.js"></script>'+
 '\n<script defer src="js/systems/pkmsvv-3ds-combat-stage10.js"></script>');
// Existing Web projectile sweep is the authority for Psyshock; the other
// native field families execute the existing 3DS field adapter or Stage10 FX.
const engineKinds='["projectile","dash","meteor","beam","nova","homing","cone","melee","boomerang","chain"]';
const finalKinds='["projectile","dash","meteor","beam","nova","homing","cone","melee","boomerang","chain","bounce"]';
patch('js/systems/combat.js',
 '&& '+engineKinds+'.includes(m.kind) &&',
 '&& '+finalKinds+'.includes(m.kind) &&');
patch('js/systems/combat.js',
 '!'+engineKinds+'.includes(m.kind)',
 '!'+finalKinds+'.includes(m.kind)');
// True pinned 103-skill source already has native Bounce and Homing
// routing, including wall-safe rebound. The 64-skill mirror needs one case.
{
 const rel='js/systems/combat.js';
 const txt=fs.readFileSync(path.join(game,rel),'utf8').replace(/\r\n/g,'\n');
 if(!/case 'bounce':\s+fireProjectiles\(pl, m\);/.test(txt))
  patch(rel,"      case 'homing':     fireProjectiles(pl, m); break;",
    "      case 'homing':     fireProjectiles(pl, m); break;\n"+
    "      case 'bounce':     fireProjectiles(pl, m); break;");
}
// 3DS native target policy (only added IDs). Avoid wasting cooldown when
// a timed stun, forward quake, spin or shove has no reachable enemy.
patch('js/systems/combat.js',
 '    if(G.PKMSVV3DSStage5Combat.needsTarget(m) &&',
 '    if(G.PKMSVV3DSStage10Combat.needsTarget(m) &&\n'+
 '      !(pl.target && !pl.target.dead &&\n'+
 '        G.U.dist(pl.x,pl.y,pl.target.x,pl.target.y)<=G.PKMSVV3DSStage10Combat.reach(m))){\n'+
 '      m.t=.05;return;\n'+
 '    }\n'+
 '    if(G.PKMSVV3DSStage5Combat.needsTarget(m) &&');
// Protect native LevelUp: Stun duration multiplies; Bounce adds hops, not
// assigns absolute stat values. Preserve the already-supported Stage8 charge.
// In the pinned engine, Stun is already multiplicative and Bounce is
// already additive. Keep the original move upgrade engine intact.
{
 const rel='js/data/moves.js';
 const txt=fs.readFileSync(path.join(game,rel),'utf8').replace(/\r\n/g,'\n');
 const mirror="'rate', 'range', 'knock', 'charge'];";
 const real="'pull', 'knock', 'stun', 'charge', 'range'];";
 if(txt.includes(mirror)){
  patch(rel,mirror,"'rate', 'range', 'knock', 'charge', 'stun'];");
  patch(rel,"const ADD = ['count', 'pierce', 'stacks'];",
   "const ADD = ['count', 'pierce', 'stacks', 'bounce'];");
 }else if(!txt.includes(real)||!txt.includes(
   "const ADD = ['count', 'pierce', 'stacks', 'bounce'];"))
   throw Error('Stage10 original/mirror stun + bounce levelup drift');
}
// Attach exact source-linked metadata only to new native projectiles,
// never rewrite an existing 103-ID skill or its old payload.
patch('js/systems/combat.js',
 'm.pkmsvv3dsNative ? { pkmsvv3dsNative:true, critUp:m.critUp||0, splash:m.splash||0 } : {});',
 'm.pkmsvv3dsNative ? { pkmsvv3dsNative:true, critUp:m.critUp||0,\n'+
 '        splash:m.splash||0, bounce:m.bounce||0, pkmsvv3dsCategory:m.cat||null } : {});');
// Preserve original Stats.taken, Judgment and Kecleon ability damage.
{
 const rel='js/systems/combat.js';
 const txt=fs.readFileSync(path.join(game,rel),'utf8').replace(/\r\n/g,'\n');
 const real='    const k = typeK(m.type, e) * G.Stats.taken(e.mon, m.cat) * abilityK(pl,m,e)*(e.pkmsvv3dsShredT>0?1.25:1);';
 const mirror='    const k = typeK(m.type, e)*(e.pkmsvv3dsShredT>0?1.25:1);';
 const found=txt.includes(real)?real:txt.includes(mirror)?mirror:null;
 if(!found)throw Error('Stage10 direct-hit original/mirror dmg coefficient drift');
 patch(rel,found,found.slice(0,-1)+' * G.PKMSVV3DSStage10Combat.specialMultiplier(pl,m);');
}
// The original pinned engine has a category-aware projectile path, ability
// multiplier and critK. Only add the temporary Geomancy special-only factor.
{
 const rel='js/systems/combat.js';
 const txt=fs.readFileSync(path.join(game,rel),'utf8').replace(/\r\n/g,'\n');
 const real='          abilityK(pl,p.src,e) * G.PKMSVV3DSSkillPort.bossMultiplier(pl,e) * (e.pkmsvv3dsShredT>0?1.25:1);';
 const mirror='          G.PKMSVV3DSSkillPort.bossMultiplier(pl, e) * (e.pkmsvv3dsShredT>0?1.25:1);';
 const found=txt.includes(real)?real:txt.includes(mirror)?mirror:null;
 if(!found)throw Error('Stage10 projectile original/mirror dmg coefficient drift');
 patch(rel,found,found.slice(0,-1)+' * G.PKMSVV3DSStage10Combat.specialMultiplier(pl,p);');
}
// Native bounce chooses a nearby *unhit* enemy within 220px on each impact.
// Redirect after original impact (and its poison/crit) is resolved; do not
// bypass ghost rules or double-apply the originating hit.
// Pinned original already executes rebound(p,e) before pierce, including
// 220px no-repeat target selection. Never duplicate bouncing on this engine.
{
 const rel='js/systems/combat.js';
 const txt=fs.readFileSync(path.join(game,rel),'utf8').replace(/\r\n/g,'\n');
 if(txt.includes('        if (!p.orb && rebound(p, e)) break;')){
   // Nothing to patch: real engine owns the true bounce.
 }else{
   patch(rel,
    '        if (!p.orb) {\n          if (p.pierce > 0) { p.pierce--; }',
    '        if (!p.orb) {\n          if(G.PKMSVV3DSStage10Combat.rebound(p,e))break;\n'+
    '          if (p.pierce > 0) { p.pierce--; }');
   patch(rel,
    '          if (p.pierce > 0) { p.pierce--; continue; }\n          G.FX.burst(p.x, p.y - G.LIFT, p.color, 5, 80);',
    '          if(G.PKMSVV3DSStage10Combat.rebound(p,e))break;\n'+
    '          if (p.pierce > 0) { p.pierce--; continue; }\n          G.FX.burst(p.x, p.y - G.LIFT, p.color, 5, 80);');
 }
}
// Use player simulation time, not wall time. Geomancy must expire naturally
// during pause/time-scale changes and never modify physical hit categories.
patch('js/entities/player.js',
 '    if (this.slowT > 0) this.slowT -= dt;',
 '    G.PKMSVV3DSStage10Combat.tickPlayer(this,dt);\n'+
 '    if (this.slowT > 0) this.slowT -= dt;');
// Expose meaningful PMD walk/cast cues while using original VFX sprites.
patch('js/entities/player.js',
 "charge: 'Charge' }[m.kind] || 'Attack';",
 "charge: 'Charge', shove: 'Attack', stun: 'Charge', spin: 'Attack',\n"+
 "quake: 'Attack', bounce: 'Shoot', buff: 'Charge' }[m.kind] || 'Attack';");
patch('js/entities/player.js',
 "charge: 'beam' };",
 "charge: 'beam', shove: 'nova', stun: 'nova', spin: 'melee',\n"+
 "quake: 'nova', bounce: 'projectile', buff: 'buff' };");
console.log('PKMSVV_3DS_STAGE10_FINAL_SKILLS_SOURCE_PATCH_PASS');
