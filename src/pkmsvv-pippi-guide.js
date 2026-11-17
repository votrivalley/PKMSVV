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
   ['Surprised','Ối! Vừa chọn Pokémon xong đã gặp tui hả? Hân hạnh nha! Tui là Pippi, một Clefairy siêu sao tự phong, nổi tiếng vì làm Red muốn đội quần trong truyện Pocket Monsters.','Oh! Picked your Pokémon and already met a celebrity? I’m Pippi, a self-declared Clefairy superstar. I made Red lose his mind back in the Pocket Monsters manga!'],
   ['Joyous','Công việc của tui: dẫn đường cho nhân vật chính là TUI. Bạn làm chân chạy, đánh quái, đập đá. Tui nhận công, có gì khó hiểu?','My job: guiding the main character—ME. You run, fight and break rocks. I take the credit. Any questions?'],
   ['Determined','Thấy boss to quá á? Tui chạy là để thám thính đường lui nha, đừng có bảo tui hèn! Em họ Pikachu có thể cứu bạn lúc ăn đòn; còn tui... cứu danh dự đội hình.','Big boss? If I run away, it is called scouting an escape route, NOT cowardice! Cousin Pikachu may save you when hurt; I save our reputation.'],
   ['Happy','Phòng nghiên cứu có chỗ nâng Thân thiết cho tui đó. PokéBox với Pokédex thì ở nút Pokémon riêng nha, đừng có bê cả kho vào văn phòng tui!','Train my Bond in the Research Lab. PokéBox and Dex are still under Pokémon, so keep your collection out of my office!']
  ],
  chest:[
   ['Surprised','Ê, rương kìa! Nhặt vào thì game cho chọn vật phẩm. Đọc kỹ hiệu ứng trước khi chốt nha, đừng thấy đồ lấp lánh là bốc đại như tui!','A chest! It offers a choice of items. Read the effects before picking. Do not just grab the shiniest one like I would!'],
   ['Determined','Có thể nhặt nhiều rương liên tiếp nhưng cứ chọn từng món một. Để tui canh, bạn lo lựa đồ cho đúng build!','You can collect multiple chests, but choose their rewards one at a time. I will keep watch while you build smart!']
  ],
  pickup:[
   ['Happy','Đồ rơi dưới đất có nhiều loại: máu, nam châm, bom, vé, Orb và xu. Cái nào ngon thì nhặt—trừ khi boss đang dí sát mông!','Ground drops include healing, magnets, bombs, tickets, Orbs and coins. Grab them when safe—unless a boss is breathing down your neck!'],
   ['Joyous','Tui sẽ báo khi bạn nhặt đồ quan trọng. Còn EXP nhặt suốt ngày thì thôi nha, tui là danh hài chứ không phải loa phường!','I will react to important pickups. I am not narrating every XP gem; I am a comedian, not your notification spammer!']
  ],
  laboratory:[
   ['Inspired','Chào mừng đến Phòng nghiên cứu Hoàng gia Pippi! Tui là giáo sư trưởng, bạn là thực tập sinh không lương. Bằng cấp hả? Không hỏi!','Welcome to Pippi Royal Research Lab! I am the professor; you are the unpaid intern. Do not ask for my diploma!'],
   ['Determined','Pokémon vẫn là nút riêng cho PokéBox, Pokédex và Nâng cấp. Phòng này dành cho Hỗ trợ, Mega, Berry, Bạn đồng hành và hóa thạch. Đừng có lạc như Psyduck!','Pokémon stays separate for fast Box, Dex and Upgrades. This lab holds Supports, Mega, Berries, Companions and fossils. Try not to get lost!'],
   ['Angry','Đào được Hóa thạch Mái vòm không có nghĩa Kabuto tự chui ra. Máy đang khóa! Thắng nhiệm vụ Co-op Phòng Thí Nghiệm Thất Lạc lần đầu rồi mới được phục nguyên.','Finding a Dome Fossil does not instantly revive Kabuto. The machine is locked until your first Lost Laboratory Co-op clear!'],
   ['Joyous','Sau đó chơi Co-op tiếp kiếm Xu Đồng Đội, mua đồ trang trí. Nghe đồn có tượng vàng siêu hiếm của tui… ai khoe trước tui trừ điểm duyên dáng!','Then replay Co-op for Coins and décor. My ultra-rare golden statue is waiting… flex before me and I deduct style points!']
  ],
  fossils:[
   ['Surprised','Ủa? Đập cục đá đầu tiên sau phút 15 mà cũng moi ra được Hóa thạch Mái vòm?! Hên thôi nha. Đừng tưởng mình là nhà khảo cổ số một. Ghế đó tui đặt trước rồi.','Wait, a Dome Fossil?! Your very first rock after minute fifteen? Lucky you. I already called dibs on the chief archaeologist title.'],
   ['Joyous','Hóa thạch Kabuto đây! Mang về Phòng nghiên cứu. Máy còn KHÓA, phải thắng Co-op hóa thạch lần đầu mới sửa được. Đừng nhét vô máy rồi đổ tại tui!','A Kabuto fossil! Take it to the Research Lab. The machine stays LOCKED until your first Fossil Co-op clear!'],
   ['Shouting','Nói nghe nè: Pokémon có duyên với đá đào giỏi hơn, còn hội hóa thạch thì đào khỏi chê. Hỏi xác suất hả? Tui là hướng dẫn viên, không phải bảng Excel biết đi!','Rock Pokémon dig better, and fossil Pokémon have an even sharper nose for relics. Want exact odds? I am your guide, not a walking spreadsheet!'],
   ['Determined','Đi đúng vùng sẽ moi được hóa thạch đúng thời kỳ. Galar phải ghép hai mảnh. Còn cứ quay Gacha chờ hóa thạch rớt xuống? Chờ tới lúc tui bớt đẹp chắc nhanh hơn!','Dig in the right region for its fossils. Galar needs two fragments. Waiting for fossil Pokémon in Gacha? You would grow old before I become humble!']
  ],
  explore:[
   ['Happy','Đây là Khám phá! Tui đi ngay cạnh bạn, không để bạn một mình đâu. Cứ di chuyển và hạ quái để lên cấp!','Welcome to Explore! I’ll stay by your side. Move around, defeat enemies and level up!'],
   ['Inspired','Khi lên cấp, chọn kỹ năng để mạnh dần. Các chiêu tự động sẽ tự tấn công; kỹ năng chủ động cần bạn kích hoạt.','At level-up, pick new moves. Automatic attacks fire on their own; active moves need your input.'],
   ['Determined','Với kỹ năng lướt F/X: nhấn nhanh để tự điều khiển. Giữ nút 2 giây để bật AUTO lao tới quái gần nhất; giữ lần nữa để tắt.','For the F/X dash: tap to steer it yourself. Hold for 2 seconds to enable AUTO toward the closest enemy; hold again to disable it.'],
   ['Worried','Máu tụt là tui lo hồi phục; khi gặp nguy hiểm sẽ có khiên hoặc phép cứu mạng nếu Thân thiết đã đủ. Nhìn hiệu ứng để biết tui vừa làm gì nha!','When your HP drops, I’ll heal you. With enough Bond, I can shield or rescue you. Watch the effects to see my spells!'],
   ['Joyous','Phút 15 đánh boss để mở vùng tiếp theo; phút 30 mới kết thúc bản đồ. Giờ thì chiến đi, tui ở đây rồi!','Defeat the 15-minute boss to open the next region. The map ends after the 30-minute boss. Let’s go!']
  ]
 };
 let active=null,root=null,lastExplorePlayer=null,scheduled=null,queued=null;
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
  if(job.paused&&G.Game?.player===job.player&&G.Game.state==='pause')G.Game.state='playing';
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
 function open(kind){
  const save=G.DB?.save;
  if(!STEPS[kind]||!save||active||window.__pkmsvvPippiGuideQABypass===true)return false;
  if(flags(save)[kind])return false;
  if(kind==='starter'&&!save.partner&&!save.starter)return false;
  if(kind==='fossils'&&save.pkmsvvFossils?.guaranteedKabuto!==true)return false;
  if(['explore','chest','pickup','fossils'].includes(kind)&&
    (!G.PKMSVVQuickRegion?.active||G.Game?.state!=='playing'||
     G.Coop?.active||G.Royale?.active||G.EggRush?.active))return false;
  const player=G.Game?.player;
  let paused=false;
  if(kind==='explore'||kind==='chest'||kind==='pickup'||kind==='fossils'){
   const descriptor=Object.getOwnPropertyDescriptor(G.Game,'state');
   // Normal/native game state is writable in the Web 2.0 build. If a host
   // exposes a getter only, leave it untouched instead of breaking combat.
   if(descriptor?.writable===true){
    G.Game.state='pause';
    paused=G.Game.state==='pause';
   }
  }
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
  if(!['chest','pickup','fossils'].includes(kind)||window.__pkmsvvPippiGuideQABypass===true)
   return false;
  if(flags(G.DB?.save)[kind]||active)return false;
  if(queued&&kind!=='fossils')return false; // first fossil takes priority
  queued=kind;
  return true;
 }
 function flush(){
  if(!queued||active||window.__pkmsvvPippiGuideQABypass===true)return false;
  if(G.Game?.state!=='playing'||!G.PKMSVVQuickRegion?.active)return false;
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
  }
 },true);
 G.PKMSVVPippiGuide={open,next,close,queue,flush,
  get isOpen(){return !!active;},
  get current(){return active?{kind:active.kind,index:active.index,total:STEPS[active.kind].length,paused:active.paused}:null;}};
})();
