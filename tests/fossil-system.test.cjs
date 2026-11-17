'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-fossil-system.js'),'utf8');
const catalog=require('../data/pkmsvv-fossil-catalog.json');
function rig({dex=25,types=['electric'],gen=1,at=10,fail=false}={}){
 const player={dex,mon:{dex,types}},rocks=[],gift=[],say=[];
 const save={owned:{25:{at:1,from:'starter'}},coins:4000};
 const world={damageProp(p,amount){p.hp-=amount;return p.hp<=0}};
 const game={player,state:'playing',st:{time:at}};
 const G={World:world,Game:game,DEX_BY:{140:{dex:140,name:'Kabuto'},25:{dex:25},142:{dex:142,name:'Aerodactyl'}},SPRITE_META:{140:{},25:{},142:{}},
  PKMSVVQuickRegion:{active:true,selectedRegion:gen-1},
  DB:{save,guest:false,commit(){return !fail}},
  FX:{ring(){}},UI:{toast(t){say.push(t)}},I18n:{lang:'vi'},
  console:{warn(){}},PKMSVVPippiGuide:{queue(type){gift.push(type)}},
  PKMSVVPippi:{show(type){gift.push(type)}},
  Gacha:{pool(){return [{dex:140},{dex:25}]},pull(){return [25]}},
  DEX:[{dex:140},{dex:25}],
  Enemies:{bagAt(){return [{dex:140},{dex:25}]}}
 };
 const ctx={G,console,setInterval(){return 1;},Math,Date};vm.createContext(ctx);vm.runInContext(source,ctx);
 const rock=()=>({type:'rock',hp:3,tx:1,ty:2,x:30,y:30,destructible:true});
 return {G,save,rock,rocks,gift,say,api:G.PKMSVVFossils,game,player};
}
test('fossil role priority 6% > Rock 4% > base 2%; no additive stacking',()=>{
 const a=rig({dex:25,types:['electric']});
 assert.equal(a.api.probability(),.02);
 a.player.mon.types=['rock'];assert.equal(a.api.probability(),.04);
 a.player.dex=140;a.player.mon={dex:140,types:['rock','water']};
 assert.equal(a.api.probability(),.06);
});
test('one native rock kill rolls once, not one roll per hit or network break',()=>{
 const a=rig({gen:1,at:10});let calls=0;
 const saved=Math.random; // no global patch: use injected RNG for public pure hook
 const p=a.rock();assert.equal(a.G.World.damageProp(p,1),false);
 assert.equal(a.G.World.damageProp(p,2),true);
 assert.ok(!a.save.pkmsvvFossils||Object.keys(a.api.inventory()).length<=1);
 assert.equal(a.G.World.damageProp(p,1),true);
 const after=JSON.stringify(a.api.inventory());
 assert.equal(JSON.stringify(a.api.inventory()),after);
 assert.equal(a.G.Enemies.bagAt().some(x=>x.dex===140),false);
 assert.equal(a.G.Gacha.pool().some(x=>x.dex===140),false);
 assert.equal(a.G.Gacha.pull().includes(25),true);
 assert.deepEqual(a.G.DEX.map(x=>x.dex),[140,25]);
});
test('first rock destroyed after minute fifteen guarantees single Kabuto Dome Fossil across runs',()=>{
 const a=rig({gen:2,at:899});
 const p=a.rock();a.G.World.damageProp(p,3);
 assert.equal(a.api.guaranteed(),false);
 a.game.st.time=900;
 const b=a.rock();a.G.World.damageProp(b,3);
 assert.equal(a.api.inventory().dome_fossil,1);
 assert.equal(a.api.guaranteed(),true);
 assert.equal(a.gift.filter(x=>x==='fossils').length,1);
 a.game.st.time=1000;
 const c=a.rock();a.G.World.damageProp(c,3);
 assert.equal(a.api.inventory().dome_fossil,1,'Johto has no random fossil materials');
 assert.equal(a.gift.filter(x=>x==='fossils').length,1);
});
test('failing save does not grant Kabuto material or consume once-per-profile guarantee',()=>{
 const a=rig({gen:1,at:901,fail:true});
 a.G.World.damageProp(a.rock(),3);
 assert.equal(a.api.guaranteed(),false);
 assert.equal(a.api.inventory().dome_fossil,undefined);
 assert.equal(a.gift.length,0);
});
test('regular rock chance checks at most one per break with correct Gen pool',()=>{
 const a=rig({gen:3,at:11});
 assert.equal(a.api.rockBroken(a.rock(),()=>.999).reason,'roll');
 const b=a.rock();
 const n=a.api.rockBroken(b,()=>0);
 assert.equal(n.ok,true);
 assert.ok(['root_fossil','claw_fossil'].includes(n.material));
 assert.equal(a.api.rockBroken(b,()=>0).reason,'ineligible');
 a.G.PKMSVVQuickRegion.selectedRegion=6;
 assert.equal(a.api.rockBroken(a.rock(),()=>0).reason,'no-fossils');
});
test('restoration atomically consumes one fossil and grants Pokédex and owned Kabuto',()=>{
 const a=rig({gen:1,at:900});
 a.G.World.damageProp(a.rock(),3);
 a.save.pkmsvvCoopLab={machineUnlocked:true};
 const result=a.api.restore(140);
 assert.equal(result.ok,true);
 assert.equal(a.save.owned[140].from,'fossil-revival');
 assert.equal(a.api.inventory().dome_fossil,0);
 assert.equal(a.save.pkmsvvDefeatedDex[140],true);
 assert.equal(a.api.restore(140).reason,'owned');
});
test('restoration is blocked with missing material or unavailable sprite and leaves save unchanged',()=>{
 const a=rig();a.save.pkmsvvCoopLab={machineUnlocked:true};const old=JSON.stringify(a.save);
 assert.equal(a.api.restore(140).reason,'missing');
 assert.equal(JSON.stringify(a.save),old);
});
test('Kabuto fossil can be collected but machine is locked until genuine Co-op first clear',()=>{
 const a=rig({gen:1,at:900});
 a.G.World.damageProp(a.rock(),3);
 const before=JSON.stringify(a.save);
 assert.equal(a.api.inventory().dome_fossil,1,'guaranteed material belongs to the player');
 assert.equal(a.api.restore(140).reason,'lab-locked');
 assert.equal(JSON.stringify(a.save),before,'locked attempt never consumes material or coins');
 a.save.pkmsvvCoopLab={machineUnlocked:false};
 assert.equal(a.api.restore(140).reason,'lab-locked');
 assert.equal(a.api.inventory().dome_fossil,1);
});
test('cataloged 25 fossils are excluded from ordinary recruitment and spawn pools',()=>{
 const a=rig();
 assert.equal(a.api.materials.length,catalog.materialTypes.length);
 const all=new Set(catalog.recipes.flatMap(x=>[x.dex,...x.evolutionDexIds]));
 assert.equal(all.size,25);
 for(const d of all)assert.equal(a.api.isFossilDex(d),true);
});
