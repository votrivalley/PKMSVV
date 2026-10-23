'use strict';
/* PKMSVV v0.9.4 — visible partner action, quick save, working fullscreen */
const fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..','vendor','pokesurvivor');
function modify(rel,fn){
 const p=path.join(base,rel),original=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 const changed=fn(original);
 if(changed===original)throw Error('UI094: no change '+rel);
 fs.writeFileSync(p,changed,'utf8');
}
function replaceOnce(s,from,to,rel){
 const parts=s.split(from);
 if(parts.length!==2)throw Error('UI094: non-unique anchor in '+rel+': '+from.slice(0,100));
 return parts.join(to);
}
modify('js/ui/menu.js',s=>{
  const start=s.indexOf('        ${usingThis\n');
  const end=s.indexOf('\n      ` : `<p class="center"',start);
  if(start<0||end<0)throw Error('UI094: partner action not found');
  const action=s.slice(start,end);
  s=s.slice(0,start)+s.slice(end);
  const anchor="      ${own ? `\n        ${bar('Vida'";
  if(s.split(anchor).length!==2)throw Error('UI094: header placement anchor missing');
  return s.replace(anchor,"      ${own ? `\n        <div class=\"pkmsvv-dex-action\">\n"+
    action.replace('Es tu compañero','Chọn Pokémon').replace('Elegir de compañero','Chọn Pokémon')+
    "\n        </div>\n        ${bar('Vida'");
});
modify('dev.html',s=>replaceOnce(s,
  '  <button id="btn-sound" class="btn small ghost" title="Sonido"></button>',
  '  <button id="btn-sound" class="btn small ghost" title="Sonido"></button>\n  <button id="btn-backup" class="btn small ghost" title="Sao lưu / Khôi phục Save" aria-label="Sao lưu hoặc khôi phục Save"></button>',
  'dev.html'));
modify('js/ui/ui.js',s=>replaceOnce(s,
  "    wireSounds();\n    refreshSoundIcon();",
  "    wireSounds();\n    G.PKMSVVSaveUI.initQuick();\n    refreshSoundIcon();",
  'js/ui/ui.js'));
modify('js/game.js',s=>replaceOnce(s,
  "  function handleKeys() {\n    if (G.SettingsUI.isOpen)",
  "  function handleKeys() {\n    if (G.PKMSVVSaveUI && G.PKMSVVSaveUI.isOpen()) {\n      if (G.Input.tap('escape')) G.PKMSVVSaveUI.closeQuick();\n      return;\n    }\n    if (G.SettingsUI.isOpen)",
  'js/game.js'));
modify('js/ui/settings-ui.js',s=>{
  s=replaceOnce(s,
    "    // Pantalla completa (si el navegador la permite; en iPhone, cómo conseguirla).\n    if (canFull() || iosTip()) {\n      $('btn-full').classList.remove('hidden');\n      $('btn-full').innerHTML = G.Icons.html('full', 20);\n      $('btn-full').onclick = toggleFull;\n    }",
    "    // Always show the full-screen button; unsupported platforms give a clear message.\n    $('btn-full').classList.remove('hidden');\n    $('btn-full').innerHTML=G.Icons.html('full',20);\n    $('btn-full').onclick=toggleFull;\n    if(electron())window.PKMSVVNative.isFullscreen().then(r=>{nativeFull=!!r.fullscreen;refreshFull();}).catch(()=>{});\n    refreshFull();",
    'js/ui/settings-ui.js');
  const start=s.indexOf('  function canFull()');
  const end=s.indexOf('  // ---------------- piezas ----------------',start);
  if(start<0||end<0||end<=start)throw Error('UI094: fullscreen block missing');
  s=s.slice(0,start)+"  // Fullscreen: native in Electron and Android; standard browser API elsewhere.\n  let nativeFull=false, fullBusy=false;\n  const electron=()=>window.PKMSVVNative&&typeof window.PKMSVVNative.toggleFullscreen==='function';\n  const android=()=>window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.PKMSVVScreen;\n  function canFull(){\n    return !!(electron()||android()||document.fullscreenEnabled||document.webkitFullscreenEnabled||\n      document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen);\n  }\n  function isFull(){return !!(document.fullscreenElement||document.webkitFullscreenElement||nativeFull);}\n  const IOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);\n  const standalone=()=>!!navigator.standalone||(window.matchMedia&&matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches);\n  function iosTip(){return IOS&&!canFull()&&!standalone();}\n  const IOS_TIP='Trên iPhone Safari, chọn Chia sẻ → Thêm vào màn hình chính và mở game từ biểu tượng đó.';\n  function refreshFull(){\n    const b=$('btn-full');\n    if(b){\n      const active=isFull();\n      b.classList.toggle('gold',active);\n      b.setAttribute('aria-pressed',String(active));\n      b.title=active?'Thoát toàn màn hình':'Bật toàn màn hình';\n      b.setAttribute('aria-label',b.title);\n    }\n    if(isOpen()&&tab==='gfx')render();\n  }\n  async function toggleFull(){\n    if(fullBusy)return;\n    fullBusy=true;\n    const button=$('btn-full');\n    if(button)button.disabled=true;\n    try{\n      if(electron()){\n        const result=await window.PKMSVVNative.toggleFullscreen();\n        nativeFull=!!(result&&result.fullscreen);\n      }else if(android()){\n        const result=await android().toggle({enabled:!nativeFull});\n        nativeFull=!!(result&&result.enabled);\n      }else if(isFull()){\n        const exit=document.exitFullscreen||document.webkitExitFullscreen;\n        if(!exit)throw Error('Thiết bị không cho thoát toàn màn hình');\n        await Promise.resolve(exit.call(document));\n      }else{\n        const el=document.documentElement;\n        const enter=el.requestFullscreen||el.webkitRequestFullscreen;\n        if(!enter)throw Error(IOS?IOS_TIP:'Trình duyệt này không hỗ trợ toàn màn hình');\n        await Promise.resolve(enter.call(el));\n        if(screen.orientation&&screen.orientation.lock){\n          Promise.resolve().then(()=>screen.orientation.lock('landscape')).catch(()=>{});\n        }\n      }\n    }catch(e){\n      const msg=e&&e.message?e.message:'Không có quyền truy cập';\n      G.UI.toast('Không thể đổi toàn màn hình: '+msg,5200);\n    }finally{\n      fullBusy=false;\n      if(button)button.disabled=false;\n      refreshFull();\n      window.dispatchEvent(new Event('resize'));\n    }\n  }\n  document.addEventListener('fullscreenchange',refreshFull);\n  document.addEventListener('webkitfullscreenchange',refreshFull);\n"+s.slice(end);
  // Setting button is always available, and reports native/browser full-screen status.
  s=s.replace("        + (canFull() ? `<div class=\"set-row\">","        + (canFull() ? `<div class=\"set-row\">");
  return s;
});
fs.appendFileSync(path.join(base,'css','style.css'),`
.pkmsvv-dex-action{margin:9px 0 14px;position:sticky;top:0;z-index:2;background:#162744;padding:8px;border:1px solid #7190be;border-radius:10px}
.pkmsvv-dex-action .btn{min-height:46px;font-weight:700}
#btn-backup{min-width:40px;min-height:38px;display:inline-flex;justify-content:center;align-items:center}
.pkmsvv-quick{z-index:10020!important;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto}
.pkmsvv-quick-box{width:min(590px,94vw);max-height:90vh;overflow-y:auto}
.pkmsvv-quick-box h2{font-size:20px;color:#ffdf85;margin:0}
.pkmsvv-quick .pkm-backup{margin-bottom:0}
@media(max-width:670px){.pkmsvv-quick-box{padding:12px}.pkmsvv-quick-box h2{font-size:16px}
.pkmsvv-dex-action .btn{font-size:13px}}
`+'\n');
console.log('PKMSVV: partner action moved to top, quick save menu added, fullscreen fixed.');