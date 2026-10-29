'use strict';
/* v1.5 Solo egg gameplay — applied after Ch3 and Orb patch layers. */
const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..');
const game=path.join(root,'vendor','pokesurvivor');
function patch(p,a,b){const file=path.join(game,p),src=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 if(src.split(a).length!==2)throw Error('Egg gameplay patch anchor drift '+p+': '+a.slice(0,92));
 fs.writeFileSync(file,src.replace(a,b),'utf8');
}
fs.mkdirSync(path.join(game,'js','systems'),{recursive:true});
fs.copyFileSync(path.join(root,'src','v15','eggs.js'),path.join(game,'js','systems','pkmsvv-eggs.js'));
fs.copyFileSync(path.join(root,'src','v15','boss-support.js'),path.join(game,'js','systems','pkmsvv-boss-support.js'));
fs.copyFileSync(path.join(root,'src','pkmsvv-support-catalog.js'),path.join(game,'js','ui','pkmsvv-support-catalog.js'));

fs.copyFileSync(path.join(root,'src','v15','egg-sprites.js'),path.join(game,'js','systems','pkmsvv-egg-sprites.js'));
const artFolder=path.join(game,'assets','eggs');
fs.mkdirSync(artFolder,{recursive:true});
for(const file of ['egg_follow.svg','egg_crack.svg','egg_nest.svg'])
 fs.copyFileSync(path.join(root,'src','v15','sprites',file),path.join(artFolder,file));
patch('dev.html','<script defer src="js/ui/menu.js"></script>',
 '<script defer src="js/ui/menu.js"></script>\n<script defer src="js/ui/pkmsvv-support-catalog.js"></script>');
patch('dev.html',
 '<script defer src="js/systems/orbs.js"></script>',
 '<script defer src="js/systems/orbs.js"></script>\n<script defer src="js/systems/pkmsvv-egg-sprites.js"></script>\n<script defer src="js/systems/pkmsvv-eggs.js"></script>\n<script defer src="js/systems/pkmsvv-boss-support.js"></script>');
patch('js/game.js',
 '    G.Camera.x = pl.x; G.Camera.y = pl.y; G.Camera.shake = 0;',
 '    G.PKMSVVEggs.begin(pl,!!coop);\n    G.Camera.x = pl.x; G.Camera.y = pl.y; G.Camera.shake = 0;');
patch('js/game.js',
 '    G.Orbs.update(dt,pl);',
 '    G.Orbs.update(dt,pl);\n    G.PKMSVVEggs.update(dt,pl,time,coop);');
patch('js/game.js',
 '    G.Pickups.draw(ctx);',
 '    G.Pickups.draw(ctx);\n    G.PKMSVVEggs.draw(ctx);');
// Follower entities share the exact same depth-sorted layer as Pokémon and
// map props. This keeps healing circles/flat props behind their sprites.
patch('js/game.js',
 '    for (const e of extra) items.push({ y: e.y, ent: e });',
 '    for (const e of extra) items.push({ y: e.y, ent: e });\n'+
 '    if(state!==\'ui\')for(const e of G.PKMSVVEggs?.drawables?.(cam)||[])items.push({y:e.y,ent:e});');
patch('js/game.js',
 '    G.Judgment.drawOverlay(ctx, w, h);',
 '    G.Judgment.drawOverlay(ctx, w, h);\n    G.PKMSVVEggs.hud(ctx,w,h);');
patch('js/entities/player.js',
 '    this.hp -= d;',
 '    const shield=Math.max(0,Number(this.pkmsvvShield)||0),absorbed=Math.min(shield,d);\n'+
 '    this.pkmsvvShield=shield-absorbed;\n'+
 '    this.hp -= d-absorbed;\n    if(!this.remote)G.PKMSVVEggs?.onHurt?.(d-absorbed);');
// Ditto's copied skills use the original combat renderer and damage rules,
// but from a scaled, non-player proxy. No duplicate XP or manual dash.
patch('js/systems/combat.js',
 '  return { tick, manualDash, resolve, ghostCast, ghostOrbit, updateFields, drawGroundFields, drawAirFields, clearFields,',
 `  function pkmsvvSupportCast(pl,it,m){
    if(!pl||!it||!m||pl.dead||G.Coop?.active)return false;
    const target=(G.EnemyMgr.all()||[]).filter(e=>!e.dead&&!e.remote)
      .reduce((best,e)=>{
       const d=G.U.dist2(it.x,it.y,e.x,e.y);
       return d<400*400&&(!best||d<best.d)?{e,d}:best;
      },null);
    if(!target)return false;
    const echo=Object.create(pl);
    echo.x=it.x;echo.y=it.y;echo.r=11;echo.target=target.e;
    echo.aim=Math.atan2(target.e.y-it.y,target.e.x-it.x);
    echo.dead=false;echo.net=null;
    echo.atkFor=move=>pl.atkFor(move)*(it.statScale||.65)*(it.affinityBoost||1)*.55*(it.shiny?1.5:1);
    echo.onDealt=()=>{};echo.cast=()=>{};echo.heal=()=>{};
    try{run(echo,{...m});return true;}catch(e){return false;}
   }
   return { pkmsvvSupportCast, tick, manualDash, resolve, ghostCast, ghostOrbit, updateFields, drawGroundFields, drawAirFields, clearFields,`);
// Hatch affinity persists across devices: choose highest earned count, never
// add counts from two synced devices (which would inflate friendship).
patch('js/core/db.js',
 '    for (const k in older.stats || {}) r.stats[k] = Math.max(r.stats[k] || 0, older.stats[k] || 0);',
 '    for (const k in older.stats || {}) r.stats[k] = Math.max(r.stats[k] || 0, older.stats[k] || 0);\n'+
 '    r.pkmsvvSupportBond=r.pkmsvvSupportBond||{};\n'+
 '    for(const k in older.pkmsvvSupportBond||{})r.pkmsvvSupportBond[k]=Math.min(999,Math.max(Number(r.pkmsvvSupportBond[k])||0,Number(older.pkmsvvSupportBond[k])||0));\n'+
 '    r.pkmsvvSupportShiny=r.pkmsvvSupportShiny||{};\n'+
 '    for(const k in older.pkmsvvSupportShiny||{})if(older.pkmsvvSupportShiny[k])r.pkmsvvSupportShiny[k]=true;');
// In solo runs, some normal monsters pursue and strike followers, with lower aggro weight.
patch('js/entities/enemy.js',
 '        else e.update(dt, nearestPlayer(players, e.x, e.y) || pl);',
 '        else { const lead=nearestPlayer(players,e.x,e.y)||pl; e.update(dt,G.PKMSVVEggs?.enemyTarget?.(e,lead,dt)||lead); }');
// Enemy projectiles can damage companions before reaching the protagonist.
patch('js/systems/combat.js',
 '        if (G.U.dist2(p.x, p.y, pl.x, pl.y) < (p.r + pl.r) * (p.r + pl.r)) {',
 '        if(G.PKMSVVEggs?.interceptProjectile?.(p)){projectiles.splice(i,1);continue;}\n'+
 '        if (G.U.dist2(p.x, p.y, pl.x, pl.y) < (p.r + pl.r) * (p.r + pl.r)) {');
// Hostile beams/zones additionally affect followers, using their real HP and hit cooldown.
patch('js/systems/hazards.js',
 '        if (pl && !pl.dead && inside(h, pl.x, pl.y, pl.r)) {',
 '        G.PKMSVVEggs?.hitHazard?.(h);\n'+
 '        if (pl && !pl.dead && inside(h, pl.x, pl.y, pl.r)) {');
fs.appendFileSync(path.join(game,'css','style.css'),`
/* v1.5 egg-team replacement keeps active companions user-controlled. */
.pkmsvv-egg-choice{position:fixed;z-index:12020;inset:0;background:#081e2bd9;display:grid;place-items:center;padding:16px}
.pkmsvv-egg-choice-inner{display:flex;flex-direction:column;gap:10px;width:min(430px,95vw);max-height:90vh;overflow:auto;padding:19px;background:linear-gradient(145deg,#225d65,#10333e);border:3px solid #8fdfd2;border-radius:18px;color:#f9fffd;box-shadow:0 10px 35px #0009}
.pkmsvv-egg-choice-inner h3{color:#ffe57b;font-size:21px;margin:0}
.pkmsvv-egg-choice-inner p{line-height:1.5;margin:0 0 6px}
.pkmsvv-egg-choice-inner button{min-height:45px}
`,'utf8');
console.log('PKMSVV v1.5: Ch3 egg nests / follower incubation / small support abilities integrated for solo.');
