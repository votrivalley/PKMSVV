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
 '      <button class="btn ghost grow" id="pkmsvv-login-fullscreen" type="button">⛶ Toàn màn hình</button>',
 '    </div>',
 '    <p class="note center" id="pkmsvv-login-fullscreen-tip" role="status"></p>',
 '    <p class="note center" id="login-mode"></p>'
 ].join('\n'));
patch('js/ui/login.js',
 "    $('btn-guest').onclick = () => { G.DB.playAsGuest(); G.Flow.afterLogin(); };",
 [
 "    $('btn-guest').onclick = () => { G.DB.playAsGuest(); G.Flow.afterLogin(); };",
 "    $('pkmsvv-login-offline').onclick = () => {",
 "      try{localStorage.setItem('pkmsvv.web.saveMode','local');}",
 "      catch(e){$('pkmsvv-login-fullscreen-tip').textContent='Không thể lưu chế độ chơi. Hãy bật bộ nhớ website.';return;}",
 "      location.replace('./'); // reload with LOCAL profile, not guest and not Cloud",
 "    };",
 "    $('pkmsvv-login-fullscreen').onclick = () => {",
 "      const element=document.documentElement;",
 "      const request=element.requestFullscreen||element.webkitRequestFullscreen;",
 "      if(!request){$('pkmsvv-login-fullscreen-tip').textContent='Trên iPhone, hãy mở game từ biểu tượng trên Màn hình chính để sử dụng chế độ toàn màn hình.';return;}",
 "      Promise.resolve(request.call(element)).then(()=>{try{if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(()=>{});}catch(e){};}).catch(()=>{",
 "        $('pkmsvv-login-fullscreen-tip').textContent='Trình duyệt chưa cho phép toàn màn hình. Thử nhấn trực tiếp nút này lần nữa.';",
 "      });",
 "    };"
 ].join('\n'));
fs.appendFileSync(path.join(base,'css','style.css'),
 '\n#scr-login .pkmsvv-entry-buttons{display:flex;gap:8px;flex-wrap:wrap;margin:9px 0 4px}#scr-login .pkmsvv-entry-buttons>.btn{min-height:44px;flex:1 1 140px;white-space:normal}#pkmsvv-login-fullscreen-tip{min-height:1em;color:#f7dd99}\n','utf8');
console.log('PKMSVV Web: explicit Offline and Fullscreen before login');
