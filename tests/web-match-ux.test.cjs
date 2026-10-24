'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Co-op microphone and speaker controls appear only after battle starts',()=>{
 const source=read('src/web/pkmsvv-voice.js');
 assert.match(source,/G\.Coop&&G\.Coop\.active&&G\.Game/);
 assert.match(source,/G\.Game\.state!=='ui'/);
 assert.doesNotMatch(source,/G\.UI\.isOpen\('scr-lobby'\)/);
 assert.match(source,/if\(!allowed\(\)\|\|!activeView\(\)\)/);
});

test('run-only fullscreen rescue shows in match, never toggles out',async()=>{
 const source=read('src/pkmsvv-fullscreen-recover.js');
 const patch=read('scripts/patch-match-fullscreen.cjs');
 const prep=read('scripts/prepare-game.cjs');
 assert.match(prep,/patch-match-fullscreen\.cjs/);
 assert.match(patch,/js\/ui\/pkmsvv-fullscreen-recover\.js/);
 assert.match(patch,/pkmsvv-full-restore-coop/);
 assert.match(source,/toggle\(\{enabled:true\}\)/);
 const attrs={},nodes=[],cssClasses=new Set();
 let fullscreenRequests=0,nativeToggles=0,landscapeLocks=0,lastToast='';
 const btn=()=>nodes.find(n=>n.id==='pkmsvv-full-restore');
 const G={
  Game:{state:'ui',player:null},Coop:{active:false},I18n:{lang:'vi'},
  UI:{toast:s=>{lastToast=s;}}
 };
 const document={
  readyState:'complete',fullscreenElement:null,webkitFullscreenElement:null,
  addEventListener(){},body:{appendChild(el){nodes.push(el);}},
  createElement:()=>({hidden:false,disabled:false,setAttribute(k,v){attrs[k]=v;}}),
  documentElement:{classList:{toggle(k,b){if(b)cssClasses.add(k);else cssClasses.delete(k);}},
    requestFullscreen(){fullscreenRequests++;document.fullscreenElement={};return Promise.resolve();}}
 };
 const window={addEventListener(){},dispatchEvent(){}};
 const screen={orientation:{lock(){landscapeLocks++;return Promise.resolve();}}};
 vm.runInNewContext(source,{G,document,window,screen,setInterval(){},Promise,Event:function Event(){},console});
 assert.ok(btn());assert.equal(btn().hidden,true,'no button in the lobby');
 G.Game.player={};G.Game.state='playing';
 G.PKMSVVFullRestore.sync();
 assert.equal(btn().hidden,false,'recovery available inside any run');
 assert.match(attrs['aria-label'],/Khôi phục toàn màn hình/);
 await G.PKMSVVFullRestore.restore();
 assert.equal(fullscreenRequests,1);
 await G.PKMSVVFullRestore.restore();
 assert.equal(fullscreenRequests,1,'must NOT exit fullscreen when already fullscreen');
 G.Coop.active=true;G.PKMSVVFullRestore.sync();
 assert.ok(cssClasses.has('pkmsvv-full-restore-coop'),'button shifts beside team voice in Co-op');
 G.Game.state='over';G.PKMSVVFullRestore.sync();
 assert.equal(btn().hidden,true,'button disappears after ending a run');
 G.Game.state='playing';G.Coop.active=false;document.fullscreenElement=null;
 window.Capacitor={Plugins:{PKMSVVScreen:{toggle:async ({enabled})=>{nativeToggles++;assert.equal(enabled,true);}}}};
 G.PKMSVVFullRestore.sync();
 await G.PKMSVVFullRestore.restore();
 assert.equal(nativeToggles,1,'Android always re-asserts immersive mode after chat overlay');
 assert.equal(fullscreenRequests,1,'native Android should not use browser fullscreen');
 delete window.Capacitor;
 window.PKMSVVNative={isFullscreen:async()=>({fullscreen:true}),toggleFullscreen:async()=>{nativeToggles++;}};
 await G.PKMSVVFullRestore.restore();
 assert.equal(nativeToggles,1,'Windows fullscreen button must not toggle off');
 window.PKMSVVNative.isFullscreen=async()=>({fullscreen:false});
 await G.PKMSVVFullRestore.restore();
 assert.equal(nativeToggles,2,'Windows can restore from windowed mode');
 assert.equal(lastToast,'');
});

test('Pokédex shows a real concise bilingual Ability benefit in parentheses',()=>{
 const ui=read('src/kecleon/pkmsvv-kecleon-ui.js');
 const map=read('src/kecleon/pkmsvv-ability-text.js');
 const patch=read('scripts/patch-kecleon.cjs');
 assert.match(ui,/pkmk-ability-benefit/);
 assert.match(ui,/PKMSVVAbilityText\.summary/);
 assert.match(patch,/pkmsvv-ability-text\.js/);
 const G={};vm.runInNewContext(map,{G});
 const fx={plus:true};
 assert.match(G.PKMSVVAbilityText.summary('natural-cure',{types:['psychic','grass']},fx),/0,3% HP/);
 assert.match(G.PKMSVVAbilityText.summary('levitate',{types:['psychic']},{}),/dung nham/);
 assert.match(G.PKMSVVAbilityText.summary('static',{types:['electric']},{generic:true}),/Điện/);
 assert.match(G.PKMSVVAbilityText.summary('natural-cure',{types:['psychic']},fx,true),/0\.3% HP/);
});
