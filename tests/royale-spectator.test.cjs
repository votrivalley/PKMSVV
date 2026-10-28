'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'src/web/pkmsvv-spectator.js'),'utf8');
const arenaPatch=fs.readFileSync(path.join(root,'scripts/patch-arena-v1529.cjs'),'utf8');
const levelPatch=fs.readFileSync(path.join(root,'scripts/patch-competitive-levelup.cjs'),'utf8');
function setup(mode='royale'){
 const me={uid:'p0',dead:true,hp:0,x:0,y:0};
 const a={uid:'p1',dead:false,hp:50,x:500,y:100};
 const b={uid:'p2',dead:false,hp:50,x:1000,y:200};
 const c={uid:'p3',dead:false,hp:50,x:1500,y:300};
 const list=[me,a,b,c],screens=new Set(['scr-levelup','scr-item','scr-bond']);
 let closed=0,hidden=0;
 const G={I18n:{lang:'vi'},Royale:{active:mode==='royale'},EggRush:{active:mode==='eggrush'},
  Coop:{active:true,players:()=>list,members:list.map(p=>({uid:p.uid,name:'Trainer '+p.uid}))},
  Game:{player:me,state:'playing'},
  UI:{isOpen:k=>screens.has(k),hide:k=>{screens.delete(k);hidden++;}},
  RunUI:{closeLevelUp:()=>{screens.delete('scr-levelup');closed++;}}
 };
 vm.runInNewContext(src,{G,Number,String,Math,Array});
 return {G,me,a,b,c,list,screens,signals:()=>({closed,hidden})};
}
test('Royale elimination closes active skill/item/bond UI, no reward click or gameplay mutation',()=>{
 const h=setup(),before=h.list.map(p=>({...p}));
 h.G.PKMSVVSpectator.tick();
 assert.equal(h.signals().closed,1);
 assert.equal(h.signals().hidden,2);
 assert.equal(h.screens.size,0);
 assert.equal(h.G.PKMSVVSpectator.cameraTarget().uid,'p1');
 assert.deepEqual(h.list,before,'spectator must not touch trainer HP, position or state');
 assert.equal(h.me.dead,true,'spectator never revives eliminated player');
 h.G.PKMSVVSpectator.tick();
 assert.equal(h.signals().closed,1,'no recurring modal closures');
});
test('spectator cycles living humans/AI, updates camera and skips newly eliminated targets',()=>{
 const h=setup(),s=h.G.PKMSVVSpectator;
 assert.equal(s.cameraTarget().uid,'p1');assert.equal(s.cameraTarget().x,500);
 assert.equal(s.step(1).uid,'p2');
 assert.equal(s.cameraTarget().uid,'p2');assert.equal(s.cameraTarget().y,200);
 assert.equal(s.step(1).uid,'p3');
 assert.equal(s.step(1).uid,'p1','wrap-around');
 assert.equal(s.step(-1).uid,'p3');
 h.c.dead=true;
 assert.equal(s.cameraTarget().uid,'p1','skip eliminated focus and auto-select living survivor');
 h.a.dead=true;h.b.dead=true;
 assert.equal(s.cameraTarget(),null,'if no living target, show no spectator view');
 assert.equal(s.selected,null);
});
test('spectator never activates in Co-op, Egg Rush, on survivors, or after match result',()=>{
 for(const mode of ['coop','eggrush','royale']){
  const h=setup(mode);
  if(mode==='royale')h.me.dead=false;
  h.G.PKMSVVSpectator.tick();
  assert.equal(h.G.PKMSVVSpectator.cameraTarget(),null,mode);
  assert.equal(h.signals().closed,0,mode);
 }
 const h=setup();h.G.Game.state='over';h.G.PKMSVVSpectator.tick();
 assert.equal(h.G.PKMSVVSpectator.cameraTarget(),null);
 h.G.Game.state='playing';h.G.Royale.active=false;
 assert.equal(h.G.PKMSVVSpectator.cameraTarget(),null);
});
test('patched game uses living-target camera and a spectator tick AFTER network snapshots',()=>{
 assert.match(arenaPatch,/pkmsvv-spectator/);
 assert.match(arenaPatch,/G\.PKMSVVSpectator\.reset\(\)/);
 assert.match(arenaPatch,/G\.PKMSVVSpectator\.cameraTarget\(\)/);
 assert.match(arenaPatch,/G\.Camera\.follow\(spectator\?\.x\?\?pl\.x,spectator\?\.y\?\?pl\.y,dt\)/);
 assert.match(arenaPatch,/G\.Coop\.tick\(dt\);\\n    G\.PKMSVVSpectator\.tick\(\)/);
 assert.match(levelPatch,/if\(pl\?\.dead\)\{individualLevelQueue\.length=0;individualLevelOpen=false;G\.RunUI\.closeLevelUp\(\);return;\}/);
 assert.match(levelPatch,/if\(pl\.dead\)\{individualLevelQueue\.length=0;individualLevelOpen=false;return;\}/);
});
