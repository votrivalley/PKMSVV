'use strict';
// EXPERIMENTAL Brewser app for Atmosphere Switch/Switch Lite.
// It is a local SD web bundle, not an independently built NRO/NSP.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=path.join(root,'mobile','www');
const dest=path.join(root,'dist','switch-package');
const id='com.votrivalley.pkmsvv';
const dir=path.join(dest,'switch','brewser','apps',id);
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
if(!fs.existsSync(path.join(source,'index.html')))throw Error('Run npm run prepare:android first');
if(!fs.existsSync(path.join(source,'assets','icons','icon-512.png')))throw Error('Run npm run prepare:icons first');
fs.rmSync(dest,{recursive:true,force:true});
fs.mkdirSync(dir,{recursive:true});
fs.cpSync(source,dir,{recursive:true});
const boot=[
 '(function(){',
 '  try {',
 '    const key="ps.settings";',
 '    if (!localStorage.getItem(key)) localStorage.setItem(key,',
 '      JSON.stringify({quality:"low",dmgNumbers:false,calm:true,gamepad:true,padRumble:false}));',
 '  } catch (_) {}',
 '  document.documentElement.setAttribute("data-pkmsvv-switch","");',
 '})();',
 ''
].join('\n');
fs.writeFileSync(path.join(dir,'pkmsvv-switch-boot.js'),boot);
fs.copyFileSync(path.join(root,'src','switch','boot-health.js'),path.join(dir,'pkmsvv-switch-health.js'));

const p=path.join(dir,'index.html');
let html=fs.readFileSync(p,'utf8');
if(!/<\/head>/i.test(html))throw Error('Game HTML has no head');
html=html.replace(/<\/head>/i,
  '<meta name="pkmsvv-platform" content="brewser-switch-homebrew">\n'+
  '<script src="pkmsvv-switch-boot.js"></script>\n</head>');
const gameTag=/<script defer src="(js\\/app\\.min\\.js\\?v=[^"]+)"><\\/script>/;
if(!gameTag.test(html))throw Error('Switch needs one compiled JS script near the end of game HTML');
html=html.replace(gameTag,'<script src="pkmsvv-switch-health.js"></script>\\n<script src="$1"></script>');
const bootMsg='    <p class="boot-ld" lang="vi">Đang tải trò chơi…</p>';
if(!html.includes(bootMsg))throw Error('Switch boot text changed upstream');
html=html.replace(bootMsg,bootMsg+'\\n    <p id="pkmsvv-switch-health" style="color:#a9dcf0;font:12px sans-serif;margin:7px auto;max-width:500px">Đang chờ JavaScript game...</p>');

fs.writeFileSync(p,html,'utf8');
const manifest={
 id,name:'Pokemon Chuyển sinh — Votri Valley',version,
 description:'<p>PokéSurvivor fan translation & noncommercial gameplay modifications by Votri Valley; source game by JPTER78.</p>',
 summary:'Pokemon Chuyển sinh — Switch homebrew offline',
 logo:'assets/icons/icon-512.png',entry:'index.html',
 categories:['Games'],permissions:['storage'],compatibility:['switch'],allowed_origins:[],
 developer:'Votri Valley',license:'LicenseRef-PolyForm-Noncommercial-1.0.0',
 tags:['Survivor','Offline','Fan Translation'],exitGame:'MINUS',fullscreen:true,
 hideMouseDocked:false,hideMouseUndocked:false,publishedAt:'2026-10-21T00:00:00Z'
};
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const guide="# Pokémon Chuyển Sinh — Switch One-File NRO Beta\n\n**Một file:** `PKMSVV.nro`. Game vẫn là HTML5, không phải native port.\nNRO có sẵn Brewser runtime và dữ liệu game offline trong RomFS. Lần mở đầu\nNRO tự cài game/Brewser vào thẻ nhớ rồi chạy thẳng Pokémon Chuyển Sinh.\nKhông cần tải thêm Brewser, không cần gõ URL, không cần tạo NSP.\n\n## Cài đơn giản\n1. Giải nén gói GitHub Actions lấy **một file PKMSVV.nro**.\n2. Chép file vào `sd:/switch/PKMSVV.nro`.\n3. Mở Homebrew Menu ở chế độ full RAM (giữ R khi mở một game hợp lệ),\n   chọn Pokémon Chuyển Sinh. Lần đầu để màn hình tự cài xong, lần sau mở nhanh hơn.\n\n## Kỹ thuật / hạn chế\n- NRO dùng Brewser (MPL-2.0) để chạy game HTML5 offline; tài nguyên\n  được giải nén tự động vào `sd:/switch/brewser/apps/com.votrivalley.pkmsvv/`.\n- Brewser được tự cài nếu chưa có ở `sd:/switch/brewser.nro`. Nếu đã có\n  Brewser, chương trình không tự ghi đè bản đó.\n- Không yêu cầu khóa mã hóa hay NSP. Game và engine không nằm trong sysMMC.\n- Không xóa localStorage, save, ảnh/thiết lập hiện có; cập nhật chỉ ghi đè\n  file game trong thư mục app, không xóa thư mục user hoặc dữ liệu Brewser.\n- Đây là bản **thử nghiệm**: CI có thể xác minh NRO hợp lệ và dữ liệu đầy đủ,\n  nhưng không thể xác nhận FPS, controller, âm thanh và save trên Switch thực.\n- Tắt máy/thoát NRO khi đang sao chép có thể để lại file tạm; mở lại NRO để\n  nó thử cài lại. Đảm bảo thẻ SD còn tối thiểu khoảng 350 MB.\n- Sống Còn / Tranh Trứng offline AI đi theo bản game build, khả năng vận hành\n  trong engine Brewser trên Switch thật cần test riêng.\n- Không phải phần mềm chính thức Nintendo/Pokémon. Chỉ phát hành phi thương mại.\n\n## Nguồn và giấy phép\n- Pokémon Chuyển Sinh: Votri Valley, dựa trên PokéSurvivor của JPTER78\n  (PolyForm Noncommercial 1.0.0).\n- Brewser (MPL-2.0): https://github.com/natureglass/Brewser\n- NRO tự giải nén engine được tải từ release chính thức, checksum SHA-256\n  được cố định/kiểm tra tại workflow GitHub.\n";
fs.writeFileSync(path.join(dest,'HUONG_DAN_SWITCH.txt'),guide);
console.log('PKMSVV Switch Brewser local SD game ready:',dir);
