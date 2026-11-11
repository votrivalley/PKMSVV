'use strict';
// Extract the REAL full PKMSVV data module exports for nx.js native runtime.
// Run in CI using compiled game assets from the verified signed Android APK.
// DOES NOT bundle/browser-execute the original web game at Switch runtime.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(process.argv[2]||'');
const out=path.resolve(process.argv[3]||'');
if(!root||!out)throw Error('Usage: node extract-native-catalog.cjs <apk-assets-public> <romfs-output.json>');
function evaluate(rel){
 const text=fs.readFileSync(path.join(root,rel),'utf8');
 const ctx=vm.createContext({G:{},console:{log(){},warn(){},error(){}}});
 vm.runInContext(text,ctx,{timeout:4500,filename:rel});
 return ctx.G;
}
const moves=evaluate('js/data/moves.js').Moves;
const pokedex=evaluate('js/data/pokedex.js').DEX;
if(!moves||!moves.BY_ID||!Array.isArray(moves.ALL))
 throw Error('Real moves.js exports missing or unexpected');
const defs=Object.values(moves.BY_ID);
if(defs.length!==103)throw Error('Upstream 103-move pool drift: '+defs.length);
const allowed=new Set(['projectile','melee','beam','orbit','nova','aura','buff','boomerang','chain',
 'mine','meteor','turret','dash','trail','cone','homing','bounce','charge','spin','quake','vortex','shove','stun']);
const cleanMoves=defs.map(m=>{
 const kind=String(m.kind);
 if(!allowed.has(kind))throw Error('Unexpected real move kind: '+kind);
 const id=String(m.id||''),name=String(m.name||id);
 if(!/^[a-z0-9-]+$/.test(id)||!name)throw Error('Invalid real move ID/name: '+id);
 return {
  id,name,kind,type:String(m.type||'normal'),dmg:Number(m.dmg)||1,
  cd:Number(m.cd)||0.7,count:Math.max(1,Number(m.count)||1),
  radius:Number(m.radius)||0,speed:Number(m.speed)||0,life:Number(m.life)||0,
  pierce:Number(m.pierce)||0,width:Number(m.width)||0,
  maxLvl:Number(m.maxLvl)||5,
  upgrades:Array.isArray(m.ups)?m.ups.slice(0,6).map(u=>({text:String(u.t||''),mods:u.m||{}})):[]
 };
});
if(!Array.isArray(pokedex))throw Error('Real Pokédex exports missing');
const gen1=pokedex.filter(p=>Number.isInteger(p.dex)&&p.dex>=1&&p.dex<=151)
 .sort((a,b)=>a.dex-b.dex).map(p=>({
 dex:p.dex,name:String(p.name),types:Array.isArray(p.types)?p.types.map(String):[],
 hp:Number(p.hp)||1,spd:Number(p.spd)||1,atk:Number(p.atk)||1,
 pa:Number(p.pa)||1,sa:Number(p.sa)||1,df:Number(p.df)||1,sd:Number(p.sd)||1,
 rarity:Number(p.rarity)||1,bst:Number(p.bst)||0,
 starter:!!p.starter,legendary:!!p.leg
 }));
if(gen1.length!==151||gen1.some((p,i)=>p.dex!==i+1))
 throw Error('Kanto Pokédex must contain exact National Dex #1-151; got '+gen1.length);
// The native port consumes the upstream *rates*, not its browser/DOM gacha UI.
const gachaSource=fs.readFileSync(path.join(root,'js/systems/gacha.js'),'utf8');
const ratesMatch=gachaSource.match(/const RATES\s*=\s*(\[\[[^;]+\]\])\s*;/);
const pityMatch=gachaSource.match(/const PITY_5\s*=\s*(\d+)\s*;/);
if(!ratesMatch||!pityMatch)throw Error('Actual compiled gacha odds/pity missing');
const nativeRates=JSON.parse(ratesMatch[1]);
if(nativeRates.length!==5||nativeRates.some(r=>!Array.isArray(r)||r.length!==2||r[1]<0)||
 Math.abs(nativeRates.reduce((a,r)=>a+r[1],0)-100)>0.001)throw Error('Invalid real gacha rates');
const nativePity=Number(pityMatch[1]);
if(nativePity<10||nativePity>250)throw Error('Real gacha hard pity out of supported bounds: '+nativePity);
const catalog={
 format:'pkmsvv-switch-native-real-catalog-v1',
 originalGame:'PKMSVV compiled Android QA build 42868942245',
 runtime:'nx.js native - extracted data only, NO DOM / Brewser',
 moves:cleanMoves,
 pokemon:gen1,
 recruitment:{rates:nativeRates,pity5:nativePity,source:'js/systems/gacha.js'}
};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(catalog,null,2)+'\n');
console.log('REAL PKMSVV RECRUITMENT RATES:',JSON.stringify(nativeRates),'pity',nativePity);
console.log('REAL PKMSVV CATALOG EXTRACTED: moves',cleanMoves.length,
 'move kinds',new Set(cleanMoves.map(m=>m.kind)).size,'Kanto Pokémon',gen1.length,
 'sample',cleanMoves.slice(0,3).map(m=>m.id).join(', '));
