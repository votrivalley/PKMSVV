/* QA accessibility layer for all custom choice overlays.
 * Keyboard: arrows/WASD, Enter/Space, Escape/Backspace and Tab.
 * Controller: D-pad/left stick, A confirm, B back (item B = skip new drop).
 * This module never writes to saves, rewards or multiplayer state.
 */
(function(){
 'use strict';
 if(typeof document==='undefined'||typeof G==='undefined')return;
 const SELECTORS=[
  '#pkmsvv-forget-skill','#pkmsvv-fusion-guide','#pkmsvv-quick-region','#pkmsvv-pokebox-overlay','#pkmsvv-wiki-overlay','#pkmbx-rank-overlay',
  '#pkmsvv-champion-screen','#pkmsvv-arena-solo-screen','#pkmsvv-champion-entry-pick','#pkmsvv-arena-pvp-pick','#pkmsvv-support-catalog',
  '#pkmsvv-mega-phase1','.pkmsvv-memory-chooser','.pkmsvv-berry-overlay',
  '#pkmsvv-native-choice','#scr-item','#scr-levelup','#scr-bond','.pkmsvv-evo','#pkmsvv-berry-team-result'
 ];
 const NAV='button:not([disabled]),[role="button"]:not([aria-disabled="true"]),a[href],select:not([disabled]),input:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
 const isEditable=el=>!!el&&(/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName||'')||el.isContentEditable);
 const OVERLAYS=SELECTORS.join(',');
 let cachedRoot=null,dirty=true,scanCount=0,cacheEnabled=true;
 let levelCursor=-1,levelSession=null;
 let previousLevelButtons=[false,false,false,false];
 function installLevelPages(){
  const ui=G.RunUI;
  if(!ui||typeof ui.showLevelUp!=='function')return false;
  if(ui.showLevelUp._pkmsvvThreePage)return true;
  const original=ui.showLevelUp;
  const wrapped=function(level,offers,complete,...rest){
   if(!Array.isArray(offers)||offers.length<=3){
    levelSession=null;return original.call(this,level,offers,complete,...rest);
   }
   const session={ui:this,level,offers:offers.slice(),rest,page:0};
   session.finish=(choice,...args)=>{
    if(levelSession===session)levelSession=null;
    return complete?.(choice,...args);
   };
   levelSession=session;
   return original.call(this,level,session.offers.slice(0,3),session.finish,...rest);
  };
  wrapped._pkmsvvThreePage=true;
  wrapped._pkmsvvRenderPage=(session)=>original.call(session.ui,session.level,
   session.offers.slice(session.page*3,session.page*3+3),session.finish,...session.rest);
  ui.showLevelUp=wrapped;return true;
 }
 function levelPage(root){
  const session=levelSession;
  if(root?.id!=='scr-levelup'||!session||session.offers.length<=3)return false;
  const pages=Math.ceil(session.offers.length/3);
  session.page=(session.page+1)%pages;
  G.RunUI.showLevelUp._pkmsvvRenderPage(session);
  root.querySelector?.('#cards')?.setAttribute('data-pkmsvv-page-label',(session.page+1)+' / '+pages);
  return true;
 }
 function visible(el){
  if(!el||!el.isConnected)return false;
  for(let n=el;n&&n.nodeType===1;n=n.parentElement){
   if(n.hidden||n.getAttribute?.('aria-hidden')==='true'||n.classList?.contains('hidden'))return false;
   const style=typeof getComputedStyle==='function'?getComputedStyle(n):null;
   if(style&&(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'))return false;
  }
  return !el.getClientRects||el.getClientRects().length>0;
 }
 // Native level-up cards must not be mutated or focused by the DOM nav.
 // Legacy PadDialogs observers can enter an infinite microtask cycle after
 // class, role, tabindex or browser-focus changes inside #scr-levelup.
 function levelCards(root){return [...(root?.querySelectorAll('#cards .card')||[])].filter(visible);}
 function levelSelect(root,index){
  const cards=levelCards(root);if(!cards.length)return false;
  levelCursor=((index%cards.length)+cards.length)%cards.length;
  root.setAttribute('data-pkmsvv-nav-index',String(levelCursor));
  return true;
 }
 function scanActive(){
  scanCount++;
  const all=[...document.querySelectorAll(OVERLAYS)].filter(visible);
  if(!all.length)return null;
  // Resolve z-order only when a modal opens/closes, not in every game tick.
  return all.sort((a,b)=>{
   const az=parseInt(getComputedStyle(a).zIndex,10)||0,bz=parseInt(getComputedStyle(b).zIndex,10)||0;
   if(az!==bz)return az-bz;
   if(a.contains(b))return -1;
   if(b.contains(a))return 1;
   return a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1;
  }).at(-1)||null;
 }
 function active(cached=false){
  // Reversible A/B for regression after the v31 gamepad DOM cache patch.
  if(!cacheEnabled)return scanActive();
  // Gamepad polling runs every native battle frame; query/layout inspection
  // must be cached there. Explicit UI lookups still rescan synchronously:
  // an item/Region dialog can be opened just before a key event, before a
  // MutationObserver microtask has run. Never steal input from a fresh modal.
  if(cached&&!dirty){
   if(!cachedRoot)return null;
   if(cachedRoot.isConnected&&!cachedRoot.hidden&&
      cachedRoot.getAttribute?.('aria-hidden')!=='true'&&
      !cachedRoot.classList?.contains('hidden'))return cachedRoot;
  }
  dirty=false;
  cachedRoot=scanActive();
  return cachedRoot;
 }
 function invalidate(){dirty=true;queue();}
 function controls(root){
  if(!root)return [];
  if(root.id==='scr-levelup'){
   const candidates=[...levelCards(root),...root.querySelectorAll(NAV)];
   return [...new Set(candidates)].filter(el=>!el.disabled&&visible(el));
  }
  return [...root.querySelectorAll(NAV)].filter(el=>!el.disabled&&visible(el));
 }
 function setFocus(el,reveal=false){
  if(!el||!visible(el))return false;
  const root=active();
  if(!root||!root.contains(el))return false;
  if(root.id==='scr-levelup'){
   const index=levelCards(root).indexOf(el);
   return index>=0?levelSelect(root,index):false;
  }
  for(const old of root.querySelectorAll('.pkmsvv-nav-focus'))if(old!==el)old.classList.remove('pkmsvv-nav-focus');
  el.classList.add('pkmsvv-nav-focus');
  if(typeof el.focus==='function')el.focus({preventScroll:true});
  // Initial focus and background DOM refresh must NEVER scroll a user-opened
   // window/menu back to the top. Scroll only for an actual D-pad/key move.
   if(reveal&&typeof el.scrollIntoView==='function')
    el.scrollIntoView({block:'nearest',inline:'nearest'});
  return true;
 }
 function first(root){
  if(root?.id==='scr-levelup')return levelSelect(root,0);
  const opts=controls(root);
  const selected=opts.find(x=>x.matches?.('.pkmbx-team-slot.active,.pkmsvv-forget-choice:first-child,.pkmsvv-quick-region-card:not([disabled]),[aria-selected="true"]'));
  const preferred=root.id==='scr-levelup'?
   opts.find(x=>x.matches?.('#cards .card')):root.classList?.contains('pkmsvv-evo')?
   opts.find(x=>x.classList?.contains('pkmsvv-evo-option')&&!x.disabled):null;
 return setFocus(preferred||selected||opts[0]);
 }
 function center(el){
  const r=el.getBoundingClientRect();
  return {x:r.left+r.width/2,y:r.top+r.height/2};
 }
 function move(direction){
  const root=active();if(!root)return false;
  if(root.id==='scr-levelup'){
   const step=direction==='down'||direction==='right'?1:-1;
   return levelSelect(root,levelCursor<0?0:levelCursor+step);
  }
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
  return next?setFocus(next,true):false;
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
  if(root.id==='pkmsvv-forget-skill'){
   const back=root.querySelector('.pkmsvv-forget-close');
   if(back&&visible(back)){back.click();return true;}
  }
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
  if(root?.id==='scr-levelup'){
   const cards=levelCards(root);if(!cards.length)return false;
   const index=levelCursor>=0&&levelCursor<cards.length?levelCursor:0;
   if(typeof G.RunUI?.pick==='function')G.RunUI.pick(index);
   else cards[index].click();
   return true;
  }
  const current=document.activeElement,opts=controls(root);
  const selected=opts.includes(current)?current:(opts[0]||null);
  if(!selected)return false;
  if(selected.tagName==='SELECT'||isEditable(selected))return setFocus(selected);
  if(root.id==='scr-levelup'&&selected.matches?.('#cards .card')){
   // Use the exact native selection callback, preserving level-up queue and
   // 3-card anti-double-pick logic in Solo, Arena and Co-op.
   const options=[...root.querySelectorAll('#cards .card')];
   const index=options.indexOf(selected);
   if(index<0)return false;
   if(typeof G.RunUI?.pick==='function')G.RunUI.pick(index);
   else selected.click();
   return true;
  }
  selected.click();return true;
 }
 function onKey(e){
  if(e.altKey||e.ctrlKey||e.metaKey)return;
  const root=active();if(!root)return;
  const key=String(e.key||'').toLowerCase(),code=e.code||'';
  // Keep movement keys free while skill choices are open.
  if((root.id==='scr-levelup'||root.id==='pkmsvv-forget-skill')&&
   ['arrowleft','arrowright','arrowup','arrowdown','w','a','s','d'].includes(key))return;
  if(root.id==='pkmsvv-forget-skill'&&['1','2','3'].includes(key)){
   if(G.PKMSVVForgetSkill?.selectSlot?.(Number(key)-1)){
    e.preventDefault();e.stopImmediatePropagation?.();
   }
   return;
  }
  if(root.id==='pkmsvv-forget-skill'&&(key==='4'||key==='pagedown')){
   if(G.PKMSVVForgetSkill?.nextPage?.()){
    e.preventDefault();e.stopImmediatePropagation?.();
   }
   return;
  }
  // Live evolution: arrows/D-pad select; WASD/left stick still move the fighter.
  if(root.classList?.contains('pkmsvv-evo-live')&&
    ['w','a','s','d'].includes(key))return;
  const critical=key==='escape'||key==='backspace'||key==='1'||key==='2'||
    (root.id==='scr-levelup'&&key==='tab')||
    (root.classList?.contains('pkmsvv-evo')&&(key==='enter'||key===' '));
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
  if(root.classList?.contains('pkmsvv-evo-live')&&
     ['1','2','3'].includes(key)&&
     root.querySelector('.pkmsvv-evo-live-cards')?.dataset?.stage==='replacement'){
    const option=root.querySelector('[data-evo-choice="'+key+'"]');
    if(option&&visible(option)){e.preventDefault();e.stopImmediatePropagation?.();option.click();}
    return;
  }
  if(root.id==='scr-levelup'&&key==='tab'){
   if(move(e.shiftKey?'up':'down')){
    e.preventDefault();e.stopImmediatePropagation?.();
   }
   return;
  }
  if(key==='tab'){
   const opts=controls(root);if(!opts.length)return;
   const at=opts.indexOf(document.activeElement);
   if(at<0){first(root);e.preventDefault();return;}
   if(e.shiftKey&&at===0){setFocus(opts[opts.length-1],true);e.preventDefault();return;}
   if(!e.shiftKey&&at===opts.length-1){setFocus(opts[0],true);e.preventDefault();return;}
   return;
  }
  const editing=root.contains(document.activeElement)&&isEditable(document.activeElement);
  if(key==='escape'||key==='backspace'){
   if((key==='escape'||!editing)&&close(root)){e.preventDefault();e.stopImmediatePropagation?.();}return;
  }
  if(editing)return;
  // Some legacy story/menu code can steal focus underneath a newer modal.
  // Route input to the highest overlay anyway, never to that hidden field.
  if(root.id!=='scr-levelup'&&!root.contains(document.activeElement))first(root);
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
  if(!root){lastRoot=null;levelCursor=-1;return;}
  // Native RunUI already renders the three level-up choices and handles 1/2/3.
  // Auto-focusing a newly mounted .card inside the RAF sync causes recursive
  // focus/MutationObserver callbacks and can lock the entire renderer.
  // Leave focus untouched until an ACTUAL keyboard/gamepad navigation input.
  if(root.id==='scr-levelup'){
   if(lastRoot!==root){
    levelCursor=-1;
    root.removeAttribute('data-pkmsvv-nav-index');
   }
   lastRoot=root;return;
  }
  const current=document.activeElement;
  if(root!==lastRoot||!root.contains(current)||!visible(current))first(root);
  lastRoot=root;
 }
 function queue(){if(pending)return;pending=true;requestAnimationFrame(sync);}
 let lastDirection=null,lastMove=0,prevConfirm=false,prevBack=false,releaseGate=false;
 let prevL1=false,prevR1=false;
 function pollModal(){
  const pads=typeof navigator!=='undefined'&&navigator.getGamepads?.();
  const pad=pads&&[...pads].find(p=>p?.connected);
  if(!pad){prevL1=false;prevR1=false;return false;}
  const pressed=index=>!!pad.buttons?.[index]&&(pad.buttons[index].pressed||pad.buttons[index].value>.5);
  const map=G.PKMSVVPadOrb?.bindings?.()||{};
  // L1/R1 = standard Gamepad API buttons 4/5. Consume only while the
  // Pokémon hub owns the modal; outside it, native gameplay controls and
  // remapped buttons remain unchanged. Trigger on the DOWN edge only.
  const shoulderL=pressed(4),shoulderR=pressed(5);
  const pressedL=shoulderL&&!prevL1,pressedR=shoulderR&&!prevR1;
  prevL1=shoulderL;prevR1=shoulderR;
  const pokemon=document.querySelector('#pkmsvv-pokebox-overlay');
  // On a NEW shoulder press, resolve the newly opened PokéBox
  // synchronously; its DOM MutationObserver may not have fired yet.
  // Held/idle frames keep the cached zero-layout path.
  const owns=active(!(pressedL||pressedR)),inside=!!pokemon?.isConnected&&
   !!owns&&(owns===pokemon||pokemon.contains(owns));
  if(inside&&typeof G.PKMSVVBoxHubUI?.cycleTab==='function'&&
     (pressedL||pressedR)){
    G.PKMSVVBoxHubUI.cycleTab(pressedR?1:-1);
    lastDirection=null;
    return true;
  }
  const level=active(true);
  if(level?.id==='pkmsvv-forget-skill'){
   // The same live combat shortcut as level-up: R+X/Y/B, A next page.
   // Neither D-pad nor analog directions navigate or select this overlay.
   const buttons=[pressed(2),pressed(3),pressed(1),pressed(0)];
   const edges=buttons.map((on,i)=>on&&!previousLevelButtons[i]);
   previousLevelButtons=buttons;
   if(edges[3])G.PKMSVVForgetSkill?.nextPage?.();
   if(shoulderR){
    const index=edges.findIndex((on,i)=>i<3&&on);
    if(index>=0)G.PKMSVVForgetSkill?.selectSlot?.(index);
   }
   prevConfirm=buttons[3];prevBack=buttons[2];
   return true;
  }
  if(level?.id==='scr-levelup'){
   // Standard Gamepad API: R=5, X=2, Y=3, B=1, A=0.
   // R+X/Y/B select three visible cards; A pages; no stick/D-pad capture.
   const buttons=[pressed(2),pressed(3),pressed(1),pressed(0)];
   const edges=buttons.map((on,i)=>on&&!previousLevelButtons[i]);
   previousLevelButtons=buttons;
   if(level.getAttribute?.('data-pkmsvv-pad-mode')!=='true')
    level.setAttribute('data-pkmsvv-pad-mode','true');
   if(levelSession?.offers.length>3)
    level.querySelector?.('#cards')?.setAttribute('data-pkmsvv-page-label',
     (levelSession.page+1)+' / '+Math.ceil(levelSession.offers.length/3));
   if(edges[3])levelPage(level);
   if(shoulderR){
    const index=edges.findIndex((on,i)=>i<3&&on);
    if(index>=0){
     const cards=levelCards(level);
     if(index<cards.length){
      if(typeof G.RunUI?.pick==='function')G.RunUI.pick(index);
      else cards[index].click();
     }
    }
   }
   prevConfirm=buttons[3];prevBack=buttons[2];return true;
  }
  previousLevelButtons=[false,false,false,false];
  const confirm=Number.isInteger(map.confirm)?map.confirm:0;
  const back=Number.isInteger(map.back)?map.back:1;
  const left=pressed(14)||Number(pad.axes?.[0])<-.55;
  const right=pressed(15)||Number(pad.axes?.[0])>.55;
  const up=pressed(12)||Number(pad.axes?.[1])<-.55;
  const down=pressed(13)||Number(pad.axes?.[1])>.55;
  const evo=active(true)?.classList?.contains('pkmsvv-evo-live');
  // D-pad navigates the live evolution overlay; left stick stays movement.
  const dir=evo?(pressed(14)?'left':pressed(15)?'right':pressed(12)?'up':pressed(13)?'down':null):
   left?'left':right?'right':up?'up':down?'down':null;
  const now=typeof performance!=='undefined'?performance.now():Date.now();
  if(dir&&(dir!==lastDirection||now-lastMove>=210)){move(dir);lastMove=now;}
  lastDirection=dir;
  const root=active(true),a=pressed(confirm),b=pressed(back);
  if(root){
   if(a&&!prevConfirm)activate(root);
   if(b&&!prevBack)close(root);
  }
  prevConfirm=a;prevBack=b;return true;
 }
 // A legacy PadDialogs MutationObserver also calls Pad.focusFirst and
 // Pad.focusElement whenever Arena's bracket DOM redraws. Those native
 // methods scrollIntoView, fighting the user's mouse wheel in windowed mode.
 // Route automatic focus through our preventScroll-first controller layer.
 function installFocusGuard(){
  const pad=G.Pad;
  if(!pad)return false;
  const firstOld=pad.focusFirst;
  if(typeof firstOld==='function'&&!firstOld._pkmsvvNoAutoScroll){
   const wrapped=function(...args){
    const root=active();
    if(root){
     const current=document.activeElement;
     if(current&&root.contains(current)&&visible(current))return true;
     return first(root);
    }
    return firstOld.apply(this,args);
   };
   wrapped._pkmsvvNoAutoScroll=true;pad.focusFirst=wrapped;
  }
  const focusOld=pad.focusElement;
  if(typeof focusOld==='function'&&!focusOld._pkmsvvNoAutoScroll){
   const wrapped=function(el,...args){
    const root=active();
    if(root&&el&&root.contains(el)){
     if(root.contains(document.activeElement)&&visible(document.activeElement))
      return true; // preserve user's current wheel position
     return setFocus(el,false);
    }
    return focusOld.call(this,el,...args);
   };
   wrapped._pkmsvvNoAutoScroll=true;pad.focusElement=wrapped;
  }
  return true;
 }
 function installPad(){
  const pad=G.Pad;
  if(!pad||typeof pad.poll!=='function'||pad.poll._pkmsvvModalQA)return false;
  installFocusGuard();
  const original=pad.poll;
  const wrapped=function(...args){
   const root=active(true);
   if(root){
    if(root.classList?.contains('pkmsvv-evo-live')||
       (root.id==='pkmsvv-forget-skill'&&root.classList?.contains('pkmsvv-forget-competitive'))){
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
 // Watch relevant modal mutations only. Native battle HUD/particles may
 // mutate the DOM thousands of times without showing any modal. Those
 // changes must NOT trigger a full query/layout scan in the next RAF.
 // Only modal OPEN/CLOSE/visibility changes invalidate the cache.
 // Native level-up cards continuously update their internal DOM during
 // selection. Treating *every descendant mutation* as a new modal caused
 // per-frame full CSS/layout scans and could lock the game at level-up.
 const modalChange=r=>{
  const target=r.target;
  if(r.type==='attributes'){
   // Changes to controls INSIDE an already-open popup are not visibility
   // changes. The controller reads its controls live on each real input.
   return !!target?.matches?.(OVERLAYS);
  }
  for(const node of [...(r.addedNodes||[]),...(r.removedNodes||[])]){
   if(node.nodeType!==1)continue;
   if(node.matches?.(OVERLAYS)||node.querySelector?.(OVERLAYS))return true;
  }
  return false;
 };
 if(typeof MutationObserver==='function')new MutationObserver(records=>{
  if(records.some(modalChange))invalidate();
 }).observe(document.body,{childList:true,subtree:true,attributes:true,
  attributeFilter:['hidden','class','style','aria-hidden']});
 // Also install when the base gamepad initializes later than the QA scripts.
 installLevelPages();
 if(!installPad()){
  let tries=0;
  const retry=()=>{if(installPad()||++tries>120)return;requestAnimationFrame(retry);};
  requestAnimationFrame(retry);
 }
 document.addEventListener('DOMContentLoaded',()=>{installLevelPages();queue();},{once:true});queue();
 G.PKMSVVModalNavQA={active,controls,setFocus,first,move,close,itemSkip,
  installPad,installFocusGuard,installLevelPages,levelPage,onKey,pollModal,invalidate,
  setCacheEnabled(on){cacheEnabled=on!==false;dirty=true;return cacheEnabled;},
  get scanCount(){return scanCount;}};
})();
