'use strict';
// LAN bots are actual host-side Player instances, not simulated client health/casts.
const fs=require('node:fs'),path=require('node:path');
const game=path.resolve(__dirname,'../vendor/pokesurvivor');
function once(file,from,to){
 const p=path.join(game,file),code=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 if(code.split(from).length!==2)throw Error('LAN AI anchor drift: '+file+' '+from.slice(0,60));
 fs.writeFileSync(p,code.replace(from,to),'utf8');
}
once('js/net/coop.js',
 "      mates.set(m.uid, { uid: m.uid, name: m.name, color: COLORS[i], pl: p, connected: true, q: [], flushT: 0, xpMul: 1 });\n    });",
 "      mates.set(m.uid, { uid: m.uid, name: m.name, color: COLORS[i], pl: p, connected: true, q: [], flushT: 0, xpMul: 1 });\n    });\n    if(host)G.LanAI.begin();");
once('js/net/coop.js','    api.levelStart(level);\n    sendWaiting();',
 '    api.levelStart(level);\n    G.LanAI.levelUp(level,levelSeq);\n    sendWaiting();');
once('js/net/coop.js','    ANIMS, COLORS, begin, end, leave, tick, players, puppets, xpFactor, scaleRate, scaleHp,',
 `    botPicked(uid,seq){if(host&&seq===levelSeq&&mates.get(uid)?.pl.lanBot)picked(uid);},
    ANIMS, COLORS, begin, end, leave, tick, players, puppets, xpFactor, scaleRate, scaleHp,`);
once('js/net/coop.js','    const st = api.team();',
 `    for(const bot of mates.values())if(bot.pl.lanBot){
      bot.state=G.LanAI.frame(bot.pl);bot.xpMul=bot.pl.xpMul;
    }
    const st = api.team();`);
once('js/net/coop.js',"    if (!active || pl !== local) return;\n    if (host) {emit(['c', me,",
 "    if (!active || (pl !== local && !(host && pl.lanBot))) return;\n    if (host) {emit(['c', pl.uid,");
once('js/entities/player.js',
 '    const [ax, ay] = this.frozen ? [0, 0] : G.Input.axis();',
 '    const [ax, ay] = this.frozen ? [0, 0] : (this.lanBotAxis || G.Input.axis());');
once('js/entities/player.js','  netUpdate(dt) {\n',
 '  netUpdate(dt) {\n    if(this.lanBot)return; // authoritative host actor: never overwrite learned moves/HP with a puppet snapshot\n');
once('js/entities/projectile.js','if (!G.Camera.sees(p.x, p.y, 260))',
 'if (!G.Camera.sees(p.x, p.y, 260)&&!G.LanAI.near(p.x,p.y))');
once('js/game.js','    pl.update(dt);\n    if (coop) {',
 '    pl.update(dt);\n    if(coop&&G.Coop.isHost)G.LanAI.update(dt,time);\n    if (coop) {');
once('js/game.js','p.netUpdate(dt); G.Combat.ghostOrbit(p, dt, time);',
 'p.netUpdate(dt); if(!p.lanBot)G.Combat.ghostOrbit(p, dt, time);');
once('js/systems/combat.js','  function resolve(dt, pl, now) {',
 '  function resolve(dt, localPlayer, now) {\n    const pl=localPlayer;');
once('js/systems/combat.js','      const p = projectiles[i];',
 '      const p = projectiles[i];\n      const pl=p.friendly&&p.owner?.lanBot?p.owner:localPlayer;');
once('js/systems/combat.js','G.PKMSVVDash.direction(pl,G.Input.axis())',
 'G.PKMSVVDash.direction(pl,pl.lanBotAxis||G.Input.axis())');
once('js/systems/combat.js',
 `        if (G.U.dist2(p.x, p.y, pl.x, pl.y) < (p.r + pl.r) * (p.r + pl.r)) {
          pl.hurt(p.dmg, p.mtype, false, p.cat);`,
 `          const victim=[pl,...(G.Coop.isHost?G.Coop.puppets().filter(o=>o.lanBot):[])]
            .find(o=>!o.dead&&G.U.dist2(p.x,p.y,o.x,o.y)<(p.r+o.r)**2);
          if (victim) {
            victim.hurt(p.dmg, p.mtype, false, p.cat);`);
once('js/systems/combat.js','    // --- contacto enemigo <-> jugador ---\n    if (pl.dead) return;',
 `    // --- contacto enemigo <-> jugador ---
    for(const actor of [pl,...(G.Coop.isHost?G.Coop.puppets().filter(o=>o.lanBot):[])]){
    const pl=actor;
    if (pl.dead) continue;`);
once('js/systems/combat.js','      e.kx += nx * 150; e.ky += ny * 150;\n    }\n  }',
 '      e.kx += nx * 150; e.ky += ny * 150;\n    }\n    }\n  }');
once('js/systems/hazards.js',
 '    const pl = G.Game.player;',
 '    const players=[G.Game.player,...(G.Coop.isHost?G.Coop.puppets().filter(p=>p.lanBot):[])];');
once('js/systems/hazards.js','        if (pl && !pl.dead && inside(h, pl.x, pl.y, pl.r)) {',
 '        for(const pl of players)if (pl && !pl.dead && inside(h, pl.x, pl.y, pl.r)) {');
// Egg Rush bots obey the same PvP immunity/slow, two revives, and owned-pet rules.
once('js/net/pkmsvv-egg-rush.js','const [, ,uid,dmg,slow]=ev,pl=G.Game.player;',
 'const [, ,uid,dmg,slow]=ev,pl=G.Game.player?.uid===uid?G.Game.player:(G.Coop.isHost?G.Coop.players().find(p=>p.lanBot&&p.uid===uid):null);');
once('js/net/pkmsvv-egg-rush.js','if(p===G.Game.player){','if(p===G.Game.player||(G.Coop.isHost&&p.lanBot)){');
once('js/net/pkmsvv-egg-rush.js',
 'if(p.dead&&revives<2){deathTime+=dt;if(deathTime>=5){p.revive(.5);revives++;deathTime=0;}}\n    else if(!p.dead)deathTime=0;',
 'if(p.dead&&(p.lanEggRevives||0)<2){p.lanEggDeath=(p.lanEggDeath||0)+dt;if(p.lanEggDeath>=5){p.revive(.5);p.lanEggRevives=(p.lanEggRevives||0)+1;p.lanEggDeath=0;}}\n    else if(!p.dead)p.lanEggDeath=0;');
once('js/net/pkmsvv-egg-rush.js',"if(pet.hatch&&pet.uid===G.Game.player?.uid){",
 "const owner=pet.uid===G.Game.player?.uid?G.Game.player:(G.Coop.isHost?players.find(p=>p.lanBot&&p.uid===pet.uid):null);\n   if(pet.hatch&&owner){");
once('js/net/pkmsvv-egg-rush.js','support(pet,G.Game.player);','support(pet,owner);');
// Both cast() and orb() must apply hits to locally owned bots as well as broadcast.
const eggFile=path.join(game,'js/net/pkmsvv-egg-rush.js');
let egg=fs.readFileSync(eggFile,'utf8');
const routeHit='if(target.uid===G.Game.player?.uid)onEvent(evt);else G.Coop.broadcast(evt);';
if(egg.split(routeHit).length!==3)throw Error('LAN Egg Rush hit routing drift');
egg=egg.split(routeHit).join('if(target.uid===G.Game.player?.uid||target.lanBot)onEvent(evt);else G.Coop.broadcast(evt);');
fs.writeFileSync(eggFile,egg,'utf8');
console.log('LAN AI: engine Player movement/combat/rewards, level barrier and damage integration installed.');
