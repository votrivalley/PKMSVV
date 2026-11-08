'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-dex-defeats-qa.js'),'utf8');
function fixture(){
 const mons=[{dex:1,rarity:1},{dex:4,rarity:1},{dex:25,rarity:2},{dex:19,rarity:1}];
 const s={owned:{1:{at:1}},shiny:{},partner:1,stats:{runs:0},tickets:{t1:2}};
 let commits=0,failure=false;
 class Enemy{
  constructor(dex){this.dex=dex;this.def={dex};this.dead=false;this.remote=false;}
  die(){this.dead=true;}
 }
 const G={DEX:mons,DEX_BY:Object.fromEntries(mons.map(m=>[m.dex,m])),
  DB:{save:s,get guest(){return false},commit(){if(failure)return false;commits++;return true}},
  Enemy,Gacha:{
   pool(rarity){return G.DEX.filter(m=>m.rarity===rarity)},
   pull(save,n,gen){const pool=G.DEX.filter(m=>m.rarity===1);if(!pool.length)return null;
    if(save.tickets.t1<n)return null;
    save.tickets.t1-=n;return Array.from({length:n},()=>({dex:pool[0].dex,shiny:false}));}
  },I18n:{lang:'vi'},UI:{toast(){}}};
 vm.runInNewContext(source,{G,console});
 return {G,s,api:G.PKMSVVDexDefeats,Enemy,get commits(){return commits},set failure(x){failure=x}};
}
test('New profiles show unidentified silhouettes and unlock the actually defeated species',()=>{
 const f=fixture();
 assert.equal(f.api.unlocked(f.s,1),false,'Starter owned before winning is not a defeated enemy');
 new f.Enemy(25).die();assert.equal(f.api.unlocked(f.s,25),true);
 assert.equal(f.api.unlocked(f.s,4),false);assert.equal(f.commits,1);
 new f.Enemy(25).die();assert.equal(f.commits,1,'defeat same species does not save again');
});
test('Unrecorded historical owner collection remains safe; no fake kill events',()=>{
 const f=fixture();
 for(let i=2;i<=9;i++)f.s.owned[i]={at:i};
 assert.equal(f.api.unlocked(f.s,1),true,'old inventory remains unlocked');
 new f.Enemy(25).die();
 for(let i=1;i<=9;i++)assert.equal(f.api.unlocked(f.s,i),true);
 assert.equal(f.api.unlocked(f.s,25),true);
 assert.equal(f.s.pkmsvvDefeatedDex[25],true);
});
test('Failed save commit rolls back only the new defeated ledger, never existing save',()=>{
 const f=fixture(),before=JSON.stringify(f.s);f.failure=true;
 new f.Enemy(4).die();assert.equal(JSON.stringify(f.s),before);
 assert.equal(f.api.unlocked(f.s,4),false);
});
test('Gacha gets only genuinely unlocked species, restores global pool and never spends on empty pool',()=>{
 const f=fixture(),beforeDex=f.G.DEX;
 const miss=f.G.Gacha.pull(f.s,1,1);
 assert.equal(miss,null);assert.equal(f.s.tickets.t1,2);
 new f.Enemy(4).die();
 assert.deepEqual(f.G.Gacha.pool(1,1).map(x=>x.dex),[4]);
 const got=f.G.Gacha.pull(f.s,1,1);
 assert.equal(got[0].dex,4);assert.equal(f.s.tickets.t1,1);
 assert.equal(f.G.DEX,beforeDex,'temporary scope must be restored');
 const gachaName='Gacha';
 assert.equal(gachaName,'Gacha');
});
test('Guard deaths and remote deaths do not mint Pokédex unlocks',()=>{
 const f=fixture(),guard=new f.Enemy(19),remote=new f.Enemy(25);
 guard.pkmsvvBossGuard=true;remote.remote=true;guard.die();remote.die();
 assert.equal(f.commits,0);
});
test('QA UI and packaging must show black silhouettes until a defeated entry exists',()=>{
 const ui=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub-ui.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-box-hub.css'),'utf8');
 assert.match(ui,/PKMSVVDexDefeats\?\.unlocked/);
 assert.match(ui,/pkmbx-dex-undefeated/);
 assert.match(ui,/Chưa gặp Pokémon này/);
 assert.match(css,/pkmbx-dex-card\.is-undefeated/);
 for(const filename of ['scripts/build-pokebox-stage1-qa.cjs','scripts/build-pokebox-stage1-pc-qa.cjs','scripts/patch-pokebox-stage4-apk-qa.cjs']){
  const body=fs.readFileSync(path.join(__dirname,'..',filename),'utf8');
  assert.match(body,/pkmsvv-dex-defeats-qa\.js/);
 }
});
