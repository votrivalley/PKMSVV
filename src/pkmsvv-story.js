/* PKMSVV Chapter 0 — bilingual, replayable pixel-illustrated visual novel. */
G.PKMSVVStory=(()=>{
 const $=id=>document.getElementById(id),en=()=>G.I18n&&G.I18n.lang==='en';
 const tr=(vi,eng)=>en()?eng:vi;
 // Three independent pictures: approved eye/gate art stays in the prologue,
 // while a third scene is used ONLY for the Pokémon reveal after the starter quiz.
 const VISUALS=Object.freeze({
   1:'eyes', 2:'eyes', 3:'eyes',
   4:'gate', 5:'reveal',
   6:'chapter2-orbs', 7:'chapter2-shadow', 8:'chapter3-nest', 9:'chapter3-hatch'
 });
 const chapters={
  prologue:[
   {art:1,speaker:['???','???'],text:['...Mình đang ở đâu?','...Where am I?']},
   {art:1,speaker:['Tôi','Me'],text:['Tối quá... Mình còn sống sao?','It is so dark... Am I still alive?']},
   {art:2,speaker:['Tôi','Me'],text:['Tên của mình... Sao không thể nhớ nổi?','My name... Why can’t I remember it?']},
   {art:2,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Vậy... bạn tên gì? Hãy cho ta biết tên mà bạn muốn được gọi.','Then... what is your name? Tell me what you wish to be called.'],askName:true},
   {art:2,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Ta sẽ gọi ngươi là {name}. Hãy ghi nhớ cái tên ấy.','Then I shall call you {name}. Hold on to that name.']},
   {art:2,speaker:['Tôi','Me'],text:['Cơ thể mình... có gì đó không đúng.','Something feels wrong with my body.']},
   {art:3,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Ngươi cuối cùng cũng tỉnh lại.','You have finally awakened.']},
   {art:3,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Đây là vùng đất của những ký ức thất lạc.','This is the land of lost memories.']},
   {art:4,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Nếu muốn tiếp tục, trái tim ngươi phải chọn một hình hài.','To go on, your heart must choose a new form.']},
   {art:4,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Hãy trả lời các câu hỏi. Đừng nghĩ quá lâu... hãy là chính mình.','Answer these questions. Do not overthink... be yourself.']}
  ],
  chapter1:[
   {art:1,speaker:['Tôi','Me'],text:['Mình đã chiến đấu... nhưng tại sao mọi thứ cứ lặp lại?','I fought... but why does everything keep repeating?']},
   {art:2,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Mỗi lần đứng dậy, một mảnh ký ức sẽ quay về.','Each time you rise again, a fragment of memory returns.']},
   {art:4,speaker:['Tôi','Me'],text:['Vậy phải sống sót bao lâu mới nhớ được mình là ai?','How long must I survive before I remember who I am?']},
   {art:4,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Đừng đếm thời gian. Hãy học cách điều khiển cả tám sức mạnh.','Do not count the minutes. Learn to wield all eight powers.']}
  ],
  chapter2:[
   {art:6,speaker:['Tôi','Me'],text:['Tám kỹ năng... Mình đã học đủ cả tám. Sao mặt đất lại phát sáng?','Eight skills... I have learned all eight. Why is the ground glowing?']},
   {art:6,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Cánh cửa thứ tám đã mở. Nhưng điều ngươi tìm kiếm không chỉ là sức mạnh.','The eighth gate has opened. But what you seek is not merely power.']},
   {art:6,speaker:['Tôi','Me'],text:['Đó là... một ký ức? Mình nhìn thấy một nơi chưa từng đến.','Is that... a memory? I see a place I have never visited.']},
   {art:6,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Mystery Orb là mảnh sức mạnh còn sót lại từ thế giới bị lãng quên.','Mystery Orbs are fragments of power left by a forgotten world.']},
   {art:6,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Khi đã học đủ tám kỹ năng trong trận, ngươi mới có thể cảm nhận và nhặt được chúng.','Only after learning all eight skills in a run can you sense and collect them.']},
   {art:6,speaker:['Tôi','Me'],text:['Vậy mình có thể chọn quả nào để dùng trước chứ?','So I can choose which Orb to use first?']},
   {art:6,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Không. Ký ức đến trước phải được giải phóng trước. Nhặt trước thì dùng trước.','No. The memory you find first must be released first. First collected, first used.']},
   {art:6,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Orb chỉ dùng một lần, có thể cứu mạng ngươi. Nhưng sức mạnh ấy không ở lại sau mỗi trận.','Each Orb is a one-use lifeline, but its power disappears after the run.']},
   {art:7,speaker:['Tôi','Me'],text:['Nếu đây là ký ức của mình... ai đã lấy nó đi?','If these are my memories... who took them away?']},
   {art:7,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Có những kẻ canh giữ điều ngươi đã quên. Đừng đánh thức chúng quá sớm.','Some guard what you have forgotten. Do not awaken them too early.']},
   {art:7,speaker:['Tôi','Me'],text:['Mình vừa nhìn thấy một bóng trắng... Arceus sao?','I saw a white silhouette... was that Arceus?']},
   {art:7,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Khi thời khắc phán xét đến, ngươi sẽ tự tìm được câu trả lời.','When judgment arrives, you will discover the answer yourself.']}
  ],
  chapter3:[
   {art:8,speaker:['Tôi','Me'],text:['Sáu loại Orb... Mình đã dùng hết rồi. Nhưng có gì đó đang đáp lại từ lòng đất.','All six types of Orbs... I have used them. But something beneath the earth is answering.']},
   {art:8,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Ký ức không chỉ thuộc về ngươi. Có những sinh mệnh đã bị bỏ lại khi thế giới này tan vỡ.','Memories do not belong only to you. Other lives were left behind when this world broke.']},
   {art:8,speaker:['Tôi','Me'],text:['Những tiếng động đó... giống như nhịp tim?','Those sounds... are they heartbeats?']},
   {art:8,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Hãy tìm những ổ trứng còn sót lại. Chúng đang chờ ai đó bảo vệ.','Find the nests that remain. They are waiting for someone to protect them.']},
   {art:8,speaker:['Tôi','Me'],text:['Vừa rồi... bóng trắng ấy lại xuất hiện. Arceus đang quan sát sao?','That white silhouette appeared again. Is Arceus watching?']},
   {art:9,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Đừng vội tìm câu trả lời. Hãy nâng niu thứ ngươi tìm được. Quả trứng sẽ theo bước chân ngươi.','Do not rush for answers. Guard what you find. The egg will follow your steps.']},
   {art:9,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Hãy tiếp tục chiến đấu, thu thập kinh nghiệm. Mỗi bước tiến sẽ giúp sự sống bên trong thức giấc.','Keep fighting and gathering experience. Every step helps the life within awaken.']},
   {art:9,speaker:['Tôi','Me'],text:['Một Pokémon bé nhỏ... Nó đang đi theo mình!','A tiny Pokémon... It is following me!']},
   {art:9,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Chúng có thể chữa lành, bảo vệ hoặc cùng ngươi chiến đấu. Nhưng ngươi chỉ có thể chăm sóc hai bạn đồng hành cùng lúc.','They can heal, shield, or fight beside you. But you can care for only two companions at once.']},
   {art:9,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Khi giúp đủ hai mươi quả trứng nở và sống sót mười lăm phút trong một lượt, trái tim ngươi sẽ đủ sức mở nơi trú ẩn thứ ba.','Hatch twenty eggs and survive fifteen minutes in one run. Then your heart will be ready to shelter a third companion.']},
   {art:9,speaker:['Tôi','Me'],text:['Lần đầu tiên... mình không chỉ chiến đấu để sống sót một mình.','For the first time... I am not fighting just to survive alone.']}
  ],
  reveal:[
   {art:5,speaker:['Tôi','Me'],text:['Mình... đã biến thành một Pokémon?!','I... turned into a Pokémon?!']},
   {art:5,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Sức mạnh của ngươi vẫn đang ngủ yên. Ban đầu chỉ có 3 ô kỹ năng.','Your power still sleeps. At first, only 3 skill slots are open.']},
   {art:5,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Hạ tổng cộng 50, 100 và 200 quái để mở thêm ba ô.','Defeat a total of 50, 100 and 200 enemies to unlock three more slots.']},
   {art:5,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Đạt tổng 10 và 20 cấp nâng cấp để mở hai ô cuối. Nâng riêng hay nâng toàn đội đều được tính.','Reach 10 and 20 total upgrade ranks for the last two slots. Individual and team upgrades both count.']},
   {art:5,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Mở một lần, mọi Pokémon đều dùng được mãi mãi. Nhưng ngươi vẫn phải học chiêu trong từng trận.','Unlock once, and every Pokémon can use them forever. But you must still learn moves during each run.']},
   {art:5,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Hãy sống sót... và tìm lại câu trả lời mà ngươi đã đánh mất.','Survive... and reclaim the answers you have lost.']}
  ]
 };
 let lines=[],idx=0,full='',visible=0,timer=null,next=null,mode='',replaying=false,chosenDex=0;
 let nameFormOpen=false,nameChecking=false,nameSubmitting=false;
 const validNick=s=>/^[A-Za-z0-9_ñÑáéíóúÁÉÍÓÚ]{3,16}$/.test(s);
 const displayName=()=>String((G.Social&&G.Social.me&&G.Social.me.name)||
                        (G.DB.save&&G.DB.save.name)||tr('Người chơi','Player'));
 function hideNameForm(){
  nameFormOpen=false;
  $('pkmsvv-story-name-form').classList.add('hidden');
  $('pkmsvv-story-next').classList.remove('hidden');
  $('pkmsvv-story-name-error').textContent='';
 }
 function nameDone(){
  if(G.DB.save){G.DB.save.pkmsvvNameChosen=true;G.DB.commit(true);}
  hideNameForm();idx++;draw();
 }
 async function askName(){
  if(nameFormOpen||nameChecking||mode!=='prologue')return;
  if(replaying||(G.DB.save&&G.DB.save.pkmsvvNameChosen)){idx++;draw();return;}
  if(G.DB.online&&G.Social&&G.Social.start){
   nameChecking=true;
   try{
    const status=await G.Social.start();
    if(mode!=='prologue')return;
    if(status==='ok'&&G.Social.me){nameDone();return;}
   }catch(err){console.warn('PKMSVV: nickname lookup unavailable',err);}
   finally{nameChecking=false;}
  }
  if(mode!=='prologue')return;
  nameFormOpen=true;
  $('pkmsvv-story-name-form').classList.remove('hidden');
  $('pkmsvv-story-next').classList.add('hidden');
  $('pkmsvv-story-name-label').textContent=tr('Biệt danh của bạn (3–16 ký tự)','Your nickname (3–16 characters)');
  $('pkmsvv-story-name-input').placeholder=tr('Chữ Latin, số hoặc _','Latin letters, digits or _');
  $('pkmsvv-story-name-save').textContent=tr('Đây là tên tôi!','This is my name!');
  $('pkmsvv-story-name-input').value='';
  $('pkmsvv-story-name-error').textContent='';
  $('pkmsvv-story-name-input').focus();
 }
 async function saveName(e){
  e.preventDefault();
  if(!nameFormOpen||nameSubmitting)return;
  const name=$('pkmsvv-story-name-input').value.trim();
  const err=$('pkmsvv-story-name-error'),btn=$('pkmsvv-story-name-save');
  if(!validNick(name)){
   err.textContent=tr('Dùng 3–16 ký tự: chữ Latin, số hoặc _. Không có dấu cách.','Use 3–16 Latin letters, digits or underscores. No spaces.');
   return;
  }
  nameSubmitting=true;btn.disabled=true;err.textContent='';
  try{
   if(G.DB.online){
    const status=await G.Social.start();
    if(status==='off')throw Error('Offline');
    if(status==='ok'&&G.Social.me){nameDone();return;} // Keep established online nickname.
    const result=await G.Social.claimNick(name);
    if(!result.ok){
     err.textContent=/ya lo tiene otro|taken/i.test(result.error||'')
      ?tr('Tên này đã có người dùng. Hãy chọn tên khác.','This nickname is taken; please choose another.')
      :tr('Không thể lưu tên: ','Could not save nickname: ')+(result.error||'');
     return;
    }
    nameDone();
   }else{
    if(G.DB.guest)G.DB.save.name=name;
    else G.DB.setName(name);
    nameDone();
   }
  }catch(ex){err.textContent=tr('Chưa lưu được tên. Kiểm tra mạng và thử lại.','Could not save nickname. Check your connection and retry.');console.warn(ex);}
  finally{nameSubmitting=false;btn.disabled=false;}
 }
 function skipStory(){
  if(mode==='prologue'&&!replaying&&G.DB.save&&!G.DB.save.pkmsvvNameChosen&&!(G.Social&&G.Social.me)){
   if(nameFormOpen){finish();return;} // Deliberate skip; multiplayer can still ask later.
   const i=lines.findIndex(scene=>scene.askName);
   if(i>=0){idx=i;draw();stop();$('pkmsvv-story-line').textContent=full;askName();return;}
  }
  finish();
 }

 function stop(){if(timer){clearInterval(timer);timer=null;}}
 function finish(){
  stop();const callback=next,wasPrologue=mode==='prologue';
  if(wasPrologue&&!replaying&&G.DB.save){
   G.DB.save.pkmsvvStorySeen=true;G.DB.commit(true);
  }
  hideNameForm();next=null;mode='';G.UI.hide('scr-pkmsvv-story');
  if(typeof callback==='function')callback();
 }
 function draw(){
  stop();hideNameForm();
  const item=lines[idx];if(!item){finish();return;}
  const img=$('pkmsvv-story-image'),cv=$('pkmsvv-story-mon');
  const key=VISUALS[item.art] || 'eyes';
  const imagePath='assets/story/'+key+'.webp';
  // Images are shared between dialogue beats to avoid flashing or unnecessary downloads.
  const frame=$('pkmsvv-story-frame');
  frame.dataset.scene=String(item.art);
  if(img.dataset.artKey!==key){
   img.dataset.artKey=key;
   // If the new third artwork is missing in an older build, show the approved
   // portal illustration rather than the crude placeholder. Never replace the original two.
   img.onerror=()=>{
    if(key==='reveal' && !img.dataset.revealFallback){
      img.dataset.revealFallback='1';
      img.onerror=()=>{img.onerror=null;img.src='assets/story/scene-5.svg';};
      img.src='assets/story/gate.webp';
    }else if(key==='chapter2-orbs'||key==='chapter2-shadow'||key==='chapter3-nest'||key==='chapter3-hatch'){
      img.onerror=null;
      img.src='assets/story/gate.webp';
    }else{
      img.onerror=null;
      img.src='assets/story/scene-'+item.art+'.svg';
    }
   };
   delete img.dataset.revealFallback;
   img.src=imagePath;
  }
  img.alt=key==='chapter3-nest'?tr('Ổ trứng còn sót lại giữa vùng đất ký ức','An abandoned nest in the land of lost memories'):
    key==='chapter3-hatch'?tr('Quả trứng nở, Pokémon con đi theo người sống sót','An egg hatches and a baby Pokémon joins the survivor'):
    key==='chapter2-orbs'?tr('Vòng phép sáng lên, Mystery Orbs trỗi dậy giữa đêm','Eight powers awaken as the Mystery Orbs rise into the night'):
    key==='chapter2-shadow'?tr('Bóng trắng bí ẩn xuất hiện trong chính khung cảnh Mystery Orbs','A mysterious white shadow appears in the same Mystery Orb scene'):
    tr(key==='eyes'?'Bóng người trước đôi mắt bí ẩn giữa bầu trời sao':
              key==='gate'?'Bóng người trước cổng ánh sáng giữa bầu trời sao':
              'Cổng ánh sáng rộng mở, chờ Pokémon thức tỉnh',
             key==='eyes'?'A lone soul beneath mysterious eyes in the starry sky':
              key==='gate'?'A lone soul facing a glowing portal beneath the stars':
              'An empty celestial gateway awaiting the awakened Pokémon');
  cv.classList.toggle('hidden',mode!=='reveal');
  if(mode==='reveal'&&chosenDex&&G.UI&&G.UI.sprite)G.UI.sprite(cv,chosenDex,{lively:true,scale:3,hero:true});
  $('pkmsvv-story-chapter').textContent=mode==='chapter3'?tr('CHƯƠNG 3 · MẦM SỐNG BỊ LÃNG QUÊN','CHAPTER 3 · FORGOTTEN LIFE'):
    mode==='chapter2'?tr('CHƯƠNG 2 · TIẾNG VỌNG THỨ TÁM','CHAPTER 2 · THE EIGHTH ECHO'):
    mode==='chapter1'?tr('CHƯƠNG 1 · NHỮNG MẢNH KÝ ỨC','CHAPTER 1 · MEMORY FRAGMENTS'):
    tr('CHƯƠNG 0 · THỨC TỈNH','CHAPTER 0 · AWAKENING');
  $('pkmsvv-story-speaker').textContent=item.speaker[en()?1:0];
  full=item.text[en()?1:0].replaceAll('{name}',displayName());
  const label=$('pkmsvv-story-line');label.textContent='';label.setAttribute('aria-label',full);
  visible=0;
  const glyphs=Array.from(full);
  timer=setInterval(()=>{
   visible=Math.min(glyphs.length,visible+2);label.textContent=glyphs.slice(0,visible).join('');
   if(visible>=glyphs.length)stop();
  },24);
  $('pkmsvv-story-count').textContent=(idx+1)+' / '+lines.length;
  $('pkmsvv-story-next').textContent=tr('Tiếp ▶','Next ▶');
  $('pkmsvv-story-skip').textContent=tr('Bỏ qua','Skip');
 }
 function advance(){
  if(!mode||nameFormOpen||nameChecking||nameSubmitting)return;
  if(timer){stop();$('pkmsvv-story-line').textContent=full;return;}
  if(lines[idx]&&lines[idx].askName){askName();return;}
  idx++;draw();
 }
 function play(type,done,replay=false,dex=0){
  if(!chapters[type])return;
  stop();hideNameForm();mode=type;idx=0;next=done;replaying=replay;chosenDex=dex;
  lines=chapters[type];G.UI.chrome(false);G.UI.show('scr-pkmsvv-story');
  // Preload once; optional offline fallbacks remain available.
  for(const name of ['eyes','gate','reveal','chapter2-orbs','chapter2-shadow','chapter3-nest','chapter3-hatch']){const preload=new Image();preload.src='assets/story/'+name+'.webp';}
  draw();
  if(G.Pad&&G.Pad.focusFirst)G.Pad.focusFirst();
 }
 function prologue(done){play('prologue',done);}
 function reveal(dex,done){play('reveal',done,false,dex);}
 function chapter3Pending(){return !!(G.DB.save&&G.DB.save.pkmsvvChapter3Pending&&!G.DB.save.pkmsvvChapter3Seen);}
 function markChapter3(){
  const s=G.DB.save;
  if(!s||!s.pkmsvvChapter2Seen||s.pkmsvvChapter3Seen||s.pkmsvvChapter3Pending)return false;
  if(((Number(s.stats&&s.stats.pkmsvvOrbTypeMask)||0)&63)!==63)return false;
  s.pkmsvvChapter3Pending=true;G.DB.commit(true);return true;
 }
 function chapter3(done){
  play('chapter3',()=>{
   if(G.DB.save){G.DB.save.pkmsvvChapter3Seen=true;G.DB.save.pkmsvvChapter3Pending=false;G.DB.commit(true);}
   if(done)done();
  });
 }
 function chapter2Pending(){return !!(G.DB.save&&G.DB.save.pkmsvvChapter2Pending&&!G.DB.save.pkmsvvChapter2Seen);}
 function chapter1Pending(){return !!(G.DB.save&&G.DB.save.pkmsvvChapter1Pending&&!G.DB.save.pkmsvvChapter1Seen);}
 function markChapter2(){
  const s=G.DB.save;if(!s||s.pkmsvvChapter2Seen||s.pkmsvvChapter2Pending)return;
  s.pkmsvvChapter2Pending=true;G.DB.commit(true);
 }
 function markChapter1(){
  const s=G.DB.save;if(!s||s.pkmsvvChapter1Seen||s.pkmsvvChapter1Pending)return;
  s.pkmsvvChapter1Pending=true;G.DB.commit(true);
 }
 function chapter2(done){
  play('chapter2',()=>{if(G.DB.save){G.DB.save.pkmsvvChapter2Seen=true;G.DB.save.pkmsvvChapter2Pending=false;G.DB.commit(true);markChapter3();}if(done)done();});
 }
 function chapter1(done){
  play('chapter1',()=>{if(G.DB.save){G.DB.save.pkmsvvChapter1Seen=true;G.DB.save.pkmsvvChapter1Pending=false;G.DB.commit(true);}if(done)done();});
 }
 function replay(type='prologue'){play(['chapter1','chapter2','chapter3'].includes(type)?type:'prologue',()=>G.Flow.goMenu(),true);}
 function memories(){
  const s=G.DB.save||{};
  // The default Memories menu opens the next available chapter to replay.
  // Cycling through chapters never modifies progress.
  const available=['prologue'];
  if(s.pkmsvvChapter1Seen)available.push('chapter1');
  if(s.pkmsvvChapter2Seen)available.push('chapter2');
  if(s.pkmsvvChapter3Seen)available.push('chapter3');
  if(available.length===1){replay('prologue');return;}
  const choices=document.createElement('section');
  choices.className='pkmsvv-memory-chooser';choices.setAttribute('role','dialog');
  choices.setAttribute('aria-label',tr('Ký Ức','Memories'));
  const labels={prologue:tr('Chương 0 · Thức Tỉnh','Chapter 0 · Awakening'),
   chapter1:tr('Chương 1 · Những Mảnh Ký Ức','Chapter 1 · Memory Fragments'),
   chapter2:tr('Chương 2 · Tiếng Vọng Thứ Tám','Chapter 2 · The Eighth Echo'),
   chapter3:tr('Chương 3 · Mầm Sống Bị Lãng Quên','Chapter 3 · Forgotten Life')};
  choices.innerHTML='<div class="pkmsvv-memory-inner"><h2>'+tr('Ký Ức','Memories')+'</h2>'+
   available.map(c=>'<button type="button" class="btn gold" data-chapter="'+c+'">'+labels[c]+'</button>').join('')+
   (s.pkmsvvChapter2Seen?'<button type="button" class="btn" data-orb-help="1">'+tr('📖 Hướng dẫn Mystery Orb','📖 Mystery Orb Guide')+'</button>':'')+
   '<button type="button" class="btn ghost" data-close="1">'+tr('Đóng','Close')+'</button></div>';
  document.body.appendChild(choices);
  choices.querySelectorAll('[data-chapter]').forEach(el=>{el.onclick=()=>{
   const chapter=el.dataset.chapter;choices.remove();replay(chapter);
  };});
  const help=choices.querySelector('[data-orb-help]');
  if(help)help.onclick=()=>{
   const inner=choices.querySelector('.pkmsvv-memory-inner');
   const vi=G.I18n&&G.I18n.lang==='vi',esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
   const orbs=G.Orbs&&G.Orbs.LIST||[];
   inner.innerHTML='<h2>'+tr('📖 Hướng dẫn Mystery Orb','📖 Mystery Orb Guide')+'</h2>'+
     '<p>'+tr('Trong mỗi trận, học đủ 8 kỹ năng để nhặt Orb. Tối đa 10 Orb rơi ra. Nhặt trước dùng trước, mỗi lần chỉ dùng một quả, hồi 5 giây. Orb biến mất khi kết thúc trận.','Learn all 8 skills in a run to collect Orbs. At most 10 Orbs drop per run. First picked, first used, one per activation, with a 5-second cooldown. Unused Orbs disappear after the run.')+'</p>'+
     '<p>'+tr('PC: phím 5. Tay cầm: Y mặc định. Điện thoại: nút Orb cạnh kỹ năng chủ động. Trong Co-op, chỉ người đủ 8 kỹ năng mới nhặt được Orb.','PC: key 5. Controller: Y by default. Phone: Orb button beside the active skill. In Co-op only players with all 8 learned skills can collect Orbs.')+'</p>'+
     orbs.map(o=>'<p style="margin:5px 0;color:'+o.col+'"><strong>'+esc(o.name[vi?0:1])+'</strong>: '+esc(o.desc[vi?0:1])+'</p>').join('')+
     '<button type="button" class="btn gold" id="pkmsvv-orb-guide-back">'+tr('Quay lại','Back')+'</button>';
   inner.querySelector('#pkmsvv-orb-guide-back').onclick=()=>{choices.remove();memories();};
  };
  choices.querySelector('[data-close]').onclick=()=>choices.remove();
 }
 function init(){
  $('pkmsvv-story-next').onclick=advance;
  $('pkmsvv-story-skip').onclick=skipStory;
  $('pkmsvv-story-name-form').onsubmit=saveName;
  $('pkmsvv-story-frame').onclick=e=>{if(!e.target.closest('button'))advance();};
  window.addEventListener('keydown',e=>{
   if(!mode)return;
   if(e.target&&e.target.closest&&e.target.closest('input,textarea,select,button'))return;
   if(['Enter',' ','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();advance();}
   else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();skipStory();}
  },true);
 }
 return {init,prologue,reveal,replay,memories,chapter1,chapter2,chapter3,markChapter1,markChapter2,markChapter3,chapter1Pending,chapter2Pending,chapter3Pending};
})();
