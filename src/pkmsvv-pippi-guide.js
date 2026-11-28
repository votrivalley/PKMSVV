/* Pokémon Chuyển Sinh 2.0 — Pippi's interactive RPG-style tutorial.
 * One lightweight, original-PMD-portrait overlay; never changes save until
 * the final Next is pressed. Scoped to the starter reveal + solo Explore.
 */
(function(){
 'use strict';
 if(typeof G==='undefined'||typeof document==='undefined')return;
 const esc=(s)=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const en=()=>G.I18n?.lang==='en',tr=(vi,english)=>en()?english:vi;
 const FACE=['Normal','Happy','Joyous','Determined','Angry','Crying','Dizzy',
  'Inspired','Pain','Sad','Shouting','Sigh','Stunned','Surprised','Teary-Eyed','Worried'];
 const STEPS={
  starter:[
   ['Surprised','Mèn ơi, chọn Pokémon xong rồi hả ní? Tui là Pippi, Clefairy hơi nhiều chuyện mà được việc dữ lắm nghen. Từ nay tui theo ní, khỏi sợ đi lạc!','Oh! Picked your Pokémon and already met a celebrity? I’m Pippi, a self-declared Clefairy superstar. I made Red lose his mind back in the Pocket Monsters manga!'],
   ['Joyous','Tui hỗ trợ hồi máu, buff và chỉ đường khi cần. Còn né đòn với đánh quái thì bạn lo. Chia việc vậy cũng công bằng… với tui!','My job: guiding the main character—ME. You run, fight and break rocks. I take the credit. Any questions?'],
   ['Determined','Gặp boss thì bình tĩnh nghen, coi nó ra đòn rồi hẵng nhào vô. Mở đủ kỹ năng là tui gọi được em họ Pikachu ra phụ nữa đó!','Big boss? If I run away, it is called scouting an escape route, NOT cowardice! Cousin Pikachu may save you when hurt; I save our reputation.'],
   ['Happy','Ngoài menu, nút Pokémon có PokéBox, Pokédex và Nâng cấp. Phòng nghiên cứu có góc Bạn đồng hành để tăng Thân thiết cho tui.','Train my Bond in the Research Lab. PokéBox and Dex are still under Pokémon, so keep your collection out of my office!']
  ],
  chest:[
   ['Surprised','Mèn ơi, rương kìa! Coi từng món trước khi chọn nghen, lấy cái hợp kỹ năng đang xài. Đẹp chưa chắc mạnh, trừ tui ra!','A chest! It offers a choice of items. Read the effects before picking. Do not just grab the shiniest one like I would!'],
   ['Determined','Nếu có nhiều rương, cứ chọn xong từng món. Bạn lựa cho đúng đội hình, tui canh quái cho.','You can collect multiple chests, but choose their rewards one at a time. I will keep watch while you build smart!']
  ],
  pickup:[
   ['Happy','Đồ dưới đất có hồi máu, nam châm, bom, vé, Orb và xu. Nhặt khi an toàn nha; thấy boss dí sát thì chạy trước!','Ground drops include healing, magnets, bombs, tickets, Orbs and coins. Grab them when safe—unless a boss is breathing down your neck!'],
   ['Joyous','Nhặt món quan trọng tui sẽ báo. Còn từng viên EXP thì thôi, nói liên tục chắc quái cũng nhức đầu.','I will react to important pickups. I am not narrating every XP gem; I am a comedian, not your notification spammer!']
  ],
  laboratory:[
   ['Inspired','Tới Phòng nghiên cứu rồi nè! Tui tự phong làm quản lý, ní được quyền bấm máy. Làm hư thì tự sửa nghen, đừng có méc tui!','Welcome to Pippi Royal Research Lab! I am the professor; you are the unpaid intern. Do not ask for my diploma!'],
   ['Determined','Chạm trực tiếp vào từng máy để mở Hỗ trợ, Mega, Berry, Bạn đồng hành hoặc Phục nguyên hóa thạch. Dễ tìm hơn là mò menu đấy.','Pokémon stays separate for fast Box, Dex and Upgrades. This lab holds Supports, Mega, Berries, Companions and fossils. Try not to get lost!'],
   ['Angry','Máy phục nguyên còn khóa. Muốn mở vĩnh viễn, phải thắng Co-op Phòng thí nghiệm thất lạc lần đầu. Hóa thạch nhặt được vẫn giữ nguyên nha.','Finding a Dome Fossil does not instantly revive Kabuto. The machine is locked until your first Lost Laboratory Co-op clear!'],
   ['Joyous','Muốn xem nội thất thì bấm Xây dựng; còn Xu Đồng Đội và vật phẩm thì vào Kho Hậu Cần. Từng chỗ tui chỉ riêng, khỏi học thuộc!','Then replay Co-op for Coins and décor. My ultra-rare golden statue is waiting… flex before me and I deduct style points!']
  ],
  fossils:[
   ['Surprised','Ủa, Hóa thạch Mái vòm đây mà! Cất về Phòng nghiên cứu nhé. Cái này phục nguyên được Kabuto đó, đừng làm mất!','Wait, a Dome Fossil?! Your very first rock after minute fifteen? Lucky you. I already called dibs on the chief archaeologist title.'],
   ['Joyous','Cầm hóa thạch về Phòng nghiên cứu nhé. Máy chưa mở thì cứ cất đó, thắng Co-op hóa thạch lần đầu rồi dùng.','A Kabuto fossil! Take it to the Research Lab. The machine stays LOCKED until your first Fossil Co-op clear!'],
   ['Shouting','Pokémon hệ Đá có lợi thế khi đào, Pokémon hóa thạch còn giỏi hơn. Có cái cuốc xịn thì dùng đúng người nha!','Rock Pokémon dig better, and fossil Pokémon have an even sharper nose for relics. Want exact odds? I am your guide, not a walking spreadsheet!'],
   ['Determined','Muốn hóa thạch loại nào thì đào ở đúng vùng. Galar còn cần ghép hai mảnh. Đừng ngồi chờ Gacha rơi hóa thạch nha!','Dig in the right region for its fossils. Galar needs two fragments. Waiting for fossil Pokémon in Gacha? You would grow old before I become humble!']
  ],
  explore:[
   ['Happy','Đây là Khám phá. Cứ di chuyển, đánh quái và nhặt EXP để lên cấp. Tui theo bên cạnh hỗ trợ bạn.','Welcome to Explore! I’ll stay by your side. Move around, defeat enemies and level up!'],
   ['Inspired','Lên cấp thì chọn kỹ năng. Chiêu tự động tự đánh, còn chiêu chủ động phải bấm nút. Chọn hợp nhau thì sống dai hơn!','At level-up, pick new moves. Automatic attacks fire on their own; active moves need your input.'],
   ['Determined','Với chiêu lướt F/X, bấm nhanh để tự dùng. Giữ 2 giây bật AUTO tìm quái gần nhất; giữ thêm 2 giây để tắt.','For the F/X dash: tap to steer it yourself. Hold for 2 seconds to enable AUTO toward the closest enemy; hold again to disable it.'],
   ['Worried','Máu yếu thì lui khỏi bầy quái coi! Mở đủ kỹ năng là tui hồi máu, che chắn được. Chớ ní đứng lì ăn đòn thì tui cũng bó tay à!','When your HP drops, I’ll heal you. With enough Bond, I can shield or rescue you. Watch the effects to see my spells!'],
   ['Joyous','Boss phút 15 mở đường sang vùng tiếp theo, boss phút 30 mới kết màn. Giờ thử đi đánh quái đi, đứng ngắm tui hoài à?','Defeat the 15-minute boss to open the next region. The map ends after the 30-minute boss. Let’s go!']
  ]
 };
 // Short, original, playful one-time intros appear BEFORE launching a mode,
 // when menus are safe. Never open during real-time Co-op combat.
 const MODE_STEPS={
  coop:[
   ['Joyous','Sống Sót Co-op nè! Đi chung với đồng đội nghen, đừng có chạy mất tiêu. Ai bị hạ thì chạy lại cứu, chớ bỏ bạn nằm đó coi sao được!','Survival? Okay bestie, the team is not decorative. Revive your friends and stay alive!'],
   ['Determined','Đội có 2–4 thành viên; chơi một mình có thể tìm party do máy điều khiển. Giữ khoảng cách vừa đủ để cứu nhau nhé.','2–4 teammates. Solo players can recruit AI. Stick together and revive anyone downed!']
  ],
  royale:[
   ['Shouting','Sống Còn có vòng bo thu hẹp dần. Nhìn vòng đỏ, chạy vào vùng an toàn trước đã. Đây không phải chỗ cắm trại đâu!','Battle Royale! The shrinking ring hits harder than a Monday deadline. Keep moving!'],
   ['Angry','Ai trụ cuối cùng thì thắng. Giữ kỹ năng thoát thân, đừng ham đuổi đối thủ ra khỏi vùng an toàn.','Last survivor wins. Yesterday’s teammates are today’s rivals!']
  ],
  eggrush:[
   ['Surprised','Tranh Trứng là đua nhặt trứng. Đủ 10 quả là kết thúc, nên đừng đứng một chỗ ngắm trứng đẹp nha.','Egg Rush? Collect ten eggs, and stop asking why I am suddenly hungry.'],
   ['Joyous','Trứng Mew được 20 điểm, Ditto 10, trứng thường 5, Shiny nhân đôi. Nhắm quả có giá trị rồi chạy, đừng quên né đòn!','Mew is 20 points, Ditto 10, common eggs 5 and Shiny doubles them. Move fast!']
  ],
  berry:[
   ['Happy','Giải Cứu Berry có ba cây cần bảo vệ. Quái sẽ đánh cây, nên đừng mải đuổi quái đi quá xa nha.','Berry Rescue! Those three trees are not decorative. Cherubi needs serious bodyguards!'],
   ['Determined','Chọn độ khó vừa sức, giữ cả ba cây sống sót. Cứu được cả ba còn được thưởng Berry nữa đó!','Defend all three Berry trees from enemies. Pick your difficulty wisely!']
  ],
  fossil_lab:[
   ['Surprised','Mèn đét ơi, ba mỏ đá nằm xa nhau dữ thần! Mỗi mỏ đào ba lần, đủ 9 mảnh mới qua bước kế nghen. Đừng đào một chỗ rồi tưởng xong à!','Fossil expedition! Three distant sites, three strikes each. Collect all nine fragments!'],
   ['Worried','U là trời, Golurk chặn Rotom kìa! Hạ Golurk rồi cứu Rotom trước phút 4 nghen, trễ là thua đó ní!','Plot twist: Golurk is after Rotom! Rescue it before 4:00, or the run fails!'],
   ['Shouting','Dắt Rotom về khởi động cái máy cũ, rồi giữ máy tới phút 8 nghen. Tụi quái khoái đập máy lắm, đừng có chạy xa rồi để máy ăn đòn!','Escort Rotom to the ruined restorer, then defend it until 8:00. No machine, no win!']
  ],
  arena:[
   ['Angry','Arena Solo là đấu 1v1. Chọn Pokémon trước trận và chuẩn bị kỹ năng hợp lý, không có ai cứu hộ đâu.','Arena Solo is 1v1. Pick your Pokémon, then show those skills!'],
   ['Joyous','Arena không tạm dừng. Canh hồi chiêu, né đòn và giữ khoảng cách khi máu thấp nha.','No magical pause mid-match. Keep dodging!']
  ],
  champion:[
   ['Inspired','Champion có vòng 16, tứ kết, bán kết và chung kết. Thắng mới đi tiếp, nên tính đường dài một chút.','Champion! Fight through Round of 16, quarters, semis, and the final!'],
   ['Determined','Chung kết đối thủ mạnh, còn có Mega. Chuẩn bị Pokémon và kỹ năng né từ trước. Tui cổ vũ được thôi nha!','The finals feature powerful Pokémon and Mega forms. I am cheering, but please do not tag me if you lose!']
  ],
  explore:[
   ['Happy','Lần đầu chọn vùng Khám phá hả? Mỗi vùng có Pokémon khác nhau. Chọn nơi muốn đi rồi vào trận để mở thêm Pokédex.','First Explore run? Pick skills as you level and follow the region map. Pippi has your back!'],
   ['Determined','Phút 15 có boss mở vùng mới, phút 30 mới kết màn. Nhớ chọn Berry trước khi lao vào quái nha!','The 15-minute boss opens the next region; the 30-minute boss ends the map. Choose Berries before fighting!']
  ]
 };
 for(const [mode,lines] of Object.entries(MODE_STEPS))STEPS['mode_'+mode]=lines;
 const FEATURE_STEPS={
  box:[
   ['Happy','Đây là PokéBox. Chạm vào một Pokémon để xem chỉ số, Nature và Ability. Đừng chỉ nhìn nó có ngầu hay không nha!','Select a Pokémon to inspect its stats, Nature and Ability.'],
   ['Determined','Có sáu ô đội hình. Dùng nút Vào đội hình/Rời đội và bộ lọc hệ, Shiny hay yêu thích để tìm nhanh hơn.','You have six team slots. Use Add/Remove and filters to manage your team.'],
   ['Joyous','Pokémon trùng có thể dùng Nâng Rank. Còn Pokédex và Nâng cấp ở hai tab trên cùng, chuyển bằng L1/R1 cũng được.','Duplicates can upgrade Rank. Pokédex and Upgrades are in the other tabs, accessible with L1/R1.']
  ],
  dex:[
   ['Inspired','Pokédex ghi lại những loài đã đánh bại trong Khám phá. Loài chưa gặp sẽ bị ẩn, không phải game quên đâu!','Pokédex records species defeated in Explore. Undiscovered entries stay hidden.'],
   ['Determined','Co-op và Arena không tính mở Pokédex. Dùng tìm kiếm và bộ lọc để xem đã mở những loài nào, rồi hãy qua Chiêu mộ.','Co-op and Arena do not unlock Dex entries. Use search and filters before Recruitment.']
  ],
  upgrade:[
   ['Happy','Nâng cấp có hai nhánh: tăng riêng Pokémon đang chọn hoặc tăng vĩnh viễn cho toàn đội. Xem đúng nhánh trước khi tiêu xu nha.','Upgrades can affect the selected Pokémon or the entire team permanently.'],
   ['Determined','Kiểm tra PokéCoins rồi chọn Mở nâng cấp riêng hoặc Mở nâng cấp toàn đội. Rank ở PokéBox là chuyện khác nhé.','Check your PokéCoins before opening Individual or Team Upgrades. PokéBox Rank is separate.']
  ],
  rank:[
   ['Surprised','À, Rank! Pokémon trùng được tự tính làm nguyên liệu. Đủ bản trùng rồi hãy xác nhận nâng, khỏi chọn từng con.','Duplicate Pokémon are counted as Rank materials. Confirm when eligible.'],
   ['Worried','Shiny là phiên bản ngoại hình riêng nên không tính làm bản trùng để nâng Rank. Đọc điều kiện trước khi bấm nha!','Shiny variants do not count as Rank duplicates. Check requirements first.']
  ],
  support:[
   ['Happy','Ở đây chọn tối đa hai Pokémon hỗ trợ để hồi máu, buff hoặc khống chế quái. Tui không tính vào hai ô đó đâu nha.','Choose up to two Support Pokémon for healing, buffs and control. Pippi is separate.'],
   ['Determined','Xem khả năng từng con, rồi đưa vào ô hỗ trợ. Chọn cho hợp đội hình đang dùng, đừng gom toàn người đẹp như tui!','Inspect each support and assign it to a slot that complements your team.']
  ],
  incubator:[
   ['Happy','Mèn đét ơi, có trứng rồi nè! Chọn trứng bỏ vô máy ấp, rồi đánh quái trong Khám phá hoặc Sống Sót Co-op nghen. Nâng máy bên Xây dựng là ấp được nhiều quả một lượt đó!','Select eggs to incubate and defeat enemies in Explore or Survival Co-op. Upgrade the machine in Build Mode for more simultaneous slots.'],
   ['Joyous','Đủ số quái ghi trên từng quả thì quay lại nhận bạn mới nha. Quà Tranh Trứng hết chỗ chứa thì để dành, nhận sau được. Khác trứng hỗ trợ trong trận đó, đừng có đem luộc nghen!','Return when each egg reaches its own kill target. Egg Rush prizes can wait if storage is full. These eggs are separate from support eggs.']
  ],
  mega:[
   ['Inspired','Đây là khu Mega. Chọn Pokémon để xem dạng Mega và điều kiện mở khóa. Chưa đủ điều kiện thì cứ xem trước nha.','Select Pokémon to inspect Mega forms and unlock conditions.'],
   ['Determined','Mở được Mega rồi thì dùng nút Mega trong trận. Canh hồi chiêu để dùng lúc gặp đám quái khó, đừng vừa sáng nút đã bấm!','Once unlocked, use the Mega control in battle and plan around its cooldown.']
  ],
  mega_spin:[
   ['Surprised','Mèn ơi, tính quay Mega Stone hả? Một lượt hết 100 Điểm Arena đó. Coi còn bao nhiêu điểm đi, hổng đủ thì đứng nhìn máy thôi nghen!','About to roll a Mega Stone? Each spin costs 100 Arena Points. Check your balance first!'],
   ['Determined','Mega thường chiếm 98,5%, Mega huyền thoại chỉ 1,5%; có bảo hiểm ở lượt thứ 30. Quay may rủi nha, không phải cứ muốn là trúng!','Normal Mega Stones have a 98.5% rate; legendary stones 1.5%, with pity on the 30th pull.'],
   ['Joyous','Trúng đá trùng thì nhận lại điểm: Mega thường 50, huyền thoại 200. Nhớ nhé, có đá vẫn cần Pokémon và điều kiện mở Mega. Giờ mới bấm Quay nha!','Duplicates refund 50 points for normal and 200 for legendary stones. A stone alone does not unlock a battle-ready Mega.']
  ],
  berry:[
   ['Happy','Mỗi Berry có công dụng riêng: hồi máu, tăng sức mạnh hoặc cứu nguy. Bấm xem hiệu ứng trước, đâu phải quả nào cũng giống nhau!','Berries have different effects. Read each description before choosing.'],
   ['Determined','Bạn mang tối đa hai Berry mỗi trận và chọn trước khi vào đánh. Berry chỉ dùng một lần, chọn cho đáng nha.','Choose up to two single-use Berries in pre-match preparation.']
  ],
  companion:[
   ['Joyous','Góc Bạn đồng hành đây! Thân thiết tăng khi mình cùng chiến đấu, sống sót, nhặt rương và hỗ trợ nhau. Có công phải có điểm!','Bond grows through battle, survival, chests and companion actions.'],
   ['Determined','Mỗi cấp Thân thiết cho điểm huấn luyện. Xem kỹ kỹ năng và điều kiện mở, rồi hãy bấm nâng. Điểm chưa xài vẫn giữ lại.','Each Bond level grants training points. Check skill unlocks before spending.'],
   ['Happy','Nếu có vật phẩm đặt lại kỹ năng Bạn đồng hành thì bạn đổi hướng huấn luyện được. Tui đổi skill được, còn đổi nết thì… hên xui!','A Companion reset item can refund training points for a different build.']
  ],
  fossil:[
   ['Surprised','Đây là máy Phục nguyên hóa thạch. Đào đá đúng vùng để kiếm nguyên liệu, nhặt được gì sẽ cất trong danh sách này.','This is Fossil Restoration. Find materials in the right regional rocks.'],
   ['Determined','Muốn mở máy vĩnh viễn phải thắng Co-op Phòng thí nghiệm thất lạc lần đầu. Sau đó đủ nguyên liệu theo công thức mới phục nguyên được.','Clear Lost Laboratory Co-op once, then gather each recipe before restoring.']
  ],
  construction:[
   ['Inspired','Đây là Xây dựng. Nhấn vào từng vị trí trong phòng để xem đồ có thể đặt ở đó. Một số chỗ chưa mở thì chỉ xem được thôi.','Inspect furnishing slots. Some are preview-only until the lab is unlocked.'],
   ['Determined','Món chưa có sprite hoàn chỉnh chỉ là bản xem trước, không tự mua hay trừ Xu Đồng Đội. Tui không bán đồ vô hình đâu!','Unfinished décor is preview-only and cannot charge Co-op Coins.']
  ],
  depot:[
   ['Happy','Kho Hậu Cần dùng Xu Đồng Đội từ nhiệm vụ Co-op. Xem số xu và trạng thái từng món trước khi bấm nha.','The Supply Depot uses Co-op Coins from missions. Check available exchanges.'],
   ['Determined','Món trang trí còn ghi xem trước thì chưa mua được; chỉ giao dịch đã mở mới có tác dụng thật. Đọc kỹ rồi tính mua!','Preview-only décor cannot be purchased. Only enabled exchanges are live.']
  ],
  knowledge:[
   ['Inspired','Đây là Kiến thức. Thức tỉnh kỹ năng mở thêm ô vĩnh viễn qua các mốc chơi, chứ không tự tặng chiêu mới đâu nha.','Skill Awakening unlocks permanent slots through milestones, not free moves.'],
   ['Determined','Fusion cần hai chiêu gốc đạt MAX và mỗi trận chỉ làm một lần. Mystery Orb cũng có mục tra cứu riêng đó.','Fusion needs two maxed source moves and is limited to once per run. Mystery Orb has its own guide.']
  ],
  recruitment:[
   ['Surprised','Muốn Chiêu mộ loài nào thì trước hết phải đánh bại nó trong Khám phá để ghi vào Pokédex. Chưa gặp thì chưa quay ra đâu.','Defeat a species in Explore to register it before recruiting.'],
   ['Determined','Kiểm tra danh sách khả dụng và thế hệ trước khi tiêu vé. Đừng quay xong rồi bảo tui giấu Pokémon nha!','Check the available pool and generation before spending tickets.']
  ]
 };
 for(const [feature,lines] of Object.entries(FEATURE_STEPS))STEPS['feature_'+feature]=lines;
 let active=null,root=null,lastExplorePlayer=null,scheduled=null,queued=null;
 // A large portrait dialogue is modal. Only solo Explore may pause its own
 // gameplay clock; quick Pippi reactions never go through this overlay.
 const SOLO_KINDS=new Set(['explore','chest','pickup','fossils']);
 function pauseExploreSafely(){
  const game=G.Game;
  if(!game||game.state!=='playing')return false;
  // An inherited writable game-state field is valid too; getter-only hosts
  // must NEVER show a blocking modal while enemies are still moving.
  let owner=game,desc;
  while(owner&&!desc){desc=Object.getOwnPropertyDescriptor(owner,'state');owner=Object.getPrototypeOf(owner);}
  if(desc&&desc.writable!==true&&typeof desc.set!=='function')return false;
  try{game.state='pause';}catch(_){return false;}
  return game.state==='pause';
 }
 function canOpenSolo(){
  return !!G.PKMSVVQuickRegion?.active&&G.Game?.state==='playing'&&
   !G.Coop?.active&&!G.Royale?.active&&!G.EggRush?.active&&
   !G.PKMSVVArenaSolo?.active&&!G.PKMSVVChampionArena?.active&&
   !G.PKMSVVArenaPvp?.active;
 }
 const flags=save=>{
  if(!save)return {};
  if(!save.pkmsvvPippiGuide||typeof save.pkmsvvPippiGuide!=='object')
   save.pkmsvvPippiGuide={};
  return save.pkmsvvPippiGuide;
 };
 function render(){
  if(!active||!root)return;
  const step=STEPS[active.kind][active.index],face=step[0];
  const idx=Math.max(0,FACE.indexOf(face)),portrait=root.querySelector('.pkmsvv-pippi-guide-face');
  portrait.style.backgroundPosition=((idx%4)*100/3)+'% '+(Math.floor(idx/4)*100/3)+'%';
  portrait.setAttribute('aria-label',face);
  root.querySelector('.pkmsvv-pippi-guide-speaker').textContent='Pippi';
  root.querySelector('.pkmsvv-pippi-guide-line').textContent=en()?step[2]:step[1];
  root.querySelector('.pkmsvv-pippi-guide-count').textContent=(active.index+1)+' / '+STEPS[active.kind].length;
  root.querySelector('.pkmsvv-pippi-guide-next').textContent=active.index===STEPS[active.kind].length-1?
   tr('Xong rồi! ▶','Let’s go! ▶'):tr('Tiếp theo ▶','Next ▶');
 }
 function close(){
  if(!active)return false;
  const job=active;active=null;
  if(root){root.remove();root=null;}
  // If this game build allows state changes, restore ONLY our own pause.
  if(job.paused&&G.Game?.player===job.player&&
    G.PKMSVVQuickRegion?.active===true&&G.Game.state==='pause')
   G.Game.state='playing';
  // Do not unpause an unrelated death screen, skill choice or remote match.
  // A queued Lab tour can only open if the Lab itself is still visible.
  if(queued==='laboratory'&&document.getElementById?.('pkmsvv-wiki-overlay')){
   queued=null;open('laboratory');
  }
  const save=G.DB?.save;
  if(save){
   flags(save)[job.kind]=true;
   try{G.DB?.commit?.(true)}catch(_){}
  }
  return true;
 }
 function next(){
  if(!active)return false;
  active.index++;
  if(active.index>=STEPS[active.kind].length)return close();
  render();root?.querySelector('.pkmsvv-pippi-guide-next')?.focus?.();
  return true;
 }
 function open(kind,options){
  const save=G.DB?.save;
  if(!STEPS[kind]||!save||active||window.__pkmsvvPippiGuideQABypass===true)return false;
  if(flags(save)[kind]&&!options?.replay)return false;
  if(kind==='starter'&&!save.partner&&!save.starter)return false;
  if(kind==='fossils'&&save.pkmsvvFossils?.guaranteedKabuto!==true)return false;
  if(SOLO_KINDS.has(kind)&&!canOpenSolo())return false;
  const player=G.Game?.player;
  const paused=SOLO_KINDS.has(kind)?pauseExploreSafely():false;
  // No modal while enemies attack: defer rather than exposing the player.
  if(SOLO_KINDS.has(kind)&&!paused)return false;
  active={kind,index:0,paused,player};
  const div=document.createElement('div');
  div.id='pkmsvv-pippi-guide';div.className='pkmsvv-pippi-guide';
  div.setAttribute('role','dialog');div.setAttribute('aria-modal','true');
  div.setAttribute('aria-label',tr('Pippi hướng dẫn','Pippi tutorial'));
  div.innerHTML='<div class="pkmsvv-pippi-guide-shade"></div>'+
   '<section class="pkmsvv-pippi-guide-panel">'+
    '<div class="pkmsvv-pippi-guide-portrait"><div class="pkmsvv-pippi-guide-face" role="img"></div></div>'+
    '<div class="pkmsvv-pippi-guide-copy"><div class="pkmsvv-pippi-guide-speaker">Pippi</div>'+
    '<p class="pkmsvv-pippi-guide-line" aria-live="polite"></p>'+
    '<footer><span class="pkmsvv-pippi-guide-count"></span>'+
    '<button class="pkmsvv-pippi-guide-next" type="button"></button></footer></div></section>';
  root=div;
  div.querySelector('.pkmsvv-pippi-guide-next').onclick=next;
  document.body.append(div);
  render();
  div.querySelector('.pkmsvv-pippi-guide-next').focus?.();
  return true;
 }
 function starterDone(){
  if(scheduled!==null)clearTimeout(scheduled);
  scheduled=setTimeout(()=>{scheduled=null;
   if(G.Game?.state==='ui')open('starter');
  },220);
 }
 const story=G.PKMSVVStory;
 if(story&&typeof story.reveal==='function'&&!story.reveal._pippiGuide){
  const original=story.reveal;
  function wrapped(dex,done){
   return original.call(this,dex,(...args)=>{done?.(...args);starterDone();});
  }
  wrapped._pippiGuide=true;story.reveal=wrapped;
 }
 const game=G.Game;
 if(game&&typeof game.startRun==='function'&&!game.startRun._pippiGuide){
  const original=game.startRun;
  function wrapped(...args){
   const result=original.apply(this,args);
   const pl=G.Game?.player;
   if(pl&&pl!==lastExplorePlayer){
    lastExplorePlayer=pl;
    setTimeout(()=>{
     if(pl===G.Game?.player&&G.Game.state==='playing')open('explore');
    },550);
   }
   return result;
  }
  wrapped._pippiGuide=true;game.startRun=wrapped;
 }
 function queue(kind){
  if(!['chest','pickup','fossils','laboratory'].includes(kind)||
     window.__pkmsvvPippiGuideQABypass===true)return false;
  if(flags(G.DB?.save)[kind])return false;
  if(kind==='laboratory'){
   if(!document.getElementById?.('pkmsvv-wiki-overlay')||!G.PKMSVVWiki)return false;
   if(!active&&!queued)return open('laboratory');
   queued='laboratory';return true;
  }
  // Pickups/chests must queue behind native item choice. They MUST NOT
  // open synchronously while the player is choosing a real reward.
  if(active)return false;
  if(queued&&kind!=='fossils')return false;
  queued=kind;
  return true;
 }
 function flush(){
  if(!queued||active||window.__pkmsvvPippiGuideQABypass===true)return false;
  if(queued==='laboratory'){
   if(!document.getElementById?.('pkmsvv-wiki-overlay')){queued=null;return false;}
   const kind=queued;
   if(open(kind)){queued=null;return true;}
   return false;
  }
  if(!canOpenSolo())return false;
  // Item choices, chapter scenes and pause overlays always take precedence.
  if(['scr-item','scr-levelup','scr-bond','scr-pause','scr-pkmsvv-story'].some(id=>
    G.UI?.isOpen?.(id)))return false;
  const kind=queued;
  if(open(kind)){queued=null;return true;}
  return false;
 }
 // Never dismiss automatically, never allow outside/ESC clicks to skip pages.
 document.addEventListener('keydown',e=>{
  if(!active)return;
  if(e.key==='Enter'||e.key===' '||e.code==='Space'){
   e.preventDefault?.();e.stopPropagation?.();e.stopImmediatePropagation?.();next();return;
  }
  if(e.key==='Escape'||e.code==='Escape'){
   e.preventDefault?.();e.stopPropagation?.();e.stopImmediatePropagation?.();
   return;
  }
  // Modal is deliberately input-blocking while paused. Prevent movement,
  // attacks, skill hotkeys and the native pause menu underneath the portrait.
  e.preventDefault?.();e.stopPropagation?.();e.stopImmediatePropagation?.();
 },true);
 function openFeature(feature){
  // First visit is safe only in a menu, never over active combat.
  if(!Object.prototype.hasOwnProperty.call(FEATURE_STEPS,feature))return false;
  if(!['ui','over'].includes(G.Game?.state))return false;
  return open('feature_'+feature);
 }
 function openMode(mode){
  const normalized=mode==='berryeasy'?'berry':mode;
  if(!MODE_STEPS[normalized])return false;
  // This is a PRE-MATCH dialogue only: never block monsters in a live run.
  if(!['ui','over'].includes(G.Game?.state))return false;
  return open('mode_'+normalized);
 }
 G.PKMSVVPippiGuide={open,next,close,queue,flush,openMode,openFeature,
  get isOpen(){return !!active;},
  get current(){return active?{kind:active.kind,index:active.index,total:STEPS[active.kind].length,paused:active.paused}:null;}};
})();
