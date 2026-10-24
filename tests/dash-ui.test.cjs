'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..','vendor','pokesurvivor');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function make(clock={value:0}){
 const G={World:{isFree:()=>true,collide(){}}};
 new Function('G','performance',read('js/systems/pkmsvv-dash-queue.js'))(G,{now:()=>clock.value});
 return G.PKMSVVDash;
}
test('single manual dash is previewed as ready; non-dash moves ignored',()=>{
 const q=make(),pl={moves:[{id:'ember',kind:'projectile',t:0},{id:'quick-attack',kind:'dash',t:0}]};
 const p=q.preview(pl);assert.equal(p.move.id,'quick-attack');
 assert.equal(p.total,1);assert.equal(p.index,0);assert.equal(p.ready,true);
});
test('two or more manual dash skills rotate in order and skip those on cooldown',()=>{
 const clock={value:0},q=make(clock),pl={moves:[
  {id:'quick-attack',kind:'dash',t:0},
  {id:'aerial-ace',kind:'dash',t:0},
  {id:'flame-charge',kind:'dash',t:2},
  {id:'u-turn',kind:'dash',t:0}
 ]};
 for(const expected of ['quick-attack','aerial-ace','u-turn','quick-attack']){
  const p=q.preview(pl);
  assert.equal(p.move.id,expected);assert.equal(p.ready,true);assert.equal(p.total,4);
  assert.equal(q.consume(pl,p),true);
  clock.value+=700; // respect global 650ms anti-invulnerability cooldown
 }
});
test('if all manual skills are cooling, show the actual shortest wait and do not advance',()=>{
 const q=make(),pl={moves:[
  {id:'quick-attack',kind:'dash',t:4.5},
  {id:'aerial-ace',kind:'dash',t:1.2},
  {id:'u-turn',kind:'dash',t:2.1}
 ]};
 const p=q.preview(pl);
 assert.equal(p.ready,false);assert.equal(p.move.id,'aerial-ace');
 assert.equal(p.remaining,1.2);assert.equal(q.consume(pl,p),false);
});
test('each new game run gets independent dash queue state',()=>{
 const q=make(),pl1={moves:[{id:'quick-attack',kind:'dash',t:0},{id:'u-turn',kind:'dash',t:0}]};
 const pl2={moves:[{id:'quick-attack',kind:'dash',t:0},{id:'u-turn',kind:'dash',t:0}]};
 q.consume(pl1,q.preview(pl1));
 assert.equal(q.preview(pl1).move.id,'u-turn');
 assert.equal(q.preview(pl2).move.id,'quick-attack');
});
test('dash direction tracks live movement, last movement when idle, NEVER auto enemy aim',()=>{
 const q=make();
 assert.equal(q.direction({moveAngle:Math.PI,aim:0},[-1,0]),Math.PI);
 assert.equal(q.direction({moveAngle:Math.PI/2,aim:0},[0,0]),Math.PI/2);
 assert.equal(q.direction({moveAngle:0,aim:Math.PI},[1,0]),0);
});
test('dash speed profiles are distinct; Quick fastest, Flame slowest, collision-safe travel',()=>{
 const q=make();
 assert.ok(q.profile({id:'quick-attack'}).speed>q.profile({id:'aerial-ace'}).speed);
 assert.ok(q.profile({id:'aerial-ace'}).speed>q.profile({id:'u-turn'}).speed);
 assert.ok(q.profile({id:'u-turn'}).speed>q.profile({id:'flame-charge'}).speed);
 const pl={x:0,y:0,r:12,invuln:0};
 q.begin(pl,{id:'quick-attack'},0,100);
 q.advance(pl,.05);
 assert.ok(pl.x>50&&pl.x<70,'first frame moves forwards at Quick Attack speed');
 q.advance(pl,.05);
 assert.ok(pl.x>99,'dash reaches the intended safe end');
 assert.ok(pl.invuln>0&&pl.invuln<=.22,'brief i-frames capped');
});
test('650ms global cooldown prevents dash chaining even when second skill has cooled',()=>{
 const clock={value:0},q=make(clock),pl={moves:[
  {kind:'dash',id:'quick-attack',t:0},{kind:'dash',id:'u-turn',t:0}
 ]};
 const pick=q.preview(pl);
 assert.equal(pick.ready,true);
 assert.equal(q.consume(pl,pick),true);
 assert.equal(q.preview(pl).ready,false);
 assert.ok(q.preview(pl).remaining>=.65);
 clock.value=651;
 assert.equal(q.preview(pl).ready,true);
 assert.equal(q.preview(pl).move.id,'u-turn');
});
test('compiled game movement & damage honor directional dash patch',()=>{
 const script=fs.readFileSync(path.join(__dirname,'..','scripts/patch-directional-dashes.cjs'),'utf8');
 assert.match(script,/G\.PKMSVVDash\.direction\(pl,G\.Input\.axis\(\)\)/);
 assert.match(script,/G\.PKMSVVDash\.begin\(pl,m,pl\.aim,len\)/);
 assert.match(script,/G\.PKMSVVDash\.advance\(this,dt\)/);
 assert.match(script,/G\.Coop\.cast\(pl,m\)/);
 assert.match(script,/dmg: 13/);
 assert.match(script,/dmg: 26/);
});
test('the skill HUD and level-up cards distinguish active dashes from automatic attacks',()=>{
 const hud=read('js/ui/hud.js'),levelup=read('js/systems/levelup.js'),runui=read('js/ui/run-ui.js');
 assert.match(hud,/G\.T\('Activa'\)/);
 assert.match(hud,/G\.PKMSVVDash\.preview\(pl\)/);
 assert.match(hud,/const moveName=G\.T\(m\.name, 'move'\)/);
 assert.match(hud,/manual\.index\+1/);
 assert.match(levelup,/d\.kind === 'dash' \? G\.T\('Habilidad activa'\)/);
 assert.match(runui,/m\.kind === 'dash' \? 'Habilidad activa'/);
 const combat=read('js/systems/combat.js');
 assert.match(combat,/G\.PKMSVVDash\.preview\(pl\)/);
 assert.match(combat,/G\.PKMSVVDash\.consume\(pl,pick\)/);
});
test('dash control captions have both English and Vietnamese UI translations',()=>{
 const src=read('js/data/pkmsvv-ux-languages.js');
 assert.match(src,/Active skill/);assert.match(src,/Kỹ năng chủ động/);
 assert.match(src,/Automatic skill/);assert.match(src,/Kỹ năng tự động/);
});
