'use strict';
const fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..','vendor','pokesurvivor');
function patch(p,from,to){
 const file=path.join(base,p),src=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),parts=src.split(from);
 if(parts.length!==2)throw Error('Touch/balance anchor changed in '+p+' '+from.slice(0,95));
 fs.writeFileSync(file,parts.join(to),'utf8');
}
// A stable capture handler survives Settings rerendering and catches bad editor loads.
patch('js/ui/settings-ui.js',"    $('set-close').onclick = close;",
 "    $('set-close').onclick = close;\n"+
 "    document.addEventListener('click',e=>{\n"+
 "      const b=e.target&&e.target.closest&&e.target.closest('#set-layout');\n"+
 "      if(!b||!isOpen())return;\n"+
 "      e.preventDefault();e.stopImmediatePropagation();\n"+
 "      try{if(!G.LayoutUI||typeof G.LayoutUI.open!=='function')throw Error('Trình sắp xếp chưa được tải');\n"+
 "        G.LayoutUI.open();if(!G.LayoutUI.isOpen)throw Error('Không thể mở trình sắp xếp');\n"+
 "      }catch(err){G.UI.toast('Không mở được chỉnh nút: '+(err&&err.message||'Không rõ lỗi'),5000);}\n"+
 "    },true);");
patch('js/ui/layout-ui.js',
 '      <div class="lay-thing lay-pause" data-k="pause"><b></b><b></b></div>',
 '      <div class="lay-thing lay-pause" data-k="pause"><b></b><b></b></div>\n'+
 '      <div class="lay-thing lay-dash" data-k="dash"><span>F / X</span><small>CHIÊU CHỦ ĐỘNG</small></div>');
patch('js/ui/layout-ui.js',
 "    if (k === 'pause') return [G.U.clamp(x, 24, w - 24), G.U.clamp(y, 30, h - 24)];",
 "    if (k === 'pause') return [G.U.clamp(x, 24, Math.max(24,w-24)), G.U.clamp(y, 30, Math.max(30,h-24))];\n"+
 "    if (k === 'dash') return [G.U.clamp(x, 38, Math.max(38,w-38)), G.U.clamp(y, 40, Math.max(40,h-40))];");
patch('js/ui/layout-ui.js',
 "    if (p) return [p[0] * w, p[1] * h];\n    return [w - 52 - Math.min(44, sa.right) + 20, 12 + Math.min(20, sa.top) + 20];",
 "    if (p) return [p[0] * w, p[1] * h];\n    if (k === 'dash') return [w-58-sa.right,h-142-sa.bottom];\n"+
 "    return [w - 52 - Math.min(44, sa.right) + 20, 12 + Math.min(20, sa.top) + 20];");
patch('js/ui/layout-ui.js',
 "              stick: [G.Touch.STICK_DEF[0] * w, G.Touch.STICK_DEF[1] * h] };",
 "              stick: [G.Touch.STICK_DEF[0] * w, G.Touch.STICK_DEF[1] * h],\n              dash: [w-58-sa.right,h-142-sa.bottom] };");
patch('js/ui/layout-ui.js',
 "    for (const k of ['bar', 'pause', 'stick']) {",
 "    for (const k of ['bar', 'pause', 'stick', 'dash']) {");
patch('js/ui/layout-ui.js',"    place('pause', 40, 40);",
 "    place('pause', 40, 40);\n    place('dash', 64, 64);");
patch('js/ui/layout-ui.js',"        <h3>Arrastra los botones a donde quieras</h3>",
 "        <h3>Tự sắp xếp nút điều khiển</h3>");
patch('js/ui/layout-ui.js',
 "        <small class=\"lay-help\">Flotante: aparece donde pones el dedo. Fijo: siempre en el mismo sitio.</small>",
 "        <small class=\"lay-help\">Kéo nút kỹ năng, chiêu chủ động, tạm dừng và joystick đến chỗ bạn muốn. Bố cục chỉ lưu trên thiết bị này.</small>");
patch('js/ui/layout-ui.js',"    G.UI.toast('Botones colocados');",
 "    G.UI.toast('Đã lưu vị trí nút trên thiết bị');");
patch('js/ui/layout-ui.js',"    el.classList.remove('hidden');\n    paint();",
 "    el.classList.remove('hidden');\n    el.style.zIndex='10080';\n    paint();");
patch('js/ui/hud.js',
 "const x = w - 90 - sa.right, y = h - 174 - sa.bottom, size = 64;",
 "const dp=touch && G.Touch.spot('dash');\n"+
 "      const size=64;\n"+
 "      const x=dp?G.U.clamp(dp[0]*w-size/2,4,Math.max(4,w-size-4)):w-90-sa.right;\n"+
 "      const y=dp?G.U.clamp(dp[1]*h-size/2,4,Math.max(4,h-size-4)):h-174-sa.bottom;");
fs.appendFileSync(path.join(base,'css','style.css'),
 '\n#scr-layout{z-index:10080!important;pointer-events:auto!important}\n'+
 '#scr-layout .lay-thing{touch-action:none!important;pointer-events:auto;user-select:none;-webkit-user-select:none}\n'+
 '#scr-layout .lay-dash{display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:13px;border:2px solid #67d9ee;color:#fff;background:#155d85;box-sizing:border-box;font-size:15px;font-weight:900;line-height:1.1;text-align:center}\n'+
 '#scr-layout .lay-dash small{font-size:7px;margin-top:4px}\n'+
 '#scr-layout .lay-panel{z-index:5;max-height:min(58vh,330px);overflow-y:auto}\n'+
 '#scr-layout .lay-btns button{min-height:42px;touch-action:manipulation}\n','utf8');
// First three minutes remain unchanged. At minute 9 factor=1;
// after minute 10 the swarm builds pressure, capped for Android stability.
patch('js/systems/spawner.js',
 "const openingSpawnFactor = t => t <= 180 ? 2 / 3 : t >= 600 ? 1 : 2 / 3 + (t - 180) / 1260;",
 "const openingSpawnFactor = t => t<=180?2/3:t<=540?2/3+(t-180)/1080:\n"+
 "      t<=900?1+(t-540)*0.0011:Math.min(1.9,1.396+(t-900)*0.0007);\n"+
 "  const lateCap=t=>CAP+Math.min(20,Math.floor(Math.max(0,t-600)/30));");
patch('js/systems/spawner.js',
 "const hpK = t => 1.65 + Math.min(1.55, Math.max(0, t) / 360);",
 "const hpK = t => 1.65+Math.min(1.55,Math.max(0,t)/360)+Math.min(2.15,Math.max(0,t-540)/350);");
patch('js/systems/spawner.js',
 "e.dmg *= DMG_K; e.xp = Math.round(e.xp * XP_K);",
 "e.dmg *= DMG_K*(1+Math.min(0.55,Math.max(0,t-540)/1200)); e.xp = Math.round(e.xp * XP_K);");
patch('js/systems/spawner.js',
 "if (G.EnemyMgr.count < CAP) {",
 "if (G.EnemyMgr.count < lateCap(t)) {");
patch('js/systems/spawner.js',
 "while (n-- > 0 && G.EnemyMgr.count < CAP)",
 "while (n-- > 0 && G.EnemyMgr.count < lateCap(t))");
patch('js/systems/spawner.js',
 "Math.min(CAP - G.EnemyMgr.count, Math.round(",
 "Math.min(lateCap(t) - G.EnemyMgr.count, Math.round(");
patch('js/systems/spawner.js',
 "G.EnemyMgr.count < CAP + 10",
 "G.EnemyMgr.count < lateCap(t) + 10");
console.log('PKMSVV: touch editor opens, active dash moved, late-game difficulty scales smoothly.');
