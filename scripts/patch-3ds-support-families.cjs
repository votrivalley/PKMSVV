'use strict';
// Run AFTER both Stage1 and Stage2+3 source patchers. Never deploy by itself.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(rel,from,to){
 const file=path.join(game,rel);
 const text=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 const n=text.split(from).length-1;
 if(n!==1)throw Error('3DS Stage4 support source anchor drift: '+rel+' '+n+' for '+from.slice(0,95));
 fs.writeFileSync(file,text.replace(from,to),'utf8');
}
for(const name of ['pkmsvv-3ds-stage4-moves','pkmsvv-3ds-support-stage4'])
 fs.copyFileSync(path.join(root,'src',name+'.js'),path.join(game,'js','systems',name+'.js'));
const anchor='<script defer src="js/systems/pkmsvv-3ds-combat-stage3.js"></script>';
patch('dev.html',anchor,anchor+
 '\n<script defer src="js/systems/pkmsvv-3ds-stage4-moves.js"></script>'+
 '\n<script defer src="js/systems/pkmsvv-3ds-support-stage4.js"></script>');
// Native Rest pauses the ENTIRE combat cycle; no AUTO skill ticking while
// asleep. Does not globally pause the game (enemy, environment, UI proceed).
patch('js/systems/combat.js',
 '  function tick(dt, pl, now) {\n    if (pl.dead) return;',
 '  function tick(dt, pl, now) {\n    if (pl.dead || G.PKMSVV3DSStage4Support.isResting(pl)) return;');
// Near full HP: Rest retries in a second; does not burn a long cooldown or
// animation. Native Protect's minCd=5s bypasses ordinary cooldown reduction.
// Do not replace the real PKMSVV balance engine cooldown (and its CDR);
// the QA mirror uses the unmodified upstream raw cooldown.
{
 const rel='js/systems/combat.js';
 const src=fs.readFileSync(path.join(game,rel),'utf8').replace(/\r\n/g,'\n');
 const real='    m.t = G.PKMSVVBalance.effectiveCooldown(pl, m);\n    pl.cast(m);';
 const mirror='    m.t = Math.max(0.05, m.cd * pl.cdMul);\n    pl.cast(m);';
 const found=src.includes(real)?real:src.includes(mirror)?mirror:null;
 if(!found)throw Error('Stage4 native cooldown real/mirror source drift');
 const keep=found.split('\n')[0];
 patch(rel,found,
   "    if(m.kind==='rest' && !G.PKMSVV3DSStage4Support.needsRest(pl)){m.t=1;return;}\n"+
   keep+"\n"+
   "    if(m.kind==='guard')m.t=Math.max(m.t,Number(m.minCd)||0);\n"+
   "    pl.cast(m);");
}
// The source Web used no attack category for incoming damage. Explicit
// enemy projectiles are special; direct body-contact remains physical.
patch('js/systems/combat.js',
 '          pl.hurt(p.dmg, p.mtype);',
 "          pl.hurt(p.dmg, p.mtype, false, 'special');");
// Preserve all old hurt mechanics, but allow guard/screens BEFORE the existing
// passive dodge hook. Only status damage scales; true Judgment bypasses.
patch('js/entities/player.js',
 '  hurt(amount, type = null, pure = false) {',
 "  hurt(amount, type = null, pure = false, category = 'physical') {");
patch('js/entities/player.js',
 '    if (this.invuln > 0 || this.dead) return;\n    if (!pure && G.PKMSVV3DSSkillPort?.rollDodge(this)) {',
 '    if (this.invuln > 0 || this.dead) return;\n'+
 '    const protectedHit=G.PKMSVV3DSStage4Support.incomingDamage(this,amount,pure,category);\n'+
 '    if(protectedHit.blocked)return;\n'+
 '    amount=protectedHit.amount;\n'+
 '    if (!pure && G.PKMSVV3DSSkillPort?.rollDodge(this)) {');
// Native status families use Charge animations and buff sounds, not the
// fallback Attack animation. Match the newer 3DS/PMD visual vocabulary.
patch('js/entities/player.js',
 "cone: 'Shoot' }[m.kind] || 'Attack';",
 "cone: 'Shoot', punch: 'Attack', cross: 'Shoot', storm: 'Charge',"+
 " guard: 'Charge', screen: 'Charge', rest: 'Charge', decoy: 'Charge',"+
 " wave: 'Shoot', tremor: 'Attack' }[m.kind] || 'Attack';");
patch('js/entities/player.js',
 "cone: 'projectile' };",
 "cone: 'projectile', punch: 'melee', cross: 'nova', storm: 'beam',"+
 " guard: 'buff', screen: 'buff', rest: 'buff', decoy: 'buff',"+
 " wave: 'projectile', tremor: 'nova' };");
// Status timers are per-run, do not live in the serialized JSON.
patch('js/entities/player.js',
 '    if (this.dead) return;\n    if (this.invuln > 0) this.invuln -= dt;',
 '    if (this.dead) return;\n'+
 '    G.PKMSVV3DSStage4Support.tickPlayer(this,dt);\n'+
 '    if (this.invuln > 0) this.invuln -= dt;');
patch('js/entities/player.js',
 '    const [ax, ay] = this.frozen ? [0, 0] : G.Input.axis();',
 '    const [ax, ay] = (this.frozen || G.PKMSVV3DSStage4Support.isResting(this)) ? [0, 0] : G.Input.axis();');
// Native Double Team changes normal mobs' *chase target*, not their collision
// damage or the player's actual coordinates. No effect on bosses/Arceus.
patch('js/entities/enemy.js',
 '    update(dt, pl) {\n      // Fuera de pantalla',
 '    update(dt, pl) {\n'+
 '      pl=G.PKMSVV3DSStage4Support.decoyFor(this,pl)||pl;\n'+
 '      // Fuera de pantalla');
console.log('PKMSVV_3DS_STAGE4_PROTECT_REFLECT_LIGHTSCREEN_REST_DECOY_SOURCE_PATCH_PASS');
