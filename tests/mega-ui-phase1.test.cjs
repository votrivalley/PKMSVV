'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Phase 1 uses the shared preparation pipeline and loads Mega entry after Support',()=>{
 const prepare=read('scripts/prepare-game.cjs');
 assert.match(prepare,/patch-ui-phase1-mega\.cjs/);
 assert.ok(prepare.indexOf('patch-mega-lucario.cjs')<prepare.indexOf('patch-ui-phase1-mega.cjs'));
 const patch=read('scripts/patch-ui-phase1-mega.cjs');
 assert.match(patch,/pkmsvv-support-catalog\.js/);
 assert.match(patch,/pkmsvv-mega-entry\.js/);
 assert.match(patch,/pkmsvv-phase1-pastel\.css/);
 assert.doesNotMatch(patch,/core\/db\.js|save\.megaStones|packageName|android-signing/);
});
test('Mint/yellow navigation and upgrades keep dark undiscovered silhouettes',()=>{
 const css=read('src/pkmsvv-phase1-pastel.css');
 for(const token of ['#d9eae6','#ffe486','#173648',
  '#scr-menu.pkmsvv-v15-menu','.menu-list>.menu-item',
  '#scr-upgrade-select','#pkmsvv-support-entry',
  '#pkmsvv-mega-entry','.pkmsvv-support-cell.locked',
  '.pkmsvv-mega-phase1-locked','@media(max-width:730px)'])
  assert.ok(css.includes(token),token+' CSS missing');
 assert.match(css,/brightness\(0\)/);
 assert.match(css,/\.pkmsvv-mega-phase1-overlay\[hidden\]/);
 assert.doesNotMatch(css,/#scr-match|#hud|#scr-play/);
});
function mocked(){
 const elements=new Map();
 function node(tag='div'){
  const listeners={};
  const el={tagName:tag.toUpperCase(),children:[],attributes:{},hidden:false,
   parentElement:null,nextSibling:null,textContent:'',id:'',className:'',
   addEventListener:(name,fn)=>{listeners[name]=fn;},
   setAttribute:(name,value)=>{el.attributes[name]=value;},
   append(...nodes){for(const n of nodes){n.parentElement=el;el.children.push(n);if(n.id)elements.set(n.id,n);}return el;},
   insertBefore(n,next){const old=el.children.indexOf(n);if(old>=0)el.children.splice(old,1);
    let index=el.children.indexOf(next);if(index<0)index=el.children.length;
    el.children.splice(index,0,n);n.parentElement=el;if(n.id)elements.set(n.id,n);
    for(let i=0;i<el.children.length;i++)el.children[i].nextSibling=el.children[i+1]||null;
   },
   querySelector:selector=>selector==='[data-mega-close]'?findClose(el):null,
   focus(){el.focused=true},
   click:()=>listeners.click?.({target:el})
  };
  return el;
 }
 function findClose(root){
  if(root.attributes['data-mega-close']!==undefined)return root;
  for(const c of root.children){const f=findClose(c);if(f)return f;}
  return null;
 }
 const header=node(),title=node('h2'),support=node('button'),back=node('button');
 title.id='pkmsvv-upgrade-title';support.id='pkmsvv-support-entry';back.id='pkmsvv-upgrade-back';
 elements.set(title.id,title);elements.set(support.id,support);elements.set(back.id,back);
 header.append(title,support,back);
 const body=node('body');
 const docEvents={};
 const document={readyState:'complete',body,
  createElement:node,
  getElementById:id=>elements.get(id)||null,
  addEventListener:(name,fn)=>docEvents[name]=fn};
 let previousCalled=0;
 const G={I18n:{lang:'vi'},PKMSVVSupportCatalog:{ensure(){}},
  PKMSVVUpgradeChooser:{open(){previousCalled++;return 17;}}};
 vm.runInNewContext(read('src/pkmsvv-mega-entry.js'),{G,document});
 return {G,header,body,docEvents,get:id=>elements.get(id),prior:()=>previousCalled};
}
test('Mega button sits immediately after Support, opens and closes real dialog without save writes',()=>{
 const h=mocked();
 assert.deepEqual(h.header.children.map(x=>x.id),['pkmsvv-upgrade-title','pkmsvv-support-entry','pkmsvv-mega-entry','pkmsvv-upgrade-back']);
 assert.equal(h.prior(),0);
 assert.equal(h.G.PKMSVVUpgradeChooser.open(),17);
 assert.equal(h.prior(),1);
 assert.equal(h.header.children.filter(x=>x.id==='pkmsvv-mega-entry').length,1);
 assert.equal(h.get('pkmsvv-mega-entry').attributes['aria-haspopup'],'dialog');
 assert.equal(h.G.PKMSVVMegaEntry.open(),true);
 const overlay=h.get('pkmsvv-mega-phase1');
 assert.equal(overlay.hidden,false);
 assert.equal(h.get('pkmsvv-mega-phase1-lock').textContent,'Chưa mở khóa');
 assert.ok(overlay.children[0].children[1].children[0].textContent==='???');
 assert.equal(h.G.PKMSVVMegaEntry.close(),undefined);
 assert.equal(overlay.hidden,true);
 h.G.I18n.lang='en';h.G.PKMSVVUpgradeChooser.open();
 assert.match(h.get('pkmsvv-mega-entry').textContent,/Mega Evolution/);
 h.G.PKMSVVMegaEntry.open();
 assert.equal(h.get('pkmsvv-mega-phase1-lock').textContent,'Not unlocked');
 h.docEvents.keydown({key:'Escape',preventDefault(){},stopPropagation(){}});
 assert.equal(overlay.hidden,true);
});
test('compiled source has both functional buttons and late light palette',()=>{
 const base=path.join(root,'vendor','pokesurvivor');
 if(!fs.existsSync(path.join(base,'dev.html')))return;
 const html=fs.readFileSync(path.join(base,'dev.html'),'utf8');
 const css=fs.readFileSync(path.join(base,'css','style.css'),'utf8');
 const a=html.indexOf('js/ui/pkmsvv-support-catalog.js');
 const b=html.indexOf('js/ui/pkmsvv-mega-entry.js');
 assert.ok(a>=0&&b>a,'Mega entry must load after support catalogue');
 assert.ok(css.includes('.pkmsvv-mega-phase1-overlay[hidden]'));
});
