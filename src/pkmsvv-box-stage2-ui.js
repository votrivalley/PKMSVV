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
 let panel=null,selectedMat=new Set(),shardCount=0;
 function attach(){
  const foot=document.querySelector('#pkmsvv-pokebox-overlay .pkmbx-foot');
  if(!foot||$('pkmbx-rank-open'))return;
  const b=document.createElement('button');b.type='button';b.className='btn gold';
  b.id='pkmbx-rank-open';b.setAttribute('translate','no');b.textContent=txt('⭐ Rank / Mảnh','⭐ Rank / Shards');
  b.onclick=open;
  foot.insertBefore(b,foot.firstChild);
 }
 if(!box._pkmbxRankUiWrapped){
  const original=box.open;
  box.open=function(...args){const result=original.apply(this,args);attach();return result;};
  box._pkmbxRankUiWrapped=true;
 }
 function close(){panel?.remove();panel=null;selectedMat.clear();}
 function ensure(){
  if(panel?.isConnected)return;
  panel=document.createElement('div');panel.id='pkmbx-rank-overlay';panel.setAttribute('translate','no');
  panel.innerHTML='<section class="pkmbx-rank-panel" role="dialog" aria-modal="true" aria-label="PokéBox Rank">'+
    '<header class="pkmbx-rank-head"><h2>⭐ Rank / Mảnh</h2><button class="btn small" id="pkmbx-rank-close"></button></header>'+
    '<div id="pkmbx-rank-body"></div><p class="pkmbx-rank-note" id="pkmbx-rank-note"></p></section>';
  document.body.appendChild(panel);
  $('pkmbx-rank-close').onclick=close;
  panel.addEventListener('click',e=>{if(e.target===panel)close();});
 }
 function render(){
  if(!panel)return;
  const x=api.selected(s()),body=$('pkmbx-rank-body');
  $('pkmbx-rank-close').textContent=txt('✕ Đóng','✕ Close');
  $('pkmbx-rank-note').textContent=txt(
   'Bản QA: Chỉ dùng Pokémon trùng đúng loài. Không tự tiêu Shiny, Legendary, Pokémon yêu thích hoặc Pokémon gốc từ save cũ. Rank 3/5 đang lưu hướng và chờ đặc tính chiến đấu hoàn thiện.',
   'QA: only exact species duplicates. Never consume Shiny, Legendary, favorites or migrated originals. Rank 3/5 branch metadata awaits final combat traits.');
  if(!x){body.innerHTML='<p>'+txt('Hãy tạo PokéBox và chọn một cá thể ở danh sách trước.','Create PokéBox and select an individual first.')+'</p>';return;}
  const all=api.candidateList(s(),x.id),cost=x.rank+1,have=api.shards(s(),x.dex),name=G.DEX_BY?.[x.dex]?.name||('#'+x.dex);
  selectedMat=new Set([...selectedMat].filter(id=>all.some(m=>m.id===id)));
  shardCount=Math.max(0,Math.min(shardCount,have,Math.max(0,cost-selectedMat.size)));
  const stats=api.formatRank(x.rank),next=api.formatRank(Math.min(5,x.rank+1));
  let html='<div class="pkmbx-rank-card"><strong>'+esc(name)+'</strong><span>#'+x.dex+(x.shiny?' ✨':'')+' · Rank '+x.rank+'/5</span></div>'+
  '<p>'+txt('Máu / sát thương: ','HP / damage: ')+'+'+stats.hp+'%'+(x.rank<5?' → +'+next.hp+'%':'')+
  ' · '+txt('Mảnh ','Shards ')+esc(name)+': <b>'+have+'</b></p>';
  if(x.rank<5){
   html+='<h3>'+txt('Nguyên liệu để lên Rank ','Materials for Rank ')+(x.rank+1)+': '+cost+'</h3>'+
     '<p>'+txt('Chọn từng cá thể trùng loài. Có thể phối hợp với Mảnh Rank.','Select exact-species duplicates; combine with species shards if desired.')+'</p>';
   if(all.length){
    html+='<div class="pkmbx-materials">'+all.map(m=>'<label><input type="checkbox" data-material="'+esc(m.id)+'" '+(selectedMat.has(m.id)?'checked':'')+'/> '+
      '#'+m.dex+' · '+esc(m.id)+' '+(m.shiny?'✨':'')+'</label>').join('')+'</div>';
   }else html+='<p>'+txt('Không có bản sao thường đủ điều kiện.','No eligible unprotected duplicates.')+'</p>';
   html+='<label class="pkmbx-shards">'+txt('Dùng Mảnh Rank: ','Use shards: ')+
     '<input type="number" id="pkmbx-shard-qty" min="0" max="'+Math.min(have,cost)+'" value="'+shardCount+'"/></label>'+
     '<p id="pkmbx-rank-count"></p><button class="btn gold" id="pkmbx-rank-up">'+
     txt('⬆ Nâng Rank','⬆ Rank Up')+'</button>';
  }else html+='<p>'+txt('Đã đạt Rank 5!','Rank 5 reached!')+'</p>';
  if(x.rank>=3){
   if(x.rankBranch)html+='<p>✨ '+txt('Hướng hiện tại: ','Current branch: ')+esc(typeName(x.rankBranch))+'</p>';
   else html+='<h3>'+txt('Chọn hướng Rank 3 miễn phí','Choose your free Rank 3 path')+'</h3>'+
     '<div class="pkmbx-branches">'+api.branches(x.dex).map(t=>'<button class="btn small" data-pkmbx-branch="'+esc(t)+'">'+esc(typeName(t))+'</button>').join('')+'</div>';
  }
  if(all.length)html+='<h3>'+txt('Đổi bản sao thành Mảnh Rank','Convert an unused duplicate into shards')+'</h3>'+
   '<div class="pkmbx-materials">'+all.map(m=>'<div><span>'+esc(m.id)+'</span><button class="btn small" data-pkmbx-convert="'+esc(m.id)+'">'+txt('Đổi +1 mảnh','Convert +1 shard')+'</button></div>').join('')+'</div>';
  body.innerHTML=html;
  for(const input of body.querySelectorAll('[data-material]'))input.onchange=()=>{
   if(input.checked)selectedMat.add(input.dataset.material);else selectedMat.delete(input.dataset.material);
   render();
  };
  const shardInput=$('pkmbx-shard-qty');if(shardInput)shardInput.onchange=()=>{
   shardCount=Math.max(0,Math.min(have,cost,Number(shardInput.value)||0));render();
  };
  const count=$('pkmbx-rank-count'),up=$('pkmbx-rank-up');
  if(up){
   const ready=selectedMat.size+shardCount===cost;
   count.textContent=selectedMat.size+' '+txt('bản sao','duplicates')+' + '+shardCount+' '+txt('mảnh','shards')+' / '+cost;
   up.disabled=!ready;
   up.onclick=()=>{
    if(!confirm(txt('Nâng Rank? Những Pokémon đã chọn sẽ bị tiêu thụ vĩnh viễn.','Rank up? Selected Pokémon will be permanently consumed.')))return;
    try{api.rankUp(x.id,[...selectedMat],shardCount);selectedMat.clear();shardCount=0;render();}catch(e){alert(e.message);}
   };
  }
  for(const b of body.querySelectorAll('[data-pkmbx-branch]'))b.onclick=()=>{
   if(!confirm(txt('Chốt hướng Rank này? Sau này đổi hướng cần Lăng Kính Tái Khắc.','Confirm this Rank path? A Reforge Prism will be required to reset it later.')))return;
   try{api.chooseBranch(x.id,b.dataset.pkmbxBranch);render();}catch(e){alert(e.message);}
  };
  for(const b of body.querySelectorAll('[data-pkmbx-convert]'))b.onclick=()=>{
   if(!confirm(txt('Chuyển Pokémon này thành 1 Mảnh Rank? Không thể hoàn tác.','Convert this Pokémon into one Rank shard? This cannot be undone.')))return;
   try{api.toFragments(b.dataset.pkmbxConvert);selectedMat.delete(b.dataset.pkmbxConvert);render();}catch(e){alert(e.message);}
  };
 }
 function open(){ensure();selectedMat.clear();shardCount=0;render();}
})();
