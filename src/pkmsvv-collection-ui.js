/* PKMSVV: daily/weekly Pokémon and Pokédex collection UI.
 * Render the entire add-on in the selected language. G.I18n's fallback
 * fragment translation must never mix Vietnamese and English in one sentence.
 */
G.PKMSVVCollectUI=(()=>{
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=n=>Number(n||0).toLocaleString('vi-VN');
 const L=(vi,en)=>G.I18n&&G.I18n.lang==='vi'?vi:en;
 const mon=id=>G.DEX_BY[id];
 function action(box,selector,handler){box.querySelectorAll(selector).forEach(el=>el.addEventListener('click',()=>handler(el)));}
 function render(box){
   const s=G.DB.save;
   if(!s)return;
   G.PKMSVVCollect.ensure(s);
   if(G.PKMSVVCollect.checkCollection(s)) G.DB.commit(true);
   const d=s.pkmDaily,w=s.pkmWeekly;
   const name=id=>mon(id)?esc(mon(id).name):L('Pokémon chưa xác định','Unknown Pokémon');
   const count=G.PKMSVVCollect.stampsCount(s);
   const all=G.DEX.filter(p=>G.SPRITE_META[p.dex]).length;
   const dailyDone=d.complete,weeklyDone=w.dexes.length&&w.done.length===w.dexes.length;
   const dailyInfo=d.dex?'<b>'+name(d.dex)+'</b> — '+L('Sống sót ít nhất 3 phút.','Survive for at least 3 minutes.'):L('Hãy mở khóa Pokémon đầu tiên.','Unlock your first Pokémon to begin.');
   const targetRows=w.dexes.map(dex=>
     '<div class="pkm-task"><span>'+(w.done.includes(dex)?'✅':'◻️')+' '+name(dex)+'</span>'+
     '<button class="btn small ghost" data-pkm-choose="'+dex+'">'+L('Chọn','Choose')+'</button></div>').join('');
   const block=document.createElement('section');block.className='pkm-collection-goals';
   block.setAttribute('translate','no');
   block.innerHTML=
     '<div class="pkm-guide"><h3>'+L('⭐ NHIỆM VỤ POKÉMON HÔM NAY',"⭐ TODAY'S POKÉMON CHALLENGE")+'</h3>'+
     '<p>'+dailyInfo+'</p><p class="sub">'+L('Thưởng: 500 PokéCoins + 2 vé Gacha','Reward: 500 PokéCoins + 2 Gacha tickets')+'</p>'+
     '<div class="pkm-task">'+(dailyDone?L('✅ Đã hoàn thành','✅ Completed'):L('◻️ Chưa hoàn thành','◻️ Not completed'))+
     (d.dex?'<button class="btn small ghost" data-pkm-choose="'+d.dex+'">'+L('Chọn Pokémon','Choose Pokémon')+'</button>':'')+
     '<button class="btn small gold" data-pkm-claim="daily" '+(!dailyDone||d.claimed?'disabled':'')+'>'+(d.claimed?L('Đã nhận','Claimed'):L('Nhận thưởng','Claim Reward'))+'</button></div></div>'+
     '<div class="pkm-guide"><h3>'+L('🏆 THỬ THÁCH TUẦN','🏆 WEEKLY CHALLENGE')+'</h3>'+
     '<p class="sub">'+L('Sống sót 3 phút với từng Pokémon được chỉ định, hoàn thành cả bộ để nhận 2.500 PokéCoins + 1 vé ×10.',
       'Survive 3 minutes with each assigned Pokémon. Complete all challenges to earn 2,500 PokéCoins and 1 ×10 Gacha ticket.')+'</p>'+
     (targetRows||'<p>'+L('Chưa có Pokémon để chọn.','No eligible Pokémon to choose.')+'</p>')+
     '<div class="pkm-task"><strong>'+w.done.length+'/'+w.dexes.length+' Pokémon</strong>'+
     '<button class="btn small gold" data-pkm-claim="weekly" '+(!weeklyDone||w.claimed?'disabled':'')+'>'+(w.claimed?L('Đã nhận','Claimed'):L('Nhận thưởng','Claim Reward'))+'</button></div></div>'+
     '<div class="pkm-guide"><h3>'+L('🏅 DẤU ẤN POKÉDEX','🏅 POKÉDEX STAMPS')+'</h3>'+
     '<p>'+L('Chơi 3 phút với một Pokémon lần đầu để nhận dấu ấn và <b>150 PokéCoins</b>.',
       'Play a Pokémon for 3 minutes for the first time to earn a stamp and <b>150 PokéCoins</b>.')+'</p>'+
     '<p><b>'+count+' / '+all+'</b> '+L('Dấu Ấn đã thu thập','Stamps collected')+'</p>'+
     '<div class="pkm-stamp-grid">'+[10,25,50,100,250,500,all].filter((n,i,a)=>n<=all&&a.indexOf(n)===i).map(n=>
       '<span class="'+(s.pkmMilestones[n]?'pkm-medal-on':'')+'"> '+(s.pkmMilestones[n]?'🏅':'🔒')+' '+n+' '+L('dấu ấn','stamps')+'</span>').join('')+'</div>'+
     '<p class="sub">'+L('Hoàn thành Gen: +5.000 PokéCoins, 1 vé ×10. Shiny đầy Gen: +10.000 PokéCoins.',
       'Complete a Generation: +5,000 PokéCoins and 1 ×10 ticket. Collect every Shiny in a Generation: +10,000 PokéCoins.')+'</p></div>';
   // v1.4: Region completion is visible in Goals, including all legends.
   const charm=document.createElement('section');
   charm.className='pkm-guide pkmsvv-v14-charms';
   charm.setAttribute('translate','no');
   const REGIONS=['Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea'];
   const line=[];
   for(let gen=1;gen<=9;gen++){
     const species=G.DEX.filter(p=>p.gen===gen&&G.SPRITE_META[p.dex]);
     const owned=species.filter(p=>(s.owned||{})[p.dex]).length;
     const complete=!!species.length&&!!G.Gacha&&typeof G.Gacha.hasCharm==='function'&&G.Gacha.hasCharm(s,gen);
     line.push('<span class="'+(complete?'pkm-medal-on':'')+'" title="'+owned+'/'+species.length+' Pokémon">'+
       (complete?'✨ ':'🔒 ')+REGIONS[gen-1]+' '+owned+'/'+species.length+'</span>');
   }
   charm.innerHTML='<h3>'+L('✨ SHINY CHARM THEO GEN','✨ REGIONAL SHINY CHARMS')+'</h3>'+
     '<p>'+L('Sưu tập đủ Pokémon của một Gen (kể cả huyền thoại) để tăng gấp đôi tỉ lệ Shiny khi Gacha Gen đó.',
      'Own every Pokémon in a region (including legendaries) to double Shiny odds on that regional banner.')+
     '</p><div class="pkm-stamp-grid">'+line.join('')+'</div>';
   // Keep a single container for existing mission UI and lightweight test DOMs.
   block.innerHTML += charm.outerHTML || ('<section class="pkm-guide pkmsvv-v14-charms">'+charm.innerHTML+'</section>');
   box.appendChild(block);
   action(block,'[data-pkm-claim]',el=>{
     if(!G.PKMSVVCollect.claim(s,el.dataset.pkmClaim))return;
     G.DB.commit(true);G.UI.refreshCoins();G.Audio.sfx('buy');renderReplace();
   });
   action(block,'[data-pkm-choose]',el=>{
     const dex=Number(el.dataset.pkmChoose);
     if(!G.PKMSVVCollect.choose(s,dex))return;
     G.DB.commit(true);
     G.UI.toast(L('Đã chọn ','Selected ')+name(dex).replace(/&amp;/g,'&'));
     G.MenuUI.open();
   });
 }
 function renderReplace(){G.GoalsUI.open('missions');}
 return {render};
})();
