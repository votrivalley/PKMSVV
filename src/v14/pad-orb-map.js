/* v1.4 — device-local controller mapping for manual skill and active Orbs.
 * Keep UI controls A/Start, shoulder movement and input gamepad navigation.
 * Only currently-free gameplay buttons B/X/Y/L3/R3 are available.
 */
G.PKMSVVPadOrb=(()=>{
  const KEY='pkmsvvPadMap';
  const DEFAULT=Object.freeze({dash:2,use:3,next:1});
  const BUTTONS=[1,2,3,10,11];
  const NAMES={1:'B / ○',2:'X / □',3:'Y / △',10:'L3',11:'R3'};
  const L=(vi,en)=>G.I18n&&G.I18n.lang==='vi'?vi:en;
  const valid=o=>o&&typeof o==='object'&&['dash','use','next'].every(k=>Number.isInteger(o[k])&&BUTTONS.includes(o[k]))
    &&new Set([o.dash,o.use,o.next]).size===3;
  function bindings(){
    const saved=G.Settings.get(KEY);
    return valid(saved)?{dash:saved.dash,use:saved.use,next:saved.next}:{...DEFAULT};
  }
  function describe(key){return NAMES[bindings()[key]]||'?';}
  function mount(box){
    const previous=box.querySelector('#pkmsvv-pad-orb-map');if(previous)previous.remove();
    const root=document.createElement('section');
    root.id='pkmsvv-pad-orb-map';
    root.setAttribute('translate','no');
    box.appendChild(root);
    let draft=bindings();
    const labels={
      dash:L('Kỹ năng chủ động (lao tới)','Active skill / Dash'),
      use:L('Sử dụng Orb đã chọn','Use selected Orb'),
      next:L('Chuyển Orb','Switch Orb')
    };
    function render(){
      root.innerHTML='<h3 class="set-h">'+L('Gán nút tay cầm','Controller button mapping')+'</h3>'+
        '<p class="sub">'+L('Chỉ khi đang chơi. Nút A, Start và điều khiển menu không thay đổi; lưu riêng trên thiết bị.','Gameplay only. A, Start, and menu navigation are unchanged; mappings stay on this device.')+'</p>'+
        ['dash','use','next'].map(k=>
          '<label class="set-row"><span>'+labels[k]+'</span>'+
          '<select class="btn small pkmsvv-pad-select" data-padorb="'+k+'">'+
          BUTTONS.map(i=>'<option value="'+i+'"'+(draft[k]===i?' selected':'')+'>'+NAMES[i]+'</option>').join('')+
          '</select></label>').join('')+
        '<p class="note" id="pkmsvv-pad-orb-message" role="status"></p>'+
        '<div class="row wrap" style="gap:8px">'+
        '<button class="btn gold small" type="button" id="pkmsvv-pad-orb-save">'+L('Lưu nút tay cầm','Save controller buttons')+'</button>'+
        '<button class="btn small" type="button" id="pkmsvv-pad-orb-reset">'+L('Mặc định','Defaults')+'</button></div>';
      root.querySelectorAll('[data-padorb]').forEach(el=>el.onchange=()=>{draft[el.dataset.padorb]=Number(el.value);});
      root.querySelector('#pkmsvv-pad-orb-save').onclick=()=>{
        const message=root.querySelector('#pkmsvv-pad-orb-message');
        if(!valid(draft)){
          message.textContent=L('Ba hành động phải dùng ba nút khác nhau.','Assign three different buttons to these actions.');
          return;
        }
        G.Settings.set(KEY,{...draft});
        G.UI.toast(L('Đã lưu nút tay cầm','Controller bindings saved'));
        render();
      };
      root.querySelector('#pkmsvv-pad-orb-reset').onclick=()=>{
        draft={...DEFAULT};G.Settings.set(KEY,{...DEFAULT});render();
        G.UI.toast(L('Đã khôi phục nút tay cầm mặc định','Default controller buttons restored'));
      };
    }
    render();
  }
  return {KEY,DEFAULT,BUTTONS,bindings,describe,mount,valid};
})();
