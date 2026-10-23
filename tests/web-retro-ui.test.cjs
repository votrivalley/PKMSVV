'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('web card layout and matchmaking retain IDs, modes and entry position',()=>{
 const p=read('scripts/patch-retro-web.cjs'),ui=read('src/web/pkmsvv-multiplayer-ui.js');
 for(const text of ['pkmsvv-mode-grid','pkmsvv-mode-sprite-coop','pkmsvv-mode-sprite-royale','2–4 người','2–10 người','data-go="play"','data-go="multiplayer"'])assert.ok(p.includes(text),text);
 assert.match(p,/multiplayer: 'online'/);
 assert.match(ui,/G\.UI\.sprite/);
 assert.match(ui,/G\.Social\.createRoom\(mode,visibility\)/);
 assert.match(ui,/pkmsvv-mode-description/);
});
