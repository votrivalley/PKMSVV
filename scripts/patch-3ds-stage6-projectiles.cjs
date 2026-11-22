'use strict';
// Stage6 follows Stage5 on the pinned Web source. Fail closed on source drift.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(rel,from,to){
 const file=path.join(game,rel),src=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 const count=src.split(from).length-1;
 if(count!==1)throw Error('Stage6 source drift '+rel+' matches='+count+' anchor='+from.slice(0,80));
 fs.writeFileSync(file,src.replace(from,to),'utf8');
}
for(const name of ['pkmsvv-3ds-stage6-projectiles','pkmsvv-3ds-projectile-stage6-fx'])
 fs.copyFileSync(path.join(root,'src',name+'.js'),path.join(game,'js','systems',name+'.js'));
const anchor='<script defer src="js/systems/pkmsvv-3ds-combat-stage5.js"></script>';
patch('dev.html',anchor,anchor+
 '\n<script defer src="js/systems/pkmsvv-3ds-stage6-projectiles.js"></script>'+
 '\n<script defer src="js/systems/pkmsvv-3ds-projectile-stage6-fx.js"></script>');
// New native projectile IDs use original swept-collision engine, not Stage2 special field engine.
// Direct illegal casts blocked, in addition to the learn-pool owner lock.
patch('js/systems/combat.js',
 '    if (G.PKMSVV3DSMoveFamilies.isNativeMove(m.id)) {',
 '    if(G.PKMSVV3DSMoveFamilies.isNativeMove(m.id) && m.kind==="projectile" &&\n'+
 '      m.only?.length && !m.only.includes(Number(pl.mon?.dex)))return;\n'+
 '    if (G.PKMSVV3DSMoveFamilies.isNativeMove(m.id) && m.kind!=="projectile") {');
// Original 103-skill source already supplies mcat/src/bounce/drain.
// The QA mirror lacks those, so never replace or drop the originals.
{
 const rel='js/systems/combat.js';
 const txt=fs.readFileSync(path.join(game,rel),'utf8').replace(/\r\n/g,'\n');
 const real='return { burn: m.burn || 0, poison: m.poison || 0, slow: m.slow || 0, knock: m.knock || 0, mtype: m.type, mcat: m.cat, src: m,\n             bounce: m.bounce | 0, drain: m.drain || 0 };';
 const mirror='return { burn: m.burn || 0, poison: m.poison || 0, slow: m.slow || 0, knock: m.knock || 0, mtype: m.type };';
 const chosen=txt.includes(real)?real:txt.includes(mirror)?mirror:null;
 if(!chosen)throw Error('Stage6 projectile payload source variant drift');
 patch(rel,chosen,'return Object.assign('+chosen.slice('return '.length,-1)+',\n'+
  '      G.PKMSVV3DSStage6ProjectileFX.payload(m));');
}
patch('js/systems/combat.js',
 '        const crit = isCrit(pl);\n        const k = (p.mtype ?',
 '        const crit = p.pkmsvv3dsId ? G.PKMSVV3DSStage6ProjectileFX.rollCrit(pl,p) : isCrit(pl);\n        const k = (p.mtype ?');
// Real PKMSVV applies Ability-status conversions before drain and native
// rebound. Keep those mechanics untouched; append only 3DS extras.
{
 const rel='js/systems/combat.js';
 const txt=fs.readFileSync(path.join(game,rel),'utf8').replace(/\r\n/g,'\n');
 const real='        if (p.drain) pl.heal(p.drain);';
 const mirror='        if (p.slow) e.applySlow(p.slow);\n\n        if (!p.orb)';
 if(txt.includes(real))patch(rel,real,
   '        G.PKMSVV3DSStage6ProjectileFX.onHit(p,e);\n'+real);
 else if(txt.includes(mirror))patch(rel,mirror,
   '        if (p.slow) e.applySlow(p.slow);\n'+
   '        G.PKMSVV3DSStage6ProjectileFX.onHit(p,e);\n\n        if (!p.orb)');
 else throw Error('Stage6 original/mirror projectile on-hit source drift');
}
patch('js/systems/combat.js',
 "        if (block === 'wall' || (block && !block.destructible)) {\n          G.FX.burst(p.x, p.y - G.LIFT, p.color, 5, 80);\n          projectiles.splice(i, 1);",
 "        if (block === 'wall' || (block && !block.destructible)) {\n          G.FX.burst(p.x, p.y - G.LIFT, p.color, 5, 80);\n          G.PKMSVV3DSStage6ProjectileFX.onEnd(p);\n          projectiles.splice(i, 1);");
patch('js/systems/combat.js',
 '      if (consumed) {\n        G.FX.burst(p.x, p.y - G.LIFT, p.color, 5, 80);\n        projectiles.splice(i, 1);',
 '      if (consumed) {\n        G.FX.burst(p.x, p.y - G.LIFT, p.color, 5, 80);\n        G.PKMSVV3DSStage6ProjectileFX.onEnd(p);\n        projectiles.splice(i, 1);');
patch('js/entities/projectile.js',
 '      if (p.t >= p.life) { list.splice(i, 1); continue; }',
 '      if (p.t >= p.life) { G.PKMSVV3DSStage6ProjectileFX.onEnd(p); list.splice(i, 1); continue; }');
patch('js/systems/combat.js',
 '  function updateFields(dt) {\n    for (let i = fields.length - 1;',
 '  function updateFields(dt) {\n    G.PKMSVV3DSStage6ProjectileFX.update(dt);\n    for (let i = fields.length - 1;');
patch('js/systems/combat.js',
 '  function drawGroundFields(ctx) {\n    const now = performance.now() / 1000;',
 '  function drawGroundFields(ctx) {\n    G.PKMSVV3DSStage6ProjectileFX.draw(ctx);\n    const now = performance.now() / 1000;');
patch('js/systems/combat.js',
 '  function clearFields(owner) { fields = owner ? fields.filter(f => f.owner !== owner) : []; }',
 '  function clearFields(owner) { G.PKMSVV3DSStage6ProjectileFX.clear(owner); fields = owner ? fields.filter(f => f.owner !== owner) : []; }');
patch('js/entities/enemy.js',
 '      if (this.dead) return;\n\n      // --- terreno ---',
 '      if (this.dead) return;\n      if (this._pkmsvv3dsStunT > 0) {\n'+
 '        this._pkmsvv3dsStunT = Math.max(0,this._pkmsvv3dsStunT - dt);\n'+
 '        this.kx=0;this.ky=0;return;\n'+
 '      }\n\n      // --- terreno ---');
console.log('PKMSVV_3DS_STAGE6_PROJECTILE_SOURCE_PATCH_PASS');