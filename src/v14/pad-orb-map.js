/* PKMSVV v1.5 unified controls: independent keyboard/controller tabs.
   Only mappings implemented by G.Input and G.Pad are editable. */
G.PKMSVVPadOrb=(()=>{
 const KEY='pkmsvvPadMap';
 const DEFAULT=Object.freeze({dash:2,use:3,pause:9,confirm:0,back:1,reroll:3});
 // 8 (View/Share) is reserved as emergency back; D-pad/sticks remain navigation.
 const BUTTONS=[0,1,2,3,4,5,6,7,9,10,11];
 const NAMES={0:'A / ×',1:'B / ○',2:'X / □',3:'Y / △',4:'LB / L1',5:'RB / R1',6:'LT / L2',7:'RT / R2',9:'Start / Options',10:'L3',11:'R3'};
 const tr=(vi,en)=>G.I18n&&G.I18n.lang==='en'?en:vi;
 const KB_IDS=['up','down','left','right','dash','orb','pause','card1','card2','card3','reroll'];
 const PAD_IDS=['dash','use','pause','confirm','back','reroll'];
 const keyboardDefaults=()=>Object.assign({},G.Input.DEFAULT_KEYS,{orb:'digit5',reroll:'keyr'});
 const keyboardBindings=()=>Object.assign({},keyboardDefaults(),G.Settings.get('keys')||{});
 const merged=o=>Object.assign({},DEFAULT,o||{});
 // Same button may have one in-game action and one menu action (Y: Orb / reroll).
 function valid(o){
  if(!o||typeof o!=='object')return false;
  const b=merged(o);
  if(!PAD_IDS.every(k=>Number.isInteger(b[k])&&BUTTONS.includes(b[k])))return false;
  return [
   ['dash','use','pause'],
   ['confirm','back','pause','reroll']
  ].every(group=>new Set(group.map(k=>b[k])).size===group.length);
 }
 function bindings(){
  const stored=G.Settings.get(KEY);
  return valid(stored)?merged(stored):{...DEFAULT};
 }
 function describe(key){return NAMES[bindings()[key]]||'?';}
 const actionName=(k,keyboard)=>({
  up:tr('Đi lên','Move up'),down:tr('Đi xuống','Move down'),
  left:tr('Sang trái','Move left'),right:tr('Sang phải','Move right'),
  dash:tr('Kỹ năng chủ động','Active skill'),
  orb:tr('Dùng Orb','Use Orb'),use:tr('Dùng Orb','Use Orb'),
  pause:tr('Tạm dừng','Pause'),card1:tr('Thẻ skill 1','Skill card 1'),
  card2:tr('Thẻ skill 2','Skill card 2'),card3:tr('Thẻ skill 3','Skill card 3'),
  reroll:tr('Đổi thẻ','Reroll cards'),
  confirm:tr('Chọn / xác nhận','Select / confirm'),back:tr('Quay lại','Back')
 })[k]||k;
 const printable=k=>({space:'Space',escape:'Esc',arrowup:'↑',arrowdown:'↓',arrowleft:'←',arrowright:'→'}[k]||k.replace(/^key/,'').replace(/^digit/,'').replace(/^numpad/,'Num '));
 const rootId='pkmsvv-control-map';
 let selected='keyboard';
 function mount(box){
  const old=box.querySelector('#'+rootId);if(old)old.remove();
  // Remove older split panels if a future build still inserts them.
  box.querySelector('#pkmsvv-bindings')?.remove();
  box.querySelector('#pkmsvv-pad-orb-map')?.remove();
  const root=document.createElement('section');
  root.id=rootId;root.setAttribute('translate','no');box.appendChild(root);
  let keyDraft=keyboardBindings(),padDraft=bindings(),waiting=null;
  let listener=null;
  const removeListener=()=>{if(listener){document.removeEventListener('keydown',listener,true);listener=null;}};
  const keyValid=draft=>{
   const keys=KB_IDS.map(k=>draft[k]);
   return keys.every(v=>typeof v==='string'&&!!v)&&new Set(keys).size===keys.length;
  };
  function render(){
   waiting=null;removeListener();
   const active=selected;
   root.innerHTML='<h3 class="set-h">'+tr('Gán nút','Button mapping')+'</h3>'+
    '<div class="row pkmsvv-control-tabs" role="tablist">'+
    '<button class="btn small '+(active==='keyboard'?'gold':'')+'" role="tab" aria-selected="'+(active==='keyboard')+'" data-control-tab="keyboard">'+tr('Bàn phím','Keyboard')+'</button>'+
    '<button class="btn small '+(active==='pad'?'gold':'')+'" role="tab" aria-selected="'+(active==='pad')+'" data-control-tab="pad">'+tr('Tay cầm','Controller')+'</button></div>'+
    (active==='keyboard'?
      '<p class="sub">'+tr('Chọn một dòng rồi nhấn phím muốn dùng.','Choose an action, then press its new key.')+'</p>'+
      KB_IDS.map(k=>'<div class="set-row pkmsvv-control-row"><span>'+actionName(k,true)+'</span><button type="button" class="btn small" data-key-action="'+k+'">'+printable(keyDraft[k])+'</button></div>').join(''):
      '<p class="sub">'+tr('Di chuyển: analog trái hoặc D-pad · Ngắm/cuộn: analog phải (cố định).','Move: left stick or D-pad · Aim/scroll: right stick (fixed).')+'</p>'+
      PAD_IDS.map(k=>'<label class="set-row pkmsvv-control-row"><span>'+actionName(k,false)+'</span><select class="btn small" data-padorb="'+k+'">'+
       BUTTONS.map(i=>'<option value="'+i+'"'+(padDraft[k]===i?' selected':'')+'>'+NAMES[i]+'</option>').join('')+'</select></label>').join(''))+
    '<p id="pkmsvv-control-message" class="note" role="status"></p>'+
    '<div class="row wrap pkmsvv-control-actions">'+
    '<button type="button" class="btn gold small" id="pkmsvv-control-save">'+tr('Lưu','Save')+'</button>'+
    '<button type="button" class="btn small" id="pkmsvv-control-cancel">'+tr('Hủy','Cancel')+'</button>'+
    '<button type="button" class="btn ghost small" id="pkmsvv-control-reset">'+tr('Mặc định','Defaults')+'</button></div>';
   root.querySelectorAll('[data-control-tab]').forEach(el=>el.onclick=()=>{selected=el.dataset.controlTab;render();});
   const message=msg=>{root.querySelector('#pkmsvv-control-message').textContent=msg;};
   if(active==='keyboard'){
    root.querySelectorAll('[data-key-action]').forEach(el=>el.onclick=()=>{
     waiting=el.dataset.keyAction;
     root.querySelectorAll('[data-key-action]').forEach(b=>{b.classList.toggle('gold',b.dataset.keyAction===waiting);b.textContent=b.dataset.keyAction===waiting?tr('Nhấn phím…','Press a key…'):printable(keyDraft[b.dataset.keyAction]);});
    });
    listener=e=>{
     if(!waiting||!root.isConnected||!G.SettingsUI.isOpen)return;
     e.preventDefault();e.stopImmediatePropagation();
     const code=(e.code||'').toLowerCase();
     if(code==='escape'){waiting=null;render();return;}
     if(e.ctrlKey||e.altKey||e.metaKey||/^(shift|control|alt|meta|os|f[1-9]|f1[0-9]|f2[0-4])/.test(code)||!code)return;
     const conflict=KB_IDS.find(k=>k!==waiting&&keyDraft[k]===code);
     if(conflict){const target=waiting;waiting=null;render();root.querySelector('#pkmsvv-control-message').textContent=tr('Phím này đang dùng cho ','Key already used for ')+actionName(conflict,true)+'.';return;}
     keyDraft[waiting]=code;waiting=null;render();
    };
    document.addEventListener('keydown',listener,true);
   }else{
    root.querySelectorAll('[data-padorb]').forEach(el=>el.onchange=()=>{padDraft[el.dataset.padorb]=Number(el.value);});
   }
   root.querySelector('#pkmsvv-control-save').onclick=()=>{
    if(active==='keyboard'){
     if(!keyValid(keyDraft)){message(tr('Mỗi hành động cần một phím riêng.','Each action needs its own key.'));return;}
     G.Settings.set('keys',{...keyDraft});
    }else{
     if(!valid(padDraft)){message(tr('Các nút trùng nhau trong cùng chế độ. Hãy chọn lại.','Buttons conflict within a mode. Choose different buttons.'));return;}
     G.Settings.set(KEY,{...padDraft});
    }
    G.UI.toast(tr('Đã lưu nút điều khiển','Controls saved'));render();
   };
   root.querySelector('#pkmsvv-control-cancel').onclick=()=>{
    if(active==='keyboard')keyDraft=keyboardBindings();else padDraft=bindings();
    render();
   };
   root.querySelector('#pkmsvv-control-reset').onclick=()=>{
    if(active==='keyboard')keyDraft=keyboardDefaults();else padDraft={...DEFAULT};
    render();
   };
  }
  // Observe only removal, to avoid accumulating listeners after Settings redraw.
  const parent=box;
  const observer=new MutationObserver(()=>{
   if(!root.isConnected){removeListener();observer.disconnect();}
  });
  observer.observe(parent,{childList:true});
  render();
 }
 return {KEY,DEFAULT,BUTTONS,valid,bindings,describe,mount};
})();
