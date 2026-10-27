'use strict';
// Manual local pairing works on desktop, hosted/PWA Web and Capacitor alike.
(()=>{
 let dialog=null;
 function panel(title){
  dialog?.remove();const root=document.createElement('div');root.className='pkmsvv-wifi-overlay';
  const box=document.createElement('section');box.className='pkmsvv-wifi-panel';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',title);
  const h=document.createElement('h2');h.textContent=title;const close=document.createElement('button');close.textContent='Đóng';close.onclick=()=>root.remove();
  const status=document.createElement('p');status.setAttribute('role','status');
  box.append(h,close,status);root.append(box);document.body.append(root);dialog=root;
  return {box,status,close:()=>root.remove()};
 }
 function button(box,label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;
  b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){const status=box.closest('.pkmsvv-wifi-panel')?.querySelector('[role=status]');if(status)status.textContent=e.message||'Không ghép nối được';}finally{b.disabled=false;}};box.append(b);return b;}
 function input(box,label){
  const text=document.createElement('textarea');text.rows=3;text.placeholder=label;text.setAttribute('aria-label',label);box.append(text);
  const file=document.createElement('input');file.type='file';file.accept='.txt,text/plain,image/*';file.setAttribute('aria-label','Mở file lời mời hoặc ảnh QR');
  file.onchange=async()=>{
   const selected=file.files?.[0];if(!selected)return;
   try{
    if(selected.size>8*1024*1024)throw Error('File quá lớn');
    if(selected.type.startsWith('image/')){
     if(typeof BarcodeDetector==='undefined')throw Error('Máy này chưa đọc được ảnh QR. Hãy mở file .txt hoặc dán lời mời.');
     const bitmap=await createImageBitmap(selected);let found;try{found=await new BarcodeDetector({formats:['qr_code']}).detect(bitmap);}finally{bitmap.close();}
     if(!found.length)throw Error('Không đọc được QR. Thử ảnh rõ hơn hoặc dùng file .txt.');text.value=found[0].rawValue;
    }else{if(selected.size>20000)throw Error('Lời mời quá dài');text.value=await selected.text();}
   }catch(e){box.querySelector('[role=status]').textContent=e.message;}
  };box.append(file);return text;
 }
 function output(box,text){
  box.querySelector('.pkmsvv-wifi-output')?.remove();const out=document.createElement('div');out.className='pkmsvv-wifi-output';box.append(out);
  const area=document.createElement('textarea');area.readOnly=true;area.rows=3;area.value=text;area.setAttribute('aria-label','Lời mời hoặc phản hồi để gửi');out.append(area);
  button(out,'Sao chép',async()=>{try{await navigator.clipboard.writeText(text);}catch(_){area.select();if(!document.execCommand('copy'))throw Error('Hãy chọn và sao chép đoạn chữ trong ô.');}});
  button(out,'Lưu file để chuyển cho bạn',()=>{
   const url=URL.createObjectURL(new Blob([text],{type:'text/plain'})),a=document.createElement('a');a.href=url;a.download='pkmsvv-wifi.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  if(window.PKMSVVQR){
   try{const qr=window.PKMSVVQR.create(text,{errorCorrectionLevel:'L'}),n=qr.modules.size,pad=4,scale=4,cv=document.createElement('canvas');
    cv.width=cv.height=(n+pad*2)*scale;cv.setAttribute('aria-label','QR lời mời Wi-Fi');const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);ctx.fillStyle='#000';
    for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.modules.get(y,x))ctx.fillRect((x+pad)*scale,(y+pad)*scale,scale,scale);
    out.append(cv);
   }catch(_){const p=document.createElement('p');p.textContent='Lời mời dài: dùng sao chép hoặc file .txt.';out.append(p);}
  }
 }
 function invite(){
  const p=panel('Mời bạn cùng Wi-Fi');p.status.textContent='Mỗi bạn cần một lời mời riêng. Bạn mở lời mời, tạo phản hồi rồi đưa lại cho Host. Không cần Internet.';
  button(p.box,'1. Tạo lời mời cho một bạn',async()=>output(p.box,await G.LanBus.invitation()));
  const text=input(p.box,'2. Dán phản hồi từ bạn hoặc mở file/ảnh QR');
  button(p.box,'3. Nhận phản hồi',async()=>{await G.LanBus.accept(text.value);p.status.textContent='Đã nhận phản hồi. Chờ bạn bấm “Vào phòng” trên máy của họ.';});
  button(p.box,'Hủy các lời mời đang chờ',()=>{G.LanBus.cancel();p.box.querySelector('.pkmsvv-wifi-output')?.remove();p.status.textContent='Đã hủy lời mời chưa dùng. Thành viên đã vào phòng vẫn giữ nguyên.';});
 }
 function join(){
  const p=panel('Vào phòng cùng Wi-Fi');p.status.textContent='Nhận lời mời của Host bằng file, sao chép hoặc ảnh QR. Hai máy cần cùng Wi-Fi; không cần thuê server.';
  const text=input(p.box,'1. Dán lời mời từ Host hoặc mở file/ảnh QR');
  button(p.box,'2. Tạo phản hồi gửi lại Host',async()=>{output(p.box,await G.LanBus.answer(text.value));p.status.textContent='Đưa phản hồi này cho Host. Khi Host nhận xong, bấm Vào phòng bên dưới.';});
  button(p.box,'3. Vào phòng',async()=>{
   const id=G.LanBus.pendingRoom;if(!id)throw Error('Hãy tạo phản hồi trước');p.status.textContent='Đang ghép nối với Host…';
   const result=await G.Social.joinRoom(id);if(!result.ok)throw Error(result.error);p.close();G.LobbyUI.open();
  });
  button(p.box,'Hủy ghép nối để thử lại',()=>{G.LanBus.cancel();p.box.querySelector('.pkmsvv-wifi-output')?.remove();p.status.textContent='Đã hủy. Nhận lời mời mới từ Host để thử lại.';});
 }
 window.PKMSVVWifiUI={invite,join};
})();
