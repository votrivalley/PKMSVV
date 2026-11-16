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
   ['Joyous','Công việc của tui: làm cố vấn, cà khịa, đôi lúc buff máu. Tui hơi hèn trước boss, nhưng mà đừng nói ai biết! Cái đó gọi là chiến thuật.','My job: advising, roasting, occasionally healing. I may run from giant bosses, but keep that secret! It is called strategy.'],
   ['Determined','Cậu em họ Pikachu là tay đánh thuê gia đình tui. Khi bạn ăn đòn, có lúc nó sẽ lao ra phóng điện. Nhưng bạn đánh chính, tui chịu trách nhiệm... đẹp đội hình!','My cousin Pikachu is our family backup. When you get hurt, he may jump in with lightning. You fight, I make the team look fabulous!'],
   ['Happy','Vào PC → Bạn đồng hành để nâng Bond và học trò mới cho tui. Giờ bấm Tiếp theo đi. Tụi mình đi kiếm chuyện—à không, cứu thế giới!','Go to PC → Companion to raise Bond and train my moves. Now hit Next. Let’s go cause trouble—uh, save the world!']
  ],
  explore:[
   ['Happy','Đây là Khám phá! Tui đi ngay cạnh bạn, không để bạn một mình đâu. Cứ di chuyển và hạ quái để lên cấp!','Welcome to Explore! I’ll stay by your side. Move around, defeat enemies and level up!'],
   ['Inspired','Khi lên cấp, chọn kỹ năng để mạnh dần. Các chiêu tự động sẽ tự tấn công; kỹ năng chủ động cần bạn kích hoạt.','At level-up, pick new moves. Automatic attacks fire on their own; active moves need your input.'],
   ['Determined','Với kỹ năng lướt F/X: nhấn nhanh để tự điều khiển. Giữ nút 2 giây để bật AUTO lao tới quái gần nhất; giữ lần nữa để tắt.','For the F/X dash: tap to steer it yourself. Hold for 2 seconds to enable AUTO toward the closest enemy; hold again to disable it.'],
   ['Worried','Máu tụt là tui lo hồi phục; khi gặp nguy hiểm sẽ có khiên hoặc phép cứu mạng nếu Bond đã đủ. Nhìn hiệu ứng để biết tui vừa làm gì nha!','When your HP drops, I’ll heal you. With enough Bond, I can shield or rescue you. Watch the effects to see my spells!'],
   ['Joyous','Phút 15 đánh boss để mở vùng tiếp theo; phút 30 mới kết thúc bản đồ. Giờ thì chiến đi, tui ở đây rồi!','Defeat the 15-minute boss to open the next region. The map ends after the 30-minute boss. Let’s go!']
  ]
 };
 let active=null,root=null,lastExplorePlayer=null,scheduled=null;
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
  if(kind==='explore'&&(!G.PKMSVVQuickRegion?.active||G.Game?.state!=='playing'||
    G.Coop?.active||G.Royale?.active||G.EggRush?.active))return false;
  const player=G.Game?.player;
  let paused=false;
  if(kind==='explore'){
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
 G.PKMSVVPippiGuide={open,next,close,
  get isOpen(){return !!active;},
  get current(){return active?{kind:active.kind,index:active.index,total:STEPS[active.kind].length,paused:active.paused}:null;}};
})();
