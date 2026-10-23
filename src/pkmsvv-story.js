/* PKMSVV Chapter 0 — bilingual, replayable pixel-illustrated visual novel. */
G.PKMSVVStory=(()=>{
 const $=id=>document.getElementById(id),en=()=>G.I18n&&G.I18n.lang==='en';
 const tr=(vi,eng)=>en()?eng:vi;
 const chapters={
  prologue:[
   {art:1,speaker:['???','???'],text:['...Mình đang ở đâu?','...Where am I?']},
   {art:1,speaker:['Tôi','Me'],text:['Tối quá... Mình còn sống sao?','It is so dark... Am I still alive?']},
   {art:2,speaker:['Tôi','Me'],text:['Tên của mình... Sao không thể nhớ nổi?','My name... Why can’t I remember it?']},
   {art:2,speaker:['Tôi','Me'],text:['Cơ thể mình... có gì đó không đúng.','Something feels wrong with my body.']},
   {art:3,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Ngươi cuối cùng cũng tỉnh lại.','You have finally awakened.']},
   {art:3,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Đây là vùng đất của những ký ức thất lạc.','This is the land of lost memories.']},
   {art:4,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Nếu muốn tiếp tục, trái tim ngươi phải chọn một hình hài.','To go on, your heart must choose a new form.']},
   {art:4,speaker:['Giọng nói bí ẩn','Mysterious voice'],text:['Hãy trả lời các câu hỏi. Đừng nghĩ quá lâu... hãy là chính mình.','Answer these questions. Do not overthink... be yourself.']}
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
 function stop(){if(timer){clearInterval(timer);timer=null;}}
 function finish(){
  stop();const callback=next,wasPrologue=mode==='prologue';
  if(wasPrologue&&!replaying&&G.DB.save){
   G.DB.save.pkmsvvStorySeen=true;G.DB.commit(true);
  }
  next=null;mode='';G.UI.hide('scr-pkmsvv-story');
  if(typeof callback==='function')callback();
 }
 function draw(){
  stop();
  const item=lines[idx];if(!item){finish();return;}
  const img=$('pkmsvv-story-image'),cv=$('pkmsvv-story-mon');
  img.src='assets/story/scene-'+item.art+'.svg';
  img.alt=tr('Tranh pixel minh họa chương mở đầu','Pixel-art prologue illustration');
  cv.classList.toggle('hidden',mode!=='reveal');
  if(mode==='reveal'&&chosenDex&&G.UI&&G.UI.sprite)G.UI.sprite(cv,chosenDex,{lively:true,scale:3,hero:true});
  $('pkmsvv-story-chapter').textContent=tr('CHƯƠNG 0 · THỨC TỈNH','CHAPTER 0 · AWAKENING');
  $('pkmsvv-story-speaker').textContent=item.speaker[en()?1:0];
  full=item.text[en()?1:0];
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
  if(!mode)return;
  if(timer){stop();$('pkmsvv-story-line').textContent=full;return;}
  idx++;draw();
 }
 function play(type,done,replay=false,dex=0){
  if(!chapters[type])return;
  stop();mode=type;idx=0;next=done;replaying=replay;chosenDex=dex;
  lines=chapters[type];G.UI.chrome(false);G.UI.show('scr-pkmsvv-story');
  draw();
  if(G.Pad&&G.Pad.focusFirst)G.Pad.focusFirst();
 }
 function prologue(done){play('prologue',done);}
 function reveal(dex,done){play('reveal',done,false,dex);}
 function replay(){play('prologue',()=>G.Flow.goMenu(),true);}
 function init(){
  $('pkmsvv-story-next').onclick=advance;
  $('pkmsvv-story-skip').onclick=finish;
  $('pkmsvv-story-frame').onclick=e=>{if(!e.target.closest('button'))advance();};
  window.addEventListener('keydown',e=>{
   if(!mode)return;
   if(['Enter',' ','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();advance();}
   else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish();}
  },true);
 }
 return {init,prologue,reveal,replay};
})();
