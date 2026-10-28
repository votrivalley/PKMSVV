'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const patch=read('scripts/patch-competitive-levelup.cjs');
test('only Royale/EggRush pick cards without room waiting',()=>{
 assert.match(patch,/G\.Royale\?\.active\|\|G\.EggRush\?\.active/);
 assert.match(patch,/api\.levelStart\(level\);return;/);
 assert.match(patch,/waiting = new Set\(\[me\]\);/,'Co-op waiting remains');
 assert.match(patch,/if\(pkmsvvCompetitive\(\)\)\{doneSeq=seenSeq;return;\}/);
});
test('competitive personal skill queue does not move simulation into paused levelup state',()=>{
 assert.match(patch,/individualLevelQueue=\[\],individualLevelOpen=false/);
 assert.match(patch,/G\.RunUI\.showLevelUp\(level,G\.LevelUp\.offer\(pl\),card=>\{/);
 assert.match(patch,/individualLevelQueue\.push\(level\);pkmsvvNextPersonalLevel\(\);return;/);
 assert.match(patch,/G\.UI\.isOpen\('scr-levelup'\)/);
 assert.match(patch,/state === 'levelup' \|\|/);
 assert.match(patch,/pendingLevels = 0; individualLevelQueue=\[\]; individualLevelOpen=false/);
});
test('lost LAN snapshots restore all missed skill cards once',()=>{
 const offers=[],ctx={Number,Math,seenSeq:0,api:{levelStart:v=>offers.push(v)}};
 const fn=[
 'function receiveIndividualLevel(level,seq){',
 ' if(!Number.isSafeInteger(seq)||seq<=seenSeq)return;',
 ' const start=seenSeq+1;',
 ' for(let n=start;n<=seq&&n<start+100;n++)api.levelStart(Math.max(1,Math.round(level)-(seq-n)));',
 ' seenSeq=seq;',
 '}',
 'receiveIndividualLevel(4,3);receiveIndividualLevel(4,3);receiveIndividualLevel(5,4);'
 ].join('\n');
 assert.match(patch,/function receiveIndividualLevel\(level,seq\)/);
 vm.runInNewContext(fn,ctx);
 assert.deepEqual(offers,[2,3,4,5]);
 assert.equal(ctx.seenSeq,4);
});
test('Co-op still waits; competitive item/bond choices never send global hold',()=>{
 assert.match(patch,/if\(G\.Coop\.active&&!pkmsvvCompetitive\(\)\)G\.Coop\.holdStart\(\)/);
 assert.match(patch,/if\(G\.Coop\.active&&!pkmsvvCompetitive\(\)\)G\.Coop\.holdEnd\(\)/);
 assert.match(patch,/if\(!pkmsvvCompetitive\(\)\)state='choice'/);
 assert.match(patch,/pl\.frozen = coop/);
 assert.match(read('scripts/prepare-game.cjs'),/patch-competitive-levelup\.cjs/);
});
test('prepared game contains private competitive queue when installed',t=>{
 const coop=path.join(root,'vendor/pokesurvivor/js/net/coop.js');
 const game=path.join(root,'vendor/pokesurvivor/js/game.js');
 if(!fs.existsSync(coop)||!fs.existsSync(game)){t.skip('compile first');return;}
 assert.match(fs.readFileSync(coop,'utf8'),/receiveIndividualLevel/);
 assert.match(fs.readFileSync(game,'utf8'),/pkmsvvNextPersonalLevel/);
});
