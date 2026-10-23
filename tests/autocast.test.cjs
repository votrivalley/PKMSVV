'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..','vendor','pokesurvivor');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('every learned ability independently advances its cooldown',()=>{
 const src=read('js/systems/combat.js');
 assert.match(src,/for \(const m of pl\.moves\) tickMove\(dt, pl, m, now\);/);
 const G={},perf={now:()=>42};
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
