/* QA accessibility layer for all custom choice overlays.
 * Keyboard: arrows/WASD, Enter/Space, Escape/Backspace and Tab.
 * Controller: D-pad/left stick, A confirm, B back (item B = skip new drop).
 * This module never writes to saves, rewards or multiplayer state.
 */
(function(){
 'use strict';
 if(typeof document==='undefined'||typeof G==='undefined')return;
 const SELECTORS=[
  '#pkmsvv-fusion-guide','#pkmsvv-quick-region','#pkmsvv-pokebox-overlay','#pkmsvv-wiki-overlay','#pkmbx-rank-overlay',
  '#pkmsvv-champion-screen','#pkmsvv-arena-solo-screen','#pkmsvv-champion-entry-pick','#pkmsvv-arena-pvp-pick','#pkmsvv-support-catalog',
  '#pkmsvv-mega-phase1','.pkmsvv-memory-chooser','.pkmsvv-berry-overlay',
  '#pkmsvv-native-choice','#scr-item','#scr-levelup','#scr-bond','.pkmsvv-evo'
 ];
 const NAV='button:not([disabled]),[role="button"]:not([aria-disabled="true"]),a[href],select:not([disabled]),input:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
 const isEditable=el=>!!el&&(/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName||'')||el.isContentEditable);
 function visible(el){
  if(!el||!el.isConnected)return false;
  for(let n=el;n&&n.nodeType===1;n=n.parentElement){
   if(n.hidden||n.getAttribute?.('aria-hidden')==='true'||n.classList?.contains('hidden'))return false;
   const style=typeof getComputedStyle==='function'?getComputedStyle(n):null;
   if(style&&(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'))return false;
  }
  return !el.getClientRects||el.getClientRects().length>0;
 }
 function active(){
  const all=[...document.querySelectorAll(SELECTORS.join(','))].filter(visible);
  if(!all.length)return null;
  // The highest visible overlay must own input, not the screen underneath it.
  return all.sort((a,b)=>{
   const az=parseInt(getComputedStyle(a).zIndex,10)||0,bz=parseInt(getComputedStyle(b).zIndex,10)||0;
   if(az!==bz)return az-bz;
   if(a.contains(b))return -1;
   if(b.contains(a))return 1;
   return a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING? -1:1;
  }).at(-1)||null;
 }
 function controls(root){return root?[...root.querySelectorAll(NAV)].filter(el=>!el.disabled&&visible(el)):[];}
 function setFocus(el){
  if(!el||!visible(el))return false;
  const root=active();
  if(!root||!root.contains(el))return false;
  for(const old of root.querySelectorAll('.pkmsvv-nav-focus'))if(old!==el)old.classList.remove('pkmsvv-nav-focus');
  el.classList.add('pkmsvv-nav-focus');
  if(typeof el.focus==='function')el.focus({preventScroll:true});
  if(typeof el.scrollIntoView==='function')el.scrollIntoView({block:'nearest',inline:'nearest'});
  return true;
 }
 function first(root){
  const opts=controls(root);
  const selected=opts.find(x=>x.matches?.('.pkmbx-team-slot.active,.pkmsvv-quick-region-card:not([disabled]),[aria-selected="true"]'));
  const preferred=root.classList?.contains('pkmsvv-evo')?
  opts.find(x=>x.classList?.contains('pkmsvv-evo-option')&&!x.disabled):null;
 return setFocus(preferred||selected||opts[0]);
 }
 function center(el){
  const r=el.getBoundingClientRect();
  return {x:r.left+r.width/2,y:r.top+r.height/2};
 }
 function move(direction){
  const root=active();if(!root)return false;
  const opts=controls(root);if(!opts.length)return false;
  let selected=document.activeElement;
  if(!opts.includes(selected))return first(root);
  if(isEditable(selected))return false;
  const at=center(selected),vertical=direction==='up'||direction==='down',sign=direction==='right'||direction==='down'?1:-1;
  let next=null,best=Infinity;
  for(const item of opts){
   if(item===selected)continue;
   const pt=center(item),primary=(vertical?pt.y-at.y:pt.x-at.x)*sign;
   if(primary<3)continue;
   const cross=Math.abs(vertical?pt.x-at.x:pt.y-at.y);
   // Prefer aligned controls, but allow moving into the next row/column.
   const score=primary+cross*2.4;
   if(score<best){best=score;next=item;}
  }
  return next?setFocus(next):false;
 }
 // B on an item chooser keeps the equipped item; it no longer targets
 // an invisible third button. Exactly two cards are keyboard/pad-selectable.
 function itemSkip(){
  const scr=document.querySelector('#scr-item');
  const keep=scr?.querySelector('#item-cards.pkmsvv-held-choices .pkmsvv-held-columns .pkmsvv-held-action.is-old');
  if(!visible(scr)||!keep||!visible(keep))return false;
  keep.click();return true;
 }
 function close(root){
  if(!root)return false;
  if(root.id==='scr-item')return itemSkip();
 if(root.classList?.contains('pkmsvv-evo')){
  const keep=root.querySelector('.pkmsvv-evo-skip');
  if(keep&&visible(keep)){keep.click();return true;}
 }
  const explicit=root.querySelector('[data-back]:not([disabled]),#pkmbx-close,#pkmbx-dex-close,#pkmbx-upgrade-close,#pkmbx-rank-close,#pkmsvv-quick-region-close,.pkmsvv-pc-close,[data-mega-close],#pkmsvv-champion-close,#pkmsvv-arena-solo-close,#pkmsvv-champion-entry-cancel,#pkmsvv-arena-pvp-pick-exit');
  if(explicit&&visible(explicit)){explicit.click();return true;}
  if(root.id==='pkmsvv-pokebox-overlay'){G.PKMSVVBoxHubUI?.closeBox?.();return true;}
  if(root.id==='pkmsvv-quick-region'){G.PKMSVVQuickRegion?.close?.();return true;}
  if(root.id==='pkmsvv-wiki-overlay'){G.PKMSVVWiki?.close?.();return true;}
  return false;
 }
 function activate(root){
  const current=document.activeElement,opts=controls(root);
  const selected=opts.includes(current)?current:(opts[0]||null);
  if(!selected)return false;
  if(selected.tagName==='SELECT'||isEditable(selected))return setFocus(selected);
  selected.click();return true;
 }
 function onKey(e){
  if(e.altKey||e.ctrlKey||e.metaKey)return;
  const root=active();if(!root)return;
  const key=String(e.key||'').toLowerCase(),code=e.code||'';
  // During Royale evolution arrows select; WASD keeps moving the fighter.
  if(root.classList?.contains('pkmsvv-evo')&&G.Royale?.active&&
    ['w','a','s','d'].includes(key))return;
  const critical=key==='escape'||key==='backspace'||key==='1'||key==='2';
  if(e.defaultPrevented&&!critical)return;
  if(root.id==='scr-item'&&!(root.contains(document.activeElement)&&isEditable(document.activeElement))){
   const index=key==='1'||code==='Digit1'||code==='Numpad1'?0:
    key==='2'||code==='Digit2'||code==='Numpad2'?1:-1;
   if(index>=0){
    const buttons=root.querySelectorAll('#item-cards.pkmsvv-held-choices .pkmsvv-held-columns .pkmsvv-held-action');
    const button=buttons[index];
    if(button&&visible(button)){e.preventDefault();e.stopImmediatePropagation?.();button.click();}
    return;
   }
  }
  if(key==='tab'){
   const opts=controls(root);if(!opts.length)return;
   const at=opts.indexOf(document.activeElement);
   if(at<0){first(root);e.preventDefault();return;}
   if(e.shiftKey&&at===0){setFocus(opts[opts.length-1]);e.preventDefault();return;}
   if(!e.shiftKey&&at===opts.length-1){setFocus(opts[0]);e.preventDefault();return;}
   return;
  }
  const editing=root.contains(document.activeElement)&&isEditable(document.activeElement);
  if(key==='escape'||key==='backspace'){
   if((key==='escape'||!editing)&&close(root)){e.preventDefault();e.stopImmediatePropagation?.();}return;
  }
  if(editing)return;
  // Some legacy story/menu code can steal focus underneath a newer modal.
  // Route input to the highest overlay anyway, never to that hidden field.
  if(!root.contains(document.activeElement))first(root);
  const dirs={arrowleft:'left',arrowright:'right',arrowup:'up',arrowdown:'down',
   a:'left',d:'right',w:'up',s:'down'};
  if(dirs[key]&&move(dirs[key])){e.preventDefault();e.stopImmediatePropagation?.();return;}
  if(key==='enter'||key===' '){
   if(activate(root)){e.preventDefault();e.stopImmediatePropagation?.();}
  }
 }
 let pending=false,lastRoot=null;
 function sync(){
  pending=false;const root=active();
  if(!root){lastRoot=null;return;}
  const current=document.activeElement;
  if(root!==lastRoot||!root.contains(current)||!visible(current))first(root);
  lastRoot=root;
 }
 function queue(){if(pending)return;pending=true;requestAnimationFrame(sync);}
 let lastDirection=null,lastMove=0,prevConfirm=false,prevBack=false,releaseGate=false;
 function pollModal(){
  const pads=typeof navigator!=='undefined'&&navigator.getGamepads?.();
  const pad=pads&&[...pads].find(p=>p?.connected);
  if(!pad)return false;
  const pressed=index=>!!pad.buttons?.[index]&&(pad.buttons[index].pressed||pad.buttons[index].value>.5);
  const map=G.PKMSVVPadOrb?.bindings?.()||{};
  const confirm=Number.isInteger(map.confirm)?map.confirm:0;
  const back=Number.isInteger(map.back)?map.back:1;
  const left=pressed(14)||Number(pad.axes?.[0])<-.55;
  const right=pressed(15)||Number(pad.axes?.[0])>.55;
  const up=pressed(12)||Number(pad.axes?.[1])<-.55;
  const down=pressed(13)||Number(pad.axes?.[1])>.55;
  const evo=active()?.classList?.contains('pkmsvv-evo')&&G.Royale?.active;
  // D-pad navigates the live evolution overlay; left stick stays movement.
  const dir=evo?(pressed(14)?'left':pressed(15)?'right':pressed(12)?'up':pressed(13)?'down':null):
   left?'left':right?'right':up?'up':down?'down':null;
  const now=typeof performance!=='undefined'?performance.now():Date.now();
  if(dir&&(dir!==lastDirection||now-lastMove>=210)){move(dir);lastMove=now;}
  lastDirection=dir;
  const root=active(),a=pressed(confirm),b=pressed(back);
  if(root){
   if(a&&!prevConfirm)activate(root);
   if(b&&!prevBack)close(root);
  }
  prevConfirm=a;prevBack=b;return true;
 }
 function installPad(){
  const pad=G.Pad;
  if(!pad||typeof pad.poll!=='function'||pad.poll._pkmsvvModalQA)return false;
  const original=pad.poll;
  const wrapped=function(...args){
   const root=active();
   if(root){
    if(root.classList?.contains('pkmsvv-evo')&&G.Royale?.active){
     const result=original.apply(this,args);releaseGate=true;pollModal();return result;
    }
    releaseGate=true;pollModal();return;
   }
   if(releaseGate){
    const pads=typeof navigator!=='undefined'&&navigator.getGamepads?.();
    const busy=pads&&[...pads].some(p=>p?.connected&&p.buttons?.some(b=>b.pressed||b.value>.5));
    if(busy)return;
    releaseGate=false;lastDirection=null;prevBack=false;prevConfirm=false;
   }
   return original.apply(this,args);
  };
  wrapped._pkmsvvModalQA=true;
  pad.poll=wrapped;return true;
 }
 // Window capture runs before legacy document handlers that otherwise steal
 // Escape and focus the hidden story-name input behind the Region overlay.
 (typeof window!=='undefined'?window:document).addEventListener('keydown',onKey,true);
 document.addEventListener('focusin',e=>{
  const root=active();
  if(root&&!root.contains(e.target))queue();
 },true);
 if(typeof MutationObserver==='function')new MutationObserver(records=>{
  if(records.some(r=>r.type==='childList'||r.attributeName==='hidden'||r.attributeName==='class'))queue();
 }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 // Also install when the base gamepad initializes later than the QA scripts.
 if(!installPad()){
  let tries=0;
  const retry=()=>{if(installPad()||++tries>120)return;requestAnimationFrame(retry);};
  requestAnimationFrame(retry);
 }
 document.addEventListener('DOMContentLoaded',queue,{once:true});queue();
 G.PKMSVVModalNavQA={active,controls,first,move,close,itemSkip,installPad,onKey,pollModal};
})();
