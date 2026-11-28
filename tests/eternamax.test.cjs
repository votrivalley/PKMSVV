'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync(require.resolve('../src/pkmsvv-eternamax-qa.js'),'utf8');
function fixture(){
 const hazards=[],p={x:150,y:0};
 class Enemy{
  constructor(){Object.assign(this,{id:2,dex:890,pkmsvvExploreBoss:true,pkmsvvExploreRegion:7,pkmsvvExploreFinal:true,hp:160000,maxHp:160000,spd:100,dmg:50,x:0,y:0,dead:false,anim:{dir:2},drops:0});}
  hurt(d){if(this.dead)return;this.hp-=d;if(this.hp<=0)this.die();}
  die(){this.dead=true;this.drops++;}
  update(){}
  bossInit(){this.ai={cd:0,cast:null};}
  bossMove(){return [1,1,'Walk'];}
  bossStart(id){this.native=id;}
  hazard(o){hazards.push({...o,hit:false});}
  applySlow(n,t){this.slow=n;this.slowT=t;}
 }
 class Animator{constructor(dex){this.dex=dex;}play(a){this.cur=a;}}
 const e=new Enemy(),q={active:true,selectedRegion:7,finalBoss:e},G={Enemy,PKMSVVQuickRegion:q,Coop:{active:false},Sprites:{Animator,bodyRadius:()=>55,bodyHeight:()=>175,preload(){}},SPRITE_META:{90890:{a:Object.fromEntries(['Idle','Walk','Attack','Charge','Shoot'].map(x=>[x,{r:8}]))}},PKMSVV_ETERNAMAX_ASSET:{id:90890},Hazards:{all:hazards}};
 vm.runInNewContext(code,{G,console});return {G,e,p,hazards,q,api:G.PKMSVVEternamaxQA};
}
test('only actual Galar final transforms; no duplicate kill/loot; lethal overflow cannot skip phase two',()=>{
 const {G,e,api,q}=fixture();assert.equal(api.arm(new G.Enemy()),false);assert.equal(api.arm(e),true);
 e.hurt(999999);assert.equal(e.dead,false);assert.equal(e.hp,88000);assert.equal(e.maxHp,160000);assert.equal(e.dex,890);assert.equal(e.anim.dex,90890);assert.equal(e.drops,0);assert.equal(api.status(e).phase,2);
 e.hurt(999999);assert.equal(e.hp,88000);e.update(1.2);e.hurt(88000);
 assert.equal(e.dead,true);assert.equal(e.drops,1);assert.equal(api.completed(e),true);
});
test('nonlethal threshold, distinct telegraphed signatures, control cap and no mutation of other boss',()=>{
 const {G,e,p,hazards,api}=fixture();api.arm(e);e.hurt(72000);assert.equal(api.status(e).phase,2);
 e.update(1.3);e.bossStart('beam',p);assert.equal(hazards.length,1);assert.equal(hazards[0].kind,'beam');assert.equal(hazards[0].delay,1.25);
 e.bossStart('slam',p);assert.equal(e.native,'slam');e.bossStart('beam',p);assert.equal(hazards.length,4);assert.ok(hazards.slice(1).every(h=>h.kind==='zone'&&h.type==='poison'));
 e.applySlow(.9,8);assert.equal(e.slow,.35);assert.equal(e.slowT,1);
 const other=new G.Enemy();other.applySlow(.9,8);assert.equal(other.slow,.9);other.hurt(999999);assert.equal(other.dead,true);
});
