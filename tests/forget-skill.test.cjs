'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'..','src/pkmsvv-forget-skill.js'),'utf8');
function setup(){
 let original={offers:0};
 const G={Game:{state:'playing',player:null},LevelUp:{offer(){original.offers++;return [
 {key:'stat:a',type:'stat'},{key:'stat:b',type:'stat'},{key:'stat:c',type:'stat'}];}},
 UI:{toast(){}},T:s=>s};
 const p={maxMoves:8,slots:[],moves:[],active:0,dead:false};
 for(let i=0;i<8;i++){const m={id:'move'+i,name:'Move '+i,lvl:2};p.moves.push(m);p.slots.push([m]);}
 G.Game.player=p;
 const el=()=>({children:[],append(...a){this.children.push(...a)},setAttribute(){},remove(){this.removed=true},querySelector(){return null}});
 const document={body:{append(){}},getElementById(){return null},createElement:el};
 vm.runInNewContext(script,{G,document,Math});
 return {G,p,lib:G.PKMSVVForgetSkill,original};
}
test('Forgetting is offered only in this Pokémon personal level-up cards',()=>{
 const {G,p,lib}=setup();
 const cards=G.LevelUp.offer(p);
 assert.equal(cards.length,3);assert.equal(cards[2].key,'pkmsvv:forget');
 assert.equal(lib.full(p),true);
 const second={...p,moves:p.moves.slice(),slots:p.slots.map(g=>g.slice()),_pkmsvvForgetUsed:true};
 assert.equal(lib.full(second),false);
 p.slots.pop();assert.ok(!G.LevelUp.offer(p).some(c=>c.type==='forget'));
});
test('Random choice shows two distinct moves, deleting one from move list and active slot',()=>{
 const {p,lib}=setup();const opts=lib.options(p,()=>0);
 assert.equal(opts.length,2);assert.notEqual(opts[0],opts[1]);
 const m=p.moves[4];p.active=4;
 assert.equal(lib.remove(p,m),true);
 assert.equal(p.moves.length,7);assert.equal(p.slots.length,7);
 assert.ok(!p.moves.includes(m));assert.equal(p.slots[p.active][0].id,'move5');
 assert.equal(lib.remove(p,m),false);
});
test('One use flag is match-actor only, never written into persistent save',()=>{
 const {p,lib,G}=setup();const old=p.moves[0];
 assert.equal(lib.open(p),true);assert.equal(p._pkmsvvForgetUsed,true);
 assert.equal(lib.full(p),false);
 assert.equal(lib.remove(p,old),true);
 const fresh={...p,_pkmsvvForgetUsed:false};
 fresh.moves=[...p.moves,p.moves[0]];fresh.slots=Array.from({length:8},(_,i)=>[fresh.moves[i]]);
 G.Game.player=fresh;assert.equal(lib.full(fresh),true);
});
