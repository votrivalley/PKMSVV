'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const NOV=Date.parse('2026-11-15T12:00:00Z'),JAN=Date.parse('2027-01-15T12:00:00Z');
function setup(){
 const saves={owned:{25:{}},coins:700,pkmsvvMultiplayerDone:{coop:true},pkmsvvBerry:{bag:{oran:2}}};
 const G={I18n:{lang:'vi'},MenuUI:{open(){}},DB:{save:saves}};
 const doc={readyState:'loading',addEventListener(){},
  getElementById(){return null}};
 vm.runInNewContext(read('src/pkmsvv-season-event.js'),{G,document:doc,Date,Math,Number});
 return {G,api:G.PKMSVVSeason};
}
test('Nov 2026 UTC season ends on schedule; no unsupported loot or stat boosts',()=>{
 const {api}=setup();
 assert.equal(api.nowActive(Date.parse('2026-10-31T23:59:59Z')),false);
 assert.equal(api.nowActive(Date.parse('2026-11-01T00:00:00Z')),true);
 assert.equal(api.nowActive(Date.parse('2026-12-01T00:00:00Z')),false);
 assert.equal(api.nowActive(JAN),false);
 assert.equal(api.CONFIG.maxDraw<=50,true);
 assert.deepEqual(Array.from(api.CONFIG.activeModes),['solo','coop']);
});
test('Same host seed and season packet yield identical landscape on PC/Web/Android',()=>{
 for(const seed of [0,1,42,845771,2**31-1]){
  const h=setup(),packet=h.api.hostPacket(seed,'coop',NOV);
  const client=setup();
  assert.equal(packet.seasonId,'mist-memory-2026');
  const one=h.api.begin({...packet,seed,mode:'coop',utc:NOV});
  const two=client.api.begin({...packet,seed,mode:'coop',utc:NOV});
  assert.equal(one.active,true);assert.equal(one.skin,two.skin);
  assert.equal(one.weatherState,two.weatherState);
  assert.equal(h.api.skinFor(seed).id,two.skin);
  assert.equal(h.api.hash(seed,3,5),client.api.hash(seed,3,5));
 }
});
test('Deterministic variant set contains three distinct map skins',()=>{
 const {api}=setup();
 const seen=new Set(Array.from({length:180},(_,seed)=>api.skinFor(seed).id));
 assert.equal(seen.size,3);
 assert.equal(api.VARIANTS.length,3);
});
test('Competitive, Berry Rescue and expired season remain untouched',()=>{
 const {api,G}=setup(),before=JSON.stringify(G.DB.save);
 for(const mode of ['royale','eggrush','berry','berryeasy','champion','solo-arena']){
  assert.equal(api.hostPacket(44,mode,NOV).seasonId,null);
  assert.equal(api.begin({seed:44,mode,seasonId:'mist-memory-2026',utc:NOV}).active,false);
 }
 assert.equal(api.begin({seed:45,mode:'solo',utc:JAN}).active,false);
 assert.equal(api.begin({seed:45,mode:'coop',seasonId:null,utc:NOV}).active,false);
 assert.equal(JSON.stringify(G.DB.save),before);
});
test('Canvas seasonal draw is capped, respects world camera and does not change collisions',()=>{
 const {api,G}=setup(),before=JSON.stringify(G.DB.save);
 api.begin({seed:42,mode:'solo',utc:NOV});
 const draws=[];
 const canvas={width:1280,height:720},ctx={canvas,globalAlpha:1,fillStyle:'',
  save(){},restore(){},fillRect(...a){draws.push(a)}};
 const cam={scale:1,left:()=>0,top:()=>0};
 api.draw(ctx,cam);assert.ok(draws.length>0);assert.ok(draws.length<=api.CONFIG.maxDraw*2);
 assert.equal(JSON.stringify(G.DB.save),before);
 const patch=read('scripts/patch-season-event.cjs');
 assert.match(patch,/G\.World\.drawGround\(ctx, cam\)/);
 assert.doesNotMatch(patch,/collide|drawProp|damageProp|walkable/);
 assert.match(patch,/hostPacket/);
 assert.match(read('scripts/prepare-game.cjs'),/patch-season-event\.cjs/);
});