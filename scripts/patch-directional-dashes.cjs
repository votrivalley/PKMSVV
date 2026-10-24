'use strict';
const fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..','vendor','pokesurvivor');
function patch(file,from,to){
 const full=path.join(base,file),s=fs.readFileSync(full,'utf8').replace(/\r\n/g,'\n');
 if(s.split(from).length!==2)throw Error('Direction dash source drift in '+file+' :: '+from.slice(0,85));
 fs.writeFileSync(full,s.replace(from,to),'utf8');
}
// Distinct dash identity: Quick Attack = fastest/evasive/low damage,
// Aerial Ace = balanced, Flame Charge = slower/high damage + existing burn,
// U-turn = quick reposition + short movement-speed bonus.
for(const [id,oldLine,newLine] of [
 ['quick-attack',"cd: 0.75, dmg: 20, radius: 110, width: 34, knock: 40","cd: 0.75, dmg: 13, radius: 110, width: 34, knock: 40"],
 ['aerial-ace',"cd: 0.75, dmg: 18, radius: 120, width: 40, knock: 60","cd: 0.75, dmg: 20, radius: 120, width: 40, knock: 60"],
 ['flame-charge',"cd: 0.8, dmg: 19, radius: 115, width: 36, burn: 1","cd: 0.8, dmg: 26, radius: 115, width: 36, burn: 1"],
 ['u-turn',"cd: 0.7, dmg: 17, radius: 120, width: 34","cd: 0.7, dmg: 18, radius: 120, width: 34"]
])patch('js/data/moves.js',oldLine,newLine);
patch('js/systems/combat.js',
 "    G.PKMSVVDash.consume(pl,pick);\n    const m=pick.move;\n    m.t = G.PKMSVVBalance.effectiveCooldown(pl,m);\n    pl.cast(m);\n    if (G.Coop.active) G.Coop.cast(pl,m);\n    m.castAt = performance.now();\n    run(pl,m);\n    return true;",
 "    if (!G.PKMSVVDash.consume(pl,pick)) return false;\n"+
 "    const m=pick.move, previousAim=pl.aim;\n"+
 "    // Input / left stick / touch joystick, else last walking direction;\n"+
 "    // never the enemy's auto-targeted angle.\n"+
 "    pl.aim=G.PKMSVVDash.direction(pl,G.Input.axis());\n"+
 "    try {\n"+
 "      m.t=G.PKMSVVBalance.effectiveCooldown(pl,m);\n"+
 "      pl.cast(m);\n"+
 "      if(G.Coop.active)G.Coop.cast(pl,m); // replicate chosen dash angle in Co-op\n"+
 "      m.castAt=performance.now();\n"+
 "      run(pl,m);\n"+
 "    } finally {pl.aim=previousAim;}\n"+
 "    return true;");
const combatPath=path.join(base,'js/systems/combat.js');
let combat=fs.readFileSync(combatPath,'utf8'),i=combat.indexOf('  function dash(pl, m) {'),e=combat.indexOf('  /** Rastro:',i);
if(i<0||e<0)throw Error('combat dash function no longer matches');
let piece=combat.slice(i,e);
function p(from,to){if(piece.split(from).length!==2)throw Error('dash body drift: '+from);piece=piece.replace(from,to);}
p('for (let d = 8; d <= m.radius; d += 8) {',
  'for (let d = 8; d <= m.radius*G.PKMSVVDash.profile(m).range; d += 8) {');
p('    pl.x = sx + ca * len; pl.y = sy + sa * len;\n    G.World.collide(pl);\n    pl.invuln = Math.max(pl.invuln || 0, 0.3);',
  '    G.PKMSVVDash.begin(pl,m,pl.aim,len); // travel over frames at skill-specific speed');
p('    const mx = sx + ca * len / 2, my = sy + sa * len / 2;',
  '    const ex=sx+ca*len,ey=sy+sa*len;\n    const mx = sx + ca * len / 2, my = sy + sa * len / 2;');
p('segDist2(sx, sy, pl.x, pl.y,', 'segDist2(sx, sy, ex, ey,');
// There are two swept collision checks; the second is not an ambiguous transform.
piece=piece.replace('segDist2(sx, sy, pl.x, pl.y,','segDist2(sx, sy, ex, ey,');
if(piece.includes('segDist2(sx, sy, pl.x'))throw Error('dash damage still tied to old teleport');
combat=combat.slice(0,i)+piece+combat.slice(e);fs.writeFileSync(combatPath,combat,'utf8');
// During the dash the player advances frame-by-frame; no normal walking input
// can pull the Pokémon backward. Reuses World.isFree/collide and i-frames.
patch('js/entities/player.js',
 "    const s = this.spd;\n",
 "    const s = this.spd * ((this.pkmsvvUTurnUntil||0)>performance.now()?1.18:1);\n");
patch('js/entities/player.js',
 "    this.x += this.svx * dt;\n    this.y += this.svy * dt;\n    G.World.collide(this);\n    if (this.walking) this.moveAngle = Math.atan2(ay, ax);",
 "    const dashing=G.PKMSVVDash.advance(this,dt);\n"+
 "    if(!dashing){this.x+=this.svx*dt;this.y+=this.svy*dt;G.World.collide(this);}\n"+
 "    else this.walking=true;\n"+
 "    if(this.walking&&!dashing)this.moveAngle=Math.atan2(ay,ax);");
console.log('PKMSVV: 4 active dashes use movement direction, real travel speeds, distinct damage and 650ms anti-chain lock.');
