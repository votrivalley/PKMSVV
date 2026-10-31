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
   caph:L('Viên nang Đặc tính Ẩn','Hidden Ability Capsule')
 })[key]||key;
 const text=key=>({
   mint:L('Đổi tính cách của một Pokémon đã mở khóa.','Choose a different nature for an unlocked Pokémon.'),
   cap:L('Chuyển sang Đặc tính thường còn lại.','Switch to another standard ability.'),
   caph:L('Có thể chọn cả Đặc tính ẩn.','Allows selection of the hidden ability.')
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
    const what=btn.dataset.pkmkBuy, result=G.Shop.buy(what);
    if(!result.ok){toast('Không đủ xu hoặc vật phẩm đã hết hàng.','Insufficient coins or item no longer for sale.');return;}
    G.UI.refreshCoins();G.Audio.sfx('buy');
    if(sceneActive&&Scene()){
      const icon=what.startsWith('tm:')?'tm':(what==='cap'?'capsule':what==='caph'?'capsuleh':'mint');
      Scene().cheer(icon);
    }
    render();
    toast('Đã mua! Vật phẩm được chuyển vào Túi đồ.','Purchased! Your item is in the Bag.');
  });
  $('pkmk-list').querySelectorAll('[data-pkmk-use]').forEach(btn=>btn.onclick=()=>{
    apply(btn.dataset.pkmkUse);render();
  });
  $('pkmk-list').querySelectorAll('[data-pkmk-nature]').forEach(btn=>btn.onclick=()=>{
    const id=btn.dataset.pkmkNature;
    if(!G.Shop.count('mint')||!G.NATURE_BY[id]||!G.Shop.take('mint'))return;
    G.Mons.setNature(selected,id);G.DB.commit(true);
    G.Audio.sfx('buy');toast('Đã đổi tính cách.','Nature changed.');render();
  });
  $('pkmk-list').querySelectorAll('[data-pkmk-ability]').forEach(btn=>btn.onclick=()=>{
    const kind=btn.dataset.pkmkKind,slot=Number(btn.dataset.pkmkAbility);
    if(!G.Mons.abilityChoices(selected,kind==='caph').includes(slot)||!G.Shop.take(kind))return;
    G.Mons.setAbility(selected,slot);G.DB.commit(true);
    G.Audio.sfx('buy');toast('Đã đổi Đặc tính.','Ability changed.');render();
  });
  $('pkmk-list').querySelectorAll('[data-pkmk-tm]').forEach(btn=>btn.onclick=()=>{
    if(!G.Mons.teach(selected,btn.dataset.pkmkTm))return;
    G.DB.commit(true);G.Audio.sfx('buy');
    toast('Đã học TM vĩnh viễn!','TM move learned permanently!');render();
  });
 }
 function buyBtn(key,cost){
  return '<button class="btn small gold" data-pkmk-buy="'+esc(key)+'" '+(G.DB.save.coins<cost?'disabled':'')+'>'+price(cost)+'</button>';
 }
 function shopHtml(){
  let s='<p class="pkmk-lead">'+L(
    'Chào mừng! Bạc hà, Viên nang và TM được chuyển vào Túi đồ sau khi mua. Mỗi ngày có 8 TM mới!',
    'Welcome! Mints, Capsules and TMs go into your Bag after purchase. Eight TMs rotate daily!')+'</p>';
  s+='<h3 class="pkmk-group-title">'+L('Vật phẩm','Items')+'</h3><div class="pkmk-cards">';
  for(const key of G.Shop.ORDER){
    const it=G.Shop.ITEMS[key];
    s+=card(itemIcon(key==='cap'?'capsule':key==='caph'?'capsuleh':'mint'),
      esc(label(key)),esc(text(key)),
      buyBtn(key,it.price)+'<span class="pkmk-stock">×'+G.Shop.count(key)+'</span>');
  }
  s+='</div><h3 class="pkmk-group-title">'+L('TM hôm nay','Today’s TMs')+'</h3>';
  s+='<p class="sub">'+L('Mỗi ngày có 8 TM luân phiên. Chiêu đã học sẽ được giữ vĩnh viễn.',
     'Eight TMs rotate daily. Learned moves are permanently unlocked.')+'</p><div class="pkmk-cards">';
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
 let picker='';
 function apply(kind){picker=picker===kind?'':kind;}
 function useBtn(kind,enabled){
  return '<button class="btn small" data-pkmk-use="'+kind+'" '+(!enabled?'disabled':'')+'>'+L('Sử dụng','Use')+'</button>';
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
    'Chọn Pokémon ở trên để sử dụng vật phẩm. Các TM đã dạy sẽ có trong trận tiếp theo.',
    'Choose a Pokémon above to use your items. TMs you teach will be available in later runs.')+'</p>';
  s+='<div class="pkmk-cards">';
  for(const k of G.Shop.ORDER)if(G.Shop.count(k)){
    const choices=k==='mint'?G.NATURES.filter(n=>n.id!==G.Mons.natureOf(selected).id):
       G.Mons.abilityChoices(selected,k==='caph');
    s+=card(itemIcon(k==='mint'?'mint':k==='cap'?'capsule':'capsuleh'),
      esc(label(k)),esc(text(k)),useBtn(k,choices.length>0)+
      '<span class="pkmk-stock">×'+G.Shop.count(k)+'</span>');
    if(picker===k&&choices.length){
      s+='<div class="pkmk-choices pkmk-choice-full">';
      for(const n of choices){
        const val=k==='mint'?n.id:n,name=k==='mint'?natName(n):abilName(G.Mons.slots(selected)[n]);
        s+='<button class="btn small ghost" '+(k==='mint'?'data-pkmk-nature="'+esc(val)+'"':
           'data-pkmk-ability="'+val+'" data-pkmk-kind="'+k+'"')+'>'+esc(name)+
           (k==='mint'?'<small>'+natureDesc(n)+'</small>':'')+'</button>';
      }
      s+='</div>';
    }
  }
  s+='</div>';
  const tms=Object.keys(G.DB.save.tms||{}).filter(id=>G.Shop.tmCount(id)&&G.Moves.BY_ID[id]);
  if(tms.length)s+='<h3 class="pkmk-group-title">TM</h3><div class="pkmk-cards">';
  for(const id of tms)s+=card(itemIcon('move:'+id),esc(title(id)),
    L('Số lượng trong túi: ','In Bag: ')+G.Shop.tmCount(id),
   '<button class="btn small gold" data-pkmk-tm="'+esc(id)+'" '+
    (!G.Mons.canLearn(selected,id)?'disabled':'')+'>'+L('Dạy chiêu','Teach')+'</button>');
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