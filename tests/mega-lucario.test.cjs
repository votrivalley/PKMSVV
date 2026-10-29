'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const game=path.join(root,'vendor','pokesurvivor');
function text(p){return fs.readFileSync(path.join(root,p),'utf8');}
test('Mega Lucario source is pinned, offline and noncommercial',()=>{
 const code=text('scripts/build-mega-lucario.cjs');
 assert.match(code,/448d3af85e2cfa85a8c5ead076eddb145251b473/);
 assert.match(code,/sprite\/0448\/0001/);
 assert.match(code,/CC BY-NC 4.0/);
 assert.deepEqual([...code.matchAll(/WANT=\[([^\]]+)\]/g)].length,1);
});
test('compiled source includes every Mega animation and no extra Pokédex species',()=>{
 const asset=path.join(game,'assets','pokemon','10448');
 for(const a of ['Idle','Walk','Attack','Shoot','Charge','Hurt','Faint']){
  const f=path.join(asset,a+'.png');
  assert.ok(fs.statSync(f).size>100);
 }
 const g={SPRITE_META:{}};
 vm.runInNewContext(fs.readFileSync(path.join(game,'js','data','pkmsvv-mega-sprite-meta.js'),'utf8'),{G:g});
 for(const action of ['Idle','Walk','Attack','Hurt','Faint']){
  const m=g.SPRITE_META[10448]?.a[action];
  assert.ok(m&&m.n>=1&&m.r>=8,action+' frames must cover 8 directions');
 }
 const html=fs.readFileSync(path.join(game,'dev.html'),'utf8');
 assert.ok(html.indexOf('pkmsvv-mega-sprite-meta.js')<html.indexOf('js/core/sprites.js'));
 assert.ok(html.indexOf('js/game.js')<html.indexOf('pkmsvv-mega-lucario.js'));
 assert.equal(/G\.DEX_BY\[10448\]|owned\[10448\]/.test(text('src/pkmsvv-mega-lucario.js')),false);
});
function mock(){
 let player=null,coop=false,uiState='playing',listeners={};
 class Animator{constructor(dex,scale,shiny){this.dex=dex;this.scale=scale;this.shiny=shiny;this.dir=0;}}
 class Player{update(){return true;}}
 const elem=()=>({style:{},addEventListener(){},insertAdjacentElement(){},set textContent(v){this.content=v},get textContent(){return this.content}});
 const G={Player,SPRITE_META:{10448:{a:{Idle:{}}}},
  Sprites:{Animator,playerScale:()=>1,playerRadius:()=>18,bodyHeight:()=>36,preload:()=>Promise.resolve()},
  Game:{get state(){return uiState},get player(){return player},startRun(){return true},toUI(){uiState='ui'},quit(){}},
  MenuUI:{open(){}},DB:{save:{partner:448,owned:{448:1},megaStones:{}},commit(){}},
  UI:{toast(){}},FX:{ring(){}},Audio:{sfx(){}},Coop:{get active(){return coop}}};
 const context={G,document:{body:{appendChild(){}},createElement:elem,getElementById(){return null},
  addEventListener(n,f){listeners[n]=f}},setInterval(){},console};
 vm.runInNewContext(text('src/pkmsvv-mega-lucario.js'),context);
 player={dex:448,shiny:false,baseAtk:10,baseSpd:100,scale:1,r:18,bodyH:36,
  mon:{dex:448,pa:110,sa:115,atk:115,df:70,sd:70,spd:90,types:['fighting','steel']},
  moves:[{id:'aura',cd:10,t:10}],
  x:0,y:0,anim:new Animator(448,1,false),dead:false};
 return{G,player,setCoop:x=>{coop=x},events:listeners};
}
test('preview cannot grant stone, transformation restores base stats after 30s',async()=>{
 const {G,player}=mock(),mega=G.MegaLucario;
 const originalMon=player.mon;
 assert.equal(mega.owned(),false);
 assert.equal(await mega.tryActivate(),false);
 assert.equal(mega.previewUnlock(),true);
 assert.equal(await mega.tryActivate(),true);
 assert.equal(player.anim.dex,10448);
 assert.ok(Math.abs(player.baseAtk-10*(140/115))<1e-9,'special offense uses official Mega base ratio');
 assert.ok(Math.abs(player.baseSpd-100*(112/90))<1e-9,'Mega speed ratio');
 assert.ok(Math.abs(player.mon.pa-110*(145/110))<1e-9,'physical attack ratio');
 assert.ok(Math.abs(player.mon.sa-115*(140/115))<1e-9,'special attack ratio');
 assert.ok(Math.abs(player.mon.df-70*(88/70))<1e-9,'Mega physical defense');
 assert.equal(player.mon.sd,70);
 assert.ok(Math.abs(player.moves[0].t-7)<1e-9,'existing cooldown reduced 30%');
 assert.equal(player.dex,448);
 assert.equal(player.shiny,false);
 assert.equal(G.DB.save.megaStones.lucarionite,undefined,'preview never mutates stone save');
 mega.tick(player,30.1);
 assert.equal(player.anim.dex,448);
 assert.equal(player.baseAtk,10);
 assert.equal(player.baseSpd,100);
 assert.strictEqual(player.mon,originalMon,'original Pokédex stats restored by reference');
 assert.equal(player.mon.df,70,'defense restored');
 assert.equal(player.mon.atk,115,'unmodified original Pokédex stats restored');
 assert.equal(await mega.tryActivate(),false,'one Mega activation per run');
});
test('Mega disabled in all Co-op/PvP modes; no permanent save changes',async()=>{
 const {G,player,setCoop}=mock(),mega=G.MegaLucario;
 mega.previewUnlock();setCoop(true);
 assert.equal(mega.eligible(),false);
 assert.equal(await mega.tryActivate(),false);
 assert.equal(player.anim.dex,448);
 assert.deepEqual(Object.keys(G.DB.save.megaStones),[]);
});


test('UI uses a circular Mega Stone with subtle glimmer and a countdown',()=>{
 const css=text('src/pkmsvv-mega-lucario.css'),js=text('src/pkmsvv-mega-lucario.js');
 assert.match(css,/border-radius:50%/);
 assert.match(css,/pkmsvv-mega-glimmer/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(js,/pkmsvv-mega-btn__gem/);
 assert.match(js,/Math\.ceil\(p\._megaRemaining\)/);
 const patch=text('scripts/patch-mega-lucario.cjs');
 assert.match(patch,/pl\._megaActive \? 0\.70 : 1/);
 assert.match(patch,/this\._megaActive \? 0\.70 : 1/);
});
