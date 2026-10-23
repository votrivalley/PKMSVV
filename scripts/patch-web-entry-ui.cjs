'use strict';
/* Only the Web edition: offline and fullscreen controls inside the initial
   game login, before authentication, without changing saved account data. */
const fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..','vendor','pokesurvivor');
function patch(file,oldText,newText){
 const p=path.join(base,file),s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 if(s.split(oldText).length!==2)throw Error('Web entry patch source changed: '+file);
 fs.writeFileSync(p,s.replace(oldText,newText),'utf8');
}
patch('dev.html',
 '    <p class="note center" id="login-mode"></p>',
 [
 '    <div class="row pkmsvv-entry-buttons">',
 '      <button class="btn gold grow" id="pkmsvv-login-offline" type="button">🎮 Chơi offline</button>',
 '      <button class="btn google grow" id="pkmsvv-login-google" type="button">☁️ Đăng nhập Google</button>',
 '      <button class="btn ghost grow" id="pkmsvv-login-fullscreen" type="button">⛶ Bật toàn màn hình</button>',
 '    </div>',
 '    <p class="note center" id="pkmsvv-login-fullscreen-tip" role="status"></p>',
 '    <p class="note center" id="login-mode"></p>'
 ].join('\n'));
patch('dev.html',
 '        <button class="menu-item" data-go="settings">Ajustes<small>Sonido, gráficos, controles y cuenta</small></button>',
 '        <button class="menu-item" data-go="settings">Ajustes<small>Sonido, gráficos, controles y cuenta</small></button>\n'+
 '        <button class="menu-item pkmsvv-google-switch" id="pkmsvv-menu-google" type="button"><span class="mi-ico" aria-hidden="true">☁️</span>Đăng nhập Google / Đổi chế độ<small>Hồ sơ Google và save offline được lưu riêng</small></button>');
patch('js/ui/login.js',
 "    $('btn-guest').onclick = () => { G.DB.playAsGuest(); G.Flow.afterLogin(); };",
 [
 "    $('btn-guest').onclick = () => { G.DB.playAsGuest(); G.Flow.afterLogin(); };",
 "    $('pkmsvv-login-offline').onclick = () => {",
 "      try{localStorage.setItem('pkmsvv.web.saveMode','local');}",
 "      catch(e){$('pkmsvv-login-fullscreen-tip').textContent='Không thể lưu chế độ chơi. Hãy bật bộ nhớ website.';return;}",
 "      location.replace('./'); // reload with LOCAL profile, not guest and not Cloud",
 "    };",
 "    // The cloud profile remains separate from offline save, never clear storage.",
 "    const googleChoice=$('pkmsvv-login-google');",
 "    googleChoice.onclick=()=>{",
 "      if(G.DB.mode==='cloud'){$('btn-google').click();return;}",
 "      try{localStorage.setItem('pkmsvv.web.saveMode','cloud');}",
 "      catch(e){$('pkmsvv-login-fullscreen-tip').textContent='Không thể lưu lựa chọn Google. Cho phép lưu dữ liệu website.';return;}",
 "      location.replace('./'); // bootstrap Firebase cloud and show Google login",
 "    };",
 "    const fullButton=$('pkmsvv-login-fullscreen');",
 "    const fullNote=$('pkmsvv-login-fullscreen-tip');",
 "    const inFullscreen=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);",
 "    const refreshFullButton=()=>{fullButton.textContent=inFullscreen()?'⛶ Thoát toàn màn hình':'⛶ Bật toàn màn hình';fullButton.setAttribute('aria-pressed',String(inFullscreen()));};",
 "    fullButton.onclick=()=>{",
 "      const exiting=inFullscreen();",
 "      const method=exiting?(document.exitFullscreen||document.webkitExitFullscreen):(document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen);",
 "      if(!method){fullNote.textContent='Trình duyệt không hỗ trợ bật/tắt toàn màn hình; với app đã cài, hãy dùng thao tác hệ thống.';return;}",
 "      try{Promise.resolve(method.call(exiting?document:document.documentElement)).then(()=>{refreshFullButton();fullNote.textContent=inFullscreen()?'Đã bật toàn màn hình.':'Đã thoát toàn màn hình.';}).catch(()=>{fullNote.textContent='Không thể đổi toàn màn hình ở đây.';});}",
 "      catch(e){fullNote.textContent='Không thể đổi toàn màn hình trên thiết bị này.';}",
 "    };",
 "    document.addEventListener('fullscreenchange',refreshFullButton);",
 "    document.addEventListener('webkitfullscreenchange',refreshFullButton);",
 "    refreshFullButton();",
 "    // Explicit change-mode entry from the menu even if offline already restored.",
 "    $('pkmsvv-menu-google').onclick=()=>{",
 "      if(G.DB.mode!=='cloud'){",
 "        try{localStorage.setItem('pkmsvv.web.saveMode','cloud');}catch(e){G.UI.toast('Không thể lưu lựa chọn Google.');return;}",
 "        location.assign('./');",
 "      } else location.assign('../');",
 "    };"
 ].join('\n'));
// Hide legacy ID/password account UI on Web, leave old account data intact.
patch('js/ui/login.js',"    setTimeout(() => $('f-user').focus(), 50);",
 "    setTimeout(() => $('pkmsvv-login-google').focus(), 50);");
fs.appendFileSync(path.join(base,'css','style.css'),
 '\n#scr-login .pkmsvv-entry-buttons{display:flex;gap:8px;flex-wrap:wrap;margin:9px 0 4px}#scr-login .pkmsvv-entry-buttons>.btn{min-height:44px;flex:1 1 140px;white-space:normal}#pkmsvv-login-fullscreen-tip{min-height:1em;color:#f7dd99}\n#scr-menu .pkmsvv-google-switch{font-size:15px}#scr-menu .pkmsvv-google-switch .mi-ico{display:inline-flex;align-items:center;justify-content:center}\n#scr-login #btn-google:not(.hidden){display:inline-flex!important}\n','utf8');
fs.appendFileSync(path.join(base,'css','style.css'),
 '\n/* Hide unsupported Web ID/password and guest sign-in choices. */\n'+
 '#scr-login .tabs,#scr-login #login-form,#scr-login #btn-guest{display:none!important}\n'+
 '#scr-login #btn-google:not(.hidden){display:none!important}\n','utf8');
console.log('PKMSVV Web login: Google or Offline only; legacy account data preserved');
