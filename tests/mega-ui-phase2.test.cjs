'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const cat=JSON.parse(read('data/mega-source-catalog.json'));
test('Phase 2 offline Mega registry has exactly 96 stable forms and 36 art candidates',()=>{
 const file=path.join(root,'vendor','pokesurvivor','js','data','pkmsvv-mega-catalog.js');
 const g={};vm.runInNewContext(fs.readFileSync(file,'utf8'),{G:g});
 assert.equal(g.PKMSVV_MEGA_CATALOG.length,96);
 assert.equal(g.PKMSVV_MEGA_CATALOG.filter(f=>f.artReady).length,36);
 assert.equal(new Set(g.PKMSVV_MEGA_CATALOG.map(f=>f.key)).size,96);
 assert.equal(g.PKMSVV_MEGA_CATALOG.find(f=>f.key==='lucariomega').spriteId,10448);
 assert.equal(g.PKMSVV_MEGA_CATALOG.find(f=>f.key==='rayquazamega').stone,null);
 assert.equal(g.PKMSVV_MEGA_CATALOG.find(f=>f.key==='rayquazamega').storyLocked,true);
 assert.equal(g.PKMSVV_MEGA_CATALOG.length,cat.forms.length);
 const html=read('vendor/pokesurvivor/dev.html');
 assert.ok(html.indexOf('js/data/pkmsvv-mega-catalog.js')<html.indexOf('js/ui/pkmsvv-mega-entry.js'));
 const style=read('vendor/pokesurvivor/css/style.css');
 assert.match(style,/\.pkmsvv-mega-cell\.is-locked/);
 assert.match(style,/filter:brightness\(0\)/);
});
function fake(){
 const elements=new Map(),events={};
 function node(tag='div'){
  const handlers={},el={tagName:tag.toUpperCase(),children:[],attributes:{},hidden:false,
   id:'',className:'',textContent:'',parentElement:null,nextSibling:null,disabled:false,
   addEventListener:(n,f)=>handlers[n]=f,
   setAttribute:(n,v)=>el.attributes[n]=v,
   focus:()=>{el.focused=true},
   append(...items){for(const x of items){x.parentElement=el;el.children.push(x);if(x.id)elements.set(x.id,x);}
    for(let i=0;i<el.children.length;i++)el.children[i].nextSibling=el.children[i+1]||null;},
   replaceChildren(...items){el.children=[];el.append(...items);},
   insertBefore(x,b){const old=el.children.indexOf(x);if(old>=0)el.children.splice(old,1);
    let at=el.children.indexOf(b);if(at<0)at=el.children.length;
    el.children.splice(at,0,x);x.parentElement=el;if(x.id)elements.set(x.id,x);
    for(let i=0;i<el.children.length;i++)el.children[i].nextSibling=el.children[i+1]||null;},
   querySelector:(q)=>{
    if(q==='[data-mega-close]')return find(el,v=>v.attributes['data-mega-close']!==undefined);
    if(q.startsWith('[data-mega-filter='))return find(el,v=>v.attributes['data-mega-filter']===q.match(/"([^"]+)"/)?.[1]);
    return null;
   },
   click:()=>handlers.click?.({target:el})
  };return el;
 }
 function find(el,test){if(test(el))return el;for(const c of el.children){const f=find(c,test);if(f)return f;}return null;}
 const title=node('h2'),support=node('button'),back=node('button'),header=node();
 title.id='pkmsvv-upgrade-title';support.id='pkmsvv-support-entry';back.id='pkmsvv-upgrade-back';
 header.append(title,support,back);
 const body=node('body');
 const document={readyState:'complete',body,createElement:node,getElementById:id=>elements.get(id)||null,
  addEventListener:(n,cb)=>events[n]=cb};
 const g={SPRITE_META:{},I18n:{lang:'vi'},DB:{save:{megaStones:{},pkmsvvChapter7Seen:true}},
  PKMSVVSupportCatalog:{ensure(){}},PKMSVVUpgradeChooser:{open(){return 17;}}};
 vm.runInNewContext(read('vendor/pokesurvivor/js/data/pkmsvv-mega-catalog.js'),{G:g});
 // Fake the 36 audited PC candidate sprites, never unreleased future forms.
 for(const f of g.PKMSVV_MEGA_CATALOG)if(f.artReady)
  g.SPRITE_META[f.spriteId]={a:{Idle:{}},sh:true,sa:{Idle:{}}};
 let spriteCount=0,draws=[];
 g.UI={spriteCanvas:(dex,w,h,o)=>{spriteCount++;draws.push({dex,opts:o});return node('canvas');}};
 vm.runInNewContext(read('src/pkmsvv-mega-entry.js'),{G:g,document});
 return {g,header,events,get:id=>elements.get(id),draws,drawCount:()=>spriteCount};
}
test('Mega UI paginates only real local sprites, hides locked identities, and does not edit save',()=>{
 const h=fake(),ui=h.g.PKMSVVMegaEntry,before=JSON.stringify(h.g.DB.save);
 assert.deepEqual(h.header.children.map(x=>x.id),['pkmsvv-upgrade-title','pkmsvv-support-entry','pkmsvv-mega-entry','pkmsvv-upgrade-back']);
 assert.equal(ui.open(),true);
 assert.equal(h.get('pkmsvv-mega-grid').children.length,12);
 assert.equal(h.get('pkmsvv-mega-count').textContent,'Đã mở: 0/36 · Có sprite');
 assert.equal(h.get('pkmsvv-mega-page').textContent,'Trang 1/3');
 assert.equal(ui.available().length,36,'60 unreleased forms stay hidden');
 assert.equal(h.get('pkmsvv-mega-grid').children[0].children[1].textContent,'???');
 assert.equal(h.get('pkmsvv-mega-detail').children[0].textContent,'???');
 assert.ok(h.drawCount()<=13,'too many live canvases on page');
 assert.ok(h.draws.every(d=>d.opts.silhouette===true),'locked art must always be a silhouette');
 h.get('pkmsvv-mega-next').click();
 assert.equal(ui.page,1);assert.equal(h.get('pkmsvv-mega-grid').children.length,12);
 assert.equal(JSON.stringify(h.g.DB.save),before,'viewing may never mutate the save');
 ui.close();assert.equal(h.get('pkmsvv-mega-phase1').hidden,true);
});
test('Only real stone/form/story conditions unlock Mega; BETA does not count',()=>{
 const h=fake(),lib=h.g.PKMSVVMegaEntry,list=h.g.PKMSVV_MEGA_CATALOG;
 const lucario=list.find(f=>f.key==='lucariomega');
 const ray=list.find(f=>f.key==='rayquazamega');
 const magearna=list.find(f=>f.key==='magearnamega');
 assert.equal(lib.isUnlocked(lucario),false);
 h.g.MegaLucario={preview:true};assert.equal(lib.isUnlocked(lucario),false);
 h.g.DB.save.megaStones.lucarionite=true;
 assert.equal(lib.isUnlocked(lucario),true);
 h.g.DB.save.megaStones.magearnite=1;
 assert.equal(lib.isUnlocked(magearna),false,'shared stone must not reveal every form');
 h.g.DB.save.megaForms={magearnamega:true};
 assert.equal(lib.isUnlocked(magearna),false,'mythical Mega needs its story');
 h.g.DB.save.megaStoryCleared={magearnamega:true};
 assert.equal(lib.isUnlocked(magearna),true);
 assert.equal(lib.isUnlocked(ray),false);
 h.g.DB.save.megaStoryCleared.rayquazamega=true;
 assert.equal(lib.isUnlocked(ray),true);
 lib.open();assert.equal(h.get('pkmsvv-mega-count').textContent,'Đã mở: 2/36 · Có sprite');
 h.g.DB.save.megaStones.venusaurite=1;
 lib.render();
 assert.equal(lib.isUnlocked(list.find(f=>f.key==='venusaurmega')),true);
 assert.equal(lib.available().some(f=>f.key==='venusaurmega'),false,'unreleased Venusaur stays hidden despite unlocked save');
 assert.ok(h.get('pkmsvv-mega-grid').children.length>0);
});
test('UI has no save mutator, no remote image fetch, and retains Phase 1 colors',()=>{
 const ui=read('src/pkmsvv-mega-entry.js'),patch=read('scripts/patch-ui-phase2-mega.cjs');
 assert.doesNotMatch(ui,/G\.DB\.commit|localStorage|fetch\(|\.megaStones\s*=|\.megaStoryCleared\s*=/);
 assert.match(ui,/PAGE=12/);assert.match(ui,/spriteCanvas/);
 assert.match(patch,/pkmsvv-mega-phase2\.css/);
 assert.match(read('scripts/prepare-game.cjs'),/patch-ui-phase2-mega\.cjs/);
});

test('Normal/Shiny tabs reveal authentic Shiny only after real ownership and Mega unlock',()=>{
 const h=fake(),ui=h.g.PKMSVVMegaEntry;
 const lucario=h.g.PKMSVV_MEGA_CATALOG.find(f=>f.key==='lucariomega');
 h.g.DB.save.owned={448:{at:1}};
 h.g.DB.save.megaStones.lucarionite=1;
 h.g.DB.save.pkmsvvChapter3Seen=true;
 h.g.DB.save.shiny={448:{at:1,from:'gacha'}};
 h.g.SPRITE_META[10448]={a:{Idle:{}},sh:true,sa:{Idle:{}}};
 const saveBefore=JSON.stringify(h.g.DB.save);
 ui.open();
 assert.equal(h.get('pkmsvv-mega-tab-normal').textContent,'Thường');
 h.get('pkmsvv-mega-tab-shiny').click();
 assert.equal(ui.variant,'shiny');
 assert.equal(h.get('pkmsvv-mega-tab-shiny').attributes['aria-pressed'],'true');
 assert.equal(h.get('pkmsvv-mega-count').textContent,'Đã mở: 1/36 · Có sprite');
 const filter=h.get('pkmsvv-mega-roster').querySelector('[data-mega-filter="unlocked"]');
 filter.click();
 assert.equal(h.get('pkmsvv-mega-grid').children.length,1);
 assert.equal(h.get('pkmsvv-mega-grid').children[0].children[1].textContent,'Mega Lucario');
 assert.ok(h.draws.some(x=>x.dex===10448&&x.opts.shiny===true&&x.opts.silhouette!==true));
 assert.equal(JSON.stringify(h.g.DB.save),saveBefore,'Shiny UI is read-only');
 delete h.g.DB.save.shiny[448];
 ui.render();
 assert.equal(h.get('pkmsvv-mega-count').textContent,'Đã mở: 0/36 · Có sprite');
 assert.equal(h.get('pkmsvv-mega-grid').children.length,1,'empty text replaces missing cards');
 assert.equal(h.get('pkmsvv-mega-grid').children[0].className,'pkmsvv-mega-empty');
 assert.equal(ui.isUnlocked(lucario),true,'normal Mega unlock survives Shiny filtering');
 h.g.DB.save.shiny[448]={at:2};
 h.g.SPRITE_META[10448].sh=false;
 ui.render();
 assert.equal(h.get('pkmsvv-mega-grid').children.length,1,'missing Shiny art produces text, no card');
 assert.equal(h.get('pkmsvv-mega-grid').children[0].className,'pkmsvv-mega-empty');
 assert.equal(ui.available().some(f=>f.key==='lucariomega'),false,'Lucario missing Shiny sprite is hidden');
 h.get('pkmsvv-mega-tab-normal').click();
 assert.equal(ui.variant,'normal');
 assert.equal(h.get('pkmsvv-mega-count').textContent,'Đã mở: 1/36 · Có sprite');
});

test('All 96 Mega identities remain ??? before Chapter 7 regardless of stone ownership',()=>{
 const h=fake(),lib=h.g.PKMSVVMegaEntry;
 h.g.DB.save.megaStones.lucarionite=1;
 h.g.DB.save.pkmsvvChapter7Seen=false;
 lib.open();
 assert.equal(h.get('pkmsvv-mega-count').textContent,'Đã mở: 0/36 · Có sprite');
 assert.equal(lib.isUnlocked(h.g.PKMSVV_MEGA_CATALOG.find(f=>f.key==='lucariomega')),false);
});


test('full-save Mega Dragonite is hidden until its private PC QA sprite is imported',()=>{
 const h=fake(),ui=h.g.PKMSVVMegaEntry,save=h.g.DB.save;
 const dragonite=h.g.PKMSVV_MEGA_CATALOG.find(f=>f.key==='dragonitemega');
 assert.ok(dragonite,'Dragonite belongs to original 96-form catalog');
 assert.equal(dragonite.dex,149);
 assert.equal(dragonite.artReady,false,'public build lacks private QA art');
 save.owned={149:{at:1,from:'qa'}};
 save.megaStones.dragoninite=1;
 save.pkmsvvChapter3Seen=true;
 save.pkmsvvChapter7Seen=true;
 save.megaForms={dragonitemega:true};
 save.megaStoryCleared={dragonitemega:true};
 const original=JSON.stringify(save);
 assert.equal(ui.isUnlocked(dragonite),true,'full save was already unlocked');
 ui.open();
 h.get('pkmsvv-mega-roster').querySelector('[data-mega-filter="unlocked"]').click();
 assert.equal(h.get('pkmsvv-mega-count').textContent,'Đã mở: 0/36 · Có sprite');
 assert.equal(ui.available().some(f=>f.key==='dragonitemega'),false,'no blank Dragonite cell in normal build');
 assert.equal(h.get('pkmsvv-mega-grid').children[0].className,'pkmsvv-mega-empty');
 // Mimic actual QA build importer after validating eight original PA2.1 sheets.
 dragonite.artReady=true;dragonite.qa4dir=true;
 h.g.PKMSVV_MEGA_4DIR_QA={enabled:true,forms:['dragonitemega']};
 h.g.SPRITE_META[dragonite.spriteId]={a:{Idle:{}},sh:true,sa:{Idle:{}}};
 ui.render();
 assert.equal(h.get('pkmsvv-mega-count').textContent,'Đã mở: 1/37 · Có sprite');
 assert.equal(ui.available().some(f=>f.key==='dragonitemega'),true);
 const cards=h.get('pkmsvv-mega-grid').children;
 assert.equal(cards.length,1);
 assert.equal(cards[0].children.at(-2).textContent,'Mega Dragonite');
 assert.equal(cards[0].children.at(-1).textContent,'Đã mở');
 assert.equal(cards[0].className.includes('is-pending-art'),false);
 assert.equal(JSON.stringify(save),original,'sprite visibility never changes the QA save');
});
test('four imported PC QA Mega forms are visible and unimported ones do not occupy cells',()=>{
 const h=fake(),ui=h.g.PKMSVVMegaEntry;
 const names=['dragonitemega','scizormega','swampertmega','garchompmega'];
 for(const name of names){
  const f=h.g.PKMSVV_MEGA_CATALOG.find(x=>x.key===name);
  assert.equal(f.artReady,false);
  f.artReady=true;f.qa4dir=true;
  h.g.SPRITE_META[f.spriteId]={a:{Idle:{}},sh:true,sa:{Idle:{}}};
 }
 h.g.PKMSVV_MEGA_4DIR_QA={enabled:true,forms:names};
 h.g.PKMSVVMegaPhase3={isUnlocked:f=>f.qa4dir===true};
 ui.open();
 assert.equal(ui.available().length,40,'36 PC candidate sprites plus 4 QA-only previews');
 assert.equal(h.get('pkmsvv-mega-count').textContent,'Đã mở: 4/40 · Có sprite');
 const keys=ui.available().map(f=>f.key);
 for(const name of names)assert.ok(keys.includes(name));
 assert.equal(keys.includes('venusaurmega'),false);
 assert.equal(h.get('pkmsvv-mega-page').textContent,'Trang 1/4');
 h.get('pkmsvv-mega-tab-shiny').click();
 assert.equal(h.get('pkmsvv-mega-count').textContent,'Đã mở: 4/40 · Có sprite',
  'isolated QA should reveal both Normal and Shiny sheet even without Shiny save');
 const ready=h.g.PKMSVV_MEGA_CATALOG.filter(f=>names.includes(f.key));
 assert.ok(ready.every(f=>ui.isUnlocked(f)),'test QA preview forms can be inspected');
 assert.equal(h.g.DB.save.shiny,undefined,'QA browsing never grants a Shiny');
});
