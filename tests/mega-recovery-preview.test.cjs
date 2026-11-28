'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {selected,html}=require('../scripts/build-mega-recovery-preview.cjs');
test('preview allowlist has only five credited exact SpriteCollab forms; no derived or unverified Web assets',()=>{assert.deepEqual(selected().map(x=>x.key).sort(),['hawluchamega','sceptilemega','scraftymega','sharpedomega','slowbromega']);assert.ok(selected().every(f=>f.gameplayReady===false));});
test('read-only preview registry cannot unlock Mega battle art',()=>{
 const f={key:'slowbromega',spriteId:10080,dex:80,artReady:false},G={PKMSVV_MEGA_CATALOG:[f],SPRITE_META:{10080:{a:{Idle:{}},sa:{Idle:{}},sh:true}}};
 const src=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-mega-entry.js'),'utf8');
 vm.runInNewContext(src,{G,document:{readyState:'loading',addEventListener(){}}});assert.equal(G.PKMSVVMegaEntry.hasSprite(f,'normal'),false);
 G.PKMSVV_MEGA_RECOVERY_PREVIEW={slowbromega:{spriteId:10080}};assert.equal(G.PKMSVVMegaEntry.hasSprite(f,'normal'),true);assert.equal(G.PKMSVVMegaEntry.hasSprite(f,'shiny'),true);assert.equal(f.artReady,false);
});

test('private recovery combat requires explicit flag, correct form, real sheets, solo and ordinary unlocks',()=>{
 const m=Object.fromEntries(['Idle','Walk','Attack','Shoot','Charge','Hurt','Faint'].map(k=>[k,{r:8}]));
 const f={key:'slowbromega',dex:80,spriteId:10080,artReady:false,stoneKey:'slowbronite',stats:{atk:75,def:180,spa:130,spd:80,spe:30}};
 const p={dex:80,dead:false,shiny:false,_megaEnergy:100,mon:{pa:1,sa:1,df:110,sd:80,spd:100},baseAtk:1,baseSpd:100,cdMul:1,moves:[],anim:{dir:0}};
 const G={Game:{player:p,state:'playing'},PKMSVVQuickRegion:{active:true},Coop:{active:false},DB:{save:{owned:{80:{at:1}},megaStones:{slowbronite:1},pkmsvvChapter3Seen:true,pkmsvvChapter7Seen:true}},PKMSVV_MEGA_CATALOG:[f],SPRITE_META:{10080:{a:m,sh:true,sa:m}},PKMSVV_MEGA_RECOVERY_PREVIEW:{slowbromega:{source:'spritecollab',spriteId:10080,distinctCore:true}},Sprites:{Animator:class{constructor(dex,scale,shiny){this.dex=dex;this.scale=scale;this.shiny=shiny;}},playerScale:()=>1,playerRadius:()=>18,bodyHeight:()=>36,hasShiny:()=>true}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/pkmsvv-mega-phase3.js'),'utf8'),{G,document:{readyState:'loading',addEventListener(){}},setInterval(){}});
 const api=G.PKMSVVMegaPhase3;assert.equal(api.canActivate(p),false);G.PKMSVV_MEGA_RECOVERY_BATTLE_QA=true;
 assert.equal(api.canActivate(p),true);assert.equal(f.artReady,false);delete G.DB.save.megaStones.slowbronite;assert.equal(api.canActivate(p),false);G.DB.save.megaStones.slowbronite=1;
 G.Coop.active=true;assert.equal(api.canActivate(p),false);G.Coop.active=false;G.PKMSVVArenaSolo={active:true};assert.equal(api.canActivate(p),false);G.PKMSVVArenaSolo.active=false;
 p.shiny=true;G.Sprites.hasShiny=()=>false;assert.equal(api.canActivate(p),false);G.Sprites.hasShiny=()=>true;
 assert.equal(api.activate(p),true);assert.equal(p.anim.dex,10080);assert.ok(Math.abs(p.mon.sa-1.3)<1e-9);assert.equal(p.cdMul,.7);
 const remaining=p._megaRemaining;G.Game.state='paused';api.tick(p,10);assert.equal(p._megaActive,true);assert.equal(p._megaRemaining,remaining);assert.equal(api.canActivate(p),false);
 G.Game.state='levelup';api.tick(p,10);assert.equal(p._megaRemaining,remaining);
 G.Game.state='playing';api.tick(p,1);assert.equal(p._megaRemaining,remaining-1);
 G.Coop.active=true;api.tick(p,.1);assert.equal(p._megaActive,false);assert.equal(p.anim.dex,80);assert.equal(p.cdMul,1);
});
