'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),base=path.join(root,'vendor','pokesurvivor');
function patch(file,from,to){
 const p=path.join(base,file),s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 const parts=s.split(from);
 if(parts.length!==2)throw Error('Retro UI source drift: '+file+' / '+from.slice(0,70));
 fs.writeFileSync(p,parts.join(to),'utf8');
}
const section=[
 '<section id="scr-upgrade-select" class="scr dim hidden">',
 ' <div class="box pkmsvv-chooser">',
 '  <div class="row between"><h2 id="pkmsvv-upgrade-title">Chọn kiểu nâng cấp</h2><button id="pkmsvv-upgrade-back" type="button" class="btn small ghost">Trở về</button></div>',
 '  <p id="pkmsvv-upgrade-intro" class="pkmsvv-chooser-intro">Chọn loại nâng cấp trước khi dùng PokéCoins.</p>',
 '  <div class="pkmsvv-upgrade-grid">',
 '   <button id="pkmsvv-upgrade-single" class="pkmsvv-upgrade-tile" type="button"><span class="pkmsvv-chooser-icon" aria-hidden="true">⚡</span><strong id="pkmsvv-upgrade-single-title">Nâng lẻ Pokémon</strong><span id="pkmsvv-upgrade-single-desc">CHỈ áp dụng cho một Pokémon được chọn.</span></button>',
 '   <button id="pkmsvv-upgrade-all" class="pkmsvv-upgrade-tile" type="button"><span class="pkmsvv-chooser-icon" aria-hidden="true">🌟</span><strong id="pkmsvv-upgrade-all-title">Nâng toàn đội</strong><span id="pkmsvv-upgrade-all-desc">Áp dụng cho mọi Pokémon trong đội.</span></button>',
 '  </div><p id="pkmsvv-upgrade-hint" class="pkmsvv-chooser-hint">Các nâng cấp được lưu riêng biệt.</p>',
 ' </div>',
 '</section>'
].join('\n');
patch('dev.html','<!-- ====== Gacha ====== -->',section+'\n<!-- ====== Gacha ====== -->');
patch('dev.html','<script defer src="js/ui/menu.js"></script>','<script defer src="js/ui/menu.js"></script>\n<script defer src="js/ui/pkmsvv-upgrade-select.js"></script>');
patch('dev.html','    <div class="upg-head">','    <p class="pkmsvv-single-note" id="pkmsvv-single-note">CHỈ ÁP DỤNG CHO 1 POKÉMON ĐƯỢC CHỌN — không ảnh hưởng Pokémon khác.</p>\n    <div class="upg-head">');
patch('js/ui/menu.js',"else if (go === 'upgrades') openUpgrades();","else if (go === 'upgrades') G.PKMSVVUpgradeChooser.open();");
patch('js/ui/menu.js','return { init, open, GEN_NAMES };','return { init, open, openUpgrades, GEN_NAMES };');
for(const file of ['js/ui/ui.js','js/game.js'])
 patch(file,"'scr-upgrades', 'scr-global-powerups'","'scr-upgrades', 'scr-upgrade-select', 'scr-global-powerups'");
patch('dev.html','<button class="menu-item" data-go="global">Nâng cấp Toàn Đội<small>Vĩnh viễn cho mọi Pokémon</small></button>','<!-- Unified upgrade chooser handles team boosts. -->');
const icon=["online: { pal:{ b:'#27b6bb',w:'#f2ffff',y:'#ffda39' }, rows:[",
 "'....kkkk....','..kkbbbbkk..','.kbwbbbbwbk.','kbwbbkkbbwbk','kbbbbkkbbbbk','kbbbbbbbbbbk',",
 "'kbbbyyyybbbk','kbbbbbbbbbbk','kbwbbkkbbwbk','.kbwbbbbwbk.','..kkbbbbkk..','....kkkk....'] },",
 "    "].join('\n');
patch('js/ui/icons.js','    friends: { pal:','    '+icon+'friends: { pal:');
fs.copyFileSync(path.join(root,'src','pkmsvv-upgrade-select.js'),path.join(base,'js','ui','pkmsvv-upgrade-select.js'));
fs.appendFileSync(path.join(base,'css','style.css'),'\n'+fs.readFileSync(path.join(root,'src','pkmsvv-retro-theme.css'),'utf8')+'\n');
console.log('Retro UI, high contrast and one Upgrade menu installed');
