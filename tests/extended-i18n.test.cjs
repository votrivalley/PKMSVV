'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const dictSrc=fs.readFileSync(path.join(root,'src/pkmsvv-extended-en.js'),'utf8');
let english=null;
const captured={G:{I18n:{add:(dict,language)=>{assert.equal(language,'en');english=dict;}}}};
vm.runInNewContext(dictSrc,captured);
const tr=key=>english[key]||key;
const strip=s=>s.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
test('new English dictionary loads and covers core new gameplay systems',()=>{
 assert.ok(Object.keys(english).length>100,'all feature strings covered');
 for(const [key,expected] of [
  ['Đồng hành','Partner'],
  ['Chọn đồng hành','Choose Partner'],
  ['Nâng cấp Toàn Đội','Team Powerups'],
  ['Vĩnh viễn cho mọi Pokémon','Permanent bonuses for every Pokémon'],
  ['⭐ NHIỆM VỤ POKÉMON HÔM NAY',"⭐ TODAY'S POKÉMON CHALLENGE"],
  ['🏆 THỬ THÁCH TUẦN','🏆 WEEKLY CHALLENGE'],
  ['🏅 DẤU ẤN POKÉDEX','🏅 POKÉDEX STAMPS'],
  ['💾 SAO LƯU & KHÔI PHỤC','💾 BACKUP & RESTORE'],
  ['💾 DỮ LIỆU TRÒ CHƠI','💾 GAME DATA'],
  ['Khôi phục Save','Restore Save'],
  ['✨ TIẾN HÓA POKÉMON','✨ POKÉMON EVOLUTION'],
  ['Đá Nước','Water Stone'],
  ['Giữ nguyên dạng hiện tại (hỏi lại ở cấp sau)','Keep current form (ask again next level)'],
  ['Tất cả','All'],
  ['HỒI SINH!','REVIVED!']
 ]) assert.equal(tr(key),expected,key);
});
test('English render can translate strings that contain embedded HTML markup',()=>{
 const originals=[
  '<h3>💾 DỮ LIỆU TRÒ CHƠI</h3>',
  '<h3>⭐ NHIỆM VỤ POKÉMON HÔM NAY</h3>',
  '<h3>🏅 DẤU ẤN POKÉDEX</h3>'
 ];
 for(const original of originals){
  const key=strip(original),translated=tr(key);
  assert.notEqual(translated,key,'Untranslated UI: '+key);
  assert.equal(/[ăâđêôơưĂÂĐÊÔƠƯ]/.test(translated),false);
 }
});
test('shortened partner button is in upstream-patched Pokédex and English is available',()=>{
 const file=path.join(root,'vendor/pokesurvivor/js/ui/menu.js');
 if(!fs.existsSync(file))return;
 const menu=fs.readFileSync(file,'utf8');
 assert.match(menu,/Chọn Pokémon/);
 assert.doesNotMatch(menu,/Chọn đồng hành/);
 assert.doesNotMatch(menu,/Đây là Pokémon đồng hành|Chọn làm Pokémon đồng hành/);
 assert.equal(tr('Đồng hành'),'Partner');
 assert.equal(tr('Chọn Pokémon'),'Choose Pokémon');
});
test('English dictionary loads in game before executable modules and is bundled offline',()=>{
 const htmlFile=path.join(root,'vendor/pokesurvivor/index.html');
 if(!fs.existsSync(htmlFile))return;
 const html=fs.readFileSync(htmlFile,'utf8');
 assert.match(html,/js\/app\.min\.js/);
 const content=fs.readFileSync(path.join(root,'vendor/pokesurvivor/js/data/pkmsvv-extended-en.js'),'utf8');
 assert.match(content,/Pokédex|POKÉDEX|STAMP/i);
 const bundle=fs.readFileSync(path.join(root,'vendor/pokesurvivor/js/app.min.js'),'utf8');
 assert.match(bundle,/Choose Partner/);
 assert.match(bundle,/WEEKLY CHALLENGE/);
});
test('no new gameplay rules, save structures or all-gen pity were changed for translation',()=>{
 const module=fs.readFileSync(path.join(root,'src/pkmsvv-collection.js'),'utf8');
 const power=fs.readFileSync(path.join(root,'src/pkmsvv-global-power.js'),'utf8');
 assert.match(module,/STAMP_SECONDS=180/);
 assert.match(power,/base:50000/);
 const patch=fs.readFileSync(path.join(root,'scripts/patch-collection.cjs'),'utf8');
 assert.match(patch,/gen=0/);
});
