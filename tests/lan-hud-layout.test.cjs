'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync(require.resolve('../src/web/pkmsvv-egg-rush.js'),'utf8');
function setup(mode){
 const players=Array.from({length:mode==='royale'?10:4},(_,i)=>({uid:'p'+i,name:'Trainer '+i,dex:25,x:0,y:0}));
 const texts=[],boxes=[],draws=[],scales=[],buttons=[];
 const G={I18n:{lang:'vi'},Game:{player:players[0]},Social:{uid:'p0'},HUD:{leftBounds:{x:16,bottom:213}},
  Touch:{addButton(x,y,w,h,fn){buttons.push({x,y,w,h,fn});}},
  Sprites:{preload(){},Animator:class{constructor(dex){this.dex=dex;} draw(ctx,x,y,opts){draws.push({dex:this.dex,x,y,alpha:opts.alpha});}}},Camera:{}};
 vm.runInNewContext(code,{G,Map,Math,Number,Object});
 G.EggRush.begin({mode,members:players});
 const ctx={save(){},restore(){},translate(){},scale(...v){scales.push(v);},fillRect(){},arc(){},beginPath(){},roundRect(...b){boxes.push(b);},fill(){},stroke(){},
  measureText:s=>({width:s.length*6}),fillText:(...t)=>texts.push(t)};
 return {G,ctx,texts,boxes,draws,scales,buttons,players};
}
test('Survival leaves the sidebar exclusively to the survival ranking',()=>{
 const {G,ctx,texts,boxes}=setup('royale');G.Royale={active:true};G.EggRush.hud(ctx,538,669);
 assert.equal(texts.length,0);assert.equal(boxes.length,0);
});
test('Co-op uses the same compact per-owner panel',()=>{
 const {G,ctx,texts}=setup('coop');G.EggRush.hud(ctx,844,390);
 assert.equal(texts.length,1);assert.match(texts[0][0],/Hỗ trợ: 0\/2/);
});
test('Survival defaults to one local trainer; tap expands all ten animated sprites',()=>{
 const {G,ctx,texts,boxes,draws,buttons,players}=setup('royale');G.Game.st={time:120};
 players.forEach((p,i)=>p.dex=[810,132,886,597,180,326,284,744,627,157][i]);
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/web/pkmsvv-royale.js'),'utf8'),{G,Map,Math,Number,Object,Set});
 G.Royale.begin({mode:'royale',members:players});
 players[3].dead=true;G.Royale.check(players,120,()=>{});
 G.Royale.draw(ctx,538,669,players);
 assert.equal(G.Royale.expanded,false);
 assert.equal(boxes[0][2],170,'collapsed header stays narrow on phone');
 assert.equal(draws.length,1,'the local user is the only default animated row');
 assert.ok(texts.some(x=>x[0]==='Bạn'));
 assert.equal(buttons.length,1,'register canvas tap target');
 buttons[0].fn();
 assert.equal(G.Royale.expanded,true);
 const startDraws=draws.length,startTexts=texts.length;
 G.Royale.draw(ctx,538,669,players);
 const expandedSprites=draws.slice(startDraws),expandedTexts=texts.slice(startTexts);
 assert.equal(expandedSprites.length,10,'all ten sprites visible when expanded');
 assert.deepEqual(expandedSprites.map(x=>x.dex).sort((a,b)=>a-b),players.map(p=>p.dex).sort((a,b)=>a-b));
 assert.ok(expandedSprites.some(x=>x.dex===597&&x.alpha<1),'fallen trainer dimmed');
 assert.equal(expandedTexts.filter(x=>x[0]==='Ngủm').length,1);
 assert.equal(expandedTexts.filter(x=>x[0]==='Sống').length,9);
 buttons.at(-1).fn();assert.equal(G.Royale.expanded,false);
 G.Royale.begin({mode:'royale',members:players});
 assert.equal(G.Royale.expanded,false,'new matches reset panel state');
});
test('Landscape phone keeps one-row scoreboard above touch controls, expands on tap',()=>{
 const {G,ctx,boxes,draws,buttons,players}=setup('royale');G.Game.st={time:20};
 G.HUD.leftBounds={x:16,bottom:80};
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/web/pkmsvv-royale.js'),'utf8'),{G,Map,Math,Number,Object,Set});
 G.Royale.begin({mode:'royale',members:players});
 G.Royale.draw(ctx,844,390,players);
 assert.equal(draws.length,1);
 assert.ok(boxes[0][3]<=55,'collapsed rank HUD should be one row tall');
 assert.ok(boxes[0][1]+boxes[0][3]<390-80);
 assert.ok(boxes[0][2]<=190);
 buttons[0].fn();
 const was=draws.length;
 G.Royale.draw(ctx,844,390,players);
 assert.equal(draws.length-was,10);
 const expanded=boxes.at(-1);
 assert.ok(expanded[1]+expanded[3]<390-80,'expanded ranking above controls');
});
test('Competitive HUD patch suppresses the Co-op rescue message and teammate bars',()=>{
 const script=fs.readFileSync(require.resolve('../scripts/patch-arena-v1529.cjs'),'utf8');
 assert.match(script,/!G.Royale.active && !G.EggRush.active/);
 const desc=fs.readFileSync(require.resolve('../src/shared/coop-unified.js'),'utf8');
 assert.match(desc,/Vòng đỏ thu dần/);
 assert.doesNotMatch(desc,/Bo thu hẹp dần/);
});

