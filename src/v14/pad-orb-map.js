/* v1.4 — two independent controller actions, no Orb selection. */
G.PKMSVVPadOrb=(()=>{
 const KEY='pkmsvvPadMap';
 const DEFAULT=Object.freeze({dash:2,use:3}); // X dash, Y next Orb in queue
 const BUTTONS=[1,2,3,10,11],NAMES={1:'B / ○',2:'X / □',3:'Y / △',10:'L3',11:'R3'};
 const tr=(vi,en)=>G.I18n&&G.I18n.lang==='vi'?vi:en;
 function valid(o){return !!o&&typeof o==='object'&&Number.isInteger(o.dash)&&Number.isInteger(o.use)&&o.dash!==o.use&&BUTTONS.includes(o.dash)&&BUTTONS.includes(o.use);}
 function bindings(){const a=G.Settings.get(KEY);return valid(a)?{dash:a.dash,use:a.use}:{...DEFAULT};}
 function describe(key){return NAMES[bindings()[key]]||'?';}
 function mount(box){
  const old=box.querySelector('#pkmsvv-pad-orb-map');if(old)old.remove();
  const root=document.createElement('section');root.id='pkmsvv-pad-orb-map';root.setAttribute('translate','no');box.appendChild(root);
  let draft=bindings();
  const labels={dash:tr('Kỹ năng chủ động / Lao tới','Active skill / Dash'),use:tr('Dùng Orb đầu hàng chờ','Use the first queued Orb')};
  function render(){
   root.innerHTML='<h3 class="set-h">'+tr('Gán nút tay cầm','Controller button mapping')+'</h3>'+
    '<p class="sub">'+tr('Orb tự dùng theo thứ tự nhặt được. Không cần nút chuyển Orb.','Orbs activate in pickup order. No Orb switching button needed.')+'</p>'+
    ['dash','use'].map(k=>'<label class="set-row"><span>'+labels[k]+'</span><select class="btn small" data-padorb="'+k+'">'+
     BUTTONS.map(i=>'<option value="'+i+'"'+(draft[k]===i?' selected':'')+'>'+NAMES[i]+'</option>').join('')+'</select></label>').join('')+
    '<p class="note" id="pkmsvv-pad-orb-message" role="status"></p><div class="row wrap" style="gap:8px">'+
    '<button class="btn gold small" type="button" id="pkmsvv-pad-orb-save">'+tr('Lưu nút tay cầm','Save controller buttons')+'</button>'+
    '<button class="btn small" type="button" id="pkmsvv-pad-orb-reset">'+tr('Mặc định','Defaults')+'</button></div>';
   root.querySelectorAll('[data-padorb]').forEach(el=>el.onchange=()=>{draft[el.dataset.padorb]=Number(el.value);});
   root.querySelector('#pkmsvv-pad-orb-save').onclick=()=>{
    if(!valid(draft)){root.querySelector('#pkmsvv-pad-orb-message').textContent=tr('Hai hành động phải dùng hai nút khác nhau.','Choose different buttons for the two actions.');return;}
    G.Settings.set(KEY,{...draft});G.UI.toast(tr('Đã lưu nút tay cầm','Controller controls saved'));render();
   };
   root.querySelector('#pkmsvv-pad-orb-reset').onclick=()=>{draft={...DEFAULT};G.Settings.set(KEY,{...DEFAULT});render();};
  }render();
 }
 return {KEY,DEFAULT,BUTTONS,valid,bindings,describe,mount};
})();