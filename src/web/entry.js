'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const cloud = document.getElementById('cloud');
  const enabled = document.documentElement.dataset.cloudEnabled === 'true';
  const status = document.getElementById('cloud-status');
  cloud.disabled = !enabled;
  status.textContent = enabled
    ? 'Online cần Internet; phòng Sống Sót tối đa 4 người khi đăng nhập.'
    : 'Chưa cấu hình Firebase riêng. Hiện chỉ mở được chế độ offline trên web.';
  function start(mode) {
    try { localStorage.setItem('pkmsvv.web.saveMode', mode); }
    catch (e) { status.textContent = 'Trình duyệt chặn lưu cài đặt. Hãy cho phép lưu dữ liệu website.'; return; }
    window.location.assign('./game/');
  }
  document.getElementById('local').addEventListener('click', () => start('local'));
  cloud.addEventListener('click', () => { if (enabled) start('cloud'); });
  // A single button enters OR exits native browser fullscreen.
  // Installed standalone PWAs are managed by the OS, not by the Fullscreen API.
  const fullButton=document.getElementById('fullscreen');
  const fullStatus=document.getElementById('fullscreen-status');
  const isFull=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
  const updateFull=()=>{
    fullButton.textContent=isFull()?'⛶ Thoát toàn màn hình':'⛶ Bật toàn màn hình';
    fullButton.setAttribute('aria-pressed',String(isFull()));
  };
  fullButton.addEventListener('click',()=>{
    const exiting=isFull();
    const action=exiting?(document.exitFullscreen||document.webkitExitFullscreen):
      (document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen);
    const owner=exiting?document:document.documentElement;
    if(!action){
      fullStatus.textContent='Chế độ toàn màn hình không thể bật/tắt bằng nút trên trình duyệt này. Với app đã cài, dùng thao tác hệ thống để thoát.';
      return;
    }
    try{
      Promise.resolve(action.call(owner)).then(()=>{
        updateFull();
        fullStatus.textContent=isFull()?'Đã bật toàn màn hình.':'Đã thoát toàn màn hình.';
        if(!exiting){try{if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(()=>{});}catch(e){}}
        else {try{if(screen.orientation&&screen.orientation.unlock)screen.orientation.unlock();}catch(e){}}
      }).catch(()=>{
        updateFull();
        fullStatus.textContent='Trình duyệt không cho phép đổi toàn màn hình ở đây. Thử thao tác hệ thống hoặc trình duyệt.';
      });
    }catch(e){updateFull();fullStatus.textContent='Không đổi được toàn màn hình trên trình duyệt này.';}
  });
  document.addEventListener('fullscreenchange',updateFull);
  document.addEventListener('webkitfullscreenchange',updateFull);
  updateFull();
  // A real Chrome install prompt, with a useful fallback when it is unavailable.
  const installButton=document.getElementById('install');
  const installStatus=document.getElementById('install-status');
  let pendingInstall=null;
  const installed=()=>matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;
  const syncInstall=()=>{if(installed()){installButton.disabled=true;installButton.textContent='✓ Đã mở từ màn hình chính';installStatus.textContent='Bạn đang dùng ứng dụng Web đã cài.';}};
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();pendingInstall=event;
    installButton.disabled=false;installButton.textContent='📲 Cài game lên màn hình chính';
    installStatus.textContent='Chạm Cài game để xác nhận cài đặt trong Chrome.';
  });
  window.addEventListener('appinstalled',()=>{
    pendingInstall=null;installButton.disabled=true;installButton.textContent='✓ Đã cài game';
    installStatus.textContent='Nếu còn icon lỗi từ phiên bản cũ, hãy sao lưu save trước khi gỡ icon đó.';
  });
  installButton.onclick=async()=>{
    if(installed()){syncInstall();return;}
    if(!pendingInstall){
      installStatus.textContent='Chrome Android: chọn ⋮ → Thêm vào màn hình chính / Cài đặt ứng dụng. Nếu icon cũ không mở, sao lưu save trước khi cài lại.';
      return;
    }
    const p=pendingInstall;pendingInstall=null;
    try{
      await p.prompt();
      const answer=await p.userChoice;
      installStatus.textContent=answer&&answer.outcome==='accepted'?'Đã chấp nhận cài đặt. Thử mở biểu tượng mới.':'Bạn đã hủy cài đặt. Có thể thử lại từ menu Chrome.';
    }catch(e){installStatus.textContent='Không thể mở yêu cầu cài đặt. Thử qua menu Chrome.';}
  };
  syncInstall();
  // The launcher and /game/ share a single root-scope service worker.
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js',{scope:'/'})
    .catch(e=>{installStatus.textContent='Không đăng ký được chế độ cài đặt: '+(e&&e.message||'service worker');});

});