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
console.log('LAN AI: engine Player movement/combat/rewards, level barrier and damage integration installed.');

once('js/net/coop.js','    active = false; host = false; local = null;',
 '    G.LanAI.stop();\n    active = false; host = false; local = null;');
once('js/game.js','    if (coop) G.Social.setPlaying(false);',
 '    if (coop) G.Social.setPlaying(false);\n    if(coop&&wasHost)void G.Social.finishMatch().catch(e=>G.UI.toast(e.message));');
once('js/game.js','  afterRun() {',
 '  async afterRun() {\n    await G.Social.finishMatch();');
once('js/net/coop.js','G.Orbs.ready(local)?1:0];',
 'G.Orbs.ready(local)?1:0,Math.min(2,local.lanEggRevives||0)];');
once('js/net/coop.js','orbReady:a[15]===1?1:0',
 'orbReady:a[15]===1?1:0,eggRevives:num(a[16],0,0,2)');

once('js/net/coop.js',"const position=cfg.mode==='eggrush'?G.EggRush.startPosition(cfg,i):null;",
 "const position=cfg.mode==='eggrush'?G.EggRush.startPosition(cfg,i):cfg.mode==='royale'?G.Royale.startPosition(cfg,i):null;");
once('js/game.js',"      else if (G.Royale.active) G.Royale.check(G.Coop.players(),time,result=>{",
 "      else if (G.Royale.active) {G.EggRush.update(dt,time,G.Coop.players(),()=>{});G.Royale.check(G.Coop.players(),time,result=>{");
once('js/game.js',"G.Coop.over(Object.assign(summary(),{royale:result}));endRun(result.winner!==G.Social.uid);\n      });",
 "G.Coop.over(Object.assign(summary(),{royale:result}));endRun(result.winner!==G.Social.uid);\n      });}");
once('js/game.js',"if(coop&&G.EggRush.active&&!G.Coop.isHost)","if(coop&&G.EggRush.enabled&&!G.Coop.isHost)");
once('js/game.js','if(G.EggRush.active)G.EggRush.draw(ctx);','if(G.EggRush.enabled)G.EggRush.draw(ctx);');
once('js/game.js','if(G.EggRush.active)G.EggRush.hud(ctx,w,h);','if(G.EggRush.enabled)G.EggRush.hud(ctx,w,h);');
