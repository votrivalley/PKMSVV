'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync(require.resolve('../src/web/pkmsvv-egg-rush.js'),'utf8');
function setup(mode){
 const players=Array.from({length:mode==='royale'?10:4},(_,i)=>({uid:'p'+i,name:'Trainer '+i,dex:25,x:0,y:0}));
 const texts=[],boxes=[];
 const G={I18n:{lang:'vi'},Game:{player:players[0]},Social:{uid:'p0'},HUD:{leftBounds:{x:16,bottom:213}},
  Sprites:{preload(){},Animator:class{}},Camera:{}};
 vm.runInNewContext(code,{G,Map,Math,Number,Object});
 G.EggRush.begin({mode,members:players});
 const ctx={save(){},restore(){},translate(){},beginPath(){},roundRect(...b){boxes.push(b);},fill(){},stroke(){},
  measureText:s=>({width:s.length*6}),fillText:(...t)=>texts.push(t)};
 return {G,ctx,texts,boxes,players};
}
test('Survival leaves the sidebar exclusively to the survival ranking',()=>{
 const {G,ctx,texts,boxes}=setup('royale');G.Royale={active:true};G.EggRush.hud(ctx,538,669);
 assert.equal(texts.length,0);assert.equal(boxes.length,0);
});
test('Co-op uses the same compact per-owner panel',()=>{
 const {G,ctx,texts}=setup('coop');G.EggRush.hud(ctx,844,390);
 assert.equal(texts.length,1);assert.match(texts[0][0],/Hỗ trợ: 0\/2/);
});
test('Survival ranking has compact width and explicit Sống / Ngủm status',()=>{
 const {G,ctx,texts,boxes,players}=setup('royale');G.Game.st={time:120};
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/web/pkmsvv-royale.js'),'utf8'),{G,Map,Math,Number,Object,Set});
 G.Royale.begin({mode:'royale',members:players});players[3].dead=true;G.Royale.check(players,120,()=>{});
 G.Royale.draw(ctx,538,669,players);
 assert.equal(boxes[0][2],150);assert.equal(texts.filter(t=>t[0]==='Sống').length,9);
 assert.equal(texts.filter(t=>t[0]==='Ngủm').length,1);
});
