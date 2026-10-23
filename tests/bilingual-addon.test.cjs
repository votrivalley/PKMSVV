'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function englishDict(lang){
 const adds=[],G={I18n:{lang,add:(d,l)=>adds.push({d,l})}};
 vm.runInNewContext(read('src/pkmsvv-extended-en.js'),{G});
 return adds;
}
test('VI never registers English addon fallback; English still registers every translation',()=>{
 assert.equal(englishDict('vi').length,0,'Vietnamese must not inherit add-on English fragments');
 const en=englishDict('en');
 assert.equal(en.length,1);assert.equal(en[0].l,'en');
 assert.equal(en[0].d['Nâng cấp Toàn Đội'],'Team Powerups');
 assert.equal(en[0].d['Đồng hành'],'Partner');
});
function fakeDocument(){
 let last=null;
 const document={
   createElement(){
     const parts={};
     const el={className:'',attributes:{},innerHTML:'',setAttribute(k,v){this.attributes[k]=v;},
       querySelector(q){return parts[q] ||= {onclick:null,onchange:null,files:null,value:'',textContent:'',click(){}};},
       querySelectorAll(){return [];}};
     last=el;
     return el;
   }
 };
 return {document,latest:()=>last};
}
function runSave(lang){
 const {document,latest}=fakeDocument();
 const G={I18n:{lang,t:s=>s},DB:{save:{},guest:false,commit:()=>true},Icons:{html:()=>'<i></i>'}};
 const context={G,Date,JSON,Error,Number,window:{},document,localStorage:{getItem:()=>null}};
 vm.runInNewContext(read('src/pkmsvv-save-ui.js'),context);
 const box={node:null,querySelector:()=>null,appendChild(el){this.node=el;}};
 G.PKMSVVSaveUI.mount(box);
 return box.node;
}
test('Save UI renders VI-only and EN-only complete sentences (including bold warning)',()=>{
 const vi=runSave('vi'),en=runSave('en');
 assert.equal(vi.attributes.translate,'no');assert.equal(en.attributes.translate,'no');
 assert.match(vi.innerHTML,/💾 DỮ LIỆU TRÒ CHƠI/);
 assert.match(vi.innerHTML,/Hãy <b>xuất file<\/b> và lưu ngoài app/);
 assert.match(vi.innerHTML,/Sao lưu Save/);
 assert.doesNotMatch(vi.innerHTML,/Uninstalling|Export Save|Restore Save|GAME DATA/);
 assert.match(en.innerHTML,/💾 GAME DATA/);
 assert.match(en.innerHTML,/Uninstalling the Android app deletes its stored save/);
 assert.match(en.innerHTML,/<b>Export a backup<\/b> to a location outside the app/);
 assert.match(en.innerHTML,/Export Save/);
 assert.match(en.innerHTML,/Restore Save/);
 assert.doesNotMatch(en.innerHTML,/Hãy|Gỡ ứng dụng|Khôi phục|xuất file|nâng cấp/);
});
function runMissions(lang){
 const {document}=fakeDocument();
 const save={pkmDaily:{dex:25,complete:true,claimed:false},
   pkmWeekly:{dexes:[25],done:[25],claimed:false},pkmStamps:{25:123},pkmMilestones:{}};
 const G={
   I18n:{lang},DB:{save,commit:()=>true},
   DEX:[{dex:25,name:'Pikachu'}],DEX_BY:{25:{name:'Pikachu'}},SPRITE_META:{25:{}},
   PKMSVVCollect:{ensure(){},checkCollection:()=>false,stampsCount:()=>1},
   Audio:{sfx(){}},UI:{toast(){},refreshCoins(){}},MenuUI:{open(){}}
 };
 vm.runInNewContext(read('src/pkmsvv-collection-ui.js'),{G,document,Number,String});
 const box={child:null,appendChild(x){this.child=x;}};
 G.PKMSVVCollectUI.render(box);
 return box.child;
}
test('Pokémon missions and stamp screens contain one complete selected language',()=>{
 const vi=runMissions('vi'),en=runMissions('en');
 assert.equal(vi.attributes.translate,'no');
 assert.match(vi.innerHTML,/NHIỆM VỤ POKÉMON HÔM NAY/);
 assert.match(vi.innerHTML,/THỬ THÁCH TUẦN/);
 assert.match(vi.innerHTML,/DẤU ẤN POKÉDEX/);
 assert.match(vi.innerHTML,/Chọn Pokémon/);
 assert.doesNotMatch(vi.innerHTML,/TODAY'S POKÉMON CHALLENGE|WEEKLY CHALLENGE|Choose Pokémon/);
 assert.equal(en.attributes.translate,'no');
 assert.match(en.innerHTML,/TODAY'S POKÉMON CHALLENGE/);
 assert.match(en.innerHTML,/WEEKLY CHALLENGE/);
 assert.match(en.innerHTML,/POKÉDEX STAMPS/);
 assert.match(en.innerHTML,/Choose Pokémon/);
 assert.doesNotMatch(en.innerHTML,/NHIỆM VỤ|Chưa hoàn thành|Chọn Pokémon|Dấu Ấn/);
});
test('Settings no longer mount duplicate backup; topbar Save remains available',()=>{
 const src=read('scripts/patch-collection.cjs');
 assert.doesNotMatch(src,/patch\('js\/ui\/settings-ui\.js'/);
 const quick=read('src/pkmsvv-save-ui.js');
 assert.match(quick,/function initQuick/);
 const base=path.join(root,'vendor/pokesurvivor');
 if(!fs.existsSync(path.join(base,'index.html')))return;
 const ui=read('vendor/pokesurvivor/js/ui/settings-ui.js');
 assert.doesNotMatch(ui,/G\.PKMSVVSaveUI\.mount/);
 assert.match(read('vendor/pokesurvivor/index.html'),/btn-backup/);
});
test('v1.1 approved release notes are preserved unmodified',()=>{
 const notes=read('src/pkmsvv-changelog-v11.js');
 assert.match(notes,/15 Nâng cấp Toàn Đội/);
 assert.match(notes,/15 Team Powerups/);
 assert.match(notes,/G\.CHANGELOG = \[\{/);
});
