'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const load=f=>fs.readFileSync(path.join(root,'vendor','pokesurvivor',f),'utf8');
test('A on a Pokémon tile arms Start; Start auto-saves and enters with selected Pokémon',()=>{
 const f=path.join(root,'vendor/pokesurvivor/js/ui/pkmsvv-pad-flow.js');
 if(!fs.existsSync(f))return;
 let commits=0;
 const ctx={G:{DB:{commit:()=>{commits++;return true;}}}};
 vm.runInNewContext(fs.readFileSync(f,'utf8'),ctx);
 const p=ctx.G.PKMSVVPadFlow;
 const save={partner:25,partnerShiny:false,owned:{25:{},1:{}},shiny:{1:{}}};
 assert.equal(p.consumeSelected(save),false,'Opening the Pokédex never auto-starts a run');
 p.select(1,false);
 assert.equal(p.consumeSelected(save),true,'A on an owned tile is enough; no second confirm required');
 assert.equal(save.partner,1);assert.equal(save.partnerShiny,false);
 assert.equal(commits,1);
 assert.equal(p.consumeSelected(save),false,'Already consumed Start must not fire twice');
 p.select(1,true);
 assert.equal(p.consumeSelected(save),true);
 assert.equal(save.partnerShiny,true,'The Pokémon can be played in owned Shiny form');
 p.select(25,true);
 assert.equal(p.consumeSelected(save),true);
 assert.equal(save.partner,25);
 assert.equal(save.partnerShiny,false,'Do not enable a Shiny the player does not own');
 p.select(1);p.updateVariant(1,true);p.consumeSelected(save);
 assert.equal(save.partnerShiny,true,'Switching Normal/Shiny before Start updates the pending pick');
 p.select(1);p.reset();
 assert.equal(p.consumeSelected(save),false,'Leaving the Pokédex must disarm Start');
 p.select(1);delete save.owned[1];
 assert.equal(p.consumeSelected(save),false,'Locked Pokémon cannot start a run');
});
test('Gacha result overlay is recognized by pad navigation and A can press continue',()=>{
 const dir=path.join(root,'vendor','pokesurvivor');
 if(!fs.existsSync(path.join(dir,'index.html')))return;
 const listeners={};
 function classList(names=[]){const set=new Set(names);return{
  contains:n=>set.has(n),add:n=>set.add(n),remove:n=>set.delete(n)};
 }
 const btn={id:'pull-close',disabled:false,isConnected:true,classList:classList(['btn']),
  textContent:'Continuar',getBoundingClientRect(){return{left:300,top:200,width:120,height:40,right:420,bottom:240};},
  matches:s=>s==='button'||s==='select'||s==='input'||s==='.play, .btn.gold, .card'?s==='button':s.includes('button'),
  contains:el=>el===btn,hasAttribute:()=>false,click(){this.clicked=(this.clicked||0)+1},
  scrollIntoView(){}};
 const fx={id:'pull-fx',classList:classList(),querySelectorAll:s=>s==='*'?[btn]:[btn]};
 const gacha={id:'scr-gacha',classList:classList(),querySelectorAll:()=>[]};
 let buttons=Array.from({length:16},()=>({pressed:false,value:0}));
 const mockPad={connected:true,id:'Test Controller',axes:[0,0,0,0],get buttons(){return buttons}};
 const context={G:{Settings:{get:()=>true},Game:{state:'ui'},DB:{save:{partner:25,owned:{25:{}}}},
     Flow:{play:()=>{}},Input:{virtual:()=>{}},UI:{},
      PKMSVVPadOrb:{bindings:()=>({dash:2,use:3,pause:9,confirm:0,back:1,reroll:3})}},
   innerWidth:900,innerHeight:600,
   navigator:{getGamepads:()=>[mockPad]},
   addEventListener:(n,cb)=>listeners[n]=cb,
   getComputedStyle:()=>({zIndex:'0',cursor:'auto'}),
   document:{getElementById:id=>id==='pull-fx'?fx:null,
     querySelectorAll:q=>q==='.scr:not(.hidden)'?[gacha]:[],
     elementFromPoint:()=>btn},
   setTimeout:()=>0,Event:function Event(name){this.type=name;},
   performance:{now:()=>0}};
 vm.runInNewContext(load('js/core/gamepad.js'),context);
 assert.equal(context.G.Pad.focusElement(btn),true,'Continue must be in top navigation scope');
 buttons[0].pressed=true;context.G.Pad.poll(.016);
 assert.equal(btn.clicked,1,'A triggers Continue while results overlay is visible');
});
test('all related controller fixes are included in the compiled bundle',()=>{
 const dir=path.join(root,'vendor','pokesurvivor');
 if(!fs.existsSync(path.join(dir,'index.html')))return;
 const pad=load('js/core/gamepad.js'),menu=load('js/ui/menu.js'),evo=load('js/systems/pkmsvv-evolution.js'),gacha=load('js/ui/gacha-ui.js'),html=load('index.html');
 assert.match(pad,/getElementById\("pull-fx"\)/);
 assert.match(pad,/focusElement\(el\)/);
 assert.match(pad,/top\.id === 'scr-dex'/);
 assert.match(pad,/G\.PKMSVVPadFlow\.consumeSelected/);
 assert.match(gacha,/G\.Pad\.focusElement\(\$\('pull-close'\)\)/);
 assert.match(evo,/G\.Pad\.focusElement\(panel\.querySelector\('\.pkmsvv-evo-option'\)\)/);
 assert.match(menu,/G\.PKMSVVPadFlow\.select\(p\.dex,/);
 assert.match(menu,/G\.PKMSVVPadFlow\.updateVariant/);
 assert.match(html,/id="dex-play-now"/);
 assert.match(load('js/app.min.js'),/PKMSVVPadFlow|pkmsvv-pad-flow/);
});

const fsPkm=require('node:fs'),pathPkm=require('node:path');
test('keyboard skill card labels use a clear name while keeping physical bindings',()=>{
 const source=fsPkm.readFileSync(pathPkm.join(__dirname,'../scripts/patch-keybind-title.cjs'),'utf8');
 for(const n of [1,2,3]) assert.match(source,new RegExp("card"+n+":'Thẻ skill "+n+"'"));
 assert.doesNotMatch(source,/card1:'Lá bài 1'/);
 assert.match(source,/card1:'digit1'/);
});

test('v1.5 controller mapping saves six real actions, migrates old maps and rejects conflicts',()=>{
 const source=fs.readFileSync(path.join(root,'src/v14/pad-orb-map.js'),'utf8');
 const settings={};
 const G={I18n:{lang:'vi'},Input:{DEFAULT_KEYS:{up:'keyw',down:'keys',left:'keya',right:'keyd',dash:'keyf',pause:'keyp',orb:'digit5',reroll:'keyr',card1:'digit1',card2:'digit2',card3:'digit3'}},
  Settings:{get:k=>settings[k],set:(k,v)=>{settings[k]=v;}}};
 vm.runInNewContext(source,{G,Number,Set,Object});
 const map=G.PKMSVVPadOrb;
 assert.equal(map.describe('dash'),'X / □');
 assert.equal(map.describe('use'),'Y / △');
 assert.equal(map.describe('pause'),'Start / Options');
 assert.equal(map.describe('mega'),'LB / L1');
 assert.equal(map.bindings().mega,4,'Mega defaults to LB/L1');
 assert.equal(map.valid({dash:2,use:2}),false,'game actions must not collide');
 assert.equal(map.valid({dash:10,use:11}),true,'old two-key profiles still accepted');
 settings[map.KEY]={dash:10,use:11};
 assert.equal(map.bindings().dash,10);
 assert.equal(map.bindings().confirm,0,'legacy map gains default confirm');
 settings[map.KEY]={dash:10,use:11,confirm:1,back:1};
 assert.equal(map.bindings().confirm,0,'invalid profile falls back to safe defaults');
 assert.match(source,/data-control-tab="keyboard"/);
 assert.match(source,/data-control-tab="pad"/);
 assert.match(source,/keyboardDefaults/);
 assert.match(source,/G\.Settings\.set\('keys'/);
 assert.match(source,/G\.Settings\.set\(KEY/);
 assert.match(source,/pkmsvv-control-reset/);
 assert.doesNotMatch(source,/Không cần nút chuyển Orb/);
});

test('Orb 4 and Mega 5 remain remappable, with controller LB and touch Mega button',()=>{
 const keys=fs.readFileSync(path.join(root,'scripts/patch-keybind-title.cjs'),'utf8');
 const pad=fs.readFileSync(path.join(root,'scripts/patch-v14-gamepad-orbs.cjs'),'utf8');
 const mega=fs.readFileSync(path.join(root,'src/pkmsvv-mega-phase3.js'),'utf8');
 const lu=fs.readFileSync(path.join(root,'src/pkmsvv-mega-lucario.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'src/pkmsvv-mega-lucario.css'),'utf8');
 assert.match(keys,/mega:'digit5',orb:'digit4'/);
 assert.match(keys,/c==='digit4'\?'orb':c==='digit5'\?'mega'/);
 assert.match(pad,/orbital\.mega/);
 for(const source of [mega,lu]){
  assert.match(source,/G\.Input\?\.tap\?\.\('digit5'\)/);
  assert.match(source,/G\.Input\?\.tap\?\.\('pkmsvv-mega'\)/);
  assert.doesNotMatch(source,/event\.key.*!==.'m'/);
 }
 assert.match(css,/#pkmsvv-mega-champion-btn\.pkmsvv-mega-btn/);
 assert.match(css,/left:calc\(50% \+ 100px\)/);
 assert.match(css,/body\.touch/);
 assert.match(fs.readFileSync(path.join(root,'scripts/patch-v14-orb-fifo.cjs'),'utf8'),/G\.Input\.tap\('digit4'\)/);
});
test('legacy saved Orb 5 or old Orb 5 + Mega 4 are migrated safely, custom bindings survive',()=>{
 const source=fs.readFileSync(path.join(root,'src/v14/pad-orb-map.js'),'utf8');
 const settings={};
 const G={I18n:{lang:'vi'},Input:{DEFAULT_KEYS:{up:'keyw',down:'keys',left:'keya',right:'keyd',dash:'keyf',pause:'keyp',orb:'digit4',mega:'digit5',reroll:'keyr',card1:'digit1',card2:'digit2',card3:'digit3'}},
  Settings:{get:key=>settings[key],set:(key,value)=>{settings[key]=value}}};
 vm.runInNewContext(source,{G,Number,Set,Object});
 const panel=G.PKMSVVPadOrb;
 assert.equal(panel.keyboardBindings().orb,'digit4');
 assert.equal(panel.keyboardBindings().mega,'digit5');
 settings.keys={orb:'digit5',mega:'digit4',dash:'keyg'};
 assert.equal(panel.keyboardBindings().orb,'digit4');
 assert.equal(panel.keyboardBindings().mega,'digit5');
 assert.equal(panel.keyboardBindings().dash,'keyg');
 settings.keys={orb:'digit5',dash:'keyg'};
 assert.equal(panel.keyboardBindings().orb,'digit4');
 assert.equal(panel.keyboardBindings().mega,'digit5');
 settings.keys={orb:'digit7',mega:'digit6'};
 assert.equal(panel.keyboardBindings().orb,'digit7');
 assert.equal(panel.keyboardBindings().mega,'digit6');
});

