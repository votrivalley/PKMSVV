'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync(require.resolve('../src/web/pkmsvv-egg-rush.js'),'utf8');
function setup(mode){
 const players=Array.from({length:mode==='royale'?10:4},(_,i)=>({uid:'p'+i,name:'Trainer '+i,dex:25,x:0,y:0}));
 const texts=[],boxes=[],draws=[],scales=[];
 const G={I18n:{lang:'vi'},Game:{player:players[0]},Social:{uid:'p0'},HUD:{leftBounds:{x:16,bottom:213}},
  Sprites:{preload(){},Animator:class{constructor(dex){this.dex=dex;} draw(ctx,x,y,opts){draws.push({dex:this.dex,x,y,alpha:opts.alpha});}}},Camera:{}};
 vm.runInNewContext(code,{G,Map,Math,Number,Object});
 G.EggRush.begin({mode,members:players});
 const ctx={save(){},restore(){},translate(){},scale(...v){scales.push(v);},fillRect(){},arc(){},beginPath(){},roundRect(...b){boxes.push(b);},fill(){},stroke(){},
  measureText:s=>({width:s.length*6}),fillText:(...t)=>texts.push(t)};
 return {G,ctx,texts,boxes,draws,scales,players};
}
test('Survival leaves the sidebar exclusively to the survival ranking',()=>{
 const {G,ctx,texts,boxes}=setup('royale');G.Royale={active:true};G.EggRush.hud(ctx,538,669);
 assert.equal(texts.length,0);assert.equal(boxes.length,0);
});
test('Co-op uses the same compact per-owner panel',()=>{
 const {G,ctx,texts}=setup('coop');G.EggRush.hud(ctx,844,390);
 assert.equal(texts.length,1);assert.match(texts[0][0],/Hỗ trợ: 0\/2/);
});
test('Survival ranking fits ten animated Pokémon icons and clear alive/out states',()=>{
 const {G,ctx,texts,boxes,draws,players}=setup('royale');G.Game.st={time:120};
 players.forEach((p,i)=>p.dex=[810,132,886,597,180,326,284,744,627,157][i]);
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/web/pkmsvv-royale.js'),'utf8'),{G,Map,Math,Number,Object,Set});
 G.Royale.begin({mode:'royale',members:players});
 players[3].dead=true;G.Royale.check(players,120,()=>{});
 G.Royale.draw(ctx,538,669,players);
 assert.equal(boxes[0][2],185,'panel widened for thumbnail column');
 assert.equal(draws.length,10,'all ten human/AI rows must draw a real animated sprite');
 assert.deepEqual(draws.map(x=>x.dex).sort((a,b)=>a-b),players.map(p=>p.dex).sort((a,b)=>a-b));
 assert.ok(draws.some(x=>x.dex===597&&x.alpha<1),'fallen trainer sprite is dimmed');
 assert.equal(texts.filter(t=>t[0]==='Sống').length,9);
 assert.equal(texts.filter(t=>t[0]==='Ngủm').length,1);
 const names=texts.filter(t=>String(t[0]).startsWith('Trainer'));
 assert.equal(names.length,10);
});
test('Survival keeps a compact ten-sprite ranking on landscape phones',()=>{
 const {G,ctx,boxes,draws,players}=setup('royale');G.Game.st={time:20};
 G.HUD.leftBounds={x:16,bottom:80};
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/web/pkmsvv-royale.js'),'utf8'),{G,Map,Math,Number,Object,Set});
 G.Royale.begin({mode:'royale',members:players});
 G.Royale.draw(ctx,844,390,players);
 assert.equal(draws.length,10);
 assert.ok(boxes[0][1]+boxes[0][3]<390-80,'ranking must not cover touch controls');
 assert.ok(boxes[0][2]<=210,'ranking remains narrow on landscape');
});
