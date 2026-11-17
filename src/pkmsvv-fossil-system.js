/* PKMSVV Fossils QA — isolated Explore-only rock rewards and PC restoration.
 * The core game's native World.damageProp is always called first.
 * Never mutate live simulation/loot mechanics in another game mode.
 */
(function(){
'use strict';
if(typeof G==='undefined')return;
if(G.PKMSVVFossils?.installed)return;
const DATA={"materialTypes":[{"generation":1,"id":"helix_fossil","nameEn":"Helix Fossil","nameVi":"Hóa thạch Xoắn ốc"},{"generation":1,"id":"dome_fossil","nameEn":"Dome Fossil","nameVi":"Hóa thạch Mái vòm"},{"generation":1,"id":"old_amber","nameEn":"Old Amber","nameVi":"Hổ phách cổ"},{"generation":3,"id":"root_fossil","nameEn":"Root Fossil","nameVi":"Hóa thạch Rễ"},{"generation":3,"id":"claw_fossil","nameEn":"Claw Fossil","nameVi":"Hóa thạch Móng vuốt"},{"generation":4,"id":"skull_fossil","nameEn":"Skull Fossil","nameVi":"Hóa thạch Hộp sọ"},{"generation":4,"id":"armor_fossil","nameEn":"Armor Fossil","nameVi":"Hóa thạch Giáp"},{"generation":5,"id":"cover_fossil","nameEn":"Cover Fossil","nameVi":"Hóa thạch Mai"},{"generation":5,"id":"plume_fossil","nameEn":"Plume Fossil","nameVi":"Hóa thạch Lông vũ"},{"generation":6,"id":"jaw_fossil","nameEn":"Jaw Fossil","nameVi":"Hóa thạch Hàm"},{"generation":6,"id":"sail_fossil","nameEn":"Sail Fossil","nameVi":"Hóa thạch Vây lưng"},{"generation":8,"id":"fossilized_bird","nameEn":"Fossilized Bird","nameVi":"Hóa thạch Chim"},{"generation":8,"id":"fossilized_fish","nameEn":"Fossilized Fish","nameVi":"Hóa thạch Cá"},{"generation":8,"id":"fossilized_drake","nameEn":"Fossilized Drake","nameVi":"Hóa thạch Rồng"},{"generation":8,"id":"fossilized_dino","nameEn":"Fossilized Dino","nameVi":"Hóa thạch Khủng long"}],"recipes":[{"generation":1,"dex":138,"name":"Omanyte","evolutionDexIds":[139],"materialIds":["helix_fossil"]},{"generation":1,"dex":140,"name":"Kabuto","evolutionDexIds":[141],"materialIds":["dome_fossil"]},{"generation":1,"dex":142,"name":"Aerodactyl","evolutionDexIds":[],"materialIds":["old_amber"]},{"generation":3,"dex":345,"name":"Lileep","evolutionDexIds":[346],"materialIds":["root_fossil"]},{"generation":3,"dex":347,"name":"Anorith","evolutionDexIds":[348],"materialIds":["claw_fossil"]},{"generation":4,"dex":408,"name":"Cranidos","evolutionDexIds":[409],"materialIds":["skull_fossil"]},{"generation":4,"dex":410,"name":"Shieldon","evolutionDexIds":[411],"materialIds":["armor_fossil"]},{"generation":5,"dex":564,"name":"Tirtouga","evolutionDexIds":[565],"materialIds":["cover_fossil"]},{"generation":5,"dex":566,"name":"Archen","evolutionDexIds":[567],"materialIds":["plume_fossil"]},{"generation":6,"dex":696,"name":"Tyrunt","evolutionDexIds":[697],"materialIds":["jaw_fossil"]},{"generation":6,"dex":698,"name":"Amaura","evolutionDexIds":[699],"materialIds":["sail_fossil"]},{"generation":8,"dex":880,"name":"Dracozolt","evolutionDexIds":[],"materialIds":["fossilized_bird","fossilized_drake"]},{"generation":8,"dex":881,"name":"Arctozolt","evolutionDexIds":[],"materialIds":["fossilized_bird","fossilized_dino"]},{"generation":8,"dex":882,"name":"Dracovish","evolutionDexIds":[],"materialIds":["fossilized_fish","fossilized_drake"]},{"generation":8,"dex":883,"name":"Arctovish","evolutionDexIds":[],"materialIds":["fossilized_fish","fossilized_dino"]}],"regionPools":{"1":{"name":"Kanto","materialIds":["helix_fossil","dome_fossil","old_amber"],"speciesDexIds":[138,139,140,141,142]},"2":{"name":"Johto","materialIds":[],"speciesDexIds":[]},"3":{"name":"Hoenn","materialIds":["root_fossil","claw_fossil"],"speciesDexIds":[345,346,347,348]},"4":{"name":"Sinnoh","materialIds":["skull_fossil","armor_fossil"],"speciesDexIds":[408,409,410,411]},"5":{"name":"Unova","materialIds":["cover_fossil","plume_fossil"],"speciesDexIds":[564,565,566,567]},"6":{"name":"Kalos","materialIds":["jaw_fossil","sail_fossil"],"speciesDexIds":[696,697,698,699]},"7":{"name":"Alola","materialIds":[],"speciesDexIds":[]},"8":{"name":"Galar","materialIds":["fossilized_bird","fossilized_fish","fossilized_drake","fossilized_dino"],"speciesDexIds":[880,881,882,883]},"9":{"name":"Paldea","materialIds":[],"speciesDexIds":[]},"10":{"name":"Votri Valley / Sky","materialIds":[],"speciesDexIds":[]}}};
const FOSSIL_DEX=new Set(DATA.recipes.flatMap(r=>[r.dex,...r.evolutionDexIds]));
const MATERIALS=new Map(DATA.materialTypes.map(x=>[x.id,x]));
const RECIPES=new Map(DATA.recipes.map(x=>[x.dex,x]));
const TYPES={ordinary:.02,rock:.04,fossil:.06};
const txSeen=new WeakSet(); // one eligible rock object = one check, even if callbacks repeat
const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;
const named=(id)=>MATERIALS.get(id)?.nameVi||id;
const getSave=()=>G.DB?.save;
const generation=()=>Number(G.PKMSVVQuickRegion?.selectedRegion)+1;
function canDig(){
 const q=G.PKMSVVQuickRegion,game=G.Game;
 return q?.active===true&&Number.isInteger(q.selectedRegion)&&
 q.selectedRegion>=0&&q.selectedRegion<9&&
 game?.state==='playing'&&!G.Rift?.inArena&&
 !G.Coop?.active&&!G.Royale?.active&&!G.EggRush?.active&&
 !G.PKMSVVChampionArena?.active&&!G.PKMSVVArenaSolo?.active&&
 !G.PKMSVVArenaPvp?.active&&!!game.player;
}
function probability(pl=G.Game?.player){
 const dex=Number(pl?.dex??pl?.mon?.dex);
 if(FOSSIL_DEX.has(dex))return TYPES.fossil;
 const mon=pl?.mon||G.DEX_BY?.[dex];
 const types=Array.isArray(mon?.types)?mon.types.map(t=>String(t).toLowerCase()):[];
 return types.includes('rock')?TYPES.rock:TYPES.ordinary;
}
function stored(s){return s?.pkmsvvFossils&&typeof s.pkmsvvFossils==='object'&&!Array.isArray(s.pkmsvvFossils)?
 s.pkmsvvFossils:{schemaVersion:1,inventory:{},restored:{},guaranteedKabuto:false};}
function inventory(s=getSave()){return {...(stored(s).inventory||{})};}
function guaranteed(s=getSave()){return stored(s).guaranteedKabuto===true;}
function updateSave(s,next){
 if(!s||s!==G.DB?.save||G.DB?.guest||typeof G.DB?.commit!=='function')return false;
 const had=Object.prototype.hasOwnProperty.call(s,'pkmsvvFossils'),before=s.pkmsvvFossils;
 s.pkmsvvFossils=next;
 try{if(G.DB.commit(true)===false)throw Error('Save declined');return true;}
 catch(err){if(had)s.pkmsvvFossils=before;else delete s.pkmsvvFossils;
  G.console?.warn?.('[Fossils] Save failed without awarding material',err);return false;}
}
function rockBroken(p,random=Math.random){
 if(!p||p.type!=='rock'||!canDig()||txSeen.has(p))return {ok:false,reason:'ineligible'};
 // The engine has confirmed destruction already. Never treat a network break
 // or a hit on an undamaged rock as a rewarded event.
 txSeen.add(p);
 const s=getSave(),time=Number(G.Game?.st?.time??G.Game?.time??0);
 const region=generation(),pool=DATA.regionPools[String(region)]?.materialIds||[];
 const first=time>=900&&!guaranteed(s);
 const rate=probability();
 if(!first&&!pool.length)return {ok:false,reason:'no-fossils'};
 if(!first&&!(Number(random())<rate))return {ok:false,reason:'roll',rate};
 const material=first?'dome_fossil':pool[Math.min(pool.length-1,Math.floor(Math.max(0,Math.min(.999999999,Number(random())||0))*pool.length))];
 if(!MATERIALS.has(material))return {ok:false,reason:'bad-material'};
 const before=stored(s);
 const after={schemaVersion:1,inventory:{...(before.inventory||{})},restored:{...(before.restored||{})},
  guaranteedKabuto:before.guaranteedKabuto===true||first};
 after.inventory[material]=(Number(after.inventory[material])||0)+1;
 if(!updateSave(s,after))return {ok:false,reason:'save'};
 try{
  G.FX?.ring?.(p.x,p.y-10,8,35,'#ffde92',.4,2);
  G.UI?.toast?.(tr('🦴 Tìm được '+named(material)+'!','🦴 Found '+MATERIALS.get(material).nameEn+'!'),3500);
 }catch(_){}
 if(first){
  G.PKMSVVPippiGuide?.queue?.('fossils');
  G.PKMSVVPippi?.show?.('fossil',true);
 }else G.PKMSVVPippi?.show?.('fossil');
 return {ok:true,material,first,rate};
}
function restore(dex){
 const recipe=RECIPES.get(Number(dex)),db=G.DB,s=db?.save;
 if(!recipe||!s||db?.guest||!G.DEX_BY?.[recipe.dex]||!G.SPRITE_META?.[recipe.dex])
  return {ok:false,reason:'unavailable'};
 if(s.owned?.[recipe.dex])return {ok:false,reason:'owned'};
 // Finding the Dome Fossil does NOT unlock the machine. First Co-op lab
 // clear must be persisted by the verified mission resolver.
 if(s.pkmsvvCoopLab?.machineUnlocked!==true)return {ok:false,reason:'lab-locked'};
 const previous=stored(s),bag=previous.inventory||{};
 const need=Object.create(null);
 for(const id of recipe.materialIds)need[id]=(need[id]||0)+1;
 if(Object.entries(need).some(([id,count])=>(Number(bag[id])||0)<count))
  return {ok:false,reason:'missing'};
 if(typeof db.commit!=='function')return {ok:false,reason:'save'};
 const next={schemaVersion:1,inventory:{...bag},restored:{...(previous.restored||{})},
  guaranteedKabuto:previous.guaranteedKabuto===true};
 for(const [id,count] of Object.entries(need))next.inventory[id]-=count;
 next.restored[recipe.dex]=true;
 const hadF=Object.prototype.hasOwnProperty.call(s,'pkmsvvFossils'),oldF=s.pkmsvvFossils;
 const hadO=Object.prototype.hasOwnProperty.call(s,'owned'),oldO=s.owned;
 const hadD=Object.prototype.hasOwnProperty.call(s,'pkmsvvDefeatedDex'),oldD=s.pkmsvvDefeatedDex;
 s.pkmsvvFossils=next;
 s.owned={...(s.owned||{}),[recipe.dex]:{at:Date.now(),from:'fossil-revival'}};
 const ledger=G.PKMSVVDexDefeats?.ensureLedger?.(s)||{...(s.pkmsvvDefeatedDex||{})};
 s.pkmsvvDefeatedDex={...ledger,[recipe.dex]:true};
 try{
  if(db.commit(true)===false)throw Error('Save refused');
  G.UI?.toast?.(tr('✨ Hồi sinh thành công '+recipe.name+'!',recipe.name+' restored!'),3000);
  G.PKMSVVPippi?.show?.('fossil',true);
  return {ok:true,dex:recipe.dex};
 }catch(e){
  if(hadF)s.pkmsvvFossils=oldF;else delete s.pkmsvvFossils;
  if(hadO)s.owned=oldO;else delete s.owned;
  if(hadD)s.pkmsvvDefeatedDex=oldD;else delete s.pkmsvvDefeatedDex;
  G.console?.warn?.('[Fossils] Restore rollback',e);
  return {ok:false,reason:'save'};
 }
}
function installRock(){
 const world=G.World;
 if(!world||typeof world.damageProp!=='function')return false;
 if(world.damageProp._pkmsvvFossils)return true;
 const old=world.damageProp;
 function wrapped(p,...args){
  const fresh=p?.type==='rock'&&Number(p.hp)>0&&p.destructible!==false;
  const result=old.call(this,p,...args);
  if(fresh&&result===true&&Number(p.hp)<=0)rockBroken(p);
  return result;
 }
 wrapped._pkmsvvFossils=true;world.damageProp=wrapped;
 return true;
}
function installGacha(){
 const g=G.Gacha;if(!g)return false;
 if(typeof g.pool==='function'&&!g.pool._pkmsvvFossils){
  const native=g.pool;
  function safePool(...args){const list=native.apply(this,args);
   return Array.isArray(list)?list.filter(m=>!FOSSIL_DEX.has(Number(m?.dex))):list;}
  safePool._pkmsvvFossils=true;g.pool=safePool;
 }
 if(typeof g.pull==='function'&&!g.pull._pkmsvvFossils){
  const native=g.pull;
  function safePull(...args){
   const original=G.DEX;
   if(!Array.isArray(original))return native.apply(this,args);
   try{G.DEX=original.filter(p=>!FOSSIL_DEX.has(Number(p?.dex)));
    return native.apply(this,args);}finally{G.DEX=original;}
  }
  safePull._pkmsvvFossils=true;g.pull=safePull;
 }
 return true;
}
function installSpawns(){
 const e=G.Enemies;
 if(!e||typeof e.bagAt!=='function')return false;
 if(e.bagAt._pkmsvvFossils)return true;
 const native=e.bagAt;
 function safeBag(...args){const bag=native.apply(this,args);
  return Array.isArray(bag)?bag.filter(m=>!FOSSIL_DEX.has(Number(m?.dex))):bag;}
 safeBag._pkmsvvFossils=true;e.bagAt=safeBag;
 return true;
}
function install(){installRock();installSpawns();installGacha();return true;}
const api={installed:true,isFossilDex:d=>FOSSIL_DEX.has(Number(d)),
 materials:DATA.materialTypes,recipes:DATA.recipes,regionPools:DATA.regionPools,
 probability,canDig,rockBroken,inventory,guaranteed,restore,install,installRock,installGacha,installSpawns};
G.PKMSVVFossils=api;
install();
// No frame-loop allocation. Re-attach only if native game loads asynchronously.
if(typeof setInterval==='function')setInterval(install,1800);
})();
