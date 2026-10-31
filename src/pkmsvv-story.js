/* PKMSVV Chapters 1-10: Ch6 Berry, 7 Arena, 8 Champion discovery, 9 first Mega, 10 Rayquaza after ten seals. Bonus Shadow reserved. */
G.PKMSVVStory=(()=>{
 const $=id=>document.getElementById(id),en=()=>G.I18n&&G.I18n.lang==='en';
 const tr=(vi,eng)=>en()?eng:vi;
 // Three independent pictures: approved eye/gate art stays in the prologue,
 // while a third scene is used ONLY for the Pokémon reveal after the starter quiz.
 const VISUALS=Object.freeze({
   1:'eyes', 2:'eyes', 3:'eyes',
   4:'gate', 5:'reveal',
   6:'chapter2-orbs', 7:'chapter2-shadow', 8:'chapter3-nest', 9:'chapter3-hatch',
   10:'chapter1-echo', 11:'chapter1-fragments',
   12:'chapter6-arena', 13:'chapter6-champion',
   14:'chapter7-seal', 15:'chapter7-mega',
   16:'chapter5-gate', 17:'chapter5-trials',
   18:'chapter6-berry-grove',19:'chapter6-berry-rescue',
   20:'chapter7-seal',21:'chapter7-mega'
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
   {art:16,speaker:['Tôi','Me'],text:['Dưới chân mình... có dấu chân của những Pokémon khác!','There are other Pokémon footprints here!']},
   {art:16,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Cánh cửa Đồng Hành đã mở. Ngươi không cần chiến đấu một mình nữa.','The Gate of Companions is open. You need not fight alone.']},
   {art:16,speaker:['Tôi','Me'],text:['Mình có thể đi cùng bạn bè và thử sức với họ sao?','I can team up with friends, or compete with them?']},
   {art:17,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Sống Còn, Tranh Trứng và Co-op là ba thử thách khác nhau.','Survival, Egg Rush, and Co-op are three different challenges.']},
   {art:17,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Có thể kết nối chung mạng LAN. Thiếu người sẽ có những huấn luyện viên AI tham gia.','Join on a local network. AI trainers can fill empty slots.']},
   {art:17,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Tranh Trứng chỉ tính điểm khi trứng nở cuối trận. Nhiều trứng chưa chắc đã thắng.','Egg Rush reveals points only after the eggs hatch at match end. More eggs do not guarantee victory.']},
   {art:17,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Sống Còn và Tranh Trứng không chờ lựa chọn kỹ năng; chỉ Co-op mới được đồng lòng đợi nhau.','Survival and Egg Rush never pause for your skill choices; only Co-op can wait together.']},
   {art:17,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Hoàn thành Sống Sót và Sống Còn để mở Chương 6: Bí Mật Berry. Tranh Trứng là thử thách tự chọn. Sử dụng đủ năm loại Berry mới mở Arena Chương 7.','Complete Co-op Survival and Battle Royale for Chapter 6 Berry Secrets. Egg Rush is optional. Use five Berry types to open Chapter 7 Arena.']},
   {art:17,speaker:['Tôi','Me'],text:['Lần này mình sẽ tìm lại ký ức cùng những người bạn!','This time I will recover my memories with friends!']}
  ],
  // Chapter 6: independent Berry journey; previous Arena/Mega save flags stay untouched.
  berry:[
   {art:18,speaker:['Tôi','Me'],text:['Giữa khu rừng ký ức... sao những quả Berry lại phát sáng?','Why do these Berries glow in the forest of memories?']},
   {art:18,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Berry giữ lại sự sống. Ngươi có thể mang tối đa hai quả cho mỗi trận chiến.','Berries preserve life. You may take up to two into each battle.']},
   {art:18,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Trước trận đấu, ngươi có bốn giây để chọn hoặc từ chối. Một quả đã mang đi sẽ được sử dụng hết.','Before each battle, you have four seconds to choose or skip. Equipped berries are consumed.']},
   {art:19,speaker:['Tôi','Me'],text:['Có thể tìm thêm Berry ở đâu?','Where can I find more Berries?']},
   {art:19,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Hãy mở Túi Berry ở trang chính: mua trong cửa hàng hoặc giải cứu Berry khỏi bóng tối.','Open the Berry Bag in the main menu: buy them in the Shop or rescue them from shadows.']},
   {art:19,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Hãy sử dụng năm loại Berry khác nhau để hoàn thành thử thách này.','Use five different Berry types to complete this trial.']},
   {art:19,speaker:['Tôi','Me'],text:['Mỗi quả là một cơ hội sống sót... mình sẽ ghi nhớ điều đó.','Each berry is another chance at life. I will remember.']}
  ],
  chapter6:[
   {art:12,speaker:['Tôi','Me'],text:['Một đấu trường xuất hiện. Phía trên là mười chiếc vương miện!','An arena has appeared. Above it hang ten crowns!']},
   {art:12,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Mỗi vùng là giải loại trực tiếp mười sáu người. Vòng sơ kết, tứ kết, bán kết và chung kết.','Each region has a sixteen-trainer knockout: round of sixteen, quarterfinals, semifinals and final.']},
   {art:12,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Vòng đầu chuẩn bị bốn phút, các vòng sau một phút ba mươi giây.','The first preparation lasts four minutes, later rounds ninety seconds.']},
   {art:12,speaker:['Tôi','Me'],text:['Vô địch là có Ấn Chứng ngay sao?','Does winning the tournament grant me the Crown Seal?']},
   {art:13,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Từng vùng có Champion đứng chờ tại trận quyết định. Chiến thắng mới có Ấn Chứng.','Each region has a Champion in its decisive fight. Win to earn the Crown Seal.']},
   {art:13,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Nếu chưa giành được Ấn Chứng, hãy luyện tập rồi thách đấu lại.','If you have not earned the Crown Seal, train and challenge the region again.']},
   {art:13,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Thu thập mười Ấn Chứng Vương Miện để mở cánh cổng cuối cùng trên trời.','Collect all ten Crown Seals to open the final sky gate.']},
   {art:13,speaker:['Tôi','Me'],text:['Những chiếc vương miện đó... mình sẽ giành bằng trận thắng thật sự.','Those crowns... I will earn them in real battles.']}
  ],
  championTen:[
   {art:12,speaker:['Tôi','Me'],text:['Những người giữ vương miện... hóa ra đó là các Champion!','So the holders of these crowns are Champions!']},
   {art:13,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Chương 8: Bí Mật Champion. Có mười vùng đất, mỗi vùng có một Champion chờ ngươi thách đấu.','Chapter 8: The Champions. Ten regions, each guarded by a Champion.']},
   {art:13,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Hãy đánh bại Champion đầu tiên. Sức mạnh Mega sẽ xuất hiện trong Máy quay Mega Stone.','Defeat the first Champion to unlock the Mega Stone machine.']},
   {art:13,speaker:['Tôi','Me'],text:['Mình sẽ tìm hiểu bí mật của những vương miện này!','I will uncover the secret behind these crowns!']}
  ],
  chapter7:[
   {art:14,speaker:['Tôi','Me'],text:['Mega đầu tiên... cuối cùng mình đã có thể sử dụng sức mạnh này!','My first Mega... I can finally use this power!']},
   {art:14,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Ngươi đã mở khóa một dạng Mega. Chương 9: Sức Mạnh Mega đã hoàn thành.','You have unlocked your first Mega form. Chapter 9: Mega Awakening is complete.']},
   {art:14,speaker:['Tôi','Me'],text:['Mega... là dạng tiến hóa mới sao?','Mega... is that a new kind of evolution?']},
   {art:15,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Đó là sức mạnh bùng lên trong một trận chiến, không phải một dạng tiến hóa vĩnh viễn.','It is a burst of power during battle, not a permanent evolution.']},
   {art:15,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Muốn biến hình, ngươi còn cần Pokémon phù hợp, Mega Stone tương ứng hoặc điều kiện đặc biệt của dạng đó.','To transform, you still need the right Pokémon and Mega Stone, or that form’s special requirement.']},
   {art:15,speaker:['Tôi','Me'],text:['Mình có thể dùng sức mạnh ấy mãi sao?','Can I use that power forever?']},
   {art:15,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Trong các trận solo, Mega kéo dài ba mươi giây, tăng chỉ số và giảm thời gian hồi chiêu ba mươi phần trăm.','In solo battles, Mega lasts thirty seconds, boosts stats and cuts skill cooldowns by thirty percent.']},
   {art:15,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Mở cửa Mega không có nghĩa mọi dạng đều được tặng. Những bóng đen ??? sẽ hiện nguyên hình khi ngươi thật sự sở hữu chúng.','Opening the Mega gate does not grant every form. The dark ??? silhouettes reveal themselves only when you truly unlock them.']},
   {art:15,speaker:['Tôi','Me'],text:['Vậy đây mới chỉ là khởi đầu... mình sẽ tìm đủ những mảnh sức mạnh ấy!','So this is only the beginning... I will gather those fragments of power!']}
  ],
  chapter10:[
   {art:20,speaker:['Tôi','Me'],text:['Mười Ấn Chứng Vương Miện đã hội tụ. Bầu trời bất ngờ tối sầm...','All ten Crown Seals converge. The sky suddenly darkens...']},
   {art:20,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Ngươi đã vượt qua thử thách Rayquaza. Nhưng đây không phải kết thúc.','You have survived Rayquaza. But this is not the end.']},
   {art:21,speaker:['Tôi','Me'],text:['Rayquaza... Mega hóa! Không, thứ năng lượng đen kia đang nuốt chửng nó!','Rayquaza Mega Evolves... No, that dark energy is consuming it!']},
   {art:21,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Mega Rayquaza đã hắc hóa và bay về phía chân trời. Bóng tối bắt đầu tràn vào thế giới Pokémon.','Shadow Mega Rayquaza flies into the horizon. Darkness is spreading across the Pokémon world.']},
   {art:21,speaker:['Tôi','Me'],text:['Một vùng phụ bản mới đang hình thành. Mình phải chuẩn bị để giải cứu Pokémon bị hắc hóa!','A new dungeon is forming. I must prepare to rescue Shadow Pokémon!']},
   {art:20,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Nhưng đây chưa phải hồi kết... Câu chuyện của chúng ta vẫn còn tiếp diễn.','But this is not the end... Our story is still unfolding.']}
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
  // Memory replay returns to the Memories selector, never to the main menu.
  if(memoryReplayActive&&mode!=='prologue'){
   stop();hideNameForm();mode='';next=null;memoryReplayActive=false;
   G.UI.hide('scr-pkmsvv-story');memories();return;
  }
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
  if(memoryReplayActive&&!mode){memoryReplayActive=false;memories();}
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
    }else if(key==='chapter1-echo'||key==='chapter1-fragments'||key==='chapter2-orbs'||key==='chapter2-shadow'||key==='chapter3-nest'||key==='chapter3-hatch'||key==='chapter5-gate'||key==='chapter5-trials'||key==='chapter6-arena'||key==='chapter6-champion'||key==='chapter7-seal'||key==='chapter7-mega'||key==='chapter6-berry-grove'||key==='chapter6-berry-rescue'){
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
    key==='chapter5-gate'?tr('Cổng Đồng Hành mở ra giữa vùng đất ký ức','The Gate of Companions opens in the land of lost memories'):
    key==='chapter5-trials'?tr('Ba thử thách Co-op, Sống Còn và Tranh Trứng','Three challenges: Co-op, Survival and Egg Rush'):
    key==='chapter6-arena'?tr('Đấu trường vương miện xuất hiện giữa bầu trời','A crown arena rises into the sky'):
    key==='chapter6-champion'?tr('Trận thách đấu Champion quyết định Ấn Chứng Vương Miện','A Champion duel for the Crown Seal'):
    key==='chapter7-seal'?tr('Ấn Chứng đầu tiên đánh thức sức mạnh Mega','The first Crown Seal awakens Mega power'):
    key==='chapter7-mega'?tr('Pokémon bùng nổ sức mạnh Tiến Hóa Mega','A Pokémon unleashes the power of Mega Evolution'):
    key==='chapter6-berry-grove'?tr('Vườn Berry bị lãng quên trong vùng đất ký ức','Forgotten Berry Grove in the land of lost memories'):
    key==='chapter6-berry-rescue'?tr('Cứu Berry khỏi bóng tối','Rescue Berries from the shadows'):
    key==='chapter2-orbs'?tr('Vòng phép sáng lên, Mystery Orbs trỗi dậy giữa đêm','Eight powers awaken as the Mystery Orbs rise into the night'):
    key==='chapter2-shadow'?tr('Bóng trắng bí ẩn xuất hiện trong chính khung cảnh Mystery Orbs','A mysterious white shadow appears in the same Mystery Orb scene'):
    tr(key==='eyes'?'Bóng người trước đôi mắt bí ẩn giữa bầu trời sao':
              key==='gate'?'Bóng người trước cổng ánh sáng giữa bầu trời sao':
              'Cổng ánh sáng rộng mở, chờ Pokémon thức tỉnh',
             key==='eyes'?'A lone soul beneath mysterious eyes in the starry sky':
              key==='gate'?'A lone soul facing a glowing portal beneath the stars':
              'An empty celestial gateway awaiting the awakened Pokémon');
  const rayquazaEscape=mode==='chapter10'&&item.art===21;
  cv.classList.toggle('hidden',mode!=='reveal'&&!rayquazaEscape);
  cv.classList.toggle('pkmsvv-shadow-rayquaza-flight',rayquazaEscape);
  if(mode==='reveal'&&chosenDex&&G.UI&&G.UI.sprite)G.UI.sprite(cv,chosenDex,{lively:true,scale:3,hero:true});
  if(rayquazaEscape&&G.UI?.sprite){
   // Use the ALREADY PACKAGED genuine Mega Rayquaza animation.
   // Dark tint is an in-story possession effect, not an imported Shadow asset.
   const mega=(G.PKMSVV_MEGA_CATALOG||[]).find(f=>f.key==='rayquazamega'&&f.artReady);
   G.UI.sprite(cv,mega?.spriteId||384,{lively:true,scale:2,hero:true});
  }
  $('pkmsvv-story-chapter').textContent=mode==='chapter10'?tr('CHƯƠNG 10 · BẦU TRỜI HẮC HÓA','CHAPTER 10 · SHADOWED SKY'):
    mode==='chapter7'?tr('CHƯƠNG 9 · SỨC MẠNH MEGA','CHAPTER 9 · MEGA AWAKENING'):
    mode==='championTen'?tr('CHƯƠNG 8 · BÍ MẬT CHAMPION','CHAPTER 8 · THE CHAMPIONS'):
    mode==='chapter6'?tr('CHƯƠNG 7 · ĐẤU TRƯỜNG VƯƠNG MIỆN','CHAPTER 7 · CROWN ARENA'):
    mode==='berry'?tr('CHƯƠNG 6 · BÍ MẬT BERRY','CHAPTER 6 · BERRY SECRETS'):
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
  for(const name of ['eyes','gate','reveal','chapter1-echo','chapter1-fragments','chapter2-orbs','chapter2-shadow','chapter3-nest','chapter3-hatch','chapter5-gate','chapter5-trials','chapter6-arena','chapter6-champion','chapter7-seal','chapter7-mega','chapter6-berry-grove','chapter6-berry-rescue']){const preload=new Image();preload.src='assets/story/'+name+'.webp';}
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
  // Preserve pre-existing ticket slots: 6=old Mega chapter, 7=Berry. New 8=Ch8 Champion intro, 9=Ch10 Rayquaza.
  const completed=[
   !!(s.pkmsvvStorySeen&&(s.starter||s.partner)),
   !!s.pkmsvvChapter1Seen,!!s.pkmsvvChapter2Seen,!!s.pkmsvvChapter3Seen,
   !!(s.pkmsvvChapter5Seen&&allMultiplayerCompleted(s)),!!s.pkmsvvChapter6Seen,
   !!s.pkmsvvChapter9MegaDone || (!!flags[6]&&!!s.pkmsvvChapter7Seen),
   !!s.pkmsvvBerryChapterDone,
   !!s.pkmsvvChapter8IntroSeen,
   !!s.pkmsvvChapter10Done
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
   // New players discover multiplayer in sequence, without intercepting its menu.
   if(G.DB.save&&!G.DB.save.pkmsvvChapter5Seen)chapter5(()=>{if(done)done();});
   else if(done)done();
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
 // Only Sống Sót and Sống Còn are required for Chapter 6.
 const MP_MODES=Object.freeze(['coop','royale']);
 const MP_OPTIONAL=Object.freeze(['eggrush']);
 const MP_LABELS=Object.freeze({coop:'Co-op',royale:'Sống Còn',eggrush:'Tranh Trứng'});
 function multiplayerProgress(save=G.DB?.save){
  const flags=save?.pkmsvvMultiplayerDone||{};
  const done=MP_MODES.filter(mode=>flags[mode]===true);
  return {count:done.length,total:MP_MODES.length,done,missing:MP_MODES.filter(mode=>flags[mode]!==true)};
 }
 function allMultiplayerCompleted(save=G.DB?.save){
  return multiplayerProgress(save).count===MP_MODES.length;
 }
 const CHAMPION_REGIONS=Object.freeze(['Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea','Votri Valley']);
 function championSealCount(save=G.DB?.save){
  const seals=save?.arenas?.pkmChampion?.seals||{};
  return CHAMPION_REGIONS.filter(region=>seals[region]===true).length;
 }
 function tenChampionCompleted(save=G.DB?.save){return championSealCount(save)===CHAMPION_REGIONS.length;}
 function earnedChampion(save=G.DB?.save){
  return Object.values(save?.arenas?.pkmChampion?.seals||{}).some(v=>v===true);
 }
 function oldArenaCup(save=G.DB?.save){
  // Preserve trophies earned before the new Chapter 6 prerequisite existed.
  const a=save?.arenas?.pkmChampion||{};
  return earnedChampion(save)||Object.values(a.trophies||{}).some(v=>v===true);
 }
 function arenaUnlocked(save=G.DB?.save){
  return !!(save?.pkmsvvChapter6Seen&&(allMultiplayerCompleted(save)||oldArenaCup(save)));
 }
 function megaUnlocked(save=G.DB?.save){
  return !!(save?.pkmsvvChapter7Seen&&earnedChampion(save));
 }
 // Called from the *real* multiplayer endRun, never the lobby/room creator.
 function recordMultiplayerCompletion(mode,detail={}){
  const s=G.DB?.save;
  if(!s?.pkmsvvChapter3Seen||![...MP_MODES,...MP_OPTIONAL].includes(mode)||detail.abandoned)return false;
  const time=Number(detail.time)||0;
  if(mode==='coop'){
   // In Co-op surviving or falling after genuine team play counts as finishing.
   // A one-second start-and-abandon run does not.
   if(time<60)return false;
  }else{
   // Competitive modes must have their authoritative final standings.
   const result=detail.result;
   if(!result||!Array.isArray(result.standings)||result.standings.length<2||
    !Number.isFinite(Number(result.finishedAt)))return false;
  }
  s.pkmsvvMultiplayerDone=s.pkmsvvMultiplayerDone||{};
  if(s.pkmsvvMultiplayerDone[mode]===true)return false;
  s.pkmsvvMultiplayerDone[mode]=true;G.DB.commit(true);
  // Chapter 5's one-time reward is earned only when BOTH required modes finish.
  if(allMultiplayerCompleted(s))syncChapterPurpleRewards();
  const progress=multiplayerProgress(s);
  G.UI?.toast?.(MP_OPTIONAL.includes(mode)?
   tr('✅ Tranh Trứng hoàn thành! Đây là chế độ tự chọn.','✅ Egg Rush complete! This mode is optional.'):
   allMultiplayerCompleted(s)?
   tr('🍓 Đã hoàn thành Sống Sót và Sống Còn! Chương 6 · Bí Mật Berry đã mở.','🍓 Survival and Battle Royale done! Chapter 6 Berry Secrets unlocked.'):
   tr('✅ Hoàn thành '+MP_LABELS[mode]+' · '+progress.count+'/2 chế độ bắt buộc.','✅ Completed '+MP_LABELS[mode]+' · '+progress.count+'/2 required modes.'),3500);
  return true;
 }
 function chapter5(done){
  if(!G.DB?.save?.pkmsvvChapter3Seen){done?.(false);return false;}
  play('chapter5',()=>{G.DB.save.pkmsvvChapter5Seen=true;G.DB.commit(true);
   syncChapterPurpleRewards();done?.(true);});return true;
 }
 function chapter6(done){
  // Internal chapter6 = visible Chapter 7 Arena. First complete Chapter 6 Berry.
  if(!G.DB?.save?.pkmsvvChapter5Seen||!allMultiplayerCompleted()||!G.DB.save.pkmsvvBerryChapterDone){done?.(false);return false;}
  play('chapter6',()=>{G.DB.save.pkmsvvChapter6Seen=true;G.DB.commit(true);
   syncChapterPurpleRewards();done?.(true);});return true;
 }
 function chapter8(done){
  const save=G.DB?.save;
  if(!save?.pkmsvvChapter6Seen){done?.(false);return false;}
  play('championTen',()=>{
   save.pkmsvvChapter8IntroSeen=true;save.pkmsvvChapter8Pending=false;
   G.DB.commit(true);syncChapterPurpleRewards();done?.(true);
  });return true;
 }
 // Legacy pkmsvvChapter7Seen was the Mega-access gate on older saves.
 // Keep it permanently true after the FIRST Champion and never revoke old access.
 function onChampionSeal(){
  const save=G.DB?.save;if(!save)return false;
  if(earnedChampion(save)&&!save.pkmsvvChapter7Seen){
   save.pkmsvvChapter7Seen=true;G.UI?.toast?.(tr('✧ Đã mở Máy quay Mega Stone!','✧ Mega Stone machine unlocked!'),3500);
  }
  if(tenChampionCompleted(save)&&!save.pkmsvvChapter10Done)
   save.pkmsvvChapter10Pending=true;
  G.DB.commit(true);return tenChampionCompleted(save);
 }
 function firstMegaUnlocked(save=G.DB?.save){
  if(!save?.pkmsvvChapter7Seen)return false;
  const forms=G.PKMSVV_MEGA_CATALOG||[];
  const phase=G.PKMSVVMegaPhase3;
  return forms.some(f=>f?.artReady===true&&(
   typeof phase?.isBattleReady==='function'?phase.isBattleReady(f):
   phase?.isUnlocked?.(f)
  ));
 }
 function onMegaUnlocked(){
  const save=G.DB?.save;
  if(!save||!firstMegaUnlocked(save)||save.pkmsvvChapter9MegaDone)return false;
  save.pkmsvvChapter9MegaDone=true;save.pkmsvvChapter9Pending=true;
  G.DB.commit(true);syncChapterPurpleRewards();
  G.UI?.toast?.(tr('✧ Mở khóa Mega đầu tiên! Hoàn thành Chương 9 · Xem truyện trong Ký Ức.',
   '✧ First Mega unlocked! Chapter 9 complete · View story in Memories.'),4000);
  return true;
 }
 function chapter7(done){
  const save=G.DB?.save;
  if(!save?.pkmsvvChapter6Seen||!firstMegaUnlocked(save)){done?.(false);return false;}
  play('chapter7',()=>{
   save.pkmsvvChapter9MegaDone=true;save.pkmsvvChapter9MegaSeen=true;save.pkmsvvChapter9Pending=false;
   G.DB.commit(true);syncChapterPurpleRewards();done?.(true);
  });return true;
 }
 function chapter10(done){
  const save=G.DB?.save;
  if(!tenChampionCompleted(save)||!save?.pkmsvvRayquazaDefeated){done?.(false);return false;}
  play('chapter10',()=>{
   save.pkmsvvChapter10Seen=true;save.pkmsvvChapter10Done=true;save.pkmsvvChapter10Pending=false;
   save.pkmsvvShadowBonusTeased=true;
   G.DB.commit(true);syncChapterPurpleRewards();done?.(true);
  });return true;
 }
 function berryChapter(done){
  if(!G.DB?.save?.pkmsvvChapter5Seen||(!allMultiplayerCompleted()&&!G.DB.save.pkmsvvBerryIntroSeen&&!G.DB.save.pkmsvvChapter6Seen)){done?.(false);return false;}
  const already=!!G.DB.save.pkmsvvBerryIntroSeen;
  play('berry',()=>{
   if(!already&&G.DB?.save){
    G.DB.save.pkmsvvBerryIntroSeen=true;
    // Two free starter berries: keeps onboarding possible without purchases.
    G.PKMSVVBerry?.grant?.('oran',1);
    G.PKMSVVBerry?.grant?.('liechi',1);
    G.DB.commit(true);
   }
   done?.(true);
  },already);
  return true;
 }
 function replay(type='prologue'){play(['chapter1','chapter2','chapter3','chapter5','berry','chapter6','championTen','chapter7','chapter10'].includes(type)?type:'prologue',()=>G.Flow.goMenu(),true);}
 let memoryReplayActive=false;
 function memories(){
  const s=G.DB.save||{};
  // The default Memories menu opens the next available chapter to replay.
  // Cycling through chapters never modifies progress.
  const available=['prologue'];
  if(s.pkmsvvChapter1Seen)available.push('chapter1');
  if(s.pkmsvvChapter2Seen)available.push('chapter2');
  if(s.pkmsvvChapter3Seen)available.push('chapter3');
  // Story continuation is selectable before first completion, without blocking LAN.
  if(s.pkmsvvChapter3Seen)available.push('chapter5');
  if(s.pkmsvvChapter5Seen&&(allMultiplayerCompleted(s)||s.pkmsvvBerryIntroSeen||s.pkmsvvChapter6Seen))available.push('berry');
  if((s.pkmsvvChapter5Seen&&allMultiplayerCompleted(s)&&s.pkmsvvBerryChapterDone)||s.pkmsvvChapter6Seen)available.push('chapter6');
  if(arenaUnlocked(s))available.push('championTen');
  if(firstMegaUnlocked(s)||s.pkmsvvChapter9MegaDone)available.push('chapter7');
  if(s.pkmsvvRayquazaDefeated||s.pkmsvvChapter10Done)available.push('chapter10');
  if(available.length===1){replay('prologue');return;}
  const choices=document.createElement('section');
  choices.className='pkmsvv-memory-chooser';choices.setAttribute('role','dialog');
  choices.setAttribute('aria-label',tr('Ký Ức','Memories'));
  const labels={prologue:tr('Chương 1 · Thức Tỉnh','Chapter 1 · Awakening'),
   chapter1:tr('Chương 2 · Những Mảnh Ký Ức','Chapter 2 · Memory Fragments'),
   chapter2:tr('Chương 3 · Tiếng Vọng Thứ Tám','Chapter 3 · The Eighth Echo'),
   chapter3:tr('Chương 4 · Mầm Sống Bị Lãng Quên','Chapter 4 · Forgotten Life'),
   chapter5:tr('Chương 5 · Đồng Hành','Chapter 5 · Companions'),
   berry:tr('Chương 6 · Bí Mật Berry','Chapter 6 · Berry Secrets'),
   chapter6:tr('Chương 7 · Đấu Trường Vương Miện','Chapter 7 · Crown Arena'),
   championTen:tr('Chương 8 · Bí Mật Champion','Chapter 8 · The Champions'),
   chapter7:tr('Chương 9 · Sức Mạnh Mega','Chapter 9 · Mega Awakening'),
   chapter10:tr('Chương 10 · Bầu Trời Hắc Hóa','Chapter 10 · Shadowed Sky')};
  choices.innerHTML='<div class="pkmsvv-memory-inner"><h2>'+tr('Ký Ức','Memories')+'</h2>'+
   available.map(c=>'<button type="button" class="btn gold" data-chapter="'+c+'">'+labels[c]+'</button>').join('')+
   '<button type="button" class="btn ghost" data-close="1">'+tr('Đóng','Close')+'</button></div>';
  document.body.appendChild(choices);
  choices.querySelectorAll('[data-chapter]').forEach(el=>{el.onclick=()=>{
   const chapter=el.dataset.chapter;choices.remove();memoryReplayActive=true;
   if(chapter==='berry'&&!G.DB?.save?.pkmsvvBerryIntroSeen)berryChapter(()=>G.Flow.goMenu());
   else if(chapter==='chapter5'&&!G.DB?.save?.pkmsvvChapter5Seen)chapter5(()=>G.Flow.goMenu());
   else if(chapter==='chapter6'&&!G.DB?.save?.pkmsvvChapter6Seen)chapter6(()=>G.Flow.goMenu());
   else if(chapter==='championTen'&&!G.DB?.save?.pkmsvvChapter8IntroSeen)chapter8(()=>G.Flow.goMenu());
   else if(chapter==='chapter7'&&!G.DB?.save?.pkmsvvChapter9MegaSeen)chapter7(()=>G.Flow.goMenu());
   else if(chapter==='chapter10'&&!G.DB?.save?.pkmsvvChapter10Seen)chapter10(()=>G.Flow.goMenu());
   else replay(chapter);
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
 return {init,prologue,reveal,replay,memories,syncChapterPurpleRewards,chapter1,chapter2,chapter3,chapter5,berryChapter,chapter6,chapter7,chapter8,chapter10,onChampionSeal,onMegaUnlocked,firstMegaUnlocked,championSealCount,tenChampionCompleted,multiplayerProgress,allMultiplayerCompleted,recordMultiplayerCompletion,arenaUnlocked,earnedChampion,megaUnlocked,markChapter1,markChapter2,markChapter3,chapter1Pending,chapter2Pending,chapter3Pending};
})();
