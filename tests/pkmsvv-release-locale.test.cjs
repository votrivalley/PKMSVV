'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const getHistory=()=>{
 const G={};vm.runInNewContext(read('src/pkmsvv-changelog-history.js'),{G});return G.CHANGELOG;
};
const localized=(pair,lang)=>pair[lang==='en'?1:0];
const vietnamese=/[ăâđêôơưĂÂĐÊÔƠƯ]/u;
test('What’s New is a single bilingual summary of all improvements since version 1.0',()=>{
 const items=getHistory();
 assert.equal(items.length,1,'no separate release-by-release articles');
 assert.equal(items[0].title[0],'Pokémon Chuyển Sinh');
 assert.equal(items[0].title[1],'Pokémon Reincarnation');
 assert.match(items[0].new[0][0],/Pokémon Sống Sót.*Pokémon Chuyển Sinh/);
 assert.match(items[0].new[0][0],/10 chương/);
 const allVi=JSON.stringify(items.map(v=>[v.new,v.chg,v.fix].flat().map(x=>x?.[0])));
 for(const name of ['Kecleon','Mega','Champion','Fusion','Berry','Tranh Trứng','Nature','Arceus']){
  assert.ok(allVi.includes(name),name+' missing from SVV-vs-original summary');
 }
 assert.doesNotMatch(JSON.stringify(items),/\bv1\.\d+(?:\.\d+)?\b/,'no per-patch version headings');
});

test('Every player-visible release note is a pair with correctly separated VI and English',()=>{
 const notes=getHistory();
 for(const entry of notes){
  for(const key of ['title','subtitle','credit']){
   if(!entry[key])continue;
   assert.equal(entry[key].length,2,key);
   assert.ok(entry[key].every(v=>typeof v==='string'&&v.trim()),key);
   assert.doesNotMatch(entry[key][1],vietnamese,'Vietnamese in English '+key);
  }
  for(const section of ['new','chg','fix']){
   for(const [i,pair] of (entry[section]||[]).entries()){
    assert.equal(pair.length,2,section+' '+i);
    assert.ok(pair.every(s=>typeof s==='string'&&s.trim()));
    assert.doesNotMatch(pair[1],vietnamese,'Vietnamese leaked to English '+section+' '+i);
   }
  }
 }
 assert.equal(localized(notes[0].subtitle,'vi').startsWith('Có gì mới'),true);
 assert.equal(localized(notes[0].subtitle,'en').startsWith('What’s New'),true);
});
test('Extra translations register in English ONLY; never overwrite Vietnamese strings',()=>{
 const calls=[];
 vm.runInNewContext(read('src/pkmsvv-ui-en-coverage.js'),{
  G:{I18n:{add:(dict,lang)=>calls.push({dict,lang})}}
 });
 assert.equal(calls.length,1);
 assert.equal(calls[0].lang,'en');
 const d=calls[0].dict;
 assert.ok(Object.keys(d).length>=135);
 assert.equal(d['Giải Cứu Berry'],'Berry Rescue');
 assert.equal(d['Chọn chế độ'],'Choose mode');
 assert.equal(d['Nhẹ Nhàng'],'Gentle');
 assert.equal(d['Hành Trình Vương Miện'],'Crown Journey');
 assert.equal(d['💻 PC · POKÉMON CHUYỂN SINH'],'💻 PC · POKÉMON REINCARNATION');
 const render=(key,lang)=>lang==='en'?(d[key]||key):key;
 for(const k of ['Giải Cứu Berry','Sống Sót','Đang tải trò chơi…','Nhẹ Nhàng','Pokémon Chuyển Sinh']){
  assert.equal(render(k,'vi'),k,'VI accent or copy changed: '+k);
  assert.notEqual(render(k,'en'),k,'missing English key '+k);
 }
});
test('Co-op, Arena and menu choose paired text at render time; no forced Vietnamese rewrite',()=>{
 const coop=read('src/shared/coop-unified.js'),
  champion=read('src/pkmsvv-champion-arena.js'),menu=read('scripts/patch-v15-menu-qa.cjs');
 assert.match(coop,/const L=\(vi,en\)=>window\.G\?\.I18n\?\.lang==='en'\?en:vi/);
 assert.match(coop,/englishModes/);
 assert.match(coop,/L\(title,englishModes\[id\]/);
 assert.match(coop,/L\(description,englishModes\[id\]/);
 assert.match(champion,/tr\('Chọn Solo hoặc Champion','Choose Solo or Champion'\)/);
 assert.match(menu,/english\?'Pokémon Reincarnation':'Pokémon Chuyển Sinh'/);
 assert.match(menu,/english\?'I woke up as a Pokémon':'Tỉnh giấc tôi thấy mình hóa Pokemon'/);
 assert.match(menu,/newsJs\.replaceAll\('Có gì mới: 1\.4','Có gì mới'\)/);
});
test('English-specific dictionary and consolidated changelog reach all three build paths',()=>{
 const prepare=read('scripts/prepare-game.cjs'),web=read('scripts/prepare-web.cjs');
 for(const filename of ['pkmsvv-ui-en-coverage.js','pkmsvv-changelog-history.js']){
  assert.ok(prepare.includes(filename),'missing shared asset '+filename);
 }
 assert.ok(web.includes('pkmsvv-changelog-history.js'),'Web needs the same public history');
 assert.match(prepare,/lang-vi\.js/);
 assert.match(prepare,/G\.I18n\.lang === 'vi' \? pair\[0\] : pair\[1\]/);
 const vendor=path.join(root,'vendor','pokesurvivor');
 if(!fs.existsSync(path.join(vendor,'index.html')))return;
 const html=read('vendor/pokesurvivor/dev.html'),
       news=read('vendor/pokesurvivor/js/data/changelog.js');
 assert.match(html,/js\/data\/pkmsvv-ui-en-coverage\.js/);
 assert.ok(news.includes("one continuous bilingual What's New entry"));
 let G={};
 vm.runInNewContext(news,{G});
 assert.equal(G.CHANGELOG[0].title[0],'Pokémon Chuyển Sinh');
 assert.equal(G.CHANGELOG.length,1);
});
test('The rendered What’s New dialog never translates an English entry through Vietnamese or vice versa',()=>{
 const vendor=path.join(root,'vendor','pokesurvivor/js/ui/news-ui.js');
 if(!fs.existsSync(vendor))return;
 const newsJs=fs.readFileSync(vendor,'utf8');
 for(const lang of ['vi','en']){
  const controls={};
  const element=id=>controls[id] ||= {id,innerHTML:'',scrollTop:0,classList:{toggle(){},add(){},remove(){}},onclick:null};
  const G={CHANGELOG:getHistory(),I18n:{lang,locale:lang==='vi'?'vi-VN':'en-GB'},
   UI:{$:element},Icons:{html:()=>''},T:x=>x};
  vm.runInNewContext(newsJs,{G,Date,localStorage:{getItem(){return null},setItem(){}}});
  G.NewsUI.init();G.NewsUI.open();
  const html=controls['news-body'].innerHTML;
  if(lang==='vi'){
   assert.match(html,/Pokémon Sống Sót.*Pokémon Chuyển Sinh/);
   assert.match(html,/Cửa hàng Kecleon/);
   assert.doesNotMatch(html,/From Pokémon Survival to Pokémon Reincarnation/);
  }else{
   assert.match(html,/Pokémon Survival.*Pokémon Reincarnation/);
   assert.match(html,/Kecleon Shop/);
   assert.doesNotMatch(html,/Pokémon Sống Sót chính thức/);
   assert.doesNotMatch(html,vietnamese);
  }
 }
});

test('Wi-Fi invitation, QR pairing and close buttons are fully bilingual without touching VI',()=>{
 const source=read('src/lan/wifi-ui.js');
 assert.match(source,/const L=\(vi,en\)=>window\.G\?\.I18n\?\.lang==='en'\?en:vi/);
 for(const [vi,en] of [
  ['Đóng','Close'],
  ['1. Tạo lời mời cho một bạn','1. Create an invitation for one friend'],
  ['2. Tạo phản hồi gửi lại Host','2. Create reply for Host'],
  ['3. Vào phòng','3. Join Room'],
  ['Không ghép nối được','Pairing failed'],
  ['Đang ghép nối với Host…','Pairing with Host…']
 ]){
  assert.ok(source.includes("L('"+vi+"','"+en+"')"),
   'Missing explicitly localized Wi-Fi action '+vi);
 }
 const qa=read('tests/coop-platform-browser.cjs');
 assert.match(qa,/\.pkmsvv-wifi-panel > button/);
 assert.doesNotMatch(qa,/filter\(\{hasText:'Đóng'\}\)/);
});

test('LAN PC guide and Web Preview/backup retain original Vietnamese while supplying English',()=>{
 const lan=read('src/lan/lan-compact-ui.js'),web=read('src/shared/local-shell.js');
 for(const source of [lan,web])assert.match(source,/const L=\(vi,en\)=>window\.G\?\.I18n\?\.lang==='en'\?en:vi/);
 assert.match(lan,/L\('ⓘ Hướng dẫn kết nối Co-op LAN','ⓘ Co-op LAN connection guide'\)/);
 assert.match(lan,/LAN không cần Google\/Firebase/);
 assert.match(lan,/LAN does not require Google or Firebase/);
 assert.match(web,/Preview website has a DIFFERENT save/);
 assert.match(web,/save của nó KHÔNG chung/);
 assert.match(web,/L\('Đóng','Close'\)/);
});
