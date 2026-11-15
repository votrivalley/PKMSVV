'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('Berry Rescue uses the exact Egg Rush music before and throughout the match, then restores regular tracks',()=>{
 const root=path.join(__dirname,'..');
 const source=fs.readFileSync(path.join(root,'src/pkmsvv-berry-rescue.js'),'utf8');
 const tracks=[];
 const G={
  Audio:{music(name){tracks.push(name);}},
  BIOME_MUSIC:['forest','cave'],
  World:{flattenForBerry(){}},
  PKMSVVBerry:{spriteUrl(id){return 'assets/berry/'+id+'.png';}},
  Social:{room:{mode:'berry'}},
 };
 vm.runInNewContext(source,{G,console}, {filename:'pkmsvv-berry-rescue.js'});
 assert.equal(G.PKMSVVBerryRescue.begin('berry'),true);
 assert.equal(tracks.at(-1),'eggrush','match start plays Tranh Trứng custom track');
 G.Audio.music('forest');
 assert.equal(tracks.at(-1),'eggrush','biome updates cannot interrupt Berry music');
 G.Audio.music('boss');
 assert.equal(tracks.at(-1),'eggrush','boss cue does not interrupt Berry music');
 assert.equal(G.PKMSVVBerryRescue.begin('berryeasy'),true);
 assert.equal(tracks.at(-1),'eggrush','easy Berry uses the same track');
 assert.equal(G.PKMSVVBerryRescue.begin('other'),false);
 G.Audio.music('village');
 assert.equal(tracks.at(-1),'village','music routing resets outside Berry Rescue');
 assert.equal(G.Audio._pkmsvvBerryMusicWrapped,true);
 assert.ok(fs.existsSync(path.join(root,'custom-music/eggrush.ogg')),'same music file must be bundled');
});
