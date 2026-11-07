/* QA accessibility layer for all custom choice overlays.
 * Keyboard: arrows/WASD, Enter/Space, Escape/Backspace and Tab.
 * Controller: D-pad/left stick, A confirm, B back (item B = skip new drop).
 * This module never writes to saves, rewards or multiplayer state.
 */
(function(){
 'use strict';
 if(typeof document==='undefined'||typeof G==='undefined')return;
 const SELECTORS=[
  '#pkmsvv-quick-region','#pkmsvv-pokebox-overlay','#pkmsvv-wiki-overlay','#pkmbx-rank-overlay',
  '#pkmsvv-champion-screen','#pkmsvv-arena-solo-screen','#pkmsvv-support-catalog',
  '#pkmsvv-mega-phase1','.pkmsvv-memory-chooser','.pkmsvv-berry-overlay',
  '#pkmsvv-native-choice','#scr-item','#scr-levelup','#scr-bond'
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
  return setFocus(selected||opts[0]);
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
 function itemSkip(){
  const scr=document.querySelector('#scr-item');
  const buttons=scr?.querySelectorAll('#item-cards.pkmsvv-held-choices .pkmsvv-held-actions .pkmsvv-held-action')||[];
  const skip=buttons[2];
  if(!visible(scr)||!skip||!visible(skip))return false;
  skip.click();return true;
 }
 function close(root){
  if(!root)return false;
  if(root.id==='scr-item')return itemSkip();
  const explicit=root.querySelector('[data-back]:not([disabled]),#pkmbx-close,#pkmbx-dex-close,#pkmbx-upgrade-close,#pkmbx-rank-close,#pkmsvv-quick-region-close,.pkmsvv-pc-close,[data-mega-close],#pkmsvv-champion-close,#pkmsvv-arena-solo-close');
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
  // Native key handlers may already call preventDefault for Escape or Digit3.
  // These safety-critical modal actions must still reach the top overlay.
  const critical=key==='escape'||key==='backspace'||key==='3'||code==='Digit3'||code==='Numpad3';
  if(e.defaultPrevented&&!critical)return;
  // The item chooser renders a visible [3] label, which previously was inert.
  // Only intercept it while the actual held-item selection is showing.
  if(root.id==='scr-item'&&!(root.contains(document.activeElement)&&isEditable(document.activeElement))&&
    (key==='3'||code==='Digit3'||code==='Numpad3')){
   if(itemSkip()){e.preventDefault();e.stopImmediatePropagation?.();}return;
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
  const dir=left?'left':right?'right':up?'up':down?'down':null;
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
   if(root){releaseGate=true;pollModal();return;}
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
