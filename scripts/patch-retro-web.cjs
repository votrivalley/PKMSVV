'use strict';
/* Web-only room cards and exact menu ordering, after dedicated hub patch. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),base=path.join(root,'vendor','pokesurvivor');
function patch(file,from,to){
 const p=path.join(base,file),s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 const parts=s.split(from);
 if(parts.length!==2)throw Error('Retro web changed anchor in '+file+': '+from.slice(0,90));
 fs.writeFileSync(p,parts.join(to),'utf8');
}
const old=[
 '  <h3>⚡ Chơi nhanh</h3><div class="row wrap pkmsvv-mp-actions">',
 '   <button class="btn gold" id="pkmsvv-quick-coop">🤝 Ghép Sống Sót</button>',
 '   <button class="btn gold" id="pkmsvv-quick-royale">🏆 Ghép Sống Còn</button>',
 '  </div>'
].join('\n');
const cards=[
 '  <h3>⚡ Chọn chế độ chơi nhanh</h3>',
 '  <div class="pkmsvv-mode-grid">',
 '   <button type="button" class="btn pkmsvv-mode-card coop" id="pkmsvv-quick-coop">',
 '    <span class="pkmsvv-mode-art"><canvas id="pkmsvv-mode-sprite-coop" width="144" height="144" aria-hidden="true"></canvas></span>',
 '    <span class="pkmsvv-mode-copy"><strong class="pkmsvv-mode-title">Sống Sót</strong><small class="pkmsvv-mode-cap">2–4 người</small><small class="pkmsvv-mode-description">Hợp tác chống quái, cứu đồng đội, cùng nhau vượt qua các đợt tấn công.</small><span class="pkmsvv-mode-action">▶ Chơi nhanh</span></span>',
 '   </button>',
 '   <button type="button" class="btn pkmsvv-mode-card royale" id="pkmsvv-quick-royale">',
 '    <span class="pkmsvv-mode-art"><canvas id="pkmsvv-mode-sprite-royale" width="144" height="144" aria-hidden="true"></canvas></span>',
 '    <span class="pkmsvv-mode-copy"><strong class="pkmsvv-mode-title">Sống Còn</strong><small class="pkmsvv-mode-cap">2–10 người · Beta</small><small class="pkmsvv-mode-description">Đấu loại. Bị hạ sẽ rời trận; người trụ lại cuối cùng chiến thắng.</small><span class="pkmsvv-mode-action">▶ Chơi nhanh</span></span>',
 '   </button>',
 '  </div>'
].join('\n');
patch('dev.html',old,cards);
const multiplayer='<button class="menu-item" data-go="multiplayer">Nhiều người chơi<small>Chơi nhanh · Phòng công khai · Riêng tư</small></button>';
const htmlPath=path.join(base,'dev.html');
let html=fs.readFileSync(htmlPath,'utf8').replace(/\r\n/g,'\n');
if(html.split(multiplayer).length!==2)throw Error('Expected exactly one multiplayer button');
html=html.replace(multiplayer,'');
const play='<button class="menu-item play" data-go="play">Jugar<small>Entra en la mazmorra</small></button>';
if(html.split(play).length!==2)throw Error('Play menu button moved unexpectedly');
html=html.replace(play,play+'\n        '+multiplayer.replace('Nhiều người chơi','Nhiều người'));
fs.writeFileSync(htmlPath,html);
patch('js/ui/menu.js',"multiplayer: 'friends'","multiplayer: 'online'");
fs.appendFileSync(path.join(base,'css','style.css'),'\n'+fs.readFileSync(path.join(root,'src','pkmsvv-retro-web.css'),'utf8')+'\n');
console.log('Web retro mode cards installed, Nhiều người chơi immediately below Chơi ngay');
