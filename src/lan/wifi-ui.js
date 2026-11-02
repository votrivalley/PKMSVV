'use strict';
// Manual local pairing works on desktop, hosted/PWA Web and Capacitor alike.
(()=>{
 let dialog=null;
 const L=(vi,en)=>window.G?.I18n?.lang==='en'?en:vi;
 function panel(title){
  dialog?.remove();const root=document.createElement('div');root.className='pkmsvv-wifi-overlay';
  const box=document.createElement('section');box.className='pkmsvv-wifi-panel';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',title);
  const h=document.createElement('h2');h.textContent=title;const close=document.createElement('button');close.textContent=L('Đóng','Close');close.onclick=()=>root.remove();
  const status=document.createElement('p');status.setAttribute('role','status');
  box.append(h,close,status);root.append(box);document.body.append(root);dialog=root;
  return {box,status,close:()=>root.remove()};
 }
 function button(box,label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;
  b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){const status=box.closest('.pkmsvv-wifi-panel')?.querySelector('[role=status]');if(status)status.textContent=e.message||L('Không ghép nối được','Pairing failed');}finally{b.disabled=false;}};box.append(b);return b;}
 function input(box,label){
  const text=document.createElement('textarea');text.rows=3;text.placeholder=label;text.setAttribute('aria-label',label);box.append(text);
  const file=document.createElement('input');file.type='file';file.accept='.txt,text/plain,image/*';file.setAttribute('aria-label',L('Mở file lời mời hoặc ảnh QR','Open invitation file or QR image'));
  file.onchange=async()=>{
   const selected=file.files?.[0];if(!selected)return;
   try{
    if(selected.size>8*1024*1024)throw Error(L('File quá lớn','File too large'));
    if(selected.type.startsWith('image/')){
     if(typeof BarcodeDetector==='undefined')throw Error(L('Máy này chưa đọc được ảnh QR. Hãy mở file .txt hoặc dán lời mời.','This device cannot read QR images. Open a .txt file or paste the invitation.'));
     const bitmap=await createImageBitmap(selected);let found;try{found=await new BarcodeDetector({formats:['qr_code']}).detect(bitmap);}finally{bitmap.close();}
     if(!found.length)throw Error(L('Không đọc được QR. Thử ảnh rõ hơn hoặc dùng file .txt.','Could not read QR. Try a clearer image or a .txt file.'));text.value=found[0].rawValue;
    }else{if(selected.size>20000)throw Error(L('Lời mời quá dài','Invitation too long'));text.value=await selected.text();}
   }catch(e){box.querySelector('[role=status]').textContent=e.message;}
  };box.append(file);return text;
 }
 function output(box,text){
  box.querySelector('.pkmsvv-wifi-output')?.remove();const out=document.createElement('div');out.className='pkmsvv-wifi-output';box.append(out);
  const area=document.createElement('textarea');area.readOnly=true;area.rows=3;area.value=text;area.setAttribute('aria-label',L('Lời mời hoặc phản hồi để gửi','Invitation or reply to share'));out.append(area);
  button(out,L('Sao chép','Copy'),async()=>{try{await navigator.clipboard.writeText(text);}catch(_){area.select();if(!document.execCommand('copy'))throw Error(L('Hãy chọn và sao chép đoạn chữ trong ô.','Select and copy the text in the field.'));}});
  button(out,L('Lưu file để chuyển cho bạn','Save file to share'),()=>{
   const url=URL.createObjectURL(new Blob([text],{type:'text/plain'})),a=document.createElement('a');a.href=url;a.download='pkmsvv-wifi.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  if(window.PKMSVVQR){
   try{const qr=window.PKMSVVQR.create(text,{errorCorrectionLevel:'L'}),n=qr.modules.size,pad=4,scale=4,cv=document.createElement('canvas');
    cv.width=cv.height=(n+pad*2)*scale;cv.setAttribute('aria-label',L('QR lời mời Wi-Fi','Wi-Fi invitation QR'));const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);ctx.fillStyle='#000';
    for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.modules.get(y,x))ctx.fillRect((x+pad)*scale,(y+pad)*scale,scale,scale);
    out.append(cv);
   }catch(_){const p=document.createElement('p');p.textContent=L('Lời mời dài: dùng sao chép hoặc file .txt.','Long invitation: copy the text or save a .txt file.');out.append(p);}
  }
 }
 function invite(){
  const p=panel(L('Mời bạn cùng Wi-Fi','Invite a friend over Wi-Fi'));p.status.textContent=L('Mỗi bạn cần một lời mời riêng. Bạn mở lời mời, tạo phản hồi rồi đưa lại cho Host. Không cần Internet.','Each player needs a separate invitation. They create a reply and send it back to the Host. Internet is not required.');
  button(p.box,L('1. Tạo lời mời cho một bạn','1. Create an invitation for one friend'),async()=>output(p.box,await G.LanBus.invitation()));
  const text=input(p.box,L('2. Dán phản hồi từ bạn hoặc mở file/ảnh QR','2. Paste their reply or open a file/QR image'));
  button(p.box,L('3. Nhận phản hồi','3. Accept reply'),async()=>{await G.LanBus.accept(text.value);p.status.textContent=L('Đã nhận phản hồi. Chờ bạn bấm “Vào phòng” trên máy của họ.','Reply accepted. Ask your friend to press Join Room on their device.');});
  button(p.box,L('Hủy các lời mời đang chờ','Cancel pending invitations'),()=>{G.LanBus.cancel();p.box.querySelector('.pkmsvv-wifi-output')?.remove();p.status.textContent=L('Đã hủy lời mời chưa dùng. Thành viên đã vào phòng vẫn giữ nguyên.','Unused invitations canceled. Joined players remain in the room.');});
 }
 function join(){
  const p=panel(L('Vào phòng cùng Wi-Fi','Join a room over Wi-Fi'));p.status.textContent=L('Nhận lời mời của Host bằng file, sao chép hoặc ảnh QR. Hai máy cần cùng Wi-Fi; không cần thuê server.','Receive the Host invitation through a file, text or QR image. Both devices need the same Wi-Fi; no rented server.');
  const text=input(p.box,L('1. Dán lời mời từ Host hoặc mở file/ảnh QR','1. Paste Host invitation or open file/QR image'));
  button(p.box,L('2. Tạo phản hồi gửi lại Host','2. Create reply for Host'),async()=>{output(p.box,await G.LanBus.answer(text.value));p.status.textContent=L('Đưa phản hồi này cho Host. Khi Host nhận xong, bấm Vào phòng bên dưới.','Send this reply to the Host. Once accepted, press Join Room below.');});
  button(p.box,L('3. Vào phòng','3. Join Room'),async()=>{
   const id=G.LanBus.pendingRoom;if(!id)throw Error(L('Hãy tạo phản hồi trước','Create a reply first'));p.status.textContent=L('Đang ghép nối với Host…','Pairing with Host…');
   const result=await G.Social.joinRoom(id);if(!result.ok)throw Error(result.error);p.close();G.LobbyUI.open();
  });
  button(p.box,L('Hủy ghép nối để thử lại','Cancel pairing and retry'),()=>{G.LanBus.cancel();p.box.querySelector('.pkmsvv-wifi-output')?.remove();p.status.textContent=L('Đã hủy. Nhận lời mời mới từ Host để thử lại.','Canceled. Get a new Host invitation to retry.');});
 }
 window.PKMSVVWifiUI={invite,join};
})();
