'use strict';
/* v1.4 hotfix: the pinned 2026-10-20 enemy.js has applyStun() but NO
 * applySleep(). Orbs were copied from a later upstream and could not work.
 * Install sleep on the actual enemy class, before app.min.js is compiled.
 */
const fs=require('node:fs'),path=require('node:path');
const game=path.join(__dirname,'..','vendor','pokesurvivor');
function patch(rel,from,to){
 const file=path.join(game,rel),src=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 if(src.split(from).length!==2)throw Error('Orb effects source drift in '+rel+': '+from.slice(0,95));
 fs.writeFileSync(file,src.replace(from,to),'utf8');
}
patch('js/entities/enemy.js',
 '      this.slow = 0; this.slowT = 0;',
 '      this.slow = 0; this.slowT = 0;\n      this.sleepT = 0;');
patch('js/entities/enemy.js',
 '    applySlow(factor, dur = 1.2) {',
 '    // Slumber Orb: stop walking and attacks for the advertised duration.\n'+
 '    applySleep(dur) {\n'+
 '      if (this.dead || this.remote || this.arceus) return;\n'+
 '      this.sleepT = Math.max(this.sleepT || 0, Math.max(0, dur));\n'+
 '    }\n\n'+
 '    applySlow(factor, dur = 1.2) {');
patch('js/entities/enemy.js',
 "      if (this.stunT > 0) { this.stunT -= dt; this.anim.loop('Idle'); return; }",
 "      if (this.sleepT > 0) {\n"+
 "        this.sleepT = Math.max(0, this.sleepT - dt);\n"+
 "        this.anim.loop('Idle');\n"+
 "        this.x += this.kx * dt; this.y += this.ky * dt;\n"+
 "        this.kx *= Math.pow(0.0015,dt); this.ky *= Math.pow(0.0015,dt);\n"+
 "        G.World.collide(this);\n"+
 "        return;\n"+
 "      }\n"+
 "      if (this.stunT > 0) { this.stunT -= dt; this.anim.loop('Idle'); return; }");
patch('js/entities/enemy.js',
 '      // Escudo: burbuja azul.',
 "      // Slumber Orb: visible feedback in solo and on remote enemies in Co-op.\n"+
 "      if (this.sleepT > 0 || (this.net && (this.net.st & 16))) {\n"+
 "        ctx.save(); ctx.textAlign = 'center';\n"+
 "        ctx.font = 'bold 14px Segoe UI, sans-serif';\n"+
 "        ctx.fillStyle = '#d9c9ff';\n"+
 "        ctx.fillText('Zz', this.x, this.y - lift - this.bodyH - 12);\n"+
 "        ctx.restore();\n"+
 "      }\n"+
 "      // Escudo: burbuja azul.");
// Status replication is visual; only the host runs enemy AI and timers.
patch('js/net/coop.js',
 '(e.burn > 0 ? 1 : 0) | (e.poison > 0 ? 2 : 0) | (e.shield > 0 ? 4 : 0) | (e.slow > 0 ? 8 : 0)]);',
 '(e.burn > 0 ? 1 : 0) | (e.poison > 0 ? 2 : 0) | (e.shield > 0 ? 4 : 0) | (e.slow > 0 ? 8 : 0) | (e.sleepT > 0 ? 16 : 0)]);');
patch('js/entities/enemy.js',
 "      this.anim.loop(moving ? 'Walk' : 'Idle');",
 "      this.anim.loop(n.st & 16 ? 'Idle' : moving ? 'Walk' : 'Idle');");
console.log('PKMSVV: Slumber Orb now sleeps real enemies, shows Zz and replicates the sleeping state.');
