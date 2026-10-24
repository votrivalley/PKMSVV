'use strict';
/* Device-local rebindable keyboard controls and fixed two-line title; all platforms. */
const fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..','vendor','pokesurvivor');
function patch(file,from,to){
 const p=path.join(base,file),s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'),parts=s.split(from);
 if(parts.length!==2)throw Error('Controls/branding patch failed: '+file+' '+from.slice(0,90));
 fs.writeFileSync(p,parts.join(to),'utf8');
}
const defs={up:'keyw',down:'keys',left:'keya',right:'keyd',dash:'keyf',pause:'keyp',card1:'digit1',card2:'digit2',card3:'digit3'};
const spec=Object.entries(defs).map(([id,key])=>({id,key}));
// Patch the actual input dispatcher, not just the settings UI labels.
patch('js/core/input.js',
 "  const MOVE_KEYS = {\n    up: ['keyw', 'arrowup'], down: ['keys', 'arrowdown'],\n    left: ['keya', 'arrowleft'], right: ['keyd', 'arrowright']\n  };",
 "  const DEFAULT_KEYS = "+JSON.stringify(defs)+";\n"+
 "  const bound=id=>{const cur=G.Settings.get('keys')||{};return cur[id]||DEFAULT_KEYS[id];};\n"+
 "  const MOVE_KEYS={up:['arrowup'],down:['arrowdown'],left:['arrowleft'],right:['arrowright']};\n"+
 "  const virtualPressed=new Set();\n"+
 "  const activeTextInput=()=>{const a=document.activeElement;return a&&(a.matches('input,textarea,select,[contenteditable=\"true\"]'));};");
patch('js/core/input.js',
 "    const c = code(e);\n    if (!down.has(c)) pressed.add(c);",
 "    if(activeTextInput())return;\n    const c = code(e);\n    if (!down.has(c)) pressed.add(c);");
patch('js/core/input.js',
 "    if (MOVE_KEYS.left.some(k => down.has(k))) x -= 1;\n      if (MOVE_KEYS.right.some(k => down.has(k))) x += 1;\n      if (MOVE_KEYS.up.some(k => down.has(k))) y -= 1;\n      if (MOVE_KEYS.down.some(k => down.has(k))) y += 1;",
 "    if (down.has(bound('left')) || (MOVE_KEYS.left.some(k=>down.has(k))&&!Object.values(G.Settings.get('keys')||{}).includes('arrowleft'))) x -= 1;\n"+
 "      if (down.has(bound('right')) || (MOVE_KEYS.right.some(k=>down.has(k))&&!Object.values(G.Settings.get('keys')||{}).includes('arrowright'))) x += 1;\n"+
 "      if (down.has(bound('up')) || (MOVE_KEYS.up.some(k=>down.has(k))&&!Object.values(G.Settings.get('keys')||{}).includes('arrowup'))) y -= 1;\n"+
 "      if (down.has(bound('down')) || (MOVE_KEYS.down.some(k=>down.has(k))&&!Object.values(G.Settings.get('keys')||{}).includes('arrowdown'))) y += 1;");
patch('js/core/input.js',
 "    tap(c) { return pressed.has(c); },\n    /** Una pulsación que no viene del teclado (el mando): cuenta como tecla en este fotograma. */\n    virtual(c) { pressed.add(c); },",
 "    tap(c) {\n"+
 "      if(virtualPressed.has(c))return true;\n"+
 "      const action=c==='keyf'?'dash':c==='keyp'?'pause':/^digit[123]$/.test(c)?'card'+c.slice(-1):null;\n"+
 "      return action?pressed.has(bound(action)):pressed.has(c);\n"+
 "    },\n"+
 "    virtual(c) { virtualPressed.add(c); },");
patch('js/core/input.js',
 "    endFrame() { pressed.clear(); }",
 "    endFrame() { pressed.clear();virtualPressed.clear(); },\n"+
 "    DEFAULT_KEYS, bound");
patch('js/core/settings.js',
 "  const DEF = { quality: 'auto',",
 "  const DEF = { keys: null, quality: 'auto',");
// Insert the editable assignment panel in Control settings, with staging until Save.
patch('js/ui/settings-ui.js',
 "    wire(box);\n  }\n\n  function renderAccount",
 "    wire(box);\n"+
 "    if(tab==='ctl')drawBindings(box);\n"+
 "  }\n\n"+
 "  const bindings = "+JSON.stringify(spec)+";\n"+
 "  const labels={up:'Đi lên',down:'Đi xuống',left:'Sang trái',right:'Sang phải',dash:'Kỹ năng chủ động',pause:'Tạm dừng',card1:'Thẻ skill 1',card2:'Thẻ skill 2',card3:'Thẻ skill 3'};\n"+
 "  let editing=null, waiting=null;\n"+
 "  const nameKey=k=>({space:'Space',escape:'Esc',arrowup:'↑',arrowdown:'↓',arrowleft:'←',arrowright:'→'}[k]||k.replace(/^key/,'').replace(/^digit/,'').replace(/^numpad/,'Num '));\n"+
 "  const keysCurrent=()=>Object.assign({},G.Input.DEFAULT_KEYS,G.Settings.get('keys')||{});\n"+
 "  function drawBindings(box){\n"+
 "    editing=null;waiting=null;\n"+
 "    let draft=keysCurrent();\n"+
 "    const root=document.createElement('div');root.id='pkmsvv-bindings';box.appendChild(root);\n"+
 "    const print=()=>{\n"+
 "      root.innerHTML='<h3 class=\"set-h\">Gán phím bàn phím</h3><p class=\"sub\">Chọn một hành động và nhấn phím mới. Lưu riêng trên thiết bị, không ảnh hưởng tay cầm hoặc cảm ứng.</p>'+\n"+
 "        bindings.map(b=>'<div class=\"set-row\"><span>'+labels[b.id]+'</span><button type=\"button\" class=\"btn small\" data-key-action=\"'+b.id+'\">'+(waiting===b.id?'Nhấn phím…':nameKey(draft[b.id]))+'</button></div>').join('')+\n"+
 "        '<p class=\"note\" id=\"pkmsvv-bind-error\" role=\"status\"></p><div class=\"row wrap\" style=\"gap:8px\"><button type=\"button\" class=\"btn gold\" id=\"pkmsvv-bind-save\">Lưu phím</button><button type=\"button\" class=\"btn\" id=\"pkmsvv-bind-cancel\">Hủy</button><button type=\"button\" class=\"btn ghost\" id=\"pkmsvv-bind-reset\">Mặc định</button></div>';\n"+
 "      root.querySelectorAll('[data-key-action]').forEach(el=>{el.onclick=()=>{waiting=el.dataset.keyAction;print();};});\n"+
 "      root.querySelector('#pkmsvv-bind-save').onclick=()=>{waiting=null;G.Settings.set('keys',draft);G.UI.toast('Đã lưu phím điều khiển');render();};\n"+
 "      root.querySelector('#pkmsvv-bind-cancel').onclick=()=>{waiting=null;render();};\n"+
 "      root.querySelector('#pkmsvv-bind-reset').onclick=()=>{waiting=null;draft=Object.assign({},G.Input.DEFAULT_KEYS);print();};\n"+
 "    };\n"+
 "    const onKey=e=>{\n"+
 "      if(!waiting||!isOpen()||tab!=='ctl')return;\n"+
 "      e.preventDefault();e.stopImmediatePropagation();\n"+
 "      const code=(e.code||'').toLowerCase();\n"+
 "      if(code==='escape'){waiting=null;print();return;}\n"+
 "      if(e.ctrlKey||e.metaKey||e.altKey||/^(shift|control|alt|meta|os|f[1-9]|f1[0-9]|f2[0-4])/.test(code)||!code)return;\n"+
 "      const conflict=Object.keys(draft).find(k=>k!==waiting&&draft[k]===code);\n"+
 "      if(conflict){const target=waiting;waiting=null;print();root.querySelector('#pkmsvv-bind-error').textContent='Phím này đã dùng cho '+labels[conflict]+'. Hãy chọn phím khác cho '+labels[target]+'.';return;}\n"+
 "      draft[waiting]=code;waiting=null;print();\n"+
 "    };\n"+
 "    const listen=e=>onKey(e);\n"+
 "    // Capture only once per instance; observer cleanup on controls tab replacement.\n"+
 "    document.addEventListener('keydown',listen,true);\n"+
 "    const observer=new MutationObserver(()=>{if(!root.isConnected){document.removeEventListener('keydown',listen,true);observer.disconnect();}});\n"+
 "    observer.observe(box,{childList:true});\n"+
 "    print();\n"+
 "  }\n\n  function renderAccount");
// Ensure a fixed linebreak instead of auto word-wrap for both login and main-menu title.
patch('dev.html',
 '<div class="t1" translate="no">Pokémon Sống Sót</div>',
 '<div class="t1 pkmsvv-logo" translate="no"><span>Pokémon</span><span>Sống Sót</span></div>');
patch('dev.html',
 '<div class="t1" translate="no">Pokémon Sống Sót<span class="splash" translate="no">',
 '<div class="t1 pkmsvv-logo" translate="no"><span>Pokémon</span><span>Sống Sót</span><span class="splash" translate="no">');
/* Other headings may be generated by upstream Kecleon at build time; only change one if present. */
const htmlFile=path.join(base,'dev.html');
let html=fs.readFileSync(htmlFile,'utf8');
html=html.replace(/<h1 translate="no">Pokémon Sống Sót<\/h1>/g,'<h1 translate="no" class="pkmsvv-logo"><span>Pokémon</span><span>Sống Sót</span></h1>');
fs.writeFileSync(htmlFile,html,'utf8');
fs.appendFileSync(path.join(base,'css/style.css'),
 '\n.pkmsvv-logo{display:flex;flex-direction:column;align-items:center;justify-content:center;white-space:nowrap;max-width:100%;line-height:1.03!important;gap:1px}\n'+
 '.pkmsvv-logo>span:not(.splash){display:block;white-space:nowrap}\n'+
 '#scr-login .pkmsvv-logo{font-size:clamp(27px,8vw,44px);letter-spacing:-.5px}\n'+
 '.menu-left .pkmsvv-logo{font-size:clamp(31px,5vw,59px);letter-spacing:-1px}\n'+
 '#pkmsvv-bindings{border-top:1px solid #536d9b;margin:18px 0 8px;padding-top:6px}\n'+
 '#pkmsvv-bindings .set-row{gap:12px}#pkmsvv-bindings .set-row span{flex:1}\n'+
 '#pkmsvv-bind-error{color:#ffd890;min-height:1.3em}\n','utf8');
console.log('PKMSVV: remappable physical keys + fixed Pokémon/Sống Sót title');
