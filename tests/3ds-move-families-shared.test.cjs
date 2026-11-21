'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const movesCode=fs.readFileSync(path.join(root,'src/pkmsvv-3ds-move-families.js'),'utf8');
const fxCode=fs.readFileSync(path.join(root,'src/pkmsvv-3ds-combat-families.js'),'utf8');
const patchCode=fs.readFileSync(path.join(root,'scripts/patch-3ds-move-families.cjs'),'utf8');
const prepCode=fs.readFileSync(path.join(root,'scripts/prepare-game.cjs'),'utf8');
function fixture(){
 const actions={hits:[],blasts:[],props:[],fx:[],draws:[],kicks:0};
 const mons=[];
 const fxs={};
 for(const method of ['ring','burst','sp','slash'])fxs[method]=(...args)=>actions.fx.push({method,args});
 const G={
  U:{TYPE_COLOR:{normal:'#fff',ground:'#aa8',water:'#55f'}},
  LIFT:12,
  FX:fxs,
  VFX:{forMove:m=>({pal:m.type,proj:'wind'}),draw(...args){actions.draws.push(args)}},
  Camera:{sees:()=>true,kick(){actions.kicks++;}},
  World:{isWall:()=>false,propsInCircle:()=>[],damageProp:p=>actions.props.push(p)},
  EnemyMgr:{queryCircle:(x,y,r)=>mons.filter(e=>!e.dead&&Math.hypot(e.x-x,e.y-y)<=r)},
  Coop:{active:false},
  Moves:{
   ALL:[{id:'tackle',kind:'melee',type:'normal'}],
   BY_ID:{tackle:{id:'tackle',kind:'melee',type:'normal'}},
   POOL:{normal:['tackle'],ground:[],water:[]},
   poolFor(mon){const ids=new Set(this.POOL.normal);for(const t of mon.types)for(const id of this.POOL[t]||[])ids.add(id);return [...ids];},
   instance(id){const m=this.BY_ID[id];return {...m,def:m,lvl:1,t:0};}
  }
 };
 const context={G,Math,Date,performance:{now:()=>1000}};
 vm.runInNewContext(movesCode,context);
 vm.runInNewContext(fxCode,context);
 const hit=(p,e,dmg,col,dx,dy,knock,m)=>actions.hits.push({p,e,dmg,col,dx,dy,knock,id:m.id});
 const blast=(f,r)=>actions.blasts.push({x:f.x,y:f.y,r,ghost:f.ghost,owner:f.owner});
 const hooks={hit,blast};
 const fieldStore=[];
 const player={x:0,y:0,aim:0,atk:2,r:16,bodyH:32};
 function cast(id,ghost=false) {
  const m=G.Moves.instance(id); assert.ok(G.PKMSVV3DSCombatFX.spawn(fieldStore,player,m,ghost));return fieldStore.at(-1);
 }
 function update(f,dt){f.t+=dt;return G.PKMSVV3DSCombatFX.update(f,dt,hooks);}
 return {G,actions,mons,player,fieldStore,cast,update,hooks};
}
test('4 original-style 3DS moves including Surf join learnable type pool without replacing existing skills',()=>{
 const f=fixture();
 assert.equal(f.G.Moves.ALL.length,5);
 assert.deepEqual(f.G.Moves.ALL.slice(1).map(x=>x.id),['rapid-spin','earthquake','whirlpool','surf']);
 assert.equal(f.G.Moves.BY_ID['rapid-spin'].kind,'spin');
 assert.equal(f.G.Moves.BY_ID.earthquake.kind,'quake');
 assert.equal(f.G.Moves.BY_ID.whirlpool.kind,'vortex');
 assert.equal(f.G.Moves.BY_ID.surf.kind,'wave');
 assert.equal(f.G.Moves.BY_ID.surf.name,'Surf');
 assert.ok(f.G.Moves.poolFor({types:['water']}).includes('whirlpool'));
 assert.ok(f.G.Moves.poolFor({types:['water']}).includes('surf'), 'Surf independently learnable, not only Bubble evolution');
 assert.ok(f.G.Moves.poolFor({types:['ground']}).includes('earthquake'));
 assert.ok(f.G.Moves.poolFor({types:['flying']}).includes('rapid-spin'));
 assert.equal(f.G.PKMSVV3DSMoveFamilies.install(),0,'not duplicated');
 assert.equal(f.G.Moves.ALL.length,5);
});
test('103-move PKMSVV keeps original Rapid Spin and Whirlpool without duplicates or Co-op regressions',()=>{
 const rapid={id:'rapid-spin',kind:'spin',type:'normal',cd:1.0,fromOriginal:true};
 const whirl={id:'whirlpool',kind:'vortex',type:'water',cd:3.0,fromOriginal:true};
 const G={
   Moves:{
    ALL:[rapid,whirl],BY_ID:{'rapid-spin':rapid,whirlpool:whirl},
    POOL:{normal:['rapid-spin'],water:['whirlpool'],ground:[]},
    poolFor(mon){
      const ids=new Set(this.POOL.normal);
      for(const t of mon.types)for(const id of this.POOL[t]||[])ids.add(id);
      return [...ids];
    }
   },
   Coop:{active:false}
 };
 vm.runInNewContext(movesCode,{G,Math});
 assert.equal(G.Moves.ALL.length,4,'two original IDs + two genuinely missing Earthquake/Surf');
 assert.equal(G.Moves.BY_ID['rapid-spin'],rapid);
 assert.equal(G.Moves.BY_ID.whirlpool,whirl);
 assert.equal(G.Moves.BY_ID['rapid-spin'].cd,1.0);
 assert.equal(G.Moves.BY_ID.whirlpool.cd,3.0);
 assert.deepEqual([...G.PKMSVV3DSMoveFamilies.registered].sort(),['earthquake','surf']);
 assert.equal(G.PKMSVV3DSMoveFamilies.isNativeMove('rapid-spin'),false);
 assert.equal(G.PKMSVV3DSMoveFamilies.isNativeMove('whirlpool'),false);
 assert.equal(G.PKMSVV3DSMoveFamilies.isNativeMove('surf'),true);
 G.Coop.active=true;
 const pool=G.Moves.poolFor({types:['water','ground']});
 assert.ok(pool.includes('rapid-spin'),'never remove old Rapid Spin from Co-op');
 assert.ok(pool.includes('whirlpool'),'never remove old Whirlpool from Co-op');
 assert.ok(!pool.includes('earthquake')&&!pool.includes('surf'),'new mechanics still QA-gated in network mode');
});
test('networked Co-op hides new field moves but keeps all preexisting skills',()=>{
 const f=fixture();
 f.G.Coop.active=true;
 const pool=f.G.Moves.poolFor({types:['ground','water']});
 assert.equal(pool.length,1);
 assert.equal(pool[0],'tackle');
 f.G.Coop.active=false;
 assert.equal(f.G.Moves.poolFor({types:['ground','water']}).length,5);
});
test('Rapid Spin is 3 real timed area hits, with pixel slash visual and property damage',()=>{
 const f=fixture(),enemy={id:2,x:30,y:0,dead:false};
 f.mons.push(enemy);
 f.G.World.propsInCircle=()=>[{id:'rock'}];
 const field=f.cast('rapid-spin');
 assert.equal(field.left,3);
 for(let i=0;i<3;i++){const done=f.update(field,0.13);assert.equal(done,i===2);}
 assert.equal(f.actions.hits.length,3);
 assert.equal(f.actions.hits[0].dmg,24);
 assert.equal(f.actions.hits[0].knock,40);
 assert.equal(f.actions.props.length,3);
 assert.equal(f.actions.fx.filter(x=>x.method==='slash').length,3);
});
test('Earthquake advances in five 34px steps, respecting walls and doing real blast damage',()=>{
 const f=fixture(),field=f.cast('earthquake');
 assert.equal(f.actions.kicks,1);
 for(let i=0;i<5;i++){const end=f.update(field,0.07);assert.equal(end,i===4);}
 assert.deepEqual(f.actions.blasts.map(x=>x.x),[34,68,102,136,170]);
 assert.equal(f.actions.fx.filter(x=>x.method==='ring').length,5);
 const g=fixture(),wall=g.cast('earthquake');
 g.G.World.isWall=(x)=>x>=68;
 assert.equal(g.update(wall,0.07),false);
 assert.equal(g.update(wall,0.07),true);
 assert.equal(g.actions.blasts.length,1,'solid walls block earthquake beyond first wave');
});
test('Whirlpool pulls regular enemies, reduces pull on boss, ticks damage and renders vortex',()=>{
 const f=fixture();
 const target={id:1,x:100,y:0,dead:false},reg={id:2,x:140,y:0,dead:false};
 const boss={id:3,x:135,y:0,dead:false,boss:true};
 f.mons.push(target,reg,boss);f.player.target=target;
 const field=f.cast('whirlpool');
 assert.equal(field.x,100);
 f.update(field,.10); f.update(field,.10);
 assert.ok(reg.x<140,'regular enemy pulled inward');
 assert.ok(boss.x>reg.x-5,'boss pulls less than normal mob');
 assert.ok(f.actions.blasts.length>=1);
 const ctx={globalAlpha:1,strokeStyle:'',lineWidth:0,beginPath(){},ellipse(){},stroke(){},fill(){}};
 f.G.PKMSVV3DSCombatFX.draw(ctx,field,1.2);
 assert.ok(f.actions.draws.length>0,'native-looking animated wind sprite draws on existing Web FX atlas');
});
test('Co-op ghost casts are visual-only and cannot hit/pull enemies',()=>{
 const f=fixture(),enemy={id:5,x:25,y:0,dead:false};f.mons.push(enemy);
 const field=f.cast('rapid-spin',true);
 for(let i=0;i<3;i++)f.update(field,0.13);
 assert.equal(f.actions.hits.length,0);
 const quake=f.cast('earthquake',true);
 for(let i=0;i<5;i++)f.update(quake,0.07);
 assert.equal(f.actions.blasts.length,0);
 const f2=fixture(),en={id:3,x:155,y:0,dead:false};
 f2.mons.push(en);const whirl=f2.cast('whirlpool',true);
 f2.update(whirl,0.1);
 assert.equal(en.x,155);
 assert.equal(f2.actions.blasts.length,0);
});
test('Surf is a wide 3DS water wave: sweeps forward, hits each enemy exactly once and carries mobs',()=>{
 const f=fixture();
 const ordinary={id:11,x:0,y:-36,dead:false};
 const boss={id:12,x:0,y:36,boss:true,dead:false};
 const prop={id:20,dead:false,gone:false};
 f.mons.push(ordinary,boss);
 f.G.World.propsInCircle=()=>[prop];
 const wave=f.cast('surf');
 assert.equal(wave.kind,'pkmsvv3ds-wave');
 assert.equal(wave.w,124);
 assert.equal(wave.len,260);
 assert.equal(wave.x,-50,'starts behind the Pokémon, like native K_WAVE');
 let ended=false;
 for(let i=0;i<15&&!ended;i++)ended=f.update(wave,.10);
 assert.equal(ended,true,'wave finishes after advancing past the player');
 assert.ok(wave.x>0,'wave passes the player and moves ahead');
 assert.equal(f.actions.hits.filter(x=>x.id==='surf').length,2,'one hit for each enemy across many physics frames');
 assert.ok(ordinary.x>boss.x,'boss pushed 15% instead of normal 75% forward-wave factor');
 assert.equal(f.actions.props.length,1,'destructible property hit exactly once');
 assert.equal(f.actions.hits[0].dmg,48,'native damage uses player attack');
});
test('Surf ghost attack is only visual; enemy and prop state stay untouched',()=>{
 const f=fixture(),enemy={id:99,x:0,y:0,dead:false};
 f.mons.push(enemy);
 f.G.World.propsInCircle=()=>[{id:1}];
 const wave=f.cast('surf',true);
 for(let i=0;i<10;i++)f.update(wave,.10);
 assert.equal(f.actions.hits.length,0);
 assert.equal(f.actions.props.length,0);
 assert.equal(enemy.x,0);
 const ops=[];
 const ctx={globalAlpha:1,strokeStyle:'',lineWidth:0,fillStyle:'',
   beginPath(){ops.push('begin');},moveTo(){ops.push('move');},
   lineTo(){ops.push('line');},quadraticCurveTo(){ops.push('curve');},
   closePath(){ops.push('close');},fill(){ops.push('fill');},
   stroke(){ops.push('stroke');}};
 f.G.PKMSVV3DSCombatFX.draw(ctx,wave,1);
 assert.ok(ops.includes('fill')&&ops.includes('curve'),'canvas draws wide water wall and foam crest');
});
test('Surf waves respect runtime limits and preserve legacy Bubble evolution',()=>{
 const f=fixture();
 for(let i=0;i<4;i++)f.cast('surf');
 assert.equal(f.fieldStore.filter(x=>x.kind==='pkmsvv3ds-wave').length,3);
 const moveSource=fs.readFileSync(path.join(root,'src/pkmsvv-3ds-move-families.js'),'utf8');
 assert.ok(moveSource.includes("id:'surf', name:'Surf', type:'water', kind:'wave'"));
 assert.ok(!patchCode.includes("js/data/moves.js"),'legacy Bubble→Surf evolution data must not change');
 assert.equal(f.G.Moves.BY_ID.tackle.kind,'melee');
});
test('Whirlpool cap is two per owner and all native field effects are capped',()=>{
 const f=fixture();
 for(let i=0;i<3;i++)f.cast('whirlpool');
 assert.equal(f.fieldStore.filter(x=>x.kind==='pkmsvv3ds-vortex').length,2);
 for(let i=0;i<10;i++)f.cast('rapid-spin');
 assert.equal(f.fieldStore.filter(x=>x.kind==='pkmsvv3ds-spin').length,6);
});
test('actual common gameplay build installs the three source-level combat patches before minification',()=>{
 assert.match(prepCode,/patch-3ds-move-families\.cjs/);
 for(const token of ["G.PKMSVV3DSMoveFamilies.isNativeMove(m.id)","G.PKMSVV3DSCombatFX.spawn","G.PKMSVV3DSCombatFX.update","G.PKMSVV3DSCombatFX.draw","js/systems/combat.js"])assert.ok(patchCode.includes(token),token);
 assert.match(patchCode,/js\/systems\/pkmsvv-3ds-move-families\.js/);
 assert.match(patchCode,/js\/systems\/pkmsvv-3ds-combat-families\.js/);
 assert.doesNotMatch(patchCode,/save\.json|save\.bak|firebase|signing|android-app-id/i);
});
