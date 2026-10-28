'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

test('v1.5.34 Shiny egg doubles only that egg and Ron sees a narrated formula',()=>{
 const source=fs.readFileSync(require.resolve('../src/web/pkmsvv-egg-rush.js'),'utf8');
 const members=Array.from({length:4},(_,i)=>({uid:'p'+i,name:i===0?'Ron':'AI '+i,dex:25+i}));
 const players=members.map(m=>({...m,x:9999,y:9999,hp:100,maxHp:100,dead:false,level:1,kills:0}));
 const events=[],results=[],rolls=[.01,.01,.08,.99,.40,.01,.06,.99];
 let draws=0;
 const secretMath=Object.create(Math);secretMath.random=()=>rolls[draws++];
 const G={
  I18n:{lang:'vi'},Social:{uid:'p0'},Game:{player:players[0]},
  Coop:{isHost:true,broadcast:e=>events.push(e)},
  DB:{save:{pkmsvvSupportFriendship:{151:9999,132:9999},pkmsvvShinyCharm:999}},
  Sprites:{preload(){},Animator:class{update(){}draw(){}}},
  World:{isFree:()=>true,isLiquid:()=>false},
  U:{dist2:(x,y,a,b)=>(x-a)**2+(y-b)**2},
  Spawner:{say(){}},EnemyMgr:{all:()=>[]},FX:{ring(){}},Moves:{BY_ID:{}}
 };
 vm.runInNewContext(source,{G,Math:secretMath,Map,Number,Object});
 G.EggRush.begin({mode:'eggrush',seed:5,members});
 for(let i=0;i<4;i++){
  G.EggRush.onEvent(['er','spawn',990+i,300*i,500]);
  players[0].x=i*300;players[0].y=500;
  G.EggRush.update(.02,i+1,players,r=>results.push(r));
  players[0].x=9999;players[0].y=9999;
 }
 G.EggRush.update(.02,720,players,r=>results.push(r));
 assert.equal(results.length,1);
 const row=results[0].standings.find(s=>s.uid==='p0');
 assert.deepEqual([...row.hatched.map(x=>x.dex)],[151,132,173,132]);
 assert.deepEqual([...row.hatched.map(x=>x.shiny)],[true,false,true,false]);
 assert.deepEqual([...row.hatched.map(x=>x.points)],[40,10,10,10]);
 assert.equal(row.points,70);
 assert.equal(draws,8,'exactly two Host-only independent rolls per egg');
 assert.ok(events.filter(e=>e[1]==='take').every(e=>e[4]===0));
 assert.ok(row.hatched.every(e=>e.points===e.basePoints*(e.shiny?2:1)));
 const html=G.EggRush.html(results[0]);
 assert.match(html,/Ron đã đoạt được 4 trứng, nở ra:/);
 assert.match(html,/data-pkmsvv-hatch-shiny="1"/);
 assert.match(html,/Mew 40 \(×2\)/);
 assert.equal((html.match(/class="pkmsvv-egg-reveal/g)||[]).length,4);
});
