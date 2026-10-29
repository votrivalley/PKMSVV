/* PKMSVV Chapters 1–6; preserve legacy save keys and rewards on renumbering. */
G.PKMSVVStory=(()=>{
 const $=id=>document.getElementById(id),en=()=>G.I18n&&G.I18n.lang==='en';
 const tr=(vi,eng)=>en()?eng:vi;
 // Three independent pictures: approved eye/gate art stays in the prologue,
 // while a third scene is used ONLY for the Pokémon reveal after the starter quiz.
 const VISUALS=Object.freeze({
   1:'eyes', 2:'eyes', 3:'eyes',
   4:'gate', 5:'reveal',
   6:'chapter2-orbs', 7:'chapter2-shadow', 8:'chapter3-nest', 9:'chapter3-hatch',
   10:'chapter1-echo', 11:'chapter1-fragments'
 });
 const chapters={
  prologue:[
   {art:1,speaker:['???','???'],text:['...Mình đang ở đâu?','...Where am I?']},
   {art:1,speaker:['Tôi','Me'],text:['Tối quá... Mình còn sống sao?','It is so dark... Am I still alive?']},
   {art:2,speaker:['Tôi','Me'],text:['Tên của mình... Sao không thể nhớ nổi?','My name... Why can’t I remember it?']},
   {art:2,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Nếu ngươi không nhớ tên mình... vậy ngươi muốn ta gọi ngươi là gì?','If you cannot remember your name... what would you like me to call you?'],askName:true},
   {art:2,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Ta sẽ gọi ngươi là {name}. Hãy ghi nhớ cái tên ấy.','Then I shall call you {name}. Hold on to that name.']},
   {art:2,speaker:['Tôi','Me'],text:['Cơ thể mình... có gì đó không đúng.','Something feels wrong with my body.']},
   {art:3,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Ngươi cuối cùng cũng tỉnh lại.','You have finally awakened.']},
   {art:3,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Đây là vùng đất của những ký ức thất lạc.','This is the land of lost memories.']},
   {art:4,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Nếu muốn tiếp tục, trái tim ngươi phải chọn một hình hài.','To go on, your heart must choose a new form.']},
   {art:4,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Hãy trả lời các câu hỏi. Đừng nghĩ quá lâu... hãy là chính mình.','Answer these questions. Do not overthink... be yourself.']}
  ],
  chapter1:[
   {art:10,speaker:['Tôi','Me'],text:['Mình đã chiến đấu... nhưng tại sao mọi thứ cứ lặp lại?','I fought... but why does everything keep repeating?']},
   {art:10,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Mỗi lần đứng dậy, một mảnh ký ức sẽ quay về.','Each time you rise again, a fragment of memory returns.']},
   {art:11,speaker:['Tôi','Me'],text:['Vậy phải sống sót bao lâu mới nhớ được mình là ai?','How long must I survive before I remember who I am?']},
   {art:11,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Đừng đếm thời gian. Hãy học cách điều khiển cả tám sức mạnh.','Do not count the minutes. Learn to wield all eight powers.']}
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
   {art:9,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Chúng có thể chữa lành, bảo vệ hoặc cùng ngươi chiến đấu. Ban đầu, ngươi chỉ có thể chăm sóc một bạn đồng hành.','They can heal, shield, or fight beside you. At first, you can care for only one companion.']},
   {art:9,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Ngay từ đầu, ngươi đã có thể đồng hành cùng tối đa hai Pokémon nở từ trứng. Hãy bảo vệ chúng và để tình bạn lớn lên qua mỗi hành trình.','From the beginning, up to two Pokémon hatched from eggs can accompany you. Protect them and let your bond grow on every journey.']},
   {art:9,speaker:['Tôi','Me'],text:['Lần đầu tiên... mình không chỉ chiến đấu để sống sót một mình.','For the first time... I am not fighting just to survive alone.']}
  ],
  chapter5:[
   {art:10,speaker:['Tôi','Me'],text:['Dưới chân mình... có dấu chân của những Pokémon khác!','There are other Pokémon footprints here!']},
   {art:10,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Cánh cửa Đồng Hành đã mở. Ngươi không cần chiến đấu một mình nữa.','The Gate of Companions is open. You need not fight alone.']},
   {art:10,speaker:['Tôi','Me'],text:['Mình có thể đi cùng bạn bè và thử sức với họ sao?','I can team up with friends, or compete with them?']},
   {art:10,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Sống Còn, Tranh Trứng và Co-op là ba thử thách khác nhau.','Survival, Egg Rush, and Co-op are three different challenges.']},
   {art:10,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Có thể kết nối chung mạng LAN. Thiếu người sẽ có những huấn luyện viên AI tham gia.','Join on a local network. AI trainers can fill empty slots.']},
   {art:10,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Tranh Trứng chỉ tính điểm khi trứng nở cuối trận. Nhiều trứng chưa chắc đã thắng.','Egg Rush reveals points only after the eggs hatch at match end. More eggs do not guarantee victory.']},
   {art:10,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Sống Còn và Tranh Trứng không chờ lựa chọn kỹ năng; chỉ Co-op mới được đồng lòng đợi nhau.','Survival and Egg Rush never pause for your skill choices; only Co-op can wait together.']},
   {art:10,speaker:['Tôi','Me'],text:['Lần này mình sẽ tìm lại ký ức cùng những người bạn!','This time I will recover my memories with friends!']}
  ],
  chapter6:[
   {art:10,speaker:['Tôi','Me'],text:['Một đấu trường xuất hiện. Phía trên là mười chiếc vương miện!','An arena has appeared. Above it hang ten crowns!']},
   {art:10,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Mỗi vùng là giải loại trực tiếp mười sáu người. Vòng 16, tứ kết, bán kết, chung kết.','Each region has a sixteen-trainer knockout: round of sixteen, quarterfinals, semifinals and final.']},
   {art:10,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Giữa các vòng, ngươi có ba phút chuẩn bị.','There are three minutes to prepare between rounds.']},
   {art:10,speaker:['Tôi','Me'],text:['Vô địch là có Ấn Chứng ngay sao?','Does winning the tournament grant me the Crown Seal?']},
   {art:10,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Chưa. Ngươi phải đánh bại Champion đương nhiệm sau trận chung kết.','Not yet. You must beat the reigning Champion after the final.']},
   {art:10,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Nếu thua Champion, ngươi vẫn giữ cúp. Rèn luyện rồi quay lại thách đấu.','Lose to the Champion and you keep your trophy. Train and challenge again.']},
   {art:10,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Thu thập mười Ấn Chứng Vương Miện để mở cánh cổng cuối cùng trên trời.','Collect all ten Crown Seals to open the final sky gate.']},
   {art:10,speaker:['Tôi','Me'],text:['Những chiếc vương miện đó... mình sẽ giành bằng trận thắng thật sự.','Those crowns... I will earn them in real battles.']}
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
  $('pkmsvv-story-name-label').textContent=tr('Tên bạn muốn được gọi (3–16 ký tự)','What to call you (3–16 characters)');
  $('pkmsvv-story-name-input').placeholder=tr('Chữ Latin, số hoặc _','Latin letters, digits or _');
  $('pkmsvv-story-name-save').textContent=tr('Hãy gọi tôi như vậy','Call me that');
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
   if(nameFormOpen){finish(true);return;} // Skip the name form, but never the starter selection.
   const i=lines.findIndex(scene=>scene.askName);
   if(i>=0){idx=i;draw();stop();$('pkmsvv-story-line').textContent=full;askName();return;}
  }
  finish(true);
 }

 function stop(){if(timer){clearInterval(timer);timer=null;}}
 function finish(skipped=false){
  stop();const callback=next,wasPrologue=mode==='prologue';
  if(wasPrologue&&!replaying&&G.DB.save){
   G.DB.save.pkmsvvStorySeen=true;G.DB.commit(true);
  }
  hideNameForm();next=null;mode='';G.UI.hide('scr-pkmsvv-story');
  if(typeof callback==='function')callback(wasPrologue&&skipped&&!replaying);
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
    }else if(key==='chapter1-echo'||key==='chapter1-fragments'||key==='chapter2-orbs'||key==='chapter2-shadow'||key==='chapter3-nest'||key==='chapter3-hatch'){
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
  img.alt=key==='chapter1-echo'?tr('Lượt chiến đấu lặp lại giữa vùng đất ký ức','Repeating battles in the land of lost memories'):
     key==='chapter1-fragments'?tr('Tám sức mạnh và những mảnh ký ức đang trở lại','Eight powers and returning memory fragments'):
     key==='chapter3-nest'?tr('Ổ trứng còn sót lại giữa vùng đất ký ức','An abandoned nest in the land of lost memories'):
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
  $('pkmsvv-story-chapter').textContent=mode==='chapter6'?tr('CHƯƠNG 6 · ĐẤU TRƯỜNG VƯƠNG MIỆN','CHAPTER 6 · CROWN ARENA'):
    mode==='chapter5'?tr('CHƯƠNG 5 · ĐỒNG HÀNH','CHAPTER 5 · COMPANIONS'):
    mode==='chapter3'?tr('CHƯƠNG 4 · MẦM SỐNG BỊ LÃNG QUÊN','CHAPTER 4 · FORGOTTEN LIFE'):
    mode==='chapter2'?tr('CHƯƠNG 3 · TIẾNG VỌNG THỨ TÁM','CHAPTER 3 · THE EIGHTH ECHO'):
    mode==='chapter1'?tr('CHƯƠNG 2 · NHỮNG MẢNH KÝ ỨC','CHAPTER 2 · MEMORY FRAGMENTS'):
    tr('CHƯƠNG 1 · THỨC TỈNH','CHAPTER 1 · AWAKENING');
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
  for(const name of ['eyes','gate','reveal','chapter1-echo','chapter1-fragments','chapter2-orbs','chapter2-shadow','chapter3-nest','chapter3-hatch']){const preload=new Image();preload.src='assets/story/'+name+'.webp';}
  draw();
  if(G.Pad&&G.Pad.focusFirst)G.Pad.focusFirst();
 }
 function prologue(done){play('prologue',done);}
 function reveal(dex,done){play('reveal',()=>{syncChapterPurpleRewards();if(done)done();},false,dex);}
 function chapter3Pending(){return !!(G.DB.save&&G.DB.save.pkmsvvChapter3Pending&&!G.DB.save.pkmsvvChapter3Seen);}
 function markChapter3(){
  const s=G.DB.save;
  if(!s||!s.pkmsvvChapter2Seen||s.pkmsvvChapter3Seen||s.pkmsvvChapter3Pending)return false;
  if(((Number(s.stats&&s.stats.pkmsvvOrbTypeMask)||0)&63)!==63)return false;
  s.pkmsvvChapter3Pending=true;G.DB.commit(true);return true;
 }
 // Purple ticket icon is 'ticket10': one complete x10 Gacha pull per chapter.
 // Persist claim flags alongside this exact player's save, never in a
 // global browser flag. Old completed chapters get one retroactive reward.
 function syncChapterPurpleRewards(){
  const s=G.DB?.save;
  if(!s)return 0;
  const awarded=s.pkmsvvChapterPurpleRewards;
  const flags=(awarded&&typeof awarded==='object'&&!Array.isArray(awarded))?awarded:{};
  // Old reward ledger slots 0–3 MUST remain stable after visible renumbering.
  const completed=[
   !!(s.pkmsvvStorySeen&&(s.starter||s.partner)),
   !!s.pkmsvvChapter1Seen,!!s.pkmsvvChapter2Seen,!!s.pkmsvvChapter3Seen,
   !!s.pkmsvvChapter5Seen,!!s.pkmsvvChapter6Seen
  ];
  let count=0;
  for(let ch=0;ch<completed.length;ch++){
   if(!completed[ch]||flags[ch])continue;
   flags[ch]=true;count++;
  }
  if(!count)return 0;
  s.pkmsvvChapterPurpleRewards=flags;
  s.tickets=s.tickets||{t1:0,t10:0};
  s.tickets.t10=(Number(s.tickets.t10)||0)+count;
  // One commit folds the earned balance into the existing per-save ticket
  // ledger, preventing reload/replay from crediting the same chapter again.
  G.DB.commit(true);
  G.UI?.toast?.(count===1?
   tr('🎟️ Hoàn thành chương · +1 vé tím Gacha ×10!','🎟️ Chapter complete · +1 purple Gacha ×10 ticket!'):
   tr('🎟️ Thưởng các chương đã hoàn thành: +'+count+' vé tím Gacha ×10!','🎟️ Completed chapters reward: +'+count+' purple Gacha ×10 tickets!'),3500);
  return count;
 }
 function chapter3(done){
  play('chapter3',()=>{
   if(G.DB.save){G.DB.save.pkmsvvChapter3Seen=true;G.DB.save.pkmsvvChapter3Pending=false;G.DB.commit(true);syncChapterPurpleRewards();}
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
  play('chapter2',()=>{if(G.DB.save){G.DB.save.pkmsvvChapter2Seen=true;G.DB.save.pkmsvvChapter2Pending=false;G.DB.commit(true);syncChapterPurpleRewards();markChapter3();}if(done)done();});
 }
 function chapter1(done){
  play('chapter1',()=>{if(G.DB.save){G.DB.save.pkmsvvChapter1Seen=true;G.DB.save.pkmsvvChapter1Pending=false;G.DB.commit(true);syncChapterPurpleRewards();}if(done)done();});
 }
 function chapter5(done){
  if(!G.DB?.save?.pkmsvvChapter3Seen){done?.(false);return false;}
  play('chapter5',()=>{G.DB.save.pkmsvvChapter5Seen=true;G.DB.commit(true);
   syncChapterPurpleRewards();done?.(true);});return true;
 }
 function chapter6(done){
  if(!G.DB?.save?.pkmsvvChapter5Seen){done?.(false);return false;}
  play('chapter6',()=>{G.DB.save.pkmsvvChapter6Seen=true;G.DB.commit(true);
   syncChapterPurpleRewards();done?.(true);});return true;
 }
 function replay(type='prologue'){play(['chapter1','chapter2','chapter3','chapter5','chapter6'].includes(type)?type:'prologue',()=>G.Flow.goMenu(),true);}
 function memories(){
  const s=G.DB.save||{};
  // The default Memories menu opens the next available chapter to replay.
  // Cycling through chapters never modifies progress.
  const available=['prologue'];
  if(s.pkmsvvChapter1Seen)available.push('chapter1');
  if(s.pkmsvvChapter2Seen)available.push('chapter2');
  if(s.pkmsvvChapter3Seen)available.push('chapter3');
  if(s.pkmsvvChapter5Seen)available.push('chapter5');
  if(s.pkmsvvChapter6Seen)available.push('chapter6');
  if(available.length===1){replay('prologue');return;}
  const choices=document.createElement('section');
  choices.className='pkmsvv-memory-chooser';choices.setAttribute('role','dialog');
  choices.setAttribute('aria-label',tr('Ký Ức','Memories'));
  const labels={prologue:tr('Chương 1 · Thức Tỉnh','Chapter 1 · Awakening'),
   chapter1:tr('Chương 2 · Những Mảnh Ký Ức','Chapter 2 · Memory Fragments'),
   chapter2:tr('Chương 3 · Tiếng Vọng Thứ Tám','Chapter 3 · The Eighth Echo'),
   chapter3:tr('Chương 4 · Mầm Sống Bị Lãng Quên','Chapter 4 · Forgotten Life'),
   chapter5:tr('Chương 5 · Đồng Hành','Chapter 5 · Companions'),
   chapter6:tr('Chương 6 · Đấu Trường Vương Miện','Chapter 6 · Crown Arena')};
  choices.innerHTML='<div class="pkmsvv-memory-inner"><h2>'+tr('Ký Ức','Memories')+'</h2>'+
   available.map(c=>'<button type="button" class="btn gold" data-chapter="'+c+'">'+labels[c]+'</button>').join('')+
   '<button type="button" class="btn ghost" data-close="1">'+tr('Đóng','Close')+'</button></div>';
  document.body.appendChild(choices);
  choices.querySelectorAll('[data-chapter]').forEach(el=>{el.onclick=()=>{
   const chapter=el.dataset.chapter;choices.remove();replay(chapter);
  };});
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
 return {init,prologue,reveal,replay,memories,syncChapterPurpleRewards,chapter1,chapter2,chapter3,chapter5,chapter6,markChapter1,markChapter2,markChapter3,chapter1Pending,chapter2Pending,chapter3Pending};
})();
