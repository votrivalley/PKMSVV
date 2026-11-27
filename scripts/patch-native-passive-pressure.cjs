'use strict';
// QA only: additional pressure relative to already tuned PKMSVV engine.
// Never raise population caps, XP, spawn rates or short objective-mode stats.
const fs=require('node:fs'),path=require('node:path');
const game=path.join(__dirname,'../vendor/pokesurvivor');
function pressureAt(seconds){
 const t=Math.max(0,Math.min(1800,Number(seconds)||0))/300;
 const hp=[1,1.10,1.25,1.40,1.55,1.75,2];
 const dmg=[1,1.05,1.15,1.25,1.35,1.45,1.50];
 const i=Math.min(5,Math.floor(t)),f=t-i;
 return {hp:hp[i]+(hp[i+1]-hp[i])*f,dmg:dmg[i]+(dmg[i+1]-dmg[i])*f};
}
function bossPressure(at){
 return at>=1800?{hp:2,dmg:1.35}:at>=900?{hp:1.5,dmg:1.25}:{hp:1,dmg:1};
}
function scaleEnemy(e,m){
 if(m.hp!==1){e.maxHp=Math.max(1,Math.round(e.maxHp*m.hp));e.hp=e.maxHp;}
 if(m.dmg!==1)e.dmg*=m.dmg;
}
function install(){
 const file=path.join(game,'js/systems/spawner.js'),enemy=path.join(game,'js/entities/enemy.js');
 let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),e=fs.readFileSync(enemy,'utf8').replace(/\r\n/g,'\n');
 function one(code,a,b){
  if(code.split(a).length!==2)throw Error('Native passive balance anchor drift: '+a);
  return code.replace(a,b);
 }
 // Preserve existing special mission and competitive tuning.
 const anchor='  function spawnOne(pl, t, angle) {';
 const funcs=[pressureAt,bossPressure,scaleEnemy].map(f=>'  '+f.toString()).join('\n');
 s=one(s,anchor,funcs+`
  function pressureEnabled(){
   if(G.Royale?.active||G.EggRush?.active||G.Arena?.active||
      G.PKMSVVArenaSolo?.active||G.PKMSVVChampionArena?.active||
      G.PKMSVVArenaPvp?.active||G.PKMSVVBerryRescue?.active||
      G.PKMSVVFossilExpedition?.session||G.Rift?.inArena||G.Judgment?.active)return false;
   return !G.Coop?.active || G.Social?.room?.mode==='coop';
  }
`+anchor);
 const start=s.indexOf(anchor),end=s.indexOf('  function spawnBoss(',start);
 if(start<0||end<0)throw Error('Missing original spawn functions');
 let normal=s.slice(start,end);
 const elite=normal.match(/if\s*\([^\n{};]*ELITE_FROM[^\n{};]*\)\s*\{/g)||[];
 if(elite.length!==1)throw Error('Expected a unique original elite branch, got '+elite.length);
 normal=one(normal,elite[0],elite[0]+' e.pkmsvvPressureElite=true;');
 normal=one(normal,'    if (shiny) e.makeShiny();',`    if(pressureEnabled()){
      const m=pressureAt(t);
      scaleEnemy(e,{hp:m.hp*(e.pkmsvvPressureElite?1.4:1),dmg:m.dmg*(e.pkmsvvPressureElite?1.2:1)});
    }
    if (shiny) e.makeShiny();`);
 s=s.slice(0,start)+normal+s.slice(end);
 s=one(s,'    if (rollShiny(b.dex)) e.makeShiny();',`    if(pressureEnabled()){
      scaleEnemy(e,bossPressure(Number.isFinite(b.at)?b.at:t));
      e.pkmsvvPressureBoss=true;
    }
    if (rollShiny(b.dex)) e.makeShiny();`);
 // Preserve the original export prefix consumed by patch-arena-v1529.cjs later in prepare-web.
 s=one(s,'  return { reset, update, ahead, burst, tickBanner, banner, say, rate, SHINY_RATE, CAP,','  return { reset, update, ahead, burst, tickBanner, banner, say, rate, SHINY_RATE, CAP,pressureAt,bossPressure,');
 // Authoritative normal-run bosses only. Host applies reduction once.
 e=one(e,'      this.stunT = Math.max(this.stunT || 0, dur);',
  '      this.stunT = Math.max(this.stunT || 0, dur * (this.pkmsvvPressureBoss ? .5 : 1));');
 e=one(e,'      this.slowT = Math.max(this.slowT, dur);',
  '      this.slowT = Math.max(this.slowT, dur * (this.pkmsvvPressureBoss ? .5 : 1));');
 e=one(e,'      this.sleepT = Math.max(this.sleepT || 0, Math.max(0, dur));',
  '      this.sleepT = Math.max(this.sleepT || 0, Math.max(0, dur) * (this.pkmsvvPressureBoss ? .5 : 1));');
 fs.writeFileSync(file,s);fs.writeFileSync(enemy,e);
 console.log('PKMSVV_NATIVE_PASSIVE_PRESSURE_QA_READY: no extra enemies or reward changes');
}
if(require.main===module)install();
module.exports={pressureAt,bossPressure,scaleEnemy,install};
