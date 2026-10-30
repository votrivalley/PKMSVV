'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..'),base=path.join(root,'vendor/pokesurvivor');
function patch(file,a,b){const p=path.join(base,file),s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');if(s.split(a).length!==2)throw Error('Arena source drift '+file+': '+a.slice(0,70));fs.writeFileSync(p,s.replace(a,b));}
for(const file of ['pkmsvv-arena','pkmsvv-match-metrics','pkmsvv-death-hud','pkmsvv-spectator'])fs.copyFileSync(path.join(root,'src/web',file+'.js'),path.join(base,'js/net',file+'.js'));
patch('dev.html','<script defer src="js/net/pkmsvv-egg-rush.js"></script>',
 '<script defer src="js/net/pkmsvv-egg-rush.js"></script>\n<script defer src="js/net/pkmsvv-arena.js"></script>\n<script defer src="js/net/pkmsvv-match-metrics.js"></script>\n<script defer src="js/net/pkmsvv-death-hud.js"></script>\n<script defer src="js/net/pkmsvv-spectator.js"></script>');
// A dead Royale trainer spectates living trainers instead of being stuck
// at their corpse. View control is LOCAL; authoritative match keeps running.
patch('js/game.js',
 '    G.Camera.follow(pl.x, pl.y, dt);\n    G.World.update(dt, G.Camera);',
 '    const spectator=G.PKMSVVSpectator.cameraTarget();\n    G.Camera.follow(spectator?.x??pl.x,spectator?.y??pl.y,dt);\n    G.World.update(dt, G.Camera);');
patch('js/game.js',
 "    if (G.Coop.active && pl && state !== 'ui' && state !== 'over') G.Coop.tick(dt);",
 "    if (G.Coop.active && pl && state !== 'ui' && state !== 'over') G.Coop.tick(dt);\n    G.PKMSVVSpectator.tick();");
// Legacy level/item modals can still leave an already-eliminated Royale
// trainer in a non-playing game state. Resume simulation before processing
// inputs so there is no stuck level-up screen or frozen Host match.
patch('js/game.js',
 '    G.Pad.poll(real);\n    handleKeys();',
 "    G.Pad.poll(real);\n    if(pl?.dead&&G.Royale?.active&&(state==='levelup'||state==='choice')){\n      state='playing';G.RunUI.closeLevelUp();\n      G.UI.hide('scr-item');G.UI.hide('scr-bond');\n    }\n    handleKeys();");
// The original Rift exits without clearing World.arena, causing a permanent
// disabled red circle. It also revives fallen multiplayer trainers on exit.
patch('js/systems/rift.js',
 '    arena = null;\n    G.World.setBiome(a.biome, true);',
 '    arena = null;\n    G.World.setArena(null);\n    G.World.setBiome(a.biome, true);');
patch('js/systems/rift.js',
 '    if (pl.dead) pl.revive(0.3);',
 '    if (pl.dead && !G.Coop.active) pl.revive(0.3);');
patch('js/game.js','    G.EggRush.begin(coop);','    G.EggRush.begin(coop);G.Arena.begin(coop);G.MatchMetrics.reset();G.PKMSVVSpectator.reset();');
patch('js/game.js','    if (!coop || G.Coop.isHost) { G.Path.update(dt, all); G.Spawner.update(dt, all, time); }',
 '    G.Arena.update(dt,time,all);\n    if (!coop || G.Coop.isHost) { G.Path.update(dt, all); G.Spawner.update(dt, all, time); }');
// Rival modes must never render the shared Co-op rescue message, teammate
// health bars or off-screen 'needs help' arrows. Egg Rush owns its 8s timer;
// Royale is elimination-only; ordinary Co-op rescue remains unchanged.
patch('js/ui/hud.js',
 '    if (G.Coop.active) drawCoop(ctx, w, h, pl, px, py + (bx > px ? 56 : 40));',
 '    if (G.Coop.active && !G.Royale.active && !G.EggRush.active) drawCoop(ctx, w, h, pl, px, py + (bx > px ? 56 : 40));');
// Keep teammate health bars/arrows in Co-op, but suppress the older
// large rescue sentence: all modes now share exactly one small overlay.
patch('js/ui/hud.js',
 '    // Tú, caído.\n    if (pl.dead) {',
 '    // Tú, caído.\n    if (pl.dead && !G.PKMSVVDeathHUD) {');
patch('js/game.js','    G.Touch.draw(ctx);',
 '    G.PKMSVVDeathHUD.draw(ctx,w,h,pl);\n    G.Touch.draw(ctx);');
patch('js/game.js','    if (!G.Judgment.cinematic) G.HUD.draw(ctx, w, h, pl, st);',
 '    if (!G.Judgment.cinematic) G.HUD.draw(ctx, w, h, pl, st);\n    G.Arena.draw(ctx,w,h);');
patch('js/entities/player.js','  update(dt) {\n    this.anim.update(dt);',
 '  update(dt) {\n    const arenaPrevious={x:this.x,y:this.y};\n    this.anim.update(dt);');
patch('js/entities/player.js','    else this.walking=true;',
 '    else this.walking=true;\n    G.Arena?.motion(this,arenaPrevious);');
patch('js/net/coop.js','      case \'er\': G.EggRush.onEvent(ev); break;',
 '      case \'az\': G.Arena.onEvent(ev); break;\n      case \'er\': G.EggRush.onEvent(ev); break;');
patch('js/net/coop.js','    const ja = G.Judgment.netState();',
 '    f.az=G.Arena.snapshot();\n    const ja = G.Judgment.netState();');
patch('js/net/coop.js','    for (const ev of msg.ev || []) applyHostEvent(ev);',
 '    G.Arena.receive(msg.az);\n    for (const ev of msg.ev || []) applyHostEvent(ev);');
{
 const p=path.join(base,'js/net/coop.js'),s=fs.readFileSync(p,'utf8');
 const a="G.Net.toHost({ k: 'f', p: myState(), ev: outEv });";
 if(s.split(a).length!==3)throw Error('Arena client camera frame drift');
 fs.writeFileSync(p,s.split(a).join("G.Net.toHost({ k: 'f', p: myState(), ev: outEv, av:[G.Camera.x,G.Camera.y,G.Camera.w,G.Camera.h] });"));
}
patch('js/net/coop.js','    if (msg.p) { m.state = msg.p;',
 '    if(msg.p&&(!Array.isArray(msg.p)||!Number.isFinite(msg.p[0])||!Number.isFinite(msg.p[1])))return;\n    G.Arena.view(from,msg.av);\n    if(msg.p&&G.Arena.mode===\'eggrush\'){const old={x:m.pl.x,y:m.pl.y},p={x:msg.p[0],y:msg.p[1],r:m.pl.r,dead:m.pl.dead};G.Arena.motion(p,old);msg.p[0]=p.x;msg.p[1]=p.y;}\n    if (msg.p) { m.state = msg.p;');
patch('js/game.js','  function frame(ts) {','  function frame(ts) {\n    const metricStart=performance.now();');
patch('js/game.js','    G.UI.tick(dt);\n\n    G.Input.endFrame();',
 '    G.UI.tick(dt);\n\n    G.Input.endFrame();\n    G.MatchMetrics.frame(performance.now()-metricStart,real*1000);');
patch('js/world/world.js','    get arena() { return arena; },',
 '    cacheMetrics(){return {data:data.size,images:images.size};},\n    get arena() { return arena; },');
patch('js/systems/spawner.js',
 '(G.Royale.active?G.Royale.intensity(t).density:1);',
 '(G.Royale.active?G.Royale.intensity(t).density*G.Arena.openingBoost(t):1);');
 // Apply a run-time multiplier to the enemy movement vector, not Enemy.spd.
 // This avoids permanently multiplying stats on every frame or save restore.
 patch('js/entities/enemy.js',
 '      const spd = this.spd * (1 - this.slow) * terrainMul * G.Weather.speedFor(this.types);',
 '      const spd = this.spd * (1 - this.slow) * terrainMul * G.Weather.speedFor(this.types) * (G.Royale?.active?G.Royale.speedAt(G.Game?.st?.time||0):1);');
patch('js/systems/spawner.js','  let players = [];',
 `  let players = [],openingQueue=null,anchorTurn=0;
  const openingMetrics={spawned:0,attempts:0,byTrainer:{}};
  function opening(t){
    if(!G.Royale.active)return;
    if(!openingQueue){const alive=players.filter(p=>p&&!p.dead);openingQueue=alive.flatMap((p,i)=>[0,1].map(j=>({uid:p.uid,due:3+(i*2+j)*9/Math.max(1,alive.length*2-1),retry:0})));}
    const index=openingQueue.findIndex(q=>t>=q.due&&t>=q.retry);
    if(index<0||G.EnemyMgr.count>=lateCap(t))return;
    const q=openingQueue[index],p=players.find(p=>p.uid===q.uid&&!p.dead);
    if(!p){openingQueue.splice(index,1);return;}
    openingMetrics.attempts++;
    if(spawnOne(p,t)){openingMetrics.spawned++;openingMetrics.byTrainer[q.uid]=(openingMetrics.byTrainer[q.uid]||0)+1;openingQueue.splice(index,1);}else q.retry=t+.5;
  }`);
patch('js/systems/spawner.js','    G.Enemies.rollRun();',
 '    openingQueue=null;anchorTurn=0;openingMetrics.spawned=openingMetrics.attempts=0;openingMetrics.byTrainer={};\n    G.Enemies.rollRun();');
patch('js/systems/spawner.js','    return alive.length ? G.U.pick(alive) : players[0];',
 `    if(G.Royale.active&&alive.length){
      const start=anchorTurn++%alive.length,all=G.EnemyMgr.all();let best=null,bestCount=Infinity;
      for(let i=0;i<alive.length;i++){const p=alive[(start+i)%alive.length];if(!G.Arena.validSpawn(p.x,p.y,80))continue;
        const n=all.reduce((n,e)=>n+(!e.dead&&G.U.dist2(e.x,e.y,p.x,p.y)<500*500?1:0),0);
        if(n<bestCount){bestCount=n;best=p;}}
      return best||Object.assign({},alive[start],G.Arena.clampGoal(alive[start],alive[start]));
    }
    return alive.length ? G.U.pick(alive) : players[0];`);
patch('js/systems/spawner.js','      if (players.length > 1 && seenByAnyone(x, y)) continue;',
 '      if(G.Arena.active&&(!G.Arena.validSpawn(x,y,30)||G.Arena.visible(x,y,players,70)))continue;\n      if(G.Arena.active&&(G.EggRush?.nests||[]).some(n=>!n.taken&&G.U.dist2(x,y,n.x,n.y)<100*100))continue;\n      if (!G.Arena.active&&players.length > 1 && seenByAnyone(x, y)) continue;');
patch('js/systems/spawner.js','    if (G.Rift.inArena || G.Judgment.active) return;',
 '    if (G.Rift.inArena || G.Judgment.active) return;\n    opening(t);');
patch('js/systems/spawner.js','i < amount && G.EnemyMgr.count < lateCap(t) + 10;',
 'i < amount && G.EnemyMgr.count < lateCap(t) + (G.Royale.active?0:10);');
patch('js/systems/spawner.js','    const [x, y] = ringPoint(pl, Math.random() * 6.2832);',
 '    const point=G.Arena.active?freePoint(pl,Math.random()*6.2832,false):ringPoint(pl,Math.random()*6.2832);\n    if(!point||G.Royale.active&&G.EnemyMgr.count>=lateCap(t))return null;\n    const [x,y]=point;');
patch('js/systems/spawner.js','if (b && t >= b.at) { spawnBoss(anchor(), t, b); bossIdx++; }',
 'if (b && t >= b.at) { if(spawnBoss(anchor(), t, b))bossIdx++; }');
patch('js/systems/spawner.js','  return { reset, update, ahead, burst, tickBanner, banner, say, rate, SHINY_RATE, CAP,',
 '  return { reset, update, ahead, burst, tickBanner, banner, say, rate, SHINY_RATE, CAP,openingMetrics,lateCap,');
console.log('v1.5.29 shared arena authority, camera envelopes and metrics installed.');
