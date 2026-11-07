/* C — One held item per run: explicit compare / keep / replace / skip.
   Purely an interface over the original G.Items effects and game choice callback.
   No second equip slot, shop purchase, permanent blacklist or save mutation. */
G.PKMSVVHeldItems=(()=>{
 const vi=()=>G.I18n?.lang==='vi';
 const tr=(a,b)=>vi()?a:b;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const effects={
  leftovers:['Hồi 1,5% HP mỗi giây','Restore 1.5% max HP each second','HP/s'],
  choiceband:['Sát thương +40%; khóa đổi kỹ năng','+40% damage; cannot switch moves','Damage +40%'],
  quickclaw:['Tất cả chiêu hồi nhanh hơn 20%','20% shorter cooldowns for all moves','Cooldown −20%'],
  focussash:['Chống KO, còn 1 HP (mỗi 60 giây)','Survive a fatal hit at 1 HP (every 60s)','60s'],
  shellbell:['Hồi HP theo sát thương gây ra (tối đa 4 HP/s)','Heal from damage dealt (max 4 HP/s)','Healing'],
  amuletcoin:['PokéCoins nhận cuối trận +50%','Earn +50% PokéCoins at run end','Coins +50%'],
  luckyegg:['Kinh nghiệm +30%','+30% experience earned','XP +30%'],
  lifeorb:['Sát thương +30%; mỗi đòn đánh tốn HP','+30% damage; attacks cost HP','Damage +30%'],
  choicescarf:['Tốc độ di chuyển +35%','+35% movement speed','Speed +35%'],
  rockyhelmet:['Kẻ địch đánh cận chiến bị phản sát thương','Reflect contact damage','Contact'],
  assaultvest:['Giảm 20% sát thương nhận','Reduce damage taken by 20%','Defense +20%']
 };
 let epoch=0,discarded=new Set();
 function reset(){epoch++;discarded.clear();}
 function info(id){
  const item=G.Items?.BY?.[id];
  if(!item)return null;
  const effect=effects[id];
  return {id,name:item.name,
   text:effect?tr(effect[0],effect[1]):item.desc,
   badge:effect?.[2]||tr('Hiệu ứng đặc biệt','Special effect')};
 }
 function skipped(){return [...discarded];}
 function skip(id){if(G.Items?.BY?.[id])discarded.add(id);}
 function install(){
  if(!G.RunUI||typeof G.RunUI.showItemChoice!=='function')return false;
  if(G.RunUI.showItemChoice._pkmsvvC)return true;
  const orig=G.RunUI.showItemChoice;
  const show=function(cur,next,cb){
   const box=document.getElementById('item-cards'),left=info(cur),right=info(next);
   if(!box||!left||!right||typeof cb!=='function')return orig.call(this,cur,next,cb);
   const myEpoch=epoch;
   box.replaceChildren();
   box.classList.add('pkmsvv-held-choices');
   const title=document.createElement('p');title.className='pkmsvv-held-lead';
   title.textContent=tr('Bạn chỉ được mang 1 trang bị trong trận — chọn một lần để tiếp tục.',
    'You can hold only one item during a run — choose once to continue.');
   box.append(title);
   const columns=document.createElement('div');columns.className='pkmsvv-held-columns';
   for(const [data,kind] of [[left,'old'],[right,'new']]){
    const panel=document.createElement('section');panel.className='pkmsvv-held-comparison is-'+kind;
    const badge=document.createElement('b');badge.className='pkmsvv-held-label';
    badge.textContent=kind==='old'?tr('ĐANG MANG','CURRENT ITEM'):tr('VỪA NHẶT','NEW ITEM');
    const art=document.createElement('div');art.className='pkmsvv-held-art';
    art.innerHTML=G.Icons?.html?.(data.id,34)||'🎒';
    const name=document.createElement('strong');name.textContent=data.name;
    const effect=document.createElement('p');effect.textContent=data.text;
    const detail=document.createElement('small');detail.textContent=data.badge;
    panel.append(badge,art,name,effect,detail);columns.append(panel);
   }
   box.append(columns);
   const actions=document.createElement('div');actions.className='pkmsvv-held-actions';
   let chosen=false;
   function choose(id,skipNew){
    if(chosen||epoch!==myEpoch)return;
    chosen=true;
    if(skipNew)skip(next);
    G.UI?.hide?.('scr-item');
    cb(id);
   }
   const options=[
    [tr('Giữ trang bị cũ','Keep current'),cur,'1',false],
    [tr('Đổi sang đồ mới','Equip new item'),next,'2',false],
    [tr('Bỏ qua món mới','Skip this drop'),cur,'3',true]
   ];
   for(const [label,id,key,skipNew] of options){
    const b=document.createElement('button');b.type='button';
    b.className='card pkmsvv-held-action'+(id===next?' evo':'');
    b.textContent=label;b.setAttribute('aria-label',label);b.setAttribute('title',label);
    b.onclick=()=>choose(id,skipNew);
    const k=document.createElement('span');k.className='key';k.textContent=key;b.append(k);actions.append(b);
   }
   box.append(actions);
   G.UI?.show?.('scr-item');
   G.Pad?.focusFirst?.();
  };
  show._pkmsvvC=true;
  G.RunUI.showItemChoice=show;
  return true;
 }
 // [3] is a real binding, not merely a label drawn on the button.
 // Use capture so native gameplay keybinds never consume the skip first.
 function keyboardSkip(event){
  if(event.defaultPrevented||event.repeat||event.altKey||event.ctrlKey||event.metaKey)return;
  if(event.key!=='3'&&event.code!=='Digit3'&&event.code!=='Numpad3')return;
  const typing=document.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]');
  if(typing)return;
  const screen=document.getElementById('scr-item');
  if(!screen||screen.hidden||screen.classList?.contains('hidden'))return;
  const buttons=document.querySelectorAll?.('#scr-item #item-cards.pkmsvv-held-choices .pkmsvv-held-actions button');
  const skip=buttons?.[2];if(!skip||skip.disabled)return;
  event.preventDefault?.();event.stopImmediatePropagation?.();skip.click();
 }
 document.addEventListener?.('keydown',keyboardSkip,true);
 // Installed after RunUI script and before gameplay; same UI for Web/PC/Android.
 install();
 return {effects,info,skipped,skip,reset,install};
})();