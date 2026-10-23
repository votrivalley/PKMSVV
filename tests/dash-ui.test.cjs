'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..','vendor','pokesurvivor');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function make(){
 const G={};new Function('G',read('js/systems/pkmsvv-dash-queue.js'))(G);
 return G.PKMSVVDash;
}
test('single manual dash is previewed as ready; non-dash moves ignored',()=>{
 const q=make(),pl={moves:[{id:'ember',kind:'projectile',t:0},{id:'quick-attack',kind:'dash',t:0}]};
 const p=q.preview(pl);assert.equal(p.move.id,'quick-attack');
 assert.equal(p.total,1);assert.equal(p.index,0);assert.equal(p.ready,true);
});
test('two or more manual dash skills rotate in order and skip those on cooldown',()=>{
 const q=make(),pl={moves:[
  {id:'quick-attack',kind:'dash',t:0},
  {id:'aerial-ace',kind:'dash',t:0},
  {id:'flame-charge',kind:'dash',t:2},
  {id:'u-turn',kind:'dash',t:0}
 ]};
 for(const expected of ['quick-attack','aerial-ace','u-turn','quick-attack']){
  const p=q.preview(pl);
  assert.equal(p.move.id,expected);assert.equal(p.ready,true);assert.equal(p.total,4);
  assert.equal(q.consume(pl,p),true);
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
