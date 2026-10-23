'use strict';
/* v1.1.2: Mobile header must not fall under the Android status/system bars.
   Make metadata and clickable controls separate touch-accessible rows.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..','vendor','pokesurvivor');
function patch(file,from,to){
 const p=path.join(root,file),s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'),parts=s.split(from);
 if(parts.length!==2)throw Error('Mobile header patch anchor missing/duplicate in '+file+': '+from.slice(0,120));
 fs.writeFileSync(p,parts.join(to),'utf8');
}
patch('dev.html',
 '<div id="topbar" class="topbar hidden">\n  <div class="pill">',
 '<div id="topbar" class="topbar hidden">\n  <div class="pkmsvv-top-meta">\n  <div class="pill">');
patch('dev.html',
 '  <div class="pill" id="user-pill"></div>\n  <button id="btn-save"',
 '  <div class="pill" id="user-pill"></div>\n  </div>\n  <div class="pkmsvv-top-actions">\n  <button id="btn-save"');
patch('dev.html',
 '  <button id="btn-logout" class="btn small ghost hidden" aria-hidden="true" tabindex="-1">Salir</button>\n</div>\n<div id="sound-panel"',
 '  <button id="btn-logout" class="btn small ghost hidden" aria-hidden="true" tabindex="-1">Salir</button>\n  </div>\n</div>\n<div id="sound-panel"');
// The toolbar is interactive independently from the fullscreen game canvas.
patch('js/ui/ui.js',
 '  function initChrome() {\n    G.Icons.installCss();',
 '  function initChrome() {\n    G.Icons.installCss();\n'+
 '    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {\n'+
 '      document.documentElement.classList.add("pkmsvv-native-android","pkmsvv-native-immersive");\n'+
 '    }');
patch('js/ui/settings-ui.js',
 '        nativeFull=!!(result&&result.enabled);',
 '        nativeFull=!!(result&&result.enabled);\n'+
 '        document.documentElement.classList.toggle("pkmsvv-native-immersive",nativeFull);');
patch('js/ui/settings-ui.js',
 '    if(electron())window.PKMSVVNative.isFullscreen().then(r=>{nativeFull=!!r.fullscreen;refreshFull();}).catch(()=>{});',
 '    if(electron())window.PKMSVVNative.isFullscreen().then(r=>{nativeFull=!!r.fullscreen;refreshFull();}).catch(()=>{});\n'+
 '    if(android() && android().state) android().state().then(r=>{nativeFull=!!r.enabled;document.documentElement.classList.toggle("pkmsvv-native-immersive",nativeFull);refreshFull();}).catch(()=>{});');
fs.appendFileSync(path.join(root,'css','style.css'),String.raw`
/* Votri Valley v1.1.2: split mobile HUD from system touch gestures */
.pkmsvv-top-meta,.pkmsvv-top-actions{display:flex;align-items:center;gap:10px}
.topbar{max-width:calc(100% - 20px)}
.topbar button{touch-action:manipulation}
@media (max-height:520px) and (max-width:1200px), (pointer:coarse) and (orientation:landscape) and (max-width:1200px){
 .topbar{
   top:calc(34px + env(safe-area-inset-top,0px));
   left:max(8px,env(safe-area-inset-left,0px));
   right:max(8px,env(safe-area-inset-right,0px));
   max-width:none;
   display:flex;flex-direction:column;align-items:flex-end;
   gap:5px;z-index:55;pointer-events:none;
 }
 html.pkmsvv-native-immersive .topbar{top:calc(7px + env(safe-area-inset-top,0px))}
 .pkmsvv-top-meta,.pkmsvv-top-actions{
   pointer-events:none;display:flex;align-items:center;justify-content:flex-end;
   flex-wrap:nowrap;max-width:100%;gap:5px;
 }
 .topbar .pill,.topbar button{pointer-events:auto;flex:0 0 auto}
 .topbar .btn.small,.topbar #btn-backup{
   min-width:40px;min-height:40px;
   display:inline-flex;align-items:center;justify-content:center;
   padding:5px 8px;touch-action:manipulation;
 }
 .topbar .news-btn{min-width:42px}
 .topbar .pkmsvv-top-meta .pill{min-height:30px}
 #scr-menu .menu-right{padding-top:105px}
 #scr-menu .menu-left{padding-top:78px}
 .sound-panel{top:calc(111px + env(safe-area-inset-top,0px))}
 html.pkmsvv-native-immersive .sound-panel{top:80px}
}
@media (max-width:690px) and (orientation:landscape){
 .topbar .pill{font-size:12px;padding:2px 5px}
 .pkmsvv-top-meta,.pkmsvv-top-actions{gap:3px}
 .topbar .btn.small{min-width:36px;padding:4px 5px}
}
`+'\n');
console.log('PKMSVV mobile: toolbar now uses independent accessible rows and Android safe top padding');
