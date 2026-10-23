'use strict';
/* Native-only mode choice. Google uses our hosted Web app in the OS browser. */
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(file,before,after){
 const f=path.join(game,file),src=fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n');
 if(src.split(before).length!==2)throw Error('Native online entry anchor drift: '+file);
 fs.writeFileSync(f,src.replace(before,after),'utf8');
}
const entry=[
 '<section id="pkmsvv-native-choice" class="pkmsvv-native-choice" role="dialog" aria-modal="true" aria-label="Chọn cách chơi">',
 ' <div class="pkmsvv-native-choice-panel">',
 '  <h2>Pokémon Sống Sót</h2><p>Chọn cách chơi của bạn</p>',
 '  <button type="button" id="pkmsvv-native-offline" class="btn gold">🎮 Chơi offline trên thiết bị</button>',
 '  <button type="button" id="pkmsvv-native-google" class="btn">🌐 Mở Web Online (trình duyệt)</button>',
 '  <small>Tính năng đăng nhập Google ngay trong ứng dụng chưa có. Nút Web Online mở trình duyệt ngoài; save offline trong ứng dụng KHÔNG đồng bộ với Google.</small>',
 ' </div>',
 '</section>'
].join('\n');
patch('dev.html','<!-- ====== Inicio: login / registro / invitado ====== -->',
 entry+'\n<!-- ====== Inicio: login / registro / invitado ====== -->');
patch('dev.html','<script defer src="js/ui/login.js"></script>',
 '<script defer src="js/ui/login.js"></script>\n<script defer src="js/ui/pkmsvv-native-choice.js"></script>');
patch('dev.html','        <button class="menu-item play" data-go="play">Jugar<small>Entra en la mazmorra</small></button>',
 '        <button class="menu-item play" data-go="play">Jugar<small>Entra en la mazmorra</small></button>\n'+
 '        <button type="button" id="pkmsvv-native-cloud-menu" class="menu-item"><span class="mi-ico">☁️</span>Mở bản Web Online<small>Mở trong trình duyệt ngoài; save ứng dụng không tự đồng bộ với Google</small></button>');
fs.copyFileSync(path.join(root,'src','pkmsvv-native-choice.js'),path.join(game,'js','ui','pkmsvv-native-choice.js'));
fs.appendFileSync(path.join(game,'css','style.css'),'\n'+fs.readFileSync(path.join(root,'src','pkmsvv-native-choice.css'),'utf8')+'\n','utf8');
console.log('PKMSVV: native local mode + external-browser Google Cloud mode selector installed');
