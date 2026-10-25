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
const p=path.join(dir,'index.html');
let html=fs.readFileSync(p,'utf8');
if(!/<\/head>/i.test(html))throw Error('Game HTML has no head');
html=html.replace(/<\/head>/i,
  '<meta name="pkmsvv-platform" content="brewser-switch-homebrew">\n'+
  '<script src="pkmsvv-switch-boot.js"></script>\n</head>');
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
const guide="PKMSVV-VotriValley1.0 — HƯỚNG DẪN SWITCH / SWITCH LITE (ATMOSPHÈRE)\r\nBuild PKMSVV 1.5.0 — Pokemon Chuyển sinh\r\n\r\nĐÂY LÀ GÓI THỬ NGHIỆM CHẠY OFFLINE BẰNG BREWSER.\r\nGame là HTML5 và có thể mở qua PKMSVV.nro hoặc bên trong Brewser.\r\nbrewser-forwarder.nsp chỉ tạo BIỂU TƯỢNG BREWSER ở Nintendo Home Menu,\r\nkhông phải NSP trò chơi Pokémon Survivor hay engine độc lập.\r\n\r\nTRONG GÓI ZIP CÓ:\r\n  sd:/switch/brewser.nro                           — runtime Brewser\r\n  switch/PKMSVV.nro                               — lối tắt mở thẳng Pokémon Survivor\r\n  switch/brewser/apps/com.votrivalley.pkmsvv/     — dữ liệu game offline\r\n  NSP_TUY_CHON/brewser-forwarder.nsp              — lối tắt Brewser tại Home Menu (tùy chọn)\r\n  NSP_TUY_CHON/BREWSER_LICENSE_MPL-2.0.txt        — giấy phép Brewser\r\n\r\nCÁCH CÀI:\r\n1. Thoát hoàn toàn PKMSVV/Brewser trước khi sao chép dữ liệu.\r\n2. Giải nén GÓI ZIP game vào GỐC thẻ nhớ Switch (không chép nhầm\r\n   cả thư mục switch-package/). Gộp thư mục switch/ đang có,\r\n   KHÔNG xóa game, save, hồ sơ hoặc thư mục Brewser cũ.\r\n3. Không cần tải Brewser riêng: gói đã kèm brewser.nro chính thức.\r\n4. Cách A — Homebrew Menu: mở PKMSVV.nro để khởi chạy game.\r\n   Nên chạy HBMenu chế độ full RAM: giữ R khi mở một game hợp lệ.\r\n5. Cách B — Nintendo Home Menu: nếu muốn có icon Brewser tại đây,\r\n   dùng công cụ cài homebrew của bạn để cài file tùy chọn\r\n   NSP_TUY_CHON/brewser-forwarder.nsp. NSP này CHỈ mở Brewser.\r\n   Trong Brewser, chọn app PKMSVV nếu hiện, hoặc nhập:\r\n   brewser://apps/com.votrivalley.pkmsvv/index.html\r\n   Việc cài NSP phụ thuộc vào môi trường Atmosphère của máy;\r\n   không phải điều kiện bắt buộc nếu đã mở được PKMSVV.nro.\r\n\r\nĐIỀU KHIỂN DỰ KIẾN:\r\n  Analog trái          : Di chuyển\r\n  D-pad                : Chọn mục / nâng cấp\r\n  A                    : Xác nhận\r\n  B                    : Quay lại\r\n  X                    : Chiêu lao tới CHỦ ĐỘNG (nếu có)\r\n  +                    : Tạm dừng trong game\r\n  -                    : Thoát app về Brewser (nếu runtime hỗ trợ)\r\n  Cảm ứng              : Menu, kỹ năng chủ động\r\n  Các chiêu khác       : Tự thi triển khi hồi xong\r\n\r\nLƯU Ý:\r\n  - Không cài NSP tùy chọn nếu máy bạn không hỗ trợ. NSP\r\n    không thay cho dữ liệu game, brewser.nro hay PKMSVV.nro.\r\n  - Lưu tiến trình trên Switch riêng biệt PC và Android.\r\n  - Đồ họa mặc định Thấp trong lần đầu thử nghiệm.\r\n  - Brewser có thể không hỗ trợ toàn bộ Web Audio; cần test nhạc.\r\n  - Chưa xác nhận FPS, nút tay cầm và save trên Switch Lite thật.\r\n  - Không đổi Firmware/hack chỉ để chạy bản thử nghiệm.\r\n\r\nQUYỀN TÁC GIẢ:\r\n  PKMSVV: Việt hóa và Mod điều chỉnh bởi Votri Valley.\r\n  Game gốc: https://github.com/JPTER78/pokesurvivor\r\n  Brewser: https://github.com/natureglass/Brewser\r\n  Brewser v0.1.1.31 theo giấy phép MPL-2.0.\r\n  Mã game PokéSurvivor: PolyForm Noncommercial 1.0.0.\r\n  Không phải bản phát hành chính thức của Nintendo/Pokémon.\r\n  Chỉ sử dụng phi thương mại; giữ nguyên ghi công/giấy phép.\r\n";
fs.writeFileSync(path.join(dest,'HUONG_DAN_SWITCH.txt'),guide);
console.log('PKMSVV Switch Brewser local SD game ready:',dir);
