/* Stage 2 QA panel — sits beside the existing PokéBox grid; no production UI changes. */
(function(){
 'use strict';
 if(typeof window==='undefined'||!window.G||!G.PKMSVVBox||!G.PKMSVVBox2)return;
 const api=G.PKMSVVBox2,box=G.PKMSVVBox;
 const $=id=>document.getElementById(id);
 const txt=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const typeVi={fire:'Lửa',flying:'Bay',water:'Nước',grass:'Cỏ',electric:'Điện',ghost:'Ma',poison:'Độc',steel:'Thép',fighting:'Giác đấu',psychic:'Siêu linh',dragon:'Rồng',dark:'Bóng tối',rock:'Đá',ground:'Đất',ice:'Băng',fairy:'Tiên',bug:'Bọ',normal:'Thường',offense:'Tấn công',defense:'Phòng thủ'};
 const typeName=t=>G.I18n?.lang==='en'?t:(typeVi[t]||t);
 const s=()=>G.DB?.save;
 let panel=null,selectedMat=new Set(),shardCount=0,selectedProtected=new Set(),requestedId=null;
 function attach(){
  const foot=document.querySelector('#pkmsvv-pokebox-overlay .pkmbx-foot');
  if(!foot||$('pkmbx-rank-open'))return;
  const b=document.createElement('button');b.type='button';b.className='btn gold';
  b.id='pkmbx-rank-open';b.setAttribute('translate','no');b.textContent=txt('⭐ Rank','⭐ Rank');
  b.onclick=open;
  foot.insertBefore(b,foot.firstChild);
 }
 if(!box._pkmbxRankUiWrapped){
  const original=box.open;
  box.open=function(...args){const result=original.apply(this,args);attach();return result;};
  box._pkmbxRankUiWrapped=true;
 }
 function close(){panel?.remove();panel=null;selectedMat.clear();selectedProtected.clear();requestedId=null;shardCount=0;}
 function ensure(){
  if(panel?.isConnected)return;
  panel=document.createElement('div');panel.id='pkmbx-rank-overlay';panel.setAttribute('translate','no');
  panel.innerHTML='<section class="pkmbx-rank-panel" role="dialog" aria-modal="true" aria-label="PokéBox Rank">'+
    '<header class="pkmbx-rank-head"><h2>⭐ Rank</h2><button class="btn small" id="pkmbx-rank-close"></button></header>'+
    '<div id="pkmbx-rank-body"></div><p class="pkmbx-rank-note" id="pkmbx-rank-note"></p></section>';
  document.body.appendChild(panel);
  $('pkmbx-rank-close').onclick=close;
  panel.addEventListener('click',e=>{if(e.target===panel)close();});
 }
 function render(){
  if(!panel)return;
  const requested=api.get(s(),requestedId)||api.get(s(),G.PKMSVVBox?.focusedId?.())||api.selected(s());
  // Rank is shared across forms, but the source of the non-consumable Shiny
  // credit is a different individual, so rank on the Normal carrier when present.
  const raw=requested?.shiny?
   s()?.pkmsvvBox?.find(v=>v.dex===requested.dex&&!v.shiny)||requested:requested;
  const species=raw?api.speciesProgress(s(),raw.dex):null;
  const x=raw?{...raw,rank:species?.rank??raw.rank,rankBranch:species?.rankBranch||raw.rankBranch}:null;
  const body=$('pkmbx-rank-body');
  $('pkmbx-rank-close').textContent=txt('✕ Đóng','✕ Close');
  $('pkmbx-rank-note').textContent=txt(
   'Rank 1 cần 1 bản trùng, Rank 2 cần thêm 2, tiếp tục 3, 4, 5. Bản trùng tự dùng khi nâng, không cần đổi Mảnh.',
   'Rank costs 1, then 2 more, then 3, 4 and 5. Shiny, Ready Team, favorites, and old-save duplicates can count once without deletion.');
  if(!x){body.innerHTML='<p>'+txt('Hãy tạo PokéBox và chọn một cá thể ở danh sách trước.','Create PokéBox and select an individual first.')+'</p>';return;}
  const plan=api.rankMaterials(s(),x.id);
  const cost=plan.cost,available=plan.available,have=plan.fragments;
  const name=G.DEX_BY?.[x.dex]?.name||('#'+x.dex);
  const stats=api.formatRank(x.rank),next=api.formatRank(Math.min(5,x.rank+1));
  let html='<div class="pkmbx-rank-card"><strong>'+esc(name)+'</strong><span>#'+x.dex+
   (x.shiny?' ✨':'')+' · Rank '+x.rank+'/5</span></div>'+
   '<p>'+txt('Máu / sát thương: ','HP / damage: ')+'+'+stats.hp+'%'+
   (x.rank<5?' → +'+next.hp+'%':'')+'</p>';
  if(x.rank<5){
   html+='<h3>'+txt('Bản trùng khả dụng: ','Usable duplicates: ')+
    (plan.copies.length+plan.credits.length)+'</h3>'+
    '<p>'+txt('Cần ','Need ')+cost+txt(' để lên Rank ',' for Rank ')+(x.rank+1)+
    (have?' · '+txt('Mảnh cũ: ','Old shards: ')+have:'')+'</p>'+
    '<p>'+txt('Pokémon trùng từ Gacha tự động được tính làm nguyên liệu. Không cần đổi thành Mảnh Rank.',
      'Duplicate Gacha pulls count as materials automatically; no shard conversion is needed.')+'</p>'+
    '<button class="btn gold" id="pkmbx-rank-up" '+(available<cost?'disabled':'')+'>'+
     txt('⬆ Nâng Rank','⬆ Rank Up')+'</button>';
  }else html+='<p>'+txt('Đã đạt Rank 5!','Rank 5 reached!')+'</p>';
  const effectName=t=>{
   const names={
    burn:txt('Thiêu Đốt','Burn'),poison:txt('Nhiễm Độc','Poison'),
    slow:txt('Làm Chậm','Slow'),strike:txt('Đòn Xung Kích','Impact'),
    evade:txt('Né Đòn','Evasion'),guard:txt('Giáp Bảo Hộ','Guard'),
    heal:txt('Hồi Phục','Healing')
   };
   return names[G.PKMSVVBox4?.ST?.[t]||'strike']||names.strike;
  };
  if(x.rank>=4)html+='<p>⏱️ '+txt('Rank 4: hồi chiêu nhanh hơn 5% trong Solo PvE.','Rank 4: 5% faster cooldown in Solo PvE.')+'</p>';
  if(x.rank>=5)html+='<p>✨ '+txt('Rank 5: hiệu ứng kết hợp lan tối đa 6 quái, hồi 12 giây; đòn kết liễu vẫn kích hoạt.','Rank 5: hybrid burst hits up to 6 foes, 12s cooldown; finishing blows also trigger it.')+'</p>';
  if(x.rank>=3){
   if(x.rankBranch)html+='<p>✨ '+txt('Hướng hiện tại: ','Current branch: ')+esc(typeName(x.rankBranch))+' · '+effectName(x.rankBranch)+' ('+txt('16% cơ hội, hồi 3,5 giây','16% chance, 3.5s cooldown')+')</p>';
   else html+='<h3>'+txt('Chọn hướng Rank 3 miễn phí','Choose your free Rank 3 path')+'</h3>'+
     '<div class="pkmbx-branches">'+api.branches(x.dex).map(t=>'<button class="btn small" data-pkmbx-branch="'+esc(t)+'">'+esc(typeName(t))+' · '+effectName(t)+'</button>').join('')+'</div>';
  }
  if(x.rank>=3&&x.rankBranch&&G.PKMSVVBox3){
   const prism=G.PKMSVVBox3;
   html+='<section class="pkmbx-prism-reset"><h3>🔮 '+
    txt('Lăng Kính Tái Khắc','Reforge Prism')+'</h3>'+
    '<p>'+txt('Trong túi: ','In Bag: ')+prism.count(s())+
    ' · '+txt('Đổi nhánh không mất Rank, Nature hoặc Mega.','Switch paths without losing Rank, Nature or Mega.')+'</p>'+
    '<div class="pkmbx-branches">'+api.branches(x.dex).filter(t=>t!==x.rankBranch)
     .map(t=>'<button type="button" class="btn small gold" data-pkmbx-reforge="'+esc(t)+'" '+
      (prism.count(s())<1?'disabled':'')+'>'+
      txt('Đổi sang ','Change to ')+esc(typeName(t))+' · 🔮 ×1</button>').join('')+'</div></section>';
  }
  body.innerHTML=html;
  const upgrade=$('pkmbx-rank-up');
  if(upgrade)upgrade.onclick=()=>{
   const latest=api.rankMaterials(s(),x.id);
   if(latest.available<latest.cost)return;
   // Apply directly; duplicate protection and atomic save rollback are in Stage2.
   // The outdated native confirmation popup is intentionally removed.
   try{api.rankUpAuto(x.id,s());render();}
   catch(error){alert(error?.message||String(error));}
  };
  for(const b of body.querySelectorAll('[data-pkmbx-branch]'))b.onclick=()=>{
   if(!confirm(txt('Chốt hướng Rank này? Sau này đổi hướng cần Lăng Kính Tái Khắc.','Confirm this Rank path? A Reforge Prism will be required to reset it later.')))return;
   try{api.chooseBranch(x.id,b.dataset.pkmbxBranch);render();}catch(e){alert(e.message);}
  };
  for(const b of body.querySelectorAll('[data-pkmbx-reforge]'))b.onclick=()=>{
   const prism=G.PKMSVVBox3;if(!prism)return;
   const branch=b.dataset.pkmbxReforge;
   if(!confirm(txt('Dùng 1 Lăng Kính để đổi nhánh Rank sang '+typeName(branch)+'? Rank và nâng cấp vẫn giữ nguyên.',
     'Spend 1 Reforge Prism to switch to '+typeName(branch)+'? Rank and upgrades stay.')))return;
   try{prism.resetBranch(x.id,branch);render();}catch(e){alert(e.message);}
  };

 }
 function open(id=null){requestedId=typeof id==='string'?id:null;ensure();selectedMat.clear();selectedProtected.clear();shardCount=0;render();}
 G.PKMSVVRankUI={open,close,render};
})();
