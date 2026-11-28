/* Votri Valley: fully offline Kecleon shop + inventory.
   25 natures, abilities and TM eligibility come from JPTER78 data files.
   Every user-visible label is VI/EN selected directly (not fragment fallback).
*/
G.KecleonUI=(()=>{
 const $=id=>document.getElementById(id);
 const L=(vi,en)=>G.I18n&&G.I18n.lang==='vi'?vi:en;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>Math.floor(n||0).toLocaleString(G.I18n&&G.I18n.locale||'vi-VN');
 const NATURE_VI={
   hardy:'Chăm chỉ',bold:'Táo bạo',modest:'Khiêm tốn',calm:'Điềm tĩnh',timid:'Nhút nhát',
   lonely:'Cô độc',docile:'Ngoan ngoãn',mild:'Dịu dàng',gentle:'Hiền hòa',hasty:'Vội vàng',
   adamant:'Kiên định',impish:'Tinh nghịch',bashful:'Rụt rè',careful:'Thận trọng',
   rash:'Liều lĩnh',jolly:'Vui vẻ',naughty:'Nghịch ngợm',lax:'Thoải mái',quirky:'Kỳ quặc',
   naive:'Ngây thơ',brave:'Dũng cảm',relaxed:'Thư thái',quiet:'Trầm lặng',sassy:'Bướng bỉnh',
   serious:'Nghiêm túc'
 };
 const STAT={pa:['Tấn công','Attack'],sa:['Tấn công ĐB','Sp. Atk'],df:['Phòng thủ','Defense'],sd:['Phòng thủ ĐB','Sp. Def'],spd:['Tốc độ','Speed']};
 const natName=n=>G.I18n.lang==='vi'?(NATURE_VI[n.id]||n.n[1]):n.n[1];
 const abilName=id=>{const a=G.ABIL[id];return a?(a[1]||a[0]):L('Không có','None');};
 const statName=id=>STAT[id]?L(...STAT[id]):id;
 const natureDesc=n=>!n.up?L('Không đổi chỉ số','Neutral stats'):
   '+'+statName(n.up)+' 10% · −'+statName(n.down)+' 10%';
 const owned=()=>Object.keys(G.DB.save?.owned||{}).map(Number)
   .filter(d=>G.DEX_BY[d]).sort((a,b)=>a-b);
 const title=(id)=>G.Moves.BY_ID[id]?G.T(G.Moves.BY_ID[id].name,'move'):id;
 const price=n=>'<span class="coin"></span> '+money(n);
 const toast=(vi,en)=>G.UI.toast(L(vi,en),2800);
 const label=key=>({
   mint:L('Bạc hà','Nature Mint'),
   cap:L('Viên nang Đặc tính','Ability Capsule'),
   caph:L('Viên nang Đặc tính Ẩn','Hidden Ability Capsule'),
   pippiReset:L('Kẹo Tái Huấn Luyện','Training Reset Candy'),
   blankTm:L('TM Trống','Blank TM')
 })[key]||key;
 const text=key=>({
   mint:L('Đổi Tính cách ngẫu nhiên.','Reroll a random Nature.'),
   cap:L('Đổi ngẫu nhiên. Có 5% cơ hội ra Đặc tính Ẩn.','Random reroll. 5% chance for a Hidden Ability.'),
   caph:L('Viên sự kiện: 15% ra Đặc tính Ẩn, cao gấp 3 lần.','Event Capsule: 15% Hidden chance, 3× the normal rate.'),
   pippiReset:L('Hoàn lại toàn bộ điểm kỹ năng Pippi. Giữ nguyên Thân thiết và kinh nghiệm.','Recover all Pippi training points; keeps friendship level and XP.'),
   blankTm:L('Xóa một chiêu đã học bằng TM, không hoàn lại TM cũ.','Erase one learned TM without refund.')
 })[key]||'';
 let selected=null,tab='shop',sceneActive=false;
 const Scene=()=>G.PKMSVVKecleonScene;
 function syncScene(){
   const stall=$('pkmk-stall'),show=tab==='shop'||tab==='berry';
   if(!stall)return;
   stall.hidden=!show;
   if(!show){if(sceneActive&&Scene())Scene().stop();sceneActive=false;return;}
   if(sceneActive||!Scene())return;
   sceneActive=true;
   const calm=!!(G.Settings&&G.Settings.get('calm'));
   Scene().start(!calm);
   stall.onclick=()=>{if(Scene().intro)Scene().skip();};
 }
 function close(){
   if(sceneActive&&Scene())Scene().stop();
   sceneActive=false;G.MenuUI.open();
 }
 function valid(){
  if(!G.DB.save)return false;
  if(!owned().length)return false;
  if(!owned().includes(selected))selected=Number(G.DB.save.partner)||owned()[0];
  if(!owned().includes(selected))selected=owned()[0];
  return true;
 }
 function open(which='shop'){
  tab=['shop','bag','berry'].includes(which)?which:'shop';
  if(!valid()){toast('Cần mở khóa Pokémon trước.','Unlock a Pokémon first.');return;}
  if(sceneActive&&Scene())Scene().stop();
  sceneActive=false;
  G.UI.show('scr-kecleon',true);
  render();
 }
 function itemIcon(key,size=34){
  if(key==='blankTm')return G.Icons?.html?.('book',size)||'TM';
  if(key==='pippiReset')return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 16 16" role="img" aria-label="Kẹo Tái Huấn Luyện" style="image-rendering:pixelated" xmlns="http://www.w3.org/2000/svg">'+
   '<path fill="#f7c0f4" d="M1 6h3V4h2v8H4v-2H1zm11-2h2v2h2v4h-2v2h-2z"/>'+
   '<path fill="#804c9c" d="M4 3h8v1h2v8h-2v1H4v-1H2V4h2z"/>'+
   '<path fill="#ffedf5" d="M5 4h6v1h2v6h-2v1H5v-1H3V5h2z"/>'+
   '<path fill="#e677b4" d="M7 5h2v2h2v2H9v2H7V9H5V7h2z"/>'+'</svg>';
  if(!G.Icons||!G.Icons.html)return '🎒';
  return G.Icons.html(key,size);
 }
 function row(icon,name,desc,tail=''){
  return '<div class="pkmk-row"><div class="pkmk-icon">'+icon+'</div><div class="pkmk-row-copy"><b>'+name+
   '</b><small>'+desc+'</small></div><div class="pkmk-row-tail">'+tail+'</div></div>';
 }
 function card(icon,name,desc,tail='',tags=''){
  return '<div class="pkmk-card"><div class="pkmk-product-art">'+icon+'</div>'+
   '<div class="pkmk-product-copy"><b>'+name+'</b>'+tags+'<small>'+desc+'</small></div>'+
   '<div class="pkmk-product-tail">'+tail+'</div></div>';
 }
 function buttons(){
  const p=G.DEX_BY[selected],n=G.Mons.natureOf(selected),a=G.Mons.abilityOf(selected);
  return '<div class="pkmk-partner"><span>'+L('Dùng vật phẩm cho:','Use items on:')+'</span> '+
    '<select class="field" id="pkmk-mon">'+owned().map(d=>'<option value="'+d+'" '+(d===selected?'selected':'')+'>'+esc(G.DEX_BY[d].name)+'</option>').join('')+'</select>'+
    '<small>'+esc(p.name)+' · '+L('Tính cách','Nature')+': '+esc(natName(n))+' ('+natureDesc(n)+')'+
    ' · '+L('Đặc tính','Ability')+': '+esc(abilName(a.id))+'</small></div>';
 }
 function bagTarget(s=G.DB.save){
  const hub=G.PKMSVVBoxHub;
  if(!G.PKMSVVProgressionMerge?.recordTM||!hub?.valid(s))return null;
  return hub.activeForDex(selected,s)||hub.item(s,'b1-'+selected+'-n')||hub.item(s,'b1-'+selected+'-s')||s.pkmsvvBox.find(x=>x.dex===selected)||null;
 }
 function canBagTeach(move){
  const s=G.DB.save,x=bagTarget(s);return !G.DB.guest&&(x?G.PKMSVVBoxHub.canTeach(s,x,move):G.Mons.canLearn(selected,move));
 }
 function render(){
  if(!valid())return;
  $('pkmk-heading').textContent=L('Cửa hàng Kecleon','Kecleon Shop');
  // Keep Berry as the middle tab: Shop | Berry | Bag, on every platform.
  const berryTab=$('pkmk-tab-berry'),bagTab=$('pkmk-tab-bag');
  if(berryTab&&bagTab&&bagTab.parentNode===berryTab.parentNode)bagTab.parentNode.insertBefore(berryTab,bagTab);
  $('pkmk-tab-shop').textContent=L('Cửa hàng','Shop');
  $('pkmk-tab-bag').textContent=L('Túi đồ','Bag');
  $('pkmk-tab-berry').textContent='🍓 Berry';
  $('pkmk-back').textContent=L('Trở về','Back');
  $('pkmk-tab-shop').classList.toggle('gold',tab==='shop');
  $('pkmk-tab-bag').classList.toggle('gold',tab==='bag');
  $('pkmk-tab-berry').classList.toggle('gold',tab==='berry');
  $('pkmk-balance').textContent=money(G.DB.save.coins||0)+' PokéCoins';
  $('pkmk-owner').innerHTML=tab==='bag'?buttons():'';
  $('pkmk-list').innerHTML=tab==='shop'?shopHtml():tab==='berry'?(G.PKMSVVBerry?.kecleonHtml?.()||'Berry đang tải…'):bagHtml();
  if(tab!=='berry'){
   const help=document.createElement('p');help.className='pkmk-held-help';
   help.textContent=L('🎒 Trang bị chiến đấu: nhặt từ rương/boss trong trận. Bạc hà, Viên nang, TM và Kẹo Tái Huấn Luyện nằm trong Túi đồ.',
    '🎒 Held battle gear comes from run chests/bosses. Mints, Capsules, TMs and Training Reset Candy stay in your Bag.');
   $('pkmk-list').prepend(help);
  }
  $('pkmk-sign').textContent=L('Cửa hàng Kecleon','Kecleon Shop');
  syncScene();
  $('pkmk-tab-shop').onclick=()=>{tab='shop';render();};
  $('pkmk-tab-bag').onclick=()=>{tab='bag';render();};
  $('pkmk-tab-berry').onclick=()=>{tab='berry';render();};
  $('pkmk-list').querySelectorAll('[data-berry-buy]').forEach(b=>b.onclick=()=>{if(G.PKMSVVBerry?.buy?.(b.dataset.berryBuy))render();});
  $('pkmk-list').querySelectorAll('[data-berry-rescue]').forEach(b=>b.onclick=()=>G.PKMSVVBerry?.rescue?.());
  $('pkmk-back').onclick=close;
  const pokemonPicker=$('pkmk-mon');
  if(pokemonPicker)pokemonPicker.onchange=e=>{selected=Number(e.target.value);render();}; // Tab Cửa hàng không có ô chọn Pokémon.
  const backToShop=$('pkmk-list').querySelector('[data-pkmk-goshop]');
  if(backToShop)backToShop.onclick=()=>{tab='shop';render();};
  $('pkmk-list').querySelectorAll('[data-pkmk-buy]').forEach(btn=>btn.onclick=()=>{
    // Synchronous purchase + a disabled button prevent double taps from
    // spending twice before a mobile WebView rerender finishes.
    if(btn.disabled||!btn.isConnected)return;
    btn.disabled=true;
    const what=btn.dataset.pkmkBuy, result=G.Shop.buy(what);
    if(!result.ok){
      if(result.reason==='save')toast('Không lưu được giao dịch. Xu và vật phẩm vẫn giữ nguyên.','Could not save purchase. Coins and items were preserved.');
      else if(result.reason==='full')toast('Túi đã đủ 999 món này. Không trừ xu.','Stack is full (999). No coins charged.');
      else toast('Không đủ xu hoặc vật phẩm đã hết hàng.','Insufficient coins or item no longer for sale.');
      G.UI.refreshCoins();render();return;
    }
    G.UI.refreshCoins();G.Audio.sfx('buy');
    if(sceneActive&&Scene()){
      const icon=what.startsWith('tm:')?'tm':(what==='cap'?'capsule':what==='caph'?'capsuleh':'mint');
      Scene().cheer(icon);
    }
    render();
    toast('Đã mua! Vật phẩm được chuyển vào Túi đồ.','Purchased! Your item is in the Bag.');
  });
  $('pkmk-list').querySelectorAll('[data-pkmk-use]').forEach(btn=>btn.onclick=()=>{
    if(btn.disabled||!btn.isConnected)return;
    btn.disabled=true;apply(btn.dataset.pkmkUse);render();
  });
  $('pkmk-list').querySelectorAll('[data-pkmk-pippi-reset]').forEach(btn=>btn.onclick=()=>{
    if(btn.disabled)return;
    if(btn.dataset.confirm!=='1'){
      btn.dataset.confirm='1';btn.textContent=L('Xác nhận dùng kẹo','Confirm candy use');return;
    }
    btn.disabled=true;
    const result=G.PKMSVVPippi?.resetTraining?.(G.DB.save,()=>G.DB.commit(true));
    if(result?.ok){G.Audio?.sfx?.('buy');toast('Pippi đã nhận lại '+result.refundedPoints+' điểm huấn luyện!',
      'Pippi recovered '+result.refundedPoints+' training points!');}
    else toast('Không thể đặt lại kỹ năng. Kẹo vẫn được giữ.',
      'Could not reset training. Candy was not consumed.');
    render();
  });
  $('pkmk-list').querySelectorAll('[data-pkmk-sell]').forEach(btn=>btn.onclick=()=>{
    if(btn.disabled)return;
    btn.disabled=true;
    const receipt=G.Shop.sell(btn.dataset.pkmkSell);
    G.UI?.refreshCoins?.();render();
    if(receipt.ok)toast('Đã bán +'+money(receipt.refund)+' PokéCoins.',
     'Sold for +'+money(receipt.refund)+' PokéCoins.');
    else toast('Không bán được vật phẩm.','Could not sell the item.');
  });
  const blankBox=$('pkmk-list').querySelector('[data-pkmk-blank-box]');
  if(blankBox)blankBox.onclick=()=>{if(!blankBox.isConnected)return;G.UI.hide('scr-kecleon');G.PKMSVVBoxHubUI?.openBox?.();};
  const erase=$('pkmk-list').querySelector('[data-pkmk-blank-erase]');
  if(erase){
   const profile=G.DB.save,dex=selected,picker=$('pkmk-list').querySelector('[data-pkmk-blank-move]'),cancel=$('pkmk-list').querySelector('[data-pkmk-blank-cancel]');
   function reset(){delete erase.dataset.confirm;erase.textContent=L('Xóa TM đã chọn','Erase selected TM');if(cancel)cancel.hidden=true;}
   if(picker)picker.onchange=reset;if(cancel)cancel.onclick=()=>{reset();erase.focus();};
   erase.onclick=()=>{
    if(erase.disabled||!erase.isConnected||profile!==G.DB.save||selected!==dex||G.Game?.state!=='ui'||G.Coop?.active)return;
    const move=picker?.value;
    if(!move||!G.Moves.BY_ID[move])return;
    if(erase.dataset.confirm!==move){erase.dataset.confirm=move;erase.textContent=L('Xác nhận xóa ','Confirm erase ')+title(move);if(cancel)cancel.hidden=false;return;}
    erase.disabled=true;
    const receipt=G.Shop.transaction('blank-tm',s=>G.PKMSVVProgressionMerge.eraseTM(s,{dex,move}),profile);
    toast(receipt?'Đã xóa TM!':'Không lưu được. TM Trống vẫn được giữ.',receipt?'TM erased!':'Save failed. Blank TM preserved.');render();
   };
  }
  $('pkmk-list').querySelectorAll('[data-pkmk-tm]').forEach(btn=>btn.onclick=()=>{
    if(btn.disabled||!btn.isConnected)return;btn.disabled=true;
    let result;
    const hub=G.PKMSVVBoxHub,s=G.DB.save;
    if(G.PKMSVVProgressionMerge?.recordTM&&hub?.valid(s)){
     const x=bagTarget(s);
     try{if(x)result=hub.teach(x.id,btn.dataset.pkmkTm,s);}catch(_){}
    }else result=G.Shop.transaction('bag-teach',()=>G.Mons.teach(selected,btn.dataset.pkmkTm));
    if(!result){toast('Không học được TM. Vật phẩm vẫn được giữ.','Could not teach TM. The item was preserved.');render();return;}
    G.Audio.sfx('buy');
    toast('Đã học TM!','TM move learned!');render();
  });
 }
 function buyBtn(key,cost){
  const full=(key.startsWith('tm:')?G.Shop.tmCount(key.slice(3)):G.Shop.count(key))>=999;
  return '<button class="btn small gold" data-pkmk-buy="'+esc(key)+'" '+(full||G.DB.guest||G.DB.save.coins<cost?'disabled':'')+'>'+price(cost)+'</button>';
 }
 function shopHtml(){
  let s='<p class="pkmk-lead">'+L(
    'Chào mừng! Bạc hà, Viên nang và TM được chuyển vào Túi đồ sau khi mua. Mỗi ngày có 8 TM mới!',
    'Welcome! Mints, Capsules and TMs go into your Bag after purchase. Eight TMs rotate daily!')+'</p>';
  s+='<h3 class="pkmk-group-title">'+L('Vật phẩm','Items')+'</h3><div class="pkmk-cards">';
  for(const key of G.Shop.ORDER){
    const it=G.Shop.ITEMS[key];
    if(it.unavailableInShop)continue; // legacy Hidden Capsule is fully retired.
    s+=card(itemIcon(key==='blankTm'?'blankTm':key==='pippiReset'?'pippiReset':key==='cap'?'capsule':key==='caph'?'capsuleh':'mint'),
      esc(label(key)),esc(text(key)),
      buyBtn(key,it.price)+'<span class="pkmk-stock">×'+G.Shop.count(key)+'</span>');
  }
  s+='</div><h3 class="pkmk-group-title">'+L('TM hôm nay','Today’s TMs')+'</h3>';
  s+='<p class="sub">'+L('Mỗi ngày có 8 TM luân phiên. Chiêu đã học được giữ cho đến khi dùng TM Trống.',
     'Eight TMs rotate daily. Learned moves remain until erased with a Blank TM.')+'</p><div class="pkmk-cards">';
  for(const id of G.Shop.dailyTms()){
    const m=G.Moves.BY_ID[id];if(!m)continue;
    const ok=G.Mons.canLearn(selected,id),cost=G.Shop.tmPrice(id);
    const typeColor=G.U&&G.U.TYPE_COLOR?G.U.TYPE_COLOR[m.type]:'#88a8da';
    const typeName=G.U&&G.U.TYPE_NAME?G.U.TYPE_NAME[m.type]:m.type;
    const cat=m.cat==='physical'?L('Vật lý','Physical'):m.cat==='special'?L('Đặc biệt','Special'):'';
    const tags='<div><span class="pkmk-tag" style="background:'+esc(typeColor)+'">'+esc(typeName||m.type)+'</span>'+
       (cat?'<span class="pkmk-tag pkmk-tag-cat">'+esc(cat)+'</span>':'')+'</div>';
    const summary=ok?L('Pokémon đang chọn có thể học chiêu này.','Selected Pokémon can learn this move.'):
      L('Dạy chiêu cho Pokémon tương thích từ Túi đồ.','Teach compatible Pokémon from your Bag.');
    s+=card(itemIcon('move:'+id),esc(title(id)),esc(summary),
      buyBtn('tm:'+id,cost)+'<span class="pkmk-stock">×'+G.Shop.tmCount(id)+'</span>',tags);
  }
  return s+'</div>';
 }
 function apply(kind){
  const dex=selected;
  if(!G.Shop.count(kind))return false;
  if(kind==='mint'){
   const choices=G.NATURES.filter(n=>n.id!==G.Mons.natureOf(dex).id);
   if(!choices.length)return false;
   const chosen=choices[Math.floor(Math.random()*choices.length)];
   if(!G.Shop.transaction('bag-nature',()=>{
    if(!G.Shop.take(kind))return false;G.Mons.setNature(dex,chosen.id);
    return G.Mons.natureOf(dex).id===chosen.id;
   })){toast('Không lưu được Tính cách. Bạc hà vẫn được giữ.','Could not save Nature. Mint preserved.');return false;}
   G.Audio?.sfx?.('buy');
   toast('Tính cách ngẫu nhiên: '+natName(chosen),'Random Nature: '+natName(chosen));
   return true;
  }
  if(kind==='cap'||kind==='caph'){
   const now=G.Mons.abilityOf(dex),abilities=G.DEX_ABIL?.[dex]||[];
   const slot=G.PKMSVVBoxHub?.rollAbilitySlot?.(abilities,now.slot,kind);
   if(slot===null||slot===undefined){
    toast('Không quay được Đặc tính khác, vật phẩm vẫn được giữ.',
      'No alternative Ability was rolled; item was not spent.');
    return false;
   }
   if(!G.Shop.transaction('bag-ability',()=>{
    if(!G.Shop.take(kind))return false;G.Mons.setAbility(dex,slot);
    return G.Mons.abilityOf(dex).slot===slot;
   })){toast('Không lưu được Đặc tính. Viên nang vẫn được giữ.','Could not save Ability. Capsule preserved.');return false;}
   G.Audio?.sfx?.('buy');
   toast('Đặc tính mới: '+abilName(G.Mons.abilityOf(dex).id),
    'New Ability: '+abilName(G.Mons.abilityOf(dex).id));
   return true;
  }
  return false;
 }
 function useBtn(kind,enabled){
  return '<button class="btn small" data-pkmk-use="'+kind+'" '+(!enabled?'disabled':'')+'>'+L('Sử dụng','Use')+'</button>';
 }
 function sellBtn(kind,price){
  return '<button class="btn small ghost pkmk-sell" data-pkmk-sell="'+esc(kind)+'">'+
   L('Bán ','Sell ')+money(Math.floor(price/2))+'</button>';
 }
 function bagHtml(){
  const total=G.Shop.ORDER.some(k=>G.Shop.count(k)) ||
    Object.keys(G.DB.save.tms||{}).some(id=>G.Shop.tmCount(id)&&G.Moves.BY_ID[id]) ||
    !!G.PKMSVVBerry?.TYPES?.some(t=>G.PKMSVVBerry.count(t.id)>0);
  if(!total) return '<div class="pkmk-empty"><div class="pkmk-empty-art">'+itemIcon('bag',64)+'</div>'+
    '<p>'+L('Túi đồ của bạn đang trống.','Your Bag is empty.')+'</p>'+
    '<button type="button" class="btn gold" data-pkmk-goshop>'+itemIcon('shop',18)+' '+
     L('Đi tới Cửa hàng Kecleon','Go to the Kecleon Shop')+'</button></div>';
  let s='<p class="pkmk-lead">'+L(
    'Dùng Bạc hà/Viên nang sẽ đổi ngẫu nhiên. Bạn cũng có thể bán vật phẩm với nửa giá mua.',
    'Mints/Capsules reroll at random. Sell items for half their shop price.')+'</p>';
  s+='<div class="pkmk-cards">';
  for(const k of G.Shop.ORDER)if(G.Shop.count(k)){
    if(k==='blankTm'){
      const migrated=G.DB.save.pkmsvvBoxSchema!==undefined;
      const moves=(G.DB.save.ptm?.[selected]||[]).filter(id=>G.Moves.BY_ID[id]);
      const actions=migrated?'<button class="btn small" data-pkmk-blank-box>'+L('Dùng tại PokéBox','Use in PokéBox')+'</button>':
       (moves.length?'<select data-pkmk-blank-move aria-label="TM">'+moves.map(id=>'<option value="'+esc(id)+'">'+esc(title(id))+'</option>').join('')+'</select>':'')+
       '<button class="btn small" data-pkmk-blank-erase '+(!moves.length||G.DB.guest?'disabled':'')+'>'+L('Xóa TM đã chọn','Erase selected TM')+'</button>'+
       '<button class="btn small ghost" data-pkmk-blank-cancel hidden>'+L('Hủy','Cancel')+'</button>';
      s+=card(itemIcon(k),esc(label(k)),esc(text(k)),actions+sellBtn(k,G.Shop.ITEMS[k].price)+'<span class="pkmk-stock">×'+G.Shop.count(k)+'</span>');
      continue;
    }
    if(k==='pippiReset'){
      const trained=Object.values(G.PKMSVVPippi?.data?.(G.DB.save)?.training||{}).some(n=>n>0);
      s+=card(itemIcon(k),esc(label(k)),esc(text(k)),
       '<button type="button" class="btn small gold" data-pkmk-pippi-reset '+
        (!trained?'disabled':'')+'>'+L('Dùng cho Pippi','Use on Pippi')+'</button>'+
       sellBtn(k,G.Shop.ITEMS[k].price)+
       '<span class="pkmk-stock">×'+G.Shop.count(k)+'</span>');
      continue;
    }
    const choices=k==='mint'?G.NATURES.filter(n=>n.id!==G.Mons.natureOf(selected).id):
       G.PKMSVVBoxHub?.abilityAlternatives?.(
        G.DEX_ABIL?.[selected]||[],G.Mons.abilityOf(selected).slot)||[];
    s+=card(itemIcon(k==='mint'?'mint':k==='cap'?'capsule':'capsuleh'),
      esc(label(k)),esc(text(k)),useBtn(k,choices.length>0)+
      sellBtn(k,G.Shop.ITEMS[k].price)+
      '<span class="pkmk-stock">×'+G.Shop.count(k)+'</span>');
  }
  s+='</div>';
  const tms=Object.keys(G.DB.save.tms||{}).filter(id=>G.Shop.tmCount(id)&&G.Moves.BY_ID[id]);
  if(tms.length)s+='<h3 class="pkmk-group-title">TM</h3><div class="pkmk-cards">';
  for(const id of tms)s+=card(itemIcon('move:'+id),esc(title(id)),
    L('Số lượng trong túi: ','In Bag: ')+G.Shop.tmCount(id),
   '<button class="btn small gold" data-pkmk-tm="'+esc(id)+'" '+
    (!canBagTeach(id)?'disabled':'')+'>'+L('Dạy chiêu','Teach')+'</button>'+sellBtn('tm:'+id,G.Shop.tmPrice(id)));
  if(tms.length)s+='</div>';
  const berry=G.PKMSVVBerry,owned=berry?.TYPES?.filter(t=>berry.count(t.id)>0)||[];
  if(owned.length){
   s+='<h3 class="pkmk-group-title">🍓 Berry</h3><div class="pkmk-cards">';
   for(const t of owned){
    s+=card('<img class="pkmsvv-berry-sprite" src="'+berry.spriteUrl(t.id)+'" width="36" height="36" alt="'+esc(t.name)+'">',
      esc(t.name+' Berry'),esc(t.desc[G.I18n?.lang==='en'?1:0]),
      '<span class="pkmk-stock">×'+berry.count(t.id)+'</span>');
   }
   s+='</div><p class="pkmk-lead">'+L('Berry được chọn tối đa 2 quả trong 4 giây trước trận.',
    'Choose up to 2 Berries during the 4-second pre-battle countdown.')+'</p>';
  }
  return s;
 }
 function attachDex(dex,host){
  if(!G.DB.save?.owned?.[dex]||!host||!G.Mons)return;
  const previous=host.querySelector('#pkmk-dex-stats');
  if(previous)previous.remove(); // Always refresh selected Pokémon details and TM list.
  const n=G.Mons.natureOf(dex),a=G.Mons.abilityOf(dex);
  const pane=document.createElement('div');pane.id='pkmk-dex-stats';pane.className='pkmk-dex';
  const fx=G.AbilityFX.of(a.id,G.DEX_BY[dex]);
  const taught=G.Mons.taught(dex);
  pane.innerHTML=
   '<p><b>'+L('Tính cách','Nature')+':</b> '+esc(natName(n))+' <small>'+natureDesc(n)+'</small></p>'+
   '<p><b>'+L('Đặc tính','Ability')+':</b> '+esc(abilName(a.id))+(a.slot===2?' ★':'')+
   ' <small class="pkmk-ability-benefit">('+esc(G.PKMSVVAbilityText.summary(a.id,G.DEX_BY[dex],fx,G.I18n.lang!=='vi'))+')</small></p>'+
   '<p><b>'+L('TM đã học','Learned TMs')+':</b> '+(taught.length?taught.map(x=>esc(title(x))).join(', '):L('Chưa có','None'))+'</p>'+
   '<button class="btn small gold" id="pkmk-open-dex">'+L('Dùng vật phẩm / TM','Use Items / TMs')+'</button>';
  host.appendChild(pane);
  pane.querySelector('#pkmk-open-dex').onclick=()=>{selected=dex;open('bag');};
 }
 return {open,render,attachDex};
})();