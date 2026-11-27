'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..','vendor','pokesurvivor');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('every learned ability independently advances its cooldown',()=>{
 const src=read('js/systems/combat.js');
 assert.match(src,/for \(const m of pl\.moves\) tickMove\(dt, pl, m, now\);/);
 const G={},perf={now:()=>42};
 new Function('G','performance',read('js/systems/pkmsvv-dash-queue.js'))(G,perf);
 new Function('G','performance',src)(G,perf);
 const a={kind:'projectile',t:1.1},b={kind:'beam',t:2.1};
 G.Combat.tick(.1,{dead:false,moves:[a,b]},123);
 assert.ok(Math.abs(a.t-1.0)<1e-8);
 assert.ok(Math.abs(b.t-2.0)<1e-8);
});
test('skill bar shows AUTO and uses the permanent account slot cap',()=>{
 assert.match(read('js/entities/player.js'),/this\.maxMoves = G\.PKMSVVSkillTrack\.progress\(G\.DB\.save\)\.count/);
 assert.match(read('js/ui/hud.js'),/ctx\.fillText\('AUTO'/);
 assert.match(read('js/systems/rift.js'),/G\.PKMSVVBalance\.rewardRift\(pl\)/);
 assert.doesNotMatch(read('js/game.js'),/G\.Input\.tap\('keyq'\)\) pl\.cycle/);
});
test('seven music slots have original synthesis fallback',()=>{
 const audio=read('js/core/audio.js');
 assert.match(audio,/PKMSVV_CUSTOM_MUSIC/);
 assert.match(audio,/startCustomMusic/);
 assert.match(audio,/else startSong\(name\)/);
 const list=['village','forest','cave','volcano','boss','rift','judgment'];
 const mus=read('js/data/music.js');
 for(const name of list)assert.ok(mus.includes(name+':')||mus.includes('MUSIC.'+name),'Missing track '+name);
});

test('compiled combat tick does not autonomously cast any of the 12 movement skills',()=>{
 const G={},perf={now:()=>42};
 new Function('G','performance',read('js/systems/pkmsvv-dash-queue.js'))(G,perf);
 new Function('G','performance',read('js/systems/combat.js'))(G,perf);
 const names=['quick-attack','aerial-ace','flame-charge','u-turn','megahorn','dragon-ascent','volt-tackle','meteor-assault','sunsteel-strike','extreme-speed','acrobatics','shadow-force'];
 const moves=names.map((id,i)=>({id,kind:i<9?'dash':i===9?'blitz':'leap',t:.01}));
 const p={dead:false,x:0,y:0,moves,cast(){throw Error('Unexpected autonomous cast')}};
 G.Combat.tick(.1,p,42);G.Combat.tick(.1,p,43);
 assert.ok(moves.every(m=>m.t===0));assert.equal(p.x,0);assert.equal(p.y,0);
});
